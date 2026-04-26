import React, { useState, useMemo, useCallback } from 'react';
import { NUTRITION as DEFAULT_NUTRITION } from '../data/userData';
import { Apple, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ProgressRing from './ui/ProgressRing';
import MacroBar from './ui/MacroBar';
import PageHeader from './ui/PageHeader';

const EMPTY_FORM = { name: '', calories: '', protein: '', time: '' };

export default function Nutrition({ user, setUser }) {
  const nutrition = user?.nutrition || DEFAULT_NUTRITION;
  const meals     = user?.mealPlan  || DEFAULT_NUTRITION.meals;
  const mealLog   = user?.mealLog   || [];
  const toast     = useToast();

  const [logForm, setLogForm] = useState(EMPTY_FORM);

  // ── Persist to user object (same pattern as Lifestyle/Tasks)
  const updateMealLog = useCallback((newLog) => {
    setUser({ ...user, mealLog: newLog });
  }, [user, setUser]);

  // ── #2 Validated add with toast
  const addLog = useCallback(() => {
    if (!logForm.name.trim()) {
      toast.error('Meal name cannot be empty.');
      return;
    }
    const cal = parseFloat(logForm.calories);
    if (!logForm.calories || isNaN(cal) || cal <= 0) {
      toast.error('Calories must be greater than 0.');
      return;
    }
    const entry = { ...logForm, id: Date.now(), date: new Date().toISOString().slice(0, 10) };
    updateMealLog([...mealLog, entry]);
    setLogForm(EMPTY_FORM);
    toast.success(`${logForm.name} logged — ${cal} kcal`);
  }, [logForm, mealLog, updateMealLog, toast]);

  const removeLog = useCallback((id, name) => {
    updateMealLog(mealLog.filter((l) => l.id !== id));
    toast.info(`${name} removed from today's log.`);
  }, [mealLog, updateMealLog, toast]);

  // ── #9 useMemo: daily progress calculations
  const today = new Date().toISOString().slice(0, 10);

  const { todayLog, consumedCal, consumedPro, calPct, proPct } = useMemo(() => {
    const todayLog   = mealLog.filter((l) => l.date === today);
    const targetCal  = nutrition.surplus || nutrition.tdee || 2950;
    const targetPro  = nutrition.protein || 170;
    const consumedCal = todayLog.reduce((s, l) => s + Number(l.calories || 0), 0);
    const consumedPro = todayLog.reduce((s, l) => s + Number(l.protein  || 0), 0);
    const calPct = Math.min(100, Math.round((consumedCal / targetCal) * 100));
    const proPct = Math.min(100, Math.round((consumedPro / targetPro) * 100));
    return { todayLog, consumedCal, consumedPro, calPct, proPct };
  }, [mealLog, today, nutrition]);

  const targetCal = nutrition.surplus || nutrition.tdee || 2950;
  const targetPro = nutrition.protein || 170;

  // ── Macro bar data
  const macros = useMemo(() => [
    { label: 'Protein', value: `${nutrition.protein || 170}g`, color: '#10b981', pct: 30 },
    { label: 'Carbs',   value: `${nutrition.carbs   || 280}g`, color: '#0ea5e9', pct: 45 },
    { label: 'Fat',     value: `${nutrition.fat      || 90}g`,  color: '#f59e0b', pct: 25 },
  ], [nutrition]);

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Nutrition"
        icon={<Apple size={24} />}
        title="Fueling Strategy"
        subtitle="Hypertrophy-focused nutrition for Phase 1 Lean Bulk."
      />

      {/* Daily Progress */}
      <div className="triple-grid mb-lg">
        {/* Calories */}
        <div className="glass-card">
          <div className="progress-header">
            <div>
              <p className="label-caps">Daily Calories</p>
              <p className="progress-value" style={{ color: calPct >= 100 ? 'var(--success)' : 'var(--text-1)' }}>
                {consumedCal}
                <span className="progress-value__sub"> / {targetCal}</span>
              </p>
            </div>
            <ProgressRing pct={calPct} color="var(--accent)" />
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${calPct}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        {/* Protein */}
        <div className="glass-card">
          <div className="progress-header">
            <div>
              <p className="label-caps">Protein Target</p>
              <p className="progress-value" style={{ color: proPct >= 100 ? 'var(--success)' : 'var(--text-1)' }}>
                {consumedPro}g
                <span className="progress-value__sub"> / {targetPro}g</span>
              </p>
            </div>
            <ProgressRing pct={proPct} color="var(--success)" />
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${proPct}%`, background: 'var(--success)' }} />
          </div>
        </div>

        {/* Macro Targets */}
        <div className="glass-card">
          <p className="label-caps mb-sm">Macro Targets</p>
          <div className="macro-list">
            {macros.map((m) => (
              <MacroBar key={m.label} label={m.label} value={m.value} color={m.color} pct={m.pct} />
            ))}
          </div>
        </div>
      </div>

      {/* Log Meal + Today's Log */}
      <div className="dual-grid mb-lg">
        <div className="glass-card">
          <span className="card-title">Log Meal</span>
          <div className="form-stack mt-sm">
            <input
              type="text" placeholder="Meal name" value={logForm.name}
              onChange={(e) => setLogForm({ ...logForm, name: e.target.value })}
              className="form-input"
            />
            <div className="flex-row gap-sm">
              <input
                type="number" placeholder="Calories" value={logForm.calories}
                onChange={(e) => setLogForm({ ...logForm, calories: e.target.value })}
                className="form-input" min="0"
              />
              <input
                type="number" placeholder="Protein (g)" value={logForm.protein}
                onChange={(e) => setLogForm({ ...logForm, protein: e.target.value })}
                className="form-input" min="0"
              />
            </div>
            <input
              type="time" value={logForm.time}
              onChange={(e) => setLogForm({ ...logForm, time: e.target.value })}
              className="form-input"
            />
            <button onClick={addLog} className="btn-primary btn-full">
              <Plus size={16} /> Log Meal
            </button>
          </div>
        </div>

        <div className="glass-card">
          <span className="card-title">Today's Log</span>
          {todayLog.length === 0 ? (
            <p className="empty-msg">No meals logged today. Start tracking!</p>
          ) : (
            <div className="item-list mt-sm">
              {todayLog.map((l) => (
                <div key={l.id} className="list-row">
                  <div>
                    <p className="list-row__title">{l.name}</p>
                    <p className="list-row__sub">
                      {l.time || '—'} · {l.calories} cal · {l.protein || 0}g protein
                    </p>
                  </div>
                  <button
                    onClick={() => removeLog(l.id, l.name)}
                    className="btn-icon btn-icon--danger"
                    aria-label="Remove meal"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Plan */}
      <div className="glass-card mb-lg">
        <span className="card-title">Recommended Meal Plan</span>
        <div className="meal-plan-grid mt-sm">
          {meals.map((meal, idx) => (
            <div key={idx} className="meal-plan-card">
              <div className="meal-plan-card__header">
                <span className="meal-plan-card__icon">{meal.icon}</span>
                <div>
                  <h4 className="meal-plan-card__name">{meal.name}</h4>
                  <p className="meal-plan-card__time">{meal.time}</p>
                </div>
              </div>
              <ul className="meal-plan-card__items">
                {meal.items.map((item, i) => (
                  <li key={i}>
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
        <div className="card-header-row mb-sm">
          <span style={{ fontSize: '1.25rem' }}>🦴</span>
          <span className="card-title" style={{ margin: 0 }}>Bone Health & Calcium Guide</span>
        </div>
        <p className="text-muted mb-sm" style={{ fontSize: '0.82rem' }}>
          Tamil Nadu foods rich in calcium for strong bones and joints.
        </p>
        <div className="bone-grid">
          {[
            { title: 'Dairy Sources',    color: '#0ea5e9', items: ['Milk (1 glass = 300mg Ca)', 'Curd / Yogurt (150mg/cup)', 'Paneer (200mg/100g)', 'Buttermilk (Moru) - daily'] },
            { title: 'TN Leafy Greens', color: '#10b981', items: ['Drumstick leaves (Murungai keerai)', 'Agathi keerai (high calcium)', 'Manathakkali keerai', 'Arugula / Keerai varieties'] },
            { title: 'Seeds & Legumes', color: '#f59e0b', items: ['Sesame seeds (Ellu) 975mg/100g', 'Ragi (Finger millet) 344mg/100g', 'Rajma / Channa (150mg/cup)', 'Almonds (264mg/100g)'] },
            { title: 'Daily Protocol',  color: '#8b5cf6', items: ['Sunlight 15-20 min (Vitamin D)', 'Ragi kanji or porridge AM', 'Sesame chutney with meals', 'Avoid excess salt & soda'] },
          ].map((section, i) => (
            <div key={i} className="bone-section">
              <h4 style={{ color: section.color }}>{section.title}</h4>
              <ul>
                {section.items.map((item, j) => <li key={j}>• {item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
