import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIBE_URL =
  'https://subscribetotopic-6psjv5t2ka-uc.a.run.app';

async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('sae_device_id');
  if (!id) {
    id =
      'nrn_' +
      Math.random().toString(36).slice(2) +
      '_' +
      Date.now().toString(36);
    await AsyncStorage.setItem('sae_device_id', id);
  }
  return id;
}

async function sendTokenToServer(
  token: string,
  clientId: string,
  deviceId: string,
): Promise<void> {
  await fetch(SUBSCRIBE_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      token,
      topic: 'all-users',
      clientId,
      device_type: 'sae_resident',
      device_id: deviceId,
    }),
  });
}

export async function registerPushNotifications(
  clientId: string,
): Promise<void> {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.warn('[SAE] Permiso de notificaciones denegado');
    return;
  }

  const token = await messaging().getToken();
  const deviceId = await getOrCreateDeviceId();

  await sendTokenToServer(token, clientId, deviceId);
  console.log('[SAE] Push registrado, token:', token.slice(0, 20) + '...');

  // Renovar token cuando Firebase lo invalida (reinstalación, limpieza de datos, etc.)
  messaging().onTokenRefresh(async newToken => {
    console.log('[SAE] Token renovado, re-registrando...');
    await sendTokenToServer(newToken, clientId, deviceId);
  });
}
