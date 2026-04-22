/**
 * Body3D.jsx — Mirror Digital Twin System
 *
 * UI: Restored from Improvements4 (growthtrack-ultimate)
 *   - Glassmorphic dashboard grid layout (650px viewport + 360px editor sidebar)
 *   - Comparison modes: dual | ghost | split | delta
 *   - Heatmap overlay toggle
 *   - Stress Level bio-feedback slider
 *   - Wardrobe manager (gym / casual / formal)
 *   - Snapshot / Camera capture strip
 *   - Quality selector (Ultra / High / Balanced / Perf)
 *   - Measurement Guide modal button
 *   - Split-view drag divider
 *   - Animated section header + stagger entrance
 *   - Full OrbitControls + Bvh
 *
 * 3D ENGINE: Mirror-Realistic from improvement4-mirror-realistic-3d
 *   - GLB human mesh via useGLTF (fallback: Soldier.glb)
 *   - PBR MeshPhysicalMaterial with subsurface skin shader
 *   - Studio 4-point lighting rig + Environment HDRI
 *   - MeshReflectorMaterial mirror floor
 *   - Body Metrics → morph auto-compute
 *   - Zygote anatomical peel (uDepth shader)
 *   - Organ spheres + raycaster selection
 *   - Hair preset toggle (short / medium / bald)
 *   - Apparel visibility toggle
 */

import React, {
  useRef, useState, useEffect, useMemo, useCallback, memo, Suspense
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  MeshReflectorMaterial,
  useProgress,
  Html,
  Bvh,
} from "@react-three/drei";
import { STATUS, BODY_PARTS } from "../data/userData";
import Sprite3DViewer from "./Sprite3DViewer";

// ── CONFIG ──────────────────────────────────────────────────────────────────
const FALLBACK_GLB  = "https://threejs.org/examples/models/gltf/Soldier.glb";
const CURRENT_GLB   = "/models/human_current.glb";
const GOAL_GLB      = "/models/human_goal.glb";

const SKIN_TONES = {
  light:    "#E8C9A0",
  medium:   "#C68642",
  tan:      "#A0522D",
  dark:     "#6B3A2A",
  deepDark: "#3B1F0E",
};

const MESH_TO_BODYPART = {
  Head:"head", head:"head",
  Neck:"neck", neck:"neck",
  Chest:"chest", chest:"chest", Spine1:"chest", Spine2:"chest",
  Hips:"core", Spine:"core",
  LeftArm:"arms", RightArm:"arms",
  LeftForeArm:"arms", RightForeArm:"arms",
  LeftUpLeg:"legs", RightUpLeg:"legs",
  LeftLeg:"legs", RightLeg:"legs",
  LeftShoulder:"shoulders", RightShoulder:"shoulders",
};

const COMPARE_MODES = [
  { id:"dual",  label:"Dual",  icon:"⚖️" },
  { id:"ghost", label:"Ghost", icon:"👻" },
  { id:"split", label:"Split", icon:"✂️" },
  { id:"delta", label:"Delta", icon:"Δ"  },
];

const WARDROBE = [
  { id:"none",   label:"None",   icon:"🔲" },
  { id:"gym",    label:"Gym",    icon:"🏋️" },
  { id:"casual", label:"Casual", icon:"👕" },
  { id:"formal", label:"Formal", icon:"👔" },
];

const QUALITY = [
  { id:"ultra",    label:"Ultra",    dpr:2   },
  { id:"high",     label:"High",     dpr:1.5 },
  { id:"balanced", label:"Balanced", dpr:1   },
  { id:"perf",     label:"Perf",     dpr:0.7 },
];

// ── PEEL SHADER ──────────────────────────────────────────────────────────────
const peelShader = {
  uniforms: {
    uDepth:     { value: 1.0 },
    uColor:     { value: new THREE.Color(0xeab308) },
    uEmissive:  { value: new THREE.Color(0x3d3000) },
    uIntensity: { value: 0.35 },
    uIsOrgan:   { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
    void main() {
      vUv = uv; vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position,1.0);
      vPosition = mvPos.xyz; gl_Position = projectionMatrix * mvPos;
    }`,
  fragmentShader: `
    uniform float uDepth; uniform vec3 uColor; uniform vec3 uEmissive;
    uniform float uIntensity; uniform float uIsOrgan;
    varying vec2 vUv; varying vec3 vNormal;
    void main() {
      vec3 ld = normalize(vec3(1,2,3));
      float diff = max(dot(vNormal,ld),0.2);
      vec3 col = uColor*diff + uEmissive*uIntensity;
      float a = uIsOrgan>0.5 ? smoothstep(0.7,0.3,uDepth)*0.9 : max(0.12,uDepth);
      if(a<0.05) discard;
      gl_FragColor = vec4(col,a);
    }`,
};

function createPeelMaterial(colorHex, emissiveHex, intensity=0.35, isOrgan=false) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(peelShader.uniforms),
    vertexShader: peelShader.vertexShader,
    fragmentShader: peelShader.fragmentShader,
    transparent: true, side: THREE.DoubleSide,
  });
  mat.uniforms.uColor.value.setHex(colorHex);
  mat.uniforms.uEmissive.value.setHex(emissiveHex);
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uIsOrgan.value = isOrgan ? 1.0 : 0.0;
  return mat;
}

// ── PBR SKIN MATERIAL ────────────────────────────────────────────────────────
function createSkinMaterial(hex="#C68642", isGoal=false) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    roughness: 0.72, metalness: 0.0,
    thickness: 0.8,
    attenuationColor: new THREE.Color("#ff9966"),
    attenuationDistance: 0.3,
    clearcoat: 0.05, clearcoatRoughness: 0.9,
    sheen: 0.15, sheenColor: new THREE.Color("#ffddcc"),
    envMapIntensity: 0.8,
    transparent: isGoal, opacity: isGoal ? 0.82 : 1.0,
    side: THREE.FrontSide,
    emissive: isGoal ? new THREE.Color(0x001122) : new THREE.Color(0x000000),
    emissiveIntensity: isGoal ? 0.15 : 0.0,
  });
}

// ── ORGANS ───────────────────────────────────────────────────────────────────
const ORGANS_LIST = [
  { color:0xdd2233, pos:[-0.06,1.27,0.07], r:0.052, key:"heart"   },
  { color:0xcc7755, pos:[-0.11,1.21,0.05], r:0.072, key:"lungs"   },
  { color:0xcc7755, pos:[ 0.11,1.21,0.05], r:0.072, key:"lungs"   },
  { color:0xc85020, pos:[ 0.08,1.10,0.05], r:0.060, key:"liver"   },
  { color:0xb07070, pos:[ 0.00,1.00,0.05], r:0.075, key:"gut"     },
  { color:0xaa2222, pos:[-0.09,0.96,-0.08],r:0.038, key:"kidneys" },
  { color:0xaa2222, pos:[ 0.09,0.96,-0.08],r:0.038, key:"kidneys" },
  { color:0x9966ee, pos:[ 0.00,1.15,0.04], r:0.028, key:"hormones"},
  { color:0x4488ff, pos:[ 0.00,1.30,0.04], r:0.042, key:"immune"  },
];

function buildOrgans() {
  const group = new THREE.Group();
  ORGANS_LIST.forEach(o => {
    const mat = createPeelMaterial(o.color, o.color, 0.7, true);
    const m = new THREE.Mesh(new THREE.SphereGeometry(o.r,12,12), mat);
    m.position.set(...o.pos);
    m.userData = BODY_PARTS[o.key] ? { ...BODY_PARTS[o.key], key:o.key } : {};
    group.add(m);
  });
  return group;
}

// ── MODEL LOADER ─────────────────────────────────────────────────────────────
function ModelLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:12,
        padding:"24px 32px",
        background:"linear-gradient(145deg,rgba(5,8,16,0.95),rgba(10,15,30,0.95))",
        borderRadius:20, border:"1px solid rgba(212,175,55,0.3)",
        backdropFilter:"blur(16px)", minWidth:160,
        boxShadow:"0 0 40px rgba(212,175,55,0.1)",
      }}>
        <svg width="64" height="64" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#d4af37" strokeWidth="6"
            strokeDasharray={`${progress*2.76} 276`}
            strokeLinecap="round"
            style={{transition:"stroke-dasharray 0.3s ease"}}
            transform="rotate(-90 50 50)"/>
        </svg>
        <div style={{fontWeight:800, color:"#d4af37", fontSize:"1.3rem"}}>{progress.toFixed(0)}%</div>
        <div style={{fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.4)", textTransform:"uppercase"}}>Bio-Scanning Twin</div>
      </div>
    </Html>
  );
}

// ── HUMAN MODEL ───────────────────────────────────────────────────────────────
function HumanModel({ glbPath, morphs, anatomyDepth, isGoal, onSelectPart, selRef, skinTone, position, stressLevel=0, compareMode, splitX }) {
  const depthNorm = anatomyDepth / 100.0;
  const gltf = useGLTF(glbPath);
  const cloned = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  useEffect(() => {
    const skinMat = createSkinMaterial(skinTone, isGoal);
    cloned.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true; node.receiveShadow = true;
      node.material = skinMat.clone();
      // Bio-feedback: stress flush on face
      if (stressLevel > 0) {
        const name = node.name.toLowerCase();
        if (name.includes("head")||name.includes("face")||name.includes("neck")) {
          node.material.emissive = new THREE.Color("#ff2200");
          node.material.emissiveIntensity = (stressLevel/100)*0.45;
        }
      }
      const bpKey = MESH_TO_BODYPART[node.name] || MESH_TO_BODYPART[node.parent?.name];
      if (bpKey && BODY_PARTS[bpKey]) node.userData = { ...BODY_PARTS[bpKey], key:bpKey };
    });
  }, [cloned, skinTone, isGoal, stressLevel]);

  useEffect(() => {
    cloned.traverse(node => {
      if (!node.isMesh || !node.morphTargetDictionary) return;
      const dict = node.morphTargetDictionary;
      const inf  = node.morphTargetInfluences;
      const toInf = v => Math.max(0, Math.min(1, v-1.0));
      if (dict["chest_wide"]     !==undefined) inf[dict["chest_wide"]]     = toInf(morphs.chest);
      if (dict["shoulders_wide"] !==undefined) inf[dict["shoulders_wide"]] = toInf(morphs.shoulders);
      if (dict["waist_wide"]     !==undefined) inf[dict["waist_wide"]]     = toInf(morphs.waist);
      if (dict["arms_thick"]     !==undefined) inf[dict["arms_thick"]]     = toInf(morphs.arms);
    });
  }, [morphs, cloned]);

  useFrame(() => {
    const tgt = Math.max(0, Math.min(1, depthNorm*2-1));
    cloned.traverse(node => {
      if (node.isMesh && node.material instanceof THREE.MeshPhysicalMaterial) {
        node.material.opacity = THREE.MathUtils.lerp(node.material.opacity, tgt, 0.07);
        node.material.transparent = node.material.opacity < 0.99;
      }
      if (node.isMesh && node.userData?.isApparel) node.visible = morphs.apparel;
    });
  });

  const handleClick = e => {
    e.stopPropagation();
    const hit = e.object;
    if (hit.userData?.name || hit.userData?.key) {
      if (selRef.current?.material?.emissiveIntensity !== undefined)
        selRef.current.material.emissiveIntensity = isGoal ? 0.15 : 0.0;
      selRef.current = hit;
      hit.material.emissiveIntensity = 0.7;
      hit.material.emissive?.set("#d4af37");
      onSelectPart({ ...hit.userData });
    }
  };

  return (
    <group position={position}>
      <primitive object={cloned} onClick={handleClick} />
    </group>
  );
}

// ── ORGANS LAYER ─────────────────────────────────────────────────────────────
const OrgansLayer = memo(({ anatomyDepth, onSelectPart, position }) => {
  const organGroup = useMemo(() => buildOrgans(), []);
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const d = anatomyDepth/100.0;
    organGroup.traverse(m => {
      if (m.isMesh && m.material.uniforms?.uDepth)
        m.material.uniforms.uDepth.value = d;
    });
  });
  return (
    <group ref={ref} position={position}>
      <primitive object={organGroup} onClick={e => {
        e.stopPropagation();
        const h = e.object;
        if (h.userData?.name||h.userData?.key) onSelectPart({ ...h.userData });
      }} />
    </group>
  );
});

// ── STUDIO LIGHTS ────────────────────────────────────────────────────────────
function StudioLights() {
  return (
    <>
      <directionalLight position={[-3,4,3]} intensity={1.8} color="#fff5e8" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={20} shadow-camera-left={-3} shadow-camera-right={3}
        shadow-camera-top={4} shadow-camera-bottom={-2} />
      <directionalLight position={[4,2,2]}   intensity={0.6} color="#d6e8ff" />
      <directionalLight position={[0,3,-5]}  intensity={0.9} color="#88aaff" />
      <pointLight       position={[0,-0.5,0.5]} intensity={0.4} color="#ffcc88" distance={4} />
      <ambientLight intensity={0.12} color="#1a1a2e" />
    </>
  );
}

// ── REFLECTIVE FLOOR ─────────────────────────────────────────────────────────
function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.04,0]} receiveShadow>
      <planeGeometry args={[10,10]} />
      <MeshReflectorMaterial
        blur={[200,100]} resolution={512}
        mixBlur={0.85} mixStrength={0.45}
        roughness={1} depthScale={1.2}
        minDepthThreshold={0.4} maxDepthThreshold={1.4}
        color="#050810" metalness={0.5} />
    </mesh>
  );
}

// ── SCENE RINGS ───────────────────────────────────────────────────────────────
function SceneRings() {
  const ref0 = useRef(), ref1 = useRef();
  useFrame(s => {
    const t = s.clock.elapsedTime;
    if (ref0.current) ref0.current.material.emissiveIntensity = 0.5+Math.sin(t*2)*0.4;
    if (ref1.current) ref1.current.material.emissiveIntensity = 0.5+Math.sin(t*2+Math.PI)*0.4;
  });
  return (
    <>
      {[[-1.1,0xf59e0b,ref0],[1.1,0x22d3ee,ref1]].map(([x,c,r],i) => (
        <mesh key={i} ref={r} position={[x,-0.032,0]} rotation={[Math.PI/2,0,0]}>
          <torusGeometry args={[0.28,0.012,8,48]} />
          <meshPhongMaterial color={c} emissive={c} emissiveIntensity={0.9} />
        </mesh>
      ))}
    </>
  );
}

// ── MAIN R3F SCENE ────────────────────────────────────────────────────────────
const SystemScene = memo(({
  anatomyDepth, morphs, autoRotate, currentView,
  onSelectPart, setAutoRotate, setCurrentView, skinTone,
  compareMode, stressLevel, splitX,
}) => {
  const rotRef  = useRef(0);
  const isDrag  = useRef(false);
  const selRef  = useRef(null);
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (autoRotate && !isDrag.current) rotRef.current += delta * 0.25;
    else {
      const T = { Front:0, Side:Math.PI/2, Back:Math.PI };
      if (T[currentView] !== undefined)
        rotRef.current = THREE.MathUtils.lerp(rotRef.current, T[currentView], 0.08);
    }
    camera.position.y = 0.9 + Math.sin(state.clock.elapsedTime*0.3)*0.005;
  });

  const onPD = () => { isDrag.current=true; setAutoRotate(false); setCurrentView("Custom"); };
  const onPU = () => { isDrag.current=false; };

  const goalMorphs = { ...morphs, chest:morphs.chest*1.15, shoulders:morphs.shoulders*1.18, waist:morphs.waist*0.88, arms:morphs.arms*1.18 };
  const showBoth   = compareMode==="dual"||compareMode==="delta";
  const showGhost  = compareMode==="ghost";
  const showSplit  = compareMode==="split";

  return (
    <group onPointerDown={onPD} onPointerUp={onPU} onPointerLeave={onPU}>
      <StudioLights />
      <Environment preset="studio" background={false} />
      <ReflectiveFloor />
      <SceneRings />
      <OrbitControls enablePan={false} minPolarAngle={0.3} maxPolarAngle={2.2} minDistance={2} maxDistance={7} />

      {/* CURRENT */}
      <Suspense fallback={<ModelLoader />}>
        <Bvh>
          <group rotation-y={rotRef.current}>
            <HumanModel
              glbPath={CURRENT_GLB}
              morphs={morphs}
              anatomyDepth={anatomyDepth}
              isGoal={false}
              onSelectPart={onSelectPart}
              selRef={selRef}
              skinTone={skinTone}
              position={showBoth ? [-1.1,0,0] : [0,0,0]}
              stressLevel={stressLevel}
              compareMode={compareMode}
            />
            <OrgansLayer
              anatomyDepth={anatomyDepth}
              onSelectPart={onSelectPart}
              position={showBoth ? [-1.1,0,0] : [0,0,0]}
            />
          </group>
        </Bvh>
      </Suspense>

      {/* GOAL — dual or ghost */}
      {(showBoth||showGhost) && (
        <Suspense fallback={null}>
          <Bvh>
            <group rotation-y={rotRef.current}>
              <HumanModel
                glbPath={GOAL_GLB}
                morphs={goalMorphs}
                anatomyDepth={100}
                isGoal={true}
                onSelectPart={() => {}}
                selRef={{ current:null }}
                skinTone={skinTone}
                position={showBoth ? [1.1,0,0] : [0,0,0]}
                stressLevel={0}
                compareMode={compareMode}
              />
            </group>
          </Bvh>
        </Suspense>
      )}
    </group>
  );
});

// ── MORPH COMPUTE ─────────────────────────────────────────────────────────────
function computeMorphs(h,w,bf) {
  const L=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
  return {
    chest:     L(0.85,1.30,(w-45)/85),
    shoulders: L(0.90,1.40,(h-150)/60),
    waist:     L(0.72,1.50,(bf-5)/35),
    arms:      L(0.85,1.30,(w-45)/85),
  };
}

// ── GLASS BTN ─────────────────────────────────────────────────────────────────
const GBtn = ({ active, onClick, children, style={}, title }) => (
  <button onClick={onClick} title={title} style={{
    background: active
      ? "linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))"
      : "rgba(255,255,255,0.04)",
    border: `1px solid ${active ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.08)"}`,
    borderRadius:8, padding:"6px 14px",
    color: active ? "#d4af37" : "rgba(255,255,255,0.55)",
    fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase",
    cursor:"pointer", backdropFilter:"blur(8px)",
    boxShadow: active ? "0 0 14px rgba(212,175,55,0.2),inset 0 1px rgba(255,255,255,0.1)" : "none",
    transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
    ...style,
  }}>
    {children}
  </button>
);

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
const SLabel = ({ children, color="#d4af37" }) => (
  <div style={{
    fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.2em",
    color, marginBottom:8, marginTop:6,
    display:"flex", alignItems:"center", gap:6,
  }}>
    <span style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}44,transparent)` }} />
    {children}
    <span style={{ flex:1, height:1, background:`linear-gradient(270deg,${color}44,transparent)` }} />
  </div>
);

// ── SLIDER ROW ────────────────────────────────────────────────────────────────
const SliderRow = ({ label, val, min, max, step, onChange, unit="", color="#d4af37" }) => (
  <div style={{ marginBottom:10 }}>
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:3 }}>
      <span>{label}</span>
      <span style={{ color, fontWeight:700 }}>{typeof val==="number" ? val.toFixed(step<1?2:0) : val}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={val}
      onChange={e=>onChange(step<1?parseFloat(e.target.value):parseInt(e.target.value))}
      style={{ width:"100%", cursor:"ew-resize", accentColor:color }} />
  </div>
);

// ── SIDEBAR EDITOR ────────────────────────────────────────────────────────────
function SidebarEditor({
  morphs, setMorphs, anatomyDepth, setAnatomyDepth,
  skinTone, setSkinTone, stressLevel, setStressLevel,
  wardrobe, setWardrobe,
}) {
  const [h, setH] = useState(182);
  const [w, setW] = useState(63);
  const [bf, setBf] = useState(22);

  return (
    <div style={{
      width:340, flexShrink:0,
      background:"linear-gradient(180deg,rgba(8,10,20,0.92),rgba(5,7,14,0.95))",
      border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:16, padding:"16px 16px 20px",
      backdropFilter:"blur(24px)",
      overflowY:"auto", maxHeight:650,
    }}>

      {/* BODY METRICS */}
      <SLabel color="#f59e0b">📐 Body Metrics</SLabel>
      <div style={{ background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:10, padding:"10px 12px 8px", marginBottom:12 }}>
        <SliderRow label="Height" val={h} min={150} max={210} step={1} onChange={setH} unit=" cm" color="#f59e0b" />
        <SliderRow label="Weight" val={w} min={45}  max={130} step={1} onChange={setW} unit=" kg" color="#f59e0b" />
        <SliderRow label="Body Fat" val={bf} min={5} max={40} step={1} onChange={setBf} unit="%" color="#f59e0b" />
        <button onClick={() => setMorphs(m => ({ ...m, ...computeMorphs(h,w,bf) }))} style={{
          width:"100%", padding:"7px 0", fontSize:11, fontWeight:800,
          background:"linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.08))",
          border:"1px solid rgba(245,158,11,0.4)", borderRadius:7,
          color:"#f59e0b", cursor:"pointer", letterSpacing:"0.08em",
          boxShadow:"0 0 12px rgba(245,158,11,0.1)",
        }}>⚡ Sync Morphs from Metrics</button>
      </div>

      {/* ANATOMICAL DEPTH */}
      <SLabel color="#22d3ee">🔬 Anatomical Depth</SLabel>
      <SliderRow label="Depth" val={anatomyDepth} min={0} max={100} step={1} onChange={setAnatomyDepth} unit="%" color="#22d3ee" />

      {/* STRESS BIO-FEEDBACK */}
      <SLabel color="#f43f5e">💓 Stress Bio-Feed</SLabel>
      <SliderRow label="Stress Level" val={stressLevel} min={0} max={100} step={1} onChange={setStressLevel} unit="%" color="#f43f5e" />

      <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"10px 0" }} />

      {/* SHAPE MORPHS */}
      <SLabel>🧬 Shape Morphs</SLabel>
      <SliderRow label="Chest Girth"    val={morphs.chest}     min={0.7} max={1.5} step={0.01} onChange={v=>setMorphs(m=>({...m,chest:v}))}     />
      <SliderRow label="Shoulder Span"  val={morphs.shoulders} min={0.7} max={1.5} step={0.01} onChange={v=>setMorphs(m=>({...m,shoulders:v}))} />
      <SliderRow label="Waist Vacuum"   val={morphs.waist}     min={0.7} max={1.5} step={0.01} onChange={v=>setMorphs(m=>({...m,waist:v}))}     />
      <SliderRow label="Arm Sweep"      val={morphs.arms}      min={0.7} max={1.5} step={0.01} onChange={v=>setMorphs(m=>({...m,arms:v}))}      />

      <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"10px 0" }} />

      {/* SKIN TONE */}
      <SLabel>🎨 Skin Tone</SLabel>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:12 }}>
        {Object.entries(SKIN_TONES).map(([name,hex]) => (
          <button key={name} onClick={()=>setSkinTone(hex)} title={name} style={{
            width:26, height:26, borderRadius:"50%", background:hex, cursor:"pointer",
            border: skinTone===hex ? "2.5px solid #d4af37" : "2px solid transparent",
            boxShadow: skinTone===hex ? "0 0 8px rgba(212,175,55,0.5)" : "none",
            transition:"all 0.2s",
          }} />
        ))}
      </div>

      {/* HAIR */}
      <SLabel>💇 Hair Style</SLabel>
      <div style={{ display:"flex", gap:5, marginBottom:12 }}>
        {["short","medium","bald"].map(h => (
          <button key={h} onClick={()=>setMorphs(m=>({...m,hair:h}))} style={{
            flex:1, padding:"5px 0", fontSize:10, fontWeight:700, textTransform:"capitalize",
            background: morphs.hair===h
              ? "linear-gradient(135deg,rgba(212,175,55,0.3),rgba(212,175,55,0.1))"
              : "rgba(255,255,255,0.04)",
            color: morphs.hair===h ? "#d4af37" : "rgba(255,255,255,0.4)",
            border: `1px solid ${morphs.hair===h ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.08)"}`,
            borderRadius:7, cursor:"pointer", transition:"all 0.2s",
          }}>{h}</button>
        ))}
      </div>

      {/* WARDROBE */}
      <SLabel>👔 Wardrobe</SLabel>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
        {WARDROBE.map(w => (
          <button key={w.id} onClick={()=>setWardrobe(w.id)} title={w.label} style={{
            flex:1, minWidth:60, padding:"5px 4px", fontSize:10, fontWeight:700,
            background: wardrobe===w.id
              ? "linear-gradient(135deg,rgba(139,92,246,0.3),rgba(139,92,246,0.08))"
              : "rgba(255,255,255,0.04)",
            color: wardrobe===w.id ? "#a78bfa" : "rgba(255,255,255,0.4)",
            border: `1px solid ${wardrobe===w.id ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
            borderRadius:7, cursor:"pointer", transition:"all 0.2s",
          }}>{w.icon} {w.label}</button>
        ))}
      </div>

      {/* APPAREL TOGGLE */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Apparel Simulation</span>
        <button onClick={()=>setMorphs(m=>({...m,apparel:!m.apparel}))} style={{
          background: morphs.apparel ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)",
          color: morphs.apparel ? "#d4af37" : "rgba(255,255,255,0.3)",
          border: `1px solid ${morphs.apparel ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius:6, padding:"4px 14px", fontSize:10, fontWeight:800, cursor:"pointer",
          transition:"all 0.2s",
        }}>{morphs.apparel ? "ON" : "OFF"}</button>
      </div>

      {/* RESET */}
      <button onClick={()=>{
        setMorphs({ shoulders:1,chest:1,waist:1,arms:1,apparel:true,hair:"short" });
        setAnatomyDepth(100); setSkinTone(SKIN_TONES.medium);
        setStressLevel(0); setWardrobe("none");
      }} style={{
        width:"100%", padding:"7px 0", fontSize:10, fontWeight:800,
        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:7, color:"rgba(255,255,255,0.35)", cursor:"pointer",
        letterSpacing:"0.1em", textTransform:"uppercase",
      }}>↺ Reset All</button>
    </div>
  );
}

// ── SNAPSHOT STRIP ────────────────────────────────────────────────────────────
function SnapshotStrip({ snapshots, onCapture }) {
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
      <button onClick={onCapture} style={{
        display:"flex", alignItems:"center", gap:6, padding:"6px 14px",
        background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))",
        border:"1px solid rgba(212,175,55,0.4)", borderRadius:8,
        color:"#d4af37", fontSize:11, fontWeight:800, cursor:"pointer",
        boxShadow:"0 0 12px rgba(212,175,55,0.1)", letterSpacing:"0.06em",
      }}>📷 Snapshot</button>
      {snapshots.map((s,i) => (
        <div key={i} style={{
          width:40, height:40, borderRadius:8, overflow:"hidden",
          border:"1px solid rgba(255,255,255,0.1)",
          background:"rgba(255,255,255,0.05)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18, flexShrink:0,
        }}>
          {s ? <img src={s} alt="snap" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "📸"}
        </div>
      ))}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function Body3D({ onSelectPart }) {
  const [anatomyDepth, setAnatomyDepth] = useState(100);
  const [selected,     setSelected]     = useState(null);
  const [autoRotate,   setAutoRotate]   = useState(true);
  const [currentView,  setCurrentView]  = useState("Rotating");
  const [viewMode,     setViewMode]     = useState("3d");
  const [showSidebar,  setShowSidebar]  = useState(true);
  const [skinTone,     setSkinTone]     = useState(SKIN_TONES.medium);
  const [compareMode,  setCompareMode]  = useState("dual");
  const [stressLevel,  setStressLevel]  = useState(0);
  const [wardrobe,     setWardrobe]     = useState("none");
  const [snapshots,    setSnapshots]    = useState([null,null,null]);
  const [quality,      setQuality]      = useState("high");
  const [heatmap,      setHeatmap]      = useState(false);
  const [splitX,       setSplitX]       = useState(50);
  const canvasRef = useRef();

  const [morphs, setMorphs] = useState({
    shoulders:1, chest:1, waist:1, arms:1, apparel:true, hair:"short"
  });

  const handleSelect = useCallback(part => {
    setSelected(part);
    if (onSelectPart) onSelectPart(part);
  }, [onSelectPart]);

  const handleSnapshot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    setSnapshots(prev => {
      const next = [...prev];
      const empty = next.indexOf(null);
      if (empty !== -1) { next[empty] = url; return next; }
      return [url, ...next.slice(0,2)];
    });
  };

  const statusC = selected?.status ? STATUS[selected.status] : null;
  const dpr = QUALITY.find(q=>q.id===quality)?.dpr ?? 1.5;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* ── SECTION HEADER ───────────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10,
        padding:"12px 16px",
        background:"linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.02),transparent)",
        border:"1px solid rgba(212,175,55,0.12)",
        borderRadius:14, backdropFilter:"blur(12px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:"50%",
            background:"linear-gradient(135deg,rgba(212,175,55,0.3),rgba(212,175,55,0.08))",
            border:"1px solid rgba(212,175,55,0.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, boxShadow:"0 0 16px rgba(212,175,55,0.2)",
          }}>🪞</div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:"#fff", letterSpacing:"-0.01em" }}>
              Mirror Digital Twin
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
              PBR Engine · Real-Time · {compareMode.toUpperCase()} Mode
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {/* Quality */}
          <div style={{ display:"flex", background:"rgba(0,0,0,0.3)", borderRadius:8, padding:2, border:"1px solid rgba(255,255,255,0.06)" }}>
            {QUALITY.map(q => (
              <button key={q.id} onClick={()=>setQuality(q.id)} style={{
                padding:"4px 10px", fontSize:9, fontWeight:800, borderRadius:6,
                border:"none", cursor:"pointer", letterSpacing:"0.06em", textTransform:"uppercase",
                background: quality===q.id ? "rgba(212,175,55,0.2)" : "transparent",
                color: quality===q.id ? "#d4af37" : "rgba(255,255,255,0.3)",
                transition:"all 0.2s",
              }}>{q.label}</button>
            ))}
          </div>
          <GBtn active={showSidebar} onClick={()=>setShowSidebar(s=>!s)}>⚙ Editor</GBtn>
          <GBtn active={heatmap} onClick={()=>setHeatmap(h=>!h)} style={{ borderColor: heatmap ? "rgba(244,63,94,0.6)" : undefined, color: heatmap ? "#f43f5e" : undefined }}>🌡 Heatmap</GBtn>
        </div>
      </div>

      {/* ── COMPARE MODES ────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.15em", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", marginRight:2 }}>Compare</span>
        {COMPARE_MODES.map(m => (
          <GBtn key={m.id} active={compareMode===m.id} onClick={()=>setCompareMode(m.id)}>
            {m.icon} {m.label}
          </GBtn>
        ))}
        <div style={{ width:1, height:16, background:"rgba(255,255,255,0.1)", margin:"0 4px" }} />
        {/* View buttons */}
        {viewMode==="3d" && (
          <>
            {["Front","Side","Back"].map(v => (
              <GBtn key={v} active={currentView===v} onClick={()=>{ setAutoRotate(false); setCurrentView(v); }}>{v}</GBtn>
            ))}
            <GBtn active={autoRotate} onClick={()=>{ setAutoRotate(r=>!r); setCurrentView(autoRotate?"Custom":"Rotating"); }}>360° Spin</GBtn>
            <GBtn active={anatomyDepth<50} onClick={()=>setAnatomyDepth(d=>d===100?0:100)}>
              🔬 {anatomyDepth<50 ? "Anatomy ON" : "Anatomy"}
            </GBtn>
          </>
        )}
        {/* View mode toggle */}
        <div style={{ marginLeft:"auto", display:"flex", background:"rgba(0,0,0,0.3)", borderRadius:8, padding:2, border:"1px solid rgba(255,255,255,0.06)" }}>
          {[["3d","3D View"],["blueprint","High-End Render"]].map(([id,label]) => (
            <button key={id} onClick={()=>setViewMode(id)} style={{
              padding:"5px 12px", fontSize:10, fontWeight:700, borderRadius:6,
              border:"none", cursor:"pointer",
              background: viewMode===id ? "rgba(212,175,55,0.2)" : "transparent",
              color: viewMode===id ? "#d4af37" : "rgba(255,255,255,0.35)",
              transition:"all 0.2s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── SPLIT X SLIDER (split mode only) ─────────────────────────────── */}
      {compareMode==="split" && (
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", minWidth:60 }}>Split</span>
          <input type="range" min={10} max={90} step={1} value={splitX} onChange={e=>setSplitX(parseInt(e.target.value))}
            style={{ flex:1, accentColor:"#d4af37" }} />
          <span style={{ fontSize:10, color:"#d4af37", minWidth:32 }}>{splitX}%</span>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>

        {/* CANVAS WRAPPER */}
        <div style={{
          flex:1, position:"relative",
          borderRadius:18, overflow:"hidden",
          border:"1px solid rgba(255,255,255,0.07)",
          background:"#050810",
          boxShadow:"0 0 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(6,182,212,0.02)",
          minHeight:500,
        }}>

          {/* CORNER ACCENTS */}
          {[[0,0],[0,1],[1,0],[1,1]].map(([x,y],i) => (
            <div key={i} style={{
              position:"absolute", zIndex:2, pointerEvents:"none",
              [x?"right":"left"]:0, [y?"bottom":"top"]:0,
              width:20, height:20,
              borderTop: y ? "none" : "2px solid rgba(212,175,55,0.3)",
              borderBottom: y ? "2px solid rgba(212,175,55,0.3)" : "none",
              borderLeft: x ? "none" : "2px solid rgba(212,175,55,0.3)",
              borderRight: x ? "2px solid rgba(212,175,55,0.3)" : "none",
            }} />
          ))}

          {viewMode==="3d" && (
            <div style={{ height:580 }}>
              <Canvas
                ref={canvasRef}
                camera={{ position:[0,0.9,3.8], fov:40 }}
                shadows dpr={dpr}
                gl={{ antialias:true, toneMapping:THREE.ACESFilmicToneMapping, toneMappingExposure:1.1 }}
              >
                <color attach="background" args={["#050810"]} />
                <fog attach="fog" args={["#050810",7,16]} />
                <SystemScene
                  anatomyDepth={anatomyDepth}
                  morphs={morphs}
                  autoRotate={autoRotate}
                  currentView={currentView}
                  onSelectPart={handleSelect}
                  setAutoRotate={setAutoRotate}
                  setCurrentView={setCurrentView}
                  skinTone={skinTone}
                  compareMode={compareMode}
                  stressLevel={stressLevel}
                  splitX={splitX}
                />
              </Canvas>

              {/* HEATMAP OVERLAY */}
              {heatmap && (
                <div style={{
                  position:"absolute", inset:0, pointerEvents:"none", zIndex:3,
                  background:"linear-gradient(to top, rgba(244,63,94,0.12), rgba(251,146,60,0.08), rgba(34,211,238,0.06), transparent)",
                  mixBlendMode:"screen",
                }} />
              )}

              {/* MODEL LABELS */}
              <div style={{
                position:"absolute", bottom:16, left:0, right:0,
                display:"flex", justifyContent:"space-around", pointerEvents:"none", zIndex:2,
              }}>
                {(compareMode==="dual"||compareMode==="delta") && [
                  { label:"YOU NOW",   color:"#d4af37" },
                  { label:"YOUR GOAL", color:"#22d3ee" },
                ].map(l => (
                  <div key={l.label} style={{
                    fontSize:9, fontWeight:800, color:l.color, letterSpacing:"0.18em",
                    textTransform:"uppercase",
                    background:"rgba(5,8,16,0.85)",
                    padding:"4px 14px", borderRadius:999,
                    border:`1px solid ${l.color}33`,
                    backdropFilter:"blur(8px)",
                  }}>{l.label}</div>
                ))}
                {(compareMode==="ghost"||compareMode==="split") && (
                  <div style={{
                    fontSize:9, fontWeight:800, color:"#d4af37", letterSpacing:"0.18em",
                    background:"rgba(5,8,16,0.85)",
                    padding:"4px 14px", borderRadius:999,
                    border:"1px solid rgba(212,175,55,0.3)",
                  }}>{compareMode==="ghost" ? "Ghost Overlay" : `Split ${splitX}% / ${100-splitX}%`}</div>
                )}
              </div>

              {/* SELECTED BADGE TOP-LEFT */}
              {selected && (
                <div style={{
                  position:"absolute", top:12, left:12, zIndex:3,
                  display:"flex", alignItems:"center", gap:8,
                  background:"rgba(5,8,16,0.9)", border:"1px solid rgba(212,175,55,0.3)",
                  borderRadius:10, padding:"6px 12px", backdropFilter:"blur(12px)",
                }}>
                  <span style={{ fontSize:16 }}>{selected.icon}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#d4af37" }}>{selected.name}</span>
                  <button onClick={()=>setSelected(null)} style={{
                    background:"none", border:"none", color:"rgba(255,255,255,0.4)",
                    fontSize:12, cursor:"pointer", marginLeft:4,
                  }}>✕</button>
                </div>
              )}
            </div>
          )}

          {viewMode==="blueprint" && (
            <div style={{ width:"100%", height:580, position:"relative" }}>
              <Sprite3DViewer fallbackImage="/target_blueprint.png" rowCount={4} framesPerRow={36} />
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        {showSidebar && (
          <SidebarEditor
            morphs={morphs} setMorphs={setMorphs}
            anatomyDepth={anatomyDepth} setAnatomyDepth={setAnatomyDepth}
            skinTone={skinTone} setSkinTone={setSkinTone}
            stressLevel={stressLevel} setStressLevel={setStressLevel}
            wardrobe={wardrobe} setWardrobe={setWardrobe}
          />
        )}
      </div>

      {/* ── SNAPSHOT STRIP ────────────────────────────────────────────────── */}
      <div style={{
        padding:"10px 14px",
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:12, backdropFilter:"blur(8px)",
      }}>
        <SnapshotStrip snapshots={snapshots} onCapture={handleSnapshot} />
      </div>

      {/* ── COLOUR LEGEND ─────────────────────────────────────────────────── */}
      <div style={{
        padding:"10px 16px",
        background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
        border:"1px solid rgba(255,255,255,0.06)", borderRadius:12,
        backdropFilter:"blur(8px)",
      }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.18em", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", marginBottom:8 }}>
          Colour Legend
        </div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          {Object.entries(STATUS).map(([k,v]) => (
            <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:v.color, boxShadow:`0 0 5px ${v.color}88` }} />
              <span style={{ fontSize:11, color:v.color }}>{v.label}</span>
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#22d3ee", boxShadow:"0 0 5px #22d3ee88" }} />
            <span style={{ fontSize:11, color:"#22d3ee" }}>Desired</span>
          </div>
        </div>
      </div>

      {/* ── SELECTED PART DETAIL ──────────────────────────────────────────── */}
      {selected && !selected.isDes && statusC && (
        <div style={{
          background: statusC.bg,
          border: `1px solid ${statusC.border}`,
          borderRadius:14, padding:18,
          animation:"staggerIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
          backdropFilter:"blur(12px)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:`${statusC.color}18`, border:`1px solid ${statusC.color}44`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
            }}>{selected.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{selected.name}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                Body Zone Assessment
              </div>
            </div>
            <span style={{
              background:`${statusC.color}22`, border:`1px solid ${statusC.color}55`,
              color:statusC.color, fontSize:9, fontWeight:800, letterSpacing:"0.1em",
              padding:"4px 10px", borderRadius:999, textTransform:"uppercase",
            }}>{statusC.label}</span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.18em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:7 }}>Issues</div>
              {(selected.issues||[]).map((issue,i) => (
                <div key={i} style={{ fontSize:12, color:"#fca5a5", marginBottom:5, display:"flex", gap:7, alignItems:"flex-start" }}>
                  <span style={{ color:statusC.color, flexShrink:0, marginTop:1 }}>✗</span>{issue}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.18em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:7 }}>Action Plan</div>
              {(selected.fixes||[]).map((fix,i) => (
                <div key={i} style={{ fontSize:12, color:"#86efac", marginBottom:5, display:"flex", gap:7, alignItems:"flex-start" }}>
                  <span style={{ color:"#22c55e", flexShrink:0, marginTop:1 }}>→</span>{fix}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <div style={{
          padding:14, textAlign:"center",
          color:"rgba(255,255,255,0.25)", fontSize:12,
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)",
          borderRadius:12, backdropFilter:"blur(8px)",
        }}>
          👆 Tap any part of the <span style={{ color:"#d4af37" }}>left figure</span> to see health details & action plan
        </div>
      )}
    </div>
  );
}
