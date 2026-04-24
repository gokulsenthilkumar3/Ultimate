import React, { useState } from 'react';
import { HEALTH_QA } from '../data/userData';
import { ChevronDown, ChevronUp, Search, ClipboardList } from 'lucide-react';

export default function Assessment({ user }) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = searchTerm
    ? HEALTH_QA.filter(r => r.round.toLowerCase().includes(searchTerm.toLowerCase()) || r.items.some(i => i.q.toLowerCase().includes(searchTerm.toLowerCase()) || i.a.toLowerCase().includes(searchTerm.toLowerCase())))
    : HEALTH_QA;

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Assessment</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <ClipboardList size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Health Assessment
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Raw intake data from {HEALTH_QA.length} strategic diagnostic rounds.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input type="text" placeholder="Search records..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input" style={{ paddingLeft: '36px', minWidth: '220px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {filtered.map((round, idx) => (
          <div key={idx} className="glass-card" style={{ padding: 0, borderColor: expandedIndex === idx ? 'var(--border-strong)' : 'var(--border)' }}>
            <button onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '1.15rem 1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: round.color + '18', color: round.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', fontWeight: 800, border: `1px solid ${round.color}33`,
                  flexShrink: 0,
                }}>{idx + 1}</div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: expandedIndex === idx ? 'var(--text-1)' : 'var(--text-2)' }}>{round.round}</h3>
                  <p className="label-caps" style={{ fontSize: '0.58rem', marginTop: '2px' }}>{round.items.length} Data Points</p>
                </div>
              </div>
              {expandedIndex === idx ? <ChevronUp size={18} color="var(--text-3)" /> : <ChevronDown size={18} color="var(--text-3)" />}
            </button>
            {expandedIndex === idx && (
              <div style={{ padding: '0 1.35rem 1.35rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
                  {round.items.map((item, i) => (
                    <div key={i} style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <p className="label-caps" style={{ color: round.color, marginBottom: '0.25rem' }}>Question</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-1)', marginBottom: '0.65rem', fontWeight: 500 }}>{item.q}</p>
                      <p className="label-caps" style={{ marginBottom: '0.2rem' }}>Response</p>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-1)', fontWeight: 700 }}>{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
