'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function UltimateCallbackContent() {
  const router = useRouter(); const params = useSearchParams(); const [message, setMessage] = useState('Connecting to Ultimate…');
  const token = params.get('ultimate_handoff');
  useEffect(() => {
    if (!token) return;
    fetch('/api/ultimate/integrations/consume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'finsync', token }) })
      .then(async response => { if (!response.ok) throw new Error(); const payload = await response.json(); localStorage.setItem('ultimate_identity', JSON.stringify(payload)); router.replace('/dashboard'); })
      .catch(() => setMessage('This sign-in link expired. Return to Ultimate and open FinSync again.'));
  }, [token, router]);
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}><p>{token ? message : 'The sign-in handoff is missing.'}</p></main>;
}

export default function UltimateCallback() {
  return <Suspense fallback={<main><p>Connecting to Ultimate…</p></main>}><UltimateCallbackContent /></Suspense>;
}
