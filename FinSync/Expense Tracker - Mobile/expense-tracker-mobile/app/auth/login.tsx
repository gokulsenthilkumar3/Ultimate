import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function Login() {
  const [pin, setPin] = useState('');
  const { login, loginWithBiometrics, biometricEnabled } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (biometricEnabled) {
      handleBiometricLogin();
    }
  }, [biometricEnabled]);

  const handleBiometricLogin = async () => {
    await loginWithBiometrics();
    // Layout will redirect if successful
  };

  const handlePinLogin = async (enteredPin: string) => {
    setPin(enteredPin);
    if (enteredPin.length === 4) {
      const success = await login(enteredPin);
      if (!success) {
        Alert.alert('Error', 'Incorrect PIN');
        setPin(''); // Reset
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>

        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={pin}
          onChangeText={handlePinLogin}
          autoFocus={!biometricEnabled}
        />

        {biometricEnabled && (
          <TouchableOpacity style={styles.bioButton} onPress={handleBiometricLogin}>
            <Text style={styles.bioButtonText}>Use FaceID / TouchID</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.forgotButton} onPress={() => router.push('/auth/recovery')}>
          <Text style={styles.forgotButtonText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 32 },
  input: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    backgroundColor: 'white',
    borderRadius: 8, 
    padding: 16, 
    fontSize: 24, 
    textAlign: 'center', 
    letterSpacing: 16,
    width: '80%',
    marginBottom: 24
  },
  bioButton: { padding: 16, backgroundColor: '#eff6ff', borderRadius: 8, width: '80%', alignItems: 'center', marginBottom: 16 },
  bioButtonText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  forgotButton: { padding: 16 },
  forgotButtonText: { color: '#6b7280', fontSize: 14 }
});
