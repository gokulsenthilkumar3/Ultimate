import React from 'react';
import {
  Zap, Heart, Shield, TrendingUp, Brain, Eye, Activity,
  Dumbbell, Moon, Droplets, Target, Star, Code, Sparkles,
  ChevronRight, ExternalLink
} from 'lucide-react';

const VERSION = '2.0.0';
const BUILD_DATE = 'April 2026';

const FEATURES = [
  { icon: Activity, title: 'Digital Twin Engine', desc: 'Real-time body metrics tracking with 3D humanoid visualisation and data-driven morphing.' },
  { icon: Dumbbell, title: 'Training Intelligence', desc: 'Hypertrophy-focused training plans with progressive overload tracking and strength baselines.' },
  { icon: Brain, title: 'Health Analytics', desc: 'Comprehensive health scoring across 12+ body systems with actionable medical insights.' },
  { icon: Moon, title: 'Sleep Architecture', desc: 'Sleep debt monitoring, circadian rhythm analysis, and recovery optimisation protocols.' },
  { icon: Eye, title: 'Holistic Tracking', desc: 'Eye power, flexibility, gut health, skin glow, and 13+ holistic body metrics in one place.' },
  { icon: Target, title: 'Goal Engine', desc: 'Multi-dimensional goal tracking with deadline-aware progress bars and habit streaks.' },
  { icon: Shield, title: 'Medical Dashboard', desc: 'Blood work tracker, test reminders, and priority-flagged medical recommendations.' },
  { icon: TrendingUp, title: 'Finance & Budget', desc: 'INR-based income, expense, and investment tracking with visual allocation charts.' },
];

const TECH_STACK = [
  { name: 'React 19', desc: 'UI Framework' },
  { name: 'Vite 8', desc: 'Build Tool' },
  { name: 'Three.js + R3F', desc: '3D Engine' },
  { name: 'Recharts', desc: 'Visualisations' },
  { name: 'Lucide Icons', desc: 'Iconography' },
  { name: 'Zustand', desc: 'State Management' },
];

const PRINCIPLES = [
  { emoji: '🧘', title: 'Calm Design', desc: 'Soft glassmorphism, gentle gradients, and breathing space for a focused experience.' },
  { emoji: '🌗', title: 'Dual Themes', desc: 'Meticulously crafted light and dark modes with 5 accent colour palettes.' },
  { emoji: '📱', title: 'Fully Responsive', desc: 'Adapts beautifully from 4K monitors to mobile screens.' },
  { emoji: '♿', title: 'Accessible', desc: 'Semantic HTML, ARIA labels, keyboard navigation, and readable contrast ratios.' },
];

export default function About() {
  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center', padding: '3rem 1.5rem 2.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '72px', height: '72px', borderRadius: 'var(--radius-lg)',
          background: 'var(--accent)',
          boxShadow: '0 8px 32px var(--accent-soft)',
          marginBottom: '1.5rem',
        }}>
          <Zap size={36} color="#fff" strokeWidth={2.5} />
        </div>
        <h1 className="text-display" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <span className="gradient-text">Ultimate</span>
        </h1>
        <p style={{
          color: 'var(--text-2)', fontSize: '1.05rem', maxWidth: '540px',
          margin: '0 auto 1.25rem', lineHeight: 1.7,
        }}>
          A premium, self-hosted digital twin engine for tracking your complete physical and
          mental transformation — from body composition to financial health.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em',
          }}>
            v{VERSION}
          </span>
          <span style={{
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-elevated)', color: 'var(--text-3)',
            fontSize: '0.75rem', fontWeight: 600,
          }}>
            {BUILD_DATE}
          </span>
          <span style={{
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)',
            background: 'rgba(52,211,153,0.12)', color: 'var(--success)',
            fontSize: '0.75rem', fontWeight: 700,
          }}>
            <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Production Ready
          </span>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.3rem' }}>Capabilities</p>
          <h2 className="text-display" style={{ fontSize: '1.5rem' }}>Everything You Need</h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="glass-card" style={{
                padding: '1.35rem',
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} color="var(--accent)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Design Principles */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.3rem' }}>Philosophy</p>
          <h2 className="text-display" style={{ fontSize: '1.5rem' }}>Design Principles</h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {PRINCIPLES.map((p, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }}>{p.emoji}</span>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.35rem' }}>{p.title}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="glass-card" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Code size={18} color="var(--accent)" />
          <span className="card-title" style={{ margin: 0 }}>Technology Stack</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}>
          {TECH_STACK.map((t, i) => (
            <div key={i} style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{t.name}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credits / Footer */}
      <div style={{
        textAlign: 'center', padding: '2rem 1rem',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '0.75rem',
        }}>
          <Heart size={16} color="var(--danger)" fill="var(--danger)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)' }}>
            Built with passion
          </span>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', lineHeight: 1.7 }}>
          Designed & developed as a personal transformation companion.
          <br />
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Ultimate</span> — Your complete digital twin ecosystem.
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: '0.65rem', marginTop: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          © {new Date().getFullYear()} Ultimate Digital Twin Engine · v{VERSION}
        </p>
      </div>
    </div>
  );
}
