import safeLocalStorage from '../utils/safeLocalStorage';
import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { setCsrfToken } from '../lib/apiClient';
import { createAuthProvider } from '../lib/authProviders';
import { setLoggingUser, flushLogQueue } from '../lib/logger';

const AuthContext = createContext(null);
const authProvider = createAuthProvider({ type: import.meta.env.VITE_AUTH_PROVIDER || 'local', enabled: import.meta.env.VITE_CLERK_ENABLED === 'true' });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const epoch = useRef(0);

  const clearSession = useCallback(() => {
    epoch.current++; setLoading(false);
    setCsrfToken(null); setSession(null); setUser(null);
    setLoggingUser(null);
    safeLocalStorage.removeItem('growthtrack-user');
  }, []);

  const fetchSession = useCallback(async () => {
    const requestEpoch = ++epoch.current;
    try {
      const data = await authProvider.session();
      if (requestEpoch !== epoch.current) return;
      setUser(data.user); setSession(data.session);
      setLoggingUser(data.user); await flushLogQueue();
      if (requestEpoch !== epoch.current) return;
      safeLocalStorage.setItem('growthtrack-user', JSON.stringify(data.user));
    } catch { if (requestEpoch === epoch.current) clearSession(); }
    finally { if (requestEpoch === epoch.current) setLoading(false); }
  }, [clearSession]);

  useEffect(() => {
    fetchSession();
    const expire = () => clearSession();
    const synchronize = event => {
      if (event.key !== 'growthtrack-user') return;
      // Other windows may announce a sign-out or account switch. The value is
      // never trusted as identity; any sign-in is rechecked with the server.
      if (event.newValue === null) clearSession();
      else { setUser(null); setSession(null); setCsrfToken(null); setLoggingUser(null); setLoading(true); void fetchSession(); }
    };
    window.addEventListener('growthtrack:auth-expired', expire);
    window.addEventListener('storage', synchronize);
    return () => { window.removeEventListener('growthtrack:auth-expired', expire); window.removeEventListener('storage', synchronize); };
  }, [clearSession, fetchSession]);

  const signIn = async (email, password, otp) => {
    const requestEpoch = ++epoch.current;
    try {
      const data = await authProvider.signIn({ email, password, otp });
      if (requestEpoch !== epoch.current) return { error: new Error('The sign-in was superseded by another session change.') };
      setUser(data.user); setSession(data.session);
      setLoggingUser(data.user); await flushLogQueue();
      if (requestEpoch !== epoch.current) return { error: new Error('The sign-in was superseded by another session change.') };
      safeLocalStorage.setItem('growthtrack-user', JSON.stringify(data.user));
      return { data: { user: data.user }, error: null };
    } catch (error) { if (requestEpoch === epoch.current) clearSession(); return { error }; }
  };

  const signOut = async () => {
    try { await authProvider.signOut(); }
    catch (error) { return { error }; }
    clearSession();
    return { error: null };
  };

  return <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshSession: fetchSession }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
