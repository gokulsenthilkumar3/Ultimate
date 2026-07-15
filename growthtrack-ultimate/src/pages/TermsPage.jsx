export default function TermsPage() {
  const s = {
    page: { fontFamily: "'Inter', sans-serif", background: '#0a0a0f', color: '#d1d5db', minHeight: '100vh', padding: '60px 24px', maxWidth: 720, margin: '0 auto' },
    h1: { fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 8 },
    date: { color: '#6b7280', fontSize: 14, marginBottom: 40 },
    h2: { fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 36, marginBottom: 12 },
    p: { lineHeight: 1.7, marginBottom: 16 },
  };
  return (
    <div style={s.page}>
      <h1 style={s.h1}>Terms of Service</h1>
      <div style={s.date}>Last updated: July 16, 2026</div>
      <h2 style={s.h2}>1. Acceptance</h2>
      <p style={s.p}>By using Ultimate, you agree to these terms. If you do not agree, do not use the service.</p>
      <h2 style={s.h2}>2. Beta Service</h2>
      <p style={s.p}>Ultimate is currently in beta. Features may change, data may be reset during major updates (we will notify you), and uptime is not guaranteed during this phase.</p>
      <h2 style={s.h2}>3. User Responsibilities</h2>
      <p style={s.p}>You are responsible for maintaining the security of your account. Do not share your password. Health data entered is your responsibility — Ultimate is not a medical device and does not provide medical advice.</p>
      <h2 style={s.h2}>4. Prohibited Use</h2>
      <p style={s.p}>Do not use Ultimate to store sensitive medical records, attempt to reverse-engineer the platform, or use automated bots to scrape data.</p>
      <h2 style={s.h2}>5. Limitation of Liability</h2>
      <p style={s.p}>Ultimate is provided "as is." We are not liable for health decisions made based on app data. Consult a healthcare professional for medical advice.</p>
      <h2 style={s.h2}>6. Contact</h2>
      <p style={s.p}>Legal questions: legal@ultimate.app</p>
    </div>
  );
}
