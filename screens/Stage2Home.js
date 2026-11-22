import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, View, Text, ScrollView, TouchableOpacity, Image, StyleSheet} from 'react-native';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import ConnectedAccount, {FeedPost, PostEditor, RequestError} from './Stage2Account';
import {readFeed} from '../services/social';


const STORIES = [
  {name: 'Your name', tone: '#C9B8FF', own: true},
  {name: 'name', tone: '#7C5CFF'},
  {name: 'name_122…', tone: '#FFB38A'},
  {name: 'name', tone: '#FFD84D'},
  {name: 'name', tone: '#9FD8FF'},
];
const TABS = [
  {key: 'home', icon: 'home-outline', lib: Ionicons, label: 'Головна'},
  {key: 'reels', icon: 'play-box-outline', lib: MaterialCommunityIcons, label: 'Рілси'},
  {key: 'add', icon: 'plus-box-outline', lib: MaterialCommunityIcons, label: 'Створити'},
  {key: 'search', icon: 'search-outline', lib: Ionicons, label: 'Пошук'},
];

export default function Home({profile, onLogout}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  const [editing, setEditing] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [busy, setBusy] = useState(false);
  const photo = currentProfile.avatarUrl ?? currentProfile.photo;

  function navigate(nextTab) {
    if (busy) return;
    setEditing(null);
    setTab(nextTab);
  }

  return (
    <View style={h.root}>
      {tab === 'home' && <Feed photo={photo} name={currentProfile.username} busy={busy}
        onBusyChange={setBusy} onEdit={post => {
          if (busy) return;
          setEditing(post);
          setTab('add');
        }} />}
      {tab === 'profile' && <ConnectedAccount onProfileChange={setCurrentProfile} onLogout={onLogout}
        onBusyChange={setBusy} />}
      {tab === 'add' && <PostEditor key={editing?.id ?? 'new'} post={editing} onDone={() => {
        setEditing(null);
        setTab('home');
      }} onCancel={() => navigate('home')} onBusyChange={setBusy} />}
      {(tab === 'reels' || tab === 'search') && (
        <View style={[h.soon, {paddingTop: insets.top}]}><Text style={h.soonText}>Цей розділ ще в розробці</Text></View>
      )}
      <TabBar tab={tab} onChange={navigate} photo={photo} />
    </View>
  );
}

function Feed({photo, name, busy, onBusyChange, onEdit}) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);

  async function load(cursor) {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const next = await readFeed(cursor);
      if (id !== request.current) return;
      setPage(previous => {
        if (!cursor || !previous) return next;
        const existing = new Set(previous.items.map(post => post.id));
        return {...next, items: [...previous.items, ...next.items.filter(post => !existing.has(post.id))]};
      });
    } catch (failure) {
      if (id === request.current) setError(failure.message);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => { request.current++; };
  }, []);

  return (
    <View style={{flex: 1}}>
      <TopGlow height={insets.top + 26} />
      <View style={[h.header, {paddingTop: insets.top, height: insets.top + 54}]}>
        <Image source={require('../assets/yuno-logo.png')} resizeMode="contain" accessibilityLabel="YUNO" style={h.logo} />
        <View style={h.headerIcons}>
          <TouchableOpacity accessibilityLabel="Сповіщення" style={h.circle}><Ionicons name="heart-outline" size={22} color={colors.purple} /></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Повідомлення" style={h.circle}><Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.purple} /></TouchableOpacity>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 130}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={h.stories}>
          {STORIES.map((s, i) => <Story key={i} story={s} photo={s.own ? photo : null} label={s.own ? name : s.name} />)}
        </ScrollView>
        <View style={h.posts}>
          <RequestError message={error} />
          {!loading && !error && page?.items.length === 0 && <Text>У стрічці ще немає дописів.</Text>}
          {page?.items.map(post => <FeedPost key={post.id} post={post} disabled={busy}
            onEdit={onEdit} onBusyChange={onBusyChange} onDeleted={id => {
              setPage(previous => ({...previous, items: previous.items.filter(item => item.id !== id)}));
              load();
            }} />)}
          {loading && <ActivityIndicator color={colors.purple} />}
          {!loading && (error || page?.nextCursor) && (
            <TouchableOpacity accessibilityRole="button" disabled={busy}
              onPress={() => load(error ? null : page.nextCursor)}>
              <Text style={h.feedAction}>{error ? 'Оновити стрічку' : 'Завантажити ще'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}


function TopGlow({height}) {
  const strips = 10;
  return (
    <View pointerEvents="none" style={[h.glow, {height}]}>
      {Array.from({length: strips}, (_, i) => <View key={i} style={{flex: 1, backgroundColor: colors.lime, opacity: 0.55 * (1 - i / strips)}} />)}
    </View>
  );
}

function Avatar({size, tone, photo, ring = false}) {
  const inner = ring ? size - 8 : size;
  const body = photo
    ? <Image source={{uri: photo}} style={{width: inner, height: inner, borderRadius: inner / 2}} />
    : <View style={{width: inner, height: inner, borderRadius: inner / 2, backgroundColor: tone, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="person" size={inner * 0.55} color="rgba(255,255,255,0.85)" /></View>;
  if (!ring) return body;
  return <View style={{width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.crimson, padding: 2, alignItems: 'center', justifyContent: 'center'}}>{body}</View>;
}

function Story({story, photo, label}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Історія: ${label}`} style={h.story}>
      <View>
        <Avatar size={70} tone={story.tone} photo={photo} ring={!story.own} />
        {story.own && <View style={h.plus}><Ionicons name="add" size={14} color={colors.white} /></View>}
      </View>
      <Text numberOfLines={1} style={h.storyName}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabBar({tab, onChange, photo}) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[h.tabWrap, {bottom: Math.max(insets.bottom, 12)}]}>
      <View style={h.tabBar}>
        {TABS.map(t => {
          const Icon = t.lib;
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{selected: active}} onPress={() => onChange(t.key)} style={[h.tabItem, active && h.tabItemActive]}>
              <Icon name={t.icon} size={32} color={active ? colors.white : colors.ink} />
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Профіль" onPress={() => onChange('profile')} style={tab === 'profile' ? h.meActive : null}>
          <Avatar size={36} tone="#7C5CFF" photo={photo} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  feedAction: {color: colors.purple, fontWeight: '600', paddingVertical: 8},
  root: {flex: 1, backgroundColor: colors.page},
  glow: {position: 'absolute', top: 0, left: 0, right: 0},
  header: {paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  logo: {width: 52, height: 38, tintColor: colors.purple},
  headerIcons: {flexDirection: 'row', gap: 8},
  circle: {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  stories: {paddingHorizontal: 20, gap: 12, paddingTop: 1},
  story: {width: 70, alignItems: 'center', gap: 2},
  storyName: {fontSize: 12, color: colors.ink, width: 70, textAlign: 'center'},
  plus: {position: 'absolute', right: 0, bottom: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1A7BFF', borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  posts: {paddingHorizontal: 12, paddingTop: 16, gap: 20},
  tabWrap: {position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, alignItems: 'center'},
  tabBar: {width: '100%', maxWidth: 343, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 6},
  tabItem: {padding: 8, borderRadius: 12},
  tabItemActive: {backgroundColor: colors.purple},
  meActive: {borderRadius: 18, borderWidth: 2, borderColor: colors.purple},
  soon: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  soonText: {fontSize: 14, color: colors.mutedText},
});
