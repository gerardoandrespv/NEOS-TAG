/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Handler de mensajes en background (app cerrada o en segundo plano).
// @react-native-firebase/messaging muestra la notificación automáticamente
// cuando el mensaje contiene un campo `notification`. No se necesita código
// adicional aquí — solo registrar el handler para que FCM lo reconozca.
messaging().setBackgroundMessageHandler(async _remoteMessage => {
  // Notificación mostrada automáticamente por FCM nativo.
});

AppRegistry.registerComponent(appName, () => App);
