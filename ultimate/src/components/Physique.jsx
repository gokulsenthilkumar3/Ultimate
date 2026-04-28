import React from 'react';
import { useMetricSliders } from '../store/use3DStore.usage';

export default function Physique({ user }) {
  const { metrics, goalMetrics, setCurrentMetric, setGoalMetric, getDeltas } = useMetricSliders();
  const deltas = getDeltas();

  const fields = [
    { key: 'weight', label: 'Weight', unit: 'kg', min: 45, max: 130 },
    { key: 'bodyFat', label: 'Body Fat', unit: '%', min: 5, max: 40 },
    { key: 'chest', label: 'Chest', unit: 'cm', min: 80, max: 130 },
    { key: 'shoulders', label: 'Shoulders', unit: 'cm', min: 90, max: 140 },
    { key: 'waist', label: 'Waist', unit: 'cm', min: 65, max: 110 },
    { key: 'arms', label: 'Arms', unit: 'cm', min: 28, max: 55 },
    { key: 'thighs', label: 'Thighs', unit: 'cm', min: 45, max: 75 },
    { key: 'calves', label: 'Calves', unit: 'cm', min: 30, max: 50 },
    { key: 'neck', label: 'Neck', unit: 'cm', min: 32, max: 48 },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Blueprint</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {fields.map(({ key, label, unit, min, max }) => (
          <div key={key} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '8px', padding: '0.75rem 1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '0.75rem', color: deltas?.[key] > 0 ? 'var(--accent-green)' : deltas?.[key] < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {deltas?.[key] ? `${deltas[key] > 0 ? '+' : ''}${deltas[key]}${unit}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="range" min={min} max={max} step="0.1"
                value={metrics?.[key] ?? min}
                onChange={(e) => setCurrentMetric(key, parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent-cyan)' }}
              />
              <span style={{ fontSize: '0.8rem', minWidth: '50px', textAlign: 'right' }}>
                {metrics?.[key]?.toFixed(1) ?? '—'} {unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
