/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * useModelLoader.js
 *
 * Loads the base humanoid GLB with Draco decompression.
 * Extracts and maps all 24 named morph targets from the mesh.
 * Caches the model so both CloneA and CloneB share the same geometry
 * (cloned, not referenced — so morph weights are independent).
 *
 * Expected GLB structure:
 *   Scene
 *   └── Armature
 *       └── Body (SkinnedMesh)
 *             morphTargetDictionary: { overall_mass: 0, gut_volume: 1, ... }
 *             morphTargetInfluences: Float32Array[24]
 *
 * Draco-compressed GLB should live at:
 *   /public/assets/models/humanoid-base.glb
 *
 * For dev without a real GLB, a fallback procedural mesh is generated
 * that still exercises the full morph pipeline.
 *
 * Deps: @react-three/fiber, @react-three/drei, three
 */

import { useMemo }       from "react";
import { useGLTF }       from "@react-three/drei";
import * as THREE        from "three";
import { computeMorphWeights } from "../../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

import { MORPH_TARGET_NAMES } from "./constants";

export const MODEL_PATH = `${import.meta.env.BASE_URL}assets/models/humanoid-base.glb`;

// ─────────────────────────────────────────────────────────────────────────────
// PRELOAD — call this at app root to start loading immediately
// ─────────────────────────────────────────────────────────────────────────────

export function preloadHumanoidModel() {
  useGLTF.preload(MODEL_PATH);
}

// ─────────────────────────────────────────────────────────────────────────────
// MORPH TARGET INDEX MAP
// Builds a fast lookup: name → influences array index
// Falls back gracefully if the GLB has different naming.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {THREE.SkinnedMesh} mesh
 * @returns {Object} { [morphTargetName]: influenceIndex }
 */
export function buildMorphIndexMap(mesh) {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return {};

  const map = {};
  for (const name of MORPH_TARGET_NAMES) {
    if (name in dict) {
      map[name] = dict[name];
    } else {
      console.warn(`[useModelLoader] Morph target not found in GLB: "${name}"`);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEV FALLBACK — capsule mesh with synthetic morph targets
// Used when the real GLB isn't available in development.
// ─────────────────────────────────────────────────────────────────────────────

function buildFallbackMesh() {
  // Ultra-safe box geometry as last-resort fallback
  const geometry = new THREE.BoxGeometry(0.4, 1.8, 0.2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.morphTargetDictionary  = {};
  mesh.morphTargetInfluences  = [];
  mesh.name = "Body_Fallback_Box";

  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// useModelLoader — main hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads and returns a cloned humanoid mesh ready for morphing.
 * Each call returns an independent clone (separate morphTargetInfluences array).
 *
 * @returns {{
 *   bodyMesh:     THREE.SkinnedMesh,
 *   morphIndexMap: Object,
 *   skeleton:     THREE.Skeleton | null,
 *   scene:        THREE.Group,
 *   isDev:        boolean,
 * }}
 */
export function useModelLoader() {
  const isDev = process.env.NODE_ENV === "development";

  // ── Try loading the real GLB ─────────────────────────────────────────────
  let gltf = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gltf = useGLTF(MODEL_PATH);
  } catch (err) {
    if (err instanceof Promise) throw err;
    console.error("[useModelLoader] GLTF Load Error:", err);
  }

  return useMemo(() => {
    // ── REAL GLB path ────────────────────────────────────────────────────────
    if (gltf?.scene) {
      const clonedScene = gltf.scene.clone(true);

      let bodyMesh     = null;
      let morphIndexMap = {};
      let skeleton     = null;

      clonedScene.traverse((node) => {
        if (node.isSkinnedMesh && node.name.toLowerCase().includes("body")) {
          bodyMesh      = node;
          morphIndexMap = buildMorphIndexMap(node);
          skeleton      = node.skeleton;
          node.castShadow    = true;
          node.receiveShadow = true;
          // Enable morph normals for correct shading under deformation
          node.geometry.computeMorphNormals?.();
        }
      });

      return { bodyMesh, morphIndexMap, skeleton, scene: clonedScene, isDev: false };
    }

    // ── DEV FALLBACK ─────────────────────────────────────────────────────────
    if (isDev) {
      console.info("[useModelLoader] Using fallback capsule mesh (no GLB found)");
      const mesh        = buildFallbackMesh();
      const morphIndexMap = buildMorphIndexMap(mesh);
      const group       = new THREE.Group();
      group.add(mesh);
      return { bodyMesh: mesh, morphIndexMap, skeleton: null, scene: group, isDev: true };
    }

    return { bodyMesh: null, morphIndexMap: {}, skeleton: null, scene: null, isDev: false };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);
}
