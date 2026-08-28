/**
 * StaticAvatar — morphs emoji/stage based on health score
 * Props: weight (kg), targetWeight (kg), workoutsThisWeek, sleepAvg (hrs)
 * Replace emojis with actual SVG/3D model in Week 5+
 */
import { useMemo } from 'react';

function getHealthScore({ weight, targetWeight, workoutsThisWeek = 0, sleepAvg = 7 }) {
  let score = 50;
  if (targetWeight && weight) {
    const diff = Math.abs(weight - targetWeight);
    const pct = diff / targetWeight;
    if (pct < 0.02) score += 30;
    else if (pct < 0.05) score += 20;
    else if (pct < 0.10) score += 10;
    else score -= 10;
  }
  score += Math.min(workoutsThisWeek * 5, 20);
  if (sleepAvg >= 7 && sleepAvg <= 9) score += 10;
  else if (sleepAvg < 6) score -= 10;
  return Math.max(0, Math.min(100, score));
}

const AVATAR_STAGES = [
  { min: 0,  max: 20, emoji: '😴', label: 'Just Starting',    color: '#6b7280', tip: 'Log your first data point to get going!' },
  { min: 20, max: 40, emoji: '🚶', label: 'Building Habits',  color: '#f59e0b', tip: 'Log workouts to level up your avatar.' },
  { min: 40, max: 60, emoji: '🏃', label: 'Gaining Momentum', color: '#3b82f6', tip: "You're making progress! Keep it up." },
  { min: 60, max: 80, emoji: '💪', label: 'In the Zone',      color: '#10b981', tip: 'Amazing consistency. Stay the course.' },
  { min: 80, max: 101,emoji: '🦸', label: 'Peak Form',        color: '#a78bfa', tip: "You're at your best. Maintain it!" },
];

export default function StaticAvatar({ weight, targetWeight, workoutsThisWeek = 0, sleepAvg = 7, size = 'md' }) {
  const score = useMemo(() =>
    getHealthScore({ weight, targetWeight, workoutsThisWeek, sleepAvg }),
    [weight, targetWeight, workoutsThisWeek, sleepAvg]
  );

  const stage = AVATAR_STAGES.find(s => score >= s.min && score < s.max) || AVATAR_STAGES[0];
  const sizes = { sm: { card: 120, emoji: 36, label: 11 }, md: { card: 180, emoji: 56, label: 13 }, lg: { card: 240, emoji: 80, label: 15 } };
  const sz = sizes[size] || sizes.md;

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      background: '#13131a', border: `2px solid ${stage.color}33`,
      borderRadius: 20, padding: sz.card * 0.15, width: sz.card,
      boxShadow: `0 0 32px ${stage.color}22`, transition: 'all 0.5s ease'
    }}>
      {/* Score ring */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <svg width={sz.card * 0.55} height={sz.card * 0.55} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#2a2a3a" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none" stroke={stage.color} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - score / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">{score}</text>
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', fontSize: sz.emoji, lineHeight: 1 }}>
          {stage.emoji}
        </div>
      </div>

      <div style={{ fontSize: sz.label, fontWeight: 600, color: stage.color, marginBottom: 4 }}>{stage.label}</div>
      <div style={{ fontSize: sz.label - 2, color: '#6b7280', textAlign: 'center', lineHeight: 1.4, maxWidth: sz.card - 20 }}>{stage.tip}</div>

      {/* Progress bar */}
      <div style={{ width: '90%', height: 4, background: '#2a2a3a', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: stage.color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}
