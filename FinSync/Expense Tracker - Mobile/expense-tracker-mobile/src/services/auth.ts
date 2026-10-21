/**
 * Auth service
 * PIN and security answer are stored as SHA-256 hex digests — never plaintext.
 * Uses Web Crypto API (crypto.subtle) which is available in Hermes / Expo Go SDK 54+
 * without any extra native module — no expo-crypto needed.
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// ─── SHA-256 via Web Crypto (Hermes / Expo Go compatible) ────────────────────
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Storage abstraction ─────────────────────────────────────────────────────
const setItemAsync = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch (e) {}
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getItemAsync = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  return await SecureStore.getItemAsync(key);
};

const deleteItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch (e) {}
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

const PIN_KEY               = 'user_pin_hash';
const SEC_QUESTION_KEY      = 'security_question';
const SEC_ANSWER_KEY        = 'security_answer_hash';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const authService = {
  // ── PIN ────────────────────────────────────────────────────────────────────
  async setPin(pin: string): Promise<void> {
    const hash = await sha256(pin);
    await setItemAsync(PIN_KEY, hash);
  },

  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = await getItemAsync(PIN_KEY);
    if (!storedHash) return false;
    const hash = await sha256(pin);
    return storedHash === hash;
  },

  async hasPinSetup(): Promise<boolean> {
    const stored = await getItemAsync(PIN_KEY);
    // A valid SHA-256 hex string is always 64 characters
    return stored !== null && stored.length === 64;
  },

  // ── Security question ──────────────────────────────────────────────────────
  async setSecurityQuestion(questionId: string, answer: string): Promise<void> {
    const hash = await sha256(answer.trim().toLowerCase());
    await setItemAsync(SEC_QUESTION_KEY, questionId);
    await setItemAsync(SEC_ANSWER_KEY, hash);
  },

  async getSecurityQuestion(): Promise<string | null> {
    return await getItemAsync(SEC_QUESTION_KEY);
  },

  async verifySecurityAnswer(answer: string): Promise<boolean> {
    const storedHash = await getItemAsync(SEC_ANSWER_KEY);
    if (!storedHash) return false;
    const hash = await sha256(answer.trim().toLowerCase());
    return storedHash === hash;
  },

  // ── Biometrics ─────────────────────────────────────────────────────────────
  async isBiometricAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  async authenticateBiometric(
    promptMessage = 'Authenticate to access your expenses'
  ): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const isAvailable = await this.isBiometricAvailable();
    if (!isAvailable) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    return result.success;
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  },

  async isBiometricEnabled(): Promise<boolean> {
    const val = await getItemAsync(BIOMETRIC_ENABLED_KEY);
    return val === 'true';
  },

  // ── Full reset ─────────────────────────────────────────────────────────────
  async clearAllAuth(): Promise<void> {
    await deleteItemAsync(PIN_KEY);
    await deleteItemAsync(SEC_QUESTION_KEY);
    await deleteItemAsync(SEC_ANSWER_KEY);
    await deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  },
};
