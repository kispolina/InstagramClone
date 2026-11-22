import React from 'react';
import {Modal, View, Text, Pressable, TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';

// Bottom sheet «Створити» (макет Create post). Поки доступний лише «Допис».
const ROWS = [
  {key: 'post', label: 'Допис', icon: 'images-outline', color: '#000', enabled: true, gap: 12},
  {key: 'story', label: 'Розповідь', icon: 'add-circle-outline', color: '#000', enabled: false, gap: 12},
  {key: 'yunos', label: 'Відео Yunos', icon: 'heart-outline', color: colors.pink, enabled: false, gap: 24},
];

export default function CreateSheet({visible, onClose, onPost}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Закрити" />
        <View style={[s.sheet, {paddingBottom: Math.max(insets.bottom, 16) + 24}]}>
          <Text style={s.title}>Створити</Text>
          <View style={s.rows}>
            {ROWS.map(row => (
              <TouchableOpacity
                key={row.key}
                accessibilityRole="button"
                accessibilityState={{disabled: !row.enabled}}
                disabled={!row.enabled}
                onPress={onPost}
                style={[s.row, {marginTop: row.gap === 24 ? 12 : 0}, !row.enabled && s.rowOff]}
              >
                <Ionicons name={row.icon} size={28} color={row.color} />
                <Text style={s.label}>{row.label}</Text>
                {!row.enabled && <Text style={s.soon}>Скоро</Text>}
                <Ionicons name="chevron-forward" size={22} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, justifyContent: 'flex-end', alignItems: 'center'},
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)'},
  sheet: {width: '100%', maxWidth: 430, backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, paddingHorizontal: 20, gap: 24},
  title: {fontSize: 20, fontWeight: '500', color: '#404040'},
  rows: {gap: 12},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EBECFB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 16},
  rowOff: {opacity: 0.55},
  label: {flex: 1, fontSize: 16, fontWeight: '500', color: '#373737'},
  soon: {fontSize: 12, color: '#6B6B6B'},
});
