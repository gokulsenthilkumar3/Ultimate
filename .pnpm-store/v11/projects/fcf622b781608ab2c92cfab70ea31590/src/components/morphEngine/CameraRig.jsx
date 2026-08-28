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
import { BODY_PART_MAP } from "./BodyPartInteraction";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** OrbitControls rotation speed */
const ROTATE_SPEED = 0.7;

/** Maximum front-axis camera sway used by the cinematic portrait mode. */
const CINEMATIC_SWAY = THREE.MathUtils.degToRad(9);

/** Lerp factor for smooth preset transitions (per frame at 60fps) */
const PRESET_LERP_SPEED = 0.06;

/** Minimum / maximum polar angle (vertical orbit limits) */
const MIN_POLAR = THREE.MathUtils.degToRad(5);
const MAX_POLAR = THREE.MathUtils.degToRad(88);

/** Camera distance limits */
const MIN_DISTANCE = 1.1;
const MAX_DISTANCE = 9.5;

/** Camera look-at target — model centroid */
const MODEL_CENTER = new THREE.Vector3(0, 1.08, 0);

// ─────────────────────────────────────────────────────────────────────────────
// PRESET → spherical coordinates mapper
// azimuth = degrees around Y axis | elevation = degrees above horizon
// ─────────────────────────────────────────────────────────────────────────────

function presetToSpherical(presetKey) {
  const preset   = CAMERA_PRESETS[presetKey];
  const radius   = 3.4; // balanced human-framed distance

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
  const cameraMotion   = use3DStore((s) => s.cinematicState.cameraMotion);
  const focusedBodyPart = use3DStore((s) => s.focusedBodyPart);
  const modelFrame     = use3DStore((s) => s.modelFrame);
  const setAutoRotate  = use3DStore((s) => s.setAutoRotate);
  const setCameraPreset = use3DStore((s) => s.setCameraPreset);
  const fitCameraToBody = use3DStore((s) => s.fitCameraToBody);
  const [cameraZoom, setCameraZoom] = useState(() => use3DStore.getState().cameraZoom ?? 1);
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ));

  // ── Local animation state ─────────────────────────────────────────────────
  const targetSpherical   = useRef(presetToSpherical("FRONT"));
  const currentSpherical  = useRef(presetToSpherical("FRONT"));
  const isAnimatingPreset = useRef(false);

  // ── Respond to preset changes from store ─────────────────────────────────
  useEffect(() => {
    if (cameraPreset === "CUSTOM") return; // user is free-orbiting
    const spherical = presetToSpherical(cameraPreset);
    spherical.radius *= (cameraZoom ?? 1) * (modelFrame?.radius ? Math.max(0.9, Math.min(1.25, modelFrame.radius / 0.72)) : 1);
    targetSpherical.current  = spherical;
    isAnimatingPreset.current = true;
    if (cameraPreset !== "FRONT") setAutoRotate(false);
  }, [cameraPreset, cameraZoom, modelFrame?.radius, setAutoRotate]);

  useEffect(() => {
    if (!modelFrame?.radius) return;
    fitCameraToBody();
  }, [fitCameraToBody, modelFrame?.radius]);

  useEffect(() => {
    const unsubscribe = use3DStore.subscribe(
      (state) => state.cameraZoom,
      (zoom) => setCameraZoom(zoom ?? 1)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener?.("change", handleChange);
    if (media.matches) setAutoRotate(false);
    return () => media.removeEventListener?.("change", handleChange);
  }, [setAutoRotate]);

  useEffect(() => {
    if (!cameraMotion) setAutoRotate(false);
  }, [cameraMotion, setAutoRotate]);

  useEffect(() => {
    if (!focusedBodyPart) return;
    const region = BODY_PART_MAP[focusedBodyPart];
    if (!region?.cameraHint) return;

    const { azimuth = 0, elevation = 5, distance = 2 } = region.cameraHint;
    const frameScale = modelFrame?.radius ? Math.max(0.85, Math.min(1.4, modelFrame.radius / 0.72)) : 1;
    targetSpherical.current = new THREE.Spherical(
      Math.max(1.75, Math.min(distance, 3.8)) * (cameraZoom ?? 1) * frameScale,
      THREE.MathUtils.degToRad(90 - elevation),
      THREE.MathUtils.degToRad(azimuth)
    );
    isAnimatingPreset.current = true;
    use3DStore.getState().setAutoRotate(false);
  }, [focusedBodyPart, cameraZoom, modelFrame?.radius]);

  // ── Auto-rotate resume timer ──────────────────────────────────────────────
  useEffect(() => {
    if (!orbitRef.current) return;

    const controls = orbitRef.current;

    const onStart = () => {
      use3DStore.getState().setAutoRotate(false);
      setCameraPreset("CUSTOM");
    };

    const onEnd = () => {
      // keep manual control stable; do not auto-resume rotation
    };

    controls.addEventListener("start", onStart);
    controls.addEventListener("end",   onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end",   onEnd);
    };
  }, [setCameraPreset]);

  // ── Per-frame: auto-rotate + preset lerp ─────────────────────────────────
  useFrame(({ clock }, delta) => {
    if (!orbitRef.current) return;
    const controls = orbitRef.current;

    // ── Preset lerp animation ───────────────────────────────────────────────
    if (isAnimatingPreset.current) {
      const t  = currentSpherical.current;
      const tg = targetSpherical.current;

      const frameLerp = 1 - Math.pow(1 - PRESET_LERP_SPEED, Math.max(0.1, delta * 60));
      t.radius = THREE.MathUtils.lerp(t.radius, tg.radius, frameLerp);
      t.phi    = THREE.MathUtils.lerp(t.phi,    tg.phi,    frameLerp);
      t.theta  = THREE.MathUtils.lerp(t.theta,  tg.theta,  frameLerp);

      // Apply to camera position from spherical
      const pos = new THREE.Vector3().setFromSpherical(t).add(MODEL_CENTER);
      camera.position.copy(pos);
      controls.target.lerp(MODEL_CENTER, Math.min(1, frameLerp * 2));
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
    if (autoRotate && cameraMotion && !reducedMotion && !isAnimatingPreset.current) {
      const desiredAzimuth = Math.sin(clock.elapsedTime * 0.24) * CINEMATIC_SWAY;
      const cameraLerp = 1 - Math.exp(-delta * 1.8);
      controls.setAzimuthalAngle(THREE.MathUtils.lerp(controls.getAzimuthalAngle(), desiredAzimuth, cameraLerp));
      controls.target.y = MODEL_CENTER.y + Math.sin(clock.elapsedTime * 0.32) * 0.01;
      controls.update();
    }
  });

  // ── Double-tap / double-click → reset to front ───────────────────────────
  useEffect(() => {
    let lastTap = 0;
    const handleDoubleTap = () => {
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
      target={[0, 1.08, 0]}
      // ── Auto-rotate handled manually in useFrame (for direction reversal) ─
      autoRotate={false}
      makeDefault
    />
  );
}
