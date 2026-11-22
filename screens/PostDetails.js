import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import Avatar from '../components/Avatar';
import PostMedia from '../components/PostMedia';
import {getPost} from '../services/account';
import {timeAgo} from '../helpers';

// Екран допису поверх Home. Спочатку показує дані зі стрічки, потім оновлює їх через GET /posts/{id}.
export default function PostDetails({post: initial, onBack}) {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const [post, setPost] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPost(await getPost(initial.id));
    } catch (e) {
      setError(e.message); // залишаємо дані зі стрічки
    } finally {
      setLoading(false);
    }
  }, [initial.id]);

  useEffect(() => { load(); }, [load]);

  const mediaWidth = Math.min(width, 430);
  const author = post.author ?? {};
  const media = post.media ?? [];

  return (
    <View style={s.root}>
      <View style={[s.header, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Назад" onPress={onBack} hitSlop={12} style={s.back}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Допис</Text>
        <View style={s.back}>{loading && <ActivityIndicator size="small" color={colors.purple} />}</View>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: Math.max(insets.bottom, 16) + 24}}>
        <View style={s.author}>
          <Avatar size={40} photo={author.avatarUrl} />
          <View>
            <Text style={s.name}>{author.displayName || author.username}</Text>
            {!!author.username && <Text style={s.username}>@{author.username}</Text>}
          </View>
        </View>

        {media.length > 0 && (
          <View style={{alignItems: 'center'}}>
            <PostMedia media={media} width={mediaWidth} height={Math.round(mediaWidth * 1.1)} interactive />
          </View>
        )}

        <View style={s.body}>
          {!!post.caption && <Text style={s.caption}>{post.caption}</Text>}
          <Text style={s.time}>
            {timeAgo(post.createdAt)}{post.updatedAt ? ' · змінено' : ''}
          </Text>
          {!!error && (
            <TouchableOpacity accessibilityRole="button" onPress={load}>
              <Text style={s.error}>{error} Натисніть, щоб оновити.</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  // elevation потрібен, щоб на Android екран був вище за таббар (він теж має elevation)
  root: {...StyleSheet.absoluteFillObject, backgroundColor: colors.page, zIndex: 20, elevation: 20},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8},
  back: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 16, fontWeight: '600', color: colors.ink},
  author: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12},
  name: {fontSize: 14, fontWeight: '600', color: colors.ink},
  username: {fontSize: 12, color: colors.muted},
  body: {paddingHorizontal: 16, paddingTop: 12, gap: 8},
  caption: {fontSize: 15, lineHeight: 21, color: '#0A0A0A'},
  time: {fontSize: 12, color: colors.muted},
  error: {fontSize: 13, color: colors.error},
});
