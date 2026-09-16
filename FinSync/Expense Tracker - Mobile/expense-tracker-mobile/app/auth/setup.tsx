import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView, ScrollView,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/auth';
// NOTE: @react-native-picker/picker is NOT installed and NOT needed.
// We use a tap-to-cycle pattern for question selection instead.

const SECURITY_QUESTIONS = [
  { id: '1', label: 'What was the name of your first pet?' },
  { id: '2', label: "What is your mother's maiden name?" },
  { id: '3', label: 'What high school did you attend?' },
  { id: '4', label: 'What was the make of your first car?' },
];

export default function Setup() {
  const [pin, setPin]             = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [questionId, setQuestionId] = useState(SECURITY_QUESTIONS[0].id);
  const [answer, setAnswer]       = useState('');
  const [enableBio, setEnableBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const { setupPin } = useAuthStore();

  const handleNextStep = async () => {
    if (step === 1) {
      if (pin.length !== 4) {
        Alert.alert('Error', 'PIN must be exactly 4 digits.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (pin !== confirmPin) {
        Alert.alert('Error', 'PINs do not match. Please try again.');
        setConfirmPin('');
        setStep(1);
        return;
      }
      const available = await authService.isBiometricAvailable();
      setBioAvailable(available);
      setStep(3);
    } else if (step === 3) {
      if (!answer.trim()) {
        Alert.alert('Error', 'Please provide an answer to the security question.');
        return;
      }
      await setupPin(pin, questionId, answer, enableBio);
      // _layout.tsx will auto-redirect to dashboard once isAuthenticated = true
    }
  };

  const cycleQuestion = () => {
    const idx  = SECURITY_QUESTIONS.findIndex(q => q.id === questionId);
    const next = (idx + 1) % SECURITY_QUESTIONS.length;
    setQuestionId(SECURITY_QUESTIONS[next].id);
  };

  const currentQuestion = SECURITY_QUESTIONS.find(q => q.id === questionId)?.label ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Let's secure your expense data</Text>

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.label}>Set a 4-Digit PIN</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              autoFocus
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.label}>Confirm your 4-Digit PIN</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
              autoFocus
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.label}>Security Question (For Recovery)</Text>

            <TouchableOpacity style={styles.questionSelector} onPress={cycleQuestion}>
              <Text style={styles.questionText}>{currentQuestion}</Text>
              <Text style={styles.hintText}>Tap to change question</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Your Answer"
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
            />

            {bioAvailable && (
              <View style={styles.bioContainer}>
                <Text style={styles.bioText}>Enable Biometric Login?</Text>
                <TouchableOpacity
                  style={[styles.bioButton, enableBio && styles.bioButtonActive]}
                  onPress={() => setEnableBio(!enableBio)}
                >
                  <Text style={[styles.bioButtonText, enableBio && styles.bioButtonTextActive]}>
                    {enableBio ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleNextStep}>
          <Text style={styles.buttonText}>{step === 3 ? 'Complete Setup' : 'Next'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f9fafb' },
  scroll:              { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title:               { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle:            { fontSize: 16, color: '#6b7280', marginBottom: 32 },
  card:                { backgroundColor: 'white', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 24 },
  label:               { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  input:               { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 16, fontSize: 18, textAlign: 'center', letterSpacing: 8 },
  button:              { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText:          { color: 'white', fontSize: 16, fontWeight: 'bold' },
  questionSelector:    { padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 12 },
  questionText:        { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  hintText:            { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  bioContainer:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  bioText:             { fontSize: 16, color: '#374151' },
  bioButton:           { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f3f4f6' },
  bioButtonActive:     { backgroundColor: '#3b82f6' },
  bioButtonText:       { color: '#4b5563', fontWeight: '600' },
  bioButtonTextActive: { color: 'white' },
});
