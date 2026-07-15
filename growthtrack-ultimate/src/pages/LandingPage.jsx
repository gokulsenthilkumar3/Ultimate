import { Link } from 'react-router-dom';

const features = [
  { icon: '🧬', title: 'Living Avatar', desc: 'Your 3D digital twin morphs as you hit fitness milestones.' },
  { icon: '📊', title: 'All Health Data', desc: 'Weight, sleep, workouts, nutrition — unified in one place.' },
  { icon: '🎯', title: 'Goal Tracking', desc: 'Set targets. Watch your avatar evolve as you progress.' },
  { icon: '🤖', title: 'AI Insights', desc: 'Personalized recommendations based on your trends.' },
  { icon: '🔒', title: 'Private by Default', desc: 'Your data stays yours. No selling, no ads, ever.' },
  { icon: '📱', title: 'Works Everywhere', desc: 'Web, iOS, Android. Your progress follows you.' },
];

const testimonials = [
  { name: 'Beta User #1', text: 'Finally an app that makes health data actually motivating.', role: 'Fitness enthusiast' },
  { name: 'Beta User #2', text: 'The avatar concept is genius. I check it every morning.', role: 'Software engineer' },
  { name: 'Beta User #3', text: 'Simple, clean, and actually works. 10/10.', role: 'Entrepreneur' },
];

export default function LandingPage() {
  const s = {
    page: { fontFamily: "'Inter', -apple-system, sans-serif", background: '#0a0a0f', color: '#fff', minHeight: '100vh' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid #1a1a2e', position: 'sticky', top: 0, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', zIndex: 100 },
    navLogo: { fontSize: 22, fontWeight: 700, color: '#fff' },
    navLinks: { display: 'flex', gap: 32, alignItems: 'center' },
    navLink: { color: '#9ca3af', fontSize: 14, textDecoration: 'none' },
    navCta: { background: '#7c3aed', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' },
    hero: { textAlign: 'center', padding: '100px 24px 80px', maxWidth: 760, margin: '0 auto' },
    badge: { display: 'inline-block', background: '#1e1b4b', color: '#a78bfa', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500, marginBottom: 24, border: '1px solid #312e81' },
    h1: { fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24 },
    gradient: { background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    sub: { fontSize: 20, color: '#9ca3af', lineHeight: 1.6, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' },
    ctaRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
    ctaPrimary: { background: '#7c3aed', color: '#fff', padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block' },
    ctaSecondary: { background: 'transparent', color: '#a78bfa', padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: '1px solid #4c1d95', display: 'inline-block' },
    avatarDemo: { margin: '80px auto', textAlign: 'center', maxWidth: 900, padding: '0 24px' },
    avatarRow: { display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginTop: 48 },
    avatarCard: { background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 20, padding: '32px 24px', width: 160, textAlign: 'center' },
    avatarFigure: { fontSize: 64, marginBottom: 12, display: 'block' },
    avatarLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    avatarState: { fontSize: 14, fontWeight: 600, color: '#a78bfa' },
    features: { maxWidth: 1100, margin: '0 auto', padding: '80px 24px' },
    featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 48 },
    featureCard: { background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 16, padding: 28 },
    featureIcon: { fontSize: 32, marginBottom: 16 },
    featureTitle: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
    featureDesc: { fontSize: 14, color: '#6b7280', lineHeight: 1.6 },
    sectionTitle: { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-1px' },
    sectionSub: { fontSize: 16, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
    testimonials: { maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' },
    testGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 48 },
    testCard: { background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 14, padding: 24 },
    testText: { fontSize: 15, color: '#d1d5db', lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' },
    testName: { fontSize: 13, fontWeight: 600, color: '#a78bfa' },
    testRole: { fontSize: 12, color: '#6b7280' },
    finalCta: { textAlign: 'center', padding: '60px 24px 100px', background: 'linear-gradient(180deg, transparent, #0d0d1a)' },
    footer: { borderTop: '1px solid #1a1a2e', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
    footerText: { color: '#6b7280', fontSize: 13 },
    footerLinks: { display: 'flex', gap: 24 },
    footerLink: { color: '#6b7280', fontSize: 13, textDecoration: 'none' },
  };

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navLogo}>⚡ Ultimate</div>
        <div style={s.navLinks}>
          <a href="#features" style={s.navLink}>Features</a>
          <a href="#how-it-works" style={s.navLink}>How it works</a>
          <Link to="/login" style={s.navLink}>Sign in</Link>
          <Link to="/login" style={s.navCta}>Start Free →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.badge}>🚀 Beta — Free Access for Early Users</div>
        <h1 style={s.h1}>
          Your <span style={s.gradient}>Digital Self</span>,<br />
          Evolving in Real-Time
        </h1>
        <p style={s.sub}>
          Track your health, fitness & growth — and watch your personal avatar transform as you hit milestones.
        </p>
        <div style={s.ctaRow}>
          <Link to="/login" style={s.ctaPrimary}>Join Beta — It's Free</Link>
          <a href="#how-it-works" style={s.ctaSecondary}>See how it works</a>
        </div>
      </section>

      {/* Avatar Demo */}
      <section style={s.avatarDemo} id="how-it-works">
        <h2 style={s.sectionTitle}>Watch Your Avatar Evolve</h2>
        <p style={s.sectionSub}>As you log data, your avatar reflects your real progress</p>
        <div style={s.avatarRow}>
          {[
            { emoji: '😴', label: 'Week 1', state: 'Just starting' },
            { emoji: '🚶', label: 'Week 4', state: 'Building habits' },
            { emoji: '🏃', label: 'Week 8', state: 'Gaining momentum' },
            { emoji: '💪', label: 'Week 12', state: 'Transformed' },
          ].map((a) => (
            <div key={a.label} style={s.avatarCard}>
              <span style={s.avatarFigure}>{a.emoji}</span>
              <div style={s.avatarLabel}>{a.label}</div>
              <div style={s.avatarState}>{a.state}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={s.features} id="features">
        <h2 style={s.sectionTitle}>Everything in One Place</h2>
        <p style={s.sectionSub}>No more switching between 10 different apps</p>
        <div style={s.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} style={s.featureCard}>
              <div style={s.featureIcon}>{f.icon}</div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={s.testimonials}>
        <h2 style={s.sectionTitle}>Early Users Love It</h2>
        <div style={s.testGrid}>
          {testimonials.map((t) => (
            <div key={t.name} style={s.testCard}>
              <p style={s.testText}>"{t.text}"</p>
              <div style={s.testName}>{t.name}</div>
              <div style={s.testRole}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={s.finalCta}>
        <h2 style={{ ...s.sectionTitle, marginBottom: 16 }}>Ready to Meet Your Digital Self?</h2>
        <p style={{ ...s.sectionSub, marginBottom: 36 }}>Free during beta. No credit card needed.</p>
        <Link to="/login" style={s.ctaPrimary}>Get Started Free →</Link>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerText}>© 2026 Ultimate. Made with ❤️ in India.</div>
        <div style={s.footerLinks}>
          <Link to="/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/terms" style={s.footerLink}>Terms of Service</Link>
          <a href="mailto:hello@ultimate.app" style={s.footerLink}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
