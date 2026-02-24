import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  onComplete: (clientId: string) => void;
}

export default function OnboardingScreen({onComplete}: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleContinue() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Ingresa el código de tu edificio.');
      return;
    }
    await AsyncStorage.setItem('sae_clientId', trimmed);
    onComplete(trimmed);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>SAE</Text>
          <Text style={styles.brand}>neostech</Text>
        </View>

        <Text style={styles.title}>Sistema de Alertas{'\n'}de Emergencia</Text>
        <Text style={styles.sub}>
          Ingresa el código de tu edificio para recibir alertas en tiempo real.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Código del edificio (ej: EDIFICIO_01)"
          placeholderTextColor="#64748b"
          value={code}
          onChangeText={v => {
            setCode(v);
            setError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleContinue}>
          <Text style={styles.btnText}>Continuar</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          El administrador de tu edificio te proporcionó este código.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: -2,
  },
  brand: {
    fontSize: 14,
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f1f5f9',
    marginBottom: 8,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 16,
  },
});
