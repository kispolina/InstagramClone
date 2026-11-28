import {Platform} from 'react-native';
import {api} from './api';

const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
  const name =
    asset.file?.name ??
    asset.fileName ??
    asset.uri?.split('/').pop()?.split(/[?#]/)[0];
  const extension = name?.split('.').pop()?.toLowerCase();
  const mimeType = asset.file?.type || asset.mimeType || IMAGE_TYPES[extension];

  if (!Object.values(IMAGE_TYPES).includes(mimeType)) {
    throw new Error('Оберіть зображення JPEG, PNG або WebP.');
  }

  if ((asset.file?.size ?? asset.fileSize) > MAX_IMAGE_BYTES) {
    throw new Error('Розмір аватара має бути до 5 МБ.');
  }

  const form = new FormData();

  if (Platform.OS === 'web') {
    if (!asset.file) {
      throw new Error('Не вдалося прочитати зображення. Оберіть його повторно.');
    }

    const file = asset.file.type
      ? asset.file
      : new File([asset.file], name, {type: mimeType});
    form.append('file', file);
  } else {
    form.append('file', {
      uri: asset.uri,
      type: mimeType,
      name: name?.includes('.') ? name : `avatar.${mimeType.split('/')[1]}`,
    });
  }

  const response = await api('/users/me/avatar', {method: 'POST', form});
  return response.data;
}