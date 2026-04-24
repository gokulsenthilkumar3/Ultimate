import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Droplets, Plus, Minus, Award } from 'lucide-react';

export default function HydrationTracker({ user, setUser }) {
  const hydration = user?.hydration || { current: 0, goal: 3000, logs: [] };
  const { current, goal, logs } = hydration;
  const pct = Math.min(Math.round((current / goal) * 100), 100);

  const addWater = (amount) => {
    const newCurrent = Math.max(0, current + amount);
    setUser({ ...user, hydration: { ...hydration, current: newCurrent } });
  };

  const pieData = [
    { name: 'Completed', value: current },
    { name: 'Remaining', value: Math.max(0, goal - current) },
  ];
  const COLORS = ['var(--accent)', 'var(--bg-elevated)'];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Hydration</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <Droplets size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Hydration Tracker
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Monitor your daily water intake and stay healthy</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Water Bottle Visual */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{
            position: 'relative', width: '100px', height: '200px',
            border: '3px solid var(--accent)', borderRadius: '0 0 24px 24px',
            borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
            overflow: 'hidden', background: 'var(--bg-elevated)',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%',
              height: `${pct}%`, background: 'var(--accent)', opacity: 0.3,
              transition: 'height 0.8s var(--ease)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-1)',
              fontFamily: 'var(--font-display)',
            }}>
              {pct}%
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
            {current}<span style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 500 }}> ml</span>
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Goal: {goal} ml</p>
        </div>

        {/* Quick Add */}
        <div className="glass-card">
          <span className="card-title">Quick Add</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.85rem' }}>
            {[250, 500, 750, 1000].map(amount => (
              <button key={amount} onClick={() => addWater(amount)} className="btn-ghost" style={{
                padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-1)' }}>+{amount}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>ml</span>
              </button>
            ))}
          </div>
          <div style={{
            marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <button onClick={() => addWater(-100)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '4px', display: 'flex' }}>
              <Minus size={20} />
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Adjust (-100ml)</span>
            <button onClick={() => addWater(100)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '4px', display: 'flex' }}>
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Progress Donut */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="card-title" style={{ alignSelf: 'flex-start' }}>Progress Summary</span>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} innerRadius={55} outerRadius={72} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={i === 0 ? '#0ea5e9' : 'var(--bg-elevated)'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Award size={28} color="var(--warning)" />
            <div>
              <p className="label-caps">Hydration Streak</p>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>
                {user?.hydrationStreak || 0} Days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
