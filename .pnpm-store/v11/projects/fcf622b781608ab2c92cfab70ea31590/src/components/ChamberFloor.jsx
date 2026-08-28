/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * ChamberFloor.jsx
 *
 * Deep-space reflective floor using MeshReflectorMaterial.
 * Spec from architecture doc:
 *   MeshReflectorMaterial  blur[400,200]  mixStrength 0.6  color #030508
 *
 * Also renders:
 *  - Subtle grid lines (distance-faded) for depth
 *  - Ambition path glow strip origin point (Layer 7 will extend this)
 *
 * Deps: @react-three/drei (MeshReflectorMaterial, useTexture)
 */

import React, { useMemo }       from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE                from "three";

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR GRID — procedural shader-based subtle grid (no texture file needed)
// ─────────────────────────────────────────────────────────────────────────────

const gridVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vDist = length(worldPos.xz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gridFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying float vDist;
  uniform float uGridScale;
  uniform vec3  uLineColor;
  uniform float uLineWidth;
  uniform float uFadeRadius;

  float gridLine(vec2 uv, float scale, float width) {
    vec2 g = abs(fract(uv * scale - 0.5) - 0.5) / fwidth(uv * scale);
    return 1.0 - min(min(g.x, g.y), 1.0) * (1.0 - width);
  }

  void main() {
    float line     = gridLine(vUv, uGridScale, uLineWidth);
    float fade     = 1.0 - smoothstep(uFadeRadius * 0.3, uFadeRadius, vDist);
    float alpha    = line * fade * 0.18;
    gl_FragColor   = vec4(uLineColor, alpha);
  }
`;

function FloorGrid() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader:   gridVertexShader,
        fragmentShader: gridFragmentShader,
        uniforms: {
          uGridScale:   { value: 8.0 },
          uLineColor:   { value: new THREE.Color("#22D3EE") },
          uLineWidth:   { value: 0.04 },
          uFadeRadius:  { value: 6.0 },
        },
        transparent: true,
        depthWrite:  false,
        side:        THREE.FrontSide,
      }),
    []
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow={false}>
      <planeGeometry args={[20, 20, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAMBER FLOOR — main reflector plane
// ─────────────────────────────────────────────────────────────────────────────

export default function ChamberFloor() {
  return (
    <group name="chamber-floor">
      {/* ── Main reflective surface ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <MeshReflectorMaterial
          // ── Reflection config ──────────────────────────────────────────
          blur={[400, 200]}           // horizontal + vertical blur px
          resolution={1024}           // reflection render target size
          mixBlur={6}                 // reflection blur mix intensity
          mixStrength={0.6}           // how strong the reflection is
          mixContrast={1.2}           // punch up the reflection contrast
          mirror={0}                  // 0 = env-based, 1 = perfect mirror
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          // ── Surface appearance ─────────────────────────────────────────
          color="#030508"
          metalness={0.5}
          roughness={1.0}
          // ── Distortion (subtle imperfection for realism) ───────────────
          distortion={0.15}
          distortionMap={null}        // can plug in a normal map later
        />
      </mesh>

      {/* ── Cyan grid overlay ── */}
      <FloorGrid />
    </group>
  );
}
