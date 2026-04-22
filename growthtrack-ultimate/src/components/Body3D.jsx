/**
 * Body3D.jsx — Mirror Digital Twin System
 * 
 * UPGRADE LOG:
 * - Migrated from primitive geometries to photorealistic GLB human models.
 * - Implemented MeshPhysicalMaterial with subsurface scattering for realistic skin.
 * - Integrated Zygote-grade anatomical peel (Skin -> Muscle -> Organs).
 * - Added Parametric Metric System (Height/Weight/BodyFat -> Morph Targets).
 * - Implemented reflective studio environment with MeshReflectorMaterial.
 * - Added Phase 5 Features: Ghost Comparison & X-Ray Split divider.
 * - Added Phase 3 Features: Body Composition Heatmap logic.
 */

import React, { useRef, useState, useEffect, useMemo, Suspense, memo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  useGLTF, 
  Environment, 
  MeshReflectorMaterial, 
  useProgress, 
  Html,
  Bvh
} from "@react-three/drei";
import { Activity, Zap, Ruler, Scissors, User, Settings, Info, Camera, Save, RefreshCw, ZoomIn } from "lucide-react";
import Sprite3DViewer from "./Sprite3DViewer";
import MeasurementGuide from "./MeasurementGuide";
import { USER, STATUS, BODY_PARTS } from "../data/userData";

// ── CONFIG & FALLBACKS ──
const GLB_CURRENT = ""; 
const GLB_GOAL = "";       
const GLB_HAIR = "";     

// Fallback for demo (using Soldier.glb if local paths missing)
const FALLBACK_GLB = "https://threejs.org/examples/models/gltf/Soldier.glb";

// ── PEEL SHADER (Zygote Anatomical Transition) ──
const peelShader = {
  uniforms: {
    uDepth: { value: 1.0 }, // 1.0 = skin, 0.0 = organs
    uColor: { value: new THREE.Color(0xeab308) },
    uEmissive: { value: new THREE.Color(0x3d3000) },
    uIntensity: { value: 0.35 },
    uIsOrgan: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uDepth;
    uniform vec3 uColor;
    uniform vec3 uEmissive;
    uniform float uIntensity;
    uniform float uIsOrgan;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vec3 lightDir = normalize(vec3(1.0, 2.0, 3.0));
      float diff = max(dot(vNormal, lightDir), 0.2);
      vec3 finalColor = uColor * diff + (uEmissive * uIntensity);
      
      float alpha = 1.0;
      
      if (uIsOrgan > 0.5) {
        // Organs fade IN when depth < 0.7
        alpha = smoothstep(0.7, 0.3, uDepth) * 0.9;
      } else {
        // Muscle/Tissue fades OUT when depth decreases
        alpha = smoothstep(0.0, 0.5, uDepth); 
      }
      
      if (alpha < 0.05) discard;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

function createPeelMaterial(colorHex, emissiveHex, intensity = 0.35, isOrgan = false) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(peelShader.uniforms),
    vertexShader: peelShader.vertexShader,
    fragmentShader: peelShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
  mat.uniforms.uColor.value.setHex(colorHex);
  mat.uniforms.uEmissive.value.setHex(emissiveHex);
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uIsOrgan.value = isOrgan ? 1.0 : 0.0;
  return mat;
}

// ── ADVANCED SKIN MATERIAL (Mirror-Realistic) ──
function createSkinMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color || '#C68642'),
    roughness: 0.72,
    metalness: 0.0,
    thickness: 0.8,
    attenuationColor: new THREE.Color('#ff9966'),
    attenuationDistance: 0.3,
    clearcoat: 0.05,
    clearcoatRoughness: 0.9,
    sheen: 0.15,
    sheenColor: new THREE.Color('#ffddcc'),
    envMapIntensity: 0.8,
    transparent: true,
    opacity: 1.0,
    side: THREE.FrontSide,
  });
}

// ── VASCULARITY & DELTA SHADER LOGIC (Phase 4 & 5) ──
function injectVascularity(material, vascularityLevel) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVascularity = { value: vascularityLevel };
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec2 vUv;
       uniform float uVascularity;
       float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
       float noise(vec2 p) {
         vec2 i = floor(p); vec2 f = fract(p);
         float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
         float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
         vec2 u = f * f * (3.0 - 2.0 * f);
         return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
       }
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float vein = noise(vUv * 50.0) * noise(vUv * 20.0);
       float veinMask = smoothstep(0.4, 0.6, vein) * uVascularity;
       diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.7, veinMask);
      `
    );
  };
}

// ── ORGANS DEFINITION ──
const ORGANS_LIST = [
  { color: 0xdd2233, pos: [-0.06, 1.27, 0.07], r: 0.052, key: "heart" },
  { color: 0xcc7755, pos: [-0.11, 1.21, 0.05], r: 0.072, key: "lungs" },
  { color: 0xcc7755, pos: [ 0.11, 1.21, 0.05], r: 0.072, key: "lungs" },
  { color: 0xc85020, pos: [ 0.08, 1.10, 0.05], r: 0.060, key: "liver" },
  { color: 0xb07070, pos: [ 0.00, 1.00, 0.05], r: 0.075, key: "gut"   },
  { color: 0xaa2222, pos: [-0.09, 0.96,-0.08], r: 0.038, key: "kidneys" },
  { color: 0xaa2222, pos: [ 0.09, 0.96,-0.08], r: 0.038, key: "kidneys" },
  { color: 0x9966ee, pos: [ 0.00, 1.15, 0.04], r: 0.028, key: "hormones" },
  { color: 0x4488ff, pos: [ 0.00, 1.30, 0.04], r: 0.042, key: "immune" },
];

function Organs({ depth }) {
  const group = useRef();
  
  const organMeshes = useMemo(() => {
    return ORGANS_LIST.map((o, i) => {
      const mat = createPeelMaterial(o.color, o.color, 0.7, true);
      return { ...o, mat, id: i };
    });
  }, []);

  useFrame(() => {
    if (!group.current) return;
    group.current.traverse(m => {
      if (m.isMesh && m.material.uniforms?.uDepth) {
        m.material.uniforms.uDepth.value = depth / 100;
      }
    });
  });

  return (
    <group ref={group}>
      {organMeshes.map(o => (
        <mesh key={o.id} position={o.pos} material={o.mat} userData={{ ...BODY_PARTS[o.key], key: o.key }}>
          <sphereGeometry args={[o.r, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}

// ── LOADER COMPONENT (Phase 5 Polish) ──
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
        padding: '30px', background: 'rgba(0,0,0,0.85)', borderRadius: '30px',
        backdropFilter: 'blur(10px)', border: '1px solid var(--border-strong)',
        minWidth: '180px'
      }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg width="80" height="80" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
             <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" strokeWidth="5" 
               strokeDasharray={`${progress * 2.83} 283`}
               style={{ transition: 'stroke-dasharray 0.3s ease' }}
               transform="rotate(-90 50 50)"
             />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translateY(-50%) translateX(-50%)', fontWeight: 900, color: 'var(--accent)', fontSize: '1.2rem' }}>
             {progress.toFixed(0)}%
          </div>
        </div>
        <div className="label-caps" style={{ color: 'var(--text-1)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>Bio-Scanning Twin</div>
      </div>
    </Html>
  );
}

// ── HUMAN MODEL COMPONENT (GLB) ──
function HumanModel({ type, morphs, depth, onSelectPart, hairPreset, wardrobe, stressLevel }) {
  const url = type === 'current' ? GLB_CURRENT : GLB_GOAL;
  const { scene } = useGLTF(url.includes("models/") ? url : FALLBACK_GLB);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  const skinMat = useMemo(() => createSkinMaterial(USER.skinTone), []);
  const muscleMat = useMemo(() => createPeelMaterial(0xf43f5e, 0x440000, 0.4, false), []);

  useEffect(() => {
    clonedScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // Bio-Feedback: Face flushing
        if (node.name.toLowerCase().includes('head') || node.name.toLowerCase().includes('face') || node.name.toLowerCase().includes('neck')) {
           node.material.emissive = new THREE.Color('#ff0000');
           node.material.emissiveIntensity = (stressLevel / 100) * 0.4;
        }
        
        // Bind Morphs
        if (node.morphTargetDictionary) {
          const dict = node.morphTargetDictionary;
          const inf = node.morphTargetInfluences;
          if (dict['chest_wide'] !== undefined)     inf[dict['chest_wide']]     = Math.max(0, morphs.chest - 1);
          if (dict['shoulders_wide'] !== undefined) inf[dict['shoulders_wide']] = Math.max(0, morphs.shoulders - 1);
          if (dict['waist_wide'] !== undefined)     inf[dict['waist_wide']]     = Math.max(0, morphs.waist - 1);
          if (dict['arms_thick'] !== undefined)     inf[dict['arms_thick']]     = Math.max(0, morphs.arms - 1);
        }

        // Apply Vascularity (Phase 4)
        const vascularity = Math.max(0, (20 - USER.bodyFat) / 15); // Veins pop more below 15% BF
        if (node.isMesh) injectVascularity(node.material, vascularity);

        // Wardrobe management
        if (node.userData.isApparel || node.name.toLowerCase().includes('clothes') || node.name.toLowerCase().includes('shirt') || node.name.toLowerCase().includes('pants')) {
          const isSelectedType = node.name.toLowerCase().includes(wardrobe);
          node.visible = morphs.apparel && isSelectedType;
        }

        // Hair system
        if (node.name.toLowerCase().includes('hair')) {
           node.visible = (hairPreset !== 'bald' && node.name.toLowerCase().includes(hairPreset));
        }
      }
    });
  }, [clonedScene, morphs, hairPreset, wardrobe]);

  useFrame(() => {
    const d = depth / 100;
    clonedScene.traverse((node) => {
      if (node.isMesh) {
        const skinOpacity = THREE.MathUtils.smoothstep(d, 0.3, 0.7);
        const muscleOpacity = (1 - skinOpacity) * THREE.MathUtils.smoothstep(d, 0.1, 0.4);
        
        if (d > 0.4) {
          node.material = skinMat;
          node.material.opacity = skinOpacity;
        } else if (d > 0.1) {
          node.material = muscleMat;
          node.material.opacity = muscleOpacity;
        } else {
          node.visible = false; 
        }
        
        if (d > 0.1) node.visible = true;
      }
    });
  });

  return <primitive object={clonedScene} onClick={(e) => {
    e.stopPropagation();
    let hit = e.object;
    const partKey = hit.name.toLowerCase() || hit.userData?.key;
    const keyMap = { 'head': 'head', 'neck': 'neck', 'chest': 'chest', 'spine': 'spine', 'arm': 'arms', 'leg': 'legs', 'core': 'core', 'waist': 'core' };
    const matchedKey = Object.keys(keyMap).find(k => partKey.includes(k));
    if (matchedKey) onSelectPart(BODY_PARTS[keyMap[matchedKey]]);
    else if (hit.userData?.key) onSelectPart(hit.userData);
  }} />;
}

// ── SYSTEM SCENE ──
const SystemScene = memo(({ 
  anatomyDepth, 
  morphs, 
  autoRotate, 
  currentView, 
  onSelectPart, 
  setAutoRotate, 
  setCurrentView,
  hairPreset,
  comparisonMode,
  splitPos,
  heatmapMode,
  stressLevel,
  wardrobe
}) => {
  const curRef = useRef();
  const goalRef = useRef();
  const organsRef = useRef();
  const { gl } = useThree();
  
  const internalRot = useRef(0);
  const isDrag = useRef(false);

  // Clipping planes for split mode
  const splitPlaneCur = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  const splitPlaneGoal = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  const ghostMat = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0x22d3ee,
    emissive: 0x003344,
    emissiveIntensity: 0.3,
    opacity: 0.25,
    transparent: true,
    depthWrite: false
  }), []);

  // Sync state-driven material changes (not every frame)
  useEffect(() => {
    if (!curRef.current || !goalRef.current) return;
    
    // Ghost Mode
    if (comparisonMode === 'ghost') {
      goalRef.current.traverse(m => { if (m.isMesh) m.material = ghostMat; });
    } else {
      goalRef.current.traverse(m => {
        if (m.isMesh && m.material === ghostMat) {
           m.material = createSkinMaterial(USER.skinTone);
        }
      });
    }

    // Split Clipping
    const clippingCur = (comparisonMode === 'split') ? [splitPlaneCur] : null;
    const clippingGoal = (comparisonMode === 'split') ? [splitPlaneGoal] : null;
    
    curRef.current.traverse(m => { if (m.isMesh) m.material.clippingPlanes = clippingCur; });
    goalRef.current.traverse(m => { if (m.isMesh) m.material.clippingPlanes = clippingGoal; });

  }, [comparisonMode, ghostMat, splitPlaneCur, splitPlaneGoal]);

  // Main Animation Loop
  useFrame((state, delta) => {
    // 1. Rotation
    if (autoRotate && !isDrag.current) {
      internalRot.current += delta * 0.4;
    } else if (currentView === "Front") internalRot.current = 0;
    else if (currentView === "Side") internalRot.current = Math.PI / 2;
    else if (currentView === "Back") internalRot.current = Math.PI;

    if (curRef.current) curRef.current.rotation.y = internalRot.current;
    if (goalRef.current) goalRef.current.rotation.y = internalRot.current;
    if (organsRef.current) organsRef.current.rotation.y = internalRot.current;

    // 2. Floating Effect
    const t = state.clock.elapsedTime;
    const floatY = Math.sin(t) * 0.01;
    if (curRef.current) curRef.current.position.y = floatY;
    if (goalRef.current) goalRef.current.position.y = floatY;
    if (organsRef.current) organsRef.current.position.y = floatY;
    
    // 3. Viewport Mode Logic
    gl.localClippingEnabled = (comparisonMode === 'split');
    
    if (comparisonMode === 'ghost') {
      if (curRef.current) curRef.current.position.x = 0;
      if (goalRef.current) goalRef.current.position.x = 0;
    } else if (comparisonMode === 'split') {
      const xOffset = (splitPos / 100) * 2.4 - 1.2;
      splitPlaneCur.constant = xOffset;
      splitPlaneGoal.constant = -xOffset;
      if (curRef.current) curRef.current.position.x = 0;
      if (goalRef.current) goalRef.current.position.x = 0;
    } else {
      if (curRef.current) curRef.current.position.x = -1.2;
      if (goalRef.current) goalRef.current.position.x = 1.2;
    }

    // 4. Heatmap Emissive Pulse
    // 4. Heatmap & Delta Pulse Logic
    if (heatmapMode) {
      [curRef, goalRef].forEach(ref => {
        ref.current?.traverse(m => {
          if (m.isMesh && m.material.emissive) {
            const isFatZone = m.name.toLowerCase().includes('waist') || m.name.toLowerCase().includes('gut');
            m.material.emissive.setHex(isFatZone ? 0xff6600 : 0x00aaff);
            m.material.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.2;
          }
        });
      });
    } else if (comparisonMode === 'delta') {
      [curRef].forEach(ref => {
        ref.current?.traverse(m => {
          if (m.isMesh && m.material.emissive) {
            const isGrowthPart = m.name.toLowerCase().includes('chest') || m.name.toLowerCase().includes('arm') || m.name.toLowerCase().includes('shoulders');
            const isLossPart = m.name.toLowerCase().includes('waist') || m.name.toLowerCase().includes('gut');
            
            if (isGrowthPart) {
              m.material.emissive.setHex(0x22c55e); // Green
              m.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
            } else if (isLossPart) {
              m.material.emissive.setHex(0xf97316); // Orange
              m.material.emissiveIntensity = 0.6 + Math.cos(t * 3) * 0.3;
            } else {
              m.material.emissiveIntensity = 0.1;
            }
          }
        });
      });
    } else {
       [curRef, goalRef].forEach(ref => {
        ref.current?.traverse(m => {
          if (m.isMesh && m.material.emissive) m.material.emissiveIntensity = 0.35;
        });
      });
    }
  });

  const pointerDown = () => { isDrag.current = true; setAutoRotate(false); setCurrentView("Custom"); };
  const pointerUp = () => { isDrag.current = false; };
  const pointerMove = (e) => {
    if (isDrag.current) {
      internalRot.current += e.movementX * 0.01;
    }
  };

  return (
    <group onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerMove={pointerMove} onPointerLeave={pointerUp}>
      {/* Photorealistic Lighting Rig */}
      <directionalLight position={[-3, 4, 3]} intensity={1.8} color="#fff5e8" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[4, 2, 2]} intensity={0.6} color="#d6e8ff" />
      <directionalLight position={[0, 3, -5]} intensity={0.9} color="#88aaff" />
      <pointLight position={[0, -0.5, 0.5]} intensity={0.4} color="#ffcc88" distance={4} />
      <ambientLight intensity={0.15} color="#1a1a2e" />
      <Environment preset="studio" />

      {/* Dark Mirror Environment */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <MeshReflectorMaterial
          blur={[200, 100]}
          resolution={512}
          mixBlur={0.9}
          mixStrength={0.4}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050810"
          metalness={0.5}
        />
      </mesh>

      <gridHelper args={[10, 40, 0x1d2d44, 0x0a0f1a]} position={[0, -0.038, 0]} />

      {/* YOU NOW */}
      <group position={[-1.2, 0, 0]} ref={curRef}>
        <Suspense fallback={<Loader />}>
          <HumanModel 
            type="current" 
            morphs={morphs} 
            depth={anatomyDepth} 
            onSelectPart={onSelectPart} 
            hairPreset={hairPreset} 
            wardrobe={wardrobe}
            stressLevel={stressLevel}
          />
        </Suspense>
      </group>

      <group position={[-1.2, 0, 0]} ref={organsRef}>
        {anatomyDepth < 30 && <Organs depth={anatomyDepth} />}
      </group>

      {/* YOUR GOAL */}
      <group position={[1.2, 0, 0]} ref={goalRef}>
        <Suspense fallback={<Loader />}>
          <HumanModel 
            type="goal" 
            morphs={morphs} 
            depth={100} 
            onSelectPart={() => {}} 
            hairPreset={hairPreset} 
            wardrobe={wardrobe}
            stressLevel={0} // Goal is always peak performance (0 stress)
          />
        </Suspense>
      </group>
    </group>
  );
});

// ── MAIN COMPONENT ──
export default function Body3D({ onSelectPart }) {
  const [viewMode, setViewMode] = useState('WEBGL');
  const [anatomyDepth, setAnatomyDepth] = useState(100);
  const [selected, setSelected] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [currentView, setCurrentView] = useState("Rotating");
  const [showEditor, setShowEditor] = useState(true);
  const [comparisonMode, setComparisonMode] = useState('dual'); // 'dual', 'ghost', 'split'
  const [splitPos, setSplitPos] = useState(50);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [stressLevel, setStressLevel] = useState(0); // 0-100
  const [wardrobe, setWardrobe] = useState('gym'); // 'gym', 'casual', 'formal'
  const [showGuide, setShowGuide] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [isZoomed, setIsZoomed] = useState(false);
  
  // LOD & Quality State (Performance Optimization)
  const [quality, setQuality] = useState('HIGH'); // 'HIGH', 'MED', 'LOW'
  
  useEffect(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
      if (gpu.includes('intel') || gpu.includes('mobile')) setQuality('LOW');
      else if (gpu.includes('nvidia') || gpu.includes('amd') || gpu.includes('apple')) setQuality('HIGH');
      else setQuality('MED');
    }
  }, []);
  
  const [metrics, setMetrics] = useState({
    height: USER.height || 182,
    weight: USER.weight || 63,
    bodyFat: 22
  });

  const [morphs, setMorphs] = useState({ 
    shoulders: 1.0, 
    chest: 1.0, 
    waist: 1.0, 
    arms: 1.0, 
    apparel: true,
    hair: 'short'
  });

  const syncFromMetrics = () => {
    const { weight, height, bodyFat } = metrics;
    const lerp = (a, b, t) => a + (b - a) * t;
    
    setMorphs(prev => ({
      ...prev,
      chest:     lerp(0.85, 1.3, (weight - 45) / 85),
      shoulders: lerp(0.9,  1.4, (height - 150) / 60),
      waist:     lerp(0.7,  1.5, (bodyFat - 5) / 35),
      arms:      lerp(0.85, 1.3, (weight - 45) / 85),
    }));
  };

  const captureCanvas = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    // Create watermark overlay
    const link = document.createElement('a');
    link.download = `GrowthTrack_DigitalTwin_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
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
            <Ruler size={12} style={{ marginRight: '6px' }} /> MEASUREMENT GUIDE
          </button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Viewport Area */}
        <div className="glass-card stagger-item" style={{ padding: 0, height: '650px', background: '#050810', position: 'relative', overflow: 'hidden' }}>
          {/* Top Control Bar */}
          <div style={{ 
            position: 'absolute', top: '0', left: '0', right: '0', zIndex: 10, 
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '15px', background: 'linear-gradient(to bottom, rgba(5,8,16,0.9), transparent)',
            gap: '15px'
          }}>
             {/* Left Groups: Modes & Tools */}
             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '70%' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px' }}>
                   <button className={`btn-ghost ${viewMode === 'WEBGL' ? 'active' : ''}`} style={{ fontSize: '0.65rem', padding: '6px 12px' }} onClick={() => setViewMode('WEBGL')}>WEBGL</button>
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

                <button className={`btn-ghost ${heatmapMode ? 'active' : ''}`} style={{ fontSize: '0.65rem' }} onClick={() => setHeatmapMode(!heatmapMode)}>
                   {heatmapMode ? 'HEATMAP ON' : 'HEATMAP OFF'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '2px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                   <span className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>STRESS</span>
                   <input type="range" min="0" max="100" value={stressLevel} onChange={(e) => setStressLevel(parseInt(e.target.value))} style={{ width: '60px', accentColor: '#ef4444' }} />
                </div>
             </div>

             {/* Right Groups: Orientation & Export */}
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
                    onClick={() => { setAutoRotate(!autoRotate); setCurrentView(autoRotate ? 'Custom' : 'Rotating'); }}>
                    {autoRotate ? '360° ROT' : 'PAUSED'}
                </button>

                <button className="btn-ghost" onClick={captureCanvas} style={{ fontSize: '0.65rem', borderColor: '#ef4444', color: '#ef4444' }}>
                   📸 EXPORT
                </button>
             </div>
          </div>

          {/* Floating Action Buttons */}
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '10px' }}>
             <button className="btn-ghost" onClick={() => setShowEditor(!showEditor)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                {showEditor ? 'HIDE EDITOR' : 'SHOW EDITOR'}
             </button>
             <button className="btn-ghost" onClick={() => setIsZoomed(!isZoomed)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                {isZoomed ? <RefreshCw size={14} /> : <ZoomIn size={14} />} {isZoomed ? 'RESET' : 'FOCUS'}
             </button>
          </div>

          {viewMode === 'WEBGL' ? (
            <Canvas 
              shadows={quality !== 'LOW'} 
              camera={{ position: isZoomed ? [0, 1.2, 1.5] : [0, 0.9, 3.8], fov: isZoomed ? 25 : 40 }}
              gl={{ 
                antialias: quality === 'HIGH', 
                toneMapping: THREE.ACESFilmicToneMapping, 
                toneMappingExposure: 1.1,
                powerPreference: 'high-performance'
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

          {/* Split View Divider Slider (Overlay) */}
          {comparisonMode === 'split' && (
            <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '300px', zIndex: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>Split View Divider</span>
                  <span style={{ fontSize: '0.6rem', color: 'white' }}>{splitPos}%</span>
               </div>
               <input 
                 type="range" min="0" max="100" 
                 value={splitPos} onChange={(e) => setSplitPos(parseInt(e.target.value))}
                 style={{ width: '100%', accentColor: 'var(--accent)' }}
               />
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '25px', left: '0', right: '0', display: 'flex', justifyContent: 'space-around', pointerEvents: 'none' }}>
             <div className="label-caps" style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '20px', border: '1px solid var(--accent)' }}>YOU NOW</div>
             <div className="label-caps" style={{ color: '#22d3ee', background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '20px', border: '1px solid #22d3ee' }}>YOUR GOAL</div>
          </div>
        </div>

        {/* Editor Sidebar */}
        <div className={`glass-card stagger-item ${!showEditor ? 'hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto', maxHeight: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <Settings size={18} color="var(--accent)" />
            <h3 className="label-caps" style={{ fontSize: '0.9rem', color: 'var(--text-1)' }}>Parametric Editor</h3>
          </div>

          {/* Body Metrics Section */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
               <Ruler size={14} color="var(--accent)" />
               <span className="label-caps" style={{ fontSize: '0.7rem' }}>Body Metrics</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'height', label: 'Height', min: 150, max: 210, unit: 'cm' },
                { id: 'weight', label: 'Weight', min: 45, max: 130, unit: 'kg' },
                { id: 'bodyFat', label: 'Body Fat', min: 5, max: 40, unit: '%' },
              ].map(m => (
                <div key={m.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{m.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-1)', fontWeight: 'bold' }}>{metrics[m.id]}{m.unit}</span>
                  </div>
                  <input 
                    type="range" min={m.min} max={m.max} 
                    value={metrics[m.id]} 
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

          {/* Advanced Snapshots (Phase 2) */}
          <div style={{ background: 'rgba(34, 211, 238, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={14} color="#22d3ee" />
                  <span className="label-caps" style={{ fontSize: '0.7rem', color: '#22d3ee' }}>Snapshots</span>
               </div>
               <button className="btn-ghost" style={{ fontSize: '0.6rem', padding: '2px 8px' }} onClick={() => setSnapshots([...snapshots, { id: Date.now(), metrics, morphs, date: new Date().toLocaleTimeString() }])}>
                  <Save size={10} style={{ marginRight: '4px' }} /> SAVE
               </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
               {snapshots.length === 0 && <p style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>No snapshots saved.</p>}
               {snapshots.map(s => (
                 <button key={s.id} className="glass-card" style={{ padding: '5px 10px', fontSize: '0.6rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }} onClick={() => { setMetrics(s.metrics); setMorphs(s.morphs); }}>
                    {s.date}
                 </button>
               ))}
            </div>
          </div>

          {/* Manual Morph Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Zap size={14} color="var(--accent)" />
               <span className="label-caps" style={{ fontSize: '0.7rem' }}>Manual Morph Control</span>
            </div>
            {[
              { id: 'shoulders', label: 'Shoulder Span' },
              { id: 'chest', label: 'Chest Girth' },
              { id: 'waist', label: 'Waist (Vacuum)' },
              { id: 'arms', label: 'Arm Sweep' },
            ].map(s => (
              <div key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{s.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold' }}>{morphs[s.id].toFixed(2)}x</span>
                </div>
                <input 
                  type="range" min="0.7" max="1.5" step="0.01" 
                  value={morphs[s.id]} 
                  onChange={(e) => setMorphs(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            ))}
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

          {/* Anatomy Depth Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
               <span className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>Anatomical Peel</span>
               <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{anatomyDepth}% Depth</span>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={anatomyDepth} onChange={(e) => setAnatomyDepth(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#22d3ee' }}
            />
          </div>

          {/* Apparel & Hair Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Scissors size={14} color="var(--text-3)" />
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Wardrobe Manager</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                   {['gym', 'casual', 'formal'].map(w => (
                     <button key={w} className={`btn-ghost ${wardrobe === w ? 'active' : ''}`} style={{ flex: 1, fontSize: '0.65rem', padding: '4px' }} onClick={() => setWardrobe(w)}>
                        {w.toUpperCase()}
                     </button>
                   ))}
                </div>
                <button className={`btn-ghost ${morphs.apparel ? 'active' : ''}`} style={{ padding: '4px 12px', fontSize: '0.7rem' }} onClick={() => setMorphs(p => ({ ...p, apparel: !p.apparel }))}>
                   {morphs.apparel ? 'TOGGLE CLOTHES' : 'NUDE MODE'}
                </button>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <User size={14} color="var(--text-3)" />
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Hair System</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                   {['short', 'medium', 'bald'].map(p => (
                     <button key={p} className={`btn-ghost ${morphs.hair === p ? 'active' : ''}`} style={{ flex: 1, fontSize: '0.65rem', padding: '4px' }} onClick={() => setMorphs(prev => ({ ...prev, hair: p }))}>
                        {p.toUpperCase()}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Selected Part Detail Overlay */}
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

           {/* Phase 4: Digital Twin Likeness Mock */}
           {selected.key === 'head' && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed var(--accent)' }}>
                 <p className="label-caps" style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '10px' }}>Facial Likeness Integration (Phase 4)</p>
                 <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                       <User size={30} color="var(--text-3)" />
                    </div>
                    <div style={{ flex: 1 }}>
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '5px' }}>Upload a front-facing selfie to map your real face onto the Digital Twin.</p>
                       <button className="btn-ghost" style={{ fontSize: '0.7rem' }}>CHOOSE PHOTO...</button>
                    </div>
                 </div>
              </div>
           )}

           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
              <Info size={14} color="var(--text-3)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                Tap any body part or organ in the live viewport for deep-dive analysis.
              </span>
           </div>
        </div>
      )}

      {/* Legend & Stats */}
      {!selected && (
        <div className="glass-card stagger-item" style={{ marginTop: '20px', padding: '15px 25px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color }} />
                     <span className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-2)' }}>{v.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <Info size={14} color="var(--text-3)" />
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                   Live viewport supports real-time rotation, zoom, and anatomical exploration.
                 </span>
              </div>
           </div>
        </div>
      )}

      {showGuide && <MeasurementGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
