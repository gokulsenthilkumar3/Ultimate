'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UltimateCallback() {
  const router = useRouter(); const params = useSearchParams(); const [message, setMessage] = useState('Connecting to Ultimate…');
  useEffect(() => {
    const token = params.get('ultimate_handoff');
    if (!token) { setMessage('The sign-in handoff is missing.'); return; }
    fetch('http://localhost:3000/api/ultimate/api/integrations/consume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'finsync', token }) })
      .then(async response => { if (!response.ok) throw new Error(); const payload = await response.json(); localStorage.setItem('ultimate_identity', JSON.stringify(payload)); router.replace('/dashboard'); })
      .catch(() => setMessage('This sign-in link expired. Return to Ultimate and open FinSync again.'));
  }, [params, router]);
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}><p>{message}</p></main>;
}
