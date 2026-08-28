import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton-pulse" style={{ width: '150px', height: '14px', borderRadius: '4px', marginBottom: '1rem' }} />
          <div className="skeleton-pulse" style={{ width: '60%', height: '40px', borderRadius: '8px', marginBottom: '0.5rem' }} />
          <div className="skeleton-pulse" style={{ width: '40%', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-pulse" style={{ width: '120px', height: '80px', borderRadius: '16px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card" style={{ padding: '1.75rem', height: '160px' }}>
            <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '12px', marginBottom: '1rem' }} />
            <div className="skeleton-pulse" style={{ width: '80px', height: '12px', borderRadius: '4px', marginBottom: '0.5rem' }} />
            <div className="skeleton-pulse" style={{ width: '120px', height: '32px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card skeleton-pulse" style={{ height: '300px', borderRadius: '24px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card skeleton-pulse" style={{ flex: 1, borderRadius: '24px' }} />
          <div className="glass-card skeleton-pulse" style={{ height: '120px', borderRadius: '24px' }} />
        </div>
      </div>
    </div>
  );
}
