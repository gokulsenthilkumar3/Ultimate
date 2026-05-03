import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Trash2, Smile, Heart, Zap, Calendar, Trophy, Search } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import PageHeader from './ui/PageHeader';

const EMOJIS = ['🏃','💤','🧘','📚','🌳','💧','🍎','🧠','🏋️','☀️','🎵','🚴','🚿','🥑','🚶','🏊'];
const API = 'http://localhost:3001/api';

const todayStr = () => new Date().toISOString().slice(0, 10);
const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)',
  color: 'var(--text-1)', fontSize: '0.8rem'
};

export default function Lifestyle() {
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hf, setHf] = useState({ name: '', icon: '🏃' });

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch(`${API}/habits`);
      const data = await res.json();
      setHabits(data);
    } catch {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const addHabit = async () => {
    if (!hf.name.trim()) return toast.error('Habit name required');
    try {
      const res = await fetch(`${API}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hf.name, icon: hf.icon })
      });
      if (res.ok) {
        await fetchHabits();
        setHf({ name: '', icon: '🏃' });
        toast.success(`Habit "${hf.name}" tracked!`);
      }
    } catch {
      toast.error('Failed to add habit');
    }
  };

  const deleteHabit = async (id) => {
    if (!window.confirm("Delete habit?")) return;
    try {
      await fetch(`${API}/habits/${id}`, { method: 'DELETE' });
      setHabits(prev => prev.filter(h => h.id !== id));
      toast.success('Habit deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleDay = async (habit, date) => {
    const ds = habit.completed_dates || [];
    const nd = ds.includes(date) ? ds.filter(d => d !== date) : [...ds, date];
    
    // Simple streak calculation
    let streak = 0;
    const sorted = [...nd].sort().reverse();
    let checkDate = new Date();
    
    for (const d of sorted) {
       const dStr = checkDate.toISOString().slice(0, 10);
       if (d === dStr) {
         streak++;
         checkDate.setDate(checkDate.getDate() - 1);
       } else if (d > dStr) {
         continue; // skip future/later
       } else {
         break; // gap
       }
    }

    try {
      await fetch(`${API}/habits/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_dates: nd, streak })
      });
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, completed_dates: nd, streak } : h));
    } catch {
      toast.error('Failed to update habit');
    }
  };

  const days = last7Days();

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Behavioral Telemetry</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>Habit Matrix</h2>
          <p className="text-secondary">Track atomic consistency and neurological patterns.</p>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
           <Trophy size={20} color="var(--accent)" />
           <div>
             <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Highest Streak</p>
             <p style={{ fontSize: '1.1rem', fontWeight: 900 }}>{Math.max(0, ...habits.map(h => h.streak || 0))} Days</p>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Habit List */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 className="card-title"><Zap size={18}/> Active Consistency Loops</h3>
              <span className="label-caps" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Last 7 Days</span>
           </div>

           {loading ? (
             <div style={{ padding: '4rem', textAlign: 'center' }}><div className="spin-ring" /></div>
           ) : habits.length === 0 ? (
             <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>No habits defined. Add one to begin tracking.</div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {habits.map(h => (
                  <div key={h.id} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '200px 1fr 100px', 
                    alignItems: 'center', 
                    padding: '1.25rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontSize: '1.5rem' }}>{h.icon}</span>
                       <div>
                         <p style={{ fontWeight: 800, fontSize: '1rem' }}>{h.name}</p>
                         <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>{h.streak} Day Streak</p>
                       </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                       {days.map(d => {
                         const isDone = (h.completed_dates || []).includes(d);
                         const isToday = d === todayStr();
                         return (
                           <div 
                             key={d} 
                             onClick={() => toggleDay(h, d)}
                             style={{ 
                               width: '32px', height: '32px', 
                               borderRadius: '8px', 
                               background: isDone ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                               border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                               cursor: 'pointer',
                               display: 'flex', alignItems: 'center', justifyContent: 'center',
                               transition: 'all 0.2s'
                             }}
                             title={d}
                           >
                             {isDone && <span style={{ color: '#000', fontSize: '0.8rem', fontWeight: 900 }}>✓</span>}
                           </div>
                         )
                       })}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                       <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteHabit(h.id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Add Habit & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="glass-card" style={{ padding: '1.75rem' }}>
              <h3 className="card-title"><Plus size={18} /> New Habit</h3>
              <div style={{ marginTop: '1.5rem' }}>
                 <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Habit Name</label>
                 <input 
                   className="form-input" 
                   value={hf.name} 
                   onChange={e => setHf({...hf, name: e.target.value})}
                   placeholder="e.g. Morning Meditation"
                 />
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                 <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Select Icon</label>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {EMOJIS.map(e => (
                      <button 
                        key={e} 
                        onClick={() => setHf({...hf, icon: e})}
                        style={{ 
                          padding: '8px', 
                          borderRadius: '8px', 
                          background: hf.icon === e ? 'var(--accent-soft)' : 'var(--bg-dark)',
                          border: hf.icon === e ? '1px solid var(--accent)' : '1px solid var(--border)',
                          fontSize: '1.2rem',
                          cursor: 'pointer'
                        }}
                      >{e}</button>
                    ))}
                 </div>
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={addHabit}>INITIALIZE HABIT</button>
           </div>

           <div className="glass-card" style={{ padding: '1.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <h3 className="card-title" style={{ color: '#10b981' }}><Smile size={18} /> Neuro-Insights</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, marginTop: '1rem' }}>
                Consistency is the only variable that compounds. Your current average atomic consistency is 
                <span style={{ fontWeight: 800, color: 'var(--text-1)' }}> {habits.length > 0 ? (habits.reduce((acc, h) => acc + h.streak, 0) / habits.length).toFixed(1) : 0} days</span>.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
