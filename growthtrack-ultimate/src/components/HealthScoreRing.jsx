import React, { useMemo } from 'react';
import useStore from '../store/useStore';

export default function HealthScoreRing({ size = 36, strokeWidth = 3.5 }) {
  const user = useStore(s => s.user);
  const metric_logs = useStore(s => s.metric_logs);
  const timesheet = useStore(s => s.timesheet);

  // Derive score (0-100)
  const score = useMemo(() => {
    // Start with a base of 60 to make it realistic
    let val = 60;
    
    // Add points for recent tasks done
    const completedTasks = user?.tasks?.completed?.length || 0;
    val += Math.min(15, completedTasks);

    // Add points for timesheet sessions
    const sessions = timesheet?.sessions?.length || 0;
    val += Math.min(15, sessions);

    // Add points for logged metrics
    const logs = metric_logs?.length || 0;
    val += Math.min(10, logs);
    
    return Math.min(100, Math.round(val));
  }, [user, metric_logs, timesheet]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'var(--danger)';
  if (score >= 40) color = 'var(--warning)';
  if (score >= 70) color = 'var(--success)';
  if (score >= 90) color = 'var(--info)';

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`Health Score: ${score}/100`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32 + 'px', fontWeight: 800, color: 'var(--text-1)',
        fontFamily: 'var(--font-display)'
      }}>
        {score}
      </div>
    </div>
  );
}
