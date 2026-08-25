import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, refreshCsrfToken, setCsrfToken } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    setCsrfToken(null); setSession(null); setUser(null);
    localStorage.removeItem('growthtrack-user');
  };

  const fetchSession = async () => {
    try {
      const data = await apiRequest('/api/auth/me');
      await refreshCsrfToken();
      setUser(data.user); setSession({ expiresAt: data.expiresAt });
      localStorage.setItem('growthtrack-user', JSON.stringify(data.user));
    } catch { clearSession(); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSession();
    const expire = () => clearSession();
    window.addEventListener('growthtrack:auth-expired', expire);
    return () => window.removeEventListener('growthtrack:auth-expired', expire);
  }, []);

  const signIn = async (email, password) => {
    try {
      const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setCsrfToken(data.csrfToken); setUser(data.user); setSession({ expiresAt: data.expiresAt });
      localStorage.setItem('growthtrack-user', JSON.stringify(data.user));
      return { data: { user: data.user }, error: null };
    } catch (error) { clearSession(); return { error }; }
  };

  const signOut = async () => {
    try { await apiRequest('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
    clearSession();
    return { error: null };
  };

  return <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshSession: fetchSession }}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
