import { useRef, useState } from 'react';
import useLandingMotion from '../hooks/useLandingMotion';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, Heart, LockKeyhole, Mail, Scissors, Sparkles, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import { uiMessages } from '../lib/uiMessages';
import { safeReturnDestination } from '../config/featureRegistry';
import AnimatedLogo from '../components/motion/AnimatedLogo';
import CharacterScene, { MotionToggle } from '../components/motion/CharacterScene';
import usePlayfulMotion from '../hooks/usePlayfulMotion';
import useKineticPreferences from '../hooks/useKineticPreferences';
import './public-pages.css';

const SIGN_OUT_NOTICES = {
  kept: { text: 'Signed out. Local drafts were left unchanged on this browser.', error: false },
  removed: { text: 'Signed out. Local drafts were removed; your saved records stay in your workspace.', error: false },
  'cleanup-failed': { text: 'You’re signed out, but local drafts could not be removed. Sign in again to review this browser’s drafts.', error: true },
};

export default function LoginPage({ theme = 'light', palette = 'forest', signingOut = false, signOutNotice }) {
  const { style: uiStyle } = useKineticPreferences();
  const rootRef = useRef(null);
  useLandingMotion(rootRef);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const { signIn, loading: authLoading } = useAuth();
  const busy = loading || signingOut || authLoading;
  const { canAnimate, reduced } = usePlayfulMotion();
  const eyesClosed = focusedField === 'password';
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeReturnDestination(location.state?.from);
  const noticeKey = signOutNotice || location.state?.signedOut;
  const notice = !noticeDismissed && !signingOut && Object.hasOwn(SIGN_OUT_NOTICES, noticeKey) ? SIGN_OUT_NOTICES[noticeKey] : null;

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
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
    <main ref={rootRef} className="gt-public gt-public--login" data-theme={theme} data-palette={palette} data-ui-style={uiStyle} data-playful-motion={String(canAnimate)} data-reduced-motion={String(reduced)}>
      <a className="gt-public__skip" href="#public-content" tabIndex={0}>Skip to main content</a>
      <div className="gt-public__wrap">
        <header className="gt-public__header">
          <Link className="gt-public__brand" to="/welcome" aria-label="GrowthTrack home">
            <AnimatedLogo /><span>growthtrack<span className="gt-public__brand-dot">.</span></span>
          </Link>
          <Link className="gt-public__back" to="/welcome"><ArrowLeft size={16} aria-hidden="true" /> Back to the little world</Link>
        </header>

        <div className="gt-public-login">
          <section className="gt-public-login__story" data-hero-enter id="public-content" tabIndex={-1} aria-labelledby="login-story-title">
            <p className="gt-public__eyebrow"><span aria-hidden="true">✳</span> YOUR NEXT LITTLE CHAPTER</p>
            <h1 id="login-story-title">Good to have<br /><em>you back.</em></h1>
            <p>Your work, your wellbeing, your wonderfully human life. Let’s make a little room for all of it.</p>
            <div className="gt-public-login__art"><div className="gt-public-login__world" aria-hidden="true"><span><i />THE EVERYDAY CLUB</span><span>EST. ONE SMALL STEP</span></div><CharacterScene className="login-crew" eyesClosed={eyesClosed} state={eyesClosed ? 'listen' : error ? 'oops' : busy ? 'sleep' : 'greet'} /><span className="gt-public-login__art-stamp" aria-hidden="true">A LITTLE LESS NOISE.<br /><b>A LOT MORE YOU.</b></span><span className="gt-public-login__art-doodle" aria-hidden="true">good things<br />start small. ↗</span></div>
            <div className="gt-public-login__values"><span><Scissors size={14} aria-hidden="true" />A little focus</span><span><Sparkles size={14} aria-hidden="true" />Room to grow</span><span><Heart size={14} aria-hidden="true" />More life</span></div>
            <div className="gt-public-login__story-note"><p aria-live="polite" aria-atomic="true">{signingOut ? 'Wrapping up your sign-out…' : loading ? 'Getting your space ready…' : error ? 'Take a breath. Let’s try that again.' : eyesClosed ? 'A little privacy. We’ll look away.' : 'Your little crew saved you a spot.'}</p><MotionToggle /></div>
          </section>

          <section className="gt-public-login__panel" data-hero-enter data-sign-in-state={busy ? 'loading' : error ? 'error' : 'ready'} aria-labelledby="login-form-title">
            {notice && <div className="gt-public-login__notice" data-error={notice.error} role={notice.error ? 'alert' : 'status'}>{notice.error ? <AlertCircle size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}<p>{notice.text}</p><button type="button" aria-label="Dismiss sign-out message" onClick={() => setNoticeDismissed(true)}><X size={15} aria-hidden="true" /></button></div>}
            <div className="gt-public-login__panel-top"><span className="gt-public-login__lock"><LockKeyhole size={21} aria-hidden="true" /></span><span>JUST YOU. JUST YOUR SPACE.</span><span className="gt-public-login__panel-spark" aria-hidden="true">✳</span></div>
            <h2 id="login-form-title">Let’s step inside.</h2>
            <p className="gt-public-login__panel-copy">Sign in with the configured owner account. New accounts cannot be created here.</p>
            <div className="gt-public-login__form-heading"><span>YOUR ACCOUNT</span><span aria-hidden="true">01 / 01</span></div>
            <form className="gt-public-login__form" aria-busy={busy} onSubmit={submit} onFocusCapture={event => setFocusedField(event.target.name || '')} onBlurCapture={event => setFocusedField(event.relatedTarget?.name || '')}>
              <div className="gt-public-login__input-wrap">
              <Mail className="gt-public-login__input-icon" size={18} aria-hidden="true" />
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
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
              </div>
              <div className="gt-public-login__password-row">
                <LockKeyhole className="gt-public-login__input-icon" size={18} aria-hidden="true" />
                <TextField
                  className="gt-public-login__field"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={event => { setPassword(event.target.value); setError(''); }}
                  disabled={busy}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <button type="button" name="password" className="gt-public-login__reveal" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
              </div>
              {error && <div id="login-error" className="gt-public-login__error" role="alert">{error}</div>}
              <Button type="submit" className="gt-public-login__submit" loading={busy} loadingLabel={signingOut ? 'Finishing sign-out…' : 'Signing in…'}>Sign in <ArrowRight size={17} aria-hidden="true" /></Button>
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
