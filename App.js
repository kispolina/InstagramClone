import React, {useState, useRef} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, StatusBar} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {validEmail, validBirthday, formatBirthdayInput} from './validation';



const topics = ['Тварини', 'Птахи', 'Коти', 'Собаки', 'Коні', 'Їжа та напої', 'Випічка', 'Кулінарія', 'Спорт', 'Американський футбол', 'Бейсбол', 'Баскетбол', 'Риболовля', 'Футбол', 'Теніс', 'Волейбол', 'Зимові види спорту', 'Книги та література', 'Подорожі', 'Кемпінг і походи', 'Активний відпочинок', 'Автомандрівки', 'Наука та інженерія', 'Комп’ютерні науки', 'Інвестиції та трейдинг', 'Технології', 'Рукоділля', 'Танці', 'Малювання', 'Фотографія', 'Музика', 'Стиль'];
const nextStep = {phone: 'code', email: 'birthday', code: 'birthday', birthday: 'password', password: 'name', name: 'username', username: 'photo', photo: 'contacts', contacts: 'interests', interests: 'done'};
const errorMessages = {
  'auth/invalid-credential': 'Неправильна пошта або пароль.',
  'auth/email-already-in-use': 'Ця пошта вже зареєстрована. Увійдіть або відновіть пароль.',
  'auth/weak-password': 'Оберіть надійніший пароль.',
  'auth/network-request-failed': 'Немає зʼєднання. Спробуйте ще раз.',
  'auth/too-many-requests': 'Забагато спроб. Спробуйте пізніше.',
  'auth/operation-not-allowed': 'Увімкніть Email/Password у Firebase Authentication.',
  'auth/invalid-email': 'Введіть коректну електронну пошту.',
  'auth/user-disabled': 'Цей акаунт заблоковано.',
  'auth/unauthorized-domain': 'Додайте цей домен до Authorized domains у налаштуваннях Firebase Authentication.',
  'auth/missing-password': 'Введіть пароль.',
  'permission-denied': 'Перевірте правила Firestore.',
  'storage/unauthorized': 'Перевірте правила Storage.',
};

export default function App() {
  return <SafeAreaProvider><Flow /></SafeAreaProvider>;
}

function Logo({style}) {
  return <View style={[s.logo, style]}><Text style={s.logoText}>logo</Text></View>;
}

function Flow() {
  const [step, setStep] = useState('login');
  const [history, setHistory] = useState([]);
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const lock = useRef(false);

  const fakeLogin = async () => ({ email: data.loginId, emailVerified: true });
  const fakeRegister = async () => ({ email: data.email });
  const fakeSaveProfile = async profile => profile;
  const fakeLogout = async () => {};
  const fakeResetPassword = async () => {};
  const fakeSendVerificationEmail = async () => {};
  const fakeUploadAvatarBlob = async () => {};

  const run = async action => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) { setError(e.message || 'Не вдалося виконати запит. Спробуйте ще раз.'); }
    finally { lock.current = false; setBusy(false); }
  };

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

  const handleLogin = () => run(async () => {
    if (!validEmail(data.loginId || '') || !data.loginPassword) throw new Error('Введіть пошту та пароль.');
    const user = await fakeLogin();
    setData(d => ({...d, password: '', loginPassword: ''}));
    setVerified(user.emailVerified);
    go('done');
  });

  const finish = (list = selected) => run(async () => {
    await fakeSaveProfile({name: data.name, username: data.username, interests: list});
    setVerified(true);
    go('done');
  });

  const handleLogout = () => run(async () => {
    await fakeLogout();
    setData({}); setSelected([]); setPhoto(null); setVerified(false);
    login();
  });

  const sendReset = () => run(async () => {
    if (!validEmail(data.resetEmail || '')) throw new Error('Введіть коректну електронну пошту.');
    await fakeResetPassword();
    setNotice('Демо: посилання для відновлення не надсилається.');
  });

  const advance = () => {
    let message = '';
    if (step === 'email' && !validEmail(data.email || '')) message = 'Введіть коректну електронну пошту.';
    if (step === 'birthday' && !validBirthday(data.birthday || '')) message = 'Формат РРРР-ММ-ДД. Вам має бути щонайменше 13 років.';
    if (step === 'password' && (data.password || '').length < 6) message = 'Пароль має містити щонайменше 6 символів.';
    if (step === 'name' && !(data.name || '').trim()) message = 'Введіть ваше імʼя.';
    if (step === 'username' && !/^[a-zA-Z0-9._]{3,30}$/.test(data.username || '')) message = 'Від 3 до 30 символів: латинські літери, цифри, крапки або підкреслення.';
    if (message) { setError(message); return; }

    if (step === 'password') {
      run(async () => {
        await fakeRegister();
        setData(d => ({...d, password: ''}));
        go('name');
        setHistory([]);
        setNotice('Акаунт створено (демо).');
      });
      return;
    }
    if (step === 'interests') { finish(); return; }
    go(nextStep[step]);
  };

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7});
      if (!result.canceled) setPhoto(result.assets[0].uri);
    } catch { setError('Не вдалося відкрити галерею. Спробуйте ще раз.'); }
  };

  const uploadPhoto = () => run(async () => {
    await fakeUploadAvatarBlob();
    go('contacts');
  });

  const field = (key, placeholder, extra = {}) => (
    <TextInput
      accessibilityLabel={placeholder}
      editable={!busy}
      style={s.input}
      placeholderTextColor="#000"
      placeholder={placeholder}
      value={data[key] || ''}
      onChangeText={v => update(key, v)}
      autoCapitalize="none"
      {...extra}
    />
  );
  const button = (label, action, outline = false) => (
    <TouchableOpacity disabled={busy} accessibilityState={{disabled: busy, busy}} accessibilityRole="button" onPress={action} style={[s.button, outline && s.outline, busy && s.busy]}>
      <Text style={[s.buttonText, outline && s.outlineText]}>{busy ? 'Зачекайте…' : label}</Text>
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
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={s.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step !== 'login' && (
          <View pointerEvents={busy ? 'none' : 'auto'} style={s.top}>
            {canBack
              ? <TouchableOpacity accessibilityLabel="Назад" onPress={back} hitSlop={12}><Ionicons name="chevron-back" size={24} color="#000" /></TouchableOpacity>
              : <View style={{width: 24}} />}
            {step === 'interests' && <TouchableOpacity disabled={busy} onPress={() => { setSelected([]); finish([]); }}><Text style={s.plain}>Пропустити</Text></TouchableOpacity>}
          </View>
        )}
        <ScrollView scrollEnabled={!busy} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {step === 'login' && <>
            <Logo style={{marginTop: 46}} />
            <View style={s.loginFields}>
              {field('loginId', 'Електронна пошта', {keyboardType: 'email-address', textContentType: 'emailAddress', returnKeyType: 'next'})}
              {field('loginPassword', 'Пароль', {secureTextEntry: true, returnKeyType: 'go', onSubmitEditing: handleLogin})}
            </View>
            <View style={s.bottom}>
              {button('Увійти', handleLogin)}
              <TouchableOpacity disabled={busy} onPress={() => go('reset')} style={s.forgot}><Text style={s.plain}>Забули пароль?</Text></TouchableOpacity>
              {button('Створити акаунт', () => go('email'), true)}
            </View>
          </>}

          {step === 'reset' && <>
            {heading('Відновлення пароля', 'Введіть пошту, на яку надіслати посилання для відновлення пароля.', 116)}
            <View style={s.form}>
              {field('resetEmail', 'Електронна пошта', {keyboardType: 'email-address', returnKeyType: 'send', onSubmitEditing: sendReset})}
              {button('Надіслати посилання', sendReset)}
            </View>
          </>}

          {step === 'phone' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Ваш мобільний номер?', 'Введіть ваш мобільний номер, який є дійсним, ніхто не побачить його в вашому профілі.')}
            <View style={s.form}>
              {field('phone', 'Мобільний номер', {keyboardType: 'phone-pad', textContentType: 'telephoneNumber', ...wide})}
              {button('Далі', advance)}
              {button('Увійти з поштою', () => go('email'), true)}
            </View>
          </>}

          {step === 'email' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Ваша пошта?', 'Введіть вашу електронну пошту, яка є дійсною, ніхто не побачить її у вашому профілі.')}
            <View style={s.form}>
              {field('email', 'Електронна пошта', {keyboardType: 'email-address', textContentType: 'emailAddress', returnKeyType: 'next', onSubmitEditing: advance, ...wide})}
              {button('Далі', advance)}
              {button('Увійти з номером телефону', () => go('phone'), true)}
            </View>
          </>}

          {step === 'code' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Введіть код', 'Введіть код який надійшов,\nкод активний протягом 2 хвилин')}
            <View style={s.form}>
              {field('code', 'Код', {keyboardType: 'number-pad', maxLength: 6, textContentType: 'oneTimeCode', ...wide})}
              {button('Далі', advance)}
              {button('Мені не надійшов код', () => setNotice('Скористайтеся посиланням для підтвердження, яке надійшло на пошту.'), true)}
            </View>
          </>}

          {step === 'birthday' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Введіть вашу дату народження', 'Використовуйте вашу справжню дату народження, ніхто не побачить вашу дату народження')}
            <View style={s.form}>
              {field('birthday', 'Дата народження (РРРР-ММ-ДД)', {keyboardType: 'number-pad', maxLength: 10, returnKeyType: 'next', onChangeText: v => update('birthday', formatBirthdayInput(v)), onSubmitEditing: advance})}
              {button('Далі', advance)}
            </View>
          </>}

          {step === 'password' && <>
            <Logo style={{marginTop: 4}} />
            {heading('Створіть пароль', 'Створіть пароль для входу в акаунт, нікому не повідомляйте його та збережіть в безпечному місці')}
            <View style={s.form}>
              {field('password', 'Пароль', {secureTextEntry: true, textContentType: 'newPassword', returnKeyType: 'next', onSubmitEditing: advance})}
              {button('Далі', advance)}
            </View>
          </>}

          {step === 'name' && <>
            {heading('Яке ваше ім’я?', 'Введіть ваше ім’я щоб ваші друзі змогли знайти вас', 116)}
            <View style={s.form}>
              {field('name', 'Моє ім’я', {autoCapitalize: 'words', textContentType: 'name', returnKeyType: 'next', onSubmitEditing: advance})}
              {button('Далі', advance)}
            </View>
          </>}

          {step === 'username' && <>
            {heading('Створіть ім’я користувача', 'Ім’я користувача буде відображене в вашому профілі.\nВи можете змінити його будь-коли.', 116)}
            <View style={s.form}>
              {field('username', 'Ім’я користувача', {autoCorrect: false, returnKeyType: 'next', onSubmitEditing: advance})}
              {button('Далі', advance)}
            </View>
          </>}

          {step === 'photo' && <>
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
              {button('Далі', advance)}
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
            {button('Далі', advance)}
          </>}

          {step === 'done' && <>
            {heading('Все готово!', `Вітаємо, ${data.name || 'друже'}. Ваш профіль збережено.`, 80)}
            {!!photo && <Image source={{uri: photo}} style={[s.avatarSmall, {alignSelf: 'center', marginBottom: 24}]} />}
            <Text style={[s.body, {textAlign: 'center'}]}>@{data.username}{'\n'}{selected.length ? selected.join(' · ') : 'Інтереси не обрано'}</Text>
            <Text style={[s.hint, {textAlign: 'center'}]}>{verified ? 'Пошту підтверджено.' : 'Перевірте пошту та підтвердьте адресу.'}</Text>
            <View style={s.form}>
              {!verified && <>
                {button('Надіслати лист ще раз', () => run(async () => { await sendVerificationEmail(); setNotice('Посилання для підтвердження надіслано.'); }), true)}
                {button('Я підтвердив(-ла) пошту', () => run(async () => {
                  const user = getBackend().auth.currentUser;
                  await reload(user);
                  setVerified(user.emailVerified);
                  if (!user.emailVerified) setNotice('Пошту ще не підтверджено. Відкрийте останній лист і спробуйте ще раз.');
                }), true)}
              </>}
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

// Значення взяті з макета Figma (кадри 375×812): відступи, радіуси, кольори, розміри шрифтів.
const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  shell: {flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center'},
  top: {height: 52, paddingTop: 28, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  content: {flexGrow: 1, paddingHorizontal: 20, paddingBottom: 12},
  logo: {width: 203, height: 85, backgroundColor: '#d9d9d9', alignSelf: 'center', alignItems: 'center', justifyContent: 'center'},
  logoText: {fontSize: 14, color: '#000'},
  info: {gap: 21, marginBottom: 32},
  heading: {fontSize: 24, fontWeight: '700', color: '#000'},
  body: {fontSize: 14, color: '#000'},
  form: {gap: 16},
  loginFields: {width: 310, alignSelf: 'center', marginTop: 77, gap: 20},
  input: {height: 44, borderWidth: 1, borderColor: '#dbdada', borderRadius: 12, paddingHorizontal: 10, fontSize: 14, textAlign: 'center', color: '#000', backgroundColor: '#fff'},
  inputWide: {marginBottom: 16},
  button: {height: 40, borderRadius: 36, backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10},
  buttonText: {fontSize: 14, color: '#fff'},
  outline: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbdada'},
  outlineText: {color: '#000'},
  busy: {opacity: 0.6},
  bottom: {marginTop: 'auto', paddingTop: 24, gap: 16},
  forgot: {alignItems: 'center', marginBottom: 32},
  later: {alignItems: 'center'},
  plain: {fontSize: 14, color: '#000'},
  account: {marginTop: 'auto', paddingTop: 40, paddingBottom: 4, alignItems: 'center'},
  accountText: {fontSize: 14, color: '#000'},
  hint: {fontSize: 12, lineHeight: 16, color: '#737780', marginBottom: 17},
  avatarWrap: {alignItems: 'center', marginTop: 49},
  avatarBig: {width: 212, height: 212, borderRadius: 106, backgroundColor: '#d9d9d9', alignItems: 'center', overflow: 'hidden'},
  avatarHead: {position: 'absolute', top: 70, width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff'},
  avatarBody: {position: 'absolute', top: 119, width: 112, height: 34, borderRadius: 56, backgroundColor: '#fff'},
  avatarSmall: {width: 150, height: 150, borderRadius: 75},
  contactRow: {flexDirection: 'row', gap: 13, marginTop: 22, alignItems: 'flex-start'},
  contactText: {flex: 1, fontSize: 14, lineHeight: 20, color: '#000'},
  tags: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 15},
  tag: {backgroundColor: '#f2f2f2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7},
  selected: {backgroundColor: '#808080'},
  tagText: {fontSize: 12, color: '#000'},
  selectedText: {color: '#fff'},
  error: {color: '#b42318', fontSize: 13, lineHeight: 19, marginTop: 12},
  notice: {backgroundColor: '#f2f2f2', padding: 12, borderRadius: 10, color: '#000', fontSize: 13, lineHeight: 19, marginTop: 12},
});
