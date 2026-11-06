import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Platform} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors} from './theme';

export function Logo({style}) {
  return <Image source={require('./assets/yuno-logo.png')} resizeMode="contain" accessibilityLabel="YUNO" style={[u.logo, style]} />;
}

export function Info({title, text, gap = 21, large = false}) {
  return (
    <View style={{gap}}>
      <Text accessibilityRole="header" style={u.title}>{title}</Text>
      {!!text && <Text style={[u.subtitle, large && u.subtitleLarge]}>{text}</Text>}
    </View>
  );
}

export function Button({label, onPress, disabled = false}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{disabled}}
      disabled={disabled}
      activeOpacity={0.8}
      onPress={onPress}
      style={[u.button, disabled && u.buttonOff]}>
      <Text style={[u.buttonText, disabled && u.buttonTextOff]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function TextLink({children, onPress, style}) {
  return (
    <TouchableOpacity accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={[u.link, style]}>{children}</Text>
    </TouchableOpacity>
  );
}


export function Field({value, onChangeText, placeholder, secure = false, error = false, helper, left, ...rest}) {
  const [shown, setShown] = useState(false);
  return (
    <View style={{gap: 4}}>
      <View style={[u.field, error && u.fieldError]}>
        {left}
        <TextInput
          accessibilityLabel={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secure && !shown}
          autoCapitalize="none"
          autoCorrect={false}
          style={[u.input, Platform.select({web: {outlineStyle: 'none'}, default: {}})]}
          {...rest}
        />
        {secure && (
          <TouchableOpacity accessibilityLabel={shown ? 'Сховати пароль' : 'Показати пароль'} onPress={() => setShown(s => !s)} hitSlop={8}>
            <Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={24} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>
      {!!helper && <Text style={[u.helper, error && u.helperError]}>{helper}</Text>}
    </View>
  );
}

function Flag() {
  return (
    <View style={u.flag}>
      <View style={{flex: 1, backgroundColor: '#0057B7'}} />
      <View style={{flex: 1, backgroundColor: '#FFD700'}} />
    </View>
  );
}


export function PhoneField({value, onChangeText, ...rest}) {
  return (
    <Field
      left={<><Flag /><Text style={u.prefix}>+380</Text></>}
      value={value}
      onChangeText={v => onChangeText(v.replace(/\D/g, '').slice(0, 9))}
      placeholder="XX XXX XX XX"
      keyboardType="number-pad"
      textContentType="telephoneNumber"
      {...rest}
    />
  );
}

export function Tabs({items, value, onChange}) {
  return (
    <View style={u.tabs} accessibilityRole="tablist">
      {items.map(item => {
        const active = item.key === value;
        return (
          <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{selected: active}} onPress={() => onChange(item.key)} style={[u.tab, active && u.tabActive]}>
            <Text style={[u.tabText, active && u.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const u = StyleSheet.create({
  logo: {width: 160, height: 116, alignSelf: 'center'},
  title: {fontSize: 24, fontWeight: '700', color: colors.white},
  subtitle: {fontSize: 14, color: colors.white},
  subtitleLarge: {fontSize: 16},
  button: {height: 44, borderRadius: 36, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', padding: 10, width: '100%'},
  buttonOff: {backgroundColor: colors.disabled},
  buttonText: {fontSize: 14, color: colors.buttonText},
  buttonTextOff: {color: colors.disabledText},
  link: {fontSize: 14, color: colors.white, textDecorationLine: 'underline'},
  field: {height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10},
  fieldError: {borderColor: colors.error},
  input: {flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 0, height: '100%'},
  helper: {fontSize: 12, color: colors.white},
  helperError: {color: colors.error},
  flag: {width: 24, height: 18, borderRadius: 2, overflow: 'hidden'},
  prefix: {fontSize: 14, color: colors.ink},
  tabs: {flexDirection: 'row', backgroundColor: colors.lime, padding: 4, borderRadius: 8},
  tab: {flex: 1, paddingVertical: 8, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  tabActive: {backgroundColor: '#FDFDFD'},
  tabText: {fontSize: 14, lineHeight: 18, fontWeight: '500', color: colors.mutedText},
  tabTextActive: {color: colors.inkStrong},
});
