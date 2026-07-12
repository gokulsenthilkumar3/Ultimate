import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Apple, Plus, Trash2, Calculator, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useToast } from '../hooks/useToast';
import PageHeader from './ui/PageHeader';
import useStore, {
  selectNutritionStrategy,
  selectNutritionLogs,
  selectAddNutritionLog,
  selectDeleteNutritionLog,
  selectFetchInitialData,
  selectIsLoading,
} from '../store/useStore';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'];
const EMPTY_FORM = { name: '', meal: 'Breakfast', calories: '', protein_g: '', carbs_g: '', fat_g: '' };
const MACRO_COLORS = { protein: '#10b981', carbs: '#0ea5e9', fat: '#f59e0b' };

const tooltipStyle = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', backdropFilter: 'blur(12px)',
  color: 'var(--text-1)', fontSize: '0.78rem',
};

function calcBMR(weight, height, age, gender) {
  const w = parseFloat(weight) || 75;
  const h = parseFloat(height) || 170;
  const a = parseFloat(age) || 30;
  let bmr = (10 * w) + (6.25 * h) - (5 * a);
  return gender === 'F' ? bmr - 161 : bmr + 5;
}

function calcMacroTargets(weight, height, age, gender, activity, goal) {
  const bmr = calcBMR(weight, height, age, gender);
  const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  let tdee = bmr * (activityMultipliers[activity] || 1.2);
  
  if (goal === 'bulk') tdee += 500;
  else if (goal === 'cut') tdee -= 500;
  
  const cal = Math.round(tdee);
  const w = parseFloat(weight) || 75;
  const protein = Math.round(w * 2.2);
  const fat = Math.round(w * 0.9);
  const carbs = Math.max(0, Math.round((cal - (protein * 4) - (fat * 9)) / 4));
  
  return { protein, carbs, fat, calories: cal, bmr: Math.round(bmr) };
}

function MacroRings({ proteinPct, carbsPct, fatPct }) {
  const radius = [48, 36, 24];
  const center = 60;
  const strokeWidth = 8;
  const getDashArray = (r, pct) => {
    const c = 2 * Math.PI * r;
    return `${(pct / 100) * c} ${c}`;
  };

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={center} cy={center} r={radius[0]} fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth={strokeWidth} />
      <circle cx={center} cy={center} r={radius[1]} fill="none" stroke="rgba(14, 165, 233, 0.15)" strokeWidth={strokeWidth} />
      <circle cx={center} cy={center} r={radius[2]} fill="none" stroke="rgba(245, 158, 11, 0.15)" strokeWidth={strokeWidth} />
      
      <circle cx={center} cy={center} r={radius[0]} fill="none" stroke="#10b981" strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={getDashArray(radius[0], Math.min(100, proteinPct))} style={{ transition: 'stroke-dasharray 1s ease' }} />
      <circle cx={center} cy={center} r={radius[1]} fill="none" stroke="#0ea5e9" strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={getDashArray(radius[1], Math.min(100, carbsPct))} style={{ transition: 'stroke-dasharray 1s ease' }} />
      <circle cx={center} cy={center} r={radius[2]} fill="none" stroke="#f59e0b" strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={getDashArray(radius[2], Math.min(100, fatPct))} style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
}

function MacroProgressBar({ label, consumed, target, color }) {
  const pct = Math.min(100, target ? Math.round((consumed / target) * 100) : 0);
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {consumed}g <span style={{ color: 'var(--text-3)' }}>/ {target}g</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`,
                     background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function Nutrition({ user }) {
  const dbNutrition    = useStore(selectNutritionStrategy);
  const nutrition      = user?.nutrition || dbNutrition || {};
  const meals          = user?.mealPlan  || dbNutrition?.meals || [];
  const toast          = useToast();

  // ── Store-backed nutrition logs ──────────────────────────────────────────
  const nutritionLogs  = useStore(selectNutritionLogs);
  const addNutritionLog    = useStore(selectAddNutritionLog);
  const deleteNutritionLog = useStore(selectDeleteNutritionLog);
  const fetchInitialData   = useStore(selectFetchInitialData);
  const isLoading          = useStore(selectIsLoading);

  const [logForm,      setLogForm]      = useState(EMPTY_FORM);
  const [historyDays,  setHistoryDays]  = useState(7);
  const nameInputRef = useRef(null);

  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail === 'nutrition' && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    };
    window.addEventListener('open-add-form', handleOpen);
    return () => window.removeEventListener('open-add-form', handleOpen);
  }, []);
  const [calcWeight,   setCalcWeight]   = useState(user?.weight || 75);
  const [calcHeight,   setCalcHeight]   = useState(user?.height || 170);
  const [calcAge,      setCalcAge]      = useState(user?.age || 30);
  const [calcGender,   setCalcGender]   = useState(user?.gender || 'M');
  const [calcActivity, setCalcActivity] = useState(user?.activityLevel || 'sedentary');
  const defaultGoal = user?.primaryGoal === 'Lose Fat' ? 'cut' :
                      user?.primaryGoal === 'Build Muscle' ? 'bulk' : 'maintain';
  const [calcGoal,     setCalcGoal]     = useState(defaultGoal);
  const [macroTargets, setMacroTargets] = useState(() => calcMacroTargets(calcWeight, calcHeight, calcAge, calcGender, calcActivity, calcGoal));

  const addLog = useCallback(async () => {
    if (!logForm.name.trim()) { toast.error('Meal name cannot be empty.'); return; }
    const cal = parseFloat(logForm.calories);
    if (!cal || cal <= 0)     { toast.error('Calories must be > 0.'); return; }
    try {
      await addNutritionLog({
        ...logForm,
        calories:  cal,
        protein_g: parseFloat(logForm.protein_g) || 0,
        carbs_g:   parseFloat(logForm.carbs_g)   || 0,
        fat_g:     parseFloat(logForm.fat_g)     || 0,
        date: new Date().toISOString().slice(0, 10),
      });
      toast.success(`${logForm.name} logged — ${cal} kcal`);
      setLogForm(EMPTY_FORM);
    } catch { toast.error('Failed to save meal log.'); }
  }, [logForm, toast, addNutritionLog]);

  const removeLog = useCallback(async (id, name) => {
    try {
      await deleteNutritionLog(id);
      toast.info(`${name} removed.`);
    } catch { toast.error('Delete failed.'); }
  }, [toast, deleteNutritionLog]);

  const today    = new Date().toISOString().slice(0, 10);
  const todayLog = useMemo(() => nutritionLogs.filter(l => l.date === today), [nutritionLogs, today]);

  const consumed = useMemo(() => ({
    calories: todayLog.reduce((s, l) => s + Number(l.calories  || 0), 0),
    protein:  todayLog.reduce((s, l) => s + Number(l.protein_g || 0), 0),
    carbs:    todayLog.reduce((s, l) => s + Number(l.carbs_g   || 0), 0),
    fat:      todayLog.reduce((s, l) => s + Number(l.fat_g     || 0), 0),
  }), [todayLog]);

  const balance      = consumed.calories - macroTargets.calories;
  const balanceLabel = balance > 50  ? 'SURPLUS'  : balance < -50 ? 'DEFICIT' : 'ON TARGET';
  const balanceColor = balance > 50  ? '#f59e0b'  : balance < -50 ? '#10b981' : '#8b5cf6';
  const BalanceIcon  = balance > 50  ? TrendingUp : balance < -50 ? TrendingDown : Minus;

  const calPct = Math.min(100, macroTargets.calories ? Math.round((consumed.calories / macroTargets.calories) * 100) : 0);

  const mealBarData = useMemo(() =>
    todayLog.map(l => ({ name: l.name.length > 12 ? l.name.slice(0, 11) + '…' : l.name,
                          calories: Number(l.calories || 0) })),
  [todayLog]);

  const weeklyHistory = useMemo(() => {
    const days = [];
    for (let i = historyDays - 1; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const ds  = d.toISOString().slice(0, 10);
      const row = nutritionLogs.filter(l => l.date === ds);
      days.push({
        date:     ds.slice(5),
        calories: row.reduce((s, l) => s + Number(l.calories  || 0), 0),
        protein:  row.reduce((s, l) => s + Number(l.protein_g || 0), 0),
        carbs:    row.reduce((s, l) => s + Number(l.carbs_g   || 0), 0),
        fat:      row.reduce((s, l) => s + Number(l.fat_g     || 0), 0),
        count:    row.length,
      });
    }
    return days;
  }, [nutritionLogs, historyDays]);

  const ringData = useMemo(() => [
    { name: 'Protein', value: Math.max(0, consumed.protein), fill: MACRO_COLORS.protein },
    { name: 'Carbs',   value: Math.max(0, consumed.carbs),   fill: MACRO_COLORS.carbs },
    { name: 'Fat',     value: Math.max(0, consumed.fat),     fill: MACRO_COLORS.fat },
  ].filter(d => d.value > 0), [consumed]);

  const handleCalcMacros = () => {
    const t = calcMacroTargets(calcWeight, calcHeight, calcAge, calcGender, calcActivity, calcGoal);
    setMacroTargets(t);
    toast.success(`Targets updated — ${t.calories} kcal`);
  };

  return (
    <div className="fade-in module-page">
      <PageHeader accent="Nutrition" icon={<Apple size={24} />}
        title="Fueling Strategy" subtitle="Per-meal logging with macro tracking." />

      {/* ── Macro Calculator ── */}
      <div className="glass-card mb-lg" style={{ borderTop: '2px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <Calculator size={18} color="var(--accent)" />
          <span className="card-title" style={{ margin: 0 }}>Macro Calculator</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 80px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Age</label>
            <input className="form-input" type="number" min={10} max={100} value={calcAge} onChange={e => setCalcAge(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 80px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Gender</label>
            <select className="form-input" value={calcGender} onChange={e => setCalcGender(e.target.value)}>
              <option value="M">M</option><option value="F">F</option>
            </select>
          </div>
          <div style={{ flex: '1 1 90px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Ht (cm)</label>
            <input className="form-input" type="number" min={100} max={250} value={calcHeight} onChange={e => setCalcHeight(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 90px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Wt (kg)</label>
            <input className="form-input" type="number" min={30} max={200} value={calcWeight} onChange={e => setCalcWeight(e.target.value)} />
          </div>
          <div style={{ flex: '2 1 140px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Activity</label>
            <select className="form-input" value={calcActivity} onChange={e => setCalcActivity(e.target.value)}>
              <option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option>
            </select>
          </div>
          <div style={{ flex: '2 1 140px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Goal</label>
            <select className="form-input" value={calcGoal} onChange={e => setCalcGoal(e.target.value)}>
              <option value="cut">Cut (fat loss)</option><option value="maintain">Maintain</option><option value="bulk">Bulk</option>
            </select>
          </div>
          <button className="btn-primary" style={{ height: '44px', width: '100%' }} onClick={handleCalcMacros}>
            <Calculator size={14} /> Calculate BMR & Targets
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
          {[
            { label: 'BMR',      value: `${macroTargets.bmr} kcal`,       color: 'var(--text-2)' },
            { label: 'TDEE (Goal)', value: `${macroTargets.calories} kcal`, color: 'var(--accent)' },
            { label: 'Protein',  value: `${macroTargets.protein}g`,       color: MACRO_COLORS.protein },
            { label: 'Carbs',    value: `${macroTargets.carbs}g`,         color: MACRO_COLORS.carbs },
            { label: 'Fat',      value: `${macroTargets.fat}g`,           color: MACRO_COLORS.fat },
          ].map(t => (
            <div key={t.label} style={{ padding: '0.75rem', background: 'var(--bg-elevated)',
                                       borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.label}</p>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: t.color }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily Progress strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '1.5rem', marginBottom: '1.5rem' }}>

        <div className="glass-card" style={{ borderTop: `3px solid ${balanceColor}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p className="label-caps">Daily Calories</p>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px',
                           fontSize: '0.68rem', fontWeight: 800, color: balanceColor,
                           background: `${balanceColor}1a`, borderRadius: 99,
                           padding: '2px 8px' }}>
              <BalanceIcon size={11} />
              {balanceLabel} {balance !== 0 && `${balance > 0 ? '+' : ''}${balance} kcal`}
            </span>
          </div>
          <p style={{ fontSize: '1.9rem', fontWeight: 900, lineHeight: 1 }}>
            {consumed.calories}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginLeft: '6px' }}>/ {macroTargets.calories} kcal</span>
          </p>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)',
                        overflow: 'hidden', marginTop: '0.75rem' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${calPct}%`,
                         background: `linear-gradient(90deg, var(--accent), ${balanceColor})`,
                         transition: 'width 0.5s ease' }} />
          </div>
        </div>

        <div className="glass-card">
          <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Macro Targets Today</p>
          <MacroProgressBar label="Protein" consumed={Math.round(consumed.protein)} target={macroTargets.protein} color={MACRO_COLORS.protein} />
          <MacroProgressBar label="Carbs"   consumed={Math.round(consumed.carbs)}   target={macroTargets.carbs}   color={MACRO_COLORS.carbs}   />
          <MacroProgressBar label="Fat"     consumed={Math.round(consumed.fat)}     target={macroTargets.fat}     color={MACRO_COLORS.fat}     />
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="label-caps mb-sm" style={{ alignSelf: 'flex-start' }}>Today's Macro Breakdown</p>
          {ringData.length === 0 ? (
            <p className="empty-msg" style={{ fontSize: '0.78rem', marginTop: '1rem' }}>Log meals to see breakdown</p>
          ) : (
            <div style={{ width: 120, height: 120, margin: '5px auto' }}>
              <MacroRings 
                proteinPct={macroTargets.protein ? (consumed.protein / macroTargets.protein) * 100 : 0} 
                carbsPct={macroTargets.carbs ? (consumed.carbs / macroTargets.carbs) * 100 : 0} 
                fatPct={macroTargets.fat ? (consumed.fat / macroTargets.fat) * 100 : 0} 
              />
            </div>
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

      {/* ── Log Meal + Today's Log ── */}
      <div className="dual-grid mb-lg">
        <div className="glass-card">
          <span className="card-title">Log Meal</span>
          <div className="form-stack mt-sm">
            <select className="form-input" value={logForm.meal}
              onChange={e => setLogForm({ ...logForm, meal: e.target.value })}>
              {MEAL_TYPES.map(m => <option key={m}>{m}</option>)}
            </select>
            <input type="text" placeholder="Food / meal name" value={logForm.name}
              ref={nameInputRef}
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
            <button className="btn-icon" onClick={() => fetchInitialData()} title="Refresh"
              style={{ opacity: isLoading ? 0.5 : 1 }}>
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
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
                  <button onClick={() => removeLog(l.id, l.name)}
                    className="btn-icon btn-icon--danger" aria-label="Remove meal">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Per-meal calorie bar chart ── */}
      {mealBarData.length > 0 && (
        <div className="glass-card mb-lg">
          <span className="card-title">Calorie Breakdown by Meal</span>
          <div style={{ height: 180, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealBarData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kcal`, 'Calories']} />
                <Bar dataKey="calories" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Weekly History Table ── */}
      <div className="glass-card mb-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Nutrition History</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setHistoryDays(d)}
                className={`btn-sm ${historyDays === d ? 'active' : ''}`}
                style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Meals', 'Calories', 'Protein', 'Carbs', 'Fat', 'Balance'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: h === 'Date' || h === 'Meals' ? 'left' : 'right',
                                      color: 'var(--text-3)', fontWeight: 700, fontSize: '0.72rem',
                                      textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyHistory.map((row) => {
                const bal   = row.calories - macroTargets.calories;
                const bCol  = bal > 50 ? '#f59e0b' : bal < -50 ? '#10b981' : 'var(--text-3)';
                const noData = row.count === 0;
                return (
                  <tr key={row.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)',
                                             opacity: noData ? 0.4 : 1 }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-3)' }}>{row.count}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                      {row.calories || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: MACRO_COLORS.protein }}>
                      {row.protein ? `${row.protein}g` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: MACRO_COLORS.carbs }}>
                      {row.carbs ? `${row.carbs}g` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: MACRO_COLORS.fat }}>
                      {row.fat ? `${row.fat}g` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right',
                                 fontWeight: 800, color: bCol, fontSize: '0.75rem' }}>
                      {row.count ? (bal > 0 ? `+${bal}` : bal === 0 ? '•' : bal) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Meal Plan (from profile) ── */}
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

      {/* ── Bone Health ── */}
      <div className="glass-card">
        <div className="card-header-row mb-sm">
          <span style={{ fontSize: '1.25rem' }}>🦴</span>
          <span className="card-title" style={{ margin: 0 }}>Bone Health &amp; Calcium Guide</span>
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
