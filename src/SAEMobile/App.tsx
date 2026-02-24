import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AlertScreen from './src/screens/AlertScreen';

// Android: el canal FCM por defecto se crea automaticamente por @react-native-firebase/messaging.
// Si necesitas nombre/sonido personalizado: agrega @notifee/react-native.

export default function App() {
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem('sae_clientId').then(v => setClientId(v));
  }, []);

  if (clientId === undefined) return null;

  if (!clientId) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <OnboardingScreen onComplete={id => setClientId(id)} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <AlertScreen clientId={clientId} />
    </>
  );
}
