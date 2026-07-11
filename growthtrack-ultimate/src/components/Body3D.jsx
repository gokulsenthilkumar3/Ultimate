import { Z_INDEX } from '../constants';
import React, { useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Bvh } from "@react-three/drei";
import { getGPUTier } from 'detect-gpu';
import Sprite3DViewer from "./Sprite3DViewer";
import MeasurementGuide from "./MeasurementGuide";
import { STATUS, BODY_PARTS } from "../data/userData";
import useStore from "../store/useStore";
import SystemScene from "./body3d/SystemScene";

// ── MAIN COMPONENT ──

export default function Body3D({ onSelectPart }) {
  const user = useStore(state => state.user);
  const [viewMode,      setViewMode]      = useState('WEBGL');
  const [anatomyDepth,  setAnatomyDepth]  = useState(100);
  const [selected,      setSelected]      = useState(null);
  const [autoRotate,    setAutoRotate]    = useState(true);
  const [currentView,   setCurrentView]   = useState("Rotating");
  const [showEditor,    setShowEditor]    = useState(true);
  const [comparisonMode,setComparisonMode]= useState('dual');
  const [splitPos,      setSplitPos]      = useState(50);
  const [heatmapMode,   setHeatmapMode]   = useState(false);
  const [stressLevel,   setStressLevel]   = useState(0);
  const [wardrobe,      setWardrobe]      = useState('gym');
  const [showGuide,     setShowGuide]     = useState(false);
  const [snapshots,     setSnapshots]     = useState([]);
  const [isZoomed,      setIsZoomed]      = useState(false);
  const [quality,       setQuality]       = useState('HIGH');

  useEffect(() => {
    const detectGPU = async () => {
      try {
        const gpuTier = await getGPUTier();
        if      (gpuTier.tier === 0) { setQuality('LOW');  setViewMode('SPRITE'); }
        else if (gpuTier.tier === 1) { setQuality('MED');  setViewMode('WEBGL');  }
        else                         { setQuality('HIGH'); setViewMode('WEBGL');  }
      } catch {
        const gl  = document.createElement('canvas').getContext('webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
          if      (gpu.includes('intel') || gpu.includes('mobile'))                        { setQuality('LOW');  setViewMode('SPRITE'); }
          else if (gpu.includes('nvidia') || gpu.includes('amd') || gpu.includes('apple')) { setQuality('HIGH'); setViewMode('WEBGL');  }
          else                                                                              { setQuality('MED');  setViewMode('WEBGL');  }
        }
      }
    };
    detectGPU();
  }, []);

  const [metrics, setMetrics] = useState({
    height:  user?.height  || 182,
    weight:  user?.weight  || 63,
    bodyFat: user?.bodyFat || 22
  });

  const [morphs, setMorphs] = useState({
    shoulders: 1.0,
    chest:     1.0,
    waist:     1.0,
    arms:      1.0,
    apparel:   true,
    hair:      'short'
  });

  const syncFromMetrics = () => {
    const { weight, height, bodyFat } = metrics;
    const lerp = (a, b, t) => a + (b - a) * t;
    setMorphs(prev => ({
      ...prev,
      chest:     lerp(0.85, 1.3, (weight  -  45) / 85),
      shoulders: lerp(0.9,  1.4, (height  - 150) / 60),
      waist:     lerp(0.7,  1.5, (bodyFat -   5) / 35),
      arms:      lerp(0.85, 1.3, (weight  -  45) / 85),
    }));
  };

  const captureCanvas = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link    = document.createElement('a');
    link.download = `GrowthTrack_DigitalTwin_${new Date().toISOString().split('T')[0]}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
  };

  const handleSelect = (part) => {
    setSelected(part);
    if (onSelectPart) onSelectPart(part);
  };

  return (
    <div className="fade-in stagger-container">
      <div className="section-head">
        <h2 className="text-display gradient-text" style={{ fontSize: '2.5rem' }}>Mirror Digital Twin</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <p className="text-secondary">Photorealistic bio-geometry with real-time parametric morphing.</p>
          <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {['LOW', 'MED', 'HIGH'].map(q => (
              <button key={q}
                className={`btn-ghost ${quality === q ? 'active' : ''}`}
                style={{ fontSize: '0.6rem', padding: '4px 8px', border: 'none' }}
                onClick={() => setQuality(q)}>
                {q}
              </button>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => setShowGuide(true)} style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
            📐 MEASUREMENT GUIDE
          </button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Viewport */}
        <div className="glass-card stagger-item" style={{ padding: 0, height: '650px', background: '#050810', position: 'relative', overflow: 'hidden' }}>
          {/* Top Control Bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: Z_INDEX.FLOATING_ELEMENT,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '15px', background: 'linear-gradient(to bottom, rgba(5,8,16,0.9), transparent)',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '70%' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px' }}>
                <button className={`btn-ghost ${viewMode === 'WEBGL'  ? 'active' : ''}`} style={{ fontSize: '0.65rem', padding: '6px 12px' }} onClick={() => setViewMode('WEBGL')}>WEBGL</button>
                <button className={`btn-ghost ${viewMode === 'SPRITE' ? 'active' : ''}`} style={{ fontSize: '0.65rem', padding: '6px 12px' }} onClick={() => setViewMode('SPRITE')}>SPRITE</button>
              </div>

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px' }}>
                {['dual', 'ghost', 'split', 'delta'].map(m => (
                  <button key={m}
                    className={`btn-ghost ${comparisonMode === m ? 'active' : ''}`}
                    style={{ fontSize: '0.65rem', padding: '6px 10px', borderRadius: '20px', border: 'none' }}
                    onClick={() => setComparisonMode(m)}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              <button className={`btn-ghost ${heatmapMode ? 'active' : ''}`} style={{ fontSize: '0.65rem' }} onClick={() => setHeatmapMode(h => !h)}>
                {heatmapMode ? 'HEATMAP ON' : 'HEATMAP OFF'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '2px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                <span className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>STRESS</span>
                <input type="range" min="0" max="100" value={stressLevel} onChange={(e) => setStressLevel(parseInt(e.target.value))} style={{ width: '60px', accentColor: '#ef4444' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px' }}>
                {['Front', 'Side', 'Back'].map(v => (
                  <button key={v} className={`btn-ghost ${currentView === v ? 'active' : ''}`}
                    style={{ fontSize: '0.65rem', padding: '6px 10px' }}
                    onClick={() => { setAutoRotate(false); setCurrentView(v); }}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
              <button className={`btn-ghost ${autoRotate ? 'active' : ''}`}
                style={{ fontSize: '0.65rem' }}
                onClick={() => { setAutoRotate(r => !r); setCurrentView(autoRotate ? 'Custom' : 'Rotating'); }}>
                {autoRotate ? '360° ROT' : 'PAUSED'}
              </button>
              <button className="btn-ghost" onClick={captureCanvas} style={{ fontSize: '0.65rem', borderColor: '#ef4444', color: '#ef4444' }}>
                📸 EXPORT
              </button>
            </div>
          </div>

          {/* Floating Action Buttons */}
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: Z_INDEX.FLOATING_ELEMENT, display: 'flex', gap: '10px' }}>
            <button className="btn-ghost" onClick={() => setShowEditor(s => !s)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              {showEditor ? 'HIDE EDITOR' : 'SHOW EDITOR'}
            </button>
            <button className="btn-ghost" onClick={() => setIsZoomed(z => !z)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              {isZoomed ? 'RESET' : 'FOCUS'}
            </button>
          </div>

          {viewMode === 'WEBGL' ? (
            <Canvas
              shadows={quality !== 'LOW'}
              camera={{ position: isZoomed ? [0, 1.2, 1.5] : [0, 0.9, 3.8], fov: isZoomed ? 25 : 40 }}
              gl={{
                antialias:             quality === 'HIGH',
                toneMapping:           THREE.LinearToneMapping,
                toneMappingExposure:   1.1,
                powerPreference:       'high-performance'
              }}
              style={{ transition: 'all 0.8s ease-in-out' }}
            >
              <Bvh firstHitOnly>
                <color attach="background" args={['#050810']} />
                <fog attach="fog" args={['#050810', 6, 14]} />
                <SystemScene
                  anatomyDepth={anatomyDepth}
                  morphs={morphs}
                  autoRotate={autoRotate}
                  currentView={currentView}
                  onSelectPart={handleSelect}
                  setAutoRotate={setAutoRotate}
                  setCurrentView={setCurrentView}
                  hairPreset={morphs.hair}
                  comparisonMode={comparisonMode}
                  splitPos={splitPos}
                  heatmapMode={heatmapMode}
                  stressLevel={stressLevel}
                  wardrobe={wardrobe}
                />
                <OrbitControls enableZoom={true} enablePan={false} minDistance={2} maxDistance={6} />
              </Bvh>
            </Canvas>
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#050810' }}>
              <Sprite3DViewer modelPrefix="current" />
            </div>
          )}

          {comparisonMode === 'split' && (
            <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '300px', zIndex: Z_INDEX.SLIDER }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>Split View Divider</span>
                <span style={{ fontSize: '0.6rem', color: 'white' }}>{splitPos}%</span>
              </div>
              <input type="range" min="0" max="100" value={splitPos} onChange={(e) => setSplitPos(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '25px', left: 0, right: 0, display: 'flex', justifyContent: 'space-around', pointerEvents: 'none' }}>
            <div className="label-caps" style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '20px', border: '1px solid var(--accent)' }}>YOU NOW</div>
            <div className="label-caps" style={{ color: '#22d3ee',    background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '20px', border: '1px solid #22d3ee'    }}>YOUR GOAL</div>
          </div>
        </div>

        {/* Editor Sidebar */}
        <div className={`glass-card stagger-item ${!showEditor ? 'hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto', maxHeight: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <h3 className="label-caps" style={{ fontSize: '0.9rem', color: 'var(--text-1)' }}>⚙ Parametric Editor</h3>
          </div>

          {/* Body Metrics */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="label-caps" style={{ fontSize: '0.7rem' }}>📐 Body Metrics</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'height',  label: 'Height',   min: 150, max: 210, unit: 'cm' },
                { id: 'weight',  label: 'Weight',   min:  45, max: 130, unit: 'kg' },
                { id: 'bodyFat', label: 'Body Fat', min:   5, max:  40, unit: '%'  },
              ].map(m => (
                <div key={m.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{m.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-1)', fontWeight: 'bold' }}>{metrics[m.id]}{m.unit}</span>
                  </div>
                  <input type="range" min={m.min} max={m.max} value={metrics[m.id]}
                    onChange={(e) => setMetrics(prev => ({ ...prev, [m.id]: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              ))}
            </div>
            <button className="btn-ghost" style={{ width: '100%', marginTop: '15px', fontSize: '0.7rem', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={syncFromMetrics}>
              📐 SYNC FROM METRICS
            </button>
          </div>

          {/* Snapshots */}
          <div style={{ background: 'rgba(34,211,238,0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(34,211,238,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="label-caps" style={{ fontSize: '0.7rem', color: '#22d3ee' }}>📷 Snapshots</span>
              <button className="btn-ghost" style={{ fontSize: '0.6rem', padding: '2px 8px' }}
                onClick={() => setSnapshots(s => [...s, { id: Date.now(), metrics, morphs, date: new Date().toLocaleTimeString() }])}>
                SAVE
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
              {snapshots.length === 0 && <p style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>No snapshots saved.</p>}
              {snapshots.map(s => (
                <button key={s.id} className="glass-card"
                  style={{ padding: '5px 10px', fontSize: '0.6rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => { setMetrics(s.metrics); setMorphs(s.morphs); }}>
                  {s.date}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Morph Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span className="label-caps" style={{ fontSize: '0.7rem' }}>⚡ Manual Morph Control</span>
            {[
              { id: 'shoulders', label: 'Shoulder Span' },
              { id: 'chest',     label: 'Chest Girth'  },
              { id: 'waist',     label: 'Waist (Vacuum)'},
              { id: 'arms',      label: 'Arm Sweep'    },
            ].map(s => (
              <div key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{s.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold' }}>{morphs[s.id].toFixed(2)}x</span>
                </div>
                <input type="range" min="0.7" max="1.5" step="0.01" value={morphs[s.id]}
                  onChange={(e) => setMorphs(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            ))}
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

          {/* Anatomy Depth */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>Anatomical Peel</span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{anatomyDepth}% Depth</span>
            </div>
            <input type="range" min="0" max="100" value={anatomyDepth}
              onChange={(e) => setAnatomyDepth(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#22d3ee' }}
            />
          </div>

          {/* Wardrobe & Hair */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>✂ Wardrobe Manager</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['gym', 'casual', 'formal'].map(w => (
                  <button key={w} className={`btn-ghost ${wardrobe === w ? 'active' : ''}`}
                    style={{ flex: 1, fontSize: '0.65rem', padding: '4px' }}
                    onClick={() => setWardrobe(w)}>
                    {w.toUpperCase()}
                  </button>
                ))}
              </div>
              <button className={`btn-ghost ${morphs.apparel ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '0.7rem' }}
                onClick={() => setMorphs(p => ({ ...p, apparel: !p.apparel }))}>
                {morphs.apparel ? 'TOGGLE CLOTHES' : 'NUDE MODE'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>👤 Hair System</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['short', 'medium', 'bald'].map(p => (
                  <button key={p} className={`btn-ghost ${morphs.hair === p ? 'active' : ''}`}
                    style={{ flex: 1, fontSize: '0.65rem', padding: '4px' }}
                    onClick={() => setMorphs(prev => ({ ...prev, hair: p }))}>
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Part Detail */}
      {selected && (
        <div className="glass-card stagger-item" style={{ marginTop: '20px', border: `1px solid ${STATUS[selected.status]?.border || 'var(--border)'}`, background: STATUS[selected.status]?.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <span style={{ fontSize: '2rem' }}>{selected.icon}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selected.name}</h3>
              <span className="label-caps" style={{ color: STATUS[selected.status]?.color }}>{STATUS[selected.status]?.label} Status</span>
            </div>
            <button className="btn-ghost" onClick={() => setSelected(null)}>✕ CLOSE</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p className="label-caps" style={{ fontSize: '0.65rem', marginBottom: '10px', color: 'var(--text-3)' }}>IDENTIFIED ISSUES</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {selected.issues?.map((iss, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', marginBottom: '6px', display: 'flex', gap: '8px', color: '#fca5a5' }}>
                    <span style={{ color: '#ef4444' }}>•</span> {iss}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-caps" style={{ fontSize: '0.65rem', marginBottom: '10px', color: 'var(--text-3)' }}>RESTORATION PLAN</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {selected.fixes?.map((fix, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', marginBottom: '6px', display: 'flex', gap: '8px', color: '#86efac' }}>
                    <span style={{ color: '#22c55e' }}>→</span> {fix}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
              Tap any body part or organ in the live viewport for deep-dive analysis.
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      {!selected && (
        <div className="glass-card stagger-item" style={{ marginTop: '20px', padding: '15px 25px' }}>
          <div className="flex-between">
            <div style={{ display: 'flex', gap: '20px' }}>
              {Object.entries(STATUS).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color }} />
                  <span className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-2)' }}>{v.label}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
              Live viewport supports real-time rotation, zoom, and anatomical exploration.
            </span>
          </div>
        </div>
      )}

      {showGuide && <MeasurementGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
