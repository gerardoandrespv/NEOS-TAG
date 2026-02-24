import React, {useEffect, useState} from 'react';
import {Platform, StatusBar} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AlertScreen from './src/screens/AlertScreen';

// Crear canal de notificaciones Android — debe ejecutarse antes de que llegue cualquier notificación
if (Platform.OS === 'android') {
  messaging()
    .setNotificationChannelSettings({
      channelId: 'sae_alerts',
      name: 'Alertas de Emergencia',
      importance: 5, // IMPORTANCE_HIGH — aparece como heads-up notification
      sound: 'default',
      vibration: true,
    })
    .catch(() => {});
}

export default function App() {
  const [clientId, setClientId] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    AsyncStorage.getItem('sae_clientId').then(v => setClientId(v));
  }, []);

  // clientId === undefined → cargando (no mostrar nada para evitar flash)
  if (clientId === undefined) {
    return null;
  }

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
