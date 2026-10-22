import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function UltimateCallbackPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const login = useAuthStore(state => state.login); const [message, setMessage] = useState('Connecting to Ultimate…');
  useEffect(() => {
    const token = params.get('ultimate_handoff'); if (!token) { setMessage('The sign-in handoff is missing.'); return; }
    fetch('/api/ultimate/integrations/consume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'family', token }) })
      .then(async response => { if (!response.ok) throw new Error(); const payload = await response.json(); localStorage.setItem('ultimate_identity', JSON.stringify(payload)); login(payload.user, 'ultimate-local'); navigate('/dashboard', { replace: true }); })
      .catch(() => setMessage('This sign-in link expired. Return to Ultimate and open Family Connect again.'));
  }, [login, navigate, params]);
  return <main className="flex items-center justify-center h-screen"><p>{message}</p></main>;
}
