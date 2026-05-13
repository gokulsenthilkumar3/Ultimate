/**
 * ProceduralHumanoid.jsx — Real-time parametric 3D body built from geometry primitives.
 * Every body segment scales live with morph weights from use3DStore.
 * Used when humanoid-base.glb is not available.
 */

import React, { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import use3DStore from '../../store/use3DStore';

// ── Material factory ──────────────────────────────────────────────────────────
function makeMat(renderMode, opacity = 1) {
  const defs = {
    normal: { color: '#C49A6C', roughness: 0.75, metalness: 0.0, transparent: opacity < 1, opacity },
    ghost:  { color: '#22D3EE', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.32, side: THREE.DoubleSide },
    delta:  { color: '#F59E0B', roughness: 0.5,  metalness: 0.1, transparent: false, opacity: 1 },
    xray:   { color: '#818CF8', roughness: 0.1,  metalness: 0.6, transparent: true,  opacity: 0.45, wireframe: true },
  };
  return new THREE.MeshStandardMaterial(defs[renderMode] ?? defs.normal);
}

// ── Shared mesh helper ────────────────────────────────────────────────────────
function Seg({ geo, pos, mat }) {
  return (
    <mesh position={pos}>
      {geo}
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProceduralHumanoid({
  cloneKey   = 'A',
  position   = [0, 0, 0],
  renderMode = 'normal',
  opacity    = 1,
  visible    = true,
}) {
  const weights = use3DStore(
    useShallow((s) => (cloneKey === 'B' ? s.cloneB : s.cloneA).weights)
  );

  // ── Derive all body dimensions from morph weights ─────────────────────────
  const b = useMemo(() => {
    const w = weights ?? {};
    const mass  = w.overall_mass   ?? 0.3;
    const gut   = w.gut_volume     ?? 0.2;
    const fat   = w.face_roundness ?? 0.2;
    const chD   = w.chest_depth    ?? 0.4;
    const delt  = w.deltoid_width  ?? 0.4;
    const wst   = w.waist_narrow   ?? 0.7;   // high = narrow waist
    const hip   = w.hip_width      ?? 0.4;
    const glut  = w.glute_volume   ?? 0.4;
    const bic   = w.bicep_peak     ?? 0.3;
    const fore  = w.forearm_girth  ?? 0.3;
    const quad  = w.quad_sweep     ?? 0.3;
    const cal   = w.calf_diamond   ?? 0.3;
    const neck  = w.neck_thickness ?? 0.3;

    // Heights
    const fH = 0.055; const cH = 0.33; const tH = 0.36;
    const hH = 0.18;  const bH = 0.22; const uH = 0.38;
    const nH = 0.13;
    const headR = 0.108 + fat * 0.024 + mass * 0.01;

    // Y anchors (feet at y=0)
    const fY = fH / 2;
    const cY = fH + cH / 2;
    const tY = fH + cH + tH / 2;
    const hY = fH + cH + tH + hH / 2;
    const bY = hY + hH / 2 + bH / 2;
    const uY = bY + bH / 2 + uH / 2;
    const nY = uY + uH / 2 + nH / 2;
    const hdY = nY + nH / 2 + headR;

    // Widths
    const torsoW = 0.26 + delt * 0.19;
    const torsoD = 0.13 + chD * 0.10;
    const bellyW = 0.22 - wst * 0.06 + gut * 0.09 + mass * 0.04;
    const bellyD = 0.14 + gut * 0.09;
    const hipW   = 0.25 + hip * 0.12;
    const hipD   = 0.19 + glut * 0.07;
    const shX    = torsoW / 2 + 0.06 + delt * 0.04;
    const uArmR  = 0.046 + bic * 0.028;
    const fArmR  = 0.036 + fore * 0.018;
    const thighR = 0.072 + quad * 0.032;
    const thighX = 0.105 + hip * 0.015;
    const calfR  = 0.048 + cal * 0.022;

    return {
      headR, nH, nY, hdY,
      neckR: 0.044 + neck * 0.018,
      torsoW, torsoD, uH, uY,
      bellyW, bellyD, bH, bY,
      hipW, hipD, hH, hY,
      deltR: 0.065 + delt * 0.026, shX, shY: uY + uH * 0.1,
      uArmR, uArmH: 0.31, uArmY: uY + uH * 0.1 - 0.31 / 2 - 0.065 * 0.3,
      fArmR, fArmH: 0.27,
      thighR, thighH: tH, thighX, tY,
      calfR, calfH: cH, cY,
      fY, fH,
      footX: 0.092 + hip * 0.01,
    };
  }, [weights]);

  const mat = useMemo(() => makeMat(renderMode, opacity), [renderMode, opacity]);

  if (!visible) return null;

  const fArmY = b.uArmY - b.uArmH / 2 - b.fArmH / 2;
  const handY = fArmY - b.fArmH / 2 - 0.05;

  return (
    <group position={position} name={`procedural-${cloneKey}`}>
      {/* HEAD */}
      <mesh position={[0, b.hdY, 0]}>
        <sphereGeometry args={[b.headR, 18, 13]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* NECK */}
      <mesh position={[0, b.nY, 0]}>
        <cylinderGeometry args={[b.neckR * 0.88, b.neckR, b.nH, 8]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* UPPER TORSO */}
      <mesh position={[0, b.uY, 0]}>
        <boxGeometry args={[b.torsoW, b.uH, b.torsoD]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* BELLY / WAIST */}
      <mesh position={[0, b.bY, 0]}>
        <boxGeometry args={[b.bellyW, b.bH, b.bellyD]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* HIPS */}
      <mesh position={[0, b.hY, 0]}>
        <boxGeometry args={[b.hipW, b.hH, b.hipD]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* SHOULDER CAPS */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.shX, b.shY, 0]}>
          <sphereGeometry args={[b.deltR, 11, 8]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* UPPER ARMS */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.shX, b.uArmY, 0]}>
          <cylinderGeometry args={[b.uArmR, b.uArmR * 0.82, b.uArmH, 9]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* FOREARMS */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.shX, fArmY, 0]}>
          <cylinderGeometry args={[b.fArmR * 0.9, b.fArmR * 0.72, b.fArmH, 9]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* HANDS */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.shX, handY, 0]}>
          <boxGeometry args={[0.065, 0.095, 0.03]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* THIGHS */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.thighX, b.tY, 0]}>
          <cylinderGeometry args={[b.thighR, b.thighR * 0.74, b.thighH, 10]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* CALVES */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.thighX * 0.9, b.cY, 0.01]}>
          <cylinderGeometry args={[b.calfR * 0.88, b.calfR * 0.64, b.calfH, 10]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}

      {/* FEET */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.footX, b.fY, 0.04]}>
          <boxGeometry args={[0.082, b.fH, 0.19]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
