import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { STATUS, BODY_PARTS } from "../data/userData";
import Sprite3DViewer from "./Sprite3DViewer";

/* ─────────────────────────────────────────────────────────────────
   SCALE: 182 cm ↔ 1.82 world units  →  1cm = 0.01 units
   User measurements (from DeepSeek):
     Shoulders: 107.5cm circ → span ~42cm wide = 0.42 units (each side 0.21)
     Chest:     86.5cm circ  → ~27.5cm radius  → width ~32cm, depth ~21cm
     Waist:     82cm circ    → ~26cm radius    → width ~29cm, depth ~18cm
     Arms:      30cm circ    → radius 4.77cm   → 0.048 units radius
     Forearms:  27cm circ    → radius 4.30cm   → 0.043 units radius
     Thighs:    53cm circ    → radius 8.44cm   → 0.084 units radius
     Calves:    35cm circ    → radius 5.57cm   → 0.056 units radius
   Skinny-fat traits: slight belly, narrow chest/shoulders, thin arms
──────────────────────────────────────────────────────────────────*/

const S = 0.01; // cm → world units

// ─── USER BODY GEOMETRY (current, realistic skinny-fat) ─────────
function buildCurrentBody() {
  const group = new THREE.Group();

  const STATUS_COLORS = {
    critical: { hex: 0xef4444, em: 0x440000 },
    poor:     { hex: 0xf97316, em: 0x3d1500 },
    fair:     { hex: 0xeab308, em: 0x3d3000 },
    good:     { hex: 0x22c55e, em: 0x063318 },
  };

  function mesh(geo, status, pos, rot = [0,0,0]) {
    const c = STATUS_COLORS[status] || STATUS_COLORS.fair;
    const mat = new THREE.MeshPhongMaterial({
      color: c.hex, emissive: c.em, emissiveIntensity: 0.35,
      shininess: 40, specular: 0x222222,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    return m;
  }

  // ── HEAD (slightly forward = tech neck) ──────────────────────
  const headGeo = new THREE.SphereGeometry(0.1, 24, 24);
  const head = mesh(headGeo, "poor", [0, 1.68, 0.03]); // 0.03 = slight FHP
  head.scale.set(1, 1.05, 0.98);
  head.userData = { ...BODY_PARTS.head, key: "head" };
  group.add(head);

  // ── NECK (forward tilt) ───────────────────────────────────────
  const neckGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.12, 12);
  const neck = mesh(neckGeo, "poor", [0, 1.555, 0.015]);
  neck.rotation.x = 0.12; // forward tilt
  neck.userData = { ...BODY_PARTS.neck, key: "neck" };
  group.add(neck);

  // ── TORSO ─────────────────────────────────────────────────────
  // Upper chest — narrow (86.5cm circ → ~27cm wide × 18cm deep)
  const chestGeo = new THREE.BoxGeometry(0.30 * S * 100, 0.22 * S * 100, 0.19 * S * 100);
  // actually 30cm wide, 22cm tall, 19cm deep
  const chestMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.22, 0.19),
    new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.35, shininess: 40 })
  );
  chestMesh.position.set(0, 1.32, 0);
  chestMesh.userData = { ...BODY_PARTS.chest, key: "chest" };
  group.add(chestMesh);

  // Belly (skinny-fat = slight gut, wider than chest) ← key feature
  const bellyGeo = new THREE.SphereGeometry(1, 16, 12);
  const belly = new THREE.Mesh(
    bellyGeo,
    new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x3d1500, emissiveIntensity: 0.35, shininess: 30 })
  );
  belly.position.set(0, 1.09, 0.04);
  belly.scale.set(0.165, 0.13, 0.115); // slight gut protrusion
  belly.userData = { ...BODY_PARTS.core, key: "core" };
  group.add(belly);

  // Lower torso (hips/pelvis)
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(0.29, 0.15, 0.17),
    new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
  );
  pelvis.position.set(0, 0.92, 0);
  pelvis.userData = { ...BODY_PARTS.legs, key: "legs" };
  group.add(pelvis);

  // ── SHOULDERS ─────────────────────────────────────────────────
  // 107.5cm shoulder circumference means span ~42cm total width
  [-1, 1].forEach(side => {
    const delta = side * 0.21;
    // Shoulder cap
    const sc = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 14, 14),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.35, shininess: 40 })
    );
    sc.position.set(delta, 1.38, 0);
    sc.userData = { ...BODY_PARTS.shoulders, key: "shoulders" };
    group.add(sc);

    // ── UPPER ARM (30cm circ → r ≈ 4.8cm = 0.048 units) ────────
    const uaLen = 0.30; // 30cm upper arm length
    const ua = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.048, uaLen, 12),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    ua.position.set(delta + side * 0.05, 1.21, 0);
    ua.rotation.z = side * 0.28; // arms hang with slight outward angle
    ua.userData = { ...BODY_PARTS.arms, key: "arms" };
    group.add(ua);

    // Elbow sphere
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.040, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    elbow.position.set(delta + side * 0.095, 1.055, 0);
    group.add(elbow);

    // ── FOREARM (27cm circ → r ≈ 4.3cm) ────────────────────────
    const fa = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.040, 0.27, 12),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    fa.position.set(delta + side * 0.13, 0.90, 0);
    fa.rotation.z = side * 0.18;
    fa.userData = { ...BODY_PARTS.arms, key: "arms" };
    group.add(fa);

    // Hand
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.030, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    hand.position.set(delta + side * 0.155, 0.755, 0);
    group.add(hand);
  });

  // ── GLUTES (well developed — good) ───────────────────────────
  const gluteGeo = new THREE.BoxGeometry(0.30, 0.16, 0.17);
  const glute = new THREE.Mesh(
    gluteGeo,
    new THREE.MeshPhongMaterial({ color: 0x22c55e, emissive: 0x063318, emissiveIntensity: 0.4, shininess: 50 })
  );
  glute.position.set(0, 0.865, -0.10);
  glute.userData = { ...BODY_PARTS.glutes, key: "glutes" };
  group.add(glute);

  // ── APPAREL (Shorts) ───────────────────────────
  const curShorts = new THREE.Mesh(
    new THREE.BoxGeometry(0.31, 0.12, 0.19),
    new THREE.MeshPhongMaterial({ color: 0x1e293b })
  );
  curShorts.position.set(0, 0.90, 0);
  curShorts.userData = { isApparel: true };
  group.add(curShorts);

  // ── LEGS ──────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    const x = side * 0.095;

    // Thigh (53cm circ → r ≈ 8.4cm = 0.084)
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.084, 0.43, 14),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    thigh.position.set(x, 0.635, 0);
    thigh.userData = { ...BODY_PARTS.legs, key: "legs" };
    group.add(thigh);

    // Knee
    const knee = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 12, 12),
      new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x3d1500, emissiveIntensity: 0.35 })
    );
    knee.position.set(x, 0.40, 0.01);
    knee.userData = { ...BODY_PARTS.knees, key: "knees" };
    group.add(knee);

    // Shin / Calf (35cm circ → r ≈ 5.6cm = 0.056)
    const calf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.058, 0.38, 14),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    calf.position.set(x, 0.195, 0);
    group.add(calf);

    // Ankle + Foot
    const ankle = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    ankle.position.set(x, -0.005, 0);
    group.add(ankle);

    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.03, 0.14),
      new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x3d3000, emissiveIntensity: 0.3 })
    );
    foot.position.set(x, -0.023, 0.04);
    group.add(foot);
  });

  // ── SPINE (for posture reference) ────────────────────────────
  // Subtle spinal curve to represent forward head / slight kyphosis
  for (let i = 0; i < 6; i++) {
    const y = 0.92 + i * 0.075;
    const z = i * 0.008; // slight forward tilt accumulates
    const vert = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x3d1500, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 })
    );
    vert.position.set(0, y, -0.085 + z);
    vert.userData = { ...BODY_PARTS.spine, key: "spine" };
    group.add(vert);
  }

  return group;
}

// ─── GOAL BODY (desired — all teal, ideal proportions) ──────────
function buildGoalBody() {
  const group = new THREE.Group();
  const mat = () => new THREE.MeshPhongMaterial({
    color: 0x22d3ee, emissive: 0x003344, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.88, shininess: 70,
  });

  // Head
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), mat());
  h.scale.set(1, 1.05, 0.98);
  h.position.set(0, 1.68, 0); // upright posture
  group.add(h);
  // Neck
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.12, 12), mat());
  n.position.set(0, 1.555, 0);
  group.add(n);
  // Chest — wider target (42–44" goal → ~35cm wide)
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.22), mat());
  ch.position.set(0, 1.32, 0);
  group.add(ch);
  // Core — tight waist (30–31" → ~25cm wide)
  const co = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.17), mat());
  co.position.set(0, 1.09, 0);
  group.add(co);
  // Pelvis
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.17), mat());
  pe.position.set(0, 0.92, 0);
  group.add(pe);
  // Glutes
  const gl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.16, 0.17), mat());
  gl.position.set(0, 0.865, -0.10);
  group.add(gl);
  
  // Apparel (Goal Shorts)
  const goalShorts = new THREE.Mesh(
    new THREE.BoxGeometry(0.31, 0.12, 0.19),
    new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x004466 })
  );
  goalShorts.position.set(0, 0.90, 0);
  goalShorts.userData = { isApparel: true };
  group.add(goalShorts);
  // Shoulders — wider (48–49" → ~40cm span each side 0.20)
  [-1, 1].forEach(s => {
    const dx = s * 0.255;
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), mat());
    sc.position.set(dx, 1.38, 0);
    group.add(sc);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.060, 0.30, 12), mat());
    ua.position.set(dx + s * 0.06, 1.21, 0);
    ua.rotation.z = s * 0.28;
    group.add(ua);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.27, 12), mat());
    fa.position.set(dx + s * 0.115, 0.90, 0);
    fa.rotation.z = s * 0.18;
    group.add(fa);
  });
  // Legs — more defined
  [-1, 1].forEach(s => {
    const x = s * 0.095;
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.090, 0.43, 14), mat());
    th.position.set(x, 0.635, 0);
    group.add(th);
    const ca = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.062, 0.38, 14), mat());
    ca.position.set(x, 0.195, 0);
    group.add(ca);
    const fo = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.14), mat());
    fo.position.set(x, -0.023, 0.04);
    group.add(fo);
  });
  return group;
}

// ─── ORGANS (for X-ray mode) ────────────────────────────────────
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

// ─── COMPONENT ──────────────────────────────────────────────────
export default function Body3D({ onSelectPart }) {
  const canvasRef  = useRef(null);
  const threeRef   = useRef({});
  const [anatomyDepth, setAnatomyDepth] = useState(100);
  const [selected, setSelected] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [currentView, setCurrentView] = useState("Rotating");
  const [viewMode, setViewMode] = useState("3d"); // "3d" or "blueprint"
  const [showEditor, setShowEditor] = useState(false);
  const [morphs, setMorphs] = useState({ shoulders: 1, chest: 1, waist: 1, arms: 1, apparel: true });

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth  || 620;
    const H = canvas.clientHeight || 460;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x070b14, 0.14);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.82, 4.2);
    camera.lookAt(0, 0.82, 0);

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Ground grid ──
    const grid = new THREE.GridHelper(5, 20, 0x1d2d44, 0x101a2e);
    grid.position.y = -0.038;
    scene.add(grid);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 6, 4);
    dir.castShadow = true;
    scene.add(dir);
    const fillL = new THREE.DirectionalLight(0x3366ff, 0.3);
    fillL.position.set(-4, 2, -3);
    scene.add(fillL);
    const topL = new THREE.DirectionalLight(0xffeedd, 0.4);
    topL.position.set(0, 8, 0);
    scene.add(topL);
    const rimL = new THREE.DirectionalLight(0x00eeff, 0.18);
    rimL.position.set(0, 1, -5);
    scene.add(rimL);
    // Point light for glow effect
    const pointAcc = new THREE.PointLight(0xf59e0b, 0.6, 3);
    pointAcc.position.set(0, 2.5, 1.5);
    scene.add(pointAcc);

    // ── Bodies ──
    const curGroup  = buildCurrentBody();
    const goalGroup = buildGoalBody();
    curGroup.position.set(-1.1, 0, 0);
    goalGroup.position.set( 1.1, 0, 0);
    
    // Store original transforms for parametric sliding
    [curGroup, goalGroup].forEach(g => {
      g.traverse(m => {
        if(m.isMesh) {
          m.userData.baseScale = m.scale.clone();
          m.userData.basePos = m.position.clone();
        }
      });
    });

    scene.add(curGroup);
    scene.add(goalGroup);

    // ── Organs (hidden by default) ──
    const organMeshes = ORGANS.map(o => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(o.r, 12, 12),
        new THREE.MeshPhongMaterial({
          color: o.color, emissive: o.color, emissiveIntensity: 0.7,
          transparent: true, opacity: 0,
        })
      );
      m.position.set(o.pos[0] - 1.1, o.pos[1], o.pos[2]);
      m.userData = BODY_PARTS[o.key] ? { ...BODY_PARTS[o.key], key: o.key } : {};
      scene.add(m);
      return m;
    });

    // ── Platform rings ──
    [-1.1, 1.1].forEach((x, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.012, 8, 40),
        new THREE.MeshPhongMaterial({
          color: i === 0 ? 0xf59e0b : 0x22d3ee,
          emissive: i === 0 ? 0xf59e0b : 0x22d3ee,
          emissiveIntensity: 0.9,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, -0.032, 0);
      scene.add(ring);
    });

    // ── Labels plane ──
    // (handled in DOM overlay)

    // ── Mouse state ──
    let isDrag = false, lastX = 0, downX = 0, rotY = 0, autoRot = 0;
    const selRef = { mesh: null };

    const onDown = (e) => {
      isDrag = true;
      downX = lastX = e.touches ? e.touches[0].clientX : e.clientX;
      if (threeRef.current.setAutoRotate) threeRef.current.setAutoRotate(false);
    };
    const onMove = (e) => {
      if (!isDrag) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      rotY += (x - lastX) * 0.011;
      curGroup.rotation.y = goalGroup.rotation.y = rotY;
      lastX = x;
      if (threeRef.current.notifyRot) threeRef.current.notifyRot();
    };
    const onUp = () => { isDrag = false; };

    const rc = new THREE.Raycaster();
    const mp = new THREE.Vector2();

    const onClick = (e) => {
      const cx = e.touches ? e.changedTouches[0].clientX : e.clientX;
      const cy = e.touches ? e.changedTouches[0].clientY : e.clientY;
      if (Math.abs(cx - downX) > 10) return;
      const rect = canvas.getBoundingClientRect();
      mp.x =  ((cx - rect.left) / rect.width)  * 2 - 1;
      mp.y = -((cy - rect.top)  / rect.height)  * 2 + 1;
      rc.setFromCamera(mp, camera);
      const all = [];
      curGroup.traverse(c  => { if (c.isMesh) all.push(c); });
      organMeshes.forEach(m => all.push(m));
      const hits = rc.intersectObjects(all);
      if (hits.length && hits[0].object.userData?.name) {
        if (selRef.mesh) {
          selRef.mesh.material.emissiveIntensity = 0.35;
        }
        selRef.mesh = hits[0].object;
        selRef.mesh.material.emissiveIntensity = 1.6;
        const part = { ...hits[0].object.userData };
        setSelected(part);
        if (onSelectPart) onSelectPart(part);
      }
    };

    canvas.addEventListener("mousedown",  onDown);
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseup",    onUp);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove",  onMove, { passive: true });
    window.addEventListener("touchend",   onUp);
    canvas.addEventListener("click",      onClick);
    canvas.addEventListener("touchend",   onClick, { passive: true });

    // ── Zygote Layer Peeling ──
    threeRef.current.setDepth = (depth, appStatus) => {
      // 100 = Skin, 0 = Internal Organs
      const surfaceOp = Math.max(0.12, depth / 100);
      curGroup.traverse(c => {
        if (c.isMesh && c.userData.layer !== "deep") {
          c.material.transparent = true;
          // Hide completely if apparel is off and part is apparel
          if (c.userData.isApparel && !appStatus) {
            c.material.opacity = 0;
          } else {
            c.material.opacity = surfaceOp;
          }
        }
      });
      const orgOp = depth < 70 ? (70 - depth) / 70 : 0;
      organMeshes.forEach(m => { m.material.opacity = orgOp * 0.9; });
    };

    // ── parametric morphing ──
    threeRef.current.updateMorphs = (mStates) => {
      if(!curGroup || !goalGroup) return;
      [curGroup, goalGroup].forEach(g => {
        g.traverse(mesh => {
          if(!mesh.isMesh || !mesh.userData.key) return;
          const k = mesh.userData.key;
          const bS = mesh.userData.baseScale;
          const bP = mesh.userData.basePos;
          
          if(k === "chest") {
            mesh.scale.set(bS.x * mStates.chest, bS.y * mStates.chest, bS.z * mStates.chest);
          }
          if(k === "core") {
            mesh.scale.set(bS.x * mStates.waist, bS.y, bS.z * mStates.waist);
          }
          if(k === "shoulders") {
            mesh.position.x = bP.x * mStates.shoulders;
            mesh.scale.set(bS.x * mStates.shoulders, bS.y * mStates.shoulders, bS.z * mStates.shoulders);
          }
          if(k === "arms") {
            mesh.position.x = bP.x * mStates.shoulders; // follow shoulders outward
            mesh.scale.set(bS.x * mStates.arms, bS.y, bS.z * mStates.arms);
          }
        });
      });
    };

    // ── view toggle ──
    threeRef.current.setAngle = (angle) => {
      rotY = angle;
      autoRot = 0;
      curGroup.rotation.y = goalGroup.rotation.y = rotY;
    };

    threeRef.current.autoRotateLocal = true;
    threeRef.current.setAutoRotate = (val) => {
      threeRef.current.autoRotateLocal = val;
    };

    // ── Animate ──
    const animate = () => {
      threeRef.current.animId = requestAnimationFrame(animate);
      if (!isDrag && threeRef.current.autoRotateLocal) {
        rotY += 0.0032;
        curGroup.rotation.y = goalGroup.rotation.y = rotY;
      }
      // subtle floating
      const t = Date.now() * 0.001;
      curGroup.position.y  = Math.sin(t) * 0.008;
      goalGroup.position.y = Math.sin(t + 1) * 0.008;
      renderer.render(scene, camera);
    };
    animate();

    threeRef.current.renderer   = renderer;
    threeRef.current.cleanListeners = () => {
      canvas.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onUp);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onUp);
      canvas.removeEventListener("click",      onClick);
      canvas.removeEventListener("touchend",   onClick);
    };
  }, []);

  useEffect(() => {
    initScene();
    return () => {
      cancelAnimationFrame(threeRef.current.animId);
      threeRef.current.renderer?.dispose();
      threeRef.current.cleanListeners?.();
    };
  }, []);

  useEffect(() => {
    threeRef.current.setDepth?.(anatomyDepth, morphs.apparel);
  }, [anatomyDepth, morphs.apparel]);

  useEffect(() => {
    threeRef.current.updateMorphs?.(morphs);
  }, [morphs]);

  useEffect(() => {
    if (threeRef.current.setAutoRotate) {
      threeRef.current.setAutoRotate(autoRotate);
    }
  }, [autoRotate]);

  threeRef.current.notifyRot = () => {
    if (autoRotate) setAutoRotate(false);
    setCurrentView("Custom");
  };

  const handleAngle = (label, rad) => {
    setAutoRotate(false);
    if (threeRef.current.setAngle) threeRef.current.setAngle(rad);
    setCurrentView(label);
  };

  const statusC = selected?.status ? STATUS[selected.status] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* View Mode Toggle */}
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
        
        {/* 360 Degree Views */}
        {viewMode === "3d" && [
          { label: "Front", rad: 0 },
          { label: "Side", rad: Math.PI / 2 },
          { label: "Back", rad: Math.PI },
        ].map(v => (
          <button key={v.label} className="btn-ghost" 
            style={{ padding:"4px 10px", borderColor: currentView === v.label ? "var(--accent)" : "var(--border)", 
                     color: currentView === v.label ? "var(--accent)" : "var(--text-2)" }}
            onClick={() => handleAngle(v.label, v.rad)}>
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
          <button className="btn-ghost" onClick={() => { setSelected(null); if (onSelectPart) onSelectPart(null); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Canvas / Image Display */}
      <div style={{
        position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden",
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, #070b14 0%, #0d1a2e 100%)",
        boxShadow: "inset 0 0 60px rgba(6,182,212,0.04)",
      }}>
        <div style={{ display: viewMode === "3d" ? "block" : "none" }}>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: 450, display: "block" }}
          />
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
              
              {/* Zygote Depth Slider */}
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
