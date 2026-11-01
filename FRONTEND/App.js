import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, StatusBar} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {validEmail, validBirthday, formatBirthdayInput} from './validation';



const topics = ['Тварини', 'Птахи', 'Коти', 'Собаки', 'Коні', 'Їжа та напої', 'Випічка', 'Кулінарія', 'Спорт', 'Американський футбол', 'Бейсбол', 'Баскетбол', 'Риболовля', 'Футбол', 'Теніс', 'Волейбол', 'Зимові види спорту', 'Книги та література', 'Подорожі', 'Кемпінг і походи', 'Активний відпочинок', 'Автомандрівки', 'Наука та інженерія', 'Комп’ютерні науки', 'Інвестиції та трейдинг', 'Технології', 'Рукоділля', 'Танці', 'Малювання', 'Фотографія', 'Музика', 'Стиль'];
const nextStep = {phone: 'code', email: 'birthday', code: 'birthday', birthday: 'password', password: 'name', name: 'username', username: 'photo', photo: 'contacts', contacts: 'interests', interests: 'done'};

export default function App() {
  return <SafeAreaProvider><Flow /></SafeAreaProvider>;
}

function Logo({style}) {
  return <Image source={require('./assets/yuno-logo.png')} resizeMode="contain" style={[s.logo, style]} accessibilityLabel="YUNO" />;
}

function Flow() {
  const [step, setStep] = useState('login');
  const [history, setHistory] = useState([]);
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState([]);
  const [photo, setPhoto] = useState(null);
  // UI-прототип: жодних серверних викликів, Firebase або справжньої реєстрації.
  const busy = false;
  const verified = false;
  const handleLogin = () => {
    if (!(data.loginId || '').trim() || !data.loginPassword) {
      setError('Введіть логін та пароль для демонстрації екрана.');
      return;
    }
    setNotice('Демо-режим: справжній вхід не виконується.');
    go('done');
  };
  const finish = () => {
    setNotice('Демо-режим: дані профілю не зберігаються.');
    go('done');
  };
  const handleLogout = () => { setData({}); setSelected([]); setPhoto(null); login(); };
  const sendReset = () => setNotice('Це макет. Лист для відновлення не надсилається.');

  const go = next => { setHistory(h => [...h, step]); setStep(next); setError(''); setNotice(''); };
  const login = () => { setStep('login'); setHistory([]); setError(''); setNotice(''); };
  const back = () => {
    if (busy || step === 'done' || (step === 'name' && !history.length)) return;
    setStep(history[history.length - 1] || 'login');
    setHistory(h => h.slice(0, -1));
    setError(''); setNotice('');
  };
  const canBack = !busy && step !== 'login' && step !== 'done' && !(step === 'name' && !history.length);
  const update = (key, value) => { setData(d => ({...d, [key]: value})); setError(''); };

  const advance = () => {
    let message = '';
    if (step === 'phone') { go('code'); setNotice('Демо: SMS не надсилається. Введіть будь-який код із 4–6 цифр.'); return; }
    if (step === 'email' && !validEmail(data.email || '')) message = 'Введіть коректну електронну пошту.';
    if (step === 'birthday' && !validBirthday(data.birthday || '')) message = 'Формат РРРР-ММ-ДД. Вам має бути щонайменше 13 років.';
    if (step === 'password' && (data.password || '').length < 6) message = 'Пароль має містити щонайменше 6 символів.';
    if (step === 'name' && !(data.name || '').trim()) message = 'Введіть ваше імʼя.';
    if (step === 'username' && !/^[a-zA-Z0-9._]{3,30}$/.test(data.username || '')) message = 'Від 3 до 30 символів: латинські літери, цифри, крапки або підкреслення.';
    if (message) { setError(message); return; }

    if (step === 'password') { go('name'); return; }
    if (step === 'interests') { finish(); return; }
    go(nextStep[step]);
  };

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7});
      if (!result.canceled) setPhoto(result.assets[0].uri);
    } catch { setError('Не вдалося відкрити галерею. Спробуйте ще раз.'); }
  };

  const uploadPhoto = () => go('contacts');

  const field = (key, placeholder, extra = {}) => (
    <TextInput
      accessibilityLabel={placeholder}
      editable={!busy}
      style={[s.input, extra.style]}
      placeholderTextColor="#8c8c8c"
      placeholder={placeholder}
      value={data[key] || ''}
      onChangeText={v => update(key, v)}
      autoCapitalize="none"
      {...extra}
    />
  );
  const button = (label, action, outline = false, enabled = true) => (
    <TouchableOpacity disabled={busy || !enabled} accessibilityState={{disabled: busy || !enabled, busy}} accessibilityRole="button" onPress={action} style={[s.button, outline && s.outline, !enabled && s.disabled, busy && s.busy]}>
      <Text style={[s.buttonText, outline && s.outlineText, !enabled && s.disabledText]}>{label}</Text>
    </TouchableOpacity>
  );
  const heading = (title, body, top = 27) => (
    <View style={[s.info, {marginTop: top}]}>
      <Text accessibilityRole="header" style={s.heading}>{title}</Text>
      {!!body && <Text style={s.body}>{body}</Text>}
    </View>
  );
  const account = (
    <TouchableOpacity disabled={busy} onPress={login} style={s.account}>
      <Text style={s.accountText}>У мене вже є акаунт</Text>
    </TouchableOpacity>
  );
  const wide = {style: [s.input, s.inputWide]};

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={s.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step !== 'login' && (
          <View pointerEvents={busy ? 'none' : 'auto'} style={s.top}>
            {canBack
              ? <TouchableOpacity accessibilityLabel="Назад" onPress={back} hitSlop={12}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
              : <View style={{width: 24}} />}
            {step === 'interests' && <TouchableOpacity disabled={busy} onPress={() => { setSelected([]); finish([]); }}><Text style={s.plain}>Пропустити</Text></TouchableOpacity>}
          </View>
        )}
        <ScrollView scrollEnabled={!busy} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {step === 'login' && <>
            <Logo style={{marginTop: 5}} />
            <Text style={s.loginGreeting}>Салют! Погнали</Text>
            <Text style={s.loginCaption}>Творимо без рамок</Text>
            <View style={s.loginFields}>
              {field('loginId', 'Ім’я користувача, пошта, мобільний номер', {keyboardType: 'email-address', textContentType: 'emailAddress', returnKeyType: 'next'})}
              {field('loginPassword', 'Пароль', {secureTextEntry: true, returnKeyType: 'go', onSubmitEditing: handleLogin})}
            </View>
            <View style={s.bottom}>
              {button('Увійти', handleLogin, false, !!(data.loginId || '').trim() && !!data.loginPassword)}
              <TouchableOpacity disabled={busy} onPress={() => go('reset')} style={s.forgot}><Text style={s.plain}>Забули пароль?</Text></TouchableOpacity>
              <Text style={s.helper}>У мене немає акаунту? <Text style={s.helperAccent} onPress={() => go('email')}>Зареєструватися</Text></Text>
            </View>
          </>}

          {step === 'reset' && <>
            <Logo style={{marginTop: 5}} />
            {heading('Забули пароль?', 'Введіть пошту, на яку надіслати посилання для відновлення пароля.', 116)}
            <View style={s.form}>
              {field('resetEmail', 'Електронна пошта', {keyboardType: 'email-address', returnKeyType: 'send', onSubmitEditing: sendReset})}
              {button('Далі', sendReset, false, validEmail(data.resetEmail || ''))}
            </View>
          </>}

          {step === 'phone' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Ваш мобільний номер?', 'Введіть ваш мобільний номер, який є дійсним, ніхто не побачить його в вашому профілі.')}
            <View style={s.form}>
              {field('phone', 'Мобільний номер', {keyboardType: 'phone-pad', textContentType: 'telephoneNumber', ...wide})}
              {button('Далі', advance, false, canAdvance(step, data))}
              {button('Увійти з поштою', () => go('email'), true)}
            </View>
          </>}

          {step === 'email' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Ваша пошта?', 'Введіть вашу електронну пошту, яка є дійсною, ніхто не побачить її у вашому профілі.')}
            <View style={s.form}>
              {field('email', 'Електронна пошта', {keyboardType: 'email-address', textContentType: 'emailAddress', returnKeyType: 'next', onSubmitEditing: advance, ...wide})}
              {button('Далі', advance, false, canAdvance(step, data))}
              {button('Увійти з номером телефону', () => go('phone'), true)}
            </View>
          </>}

          {step === 'code' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Введіть код', 'Введіть код який надійшов,\nкод активний протягом 2 хвилин')}
            <View style={s.form}>
              {field('code', 'Код', {keyboardType: 'number-pad', maxLength: 6, textContentType: 'oneTimeCode', ...wide})}
              {button('Далі', advance, false, canAdvance(step, data))}
              {button('Мені не надійшов код', () => setNotice('Це макет: справжнє SMS не надсилається.'), true)}
            </View>
          </>}

          {step === 'birthday' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Введіть вашу дату народження', 'Використовуйте вашу справжню дату народження, ніхто не побачить вашу дату народження')}
            <View style={s.form}>
              {field('birthday', 'Дата народження (РРРР-ММ-ДД)', {keyboardType: 'number-pad', maxLength: 10, returnKeyType: 'next', onChangeText: v => update('birthday', formatBirthdayInput(v)), onSubmitEditing: advance})}
              {button('Далі', advance, false, canAdvance(step, data))}
            </View>
          </>}

          {step === 'password' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Придумайте пароль', 'Введіть надійний пароль та запам’ятайте його')}
            <View style={s.form}>
              {field('password', 'Введіть пароль', {secureTextEntry: true, textContentType: 'newPassword', returnKeyType: 'next'})}
              {field('confirmPassword', 'Повторіть пароль', {secureTextEntry: true, textContentType: 'newPassword', returnKeyType: 'done', onSubmitEditing: advance})}
              {!!data.confirmPassword && data.password !== data.confirmPassword && <Text style={s.validation}>Паролі не збігаються</Text>}
              {button('Далі', advance, false, canAdvance(step, data))}
            </View>
          </>}

          {step === 'name' && <>
            <Logo style={{marginTop: 5}} />
            {heading('Хей! Вривайся', 'Введіть ваше ім’я щоб ваші друзі змогли знайти вас', 116)}
            <View style={s.form}>
              {field('name', 'Моє ім’я', {autoCapitalize: 'words', textContentType: 'name', returnKeyType: 'next', onSubmitEditing: advance})}
              {button('Далі', advance, false, canAdvance(step, data))}
            </View>
          </>}

          {step === 'username' && <>
            <Logo style={{marginTop: 5}} />
            {heading('Придумайте нікнейм', 'Ім’я користувача буде відображене в вашому профілі.\nВи можете змінити його будь-коли.', 116)}
            <View style={s.form}>
              {field('username', 'Ім’я користувача', {autoCorrect: false, returnKeyType: 'next', onSubmitEditing: advance})}
              {button('Далі', advance, false, canAdvance(step, data))}
            </View>
          </>}

          {step === 'photo' && <>
            <Logo style={{marginTop: 5}} />
            {heading('Додайте картинку профілю', 'Додайте картинку профілю.\nВи можете змінити це будь-коли', 40)}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Обрати фото профілю" disabled={busy} onPress={pick} style={s.avatarWrap}>
              {photo
                ? <Image source={{uri: photo}} style={s.avatarBig} />
                : <View style={s.avatarBig}><View style={s.avatarHead} /><View style={s.avatarBody} /></View>}
            </TouchableOpacity>
            <View style={s.bottom}>
              {!!photo && button('Змінити фото', pick, true)}
              {button('Далі', photo ? uploadPhoto : pick)}
              <TouchableOpacity disabled={busy} onPress={advance} style={s.later}><Text style={s.plain}>Пізніше</Text></TouchableOpacity>
            </View>
          </>}

          {step === 'contacts' && <>
            {heading('Знайдіть друзів швидше, синхронізувавши контакти', undefined, 116)}
            <View style={s.contactRow}><Ionicons name="people-outline" size={26} /><Text style={s.contactText}>Синхронізуйте всі контакти або виберіть окремі. Ви самі обираєте, на кого підписатися.</Text></View>
            <View style={s.contactRow}><Ionicons name="settings-outline" size={26} /><Text style={s.contactText}>Збережені контакти можна видалити, а синхронізацію вимкнути в будь-який момент.</Text></View>
            <View style={s.bottom}>
              <Text style={s.hint}>Демо: доступу до контактів немає, вони нікуди не передаються.</Text>
              {button('Далі', advance, false, canAdvance(step, data))}
            </View>
          </>}

          {step === 'interests' && <>
            {heading('Бачте більше того, що любите', 'Оберіть теми, які вас цікавлять, щоб бачити відповідний контент.', 16)}
            <View style={s.tags}>
              {topics.map(topic => (
                <TouchableOpacity accessibilityRole="button" accessibilityState={{selected: selected.includes(topic)}} key={topic} style={[s.tag, selected.includes(topic) && s.selected]} onPress={() => setSelected(a => a.includes(topic) ? a.filter(t => t !== topic) : [...a, topic])}>
                  <Text style={[s.tagText, selected.includes(topic) && s.selectedText]}>{topic}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {button('Далі', advance, false, canAdvance(step, data))}
          </>}

          {step === 'done' && <>
            {heading('Все готово!', `Вітаємо, ${data.name || 'друже'}! Це демонстрація інтерфейсу, дані не збережено.`, 80)}
            {!!photo && <Image source={{uri: photo}} style={[s.avatarSmall, {alignSelf: 'center', marginBottom: 24}]} />}
            <Text style={[s.body, {textAlign: 'center'}]}>@{data.username}{'\n'}{selected.length ? selected.join(' · ') : 'Інтереси не обрано'}</Text>
            <Text style={[s.hint, {textAlign: 'center'}]}>Демо-режим. Email та телефон не підтверджуються.</Text>
            <View style={s.form}>
              {button('Вийти', handleLogout)}
            </View>
          </>}

          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
          {['phone', 'email', 'code'].includes(step) && account}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Візуальна система YUNO, відтворена з наданих дизайнерських макетів.
const PURPLE = '#5B16FD';
const LIME = '#D7FF18';
const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PURPLE},
  shell: {flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center'},
  top: {height: 42, paddingTop: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  content: {flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16},
  logo: {width: 125, height: 93, alignSelf: 'center'},
  loginGreeting: {marginTop: 14, color: '#fff', fontWeight: '800', fontSize: 24},
  loginCaption: {marginTop: 6, color: '#fff', fontSize: 13},
  info: {gap: 10, marginBottom: 28},
  heading: {fontSize: 23, fontWeight: '800', color: '#fff'},
  body: {fontSize: 13, lineHeight: 18, color: '#fff'},
  form: {gap: 14},
  loginFields: {width: '100%', alignSelf: 'center', marginTop: 35, gap: 12},
  input: {height: 49, borderWidth: 0, borderRadius: 7, paddingHorizontal: 14, fontSize: 14, color: '#222', backgroundColor: '#fff'},
  inputWide: {marginBottom: 5},
  button: {height: 48, borderRadius: 30, backgroundColor: LIME, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, marginTop: 4},
  buttonText: {fontSize: 15, fontWeight: '700', color: '#181818'},
  outline: {backgroundColor: 'transparent', borderWidth: 0},
  outlineText: {color: '#fff', fontWeight: '500'},
  disabled: {backgroundColor: '#ACACAC'},
  disabledText: {color: '#666'},
  busy: {opacity: 0.72},
  bottom: {marginTop: 'auto', paddingTop: 20, gap: 10, paddingBottom: 15},
  forgot: {alignItems: 'flex-end', marginTop: 0},
  later: {alignItems: 'center'},
  plain: {fontSize: 13, color: '#fff'},
  helper: {textAlign: 'center', color: '#fff', fontSize: 12, marginTop: 5},
  helperAccent: {color: LIME, fontWeight: '700'},
  account: {marginTop: 'auto', paddingTop: 40, paddingBottom: 4, alignItems: 'center'},
  accountText: {fontSize: 13, color: '#fff'},
  hint: {fontSize: 12, lineHeight: 16, color: '#EEE0FF', marginBottom: 17},
  avatarWrap: {alignItems: 'center', marginTop: 40},
  avatarBig: {width: 190, height: 190, borderRadius: 95, backgroundColor: '#d9d9d9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  avatarHead: {position: 'absolute', top: 55, width: 38, height: 38, borderRadius: 19, backgroundColor: '#aaa'},
  avatarBody: {position: 'absolute', top: 104, width: 112, height: 45, borderRadius: 56, backgroundColor: '#aaa'},
  avatarSmall: {width: 150, height: 150, borderRadius: 75},
  contactRow: {flexDirection: 'row', gap: 13, marginTop: 22, alignItems: 'flex-start'},
  contactText: {flex: 1, fontSize: 14, lineHeight: 20, color: '#fff'},
  tags: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 15},
  tag: {backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7},
  selected: {backgroundColor: LIME},
  tagText: {fontSize: 12, color: '#222'},
  selectedText: {color: '#222'},
  error: {color: '#fff', backgroundColor: '#B61F5A', borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 19, marginTop: 12},
  validation: {color: LIME, fontSize: 12},
  notice: {backgroundColor: '#38108D', padding: 12, borderRadius: 10, color: '#fff', fontSize: 13, lineHeight: 19, marginTop: 12},
});

function canAdvance(step, data) {
  switch (step) {
    case 'phone': return /^\+?[0-9 ()-]{9,18}$/.test(data.phone || '');
    case 'code': return /^\d{4,6}$/.test(data.code || '');
    case 'email': return validEmail(data.email || '');
    case 'birthday': return validBirthday(data.birthday || '');
    case 'password': return (data.password || '').length >= 6 && data.password === data.confirmPassword;
    case 'name': return Boolean((data.name || '').trim());
    case 'username': return /^[a-zA-Z0-9._]{3,30}$/.test(data.username || '');
    default: return true;
  }
}
