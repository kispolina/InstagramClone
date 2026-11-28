import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator, KeyboardAvoidingView, Platform, BackHandler} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import {VideoSlide} from '../components/PostMedia';
import {createPost} from '../services/account';

const MAX_MEDIA = 10;
const MAX_CAPTION = 2200;

// Інструменти з макета. Працює лише «Текст» (підпис до допису), решта — заготовки.
const TOOLS = [
  {key: 'text', label: 'Текст', text: 'Аб', enabled: true},
  {key: 'filter', label: 'Фільтр', icon: 'add-circle-outline'},
  {key: 'audio', label: 'Аудіо', icon: 'mic-outline'},
  {key: 'edit', label: 'Редаг..', icon: 'reorder-three-outline'},
  {key: 'share', label: 'Співві..', icon: 'alert-circle-outline'},
];

// Градієнт із макета без додаткових бібліотек: смуги з різною прозорістю.
function Fade({color, height, top = false, max = 1}) {
  const n = 10;
  return (
    <View pointerEvents="none" style={[{position: 'absolute', left: 0, right: 0, height}, top ? {top: 0} : {bottom: 0}]}>
      {Array.from({length: n}, (_, i) => (
        <View key={i} style={{flex: 1, backgroundColor: color, opacity: max * (top ? 1 - i / n : (i + 1) / n)}} />
      ))}
    </View>
  );
}

function Round({onPress, label, children, disabled}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} hitSlop={10} style={[s.round, disabled && {opacity: 0.4}]}>
      {children}
    </TouchableOpacity>
  );
}

function Thumb({item, size, big = false}) {
  if (item.type === 'video') {
    return <View style={[size, s.videoTile]}><Ionicons name="play" size={big ? 28 : 16} color={colors.white} /></View>;
  }
  return <Image source={{uri: item.uri}} style={size} resizeMode="cover" />;
}

// Екран «Новий допис»: крок 1 — вибір фото/відео, крок 2 — підпис і публікація.
export default function CreatePost({onClose, onPublished}) {
  const insets = useSafeAreaInsets();
  const {width: winWidth} = useWindowDimensions();
  const width = Math.min(winWidth, 430);
  const [step, setStep] = useState('pick'); // pick | edit
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [caption, setCaption] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => {
    if (busy) return;
    if (step === 'edit') { setStep('pick'); setEditing(false); setError(''); } else onClose();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
    return () => sub.remove();
  });

  async function pickMedia() {
    if (items.length >= MAX_MEDIA) { setError(`Можна додати щонайбільше ${MAX_MEDIA} файлів`); return; }
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA - items.length,
        orderedSelection: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      const added = result.assets.map(a => ({
        uri: a.uri,
        type: a.type === 'video' ? 'video' : 'image',
        fileName: a.fileName ?? undefined,
        mimeType: a.mimeType ?? undefined,
        file: a.file, // на вебі — File
      }));
      setItems(prev => {
        const seen = new Set(prev.map(i => i.uri));
        return prev.concat(added.filter(i => !seen.has(i.uri))).slice(0, MAX_MEDIA);
      });
    } catch {
      setError('Не вдалося відкрити галерею. Спробуйте ще раз.');
    }
  }

  const remove = index => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    setActive(a => Math.max(0, Math.min(a > index ? a - 1 : a, next.length - 1)));
    if (!next.length) { setStep('pick'); setEditing(false); }
  };

  async function publish() {
    if (busy || !items.length) return;
    setBusy(true);
    setError('');
    try {
      const post = await createPost(caption, items);
      onPublished(post);
    } catch (e) {
      setError(e.message || 'Не вдалося опублікувати. Спробуйте ще раз.');
    } finally {
      setBusy(false);
    }
  }

  const current = items[active];
  const preview = (size) => {
    const box = {width: size, height: size};
    if (!current) return <View style={[box, s.previewEmpty]}><Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.5)" /></View>;
    if (current.type === 'video') return <View style={[box, s.previewFrame]}><VideoSlide key={current.uri} url={current.uri} active box={box} /></View>;
    return <View style={[box, s.previewFrame]}><Image source={{uri: current.uri}} style={box} resizeMode="cover" /></View>;
  };

  const gap = 4;
  const cell = Math.floor((width - 8 - gap * 2) / 3);

  return (
    <View style={s.root}>
      <Fade color="#FF4FA3" height={insets.top + 26} top max={0.45} />

      {step === 'pick' ? (
        <View style={{flex: 1}}>
          <View style={[s.header, {paddingTop: insets.top + 9}]}>
            <Round label="Назад" onPress={goBack}><Ionicons name="chevron-back" size={18} color={colors.purple} /></Round>
            <Text style={s.title}>Новий допис</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Далі" disabled={!items.length} onPress={() => setStep('edit')} hitSlop={10} style={[s.next, !items.length && {opacity: 0.4}]}>
              <Ionicons name="chevron-forward" size={26} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={{alignItems: 'center', marginTop: 44}}>{preview(Math.round(width * 0.8))}</View>

          <View style={s.recentRow}>
            <View style={s.recent}>
              <Text style={s.recentText}>Нещодавні</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={pickMedia} style={s.pill}>
              <Text style={s.pillText}>Вибрати</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[s.grid, {gap, paddingBottom: 90}]} showsVerticalScrollIndicator={false}>
            {items.length === 0 && <Text style={s.hint}>Натисніть «Вибрати», щоб додати фото або відео</Text>}
            {items.map((item, i) => (
              <TouchableOpacity key={item.uri} accessibilityRole="button" accessibilityLabel={`Файл ${i + 1}`} activeOpacity={0.85} onPress={() => setActive(i)}
                style={[{width: cell, height: Math.round(cell * 7 / 6), borderRadius: 4, overflow: 'hidden'}, i === active && s.cellActive]}>
                <Thumb item={item} size={{width: '100%', height: '100%'}} big />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!!error && <Text style={s.error}>{error}</Text>}
          <Fade color={colors.purple} height={70} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.header, {paddingTop: insets.top + 9}]}>
            <Round label="Назад" onPress={goBack} disabled={busy}><Ionicons name="chevron-back" size={18} color={colors.purple} /></Round>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 16}}>
            <View style={{alignItems: 'center', marginTop: 40}}>{preview(Math.round(width * 0.87))}</View>

            <View style={s.line} />
            <View style={s.tools}>
              {TOOLS.map(t => (
                <TouchableOpacity key={t.key} accessibilityRole="button" accessibilityLabel={t.label} disabled={!t.enabled} onPress={() => setEditing(v => !v)} style={[s.tool, !t.enabled && {opacity: 0.5}]}>
                  <View style={[s.toolBox, t.key === 'text' && editing && {backgroundColor: 'rgba(220,250,66,0.2)'}]}>
                    {t.text ? <Text style={s.toolText}>{t.text}</Text> : <Ionicons name={t.icon} size={26} color={colors.white} />}
                  </View>
                  <Text style={s.toolLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {editing ? (
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Напишіть підпис…"
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                autoFocus
                maxLength={MAX_CAPTION}
                style={s.captionInput}
              />
            ) : !!caption && (
              <Text numberOfLines={2} style={s.captionPreview} onPress={() => setEditing(true)}>{caption}</Text>
            )}
            <View style={[s.line, {marginTop: 24}]} />
          </ScrollView>

          {!!error && <Text style={s.error}>{error}</Text>}
          <View style={[s.footer, {paddingBottom: Math.max(insets.bottom, 12) + 4}]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 4, alignItems: 'center', paddingTop: 6, paddingRight: 6}} style={{flex: 1}}>
              {items.map((item, i) => (
                <View key={item.uri} style={s.thumbWrap}>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Файл ${i + 1}`} onPress={() => setActive(i)} style={[s.thumb, i === active && s.thumbActive]}>
                    <Thumb item={item} size={{width: 34, height: 39}} />
                  </TouchableOpacity>
                  {/* окремо від мініатюри: <button> не може бути всередині <button> */}
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Прибрати" onPress={() => remove(i)} hitSlop={6} disabled={busy} style={s.remove}>
                    <Ionicons name="close" size={10} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Додати ще" onPress={pickMedia} disabled={busy || items.length >= MAX_MEDIA} style={[s.thumb, s.thumbAdd, items.length >= MAX_MEDIA && {opacity: 0.4}]}>
                <Ionicons name="add-circle-outline" size={28} color={colors.white} />
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity accessibilityRole="button" onPress={publish} disabled={busy || !items.length} style={[s.pill, s.publish]}>
              {busy ? <ActivityIndicator size="small" color={colors.purple} /> : <Text style={s.pillText}>Опублікувати</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // elevation потрібен, щоб на Android екран був вище за таббар
  root: {...StyleSheet.absoluteFillObject, backgroundColor: colors.purple, zIndex: 30, elevation: 30},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingBottom: 4},
  round: {width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center'},
  next: {width: 28, alignItems: 'center'},
  title: {fontSize: 16, fontWeight: '700', color: colors.white},
  previewFrame: {overflow: 'hidden', backgroundColor: '#111'},
  previewEmpty: {backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center'},
  recentRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 16, marginBottom: 12},
  recent: {flexDirection: 'row', alignItems: 'center', gap: 4},
  recentText: {fontSize: 14, color: colors.white},
  pill: {backgroundColor: colors.lime, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: {width: 0, height: 4}, elevation: 3},
  pillText: {fontSize: 14, color: colors.purple},
  grid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4},
  cellActive: {borderWidth: 3, borderColor: colors.lime},
  hint: {width: '100%', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.7)', paddingTop: 24, paddingHorizontal: 24},
  videoTile: {backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center'},
  line: {height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 25, marginTop: 40},
  tools: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 26, marginTop: 40},
  tool: {alignItems: 'center', gap: 7, width: 56},
  toolBox: {width: 36, height: 41, borderWidth: 1, borderColor: colors.lime, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  toolText: {fontSize: 12, color: colors.white},
  toolLabel: {fontSize: 12, color: '#D5C2F0'},
  captionInput: {marginHorizontal: 25, marginTop: 20, minHeight: 56, maxHeight: 140, borderWidth: 1, borderColor: colors.lime, borderRadius: 8, padding: 12, fontSize: 14, color: colors.white, textAlignVertical: 'top'},
  captionPreview: {marginHorizontal: 25, marginTop: 16, fontSize: 14, color: colors.white},
  error: {fontSize: 13, color: colors.error, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 8},
  footer: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 8},
  thumbWrap: {width: 36, height: 41},
  thumb: {width: 36, height: 41, borderWidth: 1, borderColor: colors.lime, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  thumbActive: {borderWidth: 2},
  thumbAdd: {borderColor: colors.lime},
  remove: {position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center'},
  publish: {minWidth: 120},
});
