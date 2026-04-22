import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Activity, Zap } from 'lucide-react';
import * as THREE from 'three';
import Sprite3DViewer from './Sprite3DViewer';
import { USER } from '../data/userData';

// Procedural Parametric Human Component
function ParametricHuman({ morphs, depth, bioFeedback }) {
  const groupRef = useRef();

  // Material Refs for real-time shader syncing
  const skinMat = useRef(new THREE.MeshStandardMaterial()).current;
  const muscleMat = useRef(new THREE.MeshStandardMaterial()).current;
  const boneMat = useRef(new THREE.MeshStandardMaterial()).current;

  // Bio-Feedback Visual Mapping
  const skinRoughness = bioFeedback.hydration === 'CRITICAL' ? 0.95 : 0.4;
  const skinColor = bioFeedback.sleep === 'CRITICAL' ? '#cbd5e1' : '#e2e8f0'; // Pale if deprived

  // Animation & Shader Sync Loop
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
    
    // Phase 5: Bio-Feedback Pulse (High Stress/Caffeine triggers nervous system throb)
    if (bioFeedback.stress === 'CRITICAL' && depth > 0) {
      muscleMat.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 6) * 0.3;
    } else {
      muscleMat.emissiveIntensity = 0;
    }
  });

  // Calculate opacities based on depth (0 = Skin, 0.5 = Muscle, 1 = Bone)
  const skinOpacity = Math.max(0, 1 - depth * 2);
  const muscleOpacity = depth <= 0.5 ? depth * 2 : 2 - depth * 2;
  const boneOpacity = Math.max(0, (depth - 0.5) * 2);

  // Update Material Properties
  skinMat.color.set(skinColor);
  skinMat.roughness = skinRoughness;
  skinMat.transparent = true;
  skinMat.opacity = skinOpacity;

  muscleMat.color.set('#f43f5e');
  muscleMat.emissive.set('#440000');
  muscleMat.transparent = true;
  muscleMat.opacity = muscleOpacity;

  boneMat.color.set('#f8fafc');
  boneMat.transparent = true;
  boneMat.opacity = boneOpacity;

  const renderLayer = (mat) => (
    <group>
      {/* Head */}
      <mesh material={mat} position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.12, 32, 24]} />
      </mesh>
      
      {/* Torso - Morph Target (Chest Width/Depth) */}
      <mesh material={mat} position={[0, 1.35, 0]} scale={[morphs.chest, 1, morphs.chest * 0.9]}>
        <boxGeometry args={[0.4, 0.55, 0.25]} />
      </mesh>
      
      {/* Arms - Parented logically based on shoulders */}
      <mesh material={mat} position={[-0.18 - (morphs.shoulders * 0.1), 1.4, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.04, 0.035, 0.6]} />
      </mesh>
      <mesh material={mat} position={[0.18 + (morphs.shoulders * 0.1), 1.4, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.04, 0.035, 0.6]} />
      </mesh>
      
      {/* Legs - Morph Target */}
      <mesh material={mat} position={[-0.12, 0.6, 0]} scale={[morphs.legs, 1, morphs.legs]}>
        <cylinderGeometry args={[0.08, 0.06, 0.9]} />
      </mesh>
      <mesh material={mat} position={[0.12, 0.6, 0]} scale={[morphs.legs, 1, morphs.legs]}>
        <cylinderGeometry args={[0.08, 0.06, 0.9]} />
      </mesh>
    </group>
  );

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {skinOpacity > 0 && renderLayer(skinMat)}
      {muscleOpacity > 0 && renderLayer(muscleMat)}
      {boneOpacity > 0 && renderLayer(boneMat)}
    </group>
  );
}

export default function Body3D() {
  const [viewMode, setViewMode] = useState('WEBGL');
  const [depth, setDepth] = useState(0); 
  const [morphs, setMorphs] = useState({ shoulders: 1.0, chest: 1.0, waist: 1.0, legs: 1.0 });

  // Phase 5: Map raw User Data to Bio-Feedback triggers
  const bioFeedback = {
    hydration: USER.waterIntake.includes("1-2") ? 'CRITICAL' : 'OPTIMAL',
    sleep: USER.sleepHours.includes("5-6") ? 'CRITICAL' : 'OPTIMAL',
    stress: USER.caffeine.includes("3+") ? 'CRITICAL' : 'OPTIMAL'
  };

  return (
    <div className="fade-in stagger-container">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>3D Parametric Human Engine</h2>
        <p className="text-secondary">Powered by React Three Fiber with anatomical peeling and mapping.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div className="glass-card stagger-item" style={{ padding: 0, height: '600px', background: 'var(--bg-base)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, display: 'flex', gap: '8px' }}>
             <button className={`btn-ghost ${viewMode === 'WEBGL' ? 'active' : ''}`} onClick={() => setViewMode('WEBGL')} style={{ fontSize: '0.65rem' }}>WEBGL R3F CORE</button>
             <button className={`btn-ghost ${viewMode === 'SPRITE' ? 'active' : ''}`} onClick={() => setViewMode('SPRITE')} style={{ fontSize: '0.65rem' }}>HEMISPHERICAL SPRITE</button>
          </div>

          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="label-caps" style={{ color: 'var(--accent)' }}>Anatomical Depth</span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{Math.round(depth * 100)}% Peel</span>
            </div>
            <input 
                type="range" min="0" max="1" step="0.01" 
                value={depth} onChange={(e) => setDepth(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          {viewMode === 'WEBGL' ? (
             <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[2, 5, 5]} intensity={1} />
                <pointLight position={[-2, 2, -2]} color="#0ea5e9" intensity={0.5} />
                <ParametricHuman morphs={morphs} depth={depth} bioFeedback={bioFeedback} />
                <ContactShadows opacity={0.4} scale={5} blur={2.4} position={[0, -1, 0]} />
                <OrbitControls enableZoom={false} enablePan={false} />
             </Canvas>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
               <Sprite3DViewer modelPrefix="current" />
            </div>
          )}
        </div>

        <div className="glass-card stagger-item" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--accent)" />
            <p className="label-caps">Bio-Physical Morphing</p>
          </div>

          {[
            { id: 'shoulders', label: 'Shoulder Span', val: morphs.shoulders },
            { id: 'chest', label: 'Chest Depth', val: morphs.chest },
            { id: 'waist', label: 'Waist Vacuum', val: morphs.waist },
            { id: 'legs', label: 'Lower Body Mass', val: morphs.legs },
          ].map(slider => (
            <div key={slider.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{slider.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800 }}>{slider.val}x</span>
              </div>
              <input 
                type="range" min="0.8" max="1.5" step="0.01" 
                value={slider.val}
                onChange={(e) => setMorphs(p => ({ ...p, [slider.id]: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
               <Activity size={14} color="var(--accent)" />
               <p className="label-caps" style={{ color: 'var(--text-2)' }}>Phase 5 Bio-Feedback Sync</p>
            </div>
            <ul style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.5, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <li><strong style={{ color: bioFeedback.sleep === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-green)' }}>SLEEP ({bioFeedback.sleep}):</strong> Skin tone mapping</li>
               <li><strong style={{ color: bioFeedback.hydration === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-green)' }}>HYDRATION ({bioFeedback.hydration}):</strong> Texture roughness</li>
               <li><strong style={{ color: bioFeedback.stress === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-green)' }}>STRESS ({bioFeedback.stress}):</strong> Nervous system throb</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
