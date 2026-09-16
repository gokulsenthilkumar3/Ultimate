import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/auth';

const SECURITY_QUESTIONS = [
  { id: '1', label: 'What was the name of your first pet?' },
  { id: '2', label: 'What is your mother\'s maiden name?' },
  { id: '3', label: 'What high school did you attend?' },
  { id: '4', label: 'What was the make of your first car?' }
];

export default function Recovery() {
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [step, setStep] = useState(1); // 1: Answer, 2: New PIN
  const [newPin, setNewPin] = useState('');
  
  const { resetPin } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const fetchQuestion = async () => {
      const qId = await authService.getSecurityQuestion();
      if (qId) setQuestionId(qId);
    };
    fetchQuestion();
  }, []);

  const handleVerifyAnswer = async () => {
    if (!answer.trim()) {
      Alert.alert('Error', 'Please enter your answer.');
      return;
    }
    const isCorrect = await authService.verifySecurityAnswer(answer);
    if (isCorrect) {
      setStep(2);
    } else {
      Alert.alert('Error', 'Incorrect answer.');
    }
  };

  const handleResetPin = async (enteredPin: string) => {
    setNewPin(enteredPin);
    if (enteredPin.length === 4) {
      await resetPin(enteredPin);
      Alert.alert('Success', 'Your PIN has been reset.');
      // Layout will auto-redirect
    }
  };

  const currentQuestion = SECURITY_QUESTIONS.find(q => q.id === questionId)?.label || 'Loading...';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Account Recovery</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? 'Answer your security question' : 'Enter your new PIN'}
        </Text>

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.label}>{currentQuestion}</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Answer"
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyAnswer}>
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.label}>New 4-Digit PIN</Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={handleResetPin}
              autoFocus
            />
          </View>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 32, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16 },
  pinInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 16 },
  button: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 24, padding: 16, alignItems: 'center' },
  cancelButtonText: { color: '#6b7280', fontSize: 16, fontWeight: '500' }
});
