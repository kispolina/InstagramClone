import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';

// Lazy initialization keeps the demo usable before Firebase is configured.
export function getBackend() {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  if (Object.values(config).some(value => !value)) {
    throw new Error('Fill all Firebase values in .env and restart Expo.');
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  // Native auth is in-memory in this starter; web uses Firebase defaults.
  return {auth:getAuth(app), db:getFirestore(app), storage:getStorage(app)};
}
