import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useVideoPlayer, VideoView} from 'expo-video';
import {colors} from '../theme';
import {isVideoUrl} from '../helpers';

// Карусель фото й відео.
// interactive=false (стрічка): відео — лише обкладинка з іконкою play, натискання відкриває допис.
// interactive=true (екран допису): відео відтворюється з вбудованими елементами керування.
export default function PostMedia({media, width, height, interactive = false, onPress}) {
  const [index, setIndex] = useState(0);
  const many = media.length > 1;
  return (
    <View>
      <View style={[s.frame, {width, height}]}>
        <FlatList
          data={media}
          horizontal
          pagingEnabled
          scrollEnabled={many}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(item, i) => `${i}:${item.url}`}
          getItemLayout={(_, i) => ({length: width, offset: width * i, index: i})}
          initialNumToRender={1}
          windowSize={3}
          renderItem={({item, index: i}) => (
            <Slide item={item} width={width} height={height} active={i === index} interactive={interactive} onPress={onPress} />
          )}
        />
        {many && <View style={s.counter}><Text style={s.counterText}>{index + 1}/{media.length}</Text></View>}
      </View>
      {many && (
        <View style={s.dots}>
          {media.map((_, i) => <View key={i} style={i === index ? s.dotActive : s.dot} />)}
        </View>
      )}
    </View>
  );
}

function Slide({item, width, height, active, interactive, onPress}) {
  const box = {width, height};
  if (isVideoUrl(item.url)) {
    if (interactive) return <VideoSlide url={item.url} active={active} box={box} />;
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress} style={[s.dark, box]} accessibilityLabel="Відео">
        <View style={s.play}><Ionicons name="play" size={28} color={colors.white} /></View>
      </TouchableOpacity>
    );
  }
  return <ImageSlide url={item.url} box={box} contain={interactive} onPress={onPress} />;
}

function ImageSlide({url, box, contain, onPress}) {
  const [failed, setFailed] = useState(false);
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.9 : 1} onPress={onPress} disabled={!onPress} style={[s.dark, box]}>
      {failed
        ? <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.6)" />
        : <Image source={{uri: url}} style={box} resizeMode={contain ? 'contain' : 'cover'} onError={() => setFailed(true)} />}
    </TouchableOpacity>
  );
}

export function VideoSlide({url, active, box}) {
  const player = useVideoPlayer(url, p => { p.loop = false; });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sub = player.addListener('statusChange', ({status}) => setFailed(status === 'error'));
    return () => sub.remove();
  }, [player]);

  // Свайп до іншого слайда зупиняє відео.
  useEffect(() => {
    if (!active) player.pause();
  }, [active, player]);

  if (failed) {
    return (
      <View style={[s.dark, box]}>
        <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.7)" />
        <Text style={s.failText}>Не вдалося відтворити відео</Text>
      </View>
    );
  }
  return <VideoView player={player} style={box} nativeControls contentFit="contain" />;
}

const s = StyleSheet.create({
  frame: {borderRadius: 8, overflow: 'hidden', backgroundColor: '#111'},
  dark: {backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', gap: 8},
  play: {width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center'},
  failText: {fontSize: 14, color: 'rgba(255,255,255,0.8)'},
  counter: {position: 'absolute', top: 12, right: 12, backgroundColor: colors.pink, borderRadius: 30, paddingHorizontal: 8, paddingVertical: 4},
  counterText: {fontSize: 14, color: colors.white},
  dots: {flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', marginTop: 8},
  dotActive: {width: 20, height: 6, borderRadius: 30, backgroundColor: '#D9D9D9'},
  dot: {width: 6, height: 6, borderRadius: 30, backgroundColor: '#595959'},
});
