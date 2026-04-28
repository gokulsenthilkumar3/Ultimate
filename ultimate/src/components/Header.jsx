import React from 'react';

export default function Header({ user, theme, setTheme, palette, setPalette }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)', minHeight: '48px',
    }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>Growth</span>Track
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
