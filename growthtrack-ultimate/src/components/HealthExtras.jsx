import PageHeader from './ui/PageHeader';
import { EMPTY_RECORD } from '../lib/emptyValues';
import { Z_INDEX } from '../constants';
import React, { useEffect, useRef, useState } from 'react';
import { Eye, Ear, Wind, Fingerprint, Brain, Activity, ClipboardList, Target, Smile, Heart, Sparkles, Droplets, X, Battery, Plus, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import useRecordMutation from '../hooks/useRecordMutation';
import Modal from './ui/Modal';

const SENSE_ICONS = { vision: Eye, hearing: Ear, smell: Wind, taste: Activity, touch: Fingerprint };
const SPECIAL_ICONS = [Target, Droplets, Sparkles];

export default function HealthExtras() {
  const healthProfile = useStore(s => s.healthProfile ?? EMPTY_RECORD);
  const healthTemplate = useStore(s => s.appConfig?.healthTemplates ?? EMPTY_RECORD);
  const updateHealth = useStore(s => s.updateHealthExtras);
  const [senses, setSenses] = useState({});

  const [activeSense, setActiveSense] = useState(null);

  const [lifestyle, setLifestyle] = useState({ posture: '', diets: [], hobbies: [], broncoTest: '' });
  const [specialized, setSpecialized] = useState([]);
  const [recoveryMetrics, setRecoveryMetrics] = useState([]);
  const owner = useStore(state => state.user?.id);
  const dirty = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const { pending, error: saveError, run } = useRecordMutation();
  useEffect(() => { dirty.current = false; setHasDraft(false); setSaved(false); setActiveSense(null); }, [owner]);

  useEffect(() => {
    const source = { ...healthTemplate, ...healthProfile };
    setSenses(Object.fromEntries(Object.entries(source.senses || {}).filter(([, value]) => value && typeof value === 'object').map(([key, value]) => [key, { ...value, icon: SENSE_ICONS[key] || Activity }])));
    setLifestyle(source.lifestyle || { posture: '', diets: [], hobbies: [], broncoTest: '' });
    setSpecialized((source.specialized || []).map((item, index) => ({ ...item, icon: SPECIAL_ICONS[index % SPECIAL_ICONS.length] })));
    if (!dirty.current) setRecoveryMetrics((Array.isArray(source.recoveryMetrics) ? source.recoveryMetrics : []).filter(metric => metric && typeof metric === 'object'));
  }, [healthProfile, healthTemplate, owner]);

  const editRecovery = next => { dirty.current = true; setHasDraft(true); setSaved(false); setRecoveryMetrics(next); };
  const saveRecovery = () => run(() => updateHealth({ recoveryMetrics }), () => { dirty.current = false; setHasDraft(false); setSaved(true); });

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <PageHeader accent="Wellness" title="Health+" subtitle="Keep sensory observations, lifestyle notes and recovery metrics together." />

      {!Object.keys(senses).length && !specialized.length && !recoveryMetrics.length && (
        <div className="glass-card health-empty-state"><Heart size={28} color="var(--accent)" /><div><h3>No health observations yet</h3><p className="text-secondary">Add a recovery metric below. Saved observations will appear here.</p></div></div>
      )}

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* 5 Senses Section */}
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <Brain size={28} color="var(--accent)" />
            <div>
              <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Sensory Optimization</h3>
              <p className="label-caps" style={{ fontSize: '0.65rem' }}>Neuro-biological feedback</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {!Object.keys(senses).length && <p className="text-secondary">No sensory observations recorded.</p>}
            {Object.entries(senses).map(([key, data]) => {
              const Icon = data.icon;
              return (
                <div role="button" tabIndex={0} aria-label={`Open ${key} details`} aria-haspopup="dialog" onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveSense({ key, ...data }); } }}
                  key={key} 
                  onClick={() => setActiveSense({ key, ...data })}
                  className="hover-app-card"
                  style={{ '--hover-color': data.color, '--hover-shadow': 'transparent', padding: '1.5rem', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: data.color, filter: 'blur(50px)', opacity: 0.1, pointerEvents: 'none' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${data.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={data.color} />
                    </div>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: data.color }}>
                      {data.level}<span style={{ fontSize: '0.8rem', opacity: 0.6 }}>%</span>
                    </span>
                  </div>
                  
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'capitalize', marginBottom: '4px' }}>{key}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', minHeight: '36px' }}>{data.note}</p>
                  
                  <div style={{ marginTop: '1rem', height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${data.level}%`, height: '100%', background: `linear-gradient(90deg, ${data.color}, ${data.color}88)` }} />
                  </div>
                  
                  <div style={{ marginTop: '12px', fontSize: '0.65rem', color: data.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                     Power: {data.currentPower}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Specialized Health */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <Heart size={24} color="#f43f5e" />
            <div>
              <h3 className="text-display" style={{ fontSize: '1.3rem', margin: 0 }}>Specialized Vitality</h3>
              <p className="label-caps" style={{ fontSize: '0.65rem' }}>Organ & Tissue Status</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
            {!specialized.length && <p className="text-secondary">No specialized observations recorded.</p>}
            {specialized.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Icon size={20} color={item.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.name}</span>
                      <span style={{ fontWeight: 900, color: item.color }}>{item.score}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.score}%`, height: '100%', background: item.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance & Lifestyle */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <Activity size={24} color="var(--info)" />
            <div>
              <h3 className="text-display" style={{ fontSize: '1.3rem', margin: 0 }}>Lifestyle & Performance</h3>
              <p className="label-caps" style={{ fontSize: '0.65rem' }}>Habits & Output</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
               <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>Bronco Test</p>
               <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{lifestyle.broncoTest}</p>
            </div>
            <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
               <p className="label-caps" style={{ color: 'var(--success)', marginBottom: '8px' }}>Posture</p>
               <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{lifestyle.posture}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardList size={14} /> Active Diets
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lifestyle.diets.map(diet => (
                <span key={diet} style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  {diet}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smile size={14} /> Hobby Matrix
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lifestyle.hobbies.map(hobby => (
                <span key={hobby} style={{ padding: '6px 12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  {hobby}
                </span>
              ))}
            </div>
          </div>

        </div>
        
        {/* Recovery & Stress (Section 3) */}
        <div className="glass-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Battery size={24} color="var(--success)" />
              <div>
                <h3 className="text-display" style={{ fontSize: '1.3rem', margin: 0 }}>Recovery & Stress</h3>
                <p className="label-caps" style={{ fontSize: '0.65rem' }}>System Readiness</p>
              </div>
            </div>
            <button disabled={pending} className="btn-sm" onClick={() => editRecovery([...recoveryMetrics, { id: crypto.randomUUID(), name: '', value: '', status: 'Pending' }])}>
              <Plus size={14} /> Add Metric
            </button>
          </div>
          
          <fieldset disabled={pending} style={{ minWidth: 0, border: 0, padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(250px, 100%), 1fr))', gap: '1rem' }}>
            {recoveryMetrics.map(metric => (
              <div key={metric.id} style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input aria-label="Metric name" className="form-input" value={metric.name ?? ''} placeholder="Metric name" onChange={e => editRecovery(recoveryMetrics.map(m => m.id === metric.id ? { ...m, name: e.target.value } : m))} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-1)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input aria-label={`Value for ${metric.name || 'new metric'}`} className="form-input" value={metric.value ?? ''} placeholder="Value" onChange={e => editRecovery(recoveryMetrics.map(m => m.id === metric.id ? { ...m, value: e.target.value } : m))} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)', width: '60%', minWidth: 0 }} />
                  <select aria-label={`Status for ${metric.name || 'new metric'}`} className="form-input" value={metric.status || 'Pending'} onChange={e => editRecovery(recoveryMetrics.map(m => m.id === metric.id ? { ...m, status: e.target.value } : m))}>
                    <option value="Optimal">Optimal</option>
                    <option value="Warning">Warning</option>
                    <option value="Critical">Critical</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button aria-label={`Remove ${metric.name || 'new metric'}`} className="btn-icon" onClick={() => editRecovery(recoveryMetrics.filter(m => m.id !== metric.id))} style={{ color: 'var(--danger)', padding: '4px' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </fieldset>
          {saveError && <p role="alert">{saveError}</p>}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button disabled={pending || !hasDraft} className="btn-primary" onClick={saveRecovery}>{pending ? 'Saving…' : 'Save recovery metrics'}</button>
            <span role="status">{pending ? 'Saving recovery metrics…' : hasDraft ? 'Unsaved changes' : saved ? 'Recovery metrics saved.' : ''}</span>
          </div>
        </div>

      </div>

      {/* Sensory Detail Modal */}
      {activeSense && (
        <Modal open title={`${activeSense.key} details`} onClose={() => setActiveSense(null)}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: `radial-gradient(circle at center, ${activeSense.color}33 0%, transparent 60%)`, pointerEvents: 'none' }} />
            
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem', position: 'relative', zIndex: Z_INDEX.BASE }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${activeSense.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {React.createElement(activeSense.icon, { size: 32, color: activeSense.color })}
              </div>
              <div>
                <h2 className="text-display" style={{ fontSize: '2rem', margin: 0, textTransform: 'capitalize' }}>{activeSense.key}</h2>
                <p className="label-caps" style={{ color: activeSense.color }}>Neurological Optimization</p>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: Z_INDEX.BASE, display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div>
                  <p className="label-caps" style={{ marginBottom: '4px' }}>Current Power</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>{activeSense.currentPower}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="label-caps" style={{ marginBottom: '4px' }}>Target Power</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>{activeSense.targetPower}</p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Achievement Path
                </h4>
                <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: `1px solid ${activeSense.color}44`, lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {activeSense.path}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Recommended Exercises
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(Array.isArray(activeSense.exercises) ? activeSense.exercises : []).map((ex, i) => (
                    <span key={i} style={{ padding: '6px 12px', background: `${activeSense.color}15`, color: activeSense.color, borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${activeSense.color}33` }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '2.5rem', position: 'relative', zIndex: Z_INDEX.BASE }}>
              <button className="btn-primary" style={{ width: '100%', padding: '1rem', background: activeSense.color, color: '#fff', fontSize: '1rem' }} onClick={() => setActiveSense(null)}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
