import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  NativeModules,
} from 'react-native';
import {subscribeToAlerts} from '../services/firestore';
import {registerPushNotifications} from '../services/notifications';
import {EmergencyAlert, AlertType} from '../types';

const {SoundPlayer} = NativeModules;

const ALERT_ICONS: Record<AlertType, string> = {
  FIRE:        '🔥',
  FLOOD:       '💧',
  EVACUATION:  '🚨',
  TSUNAMI:     '🌊',
  EARTHQUAKE:  '🏚️',
  ROBBERY:     '🔴',
  FIGHT:       '🥊',
  POWER_OUTAGE:'⚡',
  GENERAL:     '❗',
};

const ALERT_LABELS: Record<AlertType, string> = {
  FIRE:        'Incendio',
  FLOOD:       'Inundación',
  EVACUATION:  'Evacuación',
  TSUNAMI:     'Tsunami',
  EARTHQUAKE:  'Terremoto',
  ROBBERY:     'Robo',
  FIGHT:       'Agresión',
  POWER_OUTAGE:'Corte de luz',
  GENERAL:     'Emergencia',
};

function formatTime(ts: EmergencyAlert['created_at']): string {
  if (!ts) {return '';}
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts as unknown as string);
  return d.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'});
}

interface Props {
  clientId: string;
  onSilence?: () => void;
  onAlertsCleared?: () => void;
}

export default function AlertScreen({clientId, onSilence, onAlertsCleared}: Props) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (alerts.length > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 0.5, duration: 800, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1,   duration: 800, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [alerts.length, pulseAnim]);

  useEffect(() => {
    const unsub = subscribeToAlerts(
      clientId,
      incoming => {
        setAlerts(incoming);
        setLoading(false);
        setConnectionError(false);
      },
      _err => {
        setLoading(false);
        setConnectionError(true);
      },
    );
    return unsub;
  }, [clientId]);

  useEffect(() => {
    registerPushNotifications(clientId).catch(e =>
      console.warn('[SAE] push registration failed:', e),
    );
  }, [clientId]);

  // Detectar cuando las alertas activas se limpian → detener alarma localmente
  useEffect(() => {
    if (!loading && prevCountRef.current > 0 && alerts.length === 0) {
      SoundPlayer?.stop();
      SoundPlayer?.playOnce?.('emergency_alarm_cancel');
      onAlertsCleared?.();
    }
    prevCountRef.current = alerts.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length, loading]);

  const hasAlerts = alerts.length > 0;

  function handleSilence() {
    SoundPlayer?.stop();
    onSilence?.();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sistema de Alertas — SAE</Text>
        <Animated.View
          style={[
            styles.badge,
            hasAlerts ? styles.badgeLive : styles.badgeOk,
            hasAlerts ? {opacity: pulseAnim} : null,
          ]}>
          <Text style={styles.badgeText}>{hasAlerts ? 'ALERTA' : loading ? '—' : 'OK'}</Text>
        </Animated.View>
      </View>

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {/* Status card */}
        {loading ? (
          <View style={[styles.statusCard, styles.statusWait]}>
            <ActivityIndicator color="#64748b" />
            <Text style={styles.statusTitle}>Conectando...</Text>
            <Text style={styles.statusSub}>Obteniendo estado del sistema</Text>
          </View>
        ) : connectionError ? (
          <View style={[styles.statusCard, styles.statusWait]}>
            <Text style={styles.statusIcon}>📡</Text>
            <Text style={styles.statusTitle}>Sin conexión</Text>
            <Text style={styles.statusSub}>Reintentando...</Text>
          </View>
        ) : hasAlerts ? (
          <View style={[styles.statusCard, styles.statusAlert]}>
            <Text style={styles.statusIcon}>🚨</Text>
            <Text style={styles.statusTitle}>
              {alerts.length === 1 ? '1 alerta activa' : `${alerts.length} alertas activas`}
            </Text>
            <Text style={styles.statusSub}>Sigue las instrucciones del personal</Text>
          </View>
        ) : (
          <View style={[styles.statusCard, styles.statusOk]}>
            <Text style={styles.statusIcon}>✅</Text>
            <Text style={styles.statusTitle}>Sistema operando normal</Text>
            <Text style={styles.statusSub}>No hay alertas activas en este momento</Text>
          </View>
        )}

        {/* Alert items */}
        {alerts.map(alert => {
          const isLow = alert.severity === 'LOW' || alert.severity === 'MEDIUM';
          return (
            <View key={alert.id} style={[styles.alertItem, isLow && styles.alertItemLow]}>
              <Text style={styles.alertItemIcon}>
                {ALERT_ICONS[alert.type] ?? '❗'}
              </Text>
              <View style={styles.alertItemBody}>
                <Text style={[styles.alertType, isLow && styles.alertTypeLow]}>
                  {ALERT_LABELS[alert.type] ?? alert.type}
                </Text>
                <Text style={styles.alertMsg}>{alert.message}</Text>
                {alert.zone ? (
                  <Text style={styles.alertZone}>📍 {alert.zone}</Text>
                ) : null}
                <Text style={styles.alertTime}>{formatTime(alert.created_at)}</Text>
              </View>
            </View>
          );
        })}

        {connectionError && (
          <View style={styles.errCard}>
            <Text style={styles.errText}>
              No se pudo conectar al sistema SAE.{'\n'}Verifica tu conexión.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botón silenciar — visible cuando hay alertas activas */}
      {hasAlerts && (
        <View style={styles.silenceBar}>
          <TouchableOpacity style={styles.silenceBtn} onPress={handleSilence} activeOpacity={0.8}>
            <Text style={styles.silenceBtnText}>🔕  Silenciar alarma — Estoy bien</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>neostech · Sistema de Alertas de Emergencia</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f172a', paddingTop: StatusBar.currentHeight ?? 0},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    letterSpacing: -0.3,
  },
  badge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20},
  badgeLive: {backgroundColor: '#dc2626'},
  badgeOk:   {backgroundColor: '#16a34a'},
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  main: {flex: 1},
  mainContent: {padding: 16, gap: 12},

  statusCard: {borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1},
  statusOk: {
    backgroundColor: 'rgba(22,163,74,0.15)',
    borderColor: 'rgba(22,163,74,0.4)',
  },
  statusAlert: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(220,38,38,0.4)',
  },
  statusWait: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusIcon:  {fontSize: 48, lineHeight: 56, marginBottom: 8},
  statusTitle: {fontSize: 18, fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginTop: 4},
  statusSub:   {fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4},

  alertItem: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  alertItemLow: {
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderColor: 'rgba(234,179,8,0.35)',
  },
  alertItemIcon: {fontSize: 28, lineHeight: 34, marginTop: 2},
  alertItemBody: {flex: 1},
  alertType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#f87171',
    marginBottom: 3,
  },
  alertTypeLow: {color: '#fbbf24'},
  alertMsg:  {fontSize: 14, lineHeight: 21, color: '#e2e8f0'},
  alertZone: {fontSize: 12, color: '#93c5fd', marginTop: 3, fontWeight: '500'},
  alertTime: {fontSize: 11, color: '#64748b', marginTop: 4},

  errCard: {
    borderRadius: 14,
    padding: 20,
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    alignItems: 'center',
  },
  errText: {fontSize: 13, color: '#fbbf24', textAlign: 'center', lineHeight: 20},

  silenceBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220,38,38,0.3)',
    backgroundColor: 'rgba(220,38,38,0.06)',
  },
  silenceBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  silenceBtnText: {fontSize: 15, fontWeight: '700', color: '#fff'},

  footer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  footerText: {fontSize: 11, color: '#334155'},
});
