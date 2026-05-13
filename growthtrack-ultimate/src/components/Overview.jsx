import React, { useEffect, useState, useMemo } from 'react';
import useStore from '../store/useStore';
import {
  Sun, Cloud, CloudRain, Zap, Wind, Droplets, Eye, Thermometer,
  CheckSquare, Target, Flame, TrendingUp, Activity, Clock, Star,
  ChevronRight, AlertTriangle, Moon, CloudSnow, CloudLightning, Heart,
  Bell, Utensils,
} from 'lucide-react';

const WMO_CODES = {
  0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Rain Showers', 81: 'Heavy Showers', 82: 'Violent Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Heavy Thunderstorm',
};

function WeatherIcon({ code, size = 20 }) {
  if (!code && code !== 0) return <Sun size={size} className="text-yellow-400" />;
  if (code === 0 || code === 1) return <Sun size={size} className="text-yellow-400" />;
  if (code === 2 || code === 3) return <Cloud size={size} className="text-gray-400" />;
  if (code >= 51 && code <= 67) return <CloudRain size={size} className="text-blue-400" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className="text-blue-200" />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className="text-blue-500" />;
  if (code >= 95) return <CloudLightning size={size} className="text-purple-400" />;
  return <Cloud size={size} className="text-gray-400" />;
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-amber-400', onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/8 transition group w-full"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value ?? '\u2013'}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon size={18} className={`${color} opacity-60 group-hover:opacity-100 transition mt-0.5`} />}
      </div>
    </button>
  );
}

function useHealthScore({ habitsDoneToday, habitsTotal, moodStreak, lastSleep, lastWeight, activeGoals }) {
  return useMemo(() => {
    let score = 0;
    let factors = 0;
    if (habitsTotal > 0) { score += Math.round((habitsDoneToday / habitsTotal) * 25); factors++; }
    if (moodStreak > 0) { score += Math.min(20, Math.round((moodStreak / 7) * 20)); factors++; }
    if (lastSleep) {
      const hrs = parseFloat(lastSleep.duration || lastSleep.hours || 0);
      const q = Number(lastSleep.quality || 5);
      score += Math.round(Math.min(1, hrs / 8) * 15) + Math.round((q / 10) * 10);
      factors++;
    }
    if (lastWeight) { score += 10; factors++; }
    if (activeGoals > 0) { score += Math.min(20, activeGoals * 4); factors++; }
    if (factors === 0) return null;
    return Math.min(100, score);
  }, [habitsDoneToday, habitsTotal, moodStreak, lastSleep, lastWeight, activeGoals]);
}

// ── Generate top-3 local alerts for mini-feed ──
function useTodayAlerts(user, habits, habitLogs, goals) {
  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const alerts = [];

    // Missed habits
    (habits || []).forEach(h => {
      const logs = habitLogs[h.id] || [];
      const doneToday = logs.some(l => l.date === today);
      if (!doneToday) {
        const streak = h.streak || h.current_streak || 0;
        alerts.push({
          id: `h-${h.id}`,
          type: 'habit',
          emoji: '\ud83d\udd25',
          color: 'text-orange-400',
          bg: 'bg-orange-500/10 border-orange-500/20',
          text: `Missed habit: ${h.name || h.title}${streak > 0 ? ` \u2014 ${streak}-day streak at risk` : ''}`,
          tab: 'habits',
        });
      }
    });

    // Overdue tasks
    (user?.tasks?.pending || []).forEach(t => {
      const due = t.dueDate || t.due_date;
      if (due && due < today) {
        const days = Math.ceil((new Date(today) - new Date(due)) / 86400000);
        alerts.push({
          id: `t-${t.id || t.title}`,
          type: 'task',
          emoji: '\u23f0',
          color: 'text-red-400',
          bg: 'bg-red-500/10 border-red-500/20',
          text: `Overdue task: \u201c${t.title}\u201d (${days}d late)`,
          tab: 'tasks',
        });
      }
    });

    // Goal deadlines \u2264 7 days
    (goals || []).forEach(g => {
      if (g.status === 'completed') return;
      const dl = g.deadline || g.target_date;
      if (!dl) return;
      const daysLeft = Math.ceil((new Date(dl) - new Date(today)) / 86400000);
      if (daysLeft <= 7) {
        alerts.push({
          id: `g-${g.id}`,
          type: 'goal',
          emoji: '\ud83c\udfaf',
          color: 'text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/20',
          text: daysLeft < 0
            ? `Goal past deadline: \u201c${g.title}\u201d`
            : `Goal due in ${daysLeft}d: \u201c${g.title}\u201d`,
          tab: 'goals',
        });
      }
    });

    return alerts.slice(0, 3);
  }, [user, habits, habitLogs, goals]);
}

export default function Overview() {
  const setActiveTab = useStore(s => s.setActiveTab);
  const userName    = useStore(s => s.user?.name);
  const user        = useStore(s => s.user);
  const tasks       = useStore(s => s.user?.tasks);
  const goals       = useStore(s => s.goals) || [];
  const habits      = useStore(s => s.habits) || [];
  const habitLogs   = useStore(s => s.habitLogsByHabit) || {};
  const moodLogs    = useStore(s => s.moodLogs) || [];
  const finance     = useStore(s => s.finance) || { transactions: [], budgets: [] };
  const sleep_logs  = useStore(s => s.sleep_logs) || [];
  const metric_logs = useStore(s => s.metric_logs) || [];
  const nutrition   = useStore(s => s.nutrition_logs) || [];

  const today = new Date().toISOString().slice(0, 10);

  const pendingTasks  = tasks?.pending?.length || 0;
  const overdueTasks  = (tasks?.pending || []).filter(t => t.dueDate && t.dueDate < today).length;
  const activeGoals   = goals.filter(g => g.status === 'active').length;

  const habitsDoneToday = habits.filter(h => {
    const logs = habitLogs[h.id] || [];
    return logs.some(l => l.date === today);
  }).length;

  // Live calorie KPI from nutrition_logs
  const caloriesToday = useMemo(() => {
    return (nutrition || []).filter(l => (l.date || l.logged_at?.slice(0, 10)) === today)
      .reduce((s, l) => s + Number(l.calories || 0), 0);
  }, [nutrition, today]);

  const moodStreak = useMemo(() => {
    if (!moodLogs.length) return 0;
    const logSet = new Set(moodLogs.map(l => l.date));
    let streak = 0;
    let d = new Date();
    while (logSet.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [moodLogs]);

  const lastWeight = useMemo(() => {
    const wLogs = metric_logs.filter(l => l.type === 'weight').sort((a, b) => b.logged_at?.localeCompare(a.logged_at));
    return wLogs[0]?.value ?? null;
  }, [metric_logs]);

  const lastSleep = sleep_logs[0] || null;

  const monthlySpend = useMemo(() => {
    const thisMonth = today.slice(0, 7);
    return finance.transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(thisMonth))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [finance.transactions, today]);

  const healthScore = useHealthScore({ habitsDoneToday, habitsTotal: habits.length, moodStreak, lastSleep, lastWeight, activeGoals });
  const scoreColor = healthScore === null ? 'text-gray-500'
    : healthScore >= 75 ? 'text-emerald-400'
    : healthScore >= 50 ? 'text-amber-400'
    : 'text-red-400';

  // Today's Alerts mini-feed
  const todayAlerts = useTodayAlerts(user, habits, habitLogs, goals);

  const [weather, setWeather] = useState(null);
  const [weatherErr, setWeatherErr] = useState(false);

  useEffect(() => {
    const lat = 11.0168, lon = 77.4059;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index,apparent_temperature` +
      `&timezone=Asia%2FKolkata`
    ).then(r => r.json()).then(data => setWeather(data.current)).catch(() => setWeatherErr(true));
  }, []);

  const wCode = weather?.weather_code;
  const wCondition = WMO_CODES[wCode] ?? 'Unknown';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Hero greeting */}
      <div className="relative bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.08),transparent)] pointer-events-none" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm">{greeting},</p>
            <h1 className="text-3xl font-bold text-white mt-0.5">{userName || 'Operator'} \u26a1</h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {healthScore !== null && (
              <div className="flex items-center gap-2 mt-2">
                <Heart size={14} className={scoreColor} />
                <span className={`text-sm font-bold ${scoreColor}`}>Health Score: {healthScore}/100</span>
                <span className="text-xs text-gray-500">
                  {healthScore >= 75 ? '\u2014 Great' : healthScore >= 50 ? '\u2014 Moderate' : '\u2014 Needs attention'}
                </span>
              </div>
            )}
          </div>

          {/* Weather */}
          <div className="flex-shrink-0 text-right">
            {weather ? (
              <>
                <div className="flex items-center gap-1.5 justify-end">
                  <WeatherIcon code={wCode} size={20} />
                  <span className="text-2xl font-bold text-white">{Math.round(weather.temperature_2m)}\u00b0C</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{wCondition}</p>
                <p className="text-xs text-gray-500">Sivanmalai, TN</p>
                <div className="flex gap-2 mt-1.5 justify-end text-xs text-gray-500">
                  <span className="flex items-center gap-0.5"><Droplets size={10}/> {weather.relative_humidity_2m}%</span>
                  <span className="flex items-center gap-0.5"><Wind size={10}/> {Math.round(weather.wind_speed_10m)} km/h</span>
                  <span className="flex items-center gap-0.5"><Eye size={10}/> UV {Math.round(weather.uv_index ?? 0)}</span>
                </div>
              </>
            ) : weatherErr ? (
              <p className="text-xs text-gray-500">Weather unavailable</p>
            ) : (
              <p className="text-xs text-gray-500 animate-pulse">Loading weather\u2026</p>
            )}
          </div>
        </div>
      </div>

      {/* Live stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending Tasks" value={pendingTasks}
          sub={overdueTasks > 0 ? `${overdueTasks} overdue` : 'all on time'}
          icon={CheckSquare} color={overdueTasks > 0 ? 'text-red-400' : 'text-amber-400'}
          onClick={() => setActiveTab('tasks')} />
        <StatCard label="Active Goals" value={activeGoals}
          sub={`${goals.length} total`} icon={Target} color="text-purple-400"
          onClick={() => setActiveTab('goals')} />
        <StatCard label="Habits Today" value={`${habitsDoneToday}/${habits.length}`}
          sub={habits.length > 0 ? `${Math.round((habitsDoneToday / habits.length) * 100)}% done` : 'no habits'}
          icon={Flame} color="text-orange-400" onClick={() => setActiveTab('habits')} />
        <StatCard label="Mood Streak" value={moodStreak}
          sub={moodStreak > 0 ? 'days logged' : 'start logging'}
          icon={Activity} color="text-pink-400" onClick={() => setActiveTab('mind')} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* NEW: live calories today */}
        <StatCard label="Calories Today" value={caloriesToday > 0 ? caloriesToday.toLocaleString() : '0'}
          sub="kcal logged" icon={Utensils} color="text-lime-400"
          onClick={() => setActiveTab('nutrition')} />
        {lastWeight && (
          <StatCard label="Last Weight" value={`${lastWeight} kg`} sub="from metric log"
            icon={TrendingUp} color="text-blue-400" onClick={() => setActiveTab('progress')} />
        )}
        {lastSleep && (
          <StatCard
            label="Last Sleep"
            value={`${lastSleep.hours || parseFloat(lastSleep.duration || 0).toFixed(1)}h`}
            sub={lastSleep.quality ? `Quality: ${lastSleep.quality}/10` : lastSleep.date}
            icon={Moon} color="text-indigo-400" onClick={() => setActiveTab('sleep')} />
        )}
        <StatCard label="Month Spend"
          value={monthlySpend > 0 ? `\u20b9${monthlySpend.toLocaleString('en-IN')}` : '\u20b90'}
          sub={new Date().toLocaleString('en-IN', { month: 'long' })}
          icon={TrendingUp} color="text-emerald-400" onClick={() => setActiveTab('finance')} />
      </div>

      {/* ── Today's Alerts mini-feed ── */}
      {todayAlerts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-gray-300">Today\u2019s Alerts</p>
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{todayAlerts.length}</span>
            </div>
            <button
              onClick={() => setActiveTab('notifications')}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >View all \u2192</button>
          </div>
          <div className="space-y-2">
            {todayAlerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${alert.bg}`}
              >
                <span className="text-base mt-0.5">{alert.emoji}</span>
                <p className={`text-xs flex-1 ${alert.color}`}>{alert.text}</p>
                <button
                  onClick={() => setActiveTab(alert.tab)}
                  className={`text-[10px] ${alert.color} hover:opacity-80 underline flex-shrink-0`}
                >Go \u2192</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick navigate */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-3">Quick Navigate</p>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {[
            { id: 'tasks',         label: 'Tasks',    color: 'text-amber-400' },
            { id: 'goals',         label: 'Goals',    color: 'text-purple-400' },
            { id: 'habits',        label: 'Habits',   color: 'text-orange-400' },
            { id: 'finance',       label: 'Finance',  color: 'text-emerald-400' },
            { id: 'training',      label: 'Training', color: 'text-blue-400' },
            { id: 'mind',          label: 'Wellness', color: 'text-pink-400' },
            { id: 'notifications', label: '\ud83d\udd14 Alerts', color: 'text-red-400' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
            >
              <ChevronRight size={14} className={item.color} />
              <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overdue task alert banner */}
      {overdueTasks > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-300 font-semibold">{overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-400/70 mt-0.5">Check the Tasks tab to catch up.</p>
          </div>
          <button onClick={() => setActiveTab('tasks')} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">Go \u2192</button>
        </div>
      )}
    </div>
  );
}
