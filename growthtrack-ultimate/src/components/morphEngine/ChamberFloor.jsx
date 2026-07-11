/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * ChamberFloor.jsx
 *
 * NOTE: MeshReflectorMaterial (drei) creates an internal CubeCamera FBO.
 * In three.js 0.184.0, WebGLShadowMap.render incorrectly calls CubeCamera.update
 * causing "undefined.length". Replaced with a simple dark MeshStandardMaterial
 * until the drei/three.js compatibility is resolved.
 *
 * Deps: three
 */

import React, { useMemo } from "react";
import * as THREE          from "three";

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
    float line   = gridLine(vUv, uGridScale, uLineWidth);
    float fade   = 1.0 - smoothstep(uFadeRadius * 0.3, uFadeRadius, vDist);
    float alpha  = line * fade * 0.18;
    gl_FragColor = vec4(uLineColor, alpha);
  }
`;

function FloorGrid() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader:   gridVertexShader,
        fragmentShader: gridFragmentShader,
        uniforms: {
          uGridScale:  { value: 8.0 },
          uLineColor:  { value: new THREE.Color("#22D3EE") },
          uLineWidth:  { value: 0.04 },
          uFadeRadius: { value: 6.0 },
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
// CHAMBER FLOOR — simple dark surface (no CubeCamera FBO)
// ─────────────────────────────────────────────────────────────────────────────

export default function ChamberFloor() {
  return (
    <group name="chamber-floor">
      {/* ── Simple dark base plane ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#030508"
          metalness={0.4}
          roughness={0.9}
        />
      </mesh>

      {/* ── Cyan procedural grid overlay ── */}
      <FloorGrid />
    </group>
  );
}
