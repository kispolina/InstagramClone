import {Platform} from 'react-native';
import {api, saveTokens, clearTokens, getRefreshToken} from './api';


// Тимчасовий нікнейм: бекенд вимагає username під час реєстрації, а в макеті
// нікнейм обирається вже після коду. Справжній зберігаємо через updateProfile.
export const TEMP_PREFIX = 'yuno_';
export const isTempUsername = name => !!name && name.startsWith(TEMP_PREFIX);
const tempUsername = () => TEMP_PREFIX + Math.random().toString(36).slice(2, 12).padEnd(10, '0');

async function authenticate(path, body) {
  const res = await api(path, {method: 'POST', body, auth: false});
  await saveTokens(res.data);
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

// { items: Post[], nextCursor: string | null }
export async function loadFeed(cursor = null, limit = 10) {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  params.append('limit', String(limit));
  return (await api(`/feed?${params.toString()}`)).data;
}

// ПРИПУЩЕННЯ: ендпоінт одного допису — GET /posts/{id}. Якщо шлях інший, змініть лише цей рядок.
export async function getPost(id) {
  return (await api(`/posts/${encodeURIComponent(id)}`)).data;
}

// ПРИПУЩЕННЯ: створення допису — POST /posts, multipart/form-data з полями caption і media (файл
// повторюється для кожного фото/відео). Якщо в Scalar поля чи шлях інші, змініть лише цю функцію.
export async function createPost(caption, media) {
  const form = new FormData();
  if (caption && caption.trim()) form.append('caption', caption.trim());
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const video = item.type === 'video';
    const name = item.fileName || `media-${i + 1}.${video ? 'mp4' : 'jpg'}`;
    const type = item.mimeType || (video ? 'video/mp4' : 'image/jpeg');
    if (Platform.OS === 'web') {
      const blob = item.file ?? (await (await fetch(item.uri)).blob());
      form.append('media', blob, name);
    } else {
      form.append('media', {uri: item.uri, name, type});
    }
  }
  // Відео вантажиться довше за звичайний запит
  return (await api('/posts', {method: 'POST', form, timeoutMs: 180000})).data;
}

// Спершу просимо сервер анулювати refresh-токен (з короткою очікуваною відповіддю, щоб без мережі
// вихід не «висів»), потім у будь-якому разі чистимо сесію локально.
export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await Promise.race([
        api('/auth/logout', {method: 'POST', body: {refreshToken}}),
        new Promise(resolve => setTimeout(resolve, 5000)),
      ]);
    } catch { /* вихід локально виконається нижче */ }
  }
  await clearTokens();
}
