/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * StudioLighting.jsx
 *
 * "The Studio God Light" — exact spec from architecture doc:
 *
 *   Key Light:  DirectionalLight  pos[-3, 5, 3]   intensity 2.2   #FFF5E0  (shadow)
 *   Fill Light: DirectionalLight  pos[4, 2, 2]    intensity 0.7   #D6EEFF
 *   Rim Light:  DirectionalLight  pos[0, 1, -5]   intensity 1.2   #8899FF  (edge glow)
 *   Sub Light:  PointLight        pos[0,-0.3,0.5] intensity 0.5   #FFCC88  dist 3
 *   Ambient:    AmbientLight      intensity 0.08  #0D0D1A
 *
 * Shadow map size is tier-controlled via lodConfig prop.
 */

import React, { useRef } from "react";
import { useHelper }     from "@react-three/drei";
import * as THREE        from "three";

// ── Toggle this in dev to see light helpers ──────────────────────────────────
const SHOW_LIGHT_HELPERS = process.env.NODE_ENV === "development" && false;

// ─────────────────────────────────────────────────────────────────────────────
// KEY LIGHT — main warm directional, casts shadows
// ─────────────────────────────────────────────────────────────────────────────

function KeyLight({ shadowMapSize }) {
  const ref = useRef();
  if (SHOW_LIGHT_HELPERS) useHelper(ref, THREE.DirectionalLightHelper, 1, "yellow");

  const hasShadow = !!shadowMapSize;

  return (
    <directionalLight
      ref={ref}
      position={[-3, 5, 3]}
      intensity={2.2}
      color="#FFF5E0"
      castShadow={hasShadow}
      shadow-mapSize-width={shadowMapSize  ?? 512}
      shadow-mapSize-height={shadowMapSize ?? 512}
      shadow-camera-near={0.5}
      shadow-camera-far={30}
      shadow-camera-left={-4}
      shadow-camera-right={4}
      shadow-camera-top={6}
      shadow-camera-bottom={-2}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILL LIGHT — cool blue-white fill, no shadow
// ─────────────────────────────────────────────────────────────────────────────

function FillLight() {
  const ref = useRef();
  if (SHOW_LIGHT_HELPERS) useHelper(ref, THREE.DirectionalLightHelper, 0.5, "cyan");

  return (
    <directionalLight
      ref={ref}
      position={[4, 2, 2]}
      intensity={0.7}
      color="#D6EEFF"
      castShadow={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIM LIGHT — back-facing blue-purple edge glow (the iconic look)
// ─────────────────────────────────────────────────────────────────────────────

function RimLight() {
  const ref = useRef();
  if (SHOW_LIGHT_HELPERS) useHelper(ref, THREE.DirectionalLightHelper, 0.5, "blue");

  return (
    <directionalLight
      ref={ref}
      position={[0, 1, -5]}
      intensity={1.2}
      color="#8899FF"
      castShadow={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB LIGHT — warm bounce from below, adds skin depth
// ─────────────────────────────────────────────────────────────────────────────

function SubLight() {
  const ref = useRef();
  if (SHOW_LIGHT_HELPERS) useHelper(ref, THREE.PointLightHelper, 0.3, "orange");

  return (
    <pointLight
      ref={ref}
      position={[0, -0.3, 0.5]}
      intensity={0.5}
      color="#FFCC88"
      distance={3}
      decay={2}
      castShadow={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENT — very dark cool base fill (keeps shadows from going pure black)
// ─────────────────────────────────────────────────────────────────────────────

function AmbientBase() {
  return <ambientLight intensity={0.08} color="#0D0D1A" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDIO LIGHTING — assembled rig
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ lodConfig: { shadowMapSize: number|null } }} props
 */
export default function StudioLighting({ lodConfig }) {
  return (
    <group name="studio-lighting-rig">
      <KeyLight  shadowMapSize={lodConfig.shadowMapSize} />
      <FillLight />
      <RimLight  />
      <SubLight  />
      <AmbientBase />
    </group>
  );
}
