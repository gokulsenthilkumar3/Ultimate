/**
 * GrowthTrack Ultimate — Layer 7: Ambition Path Engine
 * GreekGodClone.jsx
 *
 * The destination figure — the Greek God end-state standing at the far end
 * of the ambition path.
 *
 * Visual spec from architecture doc:
 *   "Your Greek God self standing at the end of the golden road"
 *   - Rendered at position [0, 0, -PATH_LENGTH]
 *   - Uses cloneB (goal metrics) with snapWeights=true
 *   - Full gold aura — god-ray shafts + ground corona
 *   - Anatomy: BODY_COMP wardrobe (nude + vascularity at max)
 *   - Subtle vertical bob animation (1 cycle / 6 seconds)
 *   - Faint silhouette visible through the fog even before you reach it
 *   - Floating stats overlay above the head
 *   - Deadline countdown badge
 *
 * Distance fog:
 *   Three.js FogExp2 (set in HumanoidViewer) naturally fades the figure.
 *   At 10 units depth with density 0.018 it is ~85% fogged — dramatically
 *   visible but shrouded in mystery. Perfect.
 *
 * Scale:
 *   The figure is scaled to 1.0 (same as current clone) — perspective
 *   makes it appear slightly smaller at the distance, which is correct.
 */

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame }                           from "@react-three/fiber";
import { Html }                               from "@react-three/drei";
import * as THREE                             from "three";

import use3DStore     from "../store/use3DStore";
import HumanoidClone  from "../morphEngine/HumanoidClone";
import { PATH_LENGTH } from "./AmbitionPathFloor";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DESTINATION_Z   = -PATH_LENGTH;
const BOB_AMPLITUDE   = 0.04;   // world units
const BOB_FREQUENCY   = 1.047;  // rad/s → 6s period

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING STATS BADGE
// Shows the goal metrics above the Greek God clone's head.
// ─────────────────────────────────────────────────────────────────────────────

function GoalStatsBadge({ metrics, deadline, progressPercent }) {
  const daysLeft = useMemo(() => {
    if (!deadline) return null;
    const now  = new Date();
    const end  = new Date(deadline);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [deadline]);

  return (
    <Html
      position={[0, 2.5, 0]}
      center
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            "6px",
        fontFamily:     "'Outfit', sans-serif",
      }}>
        {/* Title */}
        <div style={{
          fontSize:    "11px",
          fontWeight:  900,
          letterSpacing:"0.25em",
          color:       "#FFD700",
          filter:      "drop-shadow(0 0 12px #FFD70099)",
          textTransform:"uppercase",
          whiteSpace:  "nowrap",
        }}>
          ⚡ GREEK GOD ⚡
        </div>

        {/* Stats card */}
        <div style={{
          background:    "rgba(2, 3, 7, 0.88)",
          border:        "1px solid #FFD70033",
          borderRadius:  "10px",
          padding:       "8px 14px",
          backdropFilter:"blur(12px)",
          boxShadow:     "0 0 24px #FFD70022",
          display:       "flex",
          flexDirection: "column",
          gap:           "4px",
          minWidth:      "130px",
        }}>
          {/* Key metrics */}
          {[
            { label: "Weight",  val: `${metrics?.weight ?? "--"}kg` },
            { label: "Body Fat",val: `${metrics?.bodyFat ?? "--"}%` },
            { label: "Chest",   val: `${metrics?.chest ?? "--"}cm` },
            { label: "Arms",    val: `${metrics?.arms ?? "--"}cm` },
          ].map(({ label, val }) => (
            <div key={label} style={{
              display:        "flex",
              justifyContent: "space-between",
              gap:            "12px",
              fontSize:       "10px",
            }}>
              <span style={{ color: "#445566", letterSpacing: "0.08em" }}>{label}</span>
              <span style={{ color: "#FFD700",  fontWeight: 700 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Deadline countdown */}
        {daysLeft !== null && (
          <div style={{
            background:    "rgba(2, 3, 7, 0.85)",
            border:        "1px solid #FFD70044",
            borderRadius:  "20px",
            padding:       "4px 14px",
            fontSize:      "10px",
            color:         daysLeft < 60 ? "#F43F5E" : "#FFD700",
            fontWeight:    700,
            letterSpacing: "0.1em",
            whiteSpace:    "nowrap",
            filter:        daysLeft < 60 ? "drop-shadow(0 0 8px #F43F5E88)" : "none",
          }}>
            {daysLeft === 0
              ? "🏆 DAY ZERO"
              : `${daysLeft}d remaining`}
          </div>
        )}

        {/* Progress bar */}
        <div style={{
          width:        "130px",
          height:       "3px",
          background:   "#0D1520",
          borderRadius: "2px",
          overflow:     "hidden",
        }}>
          <div style={{
            width:        `${progressPercent}%`,
            height:       "100%",
            background:   "linear-gradient(90deg, #FFB83088, #FFD700)",
            borderRadius: "2px",
            boxShadow:    "0 0 6px #FFD70066",
            transition:   "width 1s cubic-bezier(0.16,1,0.3,1)",
          }} />
        </div>
        <div style={{
          fontSize:    "9px",
          color:       "#445566",
          letterSpacing:"0.15em",
        }}>
          {progressPercent}% OF YOUR JOURNEY
        </div>
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUND HALO — extra golden disc around the Greek God's feet
// Supplements the AuraShader ground corona at this specific position.
// ─────────────────────────────────────────────────────────────────────────────

function GroundHalo() {
  const matRef = useRef();

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

      void main() {
        vec2  c    = vUv - 0.5;
        float r    = length(c) * 2.0;
        float fade = 1.0 - smoothstep(0.2, 1.0, r);
        float pulse = 0.55 + 0.45 * sin(uTime * 0.75);
        float rot   = atan(c.y, c.x);
        float rays  = 0.7 + 0.3 * sin(rot * 12.0 + uTime * 1.2);
        float alpha = fade * pulse * rays * 0.55;
        gl_FragColor = vec4(1.0, 0.82, 0.25, alpha); // gold
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={3}>
      <planeGeometry args={[3.5, 3.5]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL TITLE BEAM — "DESTINATION" text rising from the figure
// ─────────────────────────────────────────────────────────────────────────────

function DestinationBeam() {
  const matRef = useRef();

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float centre = 1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5));
        float top    = 1.0 - smoothstep(0.0, 1.0, vUv.y);
        float wave   = 0.6 + 0.4 * sin(vUv.y * 12.0 - uTime * 2.5);
        float alpha  = centre * top * wave * 0.28;
        gl_FragColor = vec4(1.0, 0.82, 0.25, alpha);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  }), []);

  matRef.current = material;
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh material={material} position={[0, 3.5, 0]}>
      <planeGeometry args={[0.12, 5.0, 1, 16]} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GREEK GOD CLONE — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function GreekGodClone() {
  const groupRef = useRef();

  const { goalMetrics, ambitionPath } = use3DStore((s) => ({
    goalMetrics:  s.cloneB.metrics,
    ambitionPath: s.ambitionPath,
  }));

  const progressPercent = use3DStore((s) => s.getProgressPercent());

  // Vertical bob animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = BOB_AMPLITUDE * Math.sin(clock.elapsedTime * BOB_FREQUENCY);
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, DESTINATION_Z]}
      name="greek-god-clone"
    >
      {/* ── The goal body — goal metrics, instant snap, full aura ── */}
      <HumanoidClone
        cloneKey="B"
        position={[0, 0, 0]}
        snapWeights={true}
        renderMode="normal"
        visible={true}
        showAura={true}
        opacity={1}
      />

      {/* ── Ground halo ── */}
      <GroundHalo />

      {/* ── Vertical destination beam ── */}
      <DestinationBeam />

      {/* ── Floating stats + countdown ── */}
      <GoalStatsBadge
        metrics={goalMetrics}
        deadline={ambitionPath?.deadline}
        progressPercent={progressPercent}
      />
    </group>
  );
}
