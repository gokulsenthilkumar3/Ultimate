import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'growthtrack-session-token';
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || import.meta.env.VITE_API_BASE || '/api';

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
      const res = await fetch(`${AUTH_API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSession({ access_token: token });
      } else {
        clearToken();
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error(err);
      clearToken();
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
      const res = await fetch(`${AUTH_API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error || 'Signup failed') };
      }
      if (data.token) writeToken(data.token);
      await fetchSession();
      return { data: { user: data.user }, error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${AUTH_API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error || 'Login failed') };
      }
      if (data.token) writeToken(data.token);
      await fetchSession();
      return { data: { user: data.user }, error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    clearToken();
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
