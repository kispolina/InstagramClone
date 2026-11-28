// Чисті функції без залежностей від React Native: їх можна тестувати через `node --test`.

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|3gp)$/i;

// Бекенд віддає в media лише { url }, тип визначаємо за розширенням (без query/hash).
function isVideoUrl(url) {
  if (typeof url !== 'string') return false;
  return VIDEO_EXT.test(url.split('#')[0].split('?')[0]);
}

const pad = n => String(n).padStart(2, '0');

function timeAgo(iso, now = new Date()) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const sec = Math.max(0, Math.floor((now.getTime() - time) / 1000));
  if (sec < 60) return 'щойно';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} хв тому`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн тому`;
  const date = new Date(time);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

// Користувач з API -> профіль, який очікує інтерфейс (nickname, photo).
function toProfile(user) {
  if (!user) return null;
  return {...user, nickname: user.username, photo: user.avatarUrl ?? null};
}

function firstText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value.message === 'string') return value.message;
  return '';
}

// Розбір тіла помилки: підтримує { errors: { Поле: [..] } }, { errors: [..] },
// { message }, а також ProblemDetails ({ detail } / { title }).
function errorFromResponse(status, json) {
  if (status === 429) {
    return {message: 'Забагато спроб. Зачекайте хвилину і спробуйте ще раз.', fields: {}};
  }
  const errors = json && json.errors;
  const fields = errors && typeof errors === 'object' && !Array.isArray(errors) ? errors : {};
  const list = Array.isArray(errors) ? errors : Object.values(fields).flat();
  const message =
    firstText(list[0]) ||
    firstText(json && json.message) ||
    firstText(json && json.detail) ||
    firstText(json && json.title) ||
    'Помилка сервера. Спробуйте пізніше.';
  return {message, fields};
}

// Refresh-токен недійсний (а не просто збій мережі чи сервера) -> сесію треба скинути.
function shouldDropSession(status) {
  return status === 400 || status === 401 || status === 403;
}

// Додає нові елементи до списку без дублікатів за id.
function mergeById(prev, next) {
  const seen = new Set(prev.map(item => item.id));
  return prev.concat(next.filter(item => !seen.has(item.id) && seen.add(item.id)));
}

module.exports = {isVideoUrl, timeAgo, toProfile, errorFromResponse, shouldDropSession, mergeById};
