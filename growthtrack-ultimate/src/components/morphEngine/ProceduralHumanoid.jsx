/**
 * ProceduralHumanoid.jsx — High-fidelity Parametric 3D Body
 *
 * Fully procedural humanoid model with realistic proportions, smooth morphing,
 * SSS-style skin material, and support for all 6 render modes.
 *
 * Body is composed of smooth lathe geometry segments with sphere joints.
 * Every dimension is driven by morph weights from use3DStore.
 * The model is anchored with feet at y=0, head at ~y=1.82.
 */

import React, { useMemo, useRef } from 'react';
import { useShallow }             from 'zustand/react/shallow';
import { useFrame }               from '@react-three/fiber';
import * as THREE                 from 'three';
import use3DStore                 from '../../store/use3DStore';

// ── Constants ──────────────────────────────────────────────────────────────────

const LATHE_SEGS = 20;   // circumferential segments
const CAP_SEGS   = 12;   // capsule radial segments

// ── Material factory ───────────────────────────────────────────────────────────

const FITZPATRICK_COLORS = {
  I:   '#FFF0E0',
  II:  '#F5D5B0',
  III: '#E8B88A',
  IV:  '#C68642',
  V:   '#8D5524',
  VI:  '#4A2912',
};

function makeMat(renderMode = 'normal', opacity = 1, skinTone = 'IV') {
  const skinColor = FITZPATRICK_COLORS[skinTone] ?? FITZPATRICK_COLORS.IV;

  if (renderMode === 'ghost') {
    return new THREE.MeshStandardMaterial({
      color:             '#22D3EE',
      emissive:          '#22D3EE',
      emissiveIntensity: 0.35,
      roughness:         0.1,
      metalness:         0.2,
      transparent:       true,
      opacity:           Math.min(opacity, 0.32),
      depthWrite:        false,
      side:              THREE.DoubleSide,
    });
  }

  if (renderMode === 'xray') {
    return new THREE.MeshStandardMaterial({
      color:       '#818CF8',
      roughness:   0.05,
      metalness:   0.8,
      transparent: true,
      opacity:     0.4,
      wireframe:   false,
      depthWrite:  false,
    });
  }

  if (renderMode === 'delta') {
    return new THREE.MeshStandardMaterial({
      color:             '#F59E0B',
      emissive:          '#7A4800',
      emissiveIntensity: 0.12,
      roughness:         0.55,
      metalness:         0.1,
    });
  }

  // Normal / default — warm SSS-style skin
  const mat = new THREE.MeshStandardMaterial({
    color:             new THREE.Color(skinColor),
    roughness:         0.72,
    metalness:         0.0,
    emissive:          new THREE.Color(skinColor).multiplyScalar(0.12),
    emissiveIntensity: 1.0,
  });

  if (opacity < 1) {
    mat.transparent = true;
    mat.opacity     = opacity;
    mat.depthWrite  = false;
  }

  return mat;
}

// ── Lathe profile builder ──────────────────────────────────────────────────────

function buildLathe(profile, segs = LATHE_SEGS) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.computeVertexNormals();
  return geo;
}

// ── Body segment geometry builders ────────────────────────────────────────────

function buildTorso({ shoulderW, chestW, waistW, bellyW, hipW, h }) {
  return buildLathe([
    [hipW * 0.80,      0],
    [hipW,             h * 0.06],
    [hipW * 0.95,      h * 0.14],
    [bellyW,           h * 0.26],
    [waistW,           h * 0.40],
    [waistW * 1.05,    h * 0.50],
    [chestW * 0.88,    h * 0.60],
    [chestW,           h * 0.74],
    [chestW * 0.92,    h * 0.84],
    [shoulderW,        h * 0.93],
    [shoulderW * 0.88, h],
  ]);
}

function buildLimb({ topR, botR, h, bulge = 1.05 }) {
  return buildLathe([
    [botR * 0.78,       0],
    [botR,              h * 0.12],
    [topR * bulge,      h * 0.42],
    [topR * 0.98,       h * 0.72],
    [topR * 0.90,       h],
  ], CAP_SEGS);
}

function buildHip({ w, h }) {
  return buildLathe([
    [w * 0.82, 0],
    [w,        h * 0.35],
    [w * 0.96, h * 0.70],
    [w * 0.88, h],
  ], CAP_SEGS);
}

// ── Dimension computation ──────────────────────────────────────────────────────

function computeDimensions(weights = {}) {
  const mass  = weights.overall_mass   ?? 0.28;
  const gut   = weights.gut_volume     ?? 0.18;
  const fat   = weights.face_roundness ?? 0.20;
  const chD   = weights.chest_depth    ?? 0.40;
  const delt  = weights.deltoid_width  ?? 0.40;
  const wst   = weights.waist_narrow   ?? 0.70;
  const hip   = weights.hip_width      ?? 0.40;
  const glut  = weights.glute_volume   ?? 0.40;
  const bic   = weights.bicep_peak     ?? 0.28;
  const fore  = weights.forearm_girth  ?? 0.28;
  const quad  = weights.quad_sweep     ?? 0.28;
  const cal   = weights.calf_diamond   ?? 0.28;
  const neck  = weights.neck_thickness ?? 0.28;

  // Segment heights (world units ≈ metres)
  const footH  = 0.055;
  const calfH  = 0.335;
  const thighH = 0.370;
  const hipH   = 0.175;
  const torsoH = 0.440;
  const neckH  = 0.110;

  // Head radius grows slightly with face fat / mass
  const headR = 0.100 + fat * 0.024 + mass * 0.008;

  // Cumulative Y anchors (feet at y = 0)
  const footY    = footH / 2;
  const calfY    = footH + calfH / 2;
  const thighY   = footH + calfH + thighH / 2;
  const hipY     = footH + calfH + thighH + hipH / 2;
  const torsoY   = footH + calfH + thighH + hipH;           // torso base
  const torsoMidY = torsoY + torsoH / 2;
  const neckY    = torsoY + torsoH + neckH / 2;
  const headY    = torsoY + torsoH + neckH + headR;

  // Radii / widths
  const shoulderW = 0.140 + delt * 0.095;
  const chestW    = 0.118 + chD  * 0.065 + mass * 0.018;
  const waistW    = 0.092 - wst  * 0.032 + gut  * 0.038 + mass * 0.016;
  const bellyW    = 0.100 + gut  * 0.042 + mass * 0.022;
  const hipW      = 0.118 + hip  * 0.055 + glut * 0.028;
  const neckR     = 0.040 + neck * 0.018;
  const uArmR     = 0.042 + bic  * 0.030;
  const fArmR     = 0.032 + fore * 0.018;
  const thighR    = 0.065 + quad * 0.032;
  const calfR     = 0.042 + cal  * 0.022;

  // Derived positions
  const thighX    = hipW * 0.80;
  const shoulderX = shoulderW + 0.060;
  const uArmH     = 0.300;
  const fArmH     = 0.265;
  const uArmY     = torsoY + torsoH * 0.94 - uArmH / 2;
  const fArmY     = uArmY - uArmH / 2 - fArmH / 2;
  const handY     = fArmY - fArmH / 2 - 0.038;

  return {
    headR, headY, neckH, neckY, neckR,
    shoulderW, chestW, waistW, bellyW, hipW, torsoH, torsoY, torsoMidY,
    hipH, hipY, hipW,
    shoulderX, uArmR, uArmH, uArmY, fArmR, fArmH, fArmY, handY,
    thighX, thighR, thighH, thighY, calfR, calfH, calfY,
    footH, footY, footX: thighX * 0.88,
  };
}

// ── Aura ring component (goal clone glow) ─────────────────────────────────────

function AuraRing({ radius, y, scale = 1.0 }) {
  const meshRef  = useRef();
  const timeRef  = useRef(0);

  const geo = useMemo(() => new THREE.TorusGeometry(radius, 0.004, 8, 64), [radius]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       '#22D3EE',
    transparent: true,
    opacity:     0.55,
    depthWrite:  false,
  }), []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (meshRef.current) {
      // Pulsing opacity
      meshRef.current.material.opacity = 0.35 + Math.sin(timeRef.current * 2.4) * 0.20;
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, y, 0]} geometry={geo} material={mat} />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProceduralHumanoid({
  cloneKey   = 'A',
  position   = [0, 0, 0],
  renderMode = 'normal',
  opacity    = 1,
  visible    = true,
  showAura   = false,
  skinTone   = 'IV',
}) {
  if (!visible) return null;

  const weights = use3DStore(
    useShallow((s) => (cloneKey === 'B' ? s.cloneB : s.cloneA).weights)
  );

  // ── Material ─────────────────────────────────────────────────────────────────
  const mat = useMemo(
    () => makeMat(renderMode, opacity, skinTone),
    [renderMode, opacity, skinTone]
  );

  // ── Geometry refs for live updates ───────────────────────────────────────────
  const groupRef    = useRef();
  const torsoRef    = useRef();
  const hipRef      = useRef();
  const headRef     = useRef();
  const neckRef     = useRef();
  const uArmRefs    = [useRef(), useRef()];
  const fArmRefs    = [useRef(), useRef()];
  const handRefs    = [useRef(), useRef()];
  const thighRefs   = [useRef(), useRef()];
  const calfRefs    = [useRef(), useRef()];
  const shoulderRefs = [useRef(), useRef()];

  // ── Initial dimensions ────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initD = useMemo(() => computeDimensions(weights), []);
  const prevWeightsRef = useRef(weights);

  // ── Per-frame: update geometry when weights change ────────────────────────────
  useFrame(() => {
    if (!groupRef.current) return;
    const w = use3DStore.getState();
    const curW = (cloneKey === 'B' ? w.cloneB : w.cloneA).weights;
    if (curW === prevWeightsRef.current) return;
    prevWeightsRef.current = curW;

    const d = computeDimensions(curW);

    // Torso
    if (torsoRef.current) {
      torsoRef.current.geometry.dispose();
      torsoRef.current.geometry = buildTorso({
        shoulderW: d.shoulderW, chestW: d.chestW, waistW: d.waistW,
        bellyW: d.bellyW, hipW: d.hipW, h: d.torsoH,
      });
      torsoRef.current.position.y = d.torsoY;
    }

    // Hip block
    if (hipRef.current) {
      hipRef.current.geometry.dispose();
      hipRef.current.geometry = buildHip({ w: d.hipW, h: d.hipH });
      hipRef.current.position.y = d.hipY - d.hipH / 2;
    }

    // Head
    if (headRef.current) {
      const s = d.headR / initD.headR;
      headRef.current.scale.setScalar(s);
      headRef.current.position.y = d.headY;
    }

    // Neck
    if (neckRef.current) {
      neckRef.current.scale.set(d.neckR / initD.neckR, 1, d.neckR / initD.neckR);
      neckRef.current.position.y = d.neckY - d.neckH / 2;
    }

    // Arms
    [-1, 1].forEach((side, si) => {
      if (shoulderRefs[si].current) {
        shoulderRefs[si].current.position.set(
          side * (d.shoulderX - 0.01),
          d.torsoY + d.torsoH * 0.92,
          0
        );
        shoulderRefs[si].current.scale.setScalar(d.uArmR / initD.uArmR * 1.1);
      }
      if (uArmRefs[si].current) {
        uArmRefs[si].current.scale.set(d.uArmR / initD.uArmR, 1, d.uArmR / initD.uArmR);
        uArmRefs[si].current.position.set(side * d.shoulderX, d.uArmY - d.uArmH / 2, 0);
      }
      if (fArmRefs[si].current) {
        fArmRefs[si].current.scale.set(d.fArmR / initD.fArmR, 1, d.fArmR / initD.fArmR);
        fArmRefs[si].current.position.set(side * d.shoulderX, d.fArmY - d.fArmH / 2, 0);
      }
      if (handRefs[si].current) {
        handRefs[si].current.position.set(side * d.shoulderX, d.handY, 0.01);
      }
    });

    // Legs
    [-1, 1].forEach((side, si) => {
      if (thighRefs[si].current) {
        thighRefs[si].current.scale.set(d.thighR / initD.thighR, 1, d.thighR / initD.thighR);
        thighRefs[si].current.position.set(side * d.thighX, d.thighY - d.thighH / 2, 0);
      }
      if (calfRefs[si].current) {
        calfRefs[si].current.scale.set(d.calfR / initD.calfR, 1, d.calfR / initD.calfR);
        calfRefs[si].current.position.set(side * d.thighX * 0.88, d.calfY - d.calfH / 2, 0.01);
      }
    });
  });

  // ── Initial geometry (useMemo) ────────────────────────────────────────────────
  const d = initD;

  const torsoGeo = useMemo(() => buildTorso({
    shoulderW: d.shoulderW, chestW: d.chestW, waistW: d.waistW,
    bellyW: d.bellyW, hipW: d.hipW, h: d.torsoH,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const hipGeo = useMemo(() => buildHip({ w: d.hipW, h: d.hipH }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const uArmGeo = useMemo(() => buildLimb({
    topR: d.uArmR, botR: d.uArmR * 0.78, h: d.uArmH, bulge: 1.08,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const fArmGeo = useMemo(() => buildLimb({
    topR: d.fArmR, botR: d.fArmR * 0.72, h: d.fArmH, bulge: 1.03,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const thighGeo = useMemo(() => buildLimb({
    topR: d.thighR, botR: d.thighR * 0.70, h: d.thighH, bulge: 1.06,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const calfGeo = useMemo(() => buildLimb({
    topR: d.calfR, botR: d.calfR * 0.60, h: d.calfH, bulge: 1.04,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wireframe for goal clone aura highlight
  const isGoal = cloneKey === 'B';

  return (
    <group ref={groupRef} position={position} name={`procedural-${cloneKey}`}>

      {/* ── HEAD ── */}
      <mesh ref={headRef} position={[0, d.headY, 0]} material={mat}>
        <sphereGeometry args={[d.headR, 22, 16]} />
      </mesh>

      {/* ── NECK ── */}
      <mesh ref={neckRef} position={[0, d.neckY - d.neckH / 2, 0]} material={mat}>
        <cylinderGeometry args={[d.neckR * 0.88, d.neckR, d.neckH, 12, 1]} />
      </mesh>

      {/* ── TORSO (lathe) ── */}
      <mesh ref={torsoRef} position={[0, d.torsoY, 0]} geometry={torsoGeo} material={mat} />

      {/* ── HIP BLOCK ── */}
      <mesh ref={hipRef} position={[0, d.hipY - d.hipH / 2, 0]} geometry={hipGeo} material={mat} />

      {/* ── SHOULDER CAPS ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={shoulderRefs[si]}
          position={[s * (d.shoulderX - 0.01), d.torsoY + d.torsoH * 0.92, 0]}
          material={mat}
        >
          <sphereGeometry args={[d.uArmR * 1.12, 12, 10]} />
        </mesh>
      ))}

      {/* ── UPPER ARMS ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={uArmRefs[si]}
          position={[s * d.shoulderX, d.uArmY - d.uArmH / 2, 0]}
          geometry={uArmGeo}
          material={mat}
        />
      ))}

      {/* ── ELBOW CAPS ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.shoulderX, d.uArmY - d.uArmH / 2 - 0.012, 0]}
          material={mat}
        >
          <sphereGeometry args={[d.fArmR * 0.92, 10, 8]} />
        </mesh>
      ))}

      {/* ── FOREARMS ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={fArmRefs[si]}
          position={[s * d.shoulderX, d.fArmY - d.fArmH / 2, 0]}
          geometry={fArmGeo}
          material={mat}
        />
      ))}

      {/* ── HANDS ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={handRefs[si]}
          position={[s * d.shoulderX, d.handY, 0.01]}
          material={mat}
        >
          <boxGeometry args={[d.fArmR * 1.6, d.fArmR * 2.1, d.fArmR * 0.8]} />
        </mesh>
      ))}

      {/* ── HIP JOINT SPHERES ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.thighX, d.hipY + d.hipH * 0.08, 0]}
          material={mat}
        >
          <sphereGeometry args={[d.thighR * 0.88, 12, 9]} />
        </mesh>
      ))}

      {/* ── THIGHS ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={thighRefs[si]}
          position={[s * d.thighX, d.thighY - d.thighH / 2, 0]}
          geometry={thighGeo}
          material={mat}
        />
      ))}

      {/* ── KNEE CAPS ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.thighX * 0.92, d.calfY + d.calfH / 2 + 0.008, 0.032]}
          material={mat}
        >
          <sphereGeometry args={[d.calfR * 0.76, 10, 8]} />
        </mesh>
      ))}

      {/* ── CALVES ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={calfRefs[si]}
          position={[s * d.thighX * 0.88, d.calfY - d.calfH / 2, 0.01]}
          geometry={calfGeo}
          material={mat}
        />
      ))}

      {/* ── ANKLE / HEEL SPHERES ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.footX, d.footH, 0.008]}
          material={mat}
        >
          <sphereGeometry args={[d.calfR * 0.62, 9, 7]} />
        </mesh>
      ))}

      {/* ── FEET ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.footX, d.footH / 2, 0.052]}
          material={mat}
        >
          <boxGeometry args={[d.footX * 0.70, d.footH, 0.188]} />
        </mesh>
      ))}

      {/* ── AURA RINGS (goal clone only) ── */}
      {showAura && (
        <>
          <AuraRing radius={d.chestW * 1.15}  y={d.torsoY + d.torsoH * 0.72} />
          <AuraRing radius={d.waistW * 1.18}  y={d.torsoY + d.torsoH * 0.40} />
          <AuraRing radius={d.hipW * 1.12}    y={d.hipY + d.hipH * 0.5} />
          <AuraRing radius={d.headR * 1.20}   y={d.headY} />
        </>
      )}

    </group>
  );
}
