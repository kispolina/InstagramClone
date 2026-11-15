<<<<<<< Updated upstream
const API_URL =
  "https://socialnetwork-api-staging.onrender.com";

let accessToken = null;
let refreshToken = null;
=======
// Клієнт HTTP API YUNO (https://github.com/oket23/Social-Network-Backend, гілка dev).
// Токени живуть лише в пам'яті. У консоль не пишемо ні токенів, ні тіл відповідей.

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://socialnetwork-api-staging.onrender.com').replace(/\/+$/, '');
const TIMEOUT_MS = 60000; // безкоштовний Render «прокидається» до хвилини

let accessToken = null;
let refreshToken = null;
let refreshing = null;

export class ApiError extends Error {
  constructor(message, {status = 0, fields = {}} = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields; // {Поле: [повідомлення]} з відповіді валідації
  }
}
>>>>>>> Stashed changes

export function saveTokens(auth) {
  accessToken = auth.accessToken;
  refreshToken = auth.refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

<<<<<<< Updated upstream
export async function api(path, options = {}) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),
      },
    }
  );

  const result = await response.json();
	console.log("STATUS:", response.status);
	console.log("RESULT:", result);

  if (!response.ok) {
	  console.log("ERROR RESPONSE:", result);
		
	  throw new Error(
	    result.message ||
	    JSON.stringify(result.errors) ||
	    "Помилка сервера"
	  );
	}

  return result;
}
=======
export const hasSession = () => !!refreshToken;
export const getRefreshToken = () => refreshToken;

async function send(path, {method = 'GET', body, form, auth = true} = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.');
  } finally {
    clearTimeout(timer);
  }
}

// Одноразовий refresh: паралельні запити чекають на один і той самий.
async function refresh() {
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await send('/auth/refresh', {method: 'POST', body: {refreshToken}, auth: false});
      if (!res.ok) { clearTokens(); return false; }
      const json = await res.json();
      saveTokens(json.data);
      return true;
    } catch {
      return false;
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
  if (res.status === 429) throw new ApiError('Забагато спроб. Зачекайте хвилину і спробуйте ще раз.', {status: 429});
  const fields = json?.errors || {};
  const first = Object.values(fields).flat()[0];
  throw new ApiError(first || json?.message || 'Помилка сервера. Спробуйте пізніше.', {status: res.status, fields});
}

export async function api(path, options = {}) {
  let res = await send(path, options);
  if (res.status === 401 && options.auth !== false && await refresh()) res = await send(path, options);
  return parse(res);
}
>>>>>>> Stashed changes
