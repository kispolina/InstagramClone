import React, {useCallback, useEffect, useState} from 'react';
import {View, StatusBar, ActivityIndicator, Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Auth from './screens/Auth';
import Home from './screens/Home';
import {colors} from './theme';
import {Button} from './ui';
import {logout, loadProfile} from './services/account';
import {restoreSession, clearTokens, setSessionExpiredHandler} from './services/api';
import {toProfile} from './helpers';

function Frame({background, light, children}) {
  return (
    <SafeAreaProvider>
      <View style={{flex: 1, backgroundColor: background}}>
        <StatusBar barStyle={light ? 'light-content' : 'dark-content'} />
        <View style={{flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: background}}>
          {children}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [phase, setPhase] = useState('checking'); // checking | error | ready
  const [errorText, setErrorText] = useState('');

  const start = useCallback(async () => {
    setPhase('checking');
    const restored = await restoreSession(); // 'ok' | 'none' | 'error'
    if (restored === 'error') {
      setErrorText('Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.');
      setPhase('error');
      return;
    }
    if (restored === 'ok') {
      try {
        setProfile(toProfile(await loadProfile()));
      } catch (e) {
        const rejected = e.status >= 400 && e.status < 500 && e.status !== 429;
        if (!rejected) { // мережа або збій сервера: сесію не чіпаємо, даємо повторити
          setErrorText(e.message);
          setPhase('error');
          return;
        }
        await clearTokens();
      }
    }
    setPhase('ready');
  }, []);

  useEffect(() => {
    // Сесія завершилась (refresh відхилено) -> одразу на екран входу.
    setSessionExpiredHandler(() => setProfile(null));
    start();
    return () => setSessionExpiredHandler(null);
  }, [start]);

  if (phase === 'checking') {
    return (
      <Frame background={colors.purple} light>
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </Frame>
    );
  }

  if (phase === 'error') {
    return (
      <Frame background={colors.purple} light>
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24}}>
          <Text style={{color: colors.white, fontSize: 16, textAlign: 'center'}}>{errorText}</Text>
          <Button label="Повторити" onPress={start} />
        </View>
      </Frame>
    );
  }

  return (
    <Frame background={profile ? colors.page : colors.purple} light={!profile}>
      {profile
        ? <Home
            profile={profile}
            onLogout={async () => {
              await logout();
              setProfile(null);
            }}
          />
        : <Auth onDone={setProfile} />}
    </Frame>
  );
}
