import React, { useState } from 'react';
import { Sun, Moon, Zap, Scale, X, CheckCircle2 } from 'lucide-react';
import useStore, { selectSaveSleepLog } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const MOODS = ['😢', '😕', '😐', '😊', '😁'];
const ENERGY = ['🪫', '😴', '⚡', '🔥', '🚀'];

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyCheckIn({ onClose }) {
  const toast = useToast();
  const setLastCheckIn = useStore(s => s.setLastCheckIn);
  const user = useStore(s => s.user);
  const setUser = useStore(s => s.setUser);
  const saveSleepLog = useStore(selectSaveSleepLog);

  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    sleep: 7,
    energy: 2,   // index into ENERGY
    mood: 2,     // index into MOODS
    weight: user?.weight || '',
  });
  const [done, setDone] = useState(false);

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
          <input
            type="range" min={0} max={12} step={0.5}
            value={data.sleep}
            onChange={e => setData(d => ({ ...d, sleep: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--accent)', marginTop: '0.5rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '4px' }}>
            <span>0h</span><span>6h</span><span>12h</span>
          </div>
        </div>
      )
    },
    {
      key: 'energy',
      title: 'Energy level today?',
      icon: <Zap size={28} color="var(--accent)" />,
      content: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
          {ENERGY.map((e, i) => (
            <button
              key={i}
              onClick={() => setData(d => ({ ...d, energy: i }))}
              style={{
                fontSize: '2.5rem', background: 'none', border: 'none', cursor: 'pointer',
                transform: data.energy === i ? 'scale(1.4)' : 'scale(1)',
                filter: data.energy === i ? 'none' : 'grayscale(0.7) opacity(0.5)',
                transition: 'all 0.25s ease',
              }}
            >{e}</button>
          ))}
        </div>
      )
    },
    {
      key: 'mood',
      title: "What's your mood?",
      icon: <Sun size={28} color="var(--accent)" />,
      content: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
          {MOODS.map((m, i) => (
            <button
              key={i}
              onClick={() => setData(d => ({ ...d, mood: i }))}
              style={{
                fontSize: '2.5rem', background: 'none', border: 'none', cursor: 'pointer',
                transform: data.mood === i ? 'scale(1.4)' : 'scale(1)',
                filter: data.mood === i ? 'none' : 'grayscale(0.7) opacity(0.5)',
                transition: 'all 0.25s ease',
              }}
            >{m}</button>
          ))}
        </div>
      )
    },
    {
      key: 'weight',
      title: 'Morning weight? (optional)',
      icon: <Scale size={28} color="var(--accent)" />,
      content: (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <input
            type="number" placeholder="e.g. 72.5"
            value={data.weight}
            onChange={e => setData(d => ({ ...d, weight: e.target.value }))}
            className="form-input"
            style={{ fontSize: '1.5rem', textAlign: 'center', width: '180px', padding: '0.75rem' }}
            min={30} max={200} step={0.1}
          />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-3)', fontSize: '0.8rem' }}>kg — Leave blank to skip</p>
        </div>
      )
    }
  ];

  const handleSubmit = () => {
    // Persist check-in data into the user object
    const updatedUser = { ...user };

    // Weight
    if (data.weight) {
      const weightLogs = [...(user?.weightLog || []), { date: today(), weight: parseFloat(data.weight) }];
      updatedUser.weightLog = weightLogs;
      updatedUser.weight = parseFloat(data.weight);
    }

    // Mood / Energy stored in a check-ins array
    const checkIns = [...(user?.checkIns || []), {
      date: today(),
      sleep: data.sleep,
      energy: data.energy,
      mood: data.mood,
      weight: data.weight || null,
    }];
    updatedUser.checkIns = checkIns;

    // ALSO write to top-level sleep_logs so SleepDashboard reads it correctly
    if (saveSleepLog) {
      saveSleepLog({
        date: today(),
        hours: data.sleep,
        quality: Math.round((data.energy / 4) * 100),
        mood: data.mood,
      });
    }

    if (setUser) setUser(updatedUser);
    if (setLastCheckIn) setLastCheckIn(today());
    setDone(true);
    setTimeout(() => {
      toast.success(`Check-in complete! ${data.sleep}h sleep, feeling ${MOODS[data.mood]}`);
      onClose();
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: '480px',
        padding: '2.5rem', position: 'relative',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
          display: 'flex', padding: '4px', borderRadius: '8px', transition: 'color 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          <X size={18} />
        </button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h3 className="text-display" style={{ fontSize: '1.5rem' }}>Check-in complete!</h3>
            <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Your data has been saved. Have a great day!</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '0.5rem' }}>
              <p className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>
                DAILY CHECK-IN · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '0.75rem' }}>
                {steps[step].icon}
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-1)' }}>
                  {steps[step].title}
                </h2>
              </div>
            </div>

            {/* Step Content */}
            <div style={{ minHeight: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%' }}>
                {steps[step].content}
              </div>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2rem' }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? '20px' : '8px', height: '8px',
                  borderRadius: '4px',
                  background: i <= step ? 'var(--accent)' : 'var(--bg-elevated)',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="btn-primary"
                  style={{ flex: 1, background: 'var(--success)' }}
                >
                  <CheckCircle2 size={16} /> Complete Check-In
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
