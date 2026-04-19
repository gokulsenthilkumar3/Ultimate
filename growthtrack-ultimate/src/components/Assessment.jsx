import React, { useState } from 'react';
import { HEALTH_QA } from '../data/userData';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function Assessment() {
  const [expandedIndex, setExpandedIndex] = useState(0);

  return (
    <div className="fade-in">
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Health Assessment</h2>
          <p className="text-secondary">Raw intake data from 11 strategic diagnostic rounds.</p>
        </div>
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search records..." 
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {HEALTH_QA.map((round, idx) => (
            <div 
              key={idx} 
              className="glass-card" 
              style={{ 
                padding: 0, 
                borderColor: expandedIndex === idx ? 'var(--border-strong)' : 'var(--border)',
                background: expandedIndex === idx ? 'rgba(255,255,255,0.03)' : 'var(--bg-card)'
              }}
            >
              <button 
                onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
                style={{ 
                  width: '100%', 
                  background: 'none', 
                  border: 'none', 
                  padding: '1.25rem 1.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: round.color + '22', color: round.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800, border: `1px solid ${round.color}44`
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: expandedIndex === idx ? '#fff' : 'var(--text-secondary)' }}>{round.round}</h3>
                    <p className="label-caps" style={{ fontSize: '0.6rem' }}>{round.items.length} Data Points</p>
                  </div>
                </div>
                {expandedIndex === idx ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
              </button>

              {expandedIndex === idx && (
                <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--border-light)', animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    {round.items.map((item, i) => (
                      <div key={i} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                        <p className="label-caps" style={{ color: round.color, marginBottom: '0.25rem' }}>Question</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-1)', marginBottom: '0.75rem', fontWeight: 500 }}>{item.q}</p>
                        <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '0.25rem' }}>Response</p>
                        <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
