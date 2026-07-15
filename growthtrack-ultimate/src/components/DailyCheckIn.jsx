import { Z_INDEX } from '../constants';
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Zap, Scale, X, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import useStore, { selectSaveSleepLog, selectAddMoodLog } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const MOODS = ['\ud83d\ude22', '\ud83d\ude15', '\ud83d\ude10', '\ud83d\ude0a', '\ud83d\ude01'];
const ENERGY = ['\ud83e\udeb4', '\ud83d\ude34', '\u26a1', '\ud83d\udd25', '\ud83d\ude80'];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DailyCheckIn({ onClose }) {
  const toast = useToast();
  const setLastCheckIn  = useStore(s => s.setLastCheckIn);
  const user            = useStore(s => s.user);
  const setUser         = useStore(s => s.setUser);
  const habits          = useStore(s => s.habits) || [];
  const habitLogsByHabit = useStore(s => s.habitLogsByHabit) || {};
  const saveSleepLog    = useStore(selectSaveSleepLog);
  const addMoodLog      = useStore(selectAddMoodLog);
  // metric logger bridge
  const addMetricLog    = useStore(s => s.addMetricLog || s.saveMetricLog);

  const [step, setStep]   = useState(0);
  const [data, setData]   = useState({
    sleep: 7, energy: 2, mood: 2, weight: user?.weight || '', note: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone]   = useState(false);

  // ── Streak protection: alert if any habits not done today & hour ≥ 20 ──
  const today = todayStr();
  const hour  = new Date().getHours();
  const atRiskHabits = habits.filter(h => {
    const logs = habitLogsByHabit[h.id] || [];
    return !logs.some(l => l.date === today);
  });
  const showStreakAlert = hour >= 20 && atRiskHabits.length > 0;

  const steps = [
    {
      key: 'sleep',
      title: 'How many hours did you sleep?',
      icon: <Moon size={28} color="var(--accent)" />,
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--accent)', margin: '1.5rem 0 0.5rem' }}>
            {data.sleep}h
          </div>
          <input type="range" min={0} max={12} step={0.5} value={data.sleep}
            onChange={e => setData(d => ({ ...d, sleep: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--accent)', marginTop: '0.5rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '4px' }}>
            <span>0h</span><span>6h</span><span>12h</span>
          </div>
        </div>
      ),
    },
    {
      key: 'energy',
      title: 'Energy level today?',
      icon: <Zap size={28} color="var(--accent)" />,
      content: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
          {ENERGY.map((e, i) => (
            <button key={i} onClick={() => setData(d => ({ ...d, energy: i }))}
              style={{
                fontSize: '2.5rem', background: 'none', border: 'none', cursor: 'pointer',
                transform: data.energy === i ? 'scale(1.4)' : 'scale(1)',
                filter: data.energy === i ? 'none' : 'grayscale(0.7) opacity(0.5)',
                transition: 'all 0.25s ease',
              }}
            >{e}</button>
          ))}
        </div>
      ),
    },
    {
      key: 'mood',
      title: "What's your mood?",
      icon: <Sun size={28} color="var(--accent)" />,
      content: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setData(d => ({ ...d, mood: i }))}
              style={{
                fontSize: '2.5rem', background: 'none', border: 'none', cursor: 'pointer',
                transform: data.mood === i ? 'scale(1.4)' : 'scale(1)',
                filter: data.mood === i ? 'none' : 'grayscale(0.7) opacity(0.5)',
                transition: 'all 0.25s ease',
              }}
            >{m}</button>
          ))}
        </div>
      ),
    },
    {
      key: 'weight',
      title: 'Morning weight? (optional)',
      icon: <Scale size={28} color="var(--accent)" />,
      content: (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <input type="number" placeholder="e.g. 72.5" value={data.weight}
            onChange={e => setData(d => ({ ...d, weight: e.target.value }))}
            className="form-input"
            style={{ fontSize: '1.5rem', textAlign: 'center', width: '180px', padding: '0.75rem' }}
            min={30} max={200} step={0.1} />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-3)', fontSize: '0.8rem' }}>kg \u2014 Leave blank to skip</p>
        </div>
      ),
    },
    {
      key: 'note',
      title: 'Any quick note about today? (optional)',
      icon: <Sun size={24} color="var(--accent)" />,
      content: (
        <div style={{ marginTop: '1.5rem' }}>
          <textarea value={data.note}
            onChange={e => setData(d => ({ ...d, note: e.target.value }))}
            className="form-input" rows={3}
            placeholder="e.g. Slept late, but mood is good after gym."
            style={{ resize: 'vertical' }} />
        </div>
      ),
    },
  ];

  const handleSubmit = async () => {
    setIsSaving(true);
    const checkInDate = todayStr();
    const updatedUser = { ...user };

    // weight update
    if (data.weight) {
      updatedUser.weightLog = [...(user?.weightLog || []), { date: checkInDate, weight: parseFloat(data.weight) }];
      updatedUser.weight = parseFloat(data.weight);
    }

    // check-in log
    updatedUser.checkIns = [...(user?.checkIns || []), {
      date: checkInDate, sleep: data.sleep, energy: data.energy, mood: data.mood, weight: data.weight || null,
    }];

    // sleep log
    if (saveSleepLog) {
      await saveSleepLog({
        date: checkInDate, hours: data.sleep,
        quality: Math.round((data.energy / 4) * 100),
        mood: data.mood,
      });
    }

    // mood log
    if (addMoodLog) {
      await addMoodLog({
        date: checkInDate,
        mood: Math.round((data.mood / 4) * 10),
        energy: Math.round((data.energy / 4) * 10),
        note: data.note?.trim() || null,
      });
    }

    // ── NEW: mood → metric_log bridge ──
    if (addMetricLog) {
      await addMetricLog({
        type: 'mood',
        value: Math.round((data.mood / 4) * 10),  // 0–10 scale
        note: `Check-in: energy=${ENERGY[data.energy]}, mood=${MOODS[data.mood]}`,
        logged_at: new Date().toISOString(),
      });
    }

    // ── NEW: auto-dismiss matching habit notifications ──
    try {
      const dismissed = JSON.parse(localStorage.getItem('notif_dismissed') || '[]');
      // build IDs that NotificationCenter would generate for today's missed habits
      // Those IDs are: `missed-habit-${h.id}-${today}` (see NotificationCenter)
      const habitNotifIds = (habits || []).map(h => `missed-habit-${h.id}-${checkInDate}`);
      const merged = [...new Set([...dismissed, ...habitNotifIds])];
      localStorage.setItem('notif_dismissed', JSON.stringify(merged));
    } catch (_) { /* silent */ }

    if (setUser) setUser(updatedUser);
    if (setLastCheckIn) setLastCheckIn(checkInDate);
    setDone(true);
    setTimeout(() => {
      toast.success(`Check-in complete! ${data.sleep}h sleep, feeling ${MOODS[data.mood]}`);
      onClose();
    }, 1500);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
      style={{
        position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: '480px',
        padding: '2.5rem', position: 'relative',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <button aria-label="Close check-in" onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
          display: 'flex', padding: '4px', borderRadius: '8px', transition: 'color 0.2s',
        }}
          className="hover-text-1"
        >
          <X size={18} />
        </button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>\u2705</div>
            <h3 className="text-display" style={{ fontSize: '1.5rem' }}>Check-in complete!</h3>
            <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Your data has been saved. Have a great day!</p>
          </div>
        ) : (
          <>
            {/* ── Streak protection banner ── */}
            {showStreakAlert && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: '10px', padding: '8px 12px', marginBottom: '1rem',
              }}>
                <Flame size={14} style={{ color: '#f97316', flexShrink: 0 }} />
                <p style={{ fontSize: '0.75rem', color: '#fb923c', fontWeight: 600 }}>
                  \ud83d\udd25 {atRiskHabits.length} habit{atRiskHabits.length > 1 ? 's' : ''} not logged today \u2014 streaks at risk!
                </p>
              </div>
            )}

            <div style={{ marginBottom: '0.5rem' }}>
              <p className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>
                DAILY CHECK-IN \u00b7 {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '0.75rem' }}>
                {steps[step].icon}
                <h2 id="checkin-title" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-1)' }}>
                  {steps[step].title}
                </h2>
              </div>
            </div>

            <div style={{ minHeight: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%' }}>{steps[step].content}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2rem' }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? '20px' : '8px', height: '8px',
                  borderRadius: '4px',
                  background: i <= step ? 'var(--accent)' : 'var(--bg-elevated)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} className="btn-ghost" style={{ flex: 1 }}>Back</button>
              )}
              {step < steps.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)} className="btn-primary" style={{ flex: 1 }}>Next \u2192</button>
              ) : (
                <button onClick={handleSubmit} disabled={isSaving} className="btn-primary" style={{ flex: 1, background: 'var(--success)' }}>
                  <CheckCircle2 size={16} /> {isSaving ? 'Saving…' : 'Complete Check-In'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
