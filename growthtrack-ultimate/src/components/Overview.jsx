import React, { useEffect, useState, useMemo } from 'react';
import useStore from '../store/useStore';
import {
  Sun, Cloud, CloudRain, Zap, Wind, Droplets, Eye, Thermometer,
  CheckSquare, Target, Flame, TrendingUp, Activity, Clock, Star,
  ChevronRight, AlertTriangle, Moon, CloudSnow, CloudLightning,
} from 'lucide-react';

// Open-Meteo weather codes → human-readable
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
          <p className={`text-2xl font-bold ${color}`}>{value ?? '–'}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon size={18} className={`${color} opacity-60 group-hover:opacity-100 transition mt-0.5`} />}
      </div>
    </button>
  );
}

export default function Overview() {
  const setActiveTab = useStore(s => s.setActiveTab);

  // Live data from store
  const tasks        = useStore(s => s.user?.tasks);
  const goals        = useStore(s => s.goals) || [];
  const habits       = useStore(s => s.habits) || [];
  const habitLogs    = useStore(s => s.habitLogsByHabit) || {};
  const moodLogs     = useStore(s => s.moodLogs) || [];
  const finance      = useStore(s => s.finance) || { transactions: [], budgets: [] };
  const sleep_logs   = useStore(s => s.sleep_logs) || [];
  const metric_logs  = useStore(s => s.metric_logs) || [];

  const today = new Date().toISOString().slice(0, 10);

  // Task stats
  const pendingTasks  = tasks?.pending?.length || 0;
  const overdueTasks  = (tasks?.pending || []).filter(t => t.dueDate && t.dueDate < today).length;

  // Goal stats
  const activeGoals   = goals.filter(g => g.status === 'active').length;

  // Habit stats — done today
  const habitsDoneToday = habits.filter(h => {
    const logs = habitLogs[h.id] || [];
    return logs.some(l => l.date === today);
  }).length;

  // Mood streak
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

  // Latest weight from metric_logs
  const lastWeight = useMemo(() => {
    const wLogs = metric_logs.filter(l => l.type === 'weight').sort((a, b) => b.logged_at?.localeCompare(a.logged_at));
    return wLogs[0]?.value ?? null;
  }, [metric_logs]);

  // Last night sleep
  const lastSleep = sleep_logs[0];

  // Monthly spend
  const monthlySpend = useMemo(() => {
    const thisMonth = today.slice(0, 7);
    return finance.transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(thisMonth))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [finance.transactions, today]);

  // Weather
  const [weather, setWeather] = useState(null);
  const [weatherErr, setWeatherErr] = useState(false);

  useEffect(() => {
    // Sivanmalai, Tamil Nadu
    const lat = 11.0168, lon = 77.4059;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index,apparent_temperature` +
      `&timezone=Asia%2FKolkata`
    )
      .then(r => r.json())
      .then(data => setWeather(data.current))
      .catch(() => setWeatherErr(true));
  }, []);

  const wCode = weather?.weather_code;
  const wCondition = WMO_CODES[wCode] ?? 'Unknown';

  // Time greeting
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
            <h1 className="text-3xl font-bold text-white mt-0.5">
              {useStore.getState().user?.name || 'Gokul'} ⚡
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Weather card */}
          <div className="flex-shrink-0 text-right">
            {weather ? (
              <>
                <div className="flex items-center gap-1.5 justify-end">
                  <WeatherIcon code={wCode} size={20} />
                  <span className="text-2xl font-bold text-white">{Math.round(weather.temperature_2m)}°C</span>
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
              <p className="text-xs text-gray-500 animate-pulse">Loading weather…</p>
            )}
          </div>
        </div>
      </div>

      {/* Live stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Pending Tasks"
          value={pendingTasks}
          sub={overdueTasks > 0 ? `${overdueTasks} overdue` : 'all on time'}
          icon={CheckSquare}
          color={overdueTasks > 0 ? 'text-red-400' : 'text-amber-400'}
          onClick={() => setActiveTab('tasks')}
        />
        <StatCard
          label="Active Goals"
          value={activeGoals}
          sub={`${goals.length} total`}
          icon={Target}
          color="text-purple-400"
          onClick={() => setActiveTab('goals')}
        />
        <StatCard
          label="Habits Today"
          value={`${habitsDoneToday}/${habits.length}`}
          sub={habits.length > 0 ? `${Math.round((habitsDoneToday / habits.length) * 100)}% done` : 'no habits'}
          icon={Flame}
          color="text-orange-400"
          onClick={() => setActiveTab('habits')}
        />
        <StatCard
          label="Mood Streak"
          value={moodStreak}
          sub={moodStreak > 0 ? 'days logged' : 'start logging'}
          icon={Activity}
          color="text-pink-400"
          onClick={() => setActiveTab('mind')}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {lastWeight && (
          <StatCard
            label="Last Weight"
            value={`${lastWeight} kg`}
            sub="from metric log"
            icon={TrendingUp}
            color="text-blue-400"
            onClick={() => setActiveTab('progress')}
          />
        )}
        {lastSleep && (
          <StatCard
            label="Last Sleep"
            value={`${lastSleep.hours}h`}
            sub={lastSleep.quality ? `Quality: ${lastSleep.quality}/5` : lastSleep.date}
            icon={Moon}
            color="text-indigo-400"
            onClick={() => setActiveTab('sleep')}
          />
        )}
        <StatCard
          label="Month Spend"
          value={monthlySpend > 0 ? `₹${monthlySpend.toLocaleString('en-IN')}` : '₹0'}
          sub={new Date().toLocaleString('en-IN', { month: 'long' })}
          icon={TrendingUp}
          color="text-emerald-400"
          onClick={() => setActiveTab('finance')}
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-3">Quick Navigate</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { id: 'tasks',    label: 'Tasks',    color: 'text-amber-400' },
            { id: 'goals',    label: 'Goals',    color: 'text-purple-400' },
            { id: 'habits',   label: 'Habits',   color: 'text-orange-400' },
            { id: 'finance',  label: 'Finance',  color: 'text-emerald-400' },
            { id: 'training', label: 'Training', color: 'text-blue-400' },
            { id: 'mind',     label: 'Wellness', color: 'text-pink-400' },
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

      {/* Overdue task alert */}
      {overdueTasks > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-300 font-semibold">{overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-400/70 mt-0.5">Check the Tasks tab to catch up.</p>
          </div>
          <button onClick={() => setActiveTab('tasks')} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">Go →</button>
        </div>
      )}
    </div>
  );
}
