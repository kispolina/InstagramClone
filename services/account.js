import {api, saveTokens, clearTokens, getRefreshToken} from './api';

// Тимчасовий нікнейм: бекенд вимагає username під час реєстрації, а в макеті
// нікнейм обирається вже після коду. Справжній зберігаємо через updateProfile.
export const TEMP_PREFIX = 'yuno_';
export const isTempUsername = name => !!name && name.startsWith(TEMP_PREFIX);
const tempUsername = () => TEMP_PREFIX + Math.random().toString(36).slice(2, 12).padEnd(10, '0');

async function authenticate(path, body) {
  const res = await api(path, {method: 'POST', body, auth: false});
  saveTokens(res.data);
  return res.data.user;
}

export const login = (email, password) => authenticate('/auth/login', {login: email.trim(), password});

export const register = (email, password) =>
  authenticate('/auth/register', {email: email.trim(), username: tempUsername(), displayName: 'YUNO', password});

// Код із листа (6 цифр). Потрібен вхід: сервер перевіряє код для поточного користувача.
export const confirmEmail = code => api('/auth/confirm-email', {method: 'POST', body: {code}});
export const resendConfirmation = () => api('/auth/resend-confirmation', {method: 'POST'});

export const forgotPassword = email => api('/auth/forgot-password', {method: 'POST', body: {email: email.trim()}, auth: false});
export const resetPassword = (email, code, newPassword) =>
  api('/auth/reset-password', {method: 'POST', body: {email: email.trim(), code, newPassword}, auth: false});

export async function updateProfile(user, nickname) {
  const res = await api('/users/me', {
    method: 'PUT',
    body: {
      username: nickname,
      displayName: nickname,
      bio: user.bio ?? null,
      websiteUrl: user.websiteUrl ?? null,
      isPrivate: !!user.isPrivate,
    },
  });
  return res.data;
}

export async function loadProfile() {
  return (await api('/users/me')).data;
}

export async function loadFeed() {
  return (await api('/feed')).data;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (!refreshToken) return;
  try { await api('/auth/logout', {method: 'POST', body: {refreshToken}, auth: false}); } catch { /* вихід локально вже виконано */ }
}
