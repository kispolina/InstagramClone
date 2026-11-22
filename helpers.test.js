const {test} = require('node:test');
const assert = require('node:assert/strict');
const {isVideoUrl, timeAgo, toProfile, errorFromResponse, shouldDropSession, mergeById} = require('./helpers');

test('video detection by extension, ignoring query and hash', () => {
  assert.equal(isVideoUrl('https://cdn.x/a/b.MP4'), true);
  assert.equal(isVideoUrl('https://cdn.x/a/b.mov?sig=abc.jpg'), true);
  assert.equal(isVideoUrl('https://cdn.x/a/b.webm#t=1'), true);
  assert.equal(isVideoUrl('https://cdn.x/a/b.jpg'), false);
  assert.equal(isVideoUrl('https://cdn.x/a/b.jpg?file=video.mp4'), false);
  assert.equal(isVideoUrl(null), false);
});

test('relative time', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  assert.equal(timeAgo('2026-11-22T11:59:40Z', now), 'щойно');
  assert.equal(timeAgo('2026-11-22T11:30:00Z', now), '30 хв тому');
  assert.equal(timeAgo('2026-11-22T09:00:00Z', now), '3 год тому');
  assert.equal(timeAgo('2026-11-20T12:00:00Z', now), '2 дн тому');
  assert.match(timeAgo('2026-01-05T12:00:00Z', now), /^\d{2}\.\d{2}\.2026$/);
  assert.equal(timeAgo('not a date', now), '');
});

test('profile mapping for the UI', () => {
  const profile = toProfile({id: '1', username: 'neo', avatarUrl: null});
  assert.equal(profile.nickname, 'neo');
  assert.equal(profile.photo, null);
  assert.equal(toProfile({username: 'a', avatarUrl: 'u'}).photo, 'u');
  assert.equal(toProfile(null), null);
});

test('server errors: field errors, message, ProblemDetails, 429', () => {
  assert.equal(errorFromResponse(400, {errors: {Code: ['Код недійсний або прострочений']}}).message, 'Код недійсний або прострочений');
  assert.deepEqual(errorFromResponse(400, {errors: {Email: ['x']}}).fields, {Email: ['x']});
  assert.equal(errorFromResponse(409, {message: 'Email уже зайнятий', success: false}).message, 'Email уже зайнятий');
  assert.equal(errorFromResponse(400, {errors: ['Погані дані']}).message, 'Погані дані');
  assert.equal(errorFromResponse(400, {errors: [{message: 'Погані дані'}]}).message, 'Погані дані');
  assert.equal(errorFromResponse(500, {title: 'Server error', detail: 'Details'}).message, 'Details');
  assert.match(errorFromResponse(500, null).message, /Помилка сервера/);
  assert.match(errorFromResponse(429, {message: 'x'}).message, /Забагато спроб/);
});

test('only invalid refresh drops the session', () => {
  assert.equal(shouldDropSession(401), true);
  assert.equal(shouldDropSession(400), true);
  assert.equal(shouldDropSession(500), false);
  assert.equal(shouldDropSession(503), false);
  assert.equal(shouldDropSession(0), false);
});

test('feed pages merge without duplicates', () => {
  const merged = mergeById([{id: 1}, {id: 2}], [{id: 2}, {id: 3}, {id: 3}]);
  assert.deepEqual(merged.map(p => p.id), [1, 2, 3]);
});
