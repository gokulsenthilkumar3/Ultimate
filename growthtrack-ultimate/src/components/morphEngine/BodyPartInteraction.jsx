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
 *
 * HOW IT WORKS:
 *   R3F's <mesh onPointerDown> is the cleanest approach — no manual
 *   raycasting needed. We attach invisible hit-zone meshes onto the
 *   body mesh and tag them with body part names.
 *
 *   Hit zones are simple primitives (spheres/boxes) parented to
 *   the same group as the body mesh, positioned at anatomical landmarks.
 */

import React, { useRef, useCallback } from "react";
import { useThree }                             from "@react-three/fiber";
import * as THREE                               from "three";

import use3DStore from "../../store/use3DStore";
import { computeHeightScale } from "./metricsToBlendshapes";
import { useAnatomyEligibility } from './useAnatomyEligibility';

// ─────────────────────────────────────────────────────────────────────────────
// BODY PART REGION DEFINITIONS
// Each entry defines:
//   name       → store key, camera preset key, info panel key
//   hitShape   → "sphere" | "box"
//   position   → [x, y, z] world offset from model root
//   size       → sphere radius, or [w, h, d] for box
//   cameraHint → { azimuth, elevation, distance } for CameraRig to lerp to
//   label      → display name in info panel
//   metrics    → which store measurements to show in info panel
// ─────────────────────────────────────────────────────────────────────────────

import { BODY_PART_REGIONS } from './bodyRegions';
export { BODY_PART_REGIONS, BODY_PART_MAP } from './bodyRegions';

// ─────────────────────────────────────────────────────────────────────────────
// HIT ZONE GEOMETRY FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function HitZoneMesh({ region, onHit, onUnhover }) {
  const { gl } = useThree();

  const handlePointerEnter = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    gl.domElement.style.cursor = "pointer";
  }, [gl]);

  const handlePointerLeave = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    gl.domElement.style.cursor = "auto";
    onUnhover?.();
  }, [gl, onUnhover]);

  const handleClick = useCallback(
    (e) => {
      if (e.delta > 5) return; // Orbit/pan gestures must not become part clicks.
      e.stopPropagation();
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
// Renders invisible hit zones over the body mesh.
// Mount this as a sibling of HumanoidClone inside the same group.
//
// Usage:
//   <group>
//     <HumanoidClone cloneKey="A" ... />
//     <BodyPartInteraction clonePosition={position} />
//   </group>
// ─────────────────────────────────────────────────────────────────────────────

import { useShallow } from 'zustand/react/shallow';

/**
 * @param {{ clonePosition: [number, number, number], cloneKey?: 'A'|'B' }} props
 */
export default function BodyPartInteraction({ clonePosition = [0, 0, 0], cloneKey = 'A' }) {
  const prevFocused   = useRef(null);
  const lastClickTime = useRef(0);
  const diagnostics = use3DStore(s => s.modelDiagnostics);
  const wardrobe = use3DStore(s => s.wardrobeState);
  const redacted = use3DStore(s => s.captureRedacted);
  const eligibility = useAnatomyEligibility(diagnostics);
  const regionFrames = use3DStore(s => s.modelRegionFrames[cloneKey]);

  const { setFocusedBodyPart, focusedBodyPart, setCameraPreset, heightScale } = use3DStore(
    useShallow((s) => ({
      setFocusedBodyPart: s.setFocusedBodyPart,
      focusedBodyPart:    s.focusedBodyPart,
      setCameraPreset:    s.setCameraPreset,
      heightScale: computeHeightScale(
        cloneKey === 'B' ? s.cloneB.metrics : s.cloneA.metrics,
        cloneKey === 'B' ? s.cloneA.metrics : {},
      ),
    }))
  );

  const handleHit = useCallback(
    (partName) => {
      const now = Date.now();
      const isDouble = partName === focusedBodyPart && now - lastClickTime.current < 280;
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

      // CameraRig frames the evaluated region; preserve this selection during orbit.
    },
    [focusedBodyPart, setFocusedBodyPart, setCameraPreset]
  );

  const handleUnhover = useCallback(() => {
    // Could clear a hover state here if needed for info panel
  }, []);

  return (
    <group position={clonePosition} name="hit-zones">
      {BODY_PART_REGIONS.filter(region => !region.private || (eligibility.allowed && wardrobe === 'ANATOMICAL' && !redacted)).map((region) => (
        <HitZoneMesh
          key={region.name}
          region={regionFrames[region.name] ? { ...region, hitShape: 'box', position: regionFrames[region.name].center, size: regionFrames[region.name].size.map(n => Math.max(n,.035)) } : {
            ...region, position: [region.position[0], region.position[1] * heightScale, region.position[2]],
            size: Array.isArray(region.size) ? [region.size[0],region.size[1] * heightScale,region.size[2]] : region.size,
          }}
          onHit={handleHit}
          onUnhover={handleUnhover}
        />
      ))}
    </group>
  );
}
