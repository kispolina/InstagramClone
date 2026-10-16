import {createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile,
  sendEmailVerification} from 'firebase/auth';
import {doc, setDoc, getDoc, serverTimestamp} from 'firebase/firestore';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {getBackend} from './firebase';

export async function registerWithEmail(email, password) {
  const {auth}=getBackend();
  const result=await createUserWithEmailAndPassword(auth,email.trim(),password);
  // Account already exists if the following email request fails: do not retry registration.
  return result.user;
}
export async function sendVerificationEmail() {
  const {auth}=getBackend();
  if(!auth.currentUser) throw new Error('Sign in first.');
  return sendEmailVerification(auth.currentUser);
}
export async function loginWithEmail(email,password) {
  const {auth}=getBackend();
  return (await signInWithEmailAndPassword(auth,email.trim(),password)).user;
}
export function resetPassword(email) {return sendPasswordResetEmail(getBackend().auth,email.trim());}
export function logout() {return signOut(getBackend().auth);}
export function watchSession(callback) {return onAuthStateChanged(getBackend().auth,callback);}
function requireUser() {
  const backend=getBackend();
  if(!backend.auth.currentUser) throw new Error('Sign in first.');
  return {...backend,user:backend.auth.currentUser};
}
export async function saveProfile({name,username,interests=[]}) {
  const {db,user}=requireUser();
  // Allowlist: passwords, verification codes and birth dates are never stored here.
  await setDoc(doc(db,'users',user.uid),{
    name:name.trim(),username:username.trim(),interests,
    updatedAt:serverTimestamp(),
  },{merge:true});
  await updateProfile(user,{displayName:name.trim()});
}
export async function loadMyProfile() {
  const {db,user}=requireUser();
  const snapshot=await getDoc(doc(db,'users',user.uid));
  return snapshot.exists()?snapshot.data():null;
}
// Web upload helper: pass a File/Blob from a browser file picker.
// Native URI upload requires a platform-specific adapter; it is not wired in this starter.
export async function uploadAvatarBlob(blob) {
  const {storage,db,user}=requireUser();
  if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>=5*1024*1024)
    throw new Error('Choose a JPEG, PNG or WebP image smaller than 5 MB.');
  const target=ref(storage,`avatars/${user.uid}/profile`);
  await uploadBytes(target,blob,{contentType:blob.type});
  const photoURL=await getDownloadURL(target);
  await setDoc(doc(db,'users',user.uid),{photoURL,updatedAt:serverTimestamp()},{merge:true});
  await updateProfile(user,{photoURL});
  return photoURL;
}
