import React, { useState, useMemo } from 'react';
import { Eye, Ear, Wind, Fingerprint, Brain, Activity, ClipboardList, Target, Smile, Heart, Sparkles, Droplets, X, Edit3, Check, Info } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function HealthExtras() {
  const user = useStore(s => s.user);
  const healthExtras = useStore(s => s.health_extras || {});
  const updateHealthExtras = useStore(s => s.updateHealthExtras);
  const toast = useToast();

  const senses = {
    vision:  { level: healthExtras.vision_score ?? 85, note: 'Slight strain after long work', exercises: ['Palming', 'Focus Shifting'], color: '#3b82f6', icon: Eye,         currentPower: '-2.5 D',        targetPower: '0.0 D (20/20)',   path: 'Laser correction, extended outdoor focus, and targeted ocular exercises.' },
    hearing: { level: healthExtras.hearing_score ?? 90, note: 'Normal acoustic range',        exercises: ['Sound Localization'],         color: '#8b5cf6', icon: Ear,         currentPower: '15 dB HL',      targetPower: '0 dB HL',         path: 'Acoustic therapy & strictly avoiding high-decibel environments.' },
    smell:   { level: healthExtras.smell_score ?? 95, note: 'Highly sensitive olfactory',   exercises: ['Scent Identification'],       color: '#10b981', icon: Wind,        currentPower: 'Tier 2 (High)', targetPower: 'Tier 1 (Sommelier)', path: 'Daily essential oil scent discrimination training.' },
    taste:   { level: healthExtras.taste_score ?? 90, note: 'Clear palate',                 exercises: ['Mindful Eating'],             color: '#f59e0b', icon: Activity,    currentPower: 'High Sensitivity', targetPower: 'Peak Sensitivity', path: 'Zinc supplementation, regular fasting, & daily tongue scraping.' },
    touch:   { level: healthExtras.touch_score ?? 88, note: 'Responsive tactile feedback',  exercises: ['Texture Discrimination'],     color: '#ef4444', icon: Fingerprint, currentPower: '88% Acuity',    targetPower: '95% Acuity',      path: 'Tactile discrimination exercises & improved hydration.' }
  };

  const [editSense, setEditSense] = useState(null); // key being edited
  const [editLevel, setEditLevel] = useState(50);
  const [activeSense, setActiveSense] = useState(null);

  // Read from store — fall back to user defaults if empty
  const diets = useMemo(() => Array.isArray(healthExtras.active_diets) && healthExtras.active_diets.length > 0 ? healthExtras.active_diets : (user?.data?.activeDiets || user?.activeDiets || ['—']), [healthExtras, user]);
  const hobbies = useMemo(() => Array.isArray(healthExtras.hobbies) && healthExtras.hobbies.length > 0 ? healthExtras.hobbies : (user?.data?.hobbies || user?.hobbies || ['—']), [healthExtras, user]);
  const posture = healthExtras.posture_status || user?.data?.posture || user?.posture || 'Not set';
  const broncoTest = healthExtras.bronco_level || user?.data?.broncoTest || user?.broncoTest || '—';

  const specialized = [
    { name: 'Gut Biome',    score: healthExtras.gut_biome_score ?? 78, note: 'Balanced',    icon: Target,   color: '#10b981', dbKey: 'gut_biome_score' },
    { name: 'Dermatology',  score: healthExtras.dermatology_score ?? 82, note: 'Hydrated',    icon: Droplets, color: '#3b82f6', dbKey: 'dermatology_score' },
    { name: 'Hair Vitality',score: healthExtras.hair_vitality_score ?? 85, note: 'Voluminous',  icon: Sparkles, color: '#8b5cf6', dbKey: 'hair_vitality_score' }
  ];
  const [editSpecIdx, setEditSpecIdx] = useState(null);
  const [editSpecScore, setEditSpecScore] = useState(80);

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Advanced Telemetry</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>Health+ & Extras</h2>
          <p className="text-secondary" style={{ maxWidth: '600px' }}>Deep bio-metric analysis of your five senses, specialized organ health, and comprehensive lifestyle markers.</p>
        </div>
      </div>

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
            {Object.entries(senses).map(([key, data]) => {
              const Icon = data.icon;
              return (
                <div
                  key={key}
                  onClick={() => { if (editSense !== key) setActiveSense({ key, ...data }); }}
                  style={{ padding: '1.5rem', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = data.color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: data.color, filter: 'blur(50px)', opacity: 0.1, pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${data.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={data.color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {editSense === key ? (
                        <>
                          <input type="range" min={0} max={100} value={editLevel}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setEditLevel(+e.target.value)}
                            style={{ width: '70px', accentColor: data.color }}
                          />
                          <button onClick={async (e) => { 
                              e.stopPropagation(); 
                              await updateHealthExtras({ [`${key}_score`]: editLevel });
                              setEditSense(null); 
                              toast.success(`${key} score updated`); 
                            }}
                            style={{ background: data.color, border: 'none', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', color: '#fff' }}>
                            <Check size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: data.color }}>
                            {data.level}<span style={{ fontSize: '0.8rem', opacity: 0.6 }}>%</span>
                          </span>
                          <button onClick={e => { e.stopPropagation(); setEditSense(key); setEditLevel(data.level); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px' }}>
                            <Edit3 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'capitalize', marginBottom: '4px' }}>{key}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', minHeight: '36px' }}>{data.note}</p>

                  <div style={{ marginTop: '1rem', height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${data.level}%`, height: '100%', background: `linear-gradient(90deg, ${data.color}, ${data.color}88)` }} />
                  </div>

                  {/* Self-assessed badge */}
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Info size={10} /> Self-assessed estimate
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {editSpecIdx === i ? (
                          <>
                            <input type="range" min={0} max={100} value={editSpecScore}
                              onChange={e => setEditSpecScore(+e.target.value)}
                              style={{ width: '70px', accentColor: item.color }}
                            />
                            <button onClick={async () => { 
                                await updateHealthExtras({ [item.dbKey]: editSpecScore });
                                setEditSpecIdx(null); 
                                toast.success(`${item.name} updated`); 
                              }}
                              style={{ background: item.color, border: 'none', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', color: '#fff' }}>
                              <Check size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 900, color: item.color }}>{item.score}%</span>
                            <button onClick={() => { setEditSpecIdx(i); setEditSpecScore(item.score); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px' }}>
                              <Edit3 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.score}%`, height: '100%', background: item.color }} />
                    </div>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Info size={9} /> Self-assessed estimate
                    </p>
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
               <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{broncoTest}</p>
               <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><Info size={9} /> Self-assessed</p>
            </div>
            <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
               <p className="label-caps" style={{ color: 'var(--success)', marginBottom: '8px' }}>Posture</p>
               <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{posture}</p>
               <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><Info size={9} /> Self-assessed</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardList size={14} /> Active Diets
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginLeft: '4px', fontWeight: 400 }}>— from your profile</span>
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {diets.map(diet => (
                <span key={diet} style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  {diet}
                </span>
              ))}
              {diets.length === 1 && diets[0] === '—' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Set your active diets in your profile</span>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smile size={14} /> Hobby Matrix
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginLeft: '4px', fontWeight: 400 }}>— from your profile</span>
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {hobbies.map(hobby => (
                <span key={hobby} style={{ padding: '6px 12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  {hobby}
                </span>
              ))}
              {hobbies.length === 1 && hobbies[0] === '—' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Set your hobbies in your profile</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Sensory Detail Modal */}
      {activeSense && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
          <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '500px', position: 'relative', padding: '2.5rem', border: `1px solid ${activeSense.color}` }}>
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: `radial-gradient(circle at center, ${activeSense.color}33 0%, transparent 60%)`, pointerEvents: 'none' }} />
            
            <button onClick={() => setActiveSense(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${activeSense.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {React.createElement(activeSense.icon, { size: 32, color: activeSense.color })}
              </div>
              <div>
                <h2 className="text-display" style={{ fontSize: '2rem', margin: 0, textTransform: 'capitalize' }}>{activeSense.key}</h2>
                <p className="label-caps" style={{ color: activeSense.color }}>Neurological Optimization</p>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '1.5rem' }}>
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
                  {activeSense.exercises.map((ex, i) => (
                    <span key={i} style={{ padding: '6px 12px', background: `${activeSense.color}15`, color: activeSense.color, borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${activeSense.color}33` }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '2.5rem', position: 'relative', zIndex: 1 }}>
              <button className="btn-primary" style={{ width: '100%', padding: '1rem', background: activeSense.color, color: '#fff', fontSize: '1rem' }} onClick={() => setActiveSense(null)}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
