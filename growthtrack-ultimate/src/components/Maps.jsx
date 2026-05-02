import React from 'react';
import { Map, Navigation, Compass } from 'lucide-react';

export default function Maps() {
  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Global Positioning</p>
        <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Earth & Maps</h2>
        <p className="text-secondary">Explore the globe via Google Earth integration.</p>
      </div>

      <div className="glass-card" style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Compass size={64} color="var(--accent)" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 20px var(--accent-glow))' }} />
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Global Telemetry Offline</h3>
        <p style={{ color: 'var(--text-2)', maxWidth: '500px', marginBottom: '2rem', lineHeight: 1.6 }}>
          Direct iframe embedding for Google Earth is restricted by X-Frame-Options.
          Launch the portal in a secure window to access satellite feeds.
        </p>
        <a 
          href="https://earth.google.com/web/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn-primary" 
          style={{ textDecoration: 'none', padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <Map size={20} /> LAUNCH EARTH PORTAL
        </a>
      </div>
    </div>
  );
}
