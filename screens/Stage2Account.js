import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import {loadProfile} from '../services/account';
import {createPost, deletePost, saveProfile, updatePost, uploadAvatar} from '../services/social';

function Action({label, onPress, disabled}) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function RequestError({message}) {
  return message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null;
}

function useRequest() {
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure.message || 'Сталася помилка. Спробуйте ще раз.');
    } finally {
      active.current = false;
      setBusy(false);
    }
  }

  return {busy, error, run};
}

function pickImages(multiple = false) {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 10 : 1,
  });
}

function Panel({children}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.panel, {paddingTop: insets.top + 24}]}>
      {children}
    </ScrollView>
  );
}

function Field({label, ...props}) {
  return (
    <View style={styles.field}>
      <Text style={styles.text}>{label}</Text>
      <TextInput accessibilityLabel={label} style={styles.input} {...props} />
    </View>
  );
}

export default function ConnectedAccount({onProfileChange, onLogout, onBusyChange}) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState('');
  const {busy, error, run} = useRequest();

  function load() {
    run(async () => {
      const current = await loadProfile();
      setDraft({...current, bio: current.bio ?? '', websiteUrl: current.websiteUrl ?? ''});
      onProfileChange(current);
    });
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  function field(name) {
    return {
      value: draft[name],
      editable: !busy,
      onChangeText: value => {
        setSaved('');
        setDraft(previous => ({...previous, [name]: value}));
      },
    };
  }

  return (
    <Panel>
      <Text style={styles.title}>Профіль</Text>
      <RequestError message={error} />
      {busy && <ActivityIndicator color={colors.purple} />}
      {draft ? <>
        {!!draft.avatarUrl && <Image source={{uri: draft.avatarUrl}} style={styles.avatar}
          accessibilityLabel="Аватар профілю" />}
        <Action label={draft.avatarUrl ? 'Замінити аватар' : 'Додати аватар'}
          disabled={busy} onPress={() => run(async () => {
            const selection = await pickImages();
            if (selection.canceled) return;
            const updated = await uploadAvatar(selection.assets[0]);
            setDraft(previous => ({...previous, avatarUrl: updated.avatarUrl}));
            onProfileChange(updated);
            setSaved('Аватар збережено.');
          })} />
        <Field label="Ім’я користувача" autoCapitalize="none" {...field('username')} />
        <Field label="Ім’я профілю" {...field('displayName')} />
        <Field label="Про себе" multiline {...field('bio')} />
        <Field label="Вебсайт" autoCapitalize="none" keyboardType="url" {...field('websiteUrl')} />
        <View style={styles.row}>
          <Text style={styles.text}>Приватний профіль</Text>
          <Switch accessibilityLabel="Приватний профіль" value={draft.isPrivate} disabled={busy}
            onValueChange={isPrivate => {
              setSaved('');
              setDraft(previous => ({...previous, isPrivate}));
            }} />
        </View>
        <Action label="Зберегти профіль" disabled={busy} onPress={() => run(async () => {
          setSaved('');
          const updated = await saveProfile(draft);
          setDraft({...updated, bio: updated.bio ?? '', websiteUrl: updated.websiteUrl ?? ''});
          onProfileChange(updated);
          setSaved('Профіль збережено.');
        })} />
        {!error && !!saved && <Text accessibilityLiveRegion="polite" style={styles.text}>{saved}</Text>}
      </> : !busy && <Action label="Завантажити профіль" onPress={load} />}
      <Action label="Вийти" onPress={onLogout} disabled={busy} />
    </Panel>
  );
}

export function PostEditor({post, onDone, onCancel, onBusyChange}) {
  const [caption, setCaption] = useState(post?.caption ?? '');
  const [assets, setAssets] = useState([]);
  const {busy, error, run} = useRequest();

  function save() {
    run(async () => {
      onBusyChange(true);
      try {
        if (post) await updatePost(post.id, caption);
        else await createPost(caption, assets);
      } finally {
        onBusyChange(false);
      }
      onDone();
    });
  }

  return (
    <Panel>
      <Text style={styles.title}>{post ? 'Редагування допису' : 'Новий допис'}</Text>
      <Field label="Підпис" value={caption} onChangeText={setCaption}
        multiline maxLength={2200} editable={!busy} />
      {!post && <>
        <Action label="Обрати фото (до 10)" disabled={busy} onPress={() => run(async () => {
          const selection = await pickImages(true);
          if (!selection.canceled) setAssets(selection.assets);
        })} />
        <View style={styles.previews}>
          {assets.map((asset, index) => <Image key={index} source={{uri: asset.uri}}
            style={styles.preview} accessibilityLabel={'Фото ' + (index + 1)} />)}
        </View>
      </>}
      <RequestError message={error} />
      {busy && <ActivityIndicator color={colors.purple} />}
      <Action label={post ? 'Зберегти підпис' : 'Опублікувати'} disabled={busy || (!post && !assets.length)}
        onPress={save} />
      <Action label="Скасувати" disabled={busy} onPress={onCancel} />
    </Panel>
  );
}

export function FeedPost({post, onEdit, onDeleted, onBusyChange, disabled}) {
  const [confirm, setConfirm] = useState(false);
  const {busy, error, run} = useRequest();

  function remove() {
    run(async () => {
      onBusyChange(true);
      try {
        await deletePost(post.id);
      } finally {
        onBusyChange(false);
      }
      onDeleted(post.id);
    });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.author}>@{post.author.username}</Text>
      {!!post.caption && <Text style={styles.text}>{post.caption}</Text>}
      {post.media.map((media, index) => <Image key={index} source={{uri: media.url}}
        style={styles.media} accessibilityLabel={'Фото допису ' + (index + 1)} />)}
      {post.isMine && (confirm ? <>
        <Text style={styles.text}>Видалити цей допис?</Text>
        <Action label="Так, видалити" onPress={remove} disabled={disabled} />
        <Action label="Скасувати" onPress={() => setConfirm(false)} disabled={disabled} />
      </> : <>
        <Action label="Редагувати підпис" onPress={() => onEdit(post)} disabled={disabled} />
        <Action label="Видалити допис" onPress={() => setConfirm(true)} disabled={disabled} />
      </>)}
      <RequestError message={error} />
      {busy && <ActivityIndicator color={colors.purple} />}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {paddingHorizontal: 20, paddingBottom: 130, gap: 12},
  title: {fontSize: 24, fontWeight: '700', color: colors.ink},
  text: {color: colors.ink},
  button: {alignSelf: 'flex-start', backgroundColor: colors.purple, padding: 10, borderRadius: 10},
  buttonText: {color: colors.white, fontWeight: '600'},
  disabled: {opacity: 0.55},
  error: {color: '#A62039'},
  field: {gap: 4},
  input: {backgroundColor: colors.white, color: colors.ink, borderRadius: 8, padding: 10, minHeight: 42},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  avatar: {width: 96, height: 96, borderRadius: 48},
  previews: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  preview: {width: 64, height: 64, borderRadius: 8},
  card: {backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 8},
  author: {color: colors.ink, fontWeight: '700'},
  media: {width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.page},
});
