/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * SplitStencilPass.jsx
 *
 * True per-pixel stencil-buffer split for SPLIT view mode.
 *
 * Problem with the naive approach in CloneEngine:
 *   Rendering both clones at [0,0,0] in the same draw call means
 *   they z-fight and bleed through each other. CSS overflow:hidden
 *   can't mask at sub-pixel accuracy for a 3D scene.
 *
 * Solution — Stencil buffer masking:
 *   Pass 1:  Write stencil=1 for all pixels LEFT  of dividerX.
 *   Pass 2:  Write stencil=2 for all pixels RIGHT of dividerX.
 *   Pass 3:  Render CloneA (YOU NOW)  — only where stencil=1.
 *   Pass 4:  Render CloneB (YOUR GOAL) — only where stencil=2.
 *
 * Implemented with THREE.js built-in stencil material flags.
 * No postprocessing dependency — works on MED + HIGH GPU tiers.
 *
 * Usage:
 *   Replace the naive SPLIT case in CloneEngine with:
 *   <SplitStencilScene dividerX={splitDividerX} />
 *
 * The divider line itself is rendered as a separate fullscreen pass
 * at the stencil boundary with a cyan glow strip.
 */

import React, { useRef, useEffect, useMemo } from "react";
import { useThree, useFrame }                 from "@react-three/fiber";
import * as THREE                             from "three";

import HumanoidClone from "./HumanoidClone";

// ─────────────────────────────────────────────────────────────────────────────
// STENCIL PLANE MESH
// A fullscreen NDC-space quad that writes to the stencil buffer.
// position is set by adjusting scale.x so it covers exactly half the screen.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a stencil-write material.
 * @param {number} stencilRef - value to write into stencil buffer (1 or 2)
 */
function createStencilWriteMaterial(stencilRef) {
  return new THREE.MeshBasicMaterial({
    colorWrite:           false,   // don't touch color buffer
    depthWrite:           false,   // don't touch depth buffer
    depthTest:            false,
    stencilWrite:         true,
    stencilFunc:          THREE.AlwaysStencilFunc,
    stencilRef,
    stencilZPass:         THREE.ReplaceStencilOp,
    side:                 THREE.FrontSide,
  });
}

/**
 * Creates a stencil-read material that only renders where stencil = ref.
 * This gets applied as an additional material pass on the clone mesh.
 * @param {number} stencilRef - value to test against (1 = left, 2 = right)
 * @param {THREE.Material} baseMaterial - the visible material to use
 */
export function applyStencilRead(baseMaterial, stencilRef) {
  baseMaterial.stencilWrite = false;
  baseMaterial.stencilFunc  = THREE.EqualStencilFunc;
  baseMaterial.stencilRef   = stencilRef;
  baseMaterial.stencilFail  = THREE.KeepStencilOp;
  baseMaterial.stencilZFail = THREE.KeepStencilOp;
  baseMaterial.stencilZPass = THREE.KeepStencilOp;
  return baseMaterial;
}

// ─────────────────────────────────────────────────────────────────────────────
// STENCIL MASK PLANES
// Two fullscreen NDC quads — one for each half of the screen.
// They run at renderOrder -1 so they always render before the models.
// ─────────────────────────────────────────────────────────────────────────────

function StencilMaskPlanes({ dividerX }) {
  const leftRef  = useRef();
  const rightRef = useRef();
  const { size } = useThree();

  const leftMat  = useMemo(() => createStencilWriteMaterial(1), []);
  const rightMat = useMemo(() => createStencilWriteMaterial(2), []);

  // Update plane positions and scales whenever dividerX or viewport size changes
  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;

    // dividerX is 0–1 fraction of viewport width
    // We work in NDC space: -1 to +1 on both axes
    const splitNDC = dividerX * 2 - 1; // e.g. 0.5 → 0.0 (center)

    // Left plane: covers [-1, splitNDC] on X
    const leftWidth  = splitNDC + 1;         // width in NDC units (0–2)
    const leftCenterX = -1 + leftWidth / 2;  // center X in NDC

    leftRef.current.scale.x   = leftWidth;
    leftRef.current.position.x = leftCenterX;

    // Right plane: covers [splitNDC, +1] on X
    const rightWidth   = 1 - splitNDC;
    const rightCenterX = splitNDC + rightWidth / 2;

    rightRef.current.scale.x    = rightWidth;
    rightRef.current.position.x = rightCenterX;

  }, [dividerX, size]);

  // Planes sit at z=0 in NDC — use an orthographic pass via camera-space trick
  // Actually: position in world space very close to camera (near plane)
  // using renderOrder and depthTest:false so they always draw first
  return (
    <>
      {/* Left half stencil — stencil value 1 */}
      <mesh
        ref={leftRef}
        renderOrder={-2}
        position={[0, 0, -0.5]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 2]} />
        <primitive object={leftMat} attach="material" />
      </mesh>

      {/* Right half stencil — stencil value 2 */}
      <mesh
        ref={rightRef}
        renderOrder={-2}
        position={[0, 0, -0.5]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 2]} />
        <primitive object={rightMat} attach="material" />
      </mesh>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLIT DIVIDER LINE — rendered as a thin world-space plane
// ─────────────────────────────────────────────────────────────────────────────

function SplitDividerLine({ dividerX }) {
  const lineRef = useRef();
  const { camera, size } = useThree();

  // Convert NDC dividerX → world space X at model depth (z ≈ 0)
  useFrame(() => {
    if (!lineRef.current) return;

    // Unproject NDC point to world at z=0 plane
    const ndcX   = dividerX * 2 - 1;
    const ndc    = new THREE.Vector3(ndcX, 0, 0);
    ndc.unproject(camera);

    // Place divider line at that world X, spanning full model height
    lineRef.current.position.x = ndc.x;
  });

  return (
    <group ref={lineRef} renderOrder={10}>
      {/* Main line */}
      <mesh position={[0, 1.0, 0.08]}>
        <planeGeometry args={[0.007, 2.4]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>

      {/* Glow halo — wider, very translucent */}
      <mesh position={[0, 1.0, 0.07]}>
        <planeGeometry args={[0.06, 2.4]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Label strip — "CURRENT" left, "GOAL" right */}
      <group position={[0, 2.1, 0.09]}>
        <mesh position={[-0.25, 0, 0]}>
          <planeGeometry args={[0.45, 0.06]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STENCIL-MASKED CLONE WRAPPER
// Renders a HumanoidClone with stencil read configured on all its materials.
// Uses onBeforeRender callback to patch material at render time.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walks a THREE.Object3D and applies stencil read settings to all materials.
 * @param {THREE.Object3D} object
 * @param {number} stencilRef
 */
function applyStencilToObject(object, stencilRef) {
  object.traverse((node) => {
    if (node.isMesh && node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => applyStencilRead(mat, stencilRef));
    }
  });
}

function StencilMaskedClone({ cloneKey, stencilRef, snapWeights, showAura }) {
  const groupRef = useRef();

  // Apply stencil read to all child materials after mount
  useEffect(() => {
    if (groupRef.current) {
      applyStencilToObject(groupRef.current, stencilRef);
    }
  }, [stencilRef]);

  return (
    <group ref={groupRef} renderOrder={stencilRef}>
      <HumanoidClone
        cloneKey={cloneKey}
        position={[0, 0, 0]}
        renderMode="normal"
        snapWeights={snapWeights}
        visible={true}
        showAura={showAura}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLIT STENCIL SCENE — exported, replaces naive SPLIT case in CloneEngine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ dividerX: number }} props
 *   dividerX — 0–1 fraction from the left edge (0.5 = center)
 */
export default function SplitStencilScene({ dividerX }) {
  const { gl } = useThree();

  // Ensure stencil buffer is enabled on the renderer
  useEffect(() => {
    gl.state.buffers.stencil.setTest(true);
  }, [gl]);

  return (
    <>
      {/* Step 1: Write stencil masks for left + right halves */}
      <StencilMaskPlanes dividerX={dividerX} />

      {/* Step 2: Render YOU NOW — only where stencil = 1 (left) */}
      <StencilMaskedClone
        cloneKey="A"
        stencilRef={1}
        snapWeights={false}
        showAura={false}
      />

      {/* Step 3: Render YOUR GOAL — only where stencil = 2 (right) */}
      <StencilMaskedClone
        cloneKey="B"
        stencilRef={2}
        snapWeights={true}
        showAura={true}
      />

      {/* Step 4: Divider line on top of everything */}
      <SplitDividerLine dividerX={dividerX} />
    </>
  );
}
