import React, { useState } from 'react';
import { X, Save, Ruler, Activity, Heart, Zap } from 'lucide-react';
import { BODY_METRICS_LIST, VITALS_METRICS_LIST, HOLISTIC_METRICS_LIST } from '../data/userData';

export default function MetricLogger({ onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('body'); // 'body', 'vitals', or 'holistic'
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: 63,
    chest: 34.1,
    shoulders: 42.3,
    waist: 32.3,
    arms: 11.8,
    neck: 14.5,
    biceps: 11.8,
    hips: 34.6,
    thighs: 20.9,
    calves: 13.8,
    d_size: 5.9,
    sleep: 6,
    water: 2,
    caffeine: 3,
    stress: 7,
    hr: 75,
    eyePower: -2.5,
    memoryPower: 65,
    stamina: 40,
    flexibility: 15,
    hairHealth: 50,
    skinGlow: 40,
    sight: 60,
    hearing: 85,
    smell: 80,
    taste: 90,
    touch: 85
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div className="glass-card stagger-item" style={{ 
        width: '100%', maxWidth: '600px', maxHeight: '90vh', 
        padding: '2rem', display: 'flex', flexDirection: 'column' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: 'var(--accent)', padding: '8px', borderRadius: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <Zap color="var(--bg-base)" size={20} strokeWidth={3} />
            </div>
            <h3 className="text-display" style={{ fontSize: '1.8rem' }}>Universal Logger</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', transition: 'var(--transition)' }}>
            <X size={28} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ 
          display: 'flex', background: 'rgba(255,255,255,0.03)', 
          borderRadius: '12px', padding: '4px', marginBottom: '1.5rem',
          border: '1px solid var(--border)' 
        }}>
          <button 
            onClick={() => setActiveTab('body')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: activeTab === 'body' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'body' ? 'var(--bg-base)' : 'var(--text-2)',
              fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Ruler size={16} /> Body Metrics
          </button>
          <button 
            onClick={() => setActiveTab('vitals')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: activeTab === 'vitals' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'vitals' ? 'var(--bg-base)' : 'var(--text-2)',
              fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Activity size={16} /> Bio-Vitals
          </button>
          <button 
            onClick={() => setActiveTab('holistic')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: activeTab === 'holistic' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'holistic' ? 'var(--bg-base)' : 'var(--text-2)',
              fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Zap size={16} /> Holistic
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-caps">Log Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required
              style={{
                padding: '14px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-strong)',
                borderRadius: '12px', color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
            gap: '1rem', overflowY: 'auto', paddingRight: '4px', maxHeight: '400px' 
          }}>
            {activeTab === 'body' ? (
              BODY_METRICS_LIST.map(field => (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="label-caps" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{field.icon}</span> {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="0.01" name={field.id} value={formData[field.id]} onChange={handleChange} required
                      style={{
                        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)',
                        textAlign: 'center', fontWeight: '600'
                      }}
                    />
                    <span style={{ 
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 800
                    }}>{field.unit.toUpperCase()}</span>
                  </div>
                </div>
              ))
            ) : activeTab === 'vitals' ? (
              VITALS_METRICS_LIST.map(field => (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="label-caps" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{field.icon}</span> {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="1" name={field.id} value={formData[field.id]} onChange={handleChange} required
                      style={{
                        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)',
                        textAlign: 'center', fontWeight: '600'
                      }}
                    />
                    <span style={{ 
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 800
                    }}>{field.unit.toUpperCase()}</span>
                  </div>
                </div>
              ))
            ) : (
              HOLISTIC_METRICS_LIST.map(field => (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="label-caps" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{field.icon}</span> {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="1" name={field.id} value={formData[field.id]} onChange={handleChange} required
                      style={{
                        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)',
                        textAlign: 'center', fontWeight: '600'
                      }}
                    />
                    <span style={{ 
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 800
                    }}>{field.unit.toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '14px' }}>Discard</button>
            <button type="submit" className="btn-ghost" style={{ 
              flex: 1, background: 'var(--accent)', color: 'var(--bg-base)', 
              borderColor: 'var(--accent)', padding: '14px', boxShadow: '0 0 20px var(--accent-glow)'
            }}>
              <Save size={18} style={{ marginRight: '8px' }} /> Commit Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
