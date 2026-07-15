import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return; }
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then log in.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif", padding: '24px'
    },
    card: {
      background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 16,
      padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
    },
    logo: { textAlign: 'center', marginBottom: 32 },
    logoText: { fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
    logoSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
    tabs: { display: 'flex', background: '#1a1a24', borderRadius: 10, padding: 4, marginBottom: 28 },
    tab: (active) => ({
      flex: 1, padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer',
      fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
      background: active ? '#a78bfa' : 'transparent',
      color: active ? '#fff' : '#6b7280'
    }),
    label: { display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 },
    input: {
      width: '100%', padding: '12px 14px', background: '#1a1a24',
      border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff',
      fontSize: 14, outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    field: { marginBottom: 18 },
    btn: {
      width: '100%', padding: '13px', background: loading ? '#4c3d8f' : '#7c3aed',
      color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
      fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
      marginTop: 8, transition: 'background 0.2s'
    },
    error: { background: '#2a1515', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 },
    success: { background: '#0f2a1a', border: '1px solid #166534', borderRadius: 8, padding: '10px 14px', color: '#86efac', fontSize: 13, marginBottom: 16 },
    backLink: { display: 'block', textAlign: 'center', marginTop: 20, color: '#6b7280', fontSize: 13, textDecoration: 'none' }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoText}>⚡ Ultimate</div>
          <div style={styles.logoSub}>Your Digital Self, Evolving in Real-Time</div>
        </div>

        <div style={styles.tabs}>
          <button style={styles.tab(tab === 'login')} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>Sign In</button>
          <button style={styles.tab(tab === 'signup')} onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}>Sign Up</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input style={styles.input} type="text" placeholder="Gokul S" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <Link to="/" style={styles.backLink}>← Back to home</Link>
      </div>
    </div>
  );
}
