import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import {loadProfile} from '../services/account';
import {saveProfile, uploadAvatar} from '../services/profile';

function Action({label, onPress, disabled}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
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

export default function ProfileScreen({onProfileChange, onLogout}) {
  const insets = useSafeAreaInsets();
  const active = useRef(false);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function run(action) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await action();
    } catch (failure) {
      setError(failure.message || 'Сталася помилка. Спробуйте ще раз.');
    } finally {
      active.current = false;
      setBusy(false);
    }
  }

  function applyProfile(profile) {
    setDraft({...profile, bio: profile.bio ?? '', websiteUrl: profile.websiteUrl ?? ''});
    onProfileChange(profile);
  }

  function load() {
    return run(async () => applyProfile(await loadProfile()));
  }

  useEffect(() => { load(); }, []);

  function changeField(name, value) {
    setSaved('');
    setDraft(previous => ({...previous, [name]: value}));
  }

  function field(name) {
    return {
      value: draft[name],
      editable: !busy,
      onChangeText: value => changeField(name, value),
    };
  }

  function selectAvatar() {
    return run(async () => {
      const selection = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images']});
      if (selection.canceled) return;
      const updated = await uploadAvatar(selection.assets[0]);
      setDraft(previous => ({...previous, avatarUrl: updated.avatarUrl}));
      onProfileChange(updated);
      setSaved('Аватар збережено.');
    });
  }

  function save() {
    return run(async () => {
      applyProfile(await saveProfile(draft));
      setSaved('Профіль збережено.');
    });
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.panel, {paddingTop: insets.top + 24}]}>
      <Text style={styles.title}>Профіль</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {busy && <ActivityIndicator color={colors.purple} />}

      {draft ? (
        <>
          {!!draft.avatarUrl && (
            <Image
              source={{uri: draft.avatarUrl}}
              style={styles.avatar}
              accessibilityLabel="Аватар профілю"
            />
          )}
          <Action
            label={draft.avatarUrl ? 'Замінити аватар' : 'Додати аватар'}
            onPress={selectAvatar}
            disabled={busy}
          />
          <Field label="Ім’я користувача" autoCapitalize="none" {...field('username')} />
          <Field label="Ім’я профілю" {...field('displayName')} />
          <Field label="Про себе" multiline {...field('bio')} />
          <Field label="Вебсайт" autoCapitalize="none" keyboardType="url" {...field('websiteUrl')} />
          <View style={styles.row}>
            <Text style={styles.text}>Приватний профіль</Text>
            <Switch
              accessibilityLabel="Приватний профіль"
              value={draft.isPrivate}
              disabled={busy}
              onValueChange={value => changeField('isPrivate', value)}
            />
          </View>
          <Action label="Зберегти профіль" onPress={save} disabled={busy} />
          {!!saved && <Text accessibilityLiveRegion="polite" style={styles.text}>{saved}</Text>}
        </>
      ) : (
        !busy && <Action label="Завантажити профіль" onPress={load} />
      )}

      <Action label="Вийти" onPress={onLogout} disabled={busy} />
    </ScrollView>
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
});