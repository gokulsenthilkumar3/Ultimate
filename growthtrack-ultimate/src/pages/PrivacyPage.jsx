export default function PrivacyPage() {
  const s = {
    page: { fontFamily: "'Inter', sans-serif", background: '#0a0a0f', color: '#d1d5db', minHeight: '100vh', padding: '60px 24px', maxWidth: 720, margin: '0 auto' },
    h1: { fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 8 },
    date: { color: '#6b7280', fontSize: 14, marginBottom: 40 },
    h2: { fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 36, marginBottom: 12 },
    p: { lineHeight: 1.7, marginBottom: 16 },
  };
  return (
    <div style={s.page}>
      <h1 style={s.h1}>Privacy Policy</h1>
      <div style={s.date}>Last updated: July 16, 2026</div>
      <h2 style={s.h2}>1. Information We Collect</h2>
      <p style={s.p}>We collect information you provide directly: email address, name, health metrics (weight, sleep, workouts). We do not sell your data to third parties.</p>
      <h2 style={s.h2}>2. How We Use Your Data</h2>
      <p style={s.p}>Your data is used solely to power your personal dashboard and avatar. Analytics are aggregated and anonymized. We use Supabase (cloud database) for secure storage.</p>
      <h2 style={s.h2}>3. Data Security</h2>
      <p style={s.p}>Data is encrypted in transit (HTTPS/TLS) and at rest. Authentication is handled via Supabase Auth with industry-standard security. You can delete your account and all data at any time.</p>
      <h2 style={s.h2}>4. Third-Party Services</h2>
      <p style={s.p}>We use Supabase (database/auth), Vercel (hosting), and optionally Mixpanel (analytics, anonymized). No health data is shared with these services beyond operational requirements.</p>
      <h2 style={s.h2}>5. Your Rights</h2>
      <p style={s.p}>You have the right to access, export, or delete your data at any time. Email us at privacy@ultimate.app to exercise these rights.</p>
      <h2 style={s.h2}>6. Contact</h2>
      <p style={s.p}>Questions? Email privacy@ultimate.app. We respond within 48 hours.</p>
    </div>
  );
}
