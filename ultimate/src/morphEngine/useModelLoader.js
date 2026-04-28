/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * useModelLoader.js
 *
 * Loads the base humanoid GLB with Draco decompression.
 * Extracts and maps all 24 named morph targets from the mesh.
 * Caches the model so both CloneA and CloneB share the same geometry
 * (cloned, not referenced — so morph weights are independent).
 *
 * For dev without a real GLB, a fallback procedural mesh is generated
 * that still exercises the full morph pipeline.
 *
 * Deps: @react-three/fiber, @react-three/drei, three
 */

import { useMemo }       from "react";
import { useGLTF }       from "@react-three/drei";
import * as THREE        from "three";
import { computeMorphWeights } from "../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const MODEL_PATH = "/assets/models/humanoid-base.glb";

/**
 * Canonical ordered list of the 24 morph target names.
 * Must match the names baked into the GLB file exactly.
 * Index = morphTargetInfluences[index].
 */
export const MORPH_TARGET_NAMES = [
  "overall_mass",
  "gut_volume",
  "face_roundness",
  "chest_depth",
  "pec_thickness",
  "deltoid_width",
  "trap_swell",
  "waist_narrow",
  "oblique_def",
  "bicep_peak",
  "tricep_horse",
  "forearm_girth",
  "glute_volume",
  "hip_width",
  "quad_sweep",
  "ham_thickness",
  "calf_diamond",
  "ankle_width",
  "neck_thickness",
  "trap_rise",
  "d_length",
  "d_girth",
  "vascularity_intensity",
  "fitzpatrick_index",     // passed as shader uniform, not a geometry morph
];

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
  // Simple capsule geometry as stand-in for humanoid
  const geometry = new THREE.CapsuleGeometry(0.35, 1.4, 8, 16);
  geometry.morphTargetsRelative = true;

  // Create 24 minimal morph targets (all zeros — just exercises the pipeline)
  const posAttr = geometry.attributes.position;
  const count   = posAttr.count;

  for (const name of MORPH_TARGET_NAMES) {
    const delta = new Float32Array(count * 3);
    // Give a couple targets a visible effect for debugging
    if (name === "overall_mass") {
      for (let i = 0; i < count * 3; i += 3) {
        delta[i]     = posAttr.getX(i / 3) * 0.3;
        delta[i + 1] = posAttr.getY(i / 3) * 0.1;
        delta[i + 2] = posAttr.getZ(i / 3) * 0.3;
      }
    }
    if (name === "waist_narrow") {
      for (let i = 0; i < count * 3; i += 3) {
        const y = posAttr.getY(i / 3);
        if (y > -0.2 && y < 0.3) {
          delta[i]     = posAttr.getX(i / 3) * -0.25;
          delta[i + 2] = posAttr.getZ(i / 3) * -0.25;
        }
      }
    }
    geometry.morphAttributes.position = geometry.morphAttributes.position || [];
    geometry.morphAttributes.position.push(
      new THREE.Float32BufferAttribute(delta, 3)
    );
  }

  // Build dictionary
  const dict = {};
  MORPH_TARGET_NAMES.forEach((name, i) => { dict[name] = i; });

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.8,
    metalness: 0.0,
  });

  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.morphTargetDictionary  = dict;
  mesh.morphTargetInfluences  = new Array(MORPH_TARGET_NAMES.length).fill(0);
  mesh.name = "Body_Fallback";

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
  } catch {
    // GLB not found — will use fallback below
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
