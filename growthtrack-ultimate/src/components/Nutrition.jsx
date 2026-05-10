import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Apple, Plus, Trash2, Calculator, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '../hooks/useToast';
import ProgressRing from './ui/ProgressRing';
import MacroBar from './ui/MacroBar';
import PageHeader from './ui/PageHeader';
import useStore, { selectNutritionStrategy } from '../store/useStore';

const MEAL_TYPES = ['Breakfast', 'Lunch', dinner: 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'];
const EMPTY_FORM = { name: '', meal: 'Breakfast', calories: '', protein_g: '', carbs_g: '', fat_g: '' };
const MACRO_COLORS = { protein: '#10b981', carbs: '#0ea5e9', fat: '#f59e0b' };

// ── Macro calculator logic
function calcMacroTargets(weightKg, goal) {
  const w = parseFloat(weightKg) || 75;
  const protein = Math.round(w * 2.2);
  let carbs, fat;
  if (goal === 'bulk')    { carbs = Math.round(w * 4.5); fat = Math.round(w * 1.0); }
  else if (goal === 'cut') { carbs = Math.round(w * 2.5); fat = Math.round(w * 0.8); }
  else                     { carbs = Math.round(w * 3.5); fat = Math.round(w * 0.9); } // maintain
  const calories = protein * 4 + carbs * 4 + fat * 9;
  return { protein, carbs, fat, calories };
}

export default function Nutrition({ user, setUser }) {
  const dbNutrition = useStore(selectNutritionStrategy);
  const nutrition = user?.nutrition || dbNutrition || {};
  const meals     = user?.mealPlan  || dbNutrition?.meals || [];
  const toast     = useToast();

  // ── Nutrition logs (from DB via API)
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [loadingLogs, setLoadingLogs]     = useState(false);
  const [logForm, setLogForm]             = useState(EMPTY_FORM);

  // ── Macro calculator state
  const [calcWeight, setCalcWeight] = useState(user?.weight || 75);
  const [calcGoal,   setCalcGoal]   = useState('maintain');
  const [macroTargets, setMacroTargets] = useState(() => calcMacroTargets(user?.weight || 75, 'maintain'));

  const fetchNutritionLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/nutrition_logs');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setNutritionLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('nutrition_logs fetch error', e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => { fetchNutritionLogs(); }, [fetchNutritionLogs]);

  const addLog = useCallback(async () => {
    if (!logForm.name.trim()) { toast.error('Meal name cannot be empty.'); return; }
    const cal = parseFloat(logForm.calories);
    if (!logForm.calories || isNaN(cal) || cal <= 0) { toast.error('Calories must be > 0.'); return; }
    try {
      const res = await fetch('/api/nutrition_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logForm,
          calories: cal,
          protein_g: parseFloat(logForm.protein_g) || 0,
          carbs_g:   parseFloat(logForm.carbs_g)   || 0,
          fat_g:     parseFloat(logForm.fat_g)     || 0,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error('save failed');
      toast.success(`${logForm.name} logged — ${cal} kcal`);
      setLogForm(EMPTY_FORM);
      fetchNutritionLogs();
    } catch (e) {
      toast.error('Failed to save meal log.');
    }
  }, [logForm, toast, fetchNutritionLogs]);

  const removeLog = useCallback(async (id, name) => {
    try {
      await fetch(`/api/nutrition_logs/${id}`, { method: 'DELETE' });
      setNutritionLogs(prev => prev.filter(l => l.id !== id));
      toast.info(`${name} removed.`);
    } catch { toast.error('Delete failed.'); }
  }, [toast]);

  const today = new Date().toISOString().slice(0, 10);
  const todayLog = useMemo(() => nutritionLogs.filter(l => l.date === today), [nutritionLogs, today]);

  const consumed = useMemo(() => ({
    calories: todayLog.reduce((s, l) => s + Number(l.calories || 0), 0),
    protein:  todayLog.reduce((s, l) => s + Number(l.protein_g || 0), 0),
    carbs:    todayLog.reduce((s, l) => s + Number(l.carbs_g   || 0), 0),
    fat:      todayLog.reduce((s, l) => s + Number(l.fat_g     || 0), 0),
  }), [todayLog]);

  const calPct = Math.min(100, Math.round((consumed.calories / macroTargets.calories) * 100));
  const proPct = Math.min(100, Math.round((consumed.protein  / macroTargets.protein)  * 100));

  // ── Ring chart data (consumed vs remaining)
  const ringData = useMemo(() => [
    { name: 'Protein',  value: Math.max(0, consumed.protein), fill: MACRO_COLORS.protein },
    { name: 'Carbs',    value: Math.max(0, consumed.carbs),   fill: MACRO_COLORS.carbs },
    { name: 'Fat',      value: Math.max(0, consumed.fat),     fill: MACRO_COLORS.fat },
  ].filter(d => d.value > 0), [consumed]);

  const handleCalcMacros = () => {
    const t = calcMacroTargets(calcWeight, calcGoal);
    setMacroTargets(t);
    toast.success(`Targets updated — ${t.calories} kcal, P:${t.protein}g C:${t.carbs}g F:${t.fat}g`);
  };

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Nutrition"
        icon={<Apple size={24} />}
        title="Fueling Strategy"
        subtitle="Per-meal logging with macro tracking."
      />

      {/* Macro Calculator */}
      <div className="glass-card mb-lg" style={{ borderTop: '2px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <Calculator size={18} color="var(--accent)" />
          <span className="card-title" style={{ margin: 0 }}>Macro Calculator</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 120px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Body Weight (kg)</label>
            <input className="form-input" type="number" min={30} max={200} value={calcWeight}
              onChange={e => setCalcWeight(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Goal</label>
            <select className="form-input" value={calcGoal} onChange={e => setCalcGoal(e.target.value)}>
              <option value="cut">Cut (fat loss)</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk (muscle gain)</option>
            </select>
          </div>
          <button className="btn-primary" style={{ height: '44px' }} onClick={handleCalcMacros}>
            <Calculator size={14} /> Calculate
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
          {[
            { label: 'Calories', value: `${macroTargets.calories} kcal`, color: 'var(--accent)' },
            { label: 'Protein',  value: `${macroTargets.protein}g`,       color: MACRO_COLORS.protein },
            { label: 'Carbs',    value: `${macroTargets.carbs}g`,         color: MACRO_COLORS.carbs },
            { label: 'Fat',      value: `${macroTargets.fat}g`,           color: MACRO_COLORS.fat },
          ].map(t => (
            <div key={t.label} style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.label}</p>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: t.color }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Progress + Ring Chart */}
      <div className="triple-grid mb-lg">
        <div className="glass-card">
          <div className="progress-header">
            <div>
              <p className="label-caps">Daily Calories</p>
              <p className="progress-value" style={{ color: calPct >= 100 ? 'var(--success)' : 'var(--text-1)' }}>
                {consumed.calories}<span className="progress-value__sub"> / {macroTargets.calories}</span>
              </p>
            </div>
            <ProgressRing pct={calPct} color="var(--accent)" />
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${calPct}%`, background: 'var(--accent)' }} /></div>
        </div>

        <div className="glass-card">
          <div className="progress-header">
            <div>
              <p className="label-caps">Protein</p>
              <p className="progress-value" style={{ color: proPct >= 100 ? 'var(--success)' : 'var(--text-1)' }}>
                {consumed.protein}g<span className="progress-value__sub"> / {macroTargets.protein}g</span>
              </p>
            </div>
            <ProgressRing pct={proPct} color="var(--success)" />
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${proPct}%`, background: 'var(--success)' }} /></div>
        </div>

        {/* Macro Ring Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="label-caps mb-sm" style={{ alignSelf: 'flex-start' }}>Today's Macro Breakdown</p>
          {ringData.length === 0 ? (
            <p className="empty-msg" style={{ fontSize: '0.78rem', marginTop: '1rem' }}>Log meals to see breakdown</p>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={ringData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value">
                  {ringData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v}g`, name]} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            {Object.entries(MACRO_COLORS).map(([k, c]) => (
              <span key={k} style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Log Meal + Today's Log */}
      <div className="dual-grid mb-lg">
        <div className="glass-card">
          <span className="card-title">Log Meal</span>
          <div className="form-stack mt-sm">
            <select className="form-input" value={logForm.meal} onChange={e => setLogForm({ ...logForm, meal: e.target.value })}>
              {['Breakfast','Lunch','Dinner','Snack','Pre-workout','Post-workout'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input type="text" placeholder="Food/meal name" value={logForm.name}
              onChange={e => setLogForm({ ...logForm, name: e.target.value })} className="form-input" />
            <div className="flex-row gap-sm">
              <input type="number" placeholder="Calories" value={logForm.calories}
                onChange={e => setLogForm({ ...logForm, calories: e.target.value })} className="form-input" min="0" />
              <input type="number" placeholder="Protein (g)" value={logForm.protein_g}
                onChange={e => setLogForm({ ...logForm, protein_g: e.target.value })} className="form-input" min="0" />
            </div>
            <div className="flex-row gap-sm">
              <input type="number" placeholder="Carbs (g)" value={logForm.carbs_g}
                onChange={e => setLogForm({ ...logForm, carbs_g: e.target.value })} className="form-input" min="0" />
              <input type="number" placeholder="Fat (g)" value={logForm.fat_g}
                onChange={e => setLogForm({ ...logForm, fat_g: e.target.value })} className="form-input" min="0" />
            </div>
            <button onClick={addLog} className="btn-primary btn-full"><Plus size={16} /> Log Meal</button>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Today's Log</span>
            <button className="btn-icon" onClick={fetchNutritionLogs} title="Refresh" style={{ opacity: loadingLogs ? 0.5 : 1 }}>
              <RefreshCw size={14} className={loadingLogs ? 'spin' : ''} />
            </button>
          </div>
          {todayLog.length === 0 ? (
            <p className="empty-msg">No meals logged today.</p>
          ) : (
            <div className="item-list">
              {todayLog.map(l => (
                <div key={l.id} className="list-row">
                  <div>
                    <p className="list-row__title">{l.name}</p>
                    <p className="list-row__sub">
                      {l.meal} · {l.calories} kcal · P:{l.protein_g||0}g C:{l.carbs_g||0}g F:{l.fat_g||0}g
                    </p>
                  </div>
                  <button onClick={() => removeLog(l.id, l.name)} className="btn-icon btn-icon--danger" aria-label="Remove meal">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Plan */}
      {meals.length > 0 && (
        <div className="glass-card mb-lg">
          <span className="card-title">Recommended Meal Plan</span>
          <div className="meal-plan-grid mt-sm">
            {meals.map((meal, idx) => (
              <div key={idx} className="meal-plan-card">
                <div className="meal-plan-card__header">
                  <span className="meal-plan-card__icon">{meal.icon}</span>
                  <div><h4 className="meal-plan-card__name">{meal.name}</h4><p className="meal-plan-card__time">{meal.time}</p></div>
                </div>
                <ul className="meal-plan-card__items">
                  {meal.items.map((item, i) => <li key={i}><span style={{ color: 'var(--accent)' }}>•</span> {item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bone Health */}
      <div className="glass-card">
        <div className="card-header-row mb-sm">
          <span style={{ fontSize: '1.25rem' }}>🦴</span>
          <span className="card-title" style={{ margin: 0 }}>Bone Health & Calcium Guide</span>
        </div>
        <p className="text-muted mb-sm" style={{ fontSize: '0.82rem' }}>Tamil Nadu foods rich in calcium for strong bones and joints.</p>
        <div className="bone-grid">
          {[
            { title: 'Dairy Sources',    color: '#0ea5e9', items: ['Milk (1 glass = 300mg Ca)', 'Curd / Yogurt (150mg/cup)', 'Paneer (200mg/100g)', 'Buttermilk (Moru) - daily'] },
            { title: 'TN Leafy Greens', color: '#10b981', items: ['Drumstick leaves (Murungai keerai)', 'Agathi keerai (high calcium)', 'Manathakkali keerai', 'Arugula / Keerai varieties'] },
            { title: 'Seeds & Legumes', color: '#f59e0b', items: ['Sesame seeds (Ellu) 975mg/100g', 'Ragi (Finger millet) 344mg/100g', 'Rajma / Channa (150mg/cup)', 'Almonds (264mg/100g)'] },
            { title: 'Daily Protocol',  color: '#8b5cf6', items: ['Sunlight 15-20 min (Vitamin D)', 'Ragi kanji or porridge AM', 'Sesame chutney with meals', 'Avoid excess salt & soda'] },
          ].map((section, i) => (
            <div key={i} className="bone-section">
              <h4 style={{ color: section.color }}>{section.title}</h4>
              <ul>{section.items.map((item, j) => <li key={j}>• {item}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
