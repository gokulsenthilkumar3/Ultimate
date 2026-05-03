import React from 'react';
import { Plus } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, ctaLabel, onAction }) {
  return (
    <div className="glass-card fade-in" style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '4rem 2rem', textAlign: 'center', minHeight: '300px',
      border: '1px dashed var(--border-strong)', background: 'var(--bg-elevated)'
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        {Icon && <Icon size={32} strokeWidth={1.5} />}
      </div>
      
      <h3 className="text-display" style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-1)' }}>
        {title}
      </h3>
      
      <p className="text-secondary" style={{ maxWidth: '400px', marginBottom: '2rem', lineHeight: 1.6 }}>
        {description}
      </p>

      {ctaLabel && onAction && (
        <button className="btn-primary" onClick={onAction}>
          <Plus size={16} /> {ctaLabel}
        </button>
      )}
    </div>
  );
}
