import { create } from 'zustand';
import { authService } from '../services/auth';
import { initDB } from '../db';

interface AuthState {
  isReady: boolean;
  isAuthenticated: boolean;
  hasPinSetup: boolean;
  biometricEnabled: boolean;
  initialize: () => Promise<void>;
  login: (pin?: string) => Promise<boolean>;
  loginWithBiometrics: () => Promise<boolean>;
  logout: () => void;
  setupPin: (
    pin: string,
    questionId: string,
    answer: string,
    enableBiometric: boolean
  ) => Promise<void>;
  resetPin: (newPin: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isReady: false,
  isAuthenticated: false,
  hasPinSetup: false,
  biometricEnabled: false,

  initialize: async () => {
    try {
      const hasPin     = await authService.hasPinSetup();
      const bioEnabled = await authService.isBiometricEnabled();
      set({ hasPinSetup: hasPin, biometricEnabled: bioEnabled, isReady: true });
    } catch (e) {
      console.error('[AuthStore] initialize error:', e);
      set({ isReady: true });
    }
  },

  login: async (pin?: string) => {
    if (!pin) return false;
    const isValid = await authService.verifyPin(pin);
    if (isValid) { set({ isAuthenticated: true }); return true; }
    return false;
  },

  loginWithBiometrics: async () => {
    const success = await authService.authenticateBiometric();
    if (success) { set({ isAuthenticated: true }); return true; }
    return false;
  },

  logout: () => set({ isAuthenticated: false }),

  setupPin: async (pin, questionId, answer, enableBiometric) => {
    await authService.setPin(pin);
    await authService.setSecurityQuestion(questionId, answer);
    await authService.setBiometricEnabled(enableBiometric);
    set({ hasPinSetup: true, biometricEnabled: enableBiometric, isAuthenticated: true });
  },

  resetPin: async (newPin) => {
    await authService.setPin(newPin);
    set({ isAuthenticated: true });
  },
}));
