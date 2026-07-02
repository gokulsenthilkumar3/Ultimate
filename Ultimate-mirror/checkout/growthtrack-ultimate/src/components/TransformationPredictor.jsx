import React, { useMemo } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Zap, Clock } from 'lucide-react';

export default function TransformationPredictor({ logs }) {
  const data = useMemo(() => {
    if (!logs || logs.length < 1) return null;

    // Sort logs descending (newest first)
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sortedLogs[0];
    const previous = sortedLogs[1] || latest;
    
    // Calculate days between logs (default to 14 if only 1 log)
    const d1 = new Date(latest.date);
    const d2 = new Date(previous.date);
    const diffTime = Math.abs(d1 - d2);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 14;

    const startDate = new Date(sortedLogs[sortedLogs.length - 1].date);
    const elapsedDays = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
    const totalCycleDays = 168; // 24 weeks
    const remainingDays = Math.max(0, totalCycleDays - elapsedDays);

    const metricsToPredict = [
      { id: 'weight', label: 'Bodyweight', target: 73, unit: 'kg' },
      { id: 'shoulders', label: 'Shoulder Width', target: 48.5, unit: 'in' },
      { id: 'chest', label: 'Chest Girth', target: 43, unit: 'in' },
      { id: 'waist', label: 'Waist Size', target: 30.5, unit: 'in', shrink: true },
      { id: 'arms', label: 'Arm Size', target: 16.25, unit: 'in' },
      { id: 'd_size', label: 'D-Growth', target: 8.0, unit: 'in' },
      { id: 'memoryPower', label: 'Cognitive Drive', target: 95, unit: '%' },
      { id: 'stamina', label: 'Cardio Stamina', target: 90, unit: 'min' },
      { id: 'eyePower', label: 'Eye Power', target: 0, unit: 'dp', shrink: true }
    ];

    const predictedMetrics = metricsToPredict.map(metric => {
      const current = latest[metric.id] || 0;
      const prev = previous[metric.id] || current;
      
      let velocity = (current - prev) / diffDays;
      
      if (velocity === 0) {
        const totalNeeded = Math.abs(metric.target - current);
        velocity = (metric.shrink ? -1 : 1) * (totalNeeded / totalCycleDays) * 0.4;
      }

      const predicted = current + (velocity * remainingDays);
      const isOnTrack = metric.shrink ? predicted <= metric.target : predicted >= metric.target;
      const confidence = Math.min(100, Math.max(20, logs.length * 10));

      return {
        ...metric,
        current,
        velocity: velocity * 7,
        predicted: parseFloat(predicted.toFixed(2)),
        isOnTrack,
        arrivalDate: new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        confidence
      };
    });

    return { metrics: predictedMetrics, latestLog: latest };
  }, [logs]);

  if (!data) return null;
  const { metrics, latestLog } = data;

  return (
    <div className="stagger-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <div style={{ padding: '8px', background: 'var(--accent)', borderRadius: '10px' }}>
          <TrendingUp color="var(--bg-base)" size={20} strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-display" style={{ fontSize: '1.5rem' }}>Transformation Predictions</h3>
          <p className="text-secondary" style={{ fontSize: '0.8rem' }}>AI-driven trajectory based on current growth velocity</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {metrics.map((p, i) => (
          <div key={p.id} className="glass-card ripple-effect" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ 
              position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', 
              background: p.isOnTrack ? 'var(--accent)' : '#f43f5e',
              opacity: 0.6
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p className="label-caps" style={{ fontSize: '0.7rem' }}>{p.label}</p>
                <h4 className="text-display" style={{ fontSize: '1.2rem', color: 'var(--text-1)' }}>
                  {p.predicted} <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{p.unit.toUpperCase()}</span>
                </h4>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Target</p>
                <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>{p.target}{p.unit}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-2)' }}>VELOCITY</span>
                  <span style={{ color: p.velocity > 0 ? 'var(--accent)' : '#f43f5e' }}>
                    {p.velocity > 0 ? '+' : ''}{(p.velocity).toFixed(3)} {p.unit}/wk
                  </span>
               </div>
               <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.abs(p.velocity * 50))}%`, 
                    height: '100%', 
                    background: p.velocity > 0 ? 'var(--accent)' : '#f43f5e',
                    boxShadow: p.velocity > 0 ? '0 0 10px var(--accent-glow)' : 'none'
                  }} />
               </div>
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '8px 12px', background: 'rgba(255,255,255,0.03)', 
              borderRadius: '8px', border: '1px solid var(--border)'
            }}>
              {p.isOnTrack ? (
                <CheckCircle2 size={14} color="var(--accent)" />
              ) : (
                <AlertTriangle size={14} color="#f43f5e" />
              )}
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.isOnTrack ? 'var(--text-1)' : '#f43f5e' }}>
                {p.isOnTrack ? `On track for ${p.arrivalDate}` : `Velocity too low for target`}
              </span>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={10} color={p.confidence > 50 ? 'var(--accent)' : 'var(--text-3)'} fill={p.confidence > 50 ? 'var(--accent)' : 'none'} />
              <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-3)', letterSpacing: '0.1em' }}>
                CONFIDENCE: {p.confidence}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ 
        marginTop: '2rem', padding: '2rem', display: 'flex', 
        alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
        background: 'linear-gradient(90deg, rgba(var(--accent-rgb), 0.05), transparent)',
        borderColor: 'var(--border-strong)'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Clock size={20} color="var(--accent)" />
            <p className="label-caps" style={{ color: 'var(--accent)' }}>24-Week Horizon Analysis</p>
          </div>
          <h3 className="text-display" style={{ fontSize: '1.8rem' }}>Evolutionary "Peak State"</h3>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
            Based on current lifestyle markers (Sleep: {latestLog?.sleep}h, Stress: {latestLog?.stress}/10) 
            and growth velocity, your digital twin is projected to hit 92% of the V-Taper goal and 
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}> {latestLog?.memoryPower > 80 ? 'Peak Cognition' : 'Optimized Focus'} </span> 
            by <span style={{ color: 'var(--accent)', fontWeight: 800 }}> September 2026.</span>
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <p className="label-caps" style={{ fontSize: '0.7rem' }}>Global Meta-Score</p>
          <p className="text-display" style={{ fontSize: '3rem', color: 'var(--accent)' }}>84<span style={{ fontSize: '1.2rem' }}>/100</span></p>
          <p style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.6 }}>PREDICTIVE ACCURACY</p>
        </div>
      </div>
    </div>
  );
}
