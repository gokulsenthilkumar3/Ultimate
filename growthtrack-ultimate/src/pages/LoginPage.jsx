import { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import { uiMessages } from '../lib/uiMessages';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/overview';

  const submit = async event => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;
      navigate(from, { replace: true });
    } catch (err) { setError(err.name === 'ApiError' ? err.message : uiMessages.signIn); }
    finally { setLoading(false); }
  };

  return <main className="auth-shell single-user-login" data-theme="light">
    <div className="auth-shell__glow auth-shell__glow--one" /><div className="auth-shell__glow auth-shell__glow--two" />
    <section className="auth-card auth-card--compact">
      <div className="auth-brand auth-brand--center"><div className="auth-brand__mark"><LockKeyhole size={22} /></div><div><div className="auth-brand__name">GrowthTrack</div><div className="auth-brand__sub">Private owner access</div></div></div>
      <h1 className="single-user-login__title">Your space to grow.</h1>
      <p className="single-user-login__subtitle">Sign in to your personal workspace.</p>
      <div className="single-user-login__trust"><ShieldCheck size={16} /><span>Single-user workspace. New accounts cannot be created from the application.</span></div>
      <form className="auth-form" onSubmit={submit}>
        <TextField label="Email" type="email" name="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" aria-describedby={error ? 'login-error' : undefined} />
        <TextField label="Password" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} aria-describedby={error ? 'login-error' : undefined} />
        <Button variant="ghost" className="single-user-login__reveal" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>Show password</Button>
        {error && <div id="login-error" className="notice notice--error" role="alert">{error}</div>}
        <Button type="submit" loading={loading} loadingLabel="Signing in…">Sign in</Button>
      </form>
    </section>
  </main>;
}
