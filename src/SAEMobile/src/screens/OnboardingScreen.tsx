import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO_URI = 'https://neos-tech.web.app/assets/images/neostechb.png';
const WH = Dimensions.get('window').height;

interface Props {
  onComplete: (clientId: string) => void;
}

export default function OnboardingScreen({onComplete}: Props) {
  const [code, setCode]           = useState('');
  const [error, setError]         = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const [focused, setFocused]     = useState(false);

  /* ── Animaciones de entrada ─────────────────────────────────── */
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {toValue: 1,    duration: 2200, useNativeDriver: true}),
        Animated.timing(glowAnim, {toValue: 0.25, duration: 2200, useNativeDriver: true}),
      ]),
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleContinue() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Ingresa el número de edificio, block o torre.');
      return;
    }
    await AsyncStorage.setItem('sae_clientId', trimmed);
    onComplete(trimmed);
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#080f1e" />

      {/* Círculos decorativos de fondo */}
      <View style={[s.bg, s.bgTR]} />
      <View style={[s.bg, s.bgBL]} />
      <View style={[s.bg, s.bgCtr]} />

      <Animated.View
        style={[s.inner, {opacity: fadeAnim, transform: [{translateY: slideAnim}]}]}>

        {/* ── Sección logo ─────────────────────────────────────── */}
        <View style={s.logoSection}>
          {/* Anillo pulsante de fondo */}
          <Animated.View style={[s.glowRing, {opacity: glowAnim}]} />

          {/* Contenedor del logo */}
          <View style={s.logoBox}>
            {!logoFailed ? (
              <Image
                source={{uri: LOGO_URI}}
                style={s.logoImg}
                resizeMode="contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Text style={s.logoFallback}>NT</Text>
            )}
          </View>

          <Text style={s.saeTitle}>SAE</Text>
          <Text style={s.saeBrand}>NEOSTECH · SISTEMA DE ALERTAS</Text>
        </View>

        {/* ── Tarjeta del formulario ────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Activa las alertas</Text>
          <Text style={s.cardSub}>
            Ingresa el número de tu edificio, block o torre para recibir notificaciones de emergencia en tiempo real.
          </Text>

          <TextInput
            style={[s.input, focused && s.inputFocused]}
            placeholder="Número de edificio / block / torre"
            placeholderTextColor="#475569"
            value={code}
            onChangeText={v => {setCode(v); setError('');}}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          {error ? (
            <Text style={s.error}>⚠️  {error}</Text>
          ) : (
            <Text style={s.inputHint}>Ej: EDIFICIO_01 · TORRE_A · BLOCK_SUR</Text>
          )}

          <TouchableOpacity style={s.btn} onPress={handleContinue} activeOpacity={0.82}>
            <Text style={s.btnText}>Continuar  →</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>
          El número de edificio lo proporciona el administrador.{'\n'}
          Sólo necesitas ingresarlo una vez.
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080f1e',
    paddingTop: StatusBar.currentHeight ?? 0,
  },

  /* ── Decoración de fondo ──────────────────────────────────── */
  bg: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgTR: {
    width: 340,
    height: 340,
    top: -120,
    right: -120,
    backgroundColor: 'rgba(79,70,229,0.08)',
  },
  bgBL: {
    width: 280,
    height: 280,
    bottom: 40,
    left: -100,
    backgroundColor: 'rgba(30,64,175,0.07)',
  },
  bgCtr: {
    width: 200,
    height: 200,
    top: WH * 0.35,
    alignSelf: 'center',
    backgroundColor: 'rgba(99,102,241,0.04)',
  },

  /* ── Contenido animado ───────────────────────────────────── */
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  /* ── Logo ─────────────────────────────────────────────────── */
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(99,102,241,0.18)',
    top: -8,
  },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: '#131e33',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#6366f1',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },
  logoImg:      {width: 60, height: 60},
  logoFallback: {fontSize: 30, fontWeight: '900', color: '#818cf8', letterSpacing: -1},
  saeTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#f1f5f9',
    letterSpacing: -1,
    marginBottom: 5,
  },
  saeBrand: {
    fontSize: 10,
    color: '#475569',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  /* ── Tarjeta del formulario ──────────────────────────────── */
  card: {
    backgroundColor: 'rgba(19,30,51,0.75)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },

  /* ── Input ───────────────────────────────────────────────── */
  input: {
    backgroundColor: 'rgba(8,15,30,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f1f5f9',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputFocused: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.07)',
  },
  inputHint: {
    fontSize: 11,
    color: '#2d3d55',
    marginBottom: 18,
    marginLeft: 2,
  },
  error: {
    color: '#fca5a5',
    fontSize: 12,
    marginBottom: 14,
    marginLeft: 2,
  },

  /* ── Botón ───────────────────────────────────────────────── */
  btn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(165,180,252,0.25)',
    elevation: 10,
    shadowColor: '#6366f1',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Pie de página ───────────────────────────────────────── */
  footer: {
    fontSize: 11,
    color: '#2d3d55',
    textAlign: 'center',
    lineHeight: 18,
  },
});
