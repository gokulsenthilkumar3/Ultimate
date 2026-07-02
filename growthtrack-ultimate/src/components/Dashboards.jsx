import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { Layout, TrendingUp, Zap, Activity, Heart, Brain, DollarSign, Target, CheckCircle2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import useStore from '../store/useStore';

const TOOLTIP_STYLE = { 
  background: 'var(--bg-glass)', 
  border: '1px solid var(--border)', 
  borderRadius: '12px', 
  color: 'var(--text-1)', 
  backdropFilter: 'blur(12px)',
  fontSize: '0.8rem'
};

export default function Dashboards() {
  const user = useStore(state => state.user);
  const logs = useStore(state => state.metric_logs) || [];
  const sleepLogs = useStore(s => s.sleep_logs) || [];
  const habitLogs = useStore(s => s.habit_logs) || [];

  const handleExport = (id, filename) => {
    const el = document.getElementById(id);
    if (!el) return;
    html2canvas(el, { backgroundColor: '#121212' }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  // ── Derived real KPIs ─────────────────────────────────────────────────────
  const latestLog = logs[0] || {};
  const prevLog   = logs[1] || {};

  // Core Efficiency: avg of sleep quality + (habit consistency for today)
  const recent7 = logs.slice(0, 7);
  const avgSleep = recent7.length
    ? (recent7.reduce((a, l) => a + (parseFloat(l.sleep) || 0), 0) / recent7.length)
    : 0;
  const avgQuality = sleepLogs.length
    ? Math.round(sleepLogs.slice(0, 7).reduce((a, l) => a + (l.quality || 0), 0) / Math.min(sleepLogs.length, 7))
    : 0;
  const coreEfficiency = avgSleep > 0
    ? Math.min(100, Math.round((avgSleep / 8) * 70 + (avgQuality / 10) * 30)).toFixed(1)
    : null;

  // Growth velocity: weight delta over last 14 days
  const recentWeightLogs = logs.filter(l => l.weight).slice(0, 14);
  const weightDelta = recentWeightLogs.length >= 2
    ? (recentWeightLogs[0].weight - recentWeightLogs[recentWeightLogs.length - 1].weight)
    : null;
  const growthVel = weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}kg / 2Wk` : null;

  // Cardiac Reserve: based on resting HR
  const rhr = latestLog.resting_hr;
  const cardiacLabel = rhr ? (rhr < 60 ? 'Elite' : rhr < 72 ? 'Optimal' : rhr < 85 ? 'Fair' : 'Needs Work') : null;

  // Radar data wired from real domain scores
  const strengthScore = recentWeightLogs.length ? Math.min(100, Math.round(((latestLog.weight || 60) / 90) * 100)) : 85;
  const vascularScore = latestLog.resting_hr ? Math.min(100, Math.round(((100 - latestLog.resting_hr) / 40) * 100)) : 60;
  const recoveryScore = avgQuality ? Math.round((avgQuality / 10) * 100) : 90;
  const endurScore    = latestLog.vo2max ? Math.min(100, Math.round((latestLog.vo2max / 55) * 100)) : 45;
  const cognitiveScore = latestLog.stress ? Math.min(100, Math.round(100 - latestLog.stress * 10)) : 72;
  const mobilityScore = latestLog.flexibility ?? 55;

  const radarData = [
    { subject: 'Strength',  A: strengthScore, fullMark: 100 },
    { subject: 'Cognitive', A: cognitiveScore, fullMark: 100 },
    { subject: 'Vascular',  A: vascularScore,  fullMark: 100 },
    { subject: 'Endurance', A: endurScore,      fullMark: 100 },
    { subject: 'Recovery',  A: recoveryScore,  fullMark: 100 },
    { subject: 'Mobility',  A: mobilityScore,  fullMark: 100 },
  ];

  const correlationData = logs.slice(0, 10).map(l => ({
    date: l.date,
    sleep: l.sleep,
    stress: l.stress || 5,
    weight: l.weight
  })).reverse();

  const financeState = useStore(s => s.finance) || { transactions: [] };
  const financeTxs = financeState.transactions || [];
  const financeData = financeTxs.reduce((acc, curr) => {
    const month = curr.date.substring(0, 7);
    if (!acc[month]) acc[month] = { month, income: 0, expense: 0 };
    if (curr.type === 'income') acc[month].income += curr.amount;
    else if (curr.type === 'expense') acc[month].expense += curr.amount;
    return acc;
  }, {});
  const financeChartData = Object.values(financeData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  const habitData = habitLogs.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = { date: curr.date, completed: 0 };
    acc[curr.date].completed += 1;
    return acc;
  }, {});
  const habitChartData = Object.values(habitData).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const goalLogs = useStore(s => s.goal_progress_logs) || [];
  const goalData = goalLogs.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = { date: curr.date, progress: 0, count: 0 };
    acc[curr.date].progress += curr.value;
    acc[curr.date].count += 1;
    return acc;
  }, {});
  const goalChartData = Object.values(goalData).map(d => ({ date: d.date, progress: d.progress / d.count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Unified Analytics</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>Strategic Dashboards</h2>
          <p className="text-secondary">Cross-correlated telemetry and physiological modeling.</p>
        </div>
        <button className="btn-primary">
           <Layout size={18} /> CUSTOMIZE VIEW
        </button>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Bio-Balance Radar */}
        <div id="chart-radar" className="glass-card" style={{ height: '450px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Brain size={20} color="var(--accent)" />
                <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Physiological Balance</h3>
             </div>
             <button onClick={() => handleExport('chart-radar', 'physio-balance')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }} title="Export PNG">
               <Download size={16} />
             </button>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="var(--border-strong)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Current State"
                    dataKey="A"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.4}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
           </div>
           <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem' }}>
              Systemic balance across core biological domains.
           </p>
        </div>

        {/* Sleep vs Stress Correlation */}
        <div id="chart-recovery" className="glass-card" style={{ height: '450px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={20} color="var(--accent)" />
                <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Recovery Correlation</h3>
             </div>
             <button onClick={() => handleExport('chart-recovery', 'recovery-correlation')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }} title="Export PNG">
               <Download size={16} />
             </button>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={correlationData}>
                  <defs>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="var(--text-3)" fontSize={10} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="sleep" stroke="var(--accent)" fillOpacity={1} fill="url(#colorSleep)" strokeWidth={3} name="Sleep (Hrs)" />
                  <Line type="monotone" dataKey="stress" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} name="Stress Index" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
           <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem' }}>
              Tracking the inverse relationship between sleep quality and cortisol markers.
           </p>
        </div>

        {/* Finance Flow */}
        <div id="chart-finance" className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DollarSign size={20} color="var(--success)" />
                <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Cash Flow (6M)</h3>
             </div>
             <button onClick={() => handleExport('chart-finance', 'cash-flow')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }} title="Export PNG">
               <Download size={16} />
             </button>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-3)" fontSize={10} />
                  <YAxis stroke="var(--text-3)" fontSize={10} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Habit Consistency */}
        <div id="chart-habit" className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="var(--info)" />
                <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Habit Consistency (14D)</h3>
             </div>
             <button onClick={() => handleExport('chart-habit', 'habit-consistency')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }} title="Export PNG">
               <Download size={16} />
             </button>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={habitChartData}>
                  <defs>
                    <linearGradient id="colorHabit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="var(--text-3)" fontSize={10} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="completed" stroke="var(--info)" fillOpacity={1} fill="url(#colorHabit)" strokeWidth={3} name="Completed Habits" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Goal Progress velocity */}
        <div id="chart-goal" className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1', position: 'relative' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Target size={20} color="var(--warning)" />
                <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Goal Progress Velocity</h3>
             </div>
             <button onClick={() => handleExport('chart-goal', 'goal-velocity')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }} title="Export PNG">
               <Download size={16} />
             </button>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="var(--text-3)" fontSize={10} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="progress" stroke="var(--warning)" strokeWidth={3} dot={{ r: 4 }} name="Avg Progress Added" />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
         <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Zap size={24} color="var(--accent)" />
            </div>
            <div>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Core Efficiency</p>
               <p className="text-display" style={{ fontSize: '1.5rem' }}>
                 {coreEfficiency != null ? `${coreEfficiency}%` : '—'}
               </p>
               <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>Sleep × recovery score</p>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <TrendingUp size={24} color="var(--success)" />
            </div>
            <div>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Growth Velocity</p>
               <p className="text-display" style={{ fontSize: '1.5rem' }}>
                 {growthVel ?? '—'}
               </p>
               <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>Weight delta · 14-day window</p>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Heart size={24} color="#f43f5e" />
            </div>
            <div>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Cardiac Reserve</p>
               <p className="text-display" style={{ fontSize: '1.5rem' }}>
                 {cardiacLabel ?? (rhr ? `${rhr} BPM` : '—')}
               </p>
               <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>{rhr ? `Resting HR: ${rhr} BPM` : 'Log resting HR in Metrics'}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
