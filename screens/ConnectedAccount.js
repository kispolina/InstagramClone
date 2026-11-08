import React, {useRef, useState} from 'react';
import {Image, Modal, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {colors} from '../theme';
import {Button, Field} from '../ui';
import {validEmail} from '../validation';
import {
  authenticate, endSession, loadFeed, loadProfile, newPost, publishPost, saveAvatar, saveProfile,
} from '../services/account';

export default function ConnectedAccount({initialPage, onClose}) {
  const [page, setPage] = useState(initialPage);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [caption, setCaption] = useState('');
  const [posts, setPosts] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const draft = useRef(null);

  async function run(action, failure) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setNotice('');
    try {
      await action();
    } catch (error) {
      const code = typeof error?.code === 'string' && /^[a-z0-9/-]+$/.test(error.code)
        ? ` (${error.code})` : '';
      setNotice(failure + code);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function openFeed() {
    setPage('feed');
    setPosts(null);
    setPosts(await loadFeed());
  }

  async function openAccount(account) {
    const saved = await loadProfile(account);
    setProfile(saved);
    setSavedUsername(saved.username ?? '');
    if (page === 'feed') await openFeed();
  }

  const login = create => run(async () => {
    const account = await authenticate(email, password, create);
    setPassword('');
    setUser(account);
    await openAccount(account);
  }, 'Не вдалося відкрити акаунт Firebase. Перевірте дані або повторіть завантаження профілю.');

  const logout = () => run(async () => {
    await endSession();
    setUser(null);
    setProfile(null);
    setSavedUsername('');
    setPosts(null);
    setCaption('');
    draft.current = null;
  }, 'Не вдалося вийти.');

  const changeAvatar = () => run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled) return;
    const photoURL = await saveAvatar(user, result.assets[0]);
    setProfile(value => ({...value, photoURL}));
    setNotice('Аватар збережено.');
  }, 'Не вдалося зберегти аватар. Підтримуються JPEG, PNG і WebP до 5 МБ.');

  const publish = () => run(async () => {
    draft.current ??= newPost();
    await publishPost(draft.current, user, savedUsername, caption);
    draft.current = null;
    setCaption('');
    await openFeed();
  }, 'Не вдалося завершити дію. Якщо допис уже опубліковано, оновіть стрічку.');

  const hasUsername = /^[a-zA-Z0-9._]{3,30}$/.test(profile?.username?.trim() ?? '');
  const canPublish = /^[a-zA-Z0-9._]{3,30}$/.test(savedUsername);
  const close = () => { if (!pending.current) onClose(); };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Button label="Назад до YUNO" onPress={close} disabled={busy} />
          {!user && <>
            <Text accessibilityRole="header" style={styles.heading}>Акаунт YUNO</Text>
            <Text>Увійдіть до Firebase, щоб зберігати профіль і публікувати дописи.</Text>
            <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" editable={!busy} />
            <Field value={password} onChangeText={setPassword} placeholder="Пароль" secure editable={!busy} />
            <Button label="Увійти до Firebase" onPress={() => login(false)} disabled={busy || !validEmail(email.trim()) || !password} />
            <Button label="Створити акаунт Firebase" onPress={() => login(true)} disabled={busy || !validEmail(email.trim()) || password.length < 8} />
          </>}
          {user && !profile && <Button label="Завантажити профіль" disabled={busy} onPress={() => run(() => openAccount(user), 'Не вдалося прочитати профіль із Firestore.')} />}
          {user && profile && <>
            <View style={styles.nav}>
              <Text style={styles.link} onPress={busy ? undefined : () => setPage('profile')}>Профіль</Text>
              <Text style={styles.link} onPress={busy ? undefined : () => setPage('compose')}>Створити</Text>
              <Text style={styles.link} onPress={busy ? undefined : () => run(openFeed, 'Не вдалося завантажити стрічку.')}>Стрічка</Text>
            </View>
            {page === 'profile' && <>
              <Text accessibilityRole="header" style={styles.heading}>Профіль</Text>
              {!!profile.photoURL && <Image source={{uri: profile.photoURL}} style={styles.avatar} accessibilityLabel="Аватар профілю" />}
              <Field placeholder="Ім’я" value={profile.name ?? ''} editable={!busy} maxLength={80}
                onChangeText={name => setProfile(value => ({...value, name}))} />
              <Field placeholder="Нікнейм" value={profile.username ?? ''} editable={!busy} maxLength={30}
                onChangeText={username => setProfile(value => ({...value, username}))} />
              <Button label="Зберегти профіль" disabled={busy || !profile.name?.trim() || !hasUsername}
                onPress={() => run(async () => {
                  await saveProfile(user, profile);
                  setSavedUsername(profile.username.trim());
                  setNotice('Профіль збережено.');
                }, 'Не вдалося зберегти профіль.')} />
              <Button label="Змінити фото" onPress={changeAvatar} disabled={busy} />
            </>}
            {page === 'compose' && <>
              <Text accessibilityRole="header" style={styles.heading}>Новий допис</Text>
              {!canPublish && <Text>Спочатку вкажіть ім’я та збережіть нікнейм у профілі.</Text>}
              <Field placeholder="Текст допису" value={caption} onChangeText={setCaption} multiline maxLength={2200} editable={!busy} />
              <Button label="Опублікувати" onPress={publish} disabled={busy || !canPublish || !caption.trim()} />
            </>}
            {page === 'feed' && <>
              <Text accessibilityRole="header" style={styles.heading}>Стрічка</Text>
              <Button label="Оновити стрічку" disabled={busy} onPress={() => run(openFeed, 'Не вдалося завантажити стрічку.')} />
              {posts?.length === 0 && <Text>У стрічці ще немає дописів.</Text>}
              {posts?.map(post => <View key={post.id} style={styles.post}>
                <Text style={styles.author}>@{post.username}</Text>
                <Text>{post.caption}</Text>
              </View>)}
            </>}
          </>}
          {busy && <Text accessibilityLiveRegion="polite">Очікуємо відповідь Firebase…</Text>}
          {!!notice && <Text accessibilityLiveRegion="polite">{notice}</Text>}
          {user && <Button label="Вийти з Firebase" disabled={busy} onPress={logout} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.page},
  content: {width: '100%', maxWidth: 430, alignSelf: 'center', padding: 20, gap: 16},
  heading: {fontSize: 24, fontWeight: '700', color: colors.ink},
  nav: {flexDirection: 'row', justifyContent: 'space-between'},
  link: {color: colors.purple, paddingVertical: 8, fontWeight: '700'},
  avatar: {width: 96, height: 96, borderRadius: 48, alignSelf: 'center'},
  post: {backgroundColor: colors.white, borderRadius: 12, padding: 16, gap: 8},
  author: {fontWeight: '700'},
});
