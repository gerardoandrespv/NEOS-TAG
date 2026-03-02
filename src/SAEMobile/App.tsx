import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Modal,
  NativeModules,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AlertScreen from './src/screens/AlertScreen';

const {SoundPlayer} = NativeModules;

/* ─── sonidos por tipo de alerta ─────────────────────────────── */
const ALERT_SOUNDS: Record<string, string> = {
  FIRE:         'emergency_alarm_fire',         // sirena de incendio
  EARTHQUAKE:   'emergency_alarm_fire',         // urgencia máxima
  EVACUATION:   'emergency_alarm_evacuation',   // tono de evacuación
  ROBBERY:      'emergency_alarm_evacuation',   // abandona el área
  FIGHT:        'emergency_alarm_evacuation',   // abandona el área
  FLOOD:        'emergency_alarm_flood',        // tono de inundación
  TSUNAMI:      'emergency_alarm_flood',        // comparte con flood
  POWER_OUTAGE: 'emergency_alarm_general',      // alerta general
  GENERAL:      'emergency_alarm_general',
  CANCEL:       'emergency_alarm_cancel',
};

/* ─── metadata visual por tipo de alerta ─────────────────────── */
export const ALERT_META: Record<string, {icon: string; label: string; color: string}> = {
  FIRE:        {icon: '🔥', label: 'INCENDIO',      color: '#ef4444'},
  EVACUATION:  {icon: '🚨', label: 'EVACUACIÓN',    color: '#f97316'},
  FLOOD:       {icon: '💧', label: 'INUNDACIÓN',    color: '#3b82f6'},
  TSUNAMI:     {icon: '🌊', label: 'TSUNAMI',       color: '#1d4ed8'},
  EARTHQUAKE:  {icon: '🏚️', label: 'TERREMOTO',     color: '#b45309'},
  ROBBERY:     {icon: '🔴', label: 'ROBO',          color: '#dc2626'},
  FIGHT:       {icon: '🥊', label: 'AGRESIÓN',      color: '#c026d3'},
  POWER_OUTAGE:{icon: '⚡', label: 'CORTE DE LUZ', color: '#ca8a04'},
  CANCEL:      {icon: '✅', label: 'CANCELADA',     color: '#16a34a'},
  GENERAL:     {icon: '❗', label: 'EMERGENCIA',    color: '#dc2626'},
};

/* ─── instrucciones básicas por tipo de alerta ───────────────── */
const ALERT_INSTRUCTIONS: Record<string, string> = {
  FIRE:        '🚶 Evacua por escaleras. No uses elevadores. Cúbrete la boca.',
  EVACUATION:  '🚶 Dirígete a la salida más cercana en orden y sin correr.',
  FLOOD:       '⬆️  Sube a zonas altas. Aléjate de áreas inundables.',
  TSUNAMI:     '⬆️  Muévete a terreno elevado de inmediato. No regreses.',
  EARTHQUAKE:  '🛡️  Cúbrete bajo una mesa. Aléjate de ventanas y objetos.',
  ROBBERY:     '🤫 Mantén la calma. No enfrentes al agresor. Espera ayuda.',
  FIGHT:       '↩️  Aléjate del área. No intervengas. Llama al 911.',
  POWER_OUTAGE:'🕯️  Mantén la calma. Usa las salidas de emergencia si es necesario.',
  GENERAL:     '👂 Sigue las instrucciones del personal de seguridad.',
};

function playAlertSound(alertType: string): void {
  const sound = ALERT_SOUNDS[alertType] ?? 'emergency_alarm_general';
  SoundPlayer?.play(sound);
}

/* ─── tipos ──────────────────────────────────────────────────── */
interface ActiveAlert {
  type: string;
  title: string;
  body: string;
}

/* ─── Overlay full-screen de confirmación ────────────────────── */
function AlertOverlay({
  alert,
  onConfirm,
}: {
  alert: ActiveAlert;
  onConfirm: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const meta = ALERT_META[alert.type] ?? ALERT_META.GENERAL;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 0.3, duration: 500, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1,   duration: 500, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={ov.backdrop}>
        {/* anillo pulsante */}
        <Animated.View style={[ov.ring, {borderColor: meta.color, opacity: pulseAnim}]} />

        <View style={ov.card}>
          <Text style={ov.icon}>{meta.icon}</Text>
          <Text style={[ov.typeLabel, {color: meta.color}]}>{meta.label}</Text>
          <Text style={ov.title}>{alert.title}</Text>

          {/* Instrucciones básicas */}
          <View style={[ov.instructionBox, {borderColor: meta.color + '55'}]}>
            <Text style={ov.instructionText}>
              {ALERT_INSTRUCTIONS[alert.type] ?? ALERT_INSTRUCTIONS.GENERAL}
            </Text>
          </View>

          <TouchableOpacity
            style={[ov.btn, {backgroundColor: meta.color}]}
            onPress={onConfirm}
            activeOpacity={0.8}>
            <Text style={ov.btnText}>✔  Estoy bien — Confirmar</Text>
          </TouchableOpacity>

          <Text style={ov.hint}>
            La alarma seguirá sonando hasta que confirmes tu estado.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const ov = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ring: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  icon:      {fontSize: 72, lineHeight: 82, marginBottom: 10},
  typeLabel: {fontSize: 12, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8},
  title:     {fontSize: 18, fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: 8},
  body:      {fontSize: 14, lineHeight: 21, color: '#94a3b8', textAlign: 'center', marginBottom: 16},
  instructionBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  instructionText: {fontSize: 14, lineHeight: 22, color: '#e2e8f0', textAlign: 'center'},
  btn: {
    marginTop: 8,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  btnText:   {fontSize: 16, fontWeight: '700', color: '#fff'},
  hint:      {marginTop: 16, fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 18},
});

/* ─── App principal ──────────────────────────────────────────── */
export default function App() {
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const initialNotifHandled = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('sae_clientId').then(v => setClientId(v));
  }, []);

  function triggerAlert(alertType: string, title: string, body: string) {
    playAlertSound(alertType);
    setActiveAlert({type: alertType, title, body});
  }

  function confirmAlert() {
    SoundPlayer?.stop();
    setActiveAlert(null);
  }

  /* Resolver alerta desde web → detener alarma + sonido de cancelación */
  function cancelAlert() {
    SoundPlayer?.stop();
    SoundPlayer?.playOnce('emergency_alarm_cancel');
    setActiveAlert(null);
  }

  /* Primer plano: app visible y llega notificación */
  useEffect(() => {
    return messaging().onMessage(async remoteMessage => {
      const alertType = (remoteMessage.data?.alert_type as string) ?? 'GENERAL';
      if (alertType === 'CANCEL' || alertType === 'CANCELLED') {
        cancelAlert();
        return;
      }
      const title = remoteMessage.notification?.title ?? '🚨 ALERTA SAE';
      const body  = remoteMessage.notification?.body  ?? '';
      triggerAlert(alertType, title, body);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Segundo plano: usuario toca la notificación */
  useEffect(() => {
    return messaging().onNotificationOpenedApp(remoteMessage => {
      const alertType = (remoteMessage.data?.alert_type as string) ?? 'GENERAL';
      if (alertType === 'CANCEL' || alertType === 'CANCELLED') { return; }
      const title = remoteMessage.notification?.title ?? '🚨 ALERTA SAE';
      const body  = remoteMessage.notification?.body  ?? '';
      triggerAlert(alertType, title, body);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* App cerrada → abierta desde notificación */
  useEffect(() => {
    if (initialNotifHandled.current) {return;}
    initialNotifHandled.current = true;
    messaging().getInitialNotification().then(remoteMessage => {
      if (!remoteMessage) {return;}
      const alertType = (remoteMessage.data?.alert_type as string) ?? 'GENERAL';
      const title = remoteMessage.notification?.title ?? '🚨 ALERTA SAE';
      const body  = remoteMessage.notification?.body  ?? '';
      triggerAlert(alertType, title, body);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (clientId === undefined) {
    return <View style={{flex: 1, backgroundColor: '#080f1e'}} />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      {clientId ? (
        <AlertScreen clientId={clientId} onSilence={confirmAlert} onAlertsCleared={cancelAlert} />
      ) : (
        <OnboardingScreen onComplete={id => setClientId(id)} />
      )}
      {activeAlert && (
        <AlertOverlay alert={activeAlert} onConfirm={confirmAlert} />
      )}
    </>
  );
}
