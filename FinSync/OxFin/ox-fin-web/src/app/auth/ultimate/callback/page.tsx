'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function UltimateCallbackContent() {
  const router = useRouter(); const params = useSearchParams(); const [message, setMessage] = useState('Connecting to Ultimate…');
  useEffect(() => {
    const token = params.get('ultimate_handoff'); if (!token) { setMessage('The sign-in handoff is missing.'); return; }
    fetch('/api/ultimate/integrations/consume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'oxfin', token }) })
      .then(async response => { if (!response.ok) throw new Error(); localStorage.setItem('ultimate_identity', JSON.stringify(await response.json())); router.replace('/dashboard'); })
      .catch(() => setMessage('This sign-in link expired. Return to Ultimate and open OxFin again.'));
  }, [params, router]);
  return <main className="min-h-screen grid place-items-center"><p>{message}</p></main>;
}

export default function UltimateCallback() {
  return <Suspense fallback={<p role="status">Loading sign-in handoff…</p>}><UltimateCallbackContent /></Suspense>;
}
