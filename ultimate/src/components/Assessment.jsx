import React from 'react';

function StubPanel({ title, children }) {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h2>
      {children || <p style={{ color: 'var(--text-muted)' }}>Module coming soon.</p>}
    </div>
  );
}

export default function Assessment() { return <StubPanel title="Assessment" />; }
