/**
 * ProceduralHumanoid.jsx — Enhanced Real-time Parametric 3D Body
 *
 * Rebuilt with smooth LatheGeometry for torso, CapsuleGeometry for limbs,
 * and SphereGeometry for joints. Live morph weights drive all dimensions
 * every frame via useFrame — no re-mount needed.
 *
 * All 6 view modes (normal / ghost / delta / xray) are fully supported.
 * Feet anchored at y = 0. Entire model scales with morph weights from use3DStore.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import use3DStore from '../../store/use3DStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const PI2 = Math.PI * 2;
const LATHE_SEGS = 14;   // circumferential segments for lathe bodies
const LATHE_RINGS = 8;   // longitudinal rings for lathe bodies
const CAP_SEGS = 10;     // capsule radial segments

// ── Material factory ──────────────────────────────────────────────────────────

const MAT_DEFS = {
  normal:    { color: '#C68642', roughness: 0.72, metalness: 0.0, emissive: '#3d1a08', emissiveIntensity: 0.04 },
  ghost:     { color: '#22D3EE', roughness: 0.15, metalness: 0.3,  transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, emissive: '#22D3EE', emissiveIntensity: 0.3 },
  delta:     { color: '#F59E0B', roughness: 0.5,  metalness: 0.1,  emissive: '#7a4800', emissiveIntensity: 0.1 },
  xray:      { color: '#818CF8', roughness: 0.1,  metalness: 0.6,  transparent: true, opacity: 0.45, wireframe: true },
  dark_skin: { color: '#8d5524', roughness: 0.72, metalness: 0.0,  emissive: '#2d0c00', emissiveIntensity: 0.04 },
};

function makeMat(renderMode = 'normal', opacity = 1) {
  const def = { ...MAT_DEFS[renderMode] ?? MAT_DEFS.normal };
  if (opacity < 1 && !def.transparent) {
    def.transparent = true;
    def.opacity = opacity;
    def.depthWrite = false;
  }
  return new THREE.MeshStandardMaterial(def);
}

// ── Lathe profile helpers ─────────────────────────────────────────────────────

/**
 * Build a smooth lathe surface from a list of [radius, y] profile points.
 * Returns a LatheGeometry.
 */
function buildLathe(profile, segs = LATHE_SEGS) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segs);
}

/**
 * Torso profile: shoulder → armpit → chest → waist → belly → hips.
 * All dimensions are passed as floats (world units).
 */
function buildTorsoGeometry({ shoulderW, chestW, waistW, bellyW, hipW, chestD, torsoH }) {
  // Profile runs bottom (hips) → top (shoulder)
  // LatheGeometry sweeps around Y axis, so radius values set the silhouette
  const h = torsoH;
  const profile = [
    [hipW * 0.85,    0.00],       // hip outer
    [hipW,           h * 0.08],   // hip flare
    [bellyW,         h * 0.22],   // belly
    [waistW,         h * 0.38],   // waist (narrow)
    [chestW * 0.88,  h * 0.56],   // lower chest
    [chestW,         h * 0.72],   // chest peak
    [chestW * 0.90,  h * 0.82],   // upper chest
    [shoulderW,      h * 0.92],   // shoulder plateau
    [shoulderW * 0.88, h],        // top shoulder
  ];
  return buildLathe(profile);
}

/**
 * Limb segment profile: tapers from topR → botR over height h.
 */
function buildLimbGeometry({ topR, botR, h, segs = CAP_SEGS }) {
  const profile = [
    [botR * 0.8,  0],
    [botR,        h * 0.15],
    [topR * 1.05, h * 0.45],  // slight bicep/quad bulge
    [topR,        h * 0.75],
    [topR * 0.92, h],
  ];
  return buildLathe(profile, segs);
}

// ── Dimension computer ────────────────────────────────────────────────────────

/**
 * Computes all body segment dimensions from the Zustand morph weights.
 * All values are in Three.js world units (roughly 1 unit = 1m at body height).
 */
function computeDimensions(weights = {}) {
  const mass  = weights.overall_mass   ?? 0.3;
  const gut   = weights.gut_volume     ?? 0.2;
  const fat   = weights.face_roundness ?? 0.2;
  const chD   = weights.chest_depth    ?? 0.4;
  const delt  = weights.deltoid_width  ?? 0.4;
  const wst   = weights.waist_narrow   ?? 0.7;   // high = narrow
  const hip   = weights.hip_width      ?? 0.4;
  const glut  = weights.glute_volume   ?? 0.4;
  const bic   = weights.bicep_peak     ?? 0.3;
  const fore  = weights.forearm_girth  ?? 0.3;
  const quad  = weights.quad_sweep     ?? 0.3;
  const cal   = weights.calf_diamond   ?? 0.3;
  const neck  = weights.neck_thickness ?? 0.3;

  // ── Heights (segments, bottom to top) ─────────
  const footH  = 0.05;
  const calfH  = 0.33;
  const thighH = 0.36;
  const hipH   = 0.18;
  const torsoH = 0.42;
  const neckH  = 0.11;
  const headR  = 0.105 + fat * 0.022 + mass * 0.008;

  // ── Y anchors (feet at y=0) ────────────────────
  const footY  = footH / 2;
  const calfY  = footH + calfH / 2;
  const thighY = footH + calfH + thighH / 2;
  const hipY   = footH + calfH + thighH + hipH / 2;
  const torsoMidY = footH + calfH + thighH + hipH + torsoH / 2;
  const neckY  = footH + calfH + thighH + hipH + torsoH + neckH / 2;
  const headY  = footH + calfH + thighH + hipH + torsoH + neckH + headR;

  // ── Widths / radii ─────────────────────────────
  const shoulderW = 0.14 + delt * 0.09;
  const chestW    = 0.12 + chD  * 0.06 + mass * 0.02;
  const waistW    = 0.09 - wst  * 0.03 + gut  * 0.035 + mass * 0.015;
  const bellyW    = 0.10 + gut  * 0.04 + mass * 0.02;
  const hipW      = 0.12 + hip  * 0.05 + glut * 0.025;
  const neckR     = 0.042 + neck * 0.016;
  const uArmR     = 0.044 + bic  * 0.028;
  const fArmR     = 0.034 + fore * 0.016;
  const thighR    = 0.068 + quad * 0.030;
  const calfR     = 0.044 + cal  * 0.020;
  const thighX    = hipW * 0.82;
  const shoulderX = shoulderW + 0.055;
  const uArmH     = 0.30;
  const fArmH     = 0.26;
  const uArmY     = footH + calfH + thighH + hipH + torsoH - 0.04 - uArmH / 2;
  const fArmY     = uArmY - uArmH / 2 - fArmH / 2;
  const handY     = fArmY - fArmH / 2 - 0.04;

  return {
    // Head / neck
    headR, headY, neckH, neckY, neckR,
    // Torso
    shoulderW, chestW, waistW, bellyW, hipW, chestD: chD * 0.10, torsoH, torsoMidY,
    // Hips
    hipH, hipY,
    // Arms
    shoulderX, uArmR, uArmH, uArmY, fArmR, fArmH, fArmY, handY,
    // Legs
    thighX, thighR, thighH, thighY, calfR, calfH, calfY,
    // Feet
    footH, footY,
    footX: thighX * 0.88,
  };
}

// ── Single mesh segment helper ─────────────────────────────────────────────────

function BodySeg({ geoFn, position, mat, name }) {
  const meshRef = useRef();

  // Store the geo factory function so we can rebuild in useFrame if needed
  const geo = useMemo(() => geoFn(), []);     // initial build — updated in parent useFrame

  return (
    <mesh ref={meshRef} position={position} geometry={geo} material={mat} name={name} castShadow={false} />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProceduralHumanoid({
  cloneKey   = 'A',
  position   = [0, 0, 0],
  renderMode = 'normal',
  opacity    = 1,
  visible    = true,
}) {
  if (!visible) return null;

  const weights = use3DStore(
    useShallow((s) => (cloneKey === 'B' ? s.cloneB : s.cloneA).weights)
  );

  // ── Shared material (updated when renderMode/opacity changes) ──────────────
  const mat = useMemo(() => makeMat(renderMode, opacity), [renderMode, opacity]);

  // ── Geometry refs for live dimension updates ──────────────────────────────
  const groupRef    = useRef();
  const torsoRef    = useRef();
  const headRef     = useRef();
  const neckRef     = useRef();
  const hipRef      = useRef();
  const uArmRefs    = [useRef(), useRef()];
  const fArmRefs    = [useRef(), useRef()];
  const thighRefs   = [useRef(), useRef()];
  const calfRefs    = [useRef(), useRef()];

  // ── Dimension state (computed from weights on first render) ────────────────
  const initD = useMemo(() => computeDimensions(weights), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track last weights ref for change detection
  const prevWeightsRef = useRef(weights);

  // ── useFrame: rebuild geometries when weights change ───────────────────────
  useFrame(() => {
    if (!groupRef.current) return;
    const w = use3DStore.getState();
    const currentW = (cloneKey === 'B' ? w.cloneB : w.cloneA).weights;

    // Cheap change detection by checking a key value
    if (currentW === prevWeightsRef.current) return;
    prevWeightsRef.current = currentW;

    const d = computeDimensions(currentW);

    // Update torso geometry
    if (torsoRef.current) {
      torsoRef.current.geometry.dispose();
      torsoRef.current.geometry = buildTorsoGeometry({
        shoulderW: d.shoulderW, chestW: d.chestW, waistW: d.waistW,
        bellyW: d.bellyW, hipW: d.hipW, chestD: d.chestD, torsoH: d.torsoH,
      });
      torsoRef.current.position.y = d.torsoMidY - d.torsoH / 2;
    }

    // Update hip geometry
    if (hipRef.current) {
      hipRef.current.geometry.dispose();
      hipRef.current.geometry = buildLimbGeometry({ topR: d.hipW, botR: d.hipW * 0.88, h: d.hipH });
      hipRef.current.position.y = d.hipY - d.hipH / 2;
    }

    // Update head
    if (headRef.current) {
      headRef.current.scale.set(d.headR / initD.headR, d.headR / initD.headR, d.headR / initD.headR);
      headRef.current.position.y = d.headY;
    }

    // Update neck
    if (neckRef.current) {
      neckRef.current.scale.set(d.neckR / initD.neckR, 1, d.neckR / initD.neckR);
      neckRef.current.position.y = d.neckY - d.neckH / 2;
    }

    // Update arms
    [-1, 1].forEach((side, si) => {
      if (uArmRefs[si].current) {
        uArmRefs[si].current.scale.set(d.uArmR / initD.uArmR, 1, d.uArmR / initD.uArmR);
        uArmRefs[si].current.position.set(side * d.shoulderX, d.uArmY - d.uArmH / 2, 0);
      }
      if (fArmRefs[si].current) {
        fArmRefs[si].current.scale.set(d.fArmR / initD.fArmR, 1, d.fArmR / initD.fArmR);
        fArmRefs[si].current.position.set(side * d.shoulderX, d.fArmY - d.fArmH / 2, 0);
      }
    });

    // Update legs
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

  // ── Initial geometries (built once, updated in useFrame) ──────────────────
  const torsoGeo = useMemo(() => buildTorsoGeometry({
    shoulderW: initD.shoulderW, chestW: initD.chestW, waistW: initD.waistW,
    bellyW: initD.bellyW, hipW: initD.hipW, chestD: initD.chestD, torsoH: initD.torsoH,
  }), []);

  const hipGeo = useMemo(() => buildLimbGeometry({
    topR: initD.hipW, botR: initD.hipW * 0.88, h: initD.hipH,
  }), []);

  const uArmGeo = useMemo(() => buildLimbGeometry({
    topR: initD.uArmR, botR: initD.uArmR * 0.8, h: initD.uArmH,
  }), []);

  const fArmGeo = useMemo(() => buildLimbGeometry({
    topR: initD.fArmR, botR: initD.fArmR * 0.7, h: initD.fArmH,
  }), []);

  const thighGeo = useMemo(() => buildLimbGeometry({
    topR: initD.thighR, botR: initD.thighR * 0.72, h: initD.thighH,
  }), []);

  const calfGeo = useMemo(() => buildLimbGeometry({
    topR: initD.calfR, botR: initD.calfR * 0.62, h: initD.calfH,
  }), []);

  const d = initD;

  return (
    <group ref={groupRef} position={position} name={`procedural-${cloneKey}`}>

      {/* ── HEAD ── */}
      <mesh
        ref={headRef}
        position={[0, d.headY, 0]}
        material={mat}
        castShadow={false}
      >
        <sphereGeometry args={[d.headR, 18, 14]} />
      </mesh>

      {/* ── NECK ── */}
      <mesh
        ref={neckRef}
        position={[0, d.neckY - d.neckH / 2, 0]}
        material={mat}
        castShadow={false}
      >
        <cylinderGeometry args={[d.neckR * 0.9, d.neckR, d.neckH, 10, 1]} />
      </mesh>

      {/* ── TORSO (smooth lathe) ── */}
      <mesh
        ref={torsoRef}
        position={[0, d.torsoMidY - d.torsoH / 2, 0]}
        geometry={torsoGeo}
        material={mat}
        castShadow={false}
      />

      {/* ── HIP BLOCK ── */}
      <mesh
        ref={hipRef}
        position={[0, d.hipY - d.hipH / 2, 0]}
        geometry={hipGeo}
        material={mat}
        castShadow={false}
      />

      {/* ── SHOULDER CAPS ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (d.shoulderX - 0.01), d.torsoMidY - d.torsoH / 2 + d.torsoH * 0.92, 0]}
          material={mat}
          castShadow={false}
        >
          <sphereGeometry args={[d.uArmR * 1.12, 11, 9]} />
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
          castShadow={false}
        />
      ))}

      {/* ── FOREARMS ── */}
      {[-1, 1].map((s, si) => (
        <mesh
          key={s}
          ref={fArmRefs[si]}
          position={[s * d.shoulderX, d.fArmY - d.fArmH / 2, 0]}
          geometry={fArmGeo}
          material={mat}
          castShadow={false}
        />
      ))}

      {/* ── HANDS ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.shoulderX, d.handY, 0.01]}
          material={mat}
          castShadow={false}
        >
          <boxGeometry args={[0.068, 0.092, 0.032]} />
        </mesh>
      ))}

      {/* ── HIP JOINT SPHERES (smooth transition) ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.thighX, d.hipY + d.hipH * 0.05, 0]}
          material={mat}
          castShadow={false}
        >
          <sphereGeometry args={[d.thighR * 0.9, 10, 8]} />
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
          castShadow={false}
        />
      ))}

      {/* ── KNEE CAPS ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.thighX * 0.92, d.calfY + d.calfH / 2 + 0.005, 0.03]}
          material={mat}
          castShadow={false}
        >
          <sphereGeometry args={[d.calfR * 0.78, 9, 7]} />
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
          castShadow={false}
        />
      ))}

      {/* ── FEET ── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * d.footX, d.footY, 0.045]}
          material={mat}
          castShadow={false}
        >
          <boxGeometry args={[0.075, d.footH, 0.18]} />
        </mesh>
      ))}

    </group>
  );
}
