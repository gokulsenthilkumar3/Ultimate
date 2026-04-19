import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { STATUS, BODY_PARTS } from "../data/userData";
import Sprite3DViewer from "./Sprite3DViewer";

const S = 0.01;

// ── CUSTOM PEEL SHADER (Zygote Anatomical Transition) ──
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
      // Basic lighting model
      vec3 lightDir = normalize(vec3(1.0, 2.0, 3.0));
      float diff = max(dot(vNormal, lightDir), 0.2);
      vec3 finalColor = uColor * diff + (uEmissive * uIntensity);
      
      float alpha = 1.0;
      
      if (uIsOrgan > 0.5) {
        // Organs fade IN when depth < 0.7
        alpha = smoothstep(0.7, 0.3, uDepth) * 0.9;
      } else {
        // Skin/Muscle fades OUT when depth decreases
        // Use a y-gradient peel effect for transition
        float peelEdge = uDepth * 2.0 - 0.5; // range
        // vPosition.y is in view space normally, but let's just use simple opacity for the whole part depending on depth
        // To make it a true shader peel, we combine depth and screen Y
        float peel = smoothstep(peelEdge - 0.2, peelEdge + 0.2, vUv.y);
        alpha = max(0.12, uDepth); // Fallback base opacity
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

// ── BUILD BODIES ──
function buildCurrentBody() {
  const group = new THREE.Group();
  const STATUS_COLORS = {
    critical: { hex: 0xef4444, em: 0x440000 },
    poor:     { hex: 0xf97316, em: 0x3d1500 },
    fair:     { hex: 0xeab308, em: 0x3d3000 },
    good:     { hex: 0x22c55e, em: 0x063318 },
  };

  function mkMesh(geo, status, pos, rot = [0,0,0], keepStandard = false) {
    const c = STATUS_COLORS[status] || STATUS_COLORS.fair;
    let mat;
    if (keepStandard) {
        mat = new THREE.MeshPhongMaterial({
            color: c.hex, emissive: c.em, emissiveIntensity: 0.35,
            shininess: 40, specular: 0x222222,
        });
    } else {
        mat = createPeelMaterial(c.hex, c.em, 0.35, false);
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    return m;
  }

  const headGeo = new THREE.SphereGeometry(0.1, 24, 24);
  const head = mkMesh(headGeo, "poor", [0, 1.68, 0.03]);
  head.scale.set(1, 1.05, 0.98);
  head.userData = { ...BODY_PARTS.head, key: "head" };
  group.add(head);

  const neckGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.12, 12);
  const neck = mkMesh(neckGeo, "poor", [0, 1.555, 0.015]);
  neck.rotation.x = 0.12;
  neck.userData = { ...BODY_PARTS.neck, key: "neck" };
  group.add(neck);

  const chestGeo = new THREE.BoxGeometry(0.30, 0.22, 0.19);
  const chestMesh = mkMesh(chestGeo, "fair", [0, 1.32, 0]);
  chestMesh.userData = { ...BODY_PARTS.chest, key: "chest" };
  group.add(chestMesh);

  const bellyGeo = new THREE.SphereGeometry(1, 16, 12);
  const belly = mkMesh(bellyGeo, "poor", [0, 1.09, 0.04]);
  belly.scale.set(0.165, 0.13, 0.115);
  belly.userData = { ...BODY_PARTS.core, key: "core" };
  group.add(belly);

  const pelvis = mkMesh(new THREE.BoxGeometry(0.29, 0.15, 0.17), "fair", [0, 0.92, 0]);
  pelvis.userData = { ...BODY_PARTS.legs, key: "legs" };
  group.add(pelvis);

  [-1, 1].forEach(side => {
    const delta = side * 0.21;
    const sc = mkMesh(new THREE.SphereGeometry(0.072, 14, 14), "fair", [delta, 1.38, 0]);
    sc.userData = { ...BODY_PARTS.shoulders, key: "shoulders" };
    group.add(sc);

    const ua = mkMesh(new THREE.CylinderGeometry(0.042, 0.048, 0.30, 12), "fair", [delta + side * 0.05, 1.21, 0]);
    ua.rotation.z = side * 0.28;
    ua.userData = { ...BODY_PARTS.arms, key: "arms" };
    group.add(ua);

    const elbow = mkMesh(new THREE.SphereGeometry(0.040, 10, 10), "fair", [delta + side * 0.095, 1.055, 0]);
    group.add(elbow);

    const fa = mkMesh(new THREE.CylinderGeometry(0.034, 0.040, 0.27, 12), "fair", [delta + side * 0.13, 0.90, 0]);
    fa.rotation.z = side * 0.18;
    fa.userData = { ...BODY_PARTS.arms, key: "arms" };
    group.add(fa);

    const hand = mkMesh(new THREE.SphereGeometry(0.030, 10, 10), "fair", [delta + side * 0.155, 0.755, 0]);
    group.add(hand);
  });

  const glute = mkMesh(new THREE.BoxGeometry(0.30, 0.16, 0.17), "good", [0, 0.865, -0.10]);
  glute.userData = { ...BODY_PARTS.glutes, key: "glutes" };
  group.add(glute);

  const curShorts = new THREE.Mesh(
    new THREE.BoxGeometry(0.31, 0.12, 0.19),
    new THREE.MeshPhongMaterial({ color: 0x1e293b, transparent: true })
  );
  curShorts.position.set(0, 0.90, 0);
  curShorts.userData = { isApparel: true };
  group.add(curShorts);

  [-1, 1].forEach(side => {
    const x = side * 0.095;
    const thigh = mkMesh(new THREE.CylinderGeometry(0.072, 0.084, 0.43, 14), "fair", [x, 0.635, 0]);
    thigh.userData = { ...BODY_PARTS.legs, key: "legs" };
    group.add(thigh);

    const knee = mkMesh(new THREE.SphereGeometry(0.065, 12, 12), "poor", [x, 0.40, 0.01]);
    knee.userData = { ...BODY_PARTS.knees, key: "knees" };
    group.add(knee);

    const calf = mkMesh(new THREE.CylinderGeometry(0.044, 0.058, 0.38, 14), "fair", [x, 0.195, 0]);
    group.add(calf);

    const ankle = mkMesh(new THREE.SphereGeometry(0.038, 10, 10), "fair", [x, -0.005, 0]);
    group.add(ankle);

    const foot = mkMesh(new THREE.BoxGeometry(0.065, 0.03, 0.14), "fair", [x, -0.023, 0.04]);
    group.add(foot);
  });

  for (let i = 0; i < 6; i++) {
    const y = 0.92 + i * 0.075;
    const z = i * 0.008;
    const vert = mkMesh(new THREE.SphereGeometry(0.018, 8, 8), "poor", [0, y, -0.085 + z], [0,0,0], true);
    vert.material.transparent = true;
    vert.material.opacity = 0.7;
    vert.userData = { ...BODY_PARTS.spine, key: "spine" };
    group.add(vert);
  }

  return group;
}

function buildGoalBody() {
  const group = new THREE.Group();
  const mat = () => new THREE.MeshPhongMaterial({
    color: 0x22d3ee, emissive: 0x003344, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.88, shininess: 70,
  });

  const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), mat()); h.scale.set(1, 1.05, 0.98); h.position.set(0, 1.68, 0); group.add(h);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.12, 12), mat()); n.position.set(0, 1.555, 0); group.add(n);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.22), mat()); ch.position.set(0, 1.32, 0); group.add(ch);
  const co = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.17), mat()); co.position.set(0, 1.09, 0); group.add(co);
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.17), mat()); pe.position.set(0, 0.92, 0); group.add(pe);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.16, 0.17), mat()); gl.position.set(0, 0.865, -0.10); group.add(gl);
  
  const goalShorts = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.19), new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x004466, transparent: true }));
  goalShorts.position.set(0, 0.90, 0); goalShorts.userData = { isApparel: true }; group.add(goalShorts);

  [-1, 1].forEach(s => {
    const dx = s * 0.255;
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), mat()); sc.position.set(dx, 1.38, 0); group.add(sc);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.060, 0.30, 12), mat()); ua.position.set(dx + s * 0.06, 1.21, 0); ua.rotation.z = s * 0.28; group.add(ua);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.27, 12), mat()); fa.position.set(dx + s * 0.115, 0.90, 0); fa.rotation.z = s * 0.18; group.add(fa);
  });
  [-1, 1].forEach(s => {
    const x = s * 0.095;
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.090, 0.43, 14), mat()); th.position.set(x, 0.635, 0); group.add(th);
    const ca = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.062, 0.38, 14), mat()); ca.position.set(x, 0.195, 0); group.add(ca);
    const fo = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.14), mat()); fo.position.set(x, -0.023, 0.04); group.add(fo);
  });
  return group;
}

const ORGANS = [
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

function buildOrgans() {
  const group = new THREE.Group();
  ORGANS.forEach(o => {
    const mat = createPeelMaterial(o.color, o.color, 0.7, true);
    const m = new THREE.Mesh(new THREE.SphereGeometry(o.r, 12, 12), mat);
    m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    m.userData = BODY_PARTS[o.key] ? { ...BODY_PARTS[o.key], key: o.key } : {};
    group.add(m);
  });
  return group;
}

// ── R3F SCENE COMPONENT ──
const SystemScene = memo(({ anatomyDepth, morphs, autoRotate, currentView, onSelectPart, setAutoRotate, setCurrentView }) => {
  const curRef = useRef();
  const goalRef = useRef();
  const organsRef = useRef();
  const { camera, gl, raycaster, pointer } = useThree();

  const [curGroup, goalGroup, organGroup] = useMemo(() => {
    const cg = buildCurrentBody();
    const gg = buildGoalBody();
    const og = buildOrgans();
    [cg, gg].forEach(g => g.traverse(m => {
      if(m.isMesh) { m.userData.baseScale = m.scale.clone(); m.userData.basePos = m.position.clone(); }
    }));
    return [cg, gg, og];
  }, []);

  const internalRot = useRef(0);
  const isDrag = useRef(false);

  // Apply Parametric Morphs & Peel shader depths
  useFrame((state, delta) => {
    // Rotation & floating
    if (autoRotate && !isDrag.current) {
      internalRot.current += delta * 0.2;
    } else if (currentView === "Front") internalRot.current = 0;
    else if (currentView === "Side") internalRot.current = Math.PI / 2;
    else if (currentView === "Back") internalRot.current = Math.PI;

    if (curRef.current) curRef.current.rotation.y = internalRot.current;
    if (goalRef.current) goalRef.current.rotation.y = internalRot.current;
    if (organsRef.current) organsRef.current.rotation.y = internalRot.current;

    const t = state.clock.elapsedTime;
    if (curRef.current) curRef.current.position.y = Math.sin(t) * 0.008;
    if (goalRef.current) goalRef.current.position.y = Math.sin(t + 1) * 0.008;
    if (organsRef.current) organsRef.current.position.y = Math.sin(t) * 0.008;

    // Apply Morphs
    [curGroup, goalGroup].forEach(g => {
      g.traverse(mesh => {
        if(!mesh.isMesh) return;
        const k = mesh.userData.key;
        if(k && mesh.userData.baseScale) {
          const bS = mesh.userData.baseScale;
          const bP = mesh.userData.basePos;
          if(k === "chest") mesh.scale.set(bS.x * morphs.chest, bS.y * morphs.chest, bS.z * morphs.chest);
          if(k === "core") mesh.scale.set(bS.x * morphs.waist, bS.y, bS.z * morphs.waist);
          if(k === "shoulders") {
            mesh.position.x = bP.x * morphs.shoulders;
            mesh.scale.set(bS.x * morphs.shoulders, bS.y * morphs.shoulders, bS.z * morphs.shoulders);
          }
          if(k === "arms") {
            mesh.position.x = bP.x * morphs.shoulders; 
            mesh.scale.set(bS.x * morphs.arms, bS.y, bS.z * morphs.arms);
          }
        }
      });
    });

    // Apply Shader Zygote Peel Depth
    const depthNorm = anatomyDepth / 100.0;
    [curGroup, organGroup].forEach(g => {
      g.traverse(m => {
        if (m.isMesh) {
          if (m.material.uniforms?.uDepth) {
            m.material.uniforms.uDepth.value = depthNorm;
          }
          if (m.userData.isApparel) {
            m.material.opacity = morphs.apparel ? 1.0 : 0.0;
          }
        }
      });
    });
  });

  const pointerDown = () => { isDrag.current = true; setAutoRotate(false); setCurrentView("Custom"); };
  const pointerUp = () => { isDrag.current = false; };
  const pointerMove = (e) => {
    if (isDrag.current) {
      if (document.pointerLockElement) return;
      internalRot.current += e.movementX * 0.01;
    }
  };

  const selRef = useRef(null);
  const clickPart = (e) => {
    e.stopPropagation();
    let hit = e.object;
    if (hit.userData?.name || hit.userData?.key) {
      if (selRef.current && selRef.current.material.uniforms) {
        selRef.current.material.uniforms.uIntensity.value = 0.35;
      }
      selRef.current = hit;
      if (selRef.current.material.uniforms) {
        selRef.current.material.uniforms.uIntensity.value = 1.0;
      }
      onSelectPart({ ...hit.userData });
    }
  };

  return (
    <group onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerMove={pointerMove} onPointerLeave={pointerUp}>
      <ambientLight intensity={0.42} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.3} color={0x3366ff} />
      <directionalLight position={[0, 8, 0]} intensity={0.4} color={0xffeedd} />
      <directionalLight position={[0, 1, -5]} intensity={0.18} color={0x00eeff} />
      <pointLight position={[0, 2.5, 1.5]} intensity={0.6} color={0xf59e0b} distance={3} />
      
      <gridHelper args={[5, 20, 0x1d2d44, 0x101a2e]} position={[0, -0.038, 0]} />

      {[-1.1, 1.1].map((x, i) => (
        <mesh key={i} position={[x, -0.032, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.22, 0.012, 8, 40]} />
          <meshPhongMaterial color={i===0?0xf59e0b:0x22d3ee} emissive={i===0?0xf59e0b:0x22d3ee} emissiveIntensity={0.9} />
        </mesh>
      ))}

      <group position={[-1.1, 0, 0]} ref={curRef} onClick={clickPart}>
        <primitive object={curGroup} />
      </group>
      <group position={[-1.1, 0, 0]} ref={organsRef} onClick={clickPart}>
        <primitive object={organGroup} />
      </group>

      <group position={[1.1, 0, 0]} ref={goalRef}>
        <primitive object={goalGroup} />
      </group>
    </group>
  );
});

// ── MAIN EXPORTED COMPONENT ──
export default function Body3D({ onSelectPart }) {
  const [anatomyDepth, setAnatomyDepth] = useState(100);
  const [selected, setSelected] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [currentView, setCurrentView] = useState("Rotating");
  const [viewMode, setViewMode] = useState("3d");
  const [showEditor, setShowEditor] = useState(false);
  const [morphs, setMorphs] = useState({ shoulders: 1, chest: 1, waist: 1, arms: 1, apparel: true });

  const handleSelect = (part) => {
    setSelected(part);
    if (onSelectPart) onSelectPart(part);
  };

  const statusC = selected?.status ? STATUS[selected.status] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 2, marginRight: 8 }}>
          <button 
            style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: "var(--radius-sm)", background: viewMode === "3d" ? "var(--surface)" : "transparent", color: viewMode === "3d" ? "var(--text-1)" : "var(--text-3)" }}
            onClick={() => setViewMode("3d")}>
            Geometry
          </button>
          <button 
            style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: "var(--radius-sm)", background: viewMode === "blueprint" ? "var(--accent)" : "transparent", color: viewMode === "blueprint" ? "#fff" : "var(--text-3)" }}
            onClick={() => setViewMode("blueprint")}>
            High-End Render
          </button>
        </div>

        {viewMode === "3d" && (
          <button onClick={() => setShowEditor(e => !e)} className="btn-ghost" style={{ borderColor: showEditor ? "var(--accent)" : undefined, color: showEditor ? "var(--accent)" : "var(--text-2)" }}>
            ⚙️ Parametric Editor
          </button>
        )}

        {viewMode === "3d" && (
          <>
            <button onClick={() => setAnatomyDepth(d => d === 100 ? 0 : 100)} className="btn-ghost" style={{ borderColor: anatomyDepth < 50 ? "var(--accent)" : undefined, color: anatomyDepth < 50 ? "var(--accent)" : undefined }}>
              🔬 {anatomyDepth < 50 ? "Anatomy ON" : "Anatomy View"}
            </button>
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
          </>
        )}
        
        {viewMode === "3d" && [
          { label: "Front", rad: 0 },
          { label: "Side", rad: Math.PI / 2 },
          { label: "Back", rad: Math.PI },
        ].map(v => (
          <button key={v.label} className="btn-ghost" 
            style={{ padding:"4px 10px", borderColor: currentView === v.label ? "var(--accent)" : "var(--border)", color: currentView === v.label ? "var(--accent)" : "var(--text-2)" }}
            onClick={() => { setAutoRotate(false); setCurrentView(v.label); }}>
            {v.label}
          </button>
        ))}
        {viewMode === "3d" && (
          <button 
            className="btn-ghost" 
            style={{ padding:"4px 10px", borderColor: autoRotate ? "var(--accent)" : "var(--border)", color: autoRotate ? "var(--accent)" : "var(--text-2)" }}
            onClick={() => { setAutoRotate(r => !r); setCurrentView(autoRotate ? "Custom" : "Rotating"); }}>
            360° Spin
          </button>
        )}

        {selected && (
          <button className="btn-ghost" onClick={() => handleSelect(null)}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* R3F Canvas / Image Display */}
      <div style={{
        position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden",
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, #070b14 0%, #0d1a2e 100%)",
        boxShadow: "inset 0 0 60px rgba(6,182,212,0.04)",
      }}>
        <div style={{ display: viewMode === "3d" ? "block" : "none", height: 450 }}>
          <Canvas camera={{ position: [0, 0.82, 4.2], fov: 42 }}>
            <fog attach="fog" args={[0x070b14, 0.05, 10]} />
            <SystemScene 
                anatomyDepth={anatomyDepth} 
                morphs={morphs} 
                autoRotate={autoRotate} 
                currentView={currentView}
                onSelectPart={handleSelect}
                setAutoRotate={setAutoRotate}
                setCurrentView={setCurrentView}
            />
          </Canvas>

          {/* Labels */}
          <div style={{
            position: "absolute", bottom: 14, left: 0, right: 0,
            display: "flex", justifyContent: "space-around", pointerEvents: "none",
          }}>
            {[
              { label: "YOU NOW",    color: "var(--accent)" },
              { label: "YOUR GOAL", color: "#22d3ee" },
            ].map(l => (
              <div key={l.label} style={{
                fontSize: 10, fontWeight: 700, color: l.color, letterSpacing: "2px",
                textTransform: "uppercase", background: "rgba(7,11,20,0.75)",
                padding: "4px 12px", borderRadius: 999,
                border: `1px solid ${l.color}44`,
              }}>{l.label}</div>
            ))}
          </div>

          {/* Morph Target Editor Panel */}
          {showEditor && (
            <div style={{
              position: "absolute", top: 14, right: 14, background: "rgba(10,15,30,0.85)", 
              border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, width: 220, backdropFilter: "blur(8px)"
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: 1, marginBottom: 12 }}>PARAMETRIC MORPH TARGETS</div>
              
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#22d3ee", marginBottom: 4 }}>
                  <span>Anatomical Depth</span><span>{anatomyDepth}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={anatomyDepth} onChange={e => setAnatomyDepth(parseInt(e.target.value))}
                  style={{ width: "100%", cursor: "ew-resize", accentColor: "#22d3ee" }}
                />
              </div>
              <div style={{ width: "100%", height: 1, background: "var(--border)", marginBottom: 12 }} />

              {[
                { key: "chest", label: "Chest Girth" },
                { key: "shoulders", label: "Shoulder Span" },
                { key: "waist", label: "Waist (Vacuum)" },
                { key: "arms", label: "Arm Sweep" }
              ].map(slider => (
                <div key={slider.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>
                    <span>{slider.label}</span>
                    <span style={{ color: "var(--text-3)" }}>{morphs[slider.key].toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" min="0.7" max="1.5" step="0.01" 
                    value={morphs[slider.key]}
                    onChange={(e) => setMorphs(m => ({ ...m, [slider.key]: parseFloat(e.target.value) }))}
                    style={{ width: "100%", cursor: "ew-resize", accentColor: "var(--accent)" }}
                  />
                </div>
              ))}
              
              <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "12px 0" }} />
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-2)" }}>Apparel Simulation</span>
                <button 
                  onClick={() => setMorphs(m => ({ ...m, apparel: !m.apparel }))}
                  style={{ background: morphs.apparel ? "var(--accent)" : "var(--surface)", color: morphs.apparel ? "#fff" : "var(--text-3)", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>
                  {morphs.apparel ? "ON" : "OFF"}
                </button>
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
                <button onClick={() => { setMorphs({shoulders: 1, chest: 1, waist: 1, arms: 1, apparel: true}); setAnatomyDepth(100); }} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10, flex: 1 }}>Reset</button>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontStyle: "italic", alignSelf: "center" }}>Zygote Engine Live</div>
              </div>
            </div>
          )}
        </div>

        {viewMode === "blueprint" && (
          <div style={{ width: "100%", height: 450, position: "relative" }}>
            <Sprite3DViewer fallbackImage="/target_blueprint.png" rowCount={4} framesPerRow={36} />
          </div>
        )}
      </div>

      {/* Legend */}
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

      {/* Selected Part Detail */}
      {selected && !selected.isDes && statusC && (
        <div style={{
          background: statusC.bg, border: `1px solid ${statusC.border}`,
          borderRadius: "var(--radius-md)", padding: 16,
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
