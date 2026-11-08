import {createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc} from 'firebase/firestore/lite';
import {getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {Platform} from 'react-native';
import {getBackend} from './firebase';

export async function authenticate(email, password, create) {
  const {auth} = getBackend();
  const action = create ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
  return (await action(auth, email.trim(), password)).user;
}

export function endSession() {
  return signOut(getBackend().auth);
}

export async function loadProfile(user) {
  const {db} = getBackend();
  const result = await getDoc(doc(db, 'users', user.uid));
  return result.data() ?? {name: user.displayName ?? '', username: '', photoURL: user.photoURL};
}

export async function saveProfile(user, {name, username}) {
  const {db} = getBackend();
  await setDoc(doc(db, 'users', user.uid), {
    name: name.trim(),
    username: username.trim(),
    updatedAt: serverTimestamp(),
  }, {merge: true});
}

async function makeWebAvatar(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new globalThis.Image();
    image.src = url;
    await image.decode();

    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(256, size);
    const context = canvas.getContext('2d');
    if (!context || size === 0) throw new Error('Не вдалося прочитати фото.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2,
      size, size, 0, 0, canvas.width, canvas.height,
    );

    const photo = canvas.toDataURL('image/jpeg', 0.8);
    if (!photo.startsWith('data:image/jpeg;base64,') || photo.length > 150_000) {
      throw new Error('Не вдалося стиснути фото.');
    }
    return photo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadStorageAvatar(storage, user, blob, contentType) {
  const target = ref(storage, `avatars/${user.uid}/profile`);
  await uploadBytes(target, blob, {contentType});
  return getDownloadURL(target);
}

export async function saveAvatar(user, asset) {
  const blob = asset.file ?? await (await fetch(asset.uri)).blob();
  const contentType = asset.mimeType || blob.type;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType) ||
      blob.size === 0 || blob.size >= 5 * 1024 * 1024) {
    throw new Error('Оберіть JPEG, PNG або WebP розміром менше 5 МБ.');
  }

  const {db, storage} = getBackend();
  const photoURL = Platform.OS === 'web'
    ? await makeWebAvatar(blob)
    : await uploadStorageAvatar(storage, user, blob, contentType);
  await setDoc(doc(db, 'users', user.uid), {photoURL, updatedAt: serverTimestamp()}, {merge: true});
  return photoURL;
}

export function newPost() {
  return doc(collection(getBackend().db, 'posts'));
}

export function publishPost(target, user, username, caption) {
  return setDoc(target, {
    authorId: user.uid,
    username,
    caption: caption.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function loadFeed() {
  const posts = collection(getBackend().db, 'posts');
  const result = await getDocs(query(posts, orderBy('createdAt', 'desc'), limit(50)));
  return result.docs.map(item => ({...item.data(), id: item.id}));
}
