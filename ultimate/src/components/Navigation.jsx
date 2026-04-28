import React from 'react';

export default function Navigation({ navItems, activeTab, setActiveTab }) {
  return (
    <nav style={{
      display: 'flex', gap: '2px', padding: '0.25rem 0.5rem',
      overflowX: 'auto', borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
    }}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          style={{
            background: activeTab === item.id ? 'var(--accent-cyan)' : 'transparent',
            color: activeTab === item.id ? '#020307' : 'var(--text-muted)',
            border: 'none', padding: '6px 12px', borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            whiteSpace: 'nowrap', letterSpacing: '0.02em',
          }}
        >
          {item.label}
          {item.badge && (
            <span style={{
              marginLeft: '4px', fontSize: '0.6rem', padding: '1px 4px',
              borderRadius: '4px', background: activeTab === item.id ? '#020307' : 'var(--accent-cyan)',
              color: activeTab === item.id ? 'var(--accent-cyan)' : '#020307',
            }}>
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
