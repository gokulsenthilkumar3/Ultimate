import React from 'react';
import { useUserStore } from '../store/userStore';
import { useComputedMetrics } from '../hooks/useComputedMetrics';

export default function Overview({ user, updateField }) {
  const metrics = useComputedMetrics();
  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Weight', value: `${user.weight ?? '—'} kg` },
          { label: 'Body Fat', value: `${user.bodyFat ?? '—'}%` },
          { label: 'BMI', value: metrics.bmi ?? '—' },
          { label: 'Health Score', value: `${metrics.healthScore}/100` },
          { label: 'TDEE', value: metrics.tdee ? `${metrics.tdee} kcal` : '—' },
          { label: 'Hydration', value: `${metrics.hydrationPct}%` },
          { label: 'Workout Streak', value: `${metrics.workoutStreak} days` },
        ].map((item) => (
          <div key={item.label} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '10px', padding: '1rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{item.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
