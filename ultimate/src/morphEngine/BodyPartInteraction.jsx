/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * BodyPartInteraction.jsx
 *
 * Raycasting system for click-to-focus body part interaction.
 *
 * Behaviours (from architecture doc):
 *   - Click any body region → camera lerps to a close-up preset for that region
 *   - Info panel slides in from right showing current vs goal measurements
 *     for that body part (HTML overlay — not this file's concern)
 *   - Store's `focusedBodyPart` is updated → CameraRig reads it to reposition
 *   - Hover → cursor changes to pointer
 *   - Double-click → deselect (camera returns to previous preset)
 *
 * Body Part Regions:
 *   Mapped to named vertex groups / bone proximity in the GLB.
 *   For dev fallback (capsule), we use Y-range bounding boxes.
 */

import React, { useRef, useCallback, useState } from "react";
import { useThree }                             from "@react-three/fiber";
import * as THREE                               from "three";

import use3DStore from "../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// BODY PART REGION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const BODY_PART_REGIONS = [
  {
    name:       "head",
    hitShape:   "sphere",
    position:   [0, 1.78, 0],
    size:       0.12,
    cameraHint: { azimuth: 0, elevation: 5, distance: 1.2 },
    label:      "Head & Neck",
    metrics:    ["neck"],
  },
  {
    name:       "chest",
    hitShape:   "box",
    position:   [0, 1.42, 0.06],
    size:       [0.36, 0.2, 0.18],
    cameraHint: { azimuth: 0, elevation: 5, distance: 1.5 },
    label:      "Chest",
    metrics:    ["chest"],
  },
  {
    name:       "shoulders",
    hitShape:   "box",
    position:   [0, 1.5, 0],
    size:       [0.56, 0.12, 0.18],
    cameraHint: { azimuth: 0, elevation: 10, distance: 1.8 },
    label:      "Shoulders",
    metrics:    ["shoulders"],
  },
  {
    name:       "leftArm",
    hitShape:   "box",
    position:   [-0.38, 1.28, 0],
    size:       [0.1, 0.32, 0.12],
    cameraHint: { azimuth: 60, elevation: 5, distance: 1.6 },
    label:      "Left Arm",
    metrics:    ["arms", "forearm"],
  },
  {
    name:       "rightArm",
    hitShape:   "box",
    position:   [0.38, 1.28, 0],
    size:       [0.1, 0.32, 0.12],
    cameraHint: { azimuth: -60, elevation: 5, distance: 1.6 },
    label:      "Right Arm",
    metrics:    ["arms", "forearm"],
  },
  {
    name:       "waist",
    hitShape:   "box",
    position:   [0, 1.08, 0.04],
    size:       [0.28, 0.18, 0.16],
    cameraHint: { azimuth: 0, elevation: -5, distance: 1.6 },
    label:      "Core & Waist",
    metrics:    ["waist", "bodyFat"],
  },
  {
    name:       "glutes",
    hitShape:   "box",
    position:   [0, 0.96, -0.1],
    size:       [0.3, 0.18, 0.14],
    cameraHint: { azimuth: 180, elevation: -5, distance: 1.6 },
    label:      "Glutes & Hips",
    metrics:    ["glutes", "hips"],
  },
  {
    name:       "leftThigh",
    hitShape:   "box",
    position:   [-0.14, 0.68, 0],
    size:       [0.13, 0.32, 0.14],
    cameraHint: { azimuth: 20, elevation: -20, distance: 1.5 },
    label:      "Left Thigh",
    metrics:    ["thighs"],
  },
  {
    name:       "rightThigh",
    hitShape:   "box",
    position:   [0.14, 0.68, 0],
    size:       [0.13, 0.32, 0.14],
    cameraHint: { azimuth: -20, elevation: -20, distance: 1.5 },
    label:      "Right Thigh",
    metrics:    ["thighs"],
  },
  {
    name:       "calves",
    hitShape:   "box",
    position:   [0, 0.25, 0],
    size:       [0.26, 0.28, 0.12],
    cameraHint: { azimuth: 0, elevation: -35, distance: 1.4 },
    label:      "Calves",
    metrics:    ["calves", "ankle"],
  },
];

/** Export a map for quick lookup by name */
export const BODY_PART_MAP = Object.fromEntries(
  BODY_PART_REGIONS.map((r) => [r.name, r])
);

// ─────────────────────────────────────────────────────────────────────────────
// HIT ZONE GEOMETRY FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function HitZoneMesh({ region, onHit, onUnhover }) {
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    gl.domElement.style.cursor = "pointer";
  }, [gl]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    gl.domElement.style.cursor = "auto";
    onUnhover?.();
  }, [gl, onUnhover]);

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation(); // prevent firing on parent group
      onHit(region.name);
    },
    [region.name, onHit]
  );

  // Hit zone material — fully invisible by default.
  // Uncomment the debug material for development visualisation.
  const material = (
    <meshBasicMaterial
      transparent
      opacity={0}           // ← change to 0.15 + color="#22D3EE" to debug
      depthWrite={false}
      side={THREE.FrontSide}
    />
  );

  const geometry =
    region.hitShape === "sphere" ? (
      <sphereGeometry args={[region.size, 8, 8]} />
    ) : (
      <boxGeometry args={region.size} />
    );

  return (
    <mesh
      position={region.position}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      renderOrder={99}       // hit zones render last — no depth conflicts
    >
      {geometry}
      {material}
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BODY PART INTERACTION — exported component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ clonePosition: [number, number, number] }} props
 */
export default function BodyPartInteraction({ clonePosition = [0, 0, 0] }) {
  const prevFocused   = useRef(null);
  const lastClickTime = useRef(0);

  const { setFocusedBodyPart, focusedBodyPart, setCameraPreset } = use3DStore(
    (s) => ({
      setFocusedBodyPart: s.setFocusedBodyPart,
      focusedBodyPart:    s.focusedBodyPart,
      setCameraPreset:    s.setCameraPreset,
    })
  );

  const handleHit = useCallback(
    (partName) => {
      const now = Date.now();
      const isDouble = now - lastClickTime.current < 280;
      lastClickTime.current = now;

      if (isDouble || partName === focusedBodyPart) {
        // Double-click or re-clicking focused part → deselect, return to FRONT
        setFocusedBodyPart(null);
        setCameraPreset("FRONT");
        prevFocused.current = null;
        return;
      }

      // Single click → focus this part
      prevFocused.current = focusedBodyPart;
      setFocusedBodyPart(partName);
      setCameraPreset("CUSTOM");
    },
    [focusedBodyPart, setFocusedBodyPart, setCameraPreset]
  );

  const handleUnhover = useCallback(() => {
    // Could clear a hover state here if needed for info panel
  }, []);

  return (
    <group position={clonePosition} name="hit-zones">
      {BODY_PART_REGIONS.map((region) => (
        <HitZoneMesh
          key={region.name}
          region={region}
          onHit={handleHit}
          onUnhover={handleUnhover}
        />
      ))}
    </group>
  );
}
