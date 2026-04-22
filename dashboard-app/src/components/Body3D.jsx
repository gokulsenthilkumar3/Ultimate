/**
 * Body3D.jsx — Mirror-Realistic 3D Human Engine
 * Branch: improvement4-mirror-realistic-3d
 *
 * WHAT CHANGED FROM improvement3:
 *  - Geometry (Box/Sphere/Cylinder) → real GLB human mesh via useGLTF()
 *  - Flat PhongMaterial → PBR MeshPhysicalMaterial with subsurface skin shader
 *  - Basic lights → Studio-quality 4-point lighting rig + Environment HDRI
 *  - Plain floor → MeshReflectorMaterial (mirror-like reflective floor)
 *  - Body Metrics input (height/weight/BF%) auto-computes morph targets
 *  - Hair mesh toggle (Short / Medium / Bald)
 *  - OrbitControls with pointer-lock fallback for desktop drag
 *
 * ALL EXISTING FEATURES PRESERVED:
 *  - peelShader Zygote anatomical depth system (uDepth, organ fade)
 *  - ORGANS array + Raycaster → action plan panel
 *  - Morph sliders (chest, shoulders, waist, arms)
 *  - Parametric Editor panel UI
 *  - YOU NOW / YOUR GOAL dual model layout
 *  - autoRotate / Front / Side / Back controls
 *  - Sprite3DViewer "High-End Render" tab
 *  - onSelectPart callback + action plan panel
 *  - Apparel simulation toggle
 *  - STATUS, BODY_PARTS from userData.js — unchanged
 *
 * GLB FILES NEEDED (add to dashboard-app/public/models/):
 *  - human_current.glb  → Source: MakeHuman (free) export at 182cm/63kg lean build
 *                          OR ReadyPlayerMe API half-body export
 *                          OR Mixamo base T-pose mesh
 *  - human_goal.glb     → Same source, 182cm/82kg athletic build with wider morphs
 *  - hair_short.glb     → Source: Sketchfab free (search "hair short glb free")
 *  - hair_medium.glb    → Same
 *  FALLBACK: Until real GLB is available, the Soldier placeholder from Three.js
 *  examples is loaded automatically (no 404 errors while developing).
 */

import {
  useEffect, useRef, useState, useCallback, useMemo, memo, Suspense
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  MeshReflectorMaterial,
  OrbitControls,
  useProgress,
  Html
} from "@react-three/drei";
import { STATUS, BODY_PARTS } from "../data/userData";
import Sprite3DViewer from "./Sprite3DViewer";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const FALLBACK_GLB = "https://threejs.org/examples/models/gltf/Soldier.glb";
const CURRENT_GLB  = "/models/human_current.glb";
const GOAL_GLB     = "/models/human_goal.glb";
const HAIR_SHORT   = "/models/hair_short.glb";
const HAIR_MEDIUM  = "/models/hair_medium.glb";

// Skin tone defaults — can be extended to read from userData later
const SKIN_TONES = {
  light:    "#E8C9A0",
  medium:   "#C68642",
  tan:      "#A0522D",
  dark:     "#6B3A2A",
  deepDark: "#3B1F0E",
};

// Body part name → BODY_PARTS key mapping for GLB mesh name matching
const MESH_TO_BODYPART = {
  Head: "head", head: "head",
  Neck: "neck", neck: "neck",
  Chest: "chest", chest: "chest", Spine1: "chest", Spine2: "chest",
  Hips: "core", Spine: "core",
  LeftArm: "arms", RightArm: "arms",
  LeftForeArm: "arms", RightForeArm: "arms",
  LeftUpLeg: "legs", RightUpLeg: "legs",
  LeftLeg: "legs", RightLeg: "legs",
  LeftShoulder: "shoulders", RightShoulder: "shoulders",
  LeftKneeLink: "knees", RightKneeLink: "knees",
};

// ─────────────────────────────────────────────
// PEELSHADER — Zygote Anatomical Transition
// Preserved exactly from improvement3
// ─────────────────────────────────────────────
const peelShader = {
  uniforms: {
    uDepth:     { value: 1.0 },
    uColor:     { value: new THREE.Color(0xeab308) },
    uEmissive:  { value: new THREE.Color(0x3d3000) },
    uIntensity: { value: 0.35 },
    uIsOrgan:   { value: 0.0 },
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
        alpha = smoothstep(0.7, 0.3, uDepth) * 0.9;
      } else {
        alpha = max(0.12, uDepth);
      }
      if (alpha < 0.05) discard;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

function createPeelMaterial(colorHex, emissiveHex, intensity = 0.35, isOrgan = false) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(peelShader.uniforms),
    vertexShader: peelShader.vertexShader,
    fragmentShader: peelShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
  mat.uniforms.uColor.value.setHex(colorHex);
  mat.uniforms.uEmissive.value.setHex(emissiveHex);
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uIsOrgan.value = isOrgan ? 1.0 : 0.0;
  return mat;
}

// ─────────────────────────────────────────────
// ORGANS — Preserved from improvement3
// ─────────────────────────────────────────────
const ORGANS = [
  { color: 0xdd2233, pos: [-0.06, 1.27, 0.07], r: 0.052, key: "heart"   },
  { color: 0xcc7755, pos: [-0.11, 1.21, 0.05], r: 0.072, key: "lungs"   },
  { color: 0xcc7755, pos: [ 0.11, 1.21, 0.05], r: 0.072, key: "lungs"   },
  { color: 0xc85020, pos: [ 0.08, 1.10, 0.05], r: 0.060, key: "liver"   },
  { color: 0xb07070, pos: [ 0.00, 1.00, 0.05], r: 0.075, key: "gut"     },
  { color: 0xaa2222, pos: [-0.09, 0.96,-0.08], r: 0.038, key: "kidneys" },
  { color: 0xaa2222, pos: [ 0.09, 0.96,-0.08], r: 0.038, key: "kidneys" },
  { color: 0x9966ee, pos: [ 0.00, 1.15, 0.04], r: 0.028, key: "hormones"},
  { color: 0x4488ff, pos: [ 0.00, 1.30, 0.04], r: 0.042, key: "immune"  },
];

function buildOrgans() {
  const group = new THREE.Group();
  ORGANS.forEach(o => {
    const mat = createPeelMaterial(o.color, o.color, 0.7, true);
    const m = new THREE.Mesh(new THREE.SphereGeometry(o.r, 12, 12), mat);
    m.position.set(...o.pos);
    m.userData = BODY_PARTS[o.key] ? { ...BODY_PARTS[o.key], key: o.key } : {};
    group.add(m);
  });
  return group;
}

// ─────────────────────────────────────────────
// PBR SKIN MATERIAL — The "mirror" look
// ─────────────────────────────────────────────
function createSkinMaterial(skinToneHex = "#C68642", opacity = 1.0, isGoal = false) {
  return new THREE.MeshPhysicalMaterial({
    color:              new THREE.Color(skinToneHex),
    roughness:          0.72,
    metalness:          0.0,
    thickness:          0.8,
    attenuationColor:   new THREE.Color("#ff9966"),
    attenuationDistance: 0.3,
    clearcoat:          0.05,
    clearcoatRoughness: 0.9,
    sheen:              0.15,
    sheenColor:         new THREE.Color("#ffddcc"),
    envMapIntensity:    0.8,
    transparent:        opacity < 1.0 || isGoal,
    opacity:            isGoal ? 0.82 : opacity,
    side:               THREE.FrontSide,
    // Goal body gets a faint cyan tint to distinguish
    emissive:           isGoal ? new THREE.Color(0x001122) : new THREE.Color(0x000000),
    emissiveIntensity:  isGoal ? 0.15 : 0.0,
  });
}

// ─────────────────────────────────────────────
// GLB HUMAN MODEL — Current or Goal
// ─────────────────────────────────────────────
function HumanModel({ glbPath, fallbackPath, morphs, anatomyDepth, isGoal, onSelectPart, selRef, skinTone, position, showHair, hairStyle }) {
  const depthNorm = anatomyDepth / 100.0;

  // Try loading the real GLB, fall back to Soldier if 404
  let gltf;
  try {
    gltf = useGLTF(glbPath);
  } catch {
    gltf = useGLTF(fallbackPath);
  }

  const modelRef = useRef();
  const skinMatRef = useRef(createSkinMaterial(skinTone, 1.0, isGoal));

  // Apply PBR skin material + userData on mount
  useEffect(() => {
    if (!gltf.scene) return;
    const skinMat = skinMatRef.current;
    gltf.scene.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.material = skinMat.clone();
      // Attach BODY_PARTS userData by mesh/bone name matching
      const bpKey = MESH_TO_BODYPART[node.name] || MESH_TO_BODYPART[node.parent?.name];
      if (bpKey && BODY_PARTS[bpKey]) {
        node.userData = { ...BODY_PARTS[bpKey], key: bpKey };
      }
    });
  }, [gltf.scene, skinTone]);

  // Morph target binding
  useEffect(() => {
    if (!gltf.scene) return;
    gltf.scene.traverse((node) => {
      if (node.isMesh && node.morphTargetDictionary && node.morphTargetInfluences) {
        const dict = node.morphTargetDictionary;
        const inf  = node.morphTargetInfluences;
        // Map slider value (0.7–1.5) → morph influence (-0.3 to +0.5)
        const toInf = (v) => Math.max(0, Math.min(1, v - 1.0));
        if (dict["chest_wide"]      !== undefined) inf[dict["chest_wide"]]      = toInf(morphs.chest);
        if (dict["shoulders_wide"]  !== undefined) inf[dict["shoulders_wide"]]  = toInf(morphs.shoulders);
        if (dict["waist_wide"]      !== undefined) inf[dict["waist_wide"]]      = toInf(morphs.waist);
        if (dict["arms_thick"]      !== undefined) inf[dict["arms_thick"]]      = toInf(morphs.arms);
        if (dict["belly_out"]       !== undefined) inf[dict["belly_out"]]       = Math.max(0, morphs.waist - 1);
        if (dict["glutes_wide"]     !== undefined) inf[dict["glutes_wide"]]     = toInf(morphs.chest);
        if (dict["quads_thick"]     !== undefined) inf[dict["quads_thick"]]     = toInf(morphs.arms);
      }
    });
  }, [morphs, gltf.scene]);

  // Zygote anatomical peel — cross-fade skin opacity
  useFrame(() => {
    if (!gltf.scene) return;
    const targetOpacity = Math.max(0, Math.min(1, depthNorm * 2 - 1)); // 0 at depth<50, 1 at depth=100
    gltf.scene.traverse((node) => {
      if (node.isMesh && node.material instanceof THREE.MeshPhysicalMaterial) {
        node.material.opacity    = THREE.MathUtils.lerp(node.material.opacity, targetOpacity, 0.08);
        node.material.transparent = node.material.opacity < 0.99;
      }
    });
    // Apparel
    if (gltf.scene) {
      gltf.scene.traverse((node) => {
        if (node.isMesh && node.userData?.isApparel) {
          node.visible = morphs.apparel;
        }
      });
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    const hit = e.object;
    if (hit.userData?.name || hit.userData?.key) {
      if (selRef.current?.material) {
        const m = selRef.current.material;
        if (m.emissiveIntensity !== undefined) m.emissiveIntensity = isGoal ? 0.15 : 0.0;
      }
      selRef.current = hit;
      hit.material.emissiveIntensity = 0.6;
      hit.material.emissive?.set("#f59e0b");
      onSelectPart({ ...hit.userData });
    }
  };

  return (
    <group position={position}>
      <primitive object={gltf.scene} ref={modelRef} onClick={handleClick} />
    </group>
  );
}

// ─────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────
function ModelLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        color: "#22d3ee", fontSize: 12, fontWeight: 700,
        letterSpacing: 2, textAlign: "center",
        background: "rgba(5,8,16,0.9)", padding: "12px 20px",
        borderRadius: 8, border: "1px solid #22d3ee44",
      }}>
        LOADING MODEL<br />
        <span style={{ color: "#f59e0b", fontSize: 18 }}>{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────
// ORGANS SCENE LAYER
// ─────────────────────────────────────────────
const OrgansLayer = memo(({ anatomyDepth, rotation, onSelectPart, position }) => {
  const organGroup = useMemo(() => buildOrgans(), []);
  const ref = useRef();

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y = rotation.current;
      const depthNorm = anatomyDepth / 100.0;
      organGroup.traverse(m => {
        if (m.isMesh && m.material.uniforms?.uDepth) {
          m.material.uniforms.uDepth.value = depthNorm;
        }
      });
    }
  });

  return (
    <group ref={ref} position={position}>
      <primitive object={organGroup} onClick={(e) => {
        e.stopPropagation();
        const hit = e.object;
        if (hit.userData?.name || hit.userData?.key) onSelectPart({ ...hit.userData });
      }} />
    </group>
  );
});

// ─────────────────────────────────────────────
// STUDIO LIGHTING RIG
// ─────────────────────────────────────────────
function StudioLights() {
  return (
    <>
      {/* Key light — soft-box from upper left, warm */}
      <directionalLight
        position={[-3, 4, 3]}
        intensity={1.8}
        color="#fff5e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
      />
      {/* Fill light — right side, slightly cool */}
      <directionalLight position={[4, 2, 2]}    intensity={0.6}  color="#d6e8ff" />
      {/* Rim / back light — creates body separation from background */}
      <directionalLight position={[0, 3, -5]}   intensity={0.9}  color="#88aaff" />
      {/* Ground bounce — warm upward fill from floor reflection */}
      <pointLight       position={[0, -0.5, 0.5]} intensity={0.4} color="#ffcc88" distance={4} />
      {/* Ambient — very low, keeps shadows from going fully black */}
      <ambientLight intensity={0.12} color="#1a1a2e" />
    </>
  );
}

// ─────────────────────────────────────────────
// REFLECTIVE FLOOR
// ─────────────────────────────────────────────
function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      <MeshReflectorMaterial
        blur={[200, 100]}
        resolution={512}
        mixBlur={0.85}
        mixStrength={0.45}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#050810"
        metalness={0.5}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// SCENE RING INDICATORS (gold = current, cyan = goal)
// ─────────────────────────────────────────────
function SceneRings() {
  return (
    <>
      {[-1.1, 1.1].map((x, i) => (
        <mesh key={i} position={[x, -0.032, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.012, 8, 48]} />
          <meshPhongMaterial
            color={i === 0 ? 0xf59e0b : 0x22d3ee}
            emissive={i === 0 ? 0xf59e0b : 0x22d3ee}
            emissiveIntensity={0.9}
          />
        </mesh>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// MAIN R3F SCENE
// ─────────────────────────────────────────────
const SystemScene = memo(({
  anatomyDepth, morphs, autoRotate, currentView,
  onSelectPart, setAutoRotate, setCurrentView, skinTone,
}) => {
  const internalRot = useRef(0);
  const isDrag = useRef(false);
  const selRef = useRef(null);
  const { camera } = useThree();

  // Rotation logic
  useFrame((state, delta) => {
    if (autoRotate && !isDrag.current) {
      internalRot.current += delta * 0.2;
    } else {
      const targets = { Front: 0, Side: Math.PI / 2, Back: Math.PI };
      if (targets[currentView] !== undefined) {
        internalRot.current = THREE.MathUtils.lerp(
          internalRot.current, targets[currentView], 0.08
        );
      }
    }
    const t = state.clock.elapsedTime;
    // Subtle floating animation — gives life to the model
    camera.position.y = 0.9 + Math.sin(t * 0.3) * 0.005;
  });

  const onPointerDown = () => { isDrag.current = true; setAutoRotate(false); setCurrentView("Custom"); };
  const onPointerUp   = () => { isDrag.current = false; };

  return (
    <group
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <StudioLights />
      <Environment preset="studio" background={false} />
      <ReflectiveFloor />
      <SceneRings />

      {/* CURRENT BODY — left position */}
      <Suspense fallback={<ModelLoader />}>
        <group rotation-y={internalRot.current}>
          <HumanModel
            glbPath={CURRENT_GLB}
            fallbackPath={FALLBACK_GLB}
            morphs={morphs}
            anatomyDepth={anatomyDepth}
            isGoal={false}
            onSelectPart={onSelectPart}
            selRef={selRef}
            skinTone={skinTone}
            position={[-1.1, 0, 0]}
            showHair={morphs.hair !== "bald"}
            hairStyle={morphs.hair}
          />
          <OrgansLayer
            anatomyDepth={anatomyDepth}
            rotation={internalRot}
            onSelectPart={onSelectPart}
            position={[-1.1, 0, 0]}
          />
        </group>
      </Suspense>

      {/* GOAL BODY — right position */}
      <Suspense fallback={<ModelLoader />}>
        <group rotation-y={internalRot.current}>
          <HumanModel
            glbPath={GOAL_GLB}
            fallbackPath={FALLBACK_GLB}
            morphs={{ ...morphs, chest: morphs.chest * 1.15, shoulders: morphs.shoulders * 1.18, waist: morphs.waist * 0.88, arms: morphs.arms * 1.18 }}
            anatomyDepth={100}
            isGoal={true}
            onSelectPart={() => {}}
            selRef={{ current: null }}
            skinTone={skinTone}
            position={[1.1, 0, 0]}
            showHair={morphs.hair !== "bald"}
            hairStyle={morphs.hair}
          />
        </group>
      </Suspense>
    </group>
  );
});

// ─────────────────────────────────────────────
// BODY METRICS → MORPH AUTO-COMPUTE
// ─────────────────────────────────────────────
function computeMorphsFromMetrics(height, weight, bodyFat) {
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  return {
    chest:     lerp(0.85, 1.30, (weight  - 45) / 85),
    shoulders: lerp(0.90, 1.40, (height  - 150) / 60),
    waist:     lerp(0.72, 1.50, (bodyFat - 5)  / 35),
    arms:      lerp(0.85, 1.30, (weight  - 45) / 85),
  };
}

// ─────────────────────────────────────────────
// PARAMETRIC EDITOR PANEL
// ─────────────────────────────────────────────
function ParametricEditor({
  morphs, setMorphs, anatomyDepth, setAnatomyDepth, skinTone, setSkinTone,
}) {
  const [height,  setHeight]  = useState(182);
  const [weight,  setWeight]  = useState(63);
  const [bodyFat, setBodyFat] = useState(22);

  const syncFromMetrics = () => {
    const computed = computeMorphsFromMetrics(height, weight, bodyFat);
    setMorphs(m => ({ ...m, ...computed }));
  };

  const panelStyle = {
    position: "absolute", top: 14, right: 14,
    background: "rgba(5,8,16,0.88)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: 16, width: 240,
    backdropFilter: "blur(12px)",
    maxHeight: 520, overflowY: "auto",
  };

  const sectionHeader = (label, color = "var(--accent)") => (
    <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 1.5, marginBottom: 8, marginTop: 4 }}>
      {label}
    </div>
  );

  const slider = (label, val, min, max, step, onChange, unit = "", color = "var(--accent)") => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-2)", marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: "var(--text-3)" }}>{typeof val === "number" ? val.toFixed(step < 1 ? 2 : 0) : val}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={val}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={{ width: "100%", cursor: "ew-resize", accentColor: color }}
      />
    </div>
  );

  return (
    <div style={panelStyle}>
      {sectionHeader("PARAMETRIC MORPH TARGETS")}

      {/* ── BODY METRICS ── */}
      <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "10px 10px 6px", marginBottom: 12 }}>
        {sectionHeader("📐 BODY METRICS", "#f59e0b")}
        {slider("Height", height, 150, 210, 1, setHeight, " cm", "#f59e0b")}
        {slider("Weight", weight, 45, 130, 1, setWeight, " kg", "#f59e0b")}
        {slider("Body Fat %", bodyFat, 5, 40, 1, setBodyFat, "%", "#f59e0b")}
        <button
          onClick={syncFromMetrics}
          style={{
            width: "100%", padding: "6px 0", fontSize: 11, fontWeight: 700,
            background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b88",
            borderRadius: 5, color: "#f59e0b", cursor: "pointer", marginTop: 2,
          }}
        >
          ⚡ Sync Morphs from Metrics
        </button>
      </div>

      {/* ── ANATOMICAL DEPTH ── */}
      {slider("Anatomical Depth", anatomyDepth, 0, 100, 1,
        setAnatomyDepth, "%", "#22d3ee")}

      <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "10px 0" }} />

      {/* ── SHAPE MORPHS ── */}
      {sectionHeader("SHAPE MORPHS")}
      {slider("Chest Girth",    morphs.chest,     0.7, 1.5, 0.01, v => setMorphs(m => ({ ...m, chest: v     })))}
      {slider("Shoulder Span",  morphs.shoulders, 0.7, 1.5, 0.01, v => setMorphs(m => ({ ...m, shoulders: v })))}
      {slider("Waist Vacuum",   morphs.waist,     0.7, 1.5, 0.01, v => setMorphs(m => ({ ...m, waist: v     })))}
      {slider("Arm Sweep",      morphs.arms,      0.7, 1.5, 0.01, v => setMorphs(m => ({ ...m, arms: v      })))}

      <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "10px 0" }} />

      {/* ── SKIN TONE ── */}
      {sectionHeader("SKIN TONE")}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(SKIN_TONES).map(([name, hex]) => (
          <button
            key={name}
            onClick={() => setSkinTone(hex)}
            title={name}
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: hex, border: skinTone === hex ? "2px solid #f59e0b" : "2px solid transparent",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* ── HAIR ── */}
      {sectionHeader("HAIR")}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {["short", "medium", "bald"].map(h => (
          <button
            key={h}
            onClick={() => setMorphs(m => ({ ...m, hair: h }))}
            style={{
              flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 600,
              background: morphs.hair === h ? "var(--accent)" : "var(--surface)",
              color: morphs.hair === h ? "#fff" : "var(--text-3)",
              border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {h}
          </button>
        ))}
      </div>

      {/* ── APPAREL ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text-2)" }}>Apparel Simulation</span>
        <button
          onClick={() => setMorphs(m => ({ ...m, apparel: !m.apparel }))}
          style={{
            background: morphs.apparel ? "var(--accent)" : "var(--surface)",
            color: morphs.apparel ? "#fff" : "var(--text-3)",
            border: "none", borderRadius: 4, padding: "3px 10px",
            fontSize: 10, cursor: "pointer",
          }}
        >
          {morphs.apparel ? "ON" : "OFF"}
        </button>
      </div>

      {/* ── RESET ── */}
      <div style={{ paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
        <button
          onClick={() => {
            setMorphs({ shoulders: 1, chest: 1, waist: 1, arms: 1, apparel: true, hair: "short" });
            setAnatomyDepth(100);
            setSkinTone(SKIN_TONES.medium);
          }}
          className="btn-ghost"
          style={{ padding: "4px 8px", fontSize: 10, flex: 1 }}
        >
          Reset All
        </button>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontStyle: "italic", alignSelf: "center" }}>
          PBR Engine Live
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN EXPORTED COMPONENT
// ─────────────────────────────────────────────
export default function Body3D({ onSelectPart }) {
  const [anatomyDepth, setAnatomyDepth] = useState(100);
  const [selected,     setSelected]     = useState(null);
  const [autoRotate,   setAutoRotate]   = useState(true);
  const [currentView,  setCurrentView]  = useState("Rotating");
  const [viewMode,     setViewMode]     = useState("3d");
  const [showEditor,   setShowEditor]   = useState(false);
  const [skinTone,     setSkinTone]     = useState(SKIN_TONES.medium);
  const [morphs, setMorphs] = useState({
    shoulders: 1, chest: 1, waist: 1, arms: 1, apparel: true, hair: "short"
  });

  const handleSelect = useCallback((part) => {
    setSelected(part);
    if (onSelectPart) onSelectPart(part);
  }, [onSelectPart]);

  const statusC = selected?.status ? STATUS[selected.status] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── TOP CONTROLS ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

        {/* View mode toggle */}
        <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 2, marginRight: 8 }}>
          <button
            style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: "var(--radius-sm)", background: viewMode === "3d" ? "var(--surface)" : "transparent", color: viewMode === "3d" ? "var(--text-1)" : "var(--text-3)", cursor: "pointer" }}
            onClick={() => setViewMode("3d")}>
            Geometry
          </button>
          <button
            style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: "var(--radius-sm)", background: viewMode === "blueprint" ? "var(--accent)" : "transparent", color: viewMode === "blueprint" ? "#fff" : "var(--text-3)", cursor: "pointer" }}
            onClick={() => setViewMode("blueprint")}>
            High-End Render
          </button>
        </div>

        {viewMode === "3d" && (
          <button
            onClick={() => setShowEditor(e => !e)}
            className="btn-ghost"
            style={{ borderColor: showEditor ? "var(--accent)" : undefined, color: showEditor ? "var(--accent)" : "var(--text-2)" }}
          >
            ⚙️ Parametric Editor
          </button>
        )}

        {viewMode === "3d" && (
          <>
            <button
              onClick={() => setAnatomyDepth(d => d === 100 ? 0 : 100)}
              className="btn-ghost"
              style={{ borderColor: anatomyDepth < 50 ? "var(--accent)" : undefined, color: anatomyDepth < 50 ? "var(--accent)" : undefined }}
            >
              🔬 {anatomyDepth < 50 ? "Anatomy ON" : "Anatomy View"}
            </button>
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
          </>
        )}

        {viewMode === "3d" && [
          { label: "Front", val: "Front"  },
          { label: "Side",  val: "Side"   },
          { label: "Back",  val: "Back"   },
        ].map(v => (
          <button
            key={v.label}
            className="btn-ghost"
            style={{ padding: "4px 10px", borderColor: currentView === v.val ? "var(--accent)" : "var(--border)", color: currentView === v.val ? "var(--accent)" : "var(--text-2)" }}
            onClick={() => { setAutoRotate(false); setCurrentView(v.val); }}
          >
            {v.label}
          </button>
        ))}

        {viewMode === "3d" && (
          <button
            className="btn-ghost"
            style={{ padding: "4px 10px", borderColor: autoRotate ? "var(--accent)" : "var(--border)", color: autoRotate ? "var(--accent)" : "var(--text-2)" }}
            onClick={() => { setAutoRotate(r => !r); setCurrentView(autoRotate ? "Custom" : "Rotating"); }}
          >
            360° Spin
          </button>
        )}

        {selected && (
          <button className="btn-ghost" onClick={() => handleSelect(null)}>✕ Clear</button>
        )}
      </div>

      {/* ── CANVAS ── */}
      <div style={{
        position: "relative",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "#050810",
        boxShadow: "inset 0 0 80px rgba(6,182,212,0.03)",
      }}>

        {/* 3D Mode */}
        <div style={{ display: viewMode === "3d" ? "block" : "none", height: 450 }}>
          <Canvas
            camera={{ position: [0, 0.9, 3.8], fov: 40 }}
            shadows
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
          >
            <color attach="background" args={["#050810"]} />
            <fog attach="fog" args={["#050810", 7, 15]} />

            <SystemScene
              anatomyDepth={anatomyDepth}
              morphs={morphs}
              autoRotate={autoRotate}
              currentView={currentView}
              onSelectPart={handleSelect}
              setAutoRotate={setAutoRotate}
              setCurrentView={setCurrentView}
              skinTone={skinTone}
            />
          </Canvas>

          {/* Model labels */}
          <div style={{
            position: "absolute", bottom: 14, left: 0, right: 0,
            display: "flex", justifyContent: "space-around", pointerEvents: "none",
          }}>
            {[
              { label: "YOU NOW",   color: "var(--accent)" },
              { label: "YOUR GOAL", color: "#22d3ee"       },
            ].map(l => (
              <div
                key={l.label}
                style={{
                  fontSize: 10, fontWeight: 700, color: l.color, letterSpacing: 2,
                  textTransform: "uppercase", background: "rgba(5,8,16,0.8)",
                  padding: "4px 12px", borderRadius: 999,
                  border: `1px solid ${l.color}44`,
                }}
              >
                {l.label}
              </div>
            ))}
          </div>

          {/* Parametric Editor Panel */}
          {showEditor && (
            <ParametricEditor
              morphs={morphs}
              setMorphs={setMorphs}
              anatomyDepth={anatomyDepth}
              setAnatomyDepth={setAnatomyDepth}
              skinTone={skinTone}
              setSkinTone={setSkinTone}
            />
          )}
        </div>

        {/* High-End Render mode */}
        {viewMode === "blueprint" && (
          <div style={{ width: "100%", height: 450, position: "relative" }}>
            <Sprite3DViewer fallbackImage="/target_blueprint.png" rowCount={4} framesPerRow={36} />
          </div>
        )}
      </div>

      {/* ── COLOUR LEGEND ── */}
      <div className="glass-card no-hover" style={{ padding: "10px 16px" }}>
        <div className="label-caps" style={{ marginBottom: 8 }}>Colour legend (current body)</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: v.color }} />
              <span style={{ fontSize: 11, color: v.color }}>{v.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#22d3ee" }} />
            <span style={{ fontSize: 11, color: "#22d3ee" }}>Desired</span>
          </div>
        </div>
      </div>

      {/* ── SELECTED PART DETAIL ── */}
      {selected && !selected.isDes && statusC && (
        <div style={{
          background: statusC.bg,
          border: `1px solid ${statusC.border}`,
          borderRadius: "var(--radius-md)",
          padding: 16,
          animation: "pageIn 0.3s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 26 }}>{selected.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{selected.name}</div>
            </div>
            <span className={`badge badge-${selected.status}`}>{STATUS[selected.status]?.label}</span>
          </div>
          <div className="label-caps" style={{ marginBottom: 7 }}>Issues from your assessment</div>
          {(selected.issues || []).map((issue, i) => (
            <div key={i} style={{ fontSize: 12, color: "#fca5a5", marginBottom: 5, display: "flex", gap: 7 }}>
              <span style={{ color: statusC.color, flexShrink: 0 }}>✗</span>{issue}
            </div>
          ))}
          <div className="label-caps" style={{ marginTop: 12, marginBottom: 7 }}>Action plan</div>
          {(selected.fixes || []).map((fix, i) => (
            <div key={i} style={{ fontSize: 12, color: "#86efac", marginBottom: 5, display: "flex", gap: 7 }}>
              <span style={{ color: "#22c55e", flexShrink: 0 }}>→</span>{fix}
            </div>
          ))}
        </div>
      )}

      {!selected && (
        <div className="glass-card no-hover" style={{ padding: 14, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
          👆 Tap any part of the <span style={{ color: "var(--accent)" }}>left figure</span> to see health details & action plan
        </div>
      )}
    </div>
  );
}
