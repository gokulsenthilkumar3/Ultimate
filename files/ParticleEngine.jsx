/**
 * GrowthTrack Ultimate — Layer 7: Ambition Path Engine
 * ParticleEngine.jsx
 *
 * Ambient particle systems for the ambition path scene.
 *
 * Three particle systems:
 *
 *   SYSTEM A — PATH DUST
 *     Gold/amber motes floating upward along the entire path length.
 *     Density increases toward the destination.
 *     ~800 particles, instanced quads, additive blend.
 *
 *   SYSTEM B — AURA ORBIT
 *     Cyan particles slowly orbiting the current-self model.
 *     ~120 particles in a loose ellipsoid shell.
 *     Represents "current energy" / daily effort.
 *
 *   SYSTEM C — MILESTONE BURST POOL
 *     Pre-allocated pool of 300 particles for achievement explosions.
 *     Dormant by default; activated when a milestone is achieved.
 *     Exported as triggerMilestoneBurst(position) for MilestoneBeacons to call.
 *
 * All systems use BufferGeometry + Points for GPU efficiency.
 * Per-frame updates run in useFrame with typed arrays — zero GC pressure.
 *
 * Deps: @react-three/fiber, three
 */

import React, { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame }                                         from "@react-three/fiber";
import * as THREE                                           from "three";

import { PATH_LENGTH } from "./AmbitionPathFloor";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED POINT SHADER — used by all 3 systems
// Each particle's size and opacity is encoded in per-vertex attributes.
// ─────────────────────────────────────────────────────────────────────────────

const particleVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute vec3  aColor;

  varying float vOpacity;
  varying vec3  vColor;

  void main() {
    vOpacity = aOpacity;
    vColor   = aColor;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position  = projectionMatrix * mvPos;

    // Size attenuates with distance
    gl_PointSize = aSize * (280.0 / -mvPos.z);
  }
`;

const particleFragmentShader = /* glsl */ `
  precision highp float;
  varying float vOpacity;
  varying vec3  vColor;

  void main() {
    // Soft circular particle
    vec2  coord  = gl_PointCoord - 0.5;
    float r      = length(coord) * 2.0;
    float alpha  = (1.0 - smoothstep(0.4, 1.0, r)) * vOpacity;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM A — PATH DUST
// ─────────────────────────────────────────────────────────────────────────────

const DUST_COUNT = 800;

const GOLD_COLOR = new THREE.Color("#FFB830");
const AMBER_COLOR = new THREE.Color("#FF8C00");

function PathDust() {
  const pointsRef = useRef();
  const geoRef    = useRef();

  // Particle state: [x, y, z, vx, vy, vz, life, maxLife, phase]
  const state = useMemo(() => {
    const arr = new Float32Array(DUST_COUNT * 9);
    for (let i = 0; i < DUST_COUNT; i++) {
      const b  = i * 9;
      const t  = Math.random(); // position along path (0=origin, 1=dest)
      const z  = -t * PATH_LENGTH;
      arr[b]   = (Math.random() - 0.5) * 0.8;  // x: within path width
      arr[b+1] = Math.random() * 0.3;           // y: near floor
      arr[b+2] = z;
      arr[b+3] = (Math.random() - 0.5) * 0.01; // vx
      arr[b+4] = 0.008 + Math.random() * 0.018; // vy (rises)
      arr[b+5] = (Math.random() - 0.5) * 0.005; // vz
      arr[b+6] = Math.random();                  // life (randomised start)
      arr[b+7] = 1.5 + Math.random() * 2.5;    // maxLife (seconds)
      arr[b+8] = t;                              // original path position
    }
    return arr;
  }, []);

  const positions = useMemo(() => new Float32Array(DUST_COUNT * 3), []);
  const sizes     = useMemo(() => new Float32Array(DUST_COUNT), []);
  const opacities = useMemo(() => new Float32Array(DUST_COUNT), []);
  const colors    = useMemo(() => {
    const c = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const col = Math.random() > 0.5 ? GOLD_COLOR : AMBER_COLOR;
      c[i*3]   = col.r;
      c[i*3+1] = col.g;
      c[i*3+2] = col.b;
    }
    return c;
  }, []);

  useFrame((_, delta) => {
    const geo = geoRef.current;
    if (!geo) return;

    for (let i = 0; i < DUST_COUNT; i++) {
      const b = i * 9;

      // Advance life
      state[b+6] += delta;
      const life    = state[b+6];
      const maxLife = state[b+7];

      if (life >= maxLife) {
        // Respawn at random position along path, near floor
        const t     = Math.random();
        state[b]    = (Math.random() - 0.5) * 0.8;
        state[b+1]  = Math.random() * 0.08;
        state[b+2]  = -t * PATH_LENGTH;
        state[b+4]  = 0.008 + Math.random() * 0.018;
        state[b+6]  = 0;
        state[b+8]  = t;
      }

      // Move
      state[b]   += state[b+3] * delta * 60;
      state[b+1] += state[b+4] * delta * 60;
      state[b+2] += state[b+5] * delta * 60;

      // Write to buffer
      const p = i * 3;
      positions[p]   = state[b];
      positions[p+1] = state[b+1];
      positions[p+2] = state[b+2];

      // Life curve: fade in fast, hold, fade out slow
      const t01     = life / maxLife;
      const opacity = Math.sin(t01 * Math.PI) * (0.3 + state[b+8] * 0.5);

      // Particles denser/brighter near the destination
      const destProx = state[b+8]; // 0=origin, 1=dest
      sizes[i]    = (0.8 + destProx * 1.8) * (0.7 + Math.random() * 0.3);
      opacities[i] = opacity * (0.4 + destProx * 0.6);
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate     = true;
    geo.attributes.aOpacity.needsUpdate  = true;
  });

  return (
    <points ref={pointsRef} renderOrder={4}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={DUST_COUNT} />
        <bufferAttribute attach="attributes-aSize"    array={sizes}     itemSize={1} count={DUST_COUNT} />
        <bufferAttribute attach="attributes-aOpacity" array={opacities} itemSize={1} count={DUST_COUNT} />
        <bufferAttribute attach="attributes-aColor"   array={colors}    itemSize={3} count={DUST_COUNT} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors={false}
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM B — AURA ORBIT (around current-self clone at origin)
// ─────────────────────────────────────────────────────────────────────────────

const ORBIT_COUNT = 120;
const CYAN_COL    = new THREE.Color("#22D3EE");
const WHITE_COL   = new THREE.Color("#99EEFF");

function AuraOrbit() {
  const geoRef = useRef();

  // Initialise particles on a loose ellipsoid shell
  const state = useMemo(() => {
    const arr = new Float32Array(ORBIT_COUNT * 6); // [theta, phi, r, speed, phase, size]
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const b    = i * 6;
      arr[b]     = Math.random() * Math.PI * 2;          // theta (azimuth)
      arr[b+1]   = Math.random() * Math.PI;              // phi (polar)
      arr[b+2]   = 0.55 + Math.random() * 0.3;          // orbit radius
      arr[b+3]   = (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1); // speed
      arr[b+4]   = Math.random() * Math.PI * 2;          // phase offset
      arr[b+5]   = 0.4 + Math.random() * 0.8;           // size
    }
    return arr;
  }, []);

  const positions = useMemo(() => new Float32Array(ORBIT_COUNT * 3), []);
  const sizes     = useMemo(() => new Float32Array(ORBIT_COUNT), []);
  const opacities = useMemo(() => new Float32Array(ORBIT_COUNT), []);
  const colors    = useMemo(() => {
    const c = new Float32Array(ORBIT_COUNT * 3);
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const col = Math.random() > 0.35 ? CYAN_COL : WHITE_COL;
      c[i*3]=col.r; c[i*3+1]=col.g; c[i*3+2]=col.b;
    }
    return c;
  }, []);

  useFrame(({ clock }, delta) => {
    const geo = geoRef.current;
    if (!geo) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < ORBIT_COUNT; i++) {
      const b      = i * 6;
      // Advance azimuth
      state[b]    += state[b+3] * delta;

      const theta  = state[b];
      const phi    = state[b+1];
      const r      = state[b+2];

      // Ellipsoid: wider in XZ, taller in Y
      const p = i * 3;
      positions[p]   = r * 1.1 * Math.sin(phi) * Math.cos(theta);
      positions[p+1] = 0.9 + r * 1.6 * Math.cos(phi); // model centroid Y ≈ 0.9
      positions[p+2] = r * 1.1 * Math.sin(phi) * Math.sin(theta);

      // Twinkle
      const twinkle  = 0.5 + 0.5 * Math.sin(t * 3.0 + state[b+4]);
      sizes[i]       = state[b+5] * twinkle;
      opacities[i]   = 0.25 + 0.35 * twinkle;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate     = true;
    geo.attributes.aOpacity.needsUpdate  = true;
  });

  return (
    <points renderOrder={5}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={ORBIT_COUNT} />
        <bufferAttribute attach="attributes-aSize"    array={sizes}     itemSize={1} count={ORBIT_COUNT} />
        <bufferAttribute attach="attributes-aOpacity" array={opacities} itemSize={1} count={ORBIT_COUNT} />
        <bufferAttribute attach="attributes-aColor"   array={colors}    itemSize={3} count={ORBIT_COUNT} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM C — MILESTONE BURST POOL
// ─────────────────────────────────────────────────────────────────────────────

const BURST_POOL_SIZE = 300;

// Shared event bus — MilestoneBeacons calls triggerMilestoneBurst()
// and this system picks it up via a ref.
const pendingBursts = [];

/**
 * Call from MilestoneBeacons when a milestone is achieved.
 * @param {[number, number, number]} position - world position of beacon
 */
export function triggerMilestoneBurst(position) {
  pendingBursts.push({ position: [...position], time: performance.now() });
}

function MilestoneBurstPool() {
  const geoRef = useRef();

  // Pool state: [x,y,z, vx,vy,vz, life, maxLife, active]
  const pool      = useMemo(() => new Float32Array(BURST_POOL_SIZE * 9), []);
  const positions = useMemo(() => new Float32Array(BURST_POOL_SIZE * 3), []);
  const sizes     = useMemo(() => new Float32Array(BURST_POOL_SIZE), []);
  const opacities = useMemo(() => new Float32Array(BURST_POOL_SIZE), []);
  const bcolors   = useMemo(() => {
    const c = new Float32Array(BURST_POOL_SIZE * 3);
    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      // Mix of gold and cyan
      const t = Math.random();
      c[i*3]   = 1.0 * (1-t) + 0.13 * t;
      c[i*3+1] = 0.82 * (1-t) + 0.83 * t;
      c[i*3+2] = 0.25 * (1-t) + 0.93 * t;
    }
    return c;
  }, []);

  // Find inactive particle and activate it
  const spawnBurst = useCallback((position) => {
    let spawned = 0;
    for (let i = 0; i < BURST_POOL_SIZE && spawned < 60; i++) {
      const b = i * 9;
      if (pool[b+8] > 0) continue; // active

      const speed = 0.8 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;

      pool[b]   = position[0];
      pool[b+1] = position[1];
      pool[b+2] = position[2];
      pool[b+3] = Math.sin(phi) * Math.cos(theta) * speed;
      pool[b+4] = Math.cos(phi) * speed * 0.8 + 0.5;
      pool[b+5] = Math.sin(phi) * Math.sin(theta) * speed;
      pool[b+6] = 0;
      pool[b+7] = 0.6 + Math.random() * 0.8;
      pool[b+8] = 1; // active
      spawned++;
    }
  }, [pool]);

  useFrame((_, delta) => {
    const geo = geoRef.current;
    if (!geo) return;

    // Drain pending bursts
    while (pendingBursts.length > 0) {
      const burst = pendingBursts.shift();
      spawnBurst(burst.position);
    }

    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      const b = i * 9;

      if (pool[b+8] === 0) {
        // Inactive — park off-screen
        positions[i*3]   = 0;
        positions[i*3+1] = -100;
        positions[i*3+2] = 0;
        opacities[i]     = 0;
        sizes[i]         = 0;
        continue;
      }

      // Advance
      pool[b+6] += delta;
      const life    = pool[b+6];
      const maxLife = pool[b+7];

      if (life >= maxLife) {
        pool[b+8] = 0; // deactivate
        continue;
      }

      // Gravity + velocity
      pool[b+4] -= 1.8 * delta; // gravity
      pool[b]   += pool[b+3] * delta;
      pool[b+1] += pool[b+4] * delta;
      pool[b+2] += pool[b+5] * delta;

      const p = i * 3;
      positions[p]   = pool[b];
      positions[p+1] = pool[b+1];
      positions[p+2] = pool[b+2];

      const t01     = life / maxLife;
      opacities[i]  = Math.sin(t01 * Math.PI) * 0.9;
      sizes[i]      = 1.5 + (1 - t01) * 2.0;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate     = true;
    geo.attributes.aOpacity.needsUpdate  = true;
  });

  return (
    <points renderOrder={6}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={BURST_POOL_SIZE} />
        <bufferAttribute attach="attributes-aSize"    array={sizes}     itemSize={1} count={BURST_POOL_SIZE} />
        <bufferAttribute attach="attributes-aOpacity" array={opacities} itemSize={1} count={BURST_POOL_SIZE} />
        <bufferAttribute attach="attributes-aColor"   array={bcolors}   itemSize={3} count={BURST_POOL_SIZE} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE ENGINE — main export (all 3 systems)
// ─────────────────────────────────────────────────────────────────────────────

export default function ParticleEngine() {
  return (
    <group name="particle-engine">
      <PathDust />
      <AuraOrbit />
      <MilestoneBurstPool />
    </group>
  );
}
