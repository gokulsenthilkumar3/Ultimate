import React, { useState } from 'react';
import { COLORS } from '../constants';
import { useToast } from '../hooks/useToast';

export default function AuthForms({ mode: initialMode, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode || 'login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      addToast({ title: 'Success', message: mode === 'login' ? 'Logged in successfully' : 'Account created successfully', type: 'success' });
      onAuthSuccess(data.user);
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-1)',
      color: 'var(--text-1)',
      fontFamily: 'var(--font-primary)'
    }}>
      <div style={{
        background: 'var(--bg-2)',
        padding: '48px',
        borderRadius: '24px',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.02em'
        }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={{ color: 'var(--text-2)', marginBottom: '32px', fontSize: '0.95rem' }}>
          {mode === 'login' ? 'Enter your details to access your dashboard.' : 'Start quantifying your self today.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                color: 'var(--text-1)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                color: 'var(--text-1)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '14px',
              background: `linear-gradient(135deg, ${COLORS.ACCENT_PRIMARY}, #818cf8)`,
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.1s'
            }}
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-2)' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: COLORS.ACCENT_PRIMARY, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: COLORS.ACCENT_PRIMARY, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
