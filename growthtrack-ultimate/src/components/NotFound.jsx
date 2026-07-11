import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Zap } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const glitchRef = useRef(null);

  // Glitch animation loop
  useEffect(() => {
    const el = glitchRef.current;
    if (!el) return;
    let raf;
    let tick = 0;
    const glitchFrames = [
      () => { el.style.textShadow = `4px 0 0 #f87171, -4px 0 0 #60a5fa`; el.style.transform = 'skewX(-2deg)'; },
      () => { el.style.textShadow = `-3px 0 0 #34d399, 3px 0 0 #f59e0b`; el.style.transform = 'skewX(1deg) translateX(2px)'; },
      () => { el.style.textShadow = `none`; el.style.transform = 'none'; },
    ];

    const run = () => {
      tick++;
      // Trigger glitch every ~90 frames, hold for 4 frames
      if (tick % 90 < 4) {
        glitchFrames[tick % 3]();
      } else {
        el.style.textShadow = 'none';
        el.style.transform = 'none';
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '520px' }}>
        {/* 404 number with glitch effect */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <div
            ref={glitchRef}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(7rem, 20vw, 12rem)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.05em',
              color: 'var(--text-1)',
              transition: 'text-shadow 0.05s, transform 0.05s',
              userSelect: 'none',
            }}
          >
            404
          </div>

          {/* Scan line overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
            mixBlendMode: 'multiply',
          }} />
        </div>

        {/* Glass card container */}
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '4px 14px', borderRadius: '99px',
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.3)',
            color: '#f87171', fontSize: '0.68rem', fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: '1.25rem',
          }}>
            <Zap size={11} />
            PAGE NOT FOUND
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1.2rem, 3vw, 1.75rem)',
            color: 'var(--text-1)', marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}>
            This route doesn't exist
          </h1>

          <p style={{
            color: 'var(--text-3)', fontSize: '0.9rem',
            lineHeight: 1.6, marginBottom: '2rem',
          }}>
            The page you're looking for has been moved, deleted, or never existed.
            Head back to the dashboard to continue.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-2)', fontSize: '0.88rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            <button
              onClick={() => navigate('/overview')}
              className="btn-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-pill)',
                fontSize: '0.88rem', fontWeight: 700,
              }}
            >
              <Home size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Decorative bottom tag */}
        <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'monospace', opacity: 0.6 }}>
          GrowthTrack Ultimate · HTTP 404 · Route not registered
        </p>
      </div>
    </div>
  );
}
