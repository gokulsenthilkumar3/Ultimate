export default function PrivacyPage() {
  const s = {
    page: { fontFamily: 'var(--font-body)', background: '#0a0a0f', color: '#d1d5db', minHeight: '100vh', padding: '60px 24px', maxWidth: 720, margin: '0 auto' },
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
      <p style={s.p}>We collect information you provide directly: email address, name, health metrics (weight, sleep, workouts), finance entries, and optional location points. We do not sell your data to third parties.</p>
      <h2 style={s.h2}>2. How We Use Your Data</h2>
      <p style={s.p}>Your data is used to provide your personal dashboard and avatar. Optional product analytics may be disabled in settings. The application stores data in its configured local or hosted database.</p>
      <h2 style={s.h2}>3. Data Security</h2>
      <p style={s.p}>Sessions use HttpOnly, SameSite cookies and CSRF protection. Production deployments must use HTTPS and encrypted database storage. You can request access, export, correction, or deletion of your data.</p>
      <h2 style={s.h2}>4. Third-Party Services</h2>
      <p style={s.p}>Depending on deployment configuration, the service may use a hosted database, error monitoring, payment processing, and external weather or media APIs. Only the data needed for that feature should be sent.</p>
      <h2 style={s.h2}>5. Your Rights</h2>
      <p style={s.p}>You may request access, correction, export, or deletion through the account owner or deployment administrator. Retention periods should be configured by the operator for the applicable jurisdiction.</p>
      <h2 style={s.h2}>6. Contact</h2>
      <p style={s.p}>Questions should be directed to the contact published by the deployment operator.</p>
    </div>
  );
}
