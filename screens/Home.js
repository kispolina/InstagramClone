import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, FlatList, TouchableOpacity, Image, StyleSheet, useWindowDimensions, ActivityIndicator, RefreshControl, BackHandler} from 'react-native';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import {loadFeed} from '../services/account';
import {mergeById, timeAgo, toProfile} from '../helpers';
import ProfileScreen from './ProfileScreen';
import Avatar from '../components/Avatar';
import PostMedia from '../components/PostMedia';
import PostDetails from './PostDetails';
import CreatePost from './CreatePost';
import CreateSheet from '../components/CreateSheet';


const PAGE_SIZE = 10;
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

export default function Home({profile: initialProfile, onLogout}) {
  const insets = useSafeAreaInsets();
  const updateProfile = useCallback(user => setProfile(toProfile(user)), []);
  const [profile, setProfile] = useState(initialProfile);
  const [tab, setTab] = useState('home');
  const [openPost, setOpenPost] = useState(null);
  const [sheet, setSheet] = useState(false);       // bottom sheet «Створити»
  const [creating, setCreating] = useState(false); // екран «Новий допис»
  const [feedVersion, setFeedVersion] = useState(0); // збільшується після публікації -> стрічка оновлюється
  const choose = key => (key === 'add' ? setSheet(true) : setTab(key));

  // Кнопка «Назад» на Android закриває допис.
  useEffect(() => {
    if (!openPost) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOpenPost(null); return true; });
    return () => sub.remove();
  }, [openPost]);

  return (
    <View style={h.root}>
      {/* Стрічка лишається змонтованою, щоб не губити дані й позицію прокрутки при зміні вкладки */}
      <View style={{flex: 1, display: tab === 'home' ? 'flex' : 'none'}}>
        <Feed profile={profile} onOpenPost={setOpenPost} version={feedVersion} />
      </View>
      {tab === 'profile' && <ProfileScreen onProfileChange={updateProfile} onLogout={onLogout} />}
      {tab !== 'home' && tab !== 'profile' && (
        <View style={[h.soon, {paddingTop: insets.top}]}><Text style={h.soonText}>Цей розділ ще в розробці</Text></View>
      )}
      <TabBar tab={tab} onChange={choose} photo={profile.photo} />
      {openPost && <PostDetails post={openPost} onBack={() => setOpenPost(null)} />}
      <CreateSheet visible={sheet} onClose={() => setSheet(false)} onPost={() => { setSheet(false); setCreating(true); }} />
      {creating && (
        <CreatePost
          onClose={() => setCreating(false)}
          onPublished={() => { setCreating(false); setTab('home'); setFeedVersion(v => v + 1); }}
        />
      )}
    </View>
  );
}

function Feed({profile, onOpenPost, version}) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');        // помилка оновлення, коли стрічка вже показана
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const busy = useRef(false);        // один запит за раз
  const generation = useRef(0);      // застарілі відповіді (після оновлення) ігноруємо

  const loadFirst = useCallback(async (pull = false) => {
    const gen = ++generation.current;
    busy.current = true;
    setLoadingMore(false);
    setMoreError('');
    if (pull) setRefreshing(true); else setStatus('loading');
    try {
      const result = await loadFeed(null, PAGE_SIZE);
      if (gen !== generation.current) return;
      setPosts(result.items ?? []);
      setCursor(result.nextCursor ?? null);
      setNotice('');
      setStatus('ready');
    } catch (e) {
      if (gen !== generation.current) return;
      if (pull) setNotice(e.message); else { setError(e.message); setStatus('error'); }
    } finally {
      if (gen === generation.current) { busy.current = false; setRefreshing(false); }
    }
  }, []);

  const loadMore = useCallback(async (force = false) => {
    if (busy.current || !cursor || (moreError && !force)) return;
    const gen = generation.current;
    busy.current = true;
    setLoadingMore(true);
    setMoreError('');
    try {
      const result = await loadFeed(cursor, PAGE_SIZE);
      if (gen !== generation.current) return;
      const items = result.items ?? [];
      setPosts(prev => mergeById(prev, items));
      setCursor(items.length ? result.nextCursor ?? null : null); // порожня сторінка = кінець
    } catch (e) {
      if (gen !== generation.current) return;
      setMoreError(e.message);
    } finally {
      if (gen === generation.current) { busy.current = false; setLoadingMore(false); }
    }
  }, [cursor, moreError]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  // Після публікації нового допису перезавантажуємо стрічку (version змінюється з Home).
  const firstVersion = useRef(version);
  useEffect(() => {
    if (version !== firstVersion.current) { firstVersion.current = version; loadFirst(); }
  }, [version, loadFirst]);

  const header = (
    <View>
      <FlatList
        horizontal
        data={STORIES}
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={h.stories}
        renderItem={({item}) => <Story story={item} photo={item.own ? profile.photo : null} label={item.own ? 'Your name' : item.name} />}
      />
      {!!notice && (
        <TouchableOpacity accessibilityRole="button" onPress={() => loadFirst(true)} style={h.notice}>
          <Text style={h.noticeText}>{notice} Натисніть, щоб повторити.</Text>
        </TouchableOpacity>
      )}
      <View style={{height: 16}} />
    </View>
  );

  const footer = loadingMore
    ? <View style={h.footer}><ActivityIndicator color={colors.purple} /></View>
    : moreError
      ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => loadMore(true)} style={h.footer}>
          <Text style={h.noticeText}>Не вдалося завантажити. Повторити</Text>
        </TouchableOpacity>
      )
      : null;

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

      {status === 'loading' && (
        <View style={h.center}><ActivityIndicator size="large" color={colors.purple} /></View>
      )}

      {status === 'error' && (
        <View style={h.center}>
          <Text style={h.stateText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => loadFirst()} style={h.logout}>
            <Text style={h.logoutText}>Повторити</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ready' && (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({item}) => <Post post={item} onOpen={onOpenPost} />}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={<View style={h.empty}><Text style={h.stateText}>Стрічка порожня</Text></View>}
          ItemSeparatorComponent={() => <View style={{height: 20}} />}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFirst(true)} tintColor={colors.purple} colors={[colors.purple]} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 130, flexGrow: 1}}
        />
      )}
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

// Поля допису з API: id, caption, media[{url}], author{id, username, displayName, avatarUrl}, createdAt, updatedAt, isMine.
// Лічильників лайків/коментарів API не віддає, тому лайк і збереження поки лише локальні, без чисел.
const Post = React.memo(function Post({post, onOpen}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const {width} = useWindowDimensions();
  const mediaWidth = Math.min(width, 430) - 24;
  const author = post.author ?? {};
  const name = author.username || author.displayName || '';
  const media = post.media ?? [];
  const open = () => onOpen(post);

  const action = (icon, color, onPress, label) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} activeOpacity={onPress ? 0.6 : 1} style={h.action}>
      <Ionicons name={icon} size={24} color={color} />
    </TouchableOpacity>
  );

  return (
    <View style={h.post}>
      <View style={h.postHead}>
        <View style={h.postUser}>
          <Avatar size={36} photo={author.avatarUrl} />
          <Text style={h.userName}>{name}</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Ще" style={h.more}><Ionicons name="ellipsis-vertical" size={20} color={colors.ink} /></TouchableOpacity>
      </View>

      {media.length > 0 && <PostMedia media={media} width={mediaWidth} height={340} onPress={open} />}

      <View style={h.actions}>
        <View style={h.actionsLeft}>
          {action(liked ? 'heart' : 'heart-outline', liked ? colors.pink : colors.purple, () => setLiked(v => !v), 'Подобається')}
          {action('chatbubble-ellipses-outline', colors.purple, open, 'Відкрити допис')}
          {action('repeat', colors.purple, undefined, 'Репост')}
          {action('paper-plane-outline', colors.purple, undefined, 'Надіслати')}
        </View>
        {action(saved ? 'bookmark' : 'bookmark-outline', saved ? colors.crimson : colors.purple, () => setSaved(v => !v), 'Зберегти')}
      </View>

      {!!post.caption && (
        <View style={h.caption}>
          <Text numberOfLines={2} style={h.captionText}>
            <Text style={h.captionUser}>{name} </Text>{post.caption}
          </Text>
          {post.caption.length > 80 && <TouchableOpacity onPress={open} hitSlop={8}><Text style={h.more2}>більше</Text></TouchableOpacity>}
        </View>
      )}
      <Text style={h.time}>{timeAgo(post.createdAt)}</Text>
    </View>
  );
});

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
          <Avatar size={36} photo={photo} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Profile({profile, onLogout}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[h.profile, {paddingTop: insets.top + 48}]}>
      <Avatar size={120} photo={profile.photo} />
      <Text style={h.profileName}>@{profile.nickname}</Text>
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
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24, paddingBottom: 100},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60},
  stateText: {fontSize: 14, color: colors.mutedText, textAlign: 'center'},
  notice: {marginHorizontal: 20, marginTop: 12},
  noticeText: {fontSize: 13, color: colors.error, textAlign: 'center'},
  footer: {paddingVertical: 20, alignItems: 'center'},
  post: {gap: 8, paddingHorizontal: 12},
  postHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  postUser: {flexDirection: 'row', alignItems: 'center', gap: 12},
  userName: {fontSize: 14, color: colors.ink},
  more: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  actions: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6},
  actionsLeft: {flexDirection: 'row', alignItems: 'center', gap: 16},
  action: {flexDirection: 'row', alignItems: 'center', gap: 4},
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
