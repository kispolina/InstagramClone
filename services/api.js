import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {errorFromResponse, shouldDropSession} from '../helpers';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://socialnetwork-api-staging.onrender.com').replace(/\/+$/, '');
const TIMEOUT_MS = 60000; // staging на Render може «прокидатися» довго
const KEY = 'session';

// Refresh-токен зберігаємо в SecureStore (Keychain / Keystore). На вебі SecureStore немає,
// тому там AsyncStorage. Access-токен живе лише в пам'яті й відновлюється через refresh.
const storage = Platform.OS === 'web'
  ? {get: () => AsyncStorage.getItem(KEY), set: v => AsyncStorage.setItem(KEY, v), remove: () => AsyncStorage.removeItem(KEY)}
  : {get: () => SecureStore.getItemAsync(KEY), set: v => SecureStore.setItemAsync(KEY, v), remove: () => SecureStore.deleteItemAsync(KEY)};

let accessToken = null;
let refreshToken = null;
let refreshing = null;
let onSessionExpired = null;

export class ApiError extends Error {
  constructor(message, {status = 0, fields = {}, network = false} = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.network = network; // true — запит не дійшов до сервера
  }
}

// App підписується тут, щоб повернути користувача на екран входу, коли сесія завершилась.
export const setSessionExpiredHandler = handler => { onSessionExpired = handler; };

export async function saveTokens(auth) {
  accessToken = auth.accessToken;
  refreshToken = auth.refreshToken;
  try { await storage.set(JSON.stringify(refreshToken)); } catch { /* сесія лишається в пам'яті */ }
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  try { await storage.remove(); } catch { /* нічого видаляти */ }
}

function readToken(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value === 'string' ? value : value?.refreshToken ?? null; // старий формат: {accessToken, refreshToken}
  } catch {
    return null;
  }
}

// 'ok' — сесію відновлено; 'none' — збереженої сесії немає або вона недійсна;
// 'error' — немає зв'язку / збій сервера (токен лишається, можна повторити).
export async function restoreSession() {
  let token = null;
  let legacy = false;
  try { token = readToken(await storage.get()); } catch { /* порожньо */ }
  if (!token && Platform.OS !== 'web') {
    try { token = readToken(await AsyncStorage.getItem(KEY)); legacy = !!token; } catch { /* порожньо */ }
  }
  if (!token) return 'none';

  refreshToken = token;
  const result = await refresh();
  if (result === 'ok') {
    if (legacy) AsyncStorage.removeItem(KEY).catch(() => {}); // токен уже в SecureStore
    return 'ok';
  }
  if (result === 'invalid') {
    if (legacy) AsyncStorage.removeItem(KEY).catch(() => {});
    return 'none';
  }
  return 'error';
}

export const hasSession = () => !!refreshToken;
export const getRefreshToken = () => refreshToken;

async function send(path, {method = 'GET', body, form, auth = true, timeoutMs = TIMEOUT_MS} = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.', {network: true});
  } finally {
    clearTimeout(timer);
  }
}

// Одноразовий refresh: паралельні запити чекають на той самий. Результат: 'ok' | 'invalid' | 'error'.
// Сесію скидаємо лише коли сервер явно відхилив refresh-токен (400/401/403), а не при збої мережі чи 5xx.
function refresh() {
  if (!refreshToken) return Promise.resolve('invalid');
  refreshing ??= (async () => {
    try {
      const res = await send('/auth/refresh', {method: 'POST', body: {refreshToken}, auth: false});
      if (res.ok) {
        const json = await res.json();
        await saveTokens(json.data);
        return 'ok';
      }
      if (shouldDropSession(res.status)) {
        await clearTokens();
        return 'invalid';
      }
      return 'error';
    } catch {
      return 'error';
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function parse(res) {
  let json = null;
  try { json = await res.json(); } catch { /* тіло не JSON */ }
  if (res.ok) return json;
  const {message, fields} = errorFromResponse(res.status, json);
  throw new ApiError(message, {status: res.status, fields});
}

export async function api(path, options = {}) {
  let res = await send(path, options);
  if (res.status === 401 && options.auth !== false && refreshToken) {
    const result = await refresh();
    if (result === 'ok') res = await send(path, options);
    else if (result === 'invalid' && onSessionExpired) onSessionExpired();
  }
  return parse(res);
}
