import {Platform} from 'react-native';
import {api} from './api';

const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function appendImage(form, field, asset) {
  const name = asset.file?.name || asset.fileName || asset.uri.split('/').pop()?.split(/[?#]/)[0];
  const extension = name?.split('.').pop()?.toLowerCase();
  const mimeType = asset.file?.type || asset.mimeType || IMAGE_TYPES[extension];
  if (!Object.values(IMAGE_TYPES).includes(mimeType)) {
    throw new Error('Оберіть зображення JPEG, PNG або WebP.');
  }
  if ((asset.file?.size ?? asset.fileSize) > MAX_IMAGE_BYTES) {
    throw new Error('Розмір кожного зображення має бути до 5 МБ.');
  }
  if (Platform.OS === 'web') {
    if (!asset.file) throw new Error('Не вдалося прочитати зображення. Оберіть його повторно.');
    const file = asset.file.type ? asset.file : new File([asset.file], name, {type: mimeType});
    form.append(field, file);
  } else {
    form.append(field, {
      uri: asset.uri,
      type: mimeType,
      name: name?.includes('.') ? name : 'image.' + mimeType.split('/')[1],
    });
  }
}

export async function saveProfile(profile) {
  const response = await api('/users/me', {
    method: 'PUT',
    body: {
      username: profile.username.trim(),
      displayName: profile.displayName.trim(),
      bio: profile.bio.trim() || null,
      websiteUrl: profile.websiteUrl.trim() || null,
      isPrivate: profile.isPrivate,
    },
  });
  return response.data;
}

export async function uploadAvatar(asset) {
  const form = new FormData();
  appendImage(form, 'file', asset);
  return (await api('/users/me/avatar', {method: 'POST', form})).data;
}

export async function readFeed(cursor) {
  const query = cursor ? '?cursor=' + encodeURIComponent(cursor) : '';
  return (await api('/feed' + query)).data;
}

export async function createPost(caption, assets) {
  if (!assets.length || assets.length > 10) throw new Error('Оберіть від 1 до 10 фото.');
  const form = new FormData();
  form.append('caption', caption.trim());
  for (const asset of assets) appendImage(form, 'files', asset);
  await api('/posts', {method: 'POST', form});
}

export async function updatePost(id, caption) {
  await api('/posts/' + encodeURIComponent(id), {
    method: 'PUT',
    body: {caption: caption.trim() || null},
  });
}

export async function deletePost(id) {
  await api('/posts/' + encodeURIComponent(id), {method: 'DELETE'});
}
