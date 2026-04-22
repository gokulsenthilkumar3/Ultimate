import React from 'react';
import { X, UserRound, Target, Activity } from 'lucide-react';
import { USER } from '../data/userData';
import useLocalStorage from '../hooks/useLocalStorage';

export default function SettingsPanel({ isOpen, onClose }) {
  // We can track profile overrides using localStorage so users can actually update settings
  const [profile, setProfile] = useLocalStorage('gt-user-profile', {
    weight: 63,
    height: 182,
    bodyFat: 14,
    activityLevel: 'Moderate'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: parseFloat(value) || value }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
      background: 'var(--bg-glass)', backdropFilter: 'blur(30px)',
      borderLeft: '1px solid var(--border)', zIndex: 9999,
      transform: 'translateX(0)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
    }}>
      <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-display" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserRound color="var(--accent)" />
          Profile Settings
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Basic Stats */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--text-2)' }}>
            <Activity size={16} />
            <span className="label-caps">Biometric Baseline</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Bodyweight (kg)</label>
              <input type="number" name="weight" value={profile.weight} onChange={handleChange} 
                style={{ width: '80px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Height (cm)</label>
              <input type="number" name="height" value={profile.height} onChange={handleChange}
                style={{ width: '80px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Est Body Fat (%)</label>
              <input type="number" name="bodyFat" value={profile.bodyFat} onChange={handleChange}
                style={{ width: '80px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)' }} />
            </div>
          </div>
        </section>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* System Settings */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--text-2)' }}>
            <Target size={16} />
            <span className="label-caps">Dashboard Config</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
               Sync intervals and remote medical endpoints are managed in Phase 6 of the Twin Blueprint.
             </p>

             <button className="btn-ghost" style={{ width: '100%', padding: '12px', marginTop: '1rem' }}>
                Export Health Data (JSON)
             </button>

             <button className="btn-ghost" style={{ width: '100%', padding: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                Reset All App Data
             </button>
          </div>
        </section>

      </div>
    </div>
  );
}
