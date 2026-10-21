import React from 'react';
import { COLORS } from '../constants';

export default function Landing({ onJoinBeta, onLogin }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-1)',
      color: 'var(--text-1)',
      fontFamily: 'var(--font-primary)'
    }}>
      <header style={{
        padding: '24px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.03em' }}>
          GrowthTrack<span style={{ color: COLORS.ACCENT_PRIMARY }}>.</span>
        </h1>
        <div>
          <button onClick={onLogin} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-2)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginRight: '24px'
          }}>Log in</button>
          <button onClick={onJoinBeta} style={{
            background: 'var(--text-1)',
            color: 'var(--bg-1)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>Join Beta</button>
        </div>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          zIndex: 0
        }} />
        
        <div style={{ zIndex: 1, maxWidth: '800px' }}>
          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '24px',
            letterSpacing: '-0.04em'
          }}>
            Your Digital Self,<br/>
            <span style={{ color: COLORS.ACCENT_PRIMARY }}>Evolving in Real-Time.</span>
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-2)',
            marginBottom: '48px',
            maxWidth: '600px',
            margin: '0 auto 48px auto',
            lineHeight: 1.6
          }}>
            Connect your health data, track your habits, and watch your 3D avatar morph as you make real-world progress. The ultimate quantified-self dashboard.
          </p>
          <button onClick={onJoinBeta} style={{
            background: `linear-gradient(135deg, ${COLORS.ACCENT_PRIMARY}, #818cf8)`,
            color: '#fff',
            border: 'none',
            padding: '16px 48px',
            borderRadius: '32px',
            fontSize: '1.2rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 8px 32px ${COLORS.ACCENT_PRIMARY}40`,
            transition: 'transform 0.2s',
            letterSpacing: '-0.01em'
          }}>
            Start Your Journey
          </button>
        </div>
      </main>
    </div>
  );
}
