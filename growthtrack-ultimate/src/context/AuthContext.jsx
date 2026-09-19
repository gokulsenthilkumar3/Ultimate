import safeLocalStorage from '../utils/safeLocalStorage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setCsrfToken } from '../lib/apiClient';
import { createAuthProvider } from '../lib/authProviders';
import { setLoggingUser, flushLogQueue } from '../lib/logger';

const AuthContext = createContext(null);
const authProvider = createAuthProvider({ type: import.meta.env.VITE_AUTH_PROVIDER || 'local', enabled: import.meta.env.VITE_CLERK_ENABLED === 'true' });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setCsrfToken(null); setSession(null); setUser(null);
    setLoggingUser(null);
    safeLocalStorage.removeItem('growthtrack-user');
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const data = await authProvider.session();
      setUser(data.user); setSession(data.session);
      setLoggingUser(data.user); await flushLogQueue();
      safeLocalStorage.setItem('growthtrack-user', JSON.stringify(data.user));
    } catch { clearSession(); }
    finally { setLoading(false); }
  }, [clearSession]);

  useEffect(() => {
    fetchSession();
    const expire = () => clearSession();
    window.addEventListener('growthtrack:auth-expired', expire);
    return () => window.removeEventListener('growthtrack:auth-expired', expire);
  }, [clearSession, fetchSession]);

  const signIn = async (email, password) => {
    try {
      const data = await authProvider.signIn({ email, password });
      setUser(data.user); setSession(data.session);
      setLoggingUser(data.user); await flushLogQueue();
      safeLocalStorage.setItem('growthtrack-user', JSON.stringify(data.user));
      return { data: { user: data.user }, error: null };
    } catch (error) { clearSession(); return { error }; }
  };

  const signOut = async () => {
    try { await authProvider.signOut(); } catch { setCsrfToken(null); }
    clearSession();
    return { error: null };
  };

  return <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshSession: fetchSession }}>{!loading && children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
