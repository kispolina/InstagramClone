import React, {useEffect, useRef, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, Pressable, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme';
import {Logo, Info, Button, TextLink, Field, Tabs} from '../ui';
import DateWheel from '../DateWheel';
import {validEmail, validPassword, validCode, validBirthday} from '../validation';
import {login, register, confirmEmail, resendConfirmation, forgotPassword, resetPassword, updateProfile, isTempUsername} from '../services/account';

const PASSWORD_HINT = 'Щонайменше 8 символів, велика й мала літера та цифра';
const RESEND_SECONDS = 56;
const CONTACT_TABS = [{key: 'email', label: 'Email'}];
const BACK = {forgot: 'login', code: null, newPassword: 'code', birthday: 'code', nickname: 'birthday', photo: 'nickname'};
const pad = n => String(n).padStart(2, '0');

function Screen({onBack, footer, children, notice, inline = false}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{flex: 1, paddingTop: insets.top}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {onBack && (
        <TouchableOpacity accessibilityLabel="Назад" onPress={onBack} hitSlop={12} style={[a.back, {top: insets.top + 28}]}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[a.content, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        <Logo style={{marginTop: 19}} />
        <View style={a.body}>{children}</View>
        {!!notice && <Text accessibilityLiveRegion="polite" style={notice.error ? a.noticeError : a.notice}>{notice.text}</Text>}
        {!!footer && <View style={[a.footer, inline && a.footerInline]}>{footer}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function Auth({onDone}) {
  const [step, setStep] = useState('login');
  const [f, setF] = useState({email: '', password: '', repeat: ''});
  const [flow, setFlow] = useState('signup'); // signup | reset
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);     // акаунт із API (після реєстрації або входу)
  const [resetCode, setResetCode] = useState('');
  const [dob, setDob] = useState({d: 3, m: 7, y: 2002});
  const [nickname, setNickname] = useState('');
  const registered = useRef(null);            // {email, password} уже створеного акаунта
  const pending = useRef(false);

  const note = (text, error = false) => setNotice(text ? {text, error} : null);
  const set = (key, value) => { setF(o => ({...o, [key]: value})); note(''); };
  const go = next => { setStep(next); note(''); };
  const back = () => go(step === 'code' ? (flow === 'reset' ? 'forgot' : 'register') : BACK[step]);

  // Один запит за раз; помилку API показуємо користувачу. Повертає true, якщо запит вдався.
  async function run(action, onError) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    note('');
    try {
      await action();
      return true;
    } catch (error) {
      if (!(onError && onError(error))) note(error.message || 'Щось пішло не так. Спробуйте ще раз.', true);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const finish = (account, photo = null) =>
    onDone({...account, nickname: account.username, photo: photo ?? account.avatarUrl ?? null});

  const emailOk = validEmail(f.email);
  const tabs = <Tabs items={CONTACT_TABS} value="email" onChange={() => {}} />;
  const emailField = <Field value={f.email} onChangeText={v => set('email', v)} placeholder="Введіть e-mail" keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />;

  const doLogin = () => run(async () => {
    const account = await login(f.email, f.password);
    if (account.emailConfirmed) { finish(account); return; }
    // Акаунт створено, але пошту не підтверджено: надсилаємо свіжий код і йдемо на екран коду.
    setUser(account);
    setFlow('signup');
    registered.current = {email: f.email.trim(), password: f.password};
    try { await resendConfirmation(); } catch { /* код можна надіслати повторно на екрані коду */ }
    go('code');
  });

  const doRegister = () => run(async () => {
    const same = registered.current && registered.current.email === f.email.trim() && registered.current.password === f.password;
    if (!same) {
      setUser(await register(f.email, f.password));
      registered.current = {email: f.email.trim(), password: f.password};
    }
    setFlow('signup');
    go('code');
  });

  const doForgot = () => run(async () => {
    await forgotPassword(f.email);
    setFlow('reset');
    go('code');
  });

  // Повертає true, якщо код прийнято (інакше екран коду очищає поля).
  const doCode = code => run(async () => {
    if (flow === 'reset') { setResetCode(code); go('newPassword'); return; }
    await confirmEmail(code);
    const confirmed = {...user, emailConfirmed: true};
    setUser(confirmed);
    if (isTempUsername(confirmed.username)) go('birthday'); else finish(confirmed);
  });

  const doResend = async () => {
    const ok = await run(() => (flow === 'reset' ? forgotPassword(f.email) : resendConfirmation()));
    if (ok) note('Новий код надіслано на ваш e-mail.');
    return ok;
  };

  const doNewPassword = () => run(async () => {
    await resetPassword(f.email, resetCode, f.password);
    setF(o => ({...o, password: '', repeat: ''}));
    setResetCode('');
    setStep('login');
    note('Пароль змінено. Увійдіть із новим паролем.');
  }, error => {
    if (error.fields && error.fields.NewPassword) return false; // помилка пароля — лишаємось тут
    if (error.status === 400) { setStep('code'); note(error.message, true); return true; } // невірний або прострочений код
    return false;
  });

  const doNickname = () => run(async () => {
    setUser(await updateProfile(user, nickname));
    go('photo');
  });

  if (step === 'login') {
    const ok = emailOk && f.password.length > 0 && !busy;
    return (
      <Screen notice={notice} footer={<>
        <Button label="Увійти" disabled={!ok} onPress={doLogin} />
        <Text style={a.switchText}>У мене немає акаунту <Text style={a.switchLink} onPress={() => go('register')}>Зареєструватися</Text></Text>
      </>}>
        <Info title="Салют! Погнали" text="Творимо без рамок" gap={12} large />
        <View style={{gap: 20}}>
          {tabs}
          {emailField}
          <View style={{gap: 12, alignItems: 'flex-end'}}>
            <View style={{width: '100%'}}><Field value={f.password} onChangeText={v => set('password', v)} placeholder="Введіть пароль" secure textContentType="password" /></View>
            <TextLink onPress={() => { setFlow('reset'); go('forgot'); }}>Забули пароль?</TextLink>
          </View>
        </View>
      </Screen>
    );
  }

  if (step === 'register') {
    const weak = f.password.length > 0 && !validPassword(f.password);
    const mismatch = f.repeat.length > 0 && f.repeat !== f.password;
    const ok = emailOk && validPassword(f.password) && f.password === f.repeat && !busy;
    return (
      <Screen notice={notice} footer={<>
        <Button label="Зареєструватися" disabled={!ok} onPress={doRegister} />
        <Text style={a.switchText}>У мене є акаунт <Text style={a.switchLink} onPress={() => go('login')}>Увійти</Text></Text>
      </>}>
        <Info title="Хей! Вривайся" text="Твій вайб, твої люди :)" gap={12} large />
        <View style={{gap: 20}}>
          {tabs}
          {emailField}
          <Field value={f.password} onChangeText={v => set('password', v)} placeholder="Введіть пароль" secure textContentType="newPassword" error={weak} helper={weak ? PASSWORD_HINT : undefined} />
          <Field value={f.repeat} onChangeText={v => set('repeat', v)} placeholder="Повторіть пароль" secure textContentType="newPassword" error={mismatch} helper={mismatch ? 'Паролі не збігаються' : undefined} />
        </View>
      </Screen>
    );
  }

  if (step === 'forgot') {
    return (
      <Screen onBack={back} notice={notice} footer={<Button label="Далі" disabled={!emailOk || busy} onPress={doForgot} />}>
        <Info title="Забули пароль?" text="Введіть e-mail, на який зареєстровано акаунт. Ми надішлемо на нього код." />
        {emailField}
      </Screen>
    );
  }

  if (step === 'code') {
    return <CodeStep onBack={back} email={f.email.trim()} notice={notice} busy={busy} onNext={doCode} onResend={doResend} />;
  }

  if (step === 'newPassword') {
    const weak = f.password.length > 0 && !validPassword(f.password);
    const mismatch = f.repeat.length > 0 && f.repeat !== f.password;
    const ok = validPassword(f.password) && f.password === f.repeat && !busy;
    return (
      <Screen onBack={back} notice={notice} footer={<Button label="Далі" disabled={!ok} onPress={doNewPassword} />}>
        <Info title="Придумайте пароль" text="Введіть надійний пароль та запам’ятайте його" />
        <View style={{gap: 20}}>
          <Field value={f.password} onChangeText={v => set('password', v)} placeholder="Введіть пароль" secure textContentType="newPassword" error={weak} helper={weak ? PASSWORD_HINT : undefined} />
          <Field value={f.repeat} onChangeText={v => set('repeat', v)} placeholder="Повторіть пароль" secure textContentType="newPassword" error={mismatch} helper={mismatch ? 'Паролі не збігаються' : undefined} />
        </View>
      </Screen>
    );
  }

  if (step === 'birthday') {
    const iso = `${dob.y}-${pad(dob.m + 1)}-${pad(dob.d)}`;
    const ok = validBirthday(iso);
    return (
      <Screen onBack={back} footer={<Button label="Далі" disabled={!ok} onPress={() => go('nickname')} />}>
        <Info title="Введіть вашу дату народження" text="Використовуйте вашу справжню дату народження, ніхто не побачить вашу дату народження" />
        <View style={{gap: 12}}>
          <DateWheel value={dob} onChange={setDob} />
          {!ok && <Text style={a.error}>Вам має бути щонайменше 13 років</Text>}
        </View>
      </Screen>
    );
  }

  if (step === 'nickname') {
    const typed = nickname.length > 0;
    const valid = /^[a-zA-Z0-9._]{3,30}$/.test(nickname);
    return (
      <Screen onBack={back} notice={notice} footer={<Button label="Далі" disabled={!valid || busy} onPress={doNickname} />}>
        <Info title="Придумайте нікнейм" text="Ти тут. І це круто" gap={12} large />
        <Field value={nickname} onChangeText={v => { setNickname(v); note(''); }} placeholder="Нікнейм" autoCapitalize="none" error={typed && !valid} helper={typed && !valid ? 'Від 3 до 30 символів: латинські літери, цифри, крапки або підкреслення' : undefined} maxLength={30} />
      </Screen>
    );
  }

  return <PhotoStep onBack={back} onDone={photo => finish(user, photo)} />;
}

function CodeStep({onBack, email, notice, busy, onNext, onResend}) {
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(RESEND_SECONDS);
  const input = useRef(null);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const submit = async () => { if (!(await onNext(code))) setCode(''); };
  const resend = async () => { if (await onResend()) { setCode(''); setLeft(RESEND_SECONDS); } };
  return (
    <Screen onBack={onBack} inline notice={notice} footer={<>
      {left > 0
        ? <Text style={a.timer}>Надіслати повторно через 00:{pad(left)}</Text>
        : <TextLink onPress={busy ? undefined : resend}>Надіслати код повторно</TextLink>}
      <Button label="Далі" disabled={!validCode(code) || busy} onPress={submit} />
    </>}>
      <Info title="Введіть код" text={`Введіть 6-значний код, який надійшов на ${email}.\nКод діє обмежений час — за потреби надішліть його повторно.`} />
      <Pressable onPress={() => input.current && input.current.focus()} style={a.codeRow} accessibilityLabel="Код підтвердження">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[a.codeBox, code.length === i && a.codeBoxActive]}>
            <Text style={a.codeDigit}>{code[i] || ''}</Text>
          </View>
        ))}
        <TextInput ref={input} value={code} onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" caretHidden style={a.codeHidden} />
      </Pressable>
    </Screen>
  );
}

function PhotoStep({onBack, onDone}) {
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7});
      if (!result.canceled) { setPhoto(result.assets[0].uri); setError(''); }
    } catch { setError('Не вдалося відкрити галерею. Спробуйте ще раз.'); }
  };
  return (
    <Screen onBack={onBack} footer={<>
      <Button
        label="Далі"
        disabled={!photo}
        onPress={() => onDone(photo)}
      />
      <TextLink onPress={() => onDone(null)}>Пізніше</TextLink>
    </>}>
      <Info title="Додайте картинку профілю" text={'Додайте картинку профілю.\nВи можете змінити це будь-коли'} />
      <View style={{alignItems: 'center', gap: 12}}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Обрати фото профілю" onPress={pick} style={a.avatar}>
          {photo ? <Image source={{uri: photo}} style={a.avatarImage} /> : <Ionicons name="camera-outline" size={64} color={colors.inkStrong} />}
        </TouchableOpacity>
        {!!error && <Text style={a.error}>{error}</Text>}
      </View>
    </Screen>
  );
}

const a = StyleSheet.create({
  back: {position: 'absolute', left: 16, zIndex: 2},
  content: {flexGrow: 1, paddingHorizontal: 20},
  body: {marginTop: 33, gap: 40},
  footer: {marginTop: 'auto', paddingTop: 24, gap: 25, alignItems: 'center', width: '100%'},
  footerInline: {marginTop: 24},
  switchText: {fontSize: 14, color: colors.white, textAlign: 'center'},
  switchLink: {color: colors.lime, textDecorationLine: 'underline'},
  notice: {fontSize: 14, color: colors.lime, marginTop: 16, textAlign: 'center'},
  noticeError: {fontSize: 14, color: colors.error, marginTop: 16, textAlign: 'center'},
  error: {fontSize: 12, color: colors.error},
  timer: {fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center'},
  codeRow: {flexDirection: 'row', justifyContent: 'center', gap: 8},
  codeBox: {width: 46, height: 56, borderRadius: 8, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  codeBoxActive: {borderColor: colors.lime},
  codeDigit: {fontSize: 24, fontWeight: '700', color: colors.ink},
  codeHidden: {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0},
  avatar: {width: 180, height: 180, borderRadius: 90, backgroundColor: '#D9D9D9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  avatarImage: {width: 180, height: 180},
});
