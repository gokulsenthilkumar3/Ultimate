import { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    } catch (err) { setError(err.message || 'Login failed.'); }
    finally { setLoading(false); }
  };

  return <main className="auth-shell single-user-login">
    <div className="auth-shell__glow auth-shell__glow--one" /><div className="auth-shell__glow auth-shell__glow--two" />
    <section className="auth-card auth-card--compact">
      <div className="auth-brand auth-brand--center"><div className="auth-brand__mark"><LockKeyhole size={22} /></div><div><div className="auth-brand__name">GrowthTrack</div><div className="auth-brand__sub">Private owner access</div></div></div>
      <div className="single-user-login__trust"><ShieldCheck size={16} /><span>Single-user workspace. New accounts cannot be created from the application.</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label className="field"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Owner email" /></label>
        <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••••••" /></label>
        {error && <div className="notice notice--error" role="alert">{error}</div>}
        <button className="btn btn--primary btn--full" type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Secure login'}</button>
      </form>
    </section>
  </main>;
}
