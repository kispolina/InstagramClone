import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, useWindowDimensions} from 'react-native';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import ConnectedAccount from './ConnectedAccount';


const STORIES = [
  {name: 'Your name', tone: '#C9B8FF', own: true},
  {name: 'name', tone: '#7C5CFF'},
  {name: 'name_122…', tone: '#FFB38A'},
  {name: 'name', tone: '#FFD84D'},
  {name: 'name', tone: '#9FD8FF'},
];
const POSTS = [
  {id: 1, kind: 'photo', user: 'name', tone: '#EBD3CD', likes: 121, comments: 10, reposts: 0, sends: 2, saves: 3, liked: true, saved: true, sound: true, caption: 'Конспекти перед сесією: рожевий маркер рятує все', time: '1 годину тому'},
  {id: 2, kind: 'carousel', user: 'name', tone: '#EBD3CD', slides: ['#EBD3CD', '#E3C2BA', '#F1DCD5', '#D9B9B0', '#EFD0C7'], likes: 120, comments: 10, reposts: 0, sends: 2, saves: 2, liked: false, saved: false, time: '1 годину тому'},
  {id: 3, kind: 'photo', user: 'name', tone: '#4A3B2A', likes: 120, comments: 10, reposts: 5, sends: 2, saves: 2, liked: false, saved: false, caption: 'Запалити улюблену свічку з ароматом хвої та чекати на поїзд', time: '1 годину тому'},
  {id: 4, kind: 'reels', user: 'name', tone: '#3B2E5A', likes: 120, comments: 10, reposts: 5, sends: 2, saves: 2, liked: false, saved: false, time: '1 годину тому'},
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
  const [connectedPage, setConnectedPage] = useState(null);
  return (
    <View style={h.root}>
      {tab === 'home' && <Feed profile={profile} />}
      {tab === 'profile' && <Profile profile={profile} onLogout={onLogout} onConnected={() => setConnectedPage('profile')} />}
      {tab !== 'home' && tab !== 'profile' && (
        <View style={[h.soon, {paddingTop: insets.top}]}><Text style={h.soonText}>Цей розділ ще в розробці</Text></View>
      )}
      <TabBar tab={tab} onChange={next => next === 'add' ? setConnectedPage('compose') : setTab(next)} photo={profile.photo} />
      {connectedPage && <ConnectedAccount initialPage={connectedPage} onClose={() => setConnectedPage(null)} />}
    </View>
  );
}

function Feed({profile}) {
  const insets = useSafeAreaInsets();
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
          {STORIES.map((s, i) => <Story key={i} story={s} photo={s.own ? profile.photo : null} label={s.own ? 'Your name' : s.name} />)}
        </ScrollView>
        <View style={h.posts}>
          {POSTS.map(p => <Post key={p.id} post={p} />)}
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

function Post({post}) {
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const {width} = useWindowDimensions();
  const mediaWidth = Math.min(width, 430) - 24;
  const likes = post.likes + (liked && !post.liked ? 1 : 0) - (!liked && post.liked ? 1 : 0);
  const saves = post.saves + (saved && !post.saved ? 1 : 0) - (!saved && post.saved ? 1 : 0);
  const reels = post.kind === 'reels';

  const count = (icon, n, color, onPress, label) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} activeOpacity={onPress ? 0.6 : 1} style={h.action}>
      <Ionicons name={icon} size={24} color={color} />
      {n > 0 && <Text style={h.actionText}>{n}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={h.post}>
      <View style={h.postHead}>
        <View style={h.postUser}>
          <Avatar size={36} tone="#7C5CFF" ring={reels} />
          <Text style={h.userName}>{post.user}</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Ще" style={h.more}><Ionicons name="ellipsis-vertical" size={20} color={colors.ink} /></TouchableOpacity>
      </View>

      {post.kind === 'carousel' ? (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={e => setSlide(Math.round(e.nativeEvent.contentOffset.x / mediaWidth))} style={h.media}>
            {post.slides.map((tone, i) => <View key={i} style={[h.slide, {width: mediaWidth, backgroundColor: tone}]} />)}
          </ScrollView>
          <View style={h.counter}><Text style={h.counterText}>{slide + 1}/{post.slides.length}</Text></View>
        </View>
      ) : (
        <View style={[h.media, {height: reels ? 380 : 340, backgroundColor: post.tone}]}>
          {reels && <View style={h.play}><Ionicons name="play" size={28} color={colors.white} /></View>}
          {post.sound && <>
            <View style={[h.badge, {left: 12}]}><Ionicons name="person" size={20} color={colors.ink} /></View>
            <View style={[h.badge, {right: 12}]}><Ionicons name="volume-high" size={20} color={colors.ink} /></View>
          </>}
        </View>
      )}

      {post.kind === 'carousel' && (
        <View style={h.dots}>
          {post.slides.map((_, i) => <View key={i} style={i === slide ? h.dotActive : h.dot} />)}
        </View>
      )}

      <View style={h.actions}>
        <View style={h.actionsLeft}>
          {count(liked ? 'heart' : 'heart-outline', likes, liked ? colors.pink : colors.purple, () => setLiked(v => !v), 'Подобається')}
          {count('chatbubble-ellipses-outline', post.comments, colors.purple, undefined, 'Коментарі')}
          {count('repeat', post.reposts, colors.purple, undefined, 'Репост')}
          {count('paper-plane-outline', post.sends, colors.purple, undefined, 'Надіслати')}
        </View>
        {count(saved ? 'bookmark' : 'bookmark-outline', saves, saved ? colors.crimson : colors.purple, () => setSaved(v => !v), 'Зберегти')}
      </View>

      {!!post.caption && (
        <View style={h.caption}>
          <Text numberOfLines={open ? undefined : 1} style={h.captionText}>
            <Text style={h.captionUser}>{post.user} </Text>{post.caption}
          </Text>
          {!open && <TouchableOpacity onPress={() => setOpen(true)} hitSlop={8}><Text style={h.more2}>більше</Text></TouchableOpacity>}
        </View>
      )}
      <Text style={h.time}>{post.time}</Text>
    </View>
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

function Profile({profile, onLogout, onConnected}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[h.profile, {paddingTop: insets.top + 48}]}>
      <Avatar size={120} tone="#7C5CFF" photo={profile.photo} />
      <Text style={h.profileName}>@{profile.nickname}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onConnected} style={h.logout}><Text style={h.logoutText}>Профіль і дописи Firebase</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={onLogout} style={h.logout}><Text style={h.logoutText}>Вийти</Text></TouchableOpacity>
    </View>
  );
}

const h = StyleSheet.create({
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
  post: {gap: 8},
  postHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  postUser: {flexDirection: 'row', alignItems: 'center', gap: 12},
  userName: {fontSize: 14, color: colors.ink},
  more: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  media: {borderRadius: 8, overflow: 'hidden'},
  slide: {height: 340},
  counter: {position: 'absolute', top: 12, right: 12, backgroundColor: colors.pink, borderRadius: 30, paddingHorizontal: 8, paddingVertical: 4},
  counterText: {fontSize: 14, color: colors.white},
  play: {position: 'absolute', alignSelf: 'center', top: '42%', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center'},
  badge: {position: 'absolute', bottom: 12, backgroundColor: colors.white, borderRadius: 50, padding: 4},
  dots: {flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center'},
  dotActive: {width: 20, height: 6, borderRadius: 30, backgroundColor: '#D9D9D9'},
  dot: {width: 6, height: 6, borderRadius: 30, backgroundColor: '#595959'},
  actions: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6},
  actionsLeft: {flexDirection: 'row', alignItems: 'center', gap: 16},
  action: {flexDirection: 'row', alignItems: 'center', gap: 4},
  actionText: {fontSize: 14, color: colors.ink},
  caption: {flexDirection: 'row', alignItems: 'center', gap: 4},
  captionText: {flex: 1, fontSize: 14, color: '#0A0A0A'},
  captionUser: {fontWeight: '600'},
  more2: {fontSize: 14, color: colors.muted, textDecorationLine: 'underline'},
  time: {fontSize: 12, color: colors.muted},
  tabWrap: {position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, alignItems: 'center'},
  tabBar: {width: '100%', maxWidth: 343, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 6},
  tabItem: {padding: 8, borderRadius: 12},
  tabItemActive: {backgroundColor: colors.purple},
  meActive: {borderRadius: 18, borderWidth: 2, borderColor: colors.purple},
  soon: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  soonText: {fontSize: 14, color: colors.mutedText},
  profile: {flex: 1, alignItems: 'center', gap: 16, paddingHorizontal: 20},
  profileName: {fontSize: 20, fontWeight: '700', color: colors.ink},
  logout: {height: 44, borderRadius: 36, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, marginTop: 8},
  logoutText: {fontSize: 14, color: colors.white},
});
