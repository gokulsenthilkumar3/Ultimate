import React, { useState, useMemo } from 'react';
import useStore, { selectMoodLogs, selectAddMoodLog } from '../store/useStore';
import { Brain, Smile, Frown, Meh, Zap, Moon, Heart, Wind, Plus, TrendingUp } from 'lucide-react';

const MOODS = [
  { value: 5, label: 'Excellent', icon: '😄', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
  { value: 4, label: 'Good',      icon: '😊', color: 'text-green-400',   bg: 'bg-green-500/20 border-green-500/40' },
  { value: 3, label: 'Neutral',   icon: '😐', color: 'text-yellow-400',  bg: 'bg-yellow-500/20 border-yellow-500/40' },
  { value: 2, label: 'Low',       icon: '😔', color: 'text-orange-400',  bg: 'bg-orange-500/20 border-orange-500/40' },
  { value: 1, label: 'Rough',     icon: '😞', color: 'text-red-400',     bg: 'bg-red-500/20 border-red-500/40' },
];

const ENERGY_LEVELS = [
  { value: 3, label: 'High',    color: 'bg-emerald-500' },
  { value: 2, label: 'Medium',  color: 'bg-yellow-500' },
  { value: 1, label: 'Low',     color: 'bg-red-500' },
];

const TAGS = ['focused', 'anxious', 'calm', 'motivated', 'tired', 'grateful', 'irritable', 'creative', 'stressed', 'happy'];

function getMoodStreakCount(logs) {
  if (!logs.length) return 0;
  const logSet = new Set(logs.map(l => l.date));
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!logSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getLast14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const MOOD_BAR_H = 48;

export default function MindWellness() {
  const moodLogs   = useStore(selectMoodLogs);
  const addMoodLog = useStore(selectAddMoodLog);
  const wellnessData = useStore(s => s.wellnessData) || {};

  const today = new Date().toISOString().slice(0, 10);
  const todayLog = moodLogs.find(l => l.date === today);

  const [mood, setMood]     = useState(todayLog?.mood || null);
  const [energy, setEnergy] = useState(todayLog?.energy || null);
  const [note, setNote]     = useState(todayLog?.note || '');
  const [tags, setTags]     = useState(todayLog?.tags || []);
  const [saved, setSaved]   = useState(!!todayLog);

  const streak = useMemo(() => getMoodStreakCount(moodLogs), [moodLogs]);
  const last14 = useMemo(() => getLast14Days(), []);

  const logMap = useMemo(() => {
    const m = {};
    moodLogs.forEach(l => { m[l.date] = l; });
    return m;
  }, [moodLogs]);

  const avgMood = useMemo(() => {
    if (!moodLogs.length) return null;
    const recent = moodLogs.slice(0, 7);
    return (recent.reduce((s, l) => s + (l.mood || 0), 0) / recent.length).toFixed(1);
  }, [moodLogs]);

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    if (!mood) return;
    await addMoodLog({ date: today, mood, energy, note, tags });
    setSaved(true);
  };

  const moodLabel = MOODS.find(m => m.value === mood);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain size={22} className="text-purple-400" /> Mind & Wellness
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Daily mood · energy · mindset check-in</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-400">{streak}</p>
          <p className="text-xs text-gray-500">day streak 🔥</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{streak}</p>
          <p className="text-xs text-gray-400 mt-0.5">Log Streak</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{avgMood ?? '–'}</p>
          <p className="text-xs text-gray-400 mt-0.5">7-day Avg Mood</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{moodLogs.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total Logs</p>
        </div>
      </div>

      {/* 14-day mini bar chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5"><TrendingUp size={12}/> 14-Day Mood Trend</p>
        <div className="flex items-end gap-1" style={{ height: `${MOOD_BAR_H + 16}px` }}>
          {last14.map(d => {
            const log = logMap[d];
            const h = log ? Math.round((log.mood / 5) * MOOD_BAR_H) : 0;
            const colors = [
              '', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'
            ];
            return (
              <div key={d} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${d}: ${log ? MOODS.find(m=>m.value===log.mood)?.label || log.mood : 'no log'}`}>
                <div
                  className={`w-full rounded-t transition-all ${
                    log ? colors[log.mood] || 'bg-purple-500' : 'bg-white/5'
                  } ${d === today ? 'ring-1 ring-amber-400 ring-offset-1 ring-offset-transparent' : ''}`}
                  style={{ height: `${h || 3}px` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{last14[0].slice(5)}</span><span>Today</span>
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {MOODS.map(m => (
            <span key={m.value} className={`text-xs flex items-center gap-1 ${m.color}`}>
              {m.icon} {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Today's check-in */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Today's Check-in</p>
          {saved && <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Logged ✓</span>}
        </div>

        {/* Mood picker */}
        <div>
          <p className="text-xs text-gray-400 mb-2">How are you feeling?</p>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => { setMood(m.value); setSaved(false); }}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition ${
                  mood === m.value ? m.bg + ' ring-1 ring-offset-1 ring-offset-transparent ring-white/20' : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <span className="text-lg">{m.icon}</span>
                <span className={`text-xs font-medium ${mood === m.value ? m.color : 'text-gray-500'}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Energy level */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Energy level</p>
          <div className="flex gap-2">
            {ENERGY_LEVELS.map(e => (
              <button
                key={e.value}
                onClick={() => { setEnergy(e.value); setSaved(false); }}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                  energy === e.value ? 'border-white/30 text-white bg-white/10' : 'border-white/10 text-gray-500 hover:border-white/20'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${e.color}`} />
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Tags (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map(t => (
              <button
                key={t}
                onClick={() => { toggleTag(t); setSaved(false); }}
                className={`px-2.5 py-1 rounded-full text-xs border transition capitalize ${
                  tags.includes(t) ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-gray-500 hover:border-white/20'
                }`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Note (optional)</p>
          <textarea
            rows={2}
            placeholder="What's on your mind today?"
            value={note}
            onChange={e => { setNote(e.target.value); setSaved(false); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!mood || saved}
          className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
        >
          {saved ? '✓ Logged for today' : 'Log Mood'}
        </button>
      </div>

      {/* Recent logs */}
      {moodLogs.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">Recent Logs</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {moodLogs.slice(0, 20).map((log, i) => {
              const m = MOODS.find(m => m.value === log.mood);
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-xl">{m?.icon || '❓'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${m?.color || 'text-gray-400'}`}>{m?.label}</span>
                      {log.energy && (
                        <span className="text-xs text-gray-500">· Energy {log.energy === 3 ? 'High' : log.energy === 2 ? 'Med' : 'Low'}</span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto">{log.date}</span>
                    </div>
                    {log.tags?.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {log.tags.map(t => (
                          <span key={t} className="text-xs text-purple-400/70 bg-purple-500/10 px-1.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    {log.note && <p className="text-xs text-gray-500 mt-0.5 truncate">{log.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
