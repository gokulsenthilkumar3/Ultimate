import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Brain, Smile, Zap, Heart, Moon, Sun, MessageCircle, Sparkles } from 'lucide-react';
import useStore, { selectWellnessData, selectUpdateWellnessData } from '../store/useStore';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MindWellness({ user }) {
  const storedData = useStore(selectWellnessData);
  const updateWellness = useStore(selectUpdateWellnessData);

  const data = storedData || {
    moodScore: 7, stressLevel: 4, sleepHours: 7.5, meditationMinutes: 15,
  };

  // Derive mood history from actual check-in logs, not hardcoded fallback
  const moodHistory = useMemo(() => {
    const checkIns = user?.checkIns || [];
    if (!checkIns.length) return [];
    return [...checkIns]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map(ci => ({
        day: DAY_LABELS[new Date(ci.date).getDay()],
        score: Math.round((ci.mood / 4) * 10), // mood 0-4 index → 0-10 scale
        date: ci.date,
      }));
  }, [user?.checkIns]);

  const handleUpdate = (field, value) => {
    updateWellness({ ...data, [field]: value });
  };

  const statCards = useMemo(() => [
    { label: 'Mood Score', value: `${data.moodScore}/10`, icon: Smile, color: 'var(--accent)' },
    { label: 'Stress Level', value: `${data.stressLevel}/10`, icon: Zap, color: 'var(--danger)' },
    { label: 'Sleep', value: `${data.sleepHours}h`, icon: Moon, color: 'var(--info)' },
    { label: 'Meditation', value: `${data.meditationMinutes}m`, icon: Sparkles, color: 'var(--success)' },
  ], [data]);

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Wellness"
        icon={<Brain size={24} />}
        title="Mind & Wellness"
        subtitle="Holistic mental health and cognitive performance tracking."
      />

      <div className="stats-grid mb-lg">
        {statCards.map((c) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />
        ))}
      </div>

      <div className="grid-2 mb-lg">
        <div className="glass-card">
          <div className="flex-between mb-md">
            <span className="card-title m-0">Mood Optimizer</span>
            <Smile size={20} color="var(--accent)" />
          </div>
          
          <div className="mb-lg">
            <div className="flex-between mb-xs">
              <span className="text-secondary text-sm">Daily Mood Score</span>
              <span className="text-display text-accent">{data.moodScore}/10</span>
            </div>
            <input 
              type="range" min="1" max="10" 
              value={data.moodScore} 
              onChange={e => handleUpdate('moodScore', +e.target.value)} 
              className="form-input w-full" 
            />
          </div>

          <div>
            <div className="flex-between mb-xs">
              <span className="text-secondary text-sm">Stress Intensity</span>
              <span className="text-display text-danger">{data.stressLevel}/10</span>
            </div>
            <input 
              type="range" min="1" max="10" 
              value={data.stressLevel} 
              onChange={e => handleUpdate('stressLevel', +e.target.value)} 
              className="form-input w-full" 
            />
          </div>
        </div>

        <div className="glass-card">
          <div className="flex-between mb-md">
            <span className="card-title m-0">Weekly Resonance</span>
            <Heart size={20} color="var(--danger)" />
          </div>
          {moodHistory.length === 0 ? (
            <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-3)' }}>
              <Smile size={28} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.8rem', textAlign: 'center' }}>Complete daily check-ins to build your mood history chart.</p>
            </div>
          ) : (
            <div style={{ height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodHistory}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <YAxis hide domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: 'var(--accent)', fontWeight: 800 }}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorMood)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid-3">
        <div className="glass-card flex-column gap-sm">
          <div className="flex-center-y gap-sm text-accent">
            <Sun size={18} />
            <span className="label-caps">Morning Ritual</span>
          </div>
          <p className="text-sm">Practice 5-min sunlight exposure and boxed breathing to reset cortisol.</p>
        </div>

        <div className="glass-card flex-column gap-sm">
          <div className="flex-center-y gap-sm text-success">
            <Sparkles size={18} />
            <span className="label-caps">Cognitive Edge</span>
          </div>
          <p className="text-sm">Deep work session completed: 90 mins. Focus stability at 85%.</p>
        </div>

        <div className="glass-card flex-column gap-sm">
          <div className="flex-center-y gap-sm text-info">
            <MessageCircle size={18} />
            <span className="label-caps">Daily Reflection</span>
          </div>
          <p className="text-sm">Log your thoughts to clear mental bandwidth for the next cycle.</p>
        </div>
      </div>
    </div>
  );
}
