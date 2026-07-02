/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * CameraRig.jsx
 *
 * Full camera control system. Spec from architecture doc:
 *
 *   ORBIT MODE (default):
 *     Full spherical orbit | mouse drag | pinch zoom 1.5m–6m
 *     Inertia: 0.95 damping | Double-tap: reset front view
 *
 *   PRESET SNAPS (pill buttons — driven from store):
 *     FRONT (0°) | LEFT (90°) | BACK (180°) | RIGHT (270°)
 *     OVERHEAD (top-down) | GROUND (worm-eye)
 *
 *   AUTO-ROTATE:
 *     0.4 rad/s | pauses on hover | resumes 3s after last interaction
 *     Reverses every 2 full rotations
 *
 * Implementation:
 *   - OrbitControls from @react-three/drei (wraps three's OrbitControls)
 *   - useFrame for smooth lerp-to-preset animation (not instant snap)
 *   - Zustand subscriptions: cameraPreset, autoRotate
 *
 * Deps: @react-three/drei, @react-three/fiber, zustand
 */

import React, { useRef, useEffect, useState } from "react";
import { useThree, useFrame }                 from "@react-three/fiber";
import { OrbitControls }                      from "@react-three/drei";
import * as THREE                             from "three";

import use3DStore, { CAMERA_PRESETS } from "../../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** OrbitControls rotation speed */
const ROTATE_SPEED = 0.7;

/** Auto-rotate angular speed (radians per second) */
const AUTO_ROTATE_SPEED = 0.4;

/** How long after last interaction before auto-rotate resumes (ms) */
const AUTO_ROTATE_RESUME_DELAY = 3000;

/** Reverses auto-rotate direction every N full rotations */
const DIRECTION_REVERSE_EVERY = 2;

/** Lerp factor for smooth preset transitions (per frame at 60fps) */
const PRESET_LERP_SPEED = 0.06;

/** Minimum / maximum polar angle (vertical orbit limits) */
const MIN_POLAR = THREE.MathUtils.degToRad(5);
const MAX_POLAR = THREE.MathUtils.degToRad(88);

/** Camera distance limits */
const MIN_DISTANCE = 1.5;
const MAX_DISTANCE = 6.0;

/** Camera look-at target — model centroid */
const MODEL_CENTER = new THREE.Vector3(0, 1.0, 0);

// ─────────────────────────────────────────────────────────────────────────────
// PRESET → spherical coordinates mapper
// azimuth = degrees around Y axis | elevation = degrees above horizon
// ─────────────────────────────────────────────────────────────────────────────

function presetToSpherical(presetKey) {
  const preset   = CAMERA_PRESETS[presetKey];
  const radius   = 3.5; // comfortable viewing distance

  const theta    = THREE.MathUtils.degToRad(preset.azimuth   ?? 0);
  const phi      = THREE.MathUtils.degToRad(90 - (preset.elevation ?? 0));

  return new THREE.Spherical(radius, phi, theta);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA RIG — component
// ─────────────────────────────────────────────────────────────────────────────

export default function CameraRig() {
  const orbitRef       = useRef();
  const { camera }     = useThree();

  // ── Store subscriptions ───────────────────────────────────────────────────
  const cameraPreset   = use3DStore((s) => s.cameraPreset);
  const autoRotate     = use3DStore((s) => s.autoRotate);
  const setAutoRotate  = use3DStore((s) => s.setAutoRotate);
  const setCameraPreset = use3DStore((s) => s.setCameraPreset);

  // ── Local animation state ─────────────────────────────────────────────────
  const targetSpherical   = useRef(presetToSpherical("FRONT"));
  const currentSpherical  = useRef(presetToSpherical("FRONT"));
  const isAnimatingPreset = useRef(false);
  const lastInteraction   = useRef(Date.now());
  const rotationAccum     = useRef(0);
  const autoRotateDir     = useRef(1);

  // ── Respond to preset changes from store ─────────────────────────────────
  useEffect(() => {
    if (cameraPreset === "CUSTOM") return; // user is free-orbiting
    targetSpherical.current  = presetToSpherical(cameraPreset);
    isAnimatingPreset.current = true;
  }, [cameraPreset]);

  // ── Auto-rotate resume timer ──────────────────────────────────────────────
  useEffect(() => {
    if (!orbitRef.current) return;

    const controls = orbitRef.current;

    const onStart = () => {
      lastInteraction.current = Date.now();
      use3DStore.getState().setAutoRotate(false);
      setCameraPreset("CUSTOM");
    };

    const onEnd = () => {
      lastInteraction.current = Date.now();
    };

    controls.addEventListener("start", onStart);
    controls.addEventListener("end",   onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end",   onEnd);
    };
  }, [setCameraPreset]);

  // ── Per-frame: auto-rotate + preset lerp ─────────────────────────────────
  useFrame((_, delta) => {
    if (!orbitRef.current) return;
    const controls = orbitRef.current;

    // ── Auto-rotate resume check ────────────────────────────────────────────
    const msSinceInteraction = Date.now() - lastInteraction.current;
    if (!autoRotate && msSinceInteraction > AUTO_ROTATE_RESUME_DELAY) {
      use3DStore.getState().setAutoRotate(true);
    }

    // ── Preset lerp animation ───────────────────────────────────────────────
    if (isAnimatingPreset.current) {
      const t  = currentSpherical.current;
      const tg = targetSpherical.current;

      t.radius = THREE.MathUtils.lerp(t.radius, tg.radius, PRESET_LERP_SPEED);
      t.phi    = THREE.MathUtils.lerp(t.phi,    tg.phi,    PRESET_LERP_SPEED);
      t.theta  = THREE.MathUtils.lerp(t.theta,  tg.theta,  PRESET_LERP_SPEED);

      // Apply to camera position from spherical
      const pos = new THREE.Vector3().setFromSpherical(t).add(MODEL_CENTER);
      camera.position.copy(pos);
      controls.target.lerp(MODEL_CENTER, PRESET_LERP_SPEED * 2);
      controls.update();

      // Check convergence
      const dPhi   = Math.abs(t.phi    - tg.phi);
      const dTheta = Math.abs(t.theta  - tg.theta);
      const dR     = Math.abs(t.radius - tg.radius);
      if (dPhi < 0.001 && dTheta < 0.001 && dR < 0.001) {
        isAnimatingPreset.current = false;
      }
      return; // skip orbit controls update while animating
    }

    // ── Auto-rotate ──────────────────────────────────────────────────────────
    if (autoRotate && !isAnimatingPreset.current) {
      const angularStep = AUTO_ROTATE_SPEED * delta * autoRotateDir.current;
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() + angularStep);
      controls.update();

      // Track rotation accumulation for direction reversal
      rotationAccum.current += Math.abs(angularStep);
      if (rotationAccum.current >= Math.PI * 2 * DIRECTION_REVERSE_EVERY) {
        autoRotateDir.current  *= -1;
        rotationAccum.current   = 0;
      }
    }
  });

  // ── Double-tap / double-click → reset to front ───────────────────────────
  useEffect(() => {
    let lastTap = 0;
    const handleDoubleTap = (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        use3DStore.getState().setCameraPreset("FRONT");
      }
      lastTap = now;
    };

    const canvas = document.querySelector("canvas");
    canvas?.addEventListener("pointerdown", handleDoubleTap);
    return () => canvas?.removeEventListener("pointerdown", handleDoubleTap);
  }, []);

  return (
    <OrbitControls
      ref={orbitRef}
      // ── Rotation ──────────────────────────────────────────────────────────
      rotateSpeed={ROTATE_SPEED}
      enableRotate={true}
      // ── Zoom ──────────────────────────────────────────────────────────────
      enableZoom={true}
      zoomSpeed={0.8}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      // ── Pan — disabled (always focus on model) ────────────────────────────
      enablePan={false}
      // ── Vertical orbit limits ─────────────────────────────────────────────
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      // ── Inertia (0.95 damping as per spec) ───────────────────────────────
      enableDamping={true}
      dampingFactor={0.05}        // three's damping: lower = more inertia (0.05 ≈ 0.95 retained)
      // ── Target — model centroid ───────────────────────────────────────────
      target={[0, 1.0, 0]}
      // ── Auto-rotate handled manually in useFrame (for direction reversal) ─
      autoRotate={false}
      makeDefault
    />
  );
}
