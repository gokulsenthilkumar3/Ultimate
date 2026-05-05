/**
 * GrowthTrack Ultimate — Layer 7: Ambition Path Engine
 * AmbitionPathFloor.jsx
 *
 * The golden road — a cinematic floor path that extends behind the model,
 * showing the journey from Month 0 to the Greek God destination.
 *
 * Visual spec from architecture doc:
 *   "Seeing your Greek God self standing at the end of a golden road
 *    is the most motivating UI ever built for fitness"
 *
 * Elements:
 *   1. PATH SPINE — a curved golden spline on the floor extending ~12 units back
 *   2. MONTH MARKERS — glowing disc nodes at each month interval
 *   3. PROGRESS FILL — path illuminates from origin to currentMonthIndex
 *   4. DIRECTIONAL ARROWS — animated chevrons flowing toward the goal
 *   5. SIDE EDGE LINES — twin cyan border rails along the path
 *   6. DESTINATION GLOW — intense golden bloom at the far end (Greek God position)
 *
 * The path uses a custom ShaderMaterial for the animated flow effect.
 * Month marker discs are instanced for performance.
 *
 * Coordinate system:
 *   Origin [0,0,0]       = current self (model base)
 *   [0, 0, -Z]           = past (behind model, path extends toward -Z)
 *   End point [0,0,-10]  = Greek God destination
 */

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame }                           from "@react-three/fiber";
import { useShallow }                         from "zustand/react/shallow";
import * as THREE                             from "three";

import use3DStore from "../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PATH_LENGTH     = 10.0;   // world units from origin to destination
const PATH_WIDTH      = 0.55;   // width of the main path spine
const MARKER_RADIUS   = 0.10;   // month marker disc radius
const MARKER_Y        = 0.005;  // just above floor
const ARROW_SPACING   = 0.85;   // distance between chevron arrows
const ARROW_COUNT     = 12;     // number of animated chevrons

// ─────────────────────────────────────────────────────────────────────────────
// PATH SPINE SHADER
// Animated golden flow with progress fill
// ─────────────────────────────────────────────────────────────────────────────

const pathVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pathFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uProgress;      // 0–1: how far the path is illuminated
  uniform float uPathLength;

  // Colours
  const vec3 GOLD_BRIGHT  = vec3(1.00, 0.82, 0.25);
  const vec3 GOLD_DARK    = vec3(0.40, 0.28, 0.05);
  const vec3 CYAN_ACCENT  = vec3(0.13, 0.83, 0.93);
  const vec3 DARK_BASE    = vec3(0.02, 0.03, 0.05);

  // V coordinate: 0 = origin (model feet), 1 = destination
  // U coordinate: 0 = left edge, 1 = right edge

  float flowLine(float v, float time, float speed, float freq) {
    // Animated dashes flowing toward the destination
    float phase  = fract(v * freq - time * speed);
    return smoothstep(0.0, 0.15, phase) * (1.0 - smoothstep(0.15, 0.55, phase));
  }

  void main() {
    float u = vUv.x;   // 0=left, 1=right
    float v = vUv.y;   // 0=origin, 1=destination

    // Centre of path (normalized -1 to +1 from centre)
    float centreU = (u - 0.5) * 2.0;

    // Edge fade (path fades at left/right edges)
    float edgeFade = 1.0 - smoothstep(0.6, 1.0, abs(centreU));

    // Progress fill: gold illuminated up to uProgress, dark beyond
    float illuminated = step(v, uProgress);

    // Future path: dark with subtle texture
    float futureFade  = smoothstep(uProgress, uProgress + 0.15, v);

    // Flow lines (animated dashes)
    float flow1 = flowLine(v, uTime, 0.55, 6.0) * (1.0 - futureFade);
    float flow2 = flowLine(v, uTime * 0.7, 0.35, 4.0) * (1.0 - futureFade) * 0.5;

    // Centre line (brighter spine down the middle)
    float centreLine = smoothstep(0.18, 0.0, abs(centreU)) * 0.5;

    // Assemble colour
    vec3 baseColor    = mix(DARK_BASE, GOLD_DARK, illuminated * edgeFade * 0.4);
    vec3 flowColor    = GOLD_BRIGHT * (flow1 + flow2) * edgeFade * illuminated;
    vec3 centreColor  = GOLD_BRIGHT * centreLine * illuminated;

    // Subtle cyan future hint
    vec3 futureHint   = CYAN_ACCENT * 0.04 * futureFade * edgeFade;

    // Destination glow (v close to 1)
    float destGlow    = smoothstep(0.7, 1.0, v) * edgeFade;
    vec3  destColor   = mix(GOLD_BRIGHT, vec3(1.0, 0.96, 0.75), 0.5) * destGlow * 0.6;

    vec3 finalColor   = baseColor + flowColor + centreColor + futureHint + destColor;

    // Pulse the whole path with a slow golden heartbeat
    float pulse       = 0.9 + 0.1 * sin(uTime * 0.8);
    finalColor       *= pulse;

    // Alpha: invisible outside path edges
    float alpha       = edgeFade * 0.88;

    gl_FragColor      = vec4(finalColor, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTIONAL ARROW SHADER (chevron quads)
// ─────────────────────────────────────────────────────────────────────────────

const arrowFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOffset;   // per-instance phase offset

  const vec3 ARROW_COLOR = vec3(1.00, 0.82, 0.25);

  void main() {
    // Chevron shape: V-shape pointing toward +V (destination)
    vec2  p      = vUv - 0.5;           // -0.5 to +0.5
    float chevron = abs(p.x) - p.y - 0.1;  // V shape
    float shape  = 1.0 - smoothstep(-0.02, 0.04, chevron);

    // Fade: transparent at v=0 (tail), brighter at tip
    float tipFade = smoothstep(0.1, 0.8, vUv.y);

    // Animated opacity (flows along path)
    float flow   = fract(uTime * 0.6 + uOffset);
    float alpha  = shape * tipFade * flow * 0.7;

    gl_FragColor = vec4(ARROW_COLOR, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PATH SPINE MESH
// ─────────────────────────────────────────────────────────────────────────────

function PathSpine({ progress }) {
  const meshRef = useRef();
  const matRef  = useRef();

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   pathVertexShader,
    fragmentShader: pathFragmentShader,
    uniforms: {
      uTime:       { value: 0 },
      uProgress:   { value: progress },
      uPathLength: { value: PATH_LENGTH },
    },
    transparent: true,
    depthWrite:  false,
    side:        THREE.FrontSide,
  }), []);

  matRef.current = material;

  // Update progress uniform when it changes
  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uProgress.value = progress;
  }, [progress]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, MARKER_Y + 0.001, -PATH_LENGTH / 2]}
    >
      {/* Path extends PATH_LENGTH in -Z, centred between origin and dest */}
      <planeGeometry args={[PATH_WIDTH, PATH_LENGTH, 1, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDGE RAILS
// Two thin cyan lines bordering the path
// ─────────────────────────────────────────────────────────────────────────────

function EdgeRails({ progress }) {
  const leftRef  = useRef();
  const rightRef = useRef();

  const railMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: pathVertexShader,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uProgress;
      uniform float uTime;
      const vec3 RAIL = vec3(0.13, 0.83, 0.93);
      void main() {
        float lit   = step(vUv.y, uProgress);
        float pulse = 0.6 + 0.4 * sin(uTime * 1.2 + vUv.y * 8.0);
        float alpha = lit * pulse * 0.7 + (1.0 - lit) * 0.08;
        gl_FragColor = vec4(RAIL, alpha);
      }
    `,
    uniforms: {
      uProgress: { value: progress },
      uTime:     { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
  }), []);

  useEffect(() => {
    railMat.uniforms.uProgress.value = progress;
  }, [progress, railMat]);

  useFrame(({ clock }) => {
    railMat.uniforms.uTime.value = clock.elapsedTime;
  });

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.015, PATH_LENGTH, 1, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const halfW = PATH_WIDTH / 2 + 0.01;

  return (
    <>
      <mesh ref={leftRef}  geometry={geo} material={railMat}
        position={[-halfW, MARKER_Y + 0.002, -PATH_LENGTH / 2]} />
      <mesh ref={rightRef} geometry={geo} material={railMat}
        position={[ halfW, MARKER_Y + 0.002, -PATH_LENGTH / 2]} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTH MARKERS — instanced disc nodes
// ─────────────────────────────────────────────────────────────────────────────

function MonthMarkers({ totalMonths, currentMonth }) {
  const meshRef = useRef();

  const { positions, colors } = useMemo(() => {
    const pos  = [];
    const cols = [];

    for (let m = 0; m <= totalMonths; m++) {
      const z = -(m / totalMonths) * PATH_LENGTH;
      pos.push(new THREE.Vector3(0, MARKER_Y + 0.003, z));

      const isPast   = m <= currentMonth;
      const isCurr   = m === currentMonth;

      if (isCurr)      cols.push(new THREE.Color("#FFD700")); // gold: current
      else if (isPast) cols.push(new THREE.Color("#22D3EE")); // cyan: completed
      else             cols.push(new THREE.Color("#1E2D3D")); // dark: future
    }

    return { positions: pos, colors: cols };
  }, [totalMonths, currentMonth]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    positions.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, colors[i]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [positions, colors, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, positions.length]}
      renderOrder={2}
    >
      <cylinderGeometry args={[MARKER_RADIUS, MARKER_RADIUS, 0.006, 12]} />
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.8}
        toneMapped={true}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESTINATION GLOW — golden bloom disc at path end
// ─────────────────────────────────────────────────────────────────────────────

function DestinationGlow() {
  const meshRef = useRef();
  const matRef  = useRef();

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      const vec3 GOLD = vec3(1.00, 0.82, 0.25);
      void main() {
        vec2  center = vUv - 0.5;
        float r      = length(center) * 2.0;
        float fade   = 1.0 - smoothstep(0.3, 1.0, r);
        float pulse  = 0.65 + 0.35 * sin(uTime * 0.9);
        float rot    = atan(center.y, center.x);
        float shimmer = 0.8 + 0.2 * sin(rot * 8.0 + uTime * 1.5);
        float alpha  = fade * pulse * shimmer * 0.65;
        gl_FragColor = vec4(GOLD, alpha);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);

  matRef.current = material;

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, MARKER_Y + 0.003, -PATH_LENGTH]}
      renderOrder={3}
    >
      <planeGeometry args={[2.8, 2.8]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AMBITION PATH FLOOR — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function AmbitionPathFloor() {
  const { currentMonthIndex, targetMonthIndex } = use3DStore(
    useShallow((s) => ({
      currentMonthIndex: s.ambitionPath.currentMonthIndex,
      targetMonthIndex:  s.ambitionPath.targetMonthIndex,
    }))
  );

  const progress = targetMonthIndex > 0
    ? Math.min(1, currentMonthIndex / targetMonthIndex)
    : 0;

  return (
    <group name="ambition-path">
      <PathSpine     progress={progress} />
      <EdgeRails     progress={progress} />
      <MonthMarkers  totalMonths={targetMonthIndex} currentMonth={currentMonthIndex} />
      <DestinationGlow />
    </group>
  );
}

export { PATH_LENGTH };
