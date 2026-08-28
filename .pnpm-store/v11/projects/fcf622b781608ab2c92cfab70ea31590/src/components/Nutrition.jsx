import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Apple, Plus, Trash2, Calculator, RefreshCw, TrendingUp, TrendingDown, Minus, Flame, Zap, Dumbbell } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
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
const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (desk job)',
  light: 'Light (1–3×/wk)',
  moderate: 'Moderate (3–5×/wk)',
  active: 'Active (6–7×/wk)',
  very_active: 'Very Active (2× daily)',
};
const ACTIVITY_MULTIPLIERS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };

const tooltipStyle = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', backdropFilter: 'blur(12px)',
  color: 'var(--text-1)', fontSize: '0.78rem',
};

// ── Mifflin-St Jeor BMR ────────────────────────────────────────────────────
function calcBMR(weight, height, age, gender) {
  const w = parseFloat(weight) || 75;
  const h = parseFloat(height) || 170;
  const a = parseFloat(age) || 30;
  const base = (10 * w) + (6.25 * h) - (5 * a);
  return gender === 'F' ? base - 161 : base + 5;
}

function calcMacroTargets(weight, height, age, gender, activity, goal) {
  const bmr = calcBMR(weight, height, age, gender);
  let tdee = bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.2);
  if (goal === 'bulk') tdee += 500;
  else if (goal === 'cut') tdee -= 500;
  const cal = Math.round(tdee);
  const w = parseFloat(weight) || 75;
  const protein = Math.round(w * 2.2);
  const fat = Math.round(w * 0.9);
  const carbs = Math.max(0, Math.round((cal - (protein * 4) - (fat * 9)) / 4));
  return { protein, carbs, fat, calories: cal, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

// ── Animated 3-part Concentric Ring Chart ─────────────────────────────────
function MacroRings({ proteinPct, carbsPct, fatPct, consumed, targets }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const SW = 10; // strokeWidth
  const rings = [
    { r: 65, pct: proteinPct, color: MACRO_COLORS.protein, trackColor: 'rgba(16,185,129,0.12)', key: 'protein', label: 'P' },
    { r: 50, pct: carbsPct,   color: MACRO_COLORS.carbs,   trackColor: 'rgba(14,165,233,0.12)',  key: 'carbs',   label: 'C' },
    { r: 35, pct: fatPct,     color: MACRO_COLORS.fat,     trackColor: 'rgba(245,158,11,0.12)',  key: 'fat',     label: 'F' },
  ];

  const arc = (r, pct) => {
    const clamped = Math.min(100, Math.max(0, pct));
    const circ = 2 * Math.PI * r;
    return `${(clamped / 100) * circ} ${circ}`;
  };

  const ringPcts = mounted ? { protein: proteinPct, carbs: carbsPct, fat: fatPct } : { protein: 0, carbs: 0, fat: 0 };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
           style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        {rings.map(ring => (
          <g key={ring.key}>
            {/* Track */}
            <circle cx={CX} cy={CY} r={ring.r} fill="none" stroke={ring.trackColor} strokeWidth={SW} />
            {/* Progress */}
            <circle cx={CX} cy={CY} r={ring.r} fill="none" stroke={ring.color}
                    strokeWidth={SW} strokeLinecap="round"
                    strokeDasharray={arc(ring.r, ringPcts[ring.key])}
                    style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </g>
        ))}
      </svg>

      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '1.35rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-1)' }}>
          {consumed.calories}
        </span>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-3)', textTransform: 'uppercase',
                       letterSpacing: '0.08em', marginTop: '2px' }}>kcal</span>
      </div>

      {/* Ring labels — positioned outside */}
      <div style={{ position: 'absolute', top: '4px', right: '-48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { key: 'protein', color: MACRO_COLORS.protein, label: 'PRO', val: consumed.protein, target: targets.protein },
          { key: 'carbs',   color: MACRO_COLORS.carbs,   label: 'CHO', val: consumed.carbs,   target: targets.carbs   },
          { key: 'fat',     color: MACRO_COLORS.fat,     label: 'FAT', val: consumed.fat,     target: targets.fat     },
        ].map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: m.color }}>{Math.round(m.val)}g</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroProgressBar({ label, consumed, target, color }) {
  const pct = Math.min(100, target ? Math.round((consumed / target) * 100) : 0);
  const over = consumed > target && target > 0;
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: over ? '#ef4444' : 'var(--text-3)' }}>
          {consumed}g <span style={{ color: 'var(--text-3)' }}>/ {target}g</span>
          {over && <span style={{ marginLeft: '4px', color: '#ef4444' }}>↑</span>}
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${pct}%`,
          background: over ? '#ef4444' : color, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Dynamic BMR Breakdown Panel ────────────────────────────────────────────
function BMRBreakdown({ weight, height, age, gender, activity, goal, targets }) {
  const bmr = targets.bmr;
  const tdeeRaw = targets.tdee;
  const multiplier = ACTIVITY_MULTIPLIERS[activity] || 1.2;
  const activityKcal = Math.round(bmr * multiplier) - bmr;
  const goalDelta = goal === 'bulk' ? 500 : goal === 'cut' ? -500 : 0;

  const bars = [
    { label: 'Base Metabolic Rate', kcal: bmr, color: 'var(--accent)', note: 'Calories burned at rest' },
    { label: 'Activity Burn', kcal: activityKcal, color: '#0ea5e9', note: ACTIVITY_LABELS[activity] },
    { label: 'Goal Adjustment', kcal: Math.abs(goalDelta), color: goalDelta > 0 ? '#f59e0b' : goalDelta < 0 ? '#10b981' : 'var(--text-3)',
      note: goalDelta > 0 ? '+500 surplus (bulk)' : goalDelta < 0 ? '−500 deficit (cut)' : 'No adjustment' },
  ];

  const maxKcal = Math.max(...bars.map(b => b.kcal));

  return (
    <div className="glass-card" style={{ borderTop: '2px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <Flame size={16} color="var(--accent)" />
        <span className="card-title" style={{ margin: 0 }}>BMR Breakdown</span>
        <span style={{
          marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 800,
          background: 'var(--bg-elevated)', borderRadius: 99, padding: '3px 10px',
          color: 'var(--accent)',
        }}>TDEE: {targets.calories} kcal</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {bars.map((bar, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-1)' }}>{bar.label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: bar.color }}>{bar.kcal} kcal</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, width: `${maxKcal ? (bar.kcal / maxKcal) * 100 : 0}%`,
                background: bar.color, transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>{bar.note}</div>
          </div>
        ))}
      </div>

      {/* Macro calorie split */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem',
        padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
      }}>
        {[
          { label: 'Protein', g: targets.protein, kcal: targets.protein * 4, color: MACRO_COLORS.protein },
          { label: 'Carbs',   g: targets.carbs,   kcal: targets.carbs * 4,   color: MACRO_COLORS.carbs   },
          { label: 'Fat',     g: targets.fat,     kcal: targets.fat * 9,     color: MACRO_COLORS.fat     },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: m.color }}>{m.g}g</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{m.kcal} kcal</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase',
                          letterSpacing: '0.06em', marginTop: '1px' }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Nutrition({ user }) {
  const dbNutrition    = useStore(selectNutritionStrategy);
  const nutrition      = user?.nutrition || dbNutrition || {};
  const meals          = user?.mealPlan  || dbNutrition?.meals || [];
  const toast          = useToast();

  const nutritionLogs      = useStore(selectNutritionLogs);
  const addNutritionLog    = useStore(selectAddNutritionLog);
  const deleteNutritionLog = useStore(selectDeleteNutritionLog);
  const fetchInitialData   = useStore(selectFetchInitialData);
  const isLoading          = useStore(selectIsLoading);

  const [logForm,     setLogForm]     = useState(EMPTY_FORM);
  const [historyDays, setHistoryDays] = useState(7);
  const nameInputRef = useRef(null);

  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail === 'nutrition' && nameInputRef.current) nameInputRef.current.focus();
    };
    window.addEventListener('open-add-form', handleOpen);
    return () => window.removeEventListener('open-add-form', handleOpen);
  }, []);

  // ── Calculator state — live (no button needed) ──────────────────────────
  const [calcWeight,   setCalcWeight]   = useState(user?.weight || 75);
  const [calcHeight,   setCalcHeight]   = useState(user?.height || 170);
  const [calcAge,      setCalcAge]      = useState(user?.age || 30);
  const [calcGender,   setCalcGender]   = useState(user?.gender || 'M');
  const [calcActivity, setCalcActivity] = useState(user?.activityLevel || 'sedentary');
  const defaultGoal = user?.primaryGoal === 'Lose Fat' ? 'cut' :
                      user?.primaryGoal === 'Build Muscle' ? 'bulk' : 'maintain';
  const [calcGoal, setCalcGoal] = useState(defaultGoal);

  // Live-computed targets — update on every input change
  const macroTargets = useMemo(
    () => calcMacroTargets(calcWeight, calcHeight, calcAge, calcGender, calcActivity, calcGoal),
    [calcWeight, calcHeight, calcAge, calcGender, calcActivity, calcGoal]
  );

  // ── Logging ──────────────────────────────────────────────────────────────
  const addLog = useCallback(async () => {
    if (!logForm.name.trim()) { toast.error('Meal name cannot be empty.'); return; }
    const cal = parseFloat(logForm.calories);
    if (!cal || cal <= 0) { toast.error('Calories must be > 0.'); return; }
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
  const balanceLabel = balance > 50 ? 'SURPLUS' : balance < -50 ? 'DEFICIT' : 'ON TARGET';
  const balanceColor = balance > 50 ? '#f59e0b' : balance < -50 ? '#10b981' : '#8b5cf6';
  const BalanceIcon  = balance > 50 ? TrendingUp : balance < -50 ? TrendingDown : Minus;
  const calPct = Math.min(100, macroTargets.calories ? Math.round((consumed.calories / macroTargets.calories) * 100) : 0);

  const mealBarData = useMemo(() =>
    todayLog.map(l => ({
      name: l.name.length > 12 ? l.name.slice(0, 11) + '…' : l.name,
      calories: Number(l.calories || 0),
    })),
  [todayLog]);

  const weeklyHistory = useMemo(() => {
    const days = [];
    for (let i = historyDays - 1; i >= 0; i--) {
      const d  = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
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

  return (
    <div className="fade-in module-page">
      <PageHeader accent="Nutrition" icon={<Apple size={24} />}
        title="Fueling Strategy" subtitle="Per-meal logging · Dynamic BMR · Live macro targets." />

      {/* ── BMR Calculator (live) ─────────────────────────────────────── */}
      <div className="glass-card mb-lg" style={{ borderTop: '2px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <Calculator size={18} color="var(--accent)" />
          <span className="card-title" style={{ margin: 0 }}>Macro Calculator</span>
          <span style={{
            marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-3)',
            background: 'var(--bg-elevated)', borderRadius: 99, padding: '2px 8px',
          }}>Updates live ↻</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Age', value: calcAge, onChange: setCalcAge, type: 'number', min: 10, max: 100, flex: '1 1 70px' },
            { label: 'Wt (kg)', value: calcWeight, onChange: setCalcWeight, type: 'number', min: 30, max: 300, flex: '1 1 80px' },
            { label: 'Ht (cm)', value: calcHeight, onChange: setCalcHeight, type: 'number', min: 100, max: 250, flex: '1 1 80px' },
          ].map(f => (
            <div key={f.label} style={{ flex: f.flex }}>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>{f.label}</label>
              <input className="form-input" type={f.type} min={f.min} max={f.max}
                     value={f.value} onChange={e => f.onChange(e.target.value)} />
            </div>
          ))}
          <div style={{ flex: '1 1 70px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Gender</label>
            <select className="form-input" value={calcGender} onChange={e => setCalcGender(e.target.value)}>
              <option value="M">Male</option><option value="F">Female</option>
            </select>
          </div>
          <div style={{ flex: '2 1 150px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Activity Level</label>
            <select className="form-input" value={calcActivity} onChange={e => setCalcActivity(e.target.value)}>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Goal</label>
            <select className="form-input" value={calcGoal} onChange={e => setCalcGoal(e.target.value)}>
              <option value="cut">Cut (fat loss)</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>
        </div>

        {/* Live target strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem', marginTop: '1rem',
        }}>
          {[
            { label: 'BMR',        value: `${macroTargets.bmr} kcal`,      color: 'var(--text-2)' },
            { label: 'TDEE (Goal)',value: `${macroTargets.calories} kcal`, color: 'var(--accent)' },
            { label: 'Protein',    value: `${macroTargets.protein}g`,      color: MACRO_COLORS.protein },
            { label: 'Carbs',      value: `${macroTargets.carbs}g`,        color: MACRO_COLORS.carbs },
            { label: 'Fat',        value: `${macroTargets.fat}g`,          color: MACRO_COLORS.fat },
          ].map(t => (
            <div key={t.label} style={{
              padding: '0.7rem 0.5rem', background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)', textAlign: 'center',
            }}>
              <p className="label-caps" style={{ fontSize: '0.58rem', marginBottom: '4px' }}>{t.label}</p>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: t.color }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BMR Breakdown ─────────────────────────────────────────────── */}
      <div className="mb-lg">
        <BMRBreakdown
          weight={calcWeight} height={calcHeight} age={calcAge}
          gender={calcGender} activity={calcActivity} goal={calcGoal}
          targets={macroTargets}
        />
      </div>

      {/* ── Daily Progress: calorie card + macro bars + rings ─────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem', marginBottom: '1.5rem',
      }}>
        {/* Calorie card */}
        <div className="glass-card" style={{ borderTop: `3px solid ${balanceColor}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p className="label-caps">Daily Calories</p>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.68rem', fontWeight: 800, color: balanceColor,
              background: `${balanceColor}1a`, borderRadius: 99, padding: '2px 8px',
            }}>
              <BalanceIcon size={11} />
              {balanceLabel}{balance !== 0 && ` ${balance > 0 ? '+' : ''}${balance} kcal`}
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
            {consumed.calories}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginLeft: '6px' }}>
              / {macroTargets.calories} kcal
            </span>
          </p>
          <div style={{
            height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)',
            overflow: 'hidden', marginTop: '0.75rem',
          }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${calPct}%`,
              background: `linear-gradient(90deg, var(--accent), ${balanceColor})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{calPct}% of target</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
              {Math.max(0, macroTargets.calories - consumed.calories)} remaining
            </span>
          </div>
        </div>

        {/* Macro progress bars */}
        <div className="glass-card">
          <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Macro Targets Today</p>
          <MacroProgressBar label="Protein" consumed={Math.round(consumed.protein)} target={macroTargets.protein} color={MACRO_COLORS.protein} />
          <MacroProgressBar label="Carbs"   consumed={Math.round(consumed.carbs)}   target={macroTargets.carbs}   color={MACRO_COLORS.carbs}   />
          <MacroProgressBar label="Fat"     consumed={Math.round(consumed.fat)}     target={macroTargets.fat}     color={MACRO_COLORS.fat}     />
        </div>

        {/* 3-part animated ring chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="label-caps mb-sm" style={{ alignSelf: 'flex-start' }}>Today's Macro Split</p>
          {todayLog.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                          justifyContent: 'center', gap: '8px', paddingBottom: '12px' }}>
              <div style={{ fontSize: '2rem', opacity: 0.25 }}>🍽️</div>
              <p className="empty-msg" style={{ fontSize: '0.78rem', margin: 0 }}>Log meals to see breakdown</p>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                          paddingRight: '56px', paddingTop: '8px', paddingBottom: '8px' }}>
              <MacroRings
                proteinPct={macroTargets.protein ? (consumed.protein / macroTargets.protein) * 100 : 0}
                carbsPct={macroTargets.carbs   ? (consumed.carbs   / macroTargets.carbs)   * 100 : 0}
                fatPct={macroTargets.fat       ? (consumed.fat     / macroTargets.fat)     * 100 : 0}
                consumed={consumed}
                targets={macroTargets}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Log Meal + Today's Log ─────────────────────────────────────── */}
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
              onChange={e => setLogForm({ ...logForm, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addLog()}
              className="form-input" />
            <div className="flex-row gap-sm">
              <input type="number" placeholder="Calories" value={logForm.calories}
                onChange={e => setLogForm({ ...logForm, calories: e.target.value })}
                className="form-input" min="0" />
              <input type="number" placeholder="Protein (g)" value={logForm.protein_g}
                onChange={e => setLogForm({ ...logForm, protein_g: e.target.value })}
                className="form-input" min="0" />
            </div>
            <div className="flex-row gap-sm">
              <input type="number" placeholder="Carbs (g)" value={logForm.carbs_g}
                onChange={e => setLogForm({ ...logForm, carbs_g: e.target.value })}
                className="form-input" min="0" />
              <input type="number" placeholder="Fat (g)" value={logForm.fat_g}
                onChange={e => setLogForm({ ...logForm, fat_g: e.target.value })}
                className="form-input" min="0" />
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

      {/* ── Per-meal calorie bar chart ─────────────────────────────────── */}
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

      {/* ── Weekly Calorie History (Area Chart) ───────────────────────── */}
      <div className="glass-card mb-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Calorie History</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setHistoryDays(d)}
                className={`btn-sm ${historyDays === d ? 'active' : ''}`}
                style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 160, marginBottom: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kcal`, 'Calories']} />
              <Area type="monotone" dataKey="calories" stroke="var(--accent)" fill="url(#calGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Meals', 'Calories', 'Protein', 'Carbs', 'Fat', 'Balance'].map(h => (
                  <th key={h} style={{
                    padding: '0.5rem 0.6rem',
                    textAlign: ['Date', 'Meals'].includes(h) ? 'left' : 'right',
                    color: 'var(--text-3)', fontWeight: 700, fontSize: '0.7rem',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyHistory.map((row) => {
                const bal   = row.calories - macroTargets.calories;
                const bCol  = bal > 50 ? '#f59e0b' : bal < -50 ? '#10b981' : 'var(--text-3)';
                const noData = row.count === 0;
                return (
                  <tr key={row.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: noData ? 0.4 : 1 }}>
                    <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: '0.45rem 0.6rem', color: 'var(--text-3)' }}>{row.count}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{row.calories || '—'}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: MACRO_COLORS.protein }}>{row.protein ? `${row.protein}g` : '—'}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: MACRO_COLORS.carbs }}>{row.carbs ? `${row.carbs}g` : '—'}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: MACRO_COLORS.fat }}>{row.fat ? `${row.fat}g` : '—'}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 800, color: bCol, fontSize: '0.75rem' }}>
                      {row.count ? (bal > 0 ? `+${bal}` : bal === 0 ? '•' : bal) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recommended Meal Plan (from profile) ─────────────────────── */}
      {meals.length > 0 && (
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
                    <li key={i}><span style={{ color: 'var(--accent)' }}>•</span> {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bone Health ─────────────────────────────────────────────────── */}
      <div className="glass-card">
        <div className="card-header-row mb-sm">
          <span style={{ fontSize: '1.25rem' }}>🦴</span>
          <span className="card-title" style={{ margin: 0 }}>Bone Health &amp; Calcium Guide</span>
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
              <ul>{section.items.map((item, j) => <li key={j}>• {item}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
