'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  signInWithGoogle,
  signInWithMicrosoft,
  signInWithEmail,
  validateEmail,
} from '@/packages/utils/firebase-auth';
import ToastManager, { useToastManager } from '@/components/ToastManager';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToastManager();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) router.push('/dashboard');
    });
    return () => unsub();
  }, [router]);

  const handleAuthSuccess = async (user: any) => {
    try {
      const userRef = doc(db, 'users', user.uid);

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3000));
      const getDocPromise = getDoc(userRef);

      const snap: any = await Promise.race([getDocPromise, timeoutPromise]);

      if (!snap.exists()) {
        const setDocPromise = setDoc(userRef, {
          email: user.email,
          authProvider: user.providerData?.[0]?.providerId || 'password',
          createdAt: new Date().toISOString(),
          onboarded: false
        });
        await Promise.race([setDocPromise, timeoutPromise]);

        showToast('Welcome!', 'success');
        setTimeout(() => router.push('/onboarding'), 800);
      } else {
        const data = snap.data();
        showToast('Welcome back!', 'success');
        if (data.profile?.onboarded) {
          setTimeout(() => router.push('/dashboard'), 800);
        } else {
          setTimeout(() => router.push('/onboarding'), 800);
        }
      }
    } catch (err) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        // Fallback for emulator offline
        showToast('Mock Sign In (Emulator Offline)', 'success');
        setTimeout(() => router.push('/dashboard'), 800);
      } else {
        showToast('Failed to sync profile', 'error');
      }
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!validateEmail(email)) { setEmailError('Please enter a valid email'); valid = false; }
    else setEmailError('');
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters'); valid = false; }
    else setPasswordError('');
    if (!valid) return;

    setLoading(true);
    try {
      const result = await signInWithEmail(auth, email, password);
      if (result.error) showToast(result.error, 'error');
      else if (result.user) await handleAuthSuccess(result.user);
    } catch (err: any) {
      showToast(err.message || 'Sign-in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle(auth);
      if (result.error) showToast(result.error, 'error');
      else if (result.user) await handleAuthSuccess(result.user);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleMicrosoft = async () => {
    setLoading(true);
    try {
      const result = await signInWithMicrosoft(auth);
      if (result.error) showToast(result.error, 'error');
      else if (result.user) await handleAuthSuccess(result.user);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-split" style={{ minHeight: '100vh' }}>
      <ToastManager toasts={toasts} onRemove={removeToast} />

      {/* Brand Panel */}
      <div className="auth-brand">
        <div className="auth-logo">
          <div className="auth-logo-icon">💰</div>
          <span className="auth-logo-text">FinSync Super</span>
        </div>
        <h1 className="auth-hero-title">
          Money, <span>simplified</span><br />for you.
        </h1>
        <p className="auth-hero-sub">
          Track spending, monitor investments, and plan your financial future — all in one place.
        </p>
        <div className="auth-features">
          <div className="auth-feature-item"><span className="auth-feature-dot"></span>AI-powered SMS & Email parsing</div>
          <div className="auth-feature-item"><span className="auth-feature-dot"></span>Real-time multi-bank sync</div>
          <div className="auth-feature-item"><span className="auth-feature-dot"></span>Smart budget planning (50/30/20)</div>
          <div className="auth-feature-item"><span className="auth-feature-dot"></span>Investment portfolio tracker</div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }} className="fade-in">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-sub">Sign in to continue to your dashboard</p>

          {/* OAuth */}
          <button className="oauth-btn" onClick={handleGoogle} disabled={loading}>
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Continue with Google
          </button>
          <button className="oauth-btn" onClick={handleMicrosoft} disabled={loading}>
            <svg viewBox="0 0 23 23" width="18" height="18"><path fill="#f3f3f3" d="M0 0h23v23H0z" /><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>
            Continue with Microsoft
          </button>

          <div className="divider">
            <span className="divider-line"></span>
            <span className="divider-text">or</span>
            <span className="divider-line"></span>
          </div>

          <form onSubmit={handleEmailSignIn}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="form-input-wrapper">
                <svg className="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <input
                  type="email"
                  className={`form-input${emailError ? ' error' : ''}`}
                  style={{ paddingLeft: '44px' }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  autoComplete="email"
                />
              </div>
              {emailError && <div className="form-error">{emailError}</div>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <a href="/forgot-password" className="forgot-link">Forgot password?</a>
              </div>
              <div className="form-input-wrapper">
                <svg className="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input${passwordError ? ' error' : ''}`}
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  autoComplete="current-password"
                />
                <button type="button" className="form-input-action" onClick={() => setShowPassword(!showPassword)}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {passwordError && <div className="form-error">{passwordError}</div>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !email || !password}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-link-row">
            Don't have an account?
            <a href="/signup">Create one free</a>
          </div>
        </div>
      </div>
    </div>
  );
}
