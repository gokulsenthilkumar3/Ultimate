import React from 'react';
import { TRAINING_PLAN, NUTRITION } from '../data/userData';
import { Dumbbell, Utensils, Zap, Clock } from 'lucide-react';

export default function Training() {
  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Training Matrix</h2>
        <p className="text-secondary">Push/Pull/Legs protocol optimized for aesthetic hypertrophy.</p>
      </div>

      <div className="dashboard-grid">
        {/* Split Info */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <Dumbbell color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{TRAINING_PLAN.split}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{TRAINING_PLAN.scheduleNote}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             {['Push', 'Pull', 'Legs'].map(day => (
               <div key={day} style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                 <p className="label-caps" style={{ color: 'var(--accent-primary)', fontSize: '0.6rem' }}>Day</p>
                 <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{day}</p>
               </div>
             ))}
          </div>
        </div>

        {/* Priority Exercises */}
        {TRAINING_PLAN.priority_exercises.map((group, idx) => (
          <div key={idx} className="glass-card">
            <p className="label-caps" style={{ marginBottom: '1rem', color: 'var(--accent-secondary)' }}>{group.area}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {group.exercises.map((ex, i) => (
                <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>{ex.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{ex.sets}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{ex.type}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

