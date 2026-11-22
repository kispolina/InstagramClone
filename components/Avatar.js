import React from 'react';
import {View, Image} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors} from '../theme';

export default function Avatar({size, tone = '#7C5CFF', photo, ring = false}) {
  const inner = ring ? size - 8 : size;
  const body = photo
    ? <Image source={{uri: photo}} style={{width: inner, height: inner, borderRadius: inner / 2}} />
    : <View style={{width: inner, height: inner, borderRadius: inner / 2, backgroundColor: tone, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="person" size={inner * 0.55} color="rgba(255,255,255,0.85)" /></View>;
  if (!ring) return body;
  return <View style={{width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.crimson, padding: 2, alignItems: 'center', justifyContent: 'center'}}>{body}</View>;
}
