/**
 * GrowthTrack Ultimate — Layer 7: Ambition Path Engine
 * MilestoneBeacons.jsx
 *
 * Glowing beacon columns placed along the ambition path at each milestone.
 *
 * Visual spec:
 *   Each milestone = a vertical light column rising from the floor marker
 *   Unachieved: dim cyan pillar, slow pulse
 *   Achieved:   brilliant gold burst, permanent glow, particle shower
 *   Current target (next unachieved): animated "reach for it" pulse — faster,
 *     brighter, subtle vertical bob
 *
 * Elements per beacon:
 *   1. Vertical light column (ShaderMaterial plane, additive blend)
 *   2. Base ring on floor (pulsing disc)
 *   3. Floating milestone label (<Html>)
 *   4. Achievement burst (one-shot particle explosion on achieve)
 *
 * Data source: store.ambitionPath.milestones
 * Position:    computed from milestoneIndex / targetMonthIndex × PATH_LENGTH
 *
 * The PATH_LENGTH constant is imported from AmbitionPathFloor.
 */

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame }                                      from "@react-three/fiber";
import { Html }                                          from "@react-three/drei";
import { useShallow }                                    from "zustand/react/shallow";
import * as THREE                                        from "three";

import use3DStore     from "../store/use3DStore";
import { PATH_LENGTH } from "./AmbitionPathFloor";

// ─────────────────────────────────────────────────────────────────────────────
// BEACON COLUMN SHADER
// ─────────────────────────────────────────────────────────────────────────────

const beaconVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beaconFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec3  uColor;
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uIntensity;
  uniform float uBob;        // vertical offset for bobbing

  void main() {
    float u = vUv.x;
    float v = vUv.y + uBob;   // bob shifts the UV

    // Horizontal: fade at edges, brightest at centre
    float hFade = 1.0 - smoothstep(0.25, 0.5, abs(u - 0.5));

    // Vertical: fade out at top (atmospheric dissipation)
    float vFade = (1.0 - smoothstep(0.0, 0.85, v)) * smoothstep(0.0, 0.08, v);

    // Pulse wave rising upward
    float wave  = sin(v * 9.0 - uTime * uPulseSpeed) * 0.5 + 0.5;
    wave        = pow(wave, 2.5) * 0.4;

    // Flicker noise
    float flicker = 0.92 + 0.08 * fract(sin(uTime * 13.7 + v * 77.3) * 43758.5);

    float alpha = hFade * vFade * (0.35 + wave) * uIntensity * flicker;

    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.95));
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// BASE RING SHADER
// ─────────────────────────────────────────────────────────────────────────────

const baseRingFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vec2  center = vUv - 0.5;
    float r      = length(center) * 2.0;

    // Ring shape: bright band at r ≈ 0.7, fade inside and outside
    float ring  = smoothstep(0.55, 0.70, r) * (1.0 - smoothstep(0.70, 0.90, r));

    // Inner fill glow
    float fill  = (1.0 - smoothstep(0.0, 0.60, r)) * 0.3;

    // Rotating shimmer
    float angle = atan(center.y, center.x);
    float shimmer = 0.7 + 0.3 * sin(angle * 6.0 + uTime * 2.5);

    // Pulse
    float pulse = 0.6 + 0.4 * sin(uTime * 2.2);

    float alpha = (ring + fill) * shimmer * pulse * uIntensity;
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.8));
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT BURST — one-shot particle ring on milestone achieve
// ─────────────────────────────────────────────────────────────────────────────

function AchievementBurst({ position, onComplete }) {
  const meshRef    = useRef();
  const startTime  = useRef(null);
  const DURATION   = 1.2; // seconds

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (!startTime.current) startTime.current = clock.elapsedTime;

    const t = (clock.elapsedTime - startTime.current) / DURATION;
    if (t >= 1) {
      onComplete?.();
      return;
    }

    // Scale out
    const s = 0.1 + t * 3.5;
    meshRef.current.scale.setScalar(s);

    // Fade out
    if (meshRef.current.material) {
      meshRef.current.material.opacity = (1 - t) * 0.9;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.45, 32]} />
      <meshBasicMaterial
        color="#FFD700"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE BEACON
// ─────────────────────────────────────────────────────────────────────────────

const BEACON_HEIGHT   = 3.2;  // world units tall
const BEACON_WIDTH    = 0.18;
const BASE_RING_SIZE  = 0.5;

const UNACHIEVED_COLOR  = new THREE.Color("#22D3EE");
const ACHIEVED_COLOR    = new THREE.Color("#FFD700");
const NEXT_TARGET_COLOR = new THREE.Color("#F59E0B");

function SingleBeacon({ milestone, position, isNextTarget }) {
  const columnRef  = useRef();
  const ringRef    = useRef();
  const columnMat  = useRef();
  const ringMat    = useRef();

  const [showBurst, setShowBurst] = useState(false);
  const wasAchieved = useRef(milestone.achieved);

  // Detect achievement transition
  useEffect(() => {
    if (milestone.achieved && !wasAchieved.current) {
      setShowBurst(true);
      wasAchieved.current = true;
    }
  }, [milestone.achieved]);

  const color       = milestone.achieved ? ACHIEVED_COLOR
                    : isNextTarget        ? NEXT_TARGET_COLOR
                    :                       UNACHIEVED_COLOR;

  const pulseSpeed  = milestone.achieved ? 1.2
                    : isNextTarget        ? 3.5
                    :                       1.8;

  const intensity   = milestone.achieved ? 1.0
                    : isNextTarget        ? 0.85
                    :                       0.35;

  // Create materials
  const colMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   beaconVertexShader,
    fragmentShader: beaconFragmentShader,
    uniforms: {
      uColor:      { value: color.clone() },
      uTime:       { value: 0 },
      uPulseSpeed: { value: pulseSpeed },
      uIntensity:  { value: intensity },
      uBob:        { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  }), []);

  const ringMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: beaconVertexShader,
    fragmentShader: baseRingFragmentShader,
    uniforms: {
      uColor:     { value: color.clone() },
      uTime:      { value: 0 },
      uIntensity: { value: intensity },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);

  columnMat.current = colMaterial;
  ringMat.current   = ringMaterial;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (columnMat.current) {
      columnMat.current.uniforms.uTime.value = t;
      // Bob animation for next target
      if (isNextTarget) {
        columnMat.current.uniforms.uBob.value = Math.sin(t * 2.2) * 0.04;
      }
    }
    if (ringMat.current) {
      ringMat.current.uniforms.uTime.value = t;
    }
  });

  const burstPos = new THREE.Vector3(...position).add(new THREE.Vector3(0, 0.5, 0));

  return (
    <group position={position} name={`beacon-${milestone.id}`}>

      {/* ── Vertical column (camera-facing quad) ── */}
      <mesh
        ref={columnRef}
        material={colMaterial}
        position={[0, BEACON_HEIGHT / 2, 0]}
      >
        <planeGeometry args={[BEACON_WIDTH, BEACON_HEIGHT, 1, 16]} />
      </mesh>

      {/* ── Cross column (perpendicular, makes it look 3D from all angles) ── */}
      <mesh
        material={colMaterial}
        position={[0, BEACON_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[BEACON_WIDTH, BEACON_HEIGHT, 1, 16]} />
      </mesh>

      {/* ── Base ring ── */}
      <mesh
        ref={ringRef}
        material={ringMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
      >
        <planeGeometry args={[BASE_RING_SIZE * 2, BASE_RING_SIZE * 2]} />
      </mesh>

      {/* ── Achievement burst ── */}
      {showBurst && (
        <AchievementBurst
          position={burstPos.toArray()}
          onComplete={() => setShowBurst(false)}
        />
      )}

      {/* ── Floating label ── */}
      <Html
        position={[0.28, BEACON_HEIGHT * 0.5, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div style={{
          fontFamily:    "'Outfit', sans-serif",
          whiteSpace:    "nowrap",
          display:       "flex",
          flexDirection: "column",
          gap:           "2px",
        }}>
          <span style={{
            fontSize:    "9px",
            fontWeight:  700,
            color:       milestone.achieved
                           ? "#FFD700"
                           : isNextTarget ? "#F59E0B" : "#22D3EE",
            letterSpacing:"0.12em",
            filter:      milestone.achieved ? "drop-shadow(0 0 6px #FFD70099)" : "none",
          }}>
            {milestone.achieved ? "✓ " : isNextTarget ? "▶ " : ""}{milestone.month}
          </span>
          <span style={{
            fontSize:    "10px",
            color:       milestone.achieved ? "#E0C060" : "#445566",
            maxWidth:    "110px",
            lineHeight:  "1.3",
          }}>
            {milestone.label}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE BEACONS — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function MilestoneBeacons() {
  const { milestones, targetMonthIndex } = use3DStore(
    useShallow((s) => ({
      milestones:       s.ambitionPath.milestones,
      targetMonthIndex: s.ambitionPath.targetMonthIndex,
    }))
  );

  // Find the next unachieved milestone
  const nextTargetId = useMemo(
    () => milestones.find((m) => !m.achieved)?.id ?? null,
    [milestones]
  );

  return (
    <group name="milestone-beacons">
      {milestones.map((milestone) => {
        // Z position: 0 = model origin, -PATH_LENGTH = destination
        const z = -(milestone.monthIndex / Math.max(1, targetMonthIndex)) * PATH_LENGTH;

        // Slight X offset alternating left/right to avoid crowding the path
        const xOffset = (milestones.indexOf(milestone) % 2 === 0) ? -0.5 : 0.5;

        return (
          <SingleBeacon
            key={milestone.id}
            milestone={milestone}
            position={[xOffset, 0, z]}
            isNextTarget={milestone.id === nextTargetId}
          />
        );
      })}
    </group>
  );
}
