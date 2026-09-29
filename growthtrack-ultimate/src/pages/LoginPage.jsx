import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import { uiMessages } from '../lib/uiMessages';
import { safeReturnDestination } from '../config/featureRegistry';
import './public-pages.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeReturnDestination(location.state?.from);

  const submit = async event => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.name === 'ApiError' ? err.message : uiMessages.signIn);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gt-public gt-public--login">
      <div className="gt-public__wrap">
        <header className="gt-public__header">
          <Link className="gt-public__brand" to="/welcome" aria-label="GrowthTrack home">
            <span className="gt-public__brand-mark" aria-hidden="true">G<span>.</span></span>
            <span>GrowthTrack</span>
          </Link>
          <Link className="gt-public__back" to="/welcome"><ArrowLeft size={16} aria-hidden="true" /> Back to the overview</Link>
        </header>

        <div className="gt-public-login">
          <section className="gt-public-login__story" aria-labelledby="login-story-title">
            <p className="gt-public__eyebrow"><span className="gt-public__eyebrow-rule" /> Owner access</p>
            <h1 id="login-story-title">A little space to <em>see the whole picture.</em></h1>
            <p>Return to the work, routines, and records that make this space yours.</p>
            <div className="gt-public-login__story-note"><span aria-hidden="true">01 / 01</span><span>One owner. One workspace.</span></div>
          </section>

          <section className="gt-public-login__panel" aria-labelledby="login-form-title">
            <div className="gt-public-login__panel-top"><LockKeyhole size={18} aria-hidden="true" /><span>Private sign in</span></div>
            <h2 id="login-form-title">Welcome back.</h2>
            <p className="gt-public-login__panel-copy">Sign in with the configured owner account. New accounts cannot be created here.</p>
            <form className="gt-public-login__form" onSubmit={submit}>
              <TextField
                className="gt-public-login__field"
                label="Email address"
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={event => { setEmail(event.target.value); setError(''); }}
                placeholder="owner@example.com"
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
              <div className="gt-public-login__password-row">
                <TextField
                  className="gt-public-login__field"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={event => { setPassword(event.target.value); setError(''); }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <button type="button" className="gt-public-login__reveal" aria-pressed={showPassword} disabled={loading} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide password' : 'Show password'}</button>
              </div>
              {error && <div id="login-error" className="gt-public-login__error" role="alert">{error}</div>}
              <Button type="submit" className="gt-public-login__submit" loading={loading} loadingLabel="Signing in…">Sign in <ArrowRight size={17} aria-hidden="true" /></Button>
            </form>
            <p className="gt-public-login__aside">Need access? Contact the person who manages this workspace.</p>
          </section>
        </div>

        <footer className="gt-public__footer">
          <span>© {new Date().getFullYear()} GrowthTrack</span>
          <nav aria-label="Legal links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
        </footer>
      </div>
    </main>
  );
}
