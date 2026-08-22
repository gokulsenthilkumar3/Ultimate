import { createContext, useContext, useEffect, useState } from 'react';
import { logAuth, logSession } from '../lib/logger';

const AuthContext = createContext(null);
const TOKEN_KEY = 'growthtrack-session-token';
const AUTH_API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : 'Auth server unavailable. Start the API with npm run dev.');
  }
}

const readToken = () => sessionStorage.getItem(TOKEN_KEY);
const writeToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    const token = readToken();
    if (!token) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setUser(data.user);
        setSession({ access_token: token });
        sessionStorage.setItem('growthtrack-user', JSON.stringify(data.user));
      } else {
        clearToken();
        sessionStorage.removeItem('growthtrack-user');
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error(err);
      clearToken();
      sessionStorage.removeItem('growthtrack-user');
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const signUp = async (email, password, fullName) => {
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        return { error: new Error(data.error || 'Signup failed') };
      }
      if (data.token) writeToken(data.token);
      if (data.user) {
        sessionStorage.setItem('growthtrack-user', JSON.stringify(data.user));
      }
      await fetchSession();
      try { await logAuth('signup', email); } catch {}
      try { await logSession('start', 'New session created after signup'); } catch {}
      return { data: { user: data.user }, error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        return { error: new Error(data.error || 'Login failed') };
      }
      if (data.token) writeToken(data.token);
      if (data.user) {
        sessionStorage.setItem('growthtrack-user', JSON.stringify(data.user));
      }
      await fetchSession();
      try { await logAuth('login_success', email); } catch {}
      try { await logSession('start', 'Session started after login'); } catch {}
      return { data: { user: data.user }, error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    const email = user?.email;
    await logAuth('logout', email);
    await logSession('end', 'Session ended by user logout');
    clearToken();
    sessionStorage.removeItem('growthtrack-user');
    setSession(null);
    setUser(null);
    return { error: null };
  };

  const value = { user, session, loading, signUp, signIn, signOut };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
