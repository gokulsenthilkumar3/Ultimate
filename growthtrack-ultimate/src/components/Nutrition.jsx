import React, { useState } from 'react';
import { NUTRITION as DEFAULT_NUTRITION } from '../data/userData';
import { Utensils, Clock, Plus, Trash2, Apple, Flame } from 'lucide-react';

export default function Nutrition({ user, setUser }) {
  const nutrition = user?.nutrition || DEFAULT_NUTRITION;
  const meals = user?.mealPlan || DEFAULT_NUTRITION.meals;
  const [mealLog, setMealLog] = useState(user?.mealLog || []);
  const [logForm, setLogForm] = useState({ name: '', calories: '', protein: '', time: '' });

  const updateMealLog = (newLog) => {
    setMealLog(newLog);
    setUser({ ...user, mealLog: newLog });
  };

  const addLog = () => {
    if (!logForm.name || !logForm.calories) return;
    const entry = { ...logForm, id: Date.now(), date: new Date().toISOString().slice(0, 10) };
    updateMealLog([...mealLog, entry]);
    setLogForm({ name: '', calories: '', protein: '', time: '' });
  };

  const removeLog = (id) => updateMealLog(mealLog.filter(l => l.id !== id));

  const today = new Date().toISOString().slice(0, 10);
  const todayLog = mealLog.filter(l => l.date === today);
  const consumedCal = todayLog.reduce((s, l) => s + Number(l.calories || 0), 0);
  const consumedPro = todayLog.reduce((s, l) => s + Number(l.protein || 0), 0);
  const targetCal = nutrition.surplus || nutrition.tdee || 2950;
  const targetPro = nutrition.protein || 170;

  const calPct = Math.min(100, Math.round((consumedCal / targetCal) * 100));
  const proPct = Math.min(100, Math.round((consumedPro / targetPro) * 100));

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Nutrition</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <Apple size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Fueling Strategy
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Hypertrophy-focused nutrition for Phase 1 Lean Bulk.</p>
      </div>

      {/* Daily Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Calories Progress */}
        <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p className="label-caps">Daily Calories</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: calPct >= 100 ? 'var(--success)' : 'var(--text-1)', lineHeight: 1.1, marginTop: '0.3rem' }}>
                {consumedCal}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 500 }}> / {targetCal}</span>
              </p>
            </div>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: `conic-gradient(var(--accent) ${calPct * 3.6}deg, var(--bg-elevated) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)',
              }}>
                {calPct}%
              </div>
            </div>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ width: `${calPct}%`, height: '100%', borderRadius: '3px', background: 'var(--accent)', transition: 'width 0.8s var(--ease)' }} />
          </div>
        </div>

        {/* Protein Progress */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p className="label-caps">Protein Target</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: proPct >= 100 ? 'var(--success)' : 'var(--text-1)', lineHeight: 1.1, marginTop: '0.3rem' }}>
                {consumedPro}g
                <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 500 }}> / {targetPro}g</span>
              </p>
            </div>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: `conic-gradient(var(--success) ${proPct * 3.6}deg, var(--bg-elevated) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 800, color: 'var(--success)',
              }}>
                {proPct}%
              </div>
            </div>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ width: `${proPct}%`, height: '100%', borderRadius: '3px', background: 'var(--success)', transition: 'width 0.8s var(--ease)' }} />
          </div>
        </div>

        {/* Macro Split */}
        <div className="glass-card">
          <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Macro Targets</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { label: 'Protein', value: `${nutrition.protein || 170}g`, color: '#10b981', pct: 30 },
              { label: 'Carbs', value: `${nutrition.carbs || 280}g`, color: '#0ea5e9', pct: 45 },
              { label: 'Fat', value: `${nutrition.fat || 90}g`, color: '#f59e0b', pct: 25 },
            ].map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)' }}>{m.label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: m.color }}>{m.value}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                  <div style={{ width: `${m.pct}%`, height: '100%', borderRadius: '2px', background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log Meal + Today's Log */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <span className="card-title">Log Meal</span>
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
            <input type="text" placeholder="Meal name" value={logForm.name}
              onChange={e => setLogForm({ ...logForm, name: e.target.value })} className="form-input" />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="number" placeholder="Calories" value={logForm.calories}
                onChange={e => setLogForm({ ...logForm, calories: e.target.value })} className="form-input" />
              <input type="number" placeholder="Protein (g)" value={logForm.protein}
                onChange={e => setLogForm({ ...logForm, protein: e.target.value })} className="form-input" />
            </div>
            <input type="time" value={logForm.time}
              onChange={e => setLogForm({ ...logForm, time: e.target.value })} className="form-input" />
            <button onClick={addLog} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> Log Meal
            </button>
          </div>
        </div>

        <div className="glass-card">
          <span className="card-title">Today's Log</span>
          {todayLog.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '0.75rem' }}>No meals logged today. Start tracking!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {todayLog.map(l => (
                <div key={l.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>{l.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{l.time || '—'} · {l.calories} cal · {l.protein || 0}g protein</p>
                  </div>
                  <button onClick={() => removeLog(l.id)} style={{ background: 'rgba(248,113,113,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Plan */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <span className="card-title">Recommended Meal Plan</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginTop: '0.85rem' }}>
          {meals.map((meal, idx) => (
            <div key={idx} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{meal.icon}</span>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>{meal.name}</h4>
                  <p style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700 }}>{meal.time}</p>
                </div>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {meal.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-2)', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--accent)' }}>•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bone Health */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🦴</span>
          <span className="card-title" style={{ margin: 0 }}>Bone Health & Calcium Guide</span>
        </div>
        <p style={{ color: 'var(--text-3)', marginBottom: '1rem', fontSize: '0.82rem' }}>Tamil Nadu foods rich in calcium for strong bones and joints.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { title: 'Dairy Sources', color: '#0ea5e9', items: ['Milk (1 glass = 300mg Ca)', 'Curd / Yogurt (150mg/cup)', 'Paneer (200mg/100g)', 'Buttermilk (Moru) - daily'] },
            { title: 'TN Leafy Greens', color: '#10b981', items: ['Drumstick leaves (Murungai keerai)', 'Agathi keerai (high calcium)', 'Manathakkali keerai', 'Arugula / Keerai varieties'] },
            { title: 'Seeds & Legumes', color: '#f59e0b', items: ['Sesame seeds (Ellu) 975mg/100g', 'Ragi (Finger millet) 344mg/100g', 'Rajma / Channa (150mg/cup)', 'Almonds (264mg/100g)'] },
            { title: 'Daily Bone Protocol', color: '#8b5cf6', items: ['Sunlight 15-20 min (Vitamin D)', 'Ragi kanji or porridge AM', 'Sesame chutney with meals', 'Avoid excess salt & soda'] },
          ].map((section, i) => (
            <div key={i} style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: section.color, marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>{section.title}</h4>
              <ul style={{ listStyle: 'none', fontSize: '0.78rem', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {section.items.map((item, j) => <li key={j}>• {item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
