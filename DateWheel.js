import React, {useEffect, useRef, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {colors} from './theme';

const ITEM = 34;     
const VISIBLE = 5; 
const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

function Wheel({items, index, onChange}) {
  const ref = useRef(null);
  const timer = useRef(null);
  const [pos, setPos] = useState(index);

  useEffect(() => {
    setPos(index);
    const id = setTimeout(() => ref.current && ref.current.scrollTo({y: index * ITEM, animated: false}), 0);
    return () => clearTimeout(id);
  }, [index, items.length]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const clamp = y => Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM)));
  const onScroll = e => {
    const y = e.nativeEvent.contentOffset.y;
    setPos(clamp(y));
    clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const i = clamp(y);
      ref.current && ref.current.scrollTo({y: i * ITEM, animated: true});
      if (i !== index) onChange(i);
    }, 140);
  };
  const choose = i => { ref.current && ref.current.scrollTo({y: i * ITEM, animated: true}); setPos(i); onChange(i); };

  return (
    <View style={w.column}>
      <ScrollView
        ref={ref}
        style={{height: ITEM * VISIBLE}}
        contentContainerStyle={{paddingVertical: ITEM * Math.floor(VISIBLE / 2)}}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}>
        {items.map((label, i) => {
          const d = Math.abs(i - pos);
          return (
            <TouchableOpacity key={String(label)} accessibilityRole="button" accessibilityState={{selected: d === 0}} onPress={() => choose(i)} style={w.item}>
              <Text style={[w.text, d === 1 && w.near, d >= 2 && w.far, d === 0 && w.selected]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}


export default function DateWheel({value, onChange}) {
  const now = new Date();
  const years = [];
  for (let y = 1920; y <= now.getFullYear(); y++) years.push(y);
  const daysInMonth = new Date(value.y, value.m + 1, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const set = patch => {
    const next = {...value, ...patch};
    next.d = Math.min(next.d, new Date(next.y, next.m + 1, 0).getDate());
    onChange(next);
  };
  return (
    <View style={w.wrap}>
      <View pointerEvents="none" style={w.band} />
      <Wheel items={days} index={value.d - 1} onChange={i => set({d: i + 1})} />
      <Wheel items={MONTHS} index={value.m} onChange={i => set({m: i})} />
      <Wheel items={years} index={years.indexOf(value.y)} onChange={i => set({y: years[i]})} />
    </View>
  );
}

const w = StyleSheet.create({
  wrap: {flexDirection: 'row', gap: 12, height: ITEM * VISIBLE},
  band: {position: 'absolute', left: 0, right: 0, top: ITEM * 2 - 3, height: 40, borderRadius: 8, backgroundColor: colors.pink},
  column: {flex: 1},
  item: {height: ITEM, alignItems: 'center', justifyContent: 'center'},
  text: {fontSize: 18, color: '#A8A8A8', opacity: 0.85},
  near: {opacity: 0.85},
  far: {fontSize: 17, opacity: 0.7},
  selected: {fontSize: 20, color: colors.white, opacity: 1},
});
