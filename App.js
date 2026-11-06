import React, {useState} from 'react';
import {View, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Auth from './screens/Auth';
import Home from './screens/Home';
import {colors} from './theme';

export default function App() {
  const [profile, setProfile] = useState(null);
  const background = profile ? colors.page : colors.purple;
  return (
    <SafeAreaProvider>
      <View style={{flex: 1, backgroundColor: background}}>
        <StatusBar barStyle={profile ? 'dark-content' : 'light-content'} />
        <View style={{flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: background}}>
          {profile
            ? <Home profile={profile} onLogout={() => setProfile(null)} />
            : <Auth onDone={setProfile} />}
        </View>
      </View>
    </SafeAreaProvider>
  );
}
