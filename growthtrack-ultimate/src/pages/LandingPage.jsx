import { Link } from 'react-router-dom';
import MarketingCursor from '../components/MarketingCursor';

const pillars = [
  'Health, habits, and goals in one place',
  'Minimal layout with faster daily actions',
  'Private by default, synced when you want',
];

const stats = [
  { value: '01', label: 'Login first' },
  { value: '40+', label: 'Modules' },
  { value: '1', label: 'Daily home' },
];

export default function LandingPage() {
  return (
    <main className="auth-shell">
      <MarketingCursor />
      <div className="auth-shell__glow auth-shell__glow--one" />
      <div className="auth-shell__glow auth-shell__glow--two" />

      <section className="auth-card auth-landing">
        <div className="auth-brand">
          <div className="auth-brand__mark">⚡</div>
          <div>
            <div className="auth-brand__name">GrowthTrack</div>
            <div className="auth-brand__sub">A minimal digital twin dashboard</div>
          </div>
        </div>

        <div className="auth-hero">
          <p className="eyebrow">Private progress, designed calmly</p>
          <h1>See your life. Track less noise.</h1>
          <p className="auth-copy">
            A cleaner way to manage fitness, habits, tasks, finance, and body progress without the clutter.
          </p>
        </div>

        <div className="auth-actions">
          <Link to="/login" className="btn btn--primary" data-magnetic>Login</Link>
          <a href="#why" className="btn btn--ghost" data-magnetic>Why it feels better</a>
        </div>

        <div className="auth-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="auth-stat">
              <div className="auth-stat__value">{stat.value}</div>
              <div className="auth-stat__label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="auth-pill-list" id="why">
          {pillars.map((item) => (
            <div key={item} className="auth-pill">{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
