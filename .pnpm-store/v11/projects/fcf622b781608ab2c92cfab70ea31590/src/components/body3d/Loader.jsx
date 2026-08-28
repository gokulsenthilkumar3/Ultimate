import React from "react";
import { Html, useProgress } from "@react-three/drei";

// ── LOADER ──
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
        padding: '30px', background: 'rgba(0,0,0,0.85)', borderRadius: '30px',
        backdropFilter: 'blur(10px)', border: '1px solid var(--border-strong)',
        minWidth: '180px'
      }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" strokeWidth="5"
              strokeDasharray={`${progress * 2.83} 283`}
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translateY(-50%) translateX(-50%)',
            fontWeight: 900, color: 'var(--accent)', fontSize: '1.2rem'
          }}>
            {progress.toFixed(0)}%
          </div>
        </div>
        <div className="label-caps" style={{ color: 'var(--text-1)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>Bio-Scanning Twin</div>
      </div>
    </Html>
  );
}

export default Loader;
