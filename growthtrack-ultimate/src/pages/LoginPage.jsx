import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/overview';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
        navigate(from, { replace: true });
      } else {
        if (!fullName.trim()) throw new Error('Please add your full name.');
        const { error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) throw signUpError;
        setMessage('Account created. Check your email if confirmation is enabled.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-shell__glow auth-shell__glow--one" />
      <div className="auth-shell__glow auth-shell__glow--two" />

      <section className="auth-card auth-card--compact">
        <div className="auth-brand auth-brand--center">
          <div className="auth-brand__mark">⚡</div>
          <div>
            <div className="auth-brand__name">GrowthTrack</div>
            <div className="auth-brand__sub">Login to your dashboard</div>
          </div>
        </div>

        <div className="segmented">
          <button type="button" className={`segmented__item ${mode === 'login' ? 'is-active' : ''}`} onClick={() => setMode('login')}>
            Login
          </button>
          <button type="button" className={`segmented__item ${mode === 'signup' ? 'is-active' : ''}`} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>

          {error && <div className="notice notice--error">{error}</div>}
          {message && <div className="notice notice--success">{message}</div>}

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/" className="auth-link">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
