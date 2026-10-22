import { create } from 'zustand';
import type { User } from '../types/family';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('familyconnect_token');

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: !!storedToken,
  token: storedToken,

  login: (user, token) => {
    localStorage.setItem('familyconnect_token', token);
    set({ currentUser: user, isAuthenticated: true, token });
  },
  
  logout: () => {
    localStorage.removeItem('familyconnect_token');
    set({ currentUser: null, isAuthenticated: false, token: null });
  },
}));
