/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * useModelLoader.js
 *
 * Loads the base humanoid GLB with Draco decompression.
 * Extracts and maps all named morph targets from the mesh.
 * Uses SkeletonUtils.clone so each HumanoidClone gets its own
 * independent morphTargetInfluences array.
 *
 * Expected GLB structure:
 *   Scene
 *   └── Armature
 *       └── Body (Mesh or SkinnedMesh)
 *             morphTargetDictionary: { overall_mass: 0, gut_volume: 1, ... }
 *             morphTargetInfluences: Float32Array[N]
 *
 * GLB should live at:
 *   /public/assets/models/humanoid-base.glb
 *
 * Deps: @react-three/fiber, @react-three/drei, three, three-stdlib
 */

import { useMemo }       from 'react';
import { useGLTF }       from '@react-three/drei';
import * as THREE        from 'three';
import { SkeletonUtils } from 'three-stdlib';

import { MORPH_TARGET_NAMES } from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const MODEL_PATH = `${import.meta.env.BASE_URL}assets/models/humanoid-base.glb`;

// ─────────────────────────────────────────────────────────────────────────────
// PRELOAD — call this at app root to start loading immediately
// ─────────────────────────────────────────────────────────────────────────────

export function preloadHumanoidModel() {
  useGLTF.preload(MODEL_PATH, 'https://www.gstatic.com/draco/v1/decoders/');
}

// ─────────────────────────────────────────────────────────────────────────────
// MORPH TARGET INDEX MAP
// Builds a fast lookup: name → influences array index
// Falls back gracefully if the GLB has different naming.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {THREE.Mesh|THREE.SkinnedMesh} mesh
 * @returns {Object} { [morphTargetName]: influenceIndex }
 */
export function buildMorphIndexMap(mesh) {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return {};

  const map = {};
  for (const name of MORPH_TARGET_NAMES) {
    if (name in dict) {
      map[name] = dict[name];
    }
    // Missing targets are handled gracefully by ProceduralHumanoid fallback
  }
  const missing = MORPH_TARGET_NAMES.filter((n) => !(n in map));
  if (missing.length > 0 && import.meta.env.DEV) {
    console.debug(`[useModelLoader] ${missing.length} morph targets not in GLB — using ProceduralHumanoid fallback`);
  }
  return map;
}

function buildDiagnosticsFromScene(scene, bodyMesh, morphIndexMap, bounds) {
  const meshNames = [];
  const meshCount = { mesh: 0, skinnedMesh: 0 };
  scene?.traverse?.((node) => {
    if (node.isMesh || node.isSkinnedMesh) {
      meshNames.push(node.name || '(unnamed)');
      if (node.isSkinnedMesh) meshCount.skinnedMesh += 1;
      else meshCount.mesh += 1;
    }
  });

  const missingMorphTargets = MORPH_TARGET_NAMES.filter((name) => !(name in morphIndexMap));
  const vertexCount = bodyMesh?.geometry?.attributes?.position?.count ?? 0;
  const isSuspicious =
    !bodyMesh ||
    vertexCount < 1200 ||
    meshNames.length > 24 ||
    (bounds?.height ? bounds.height < 1.25 || bounds.height > 2.45 : true) ||
    (bounds?.radius ? bounds.radius < 0.15 || bounds.radius > 1.15 : true);

  return {
    hasScene: !!scene,
    hasBodyMesh: !!bodyMesh,
    bodyMeshName: bodyMesh?.name ?? null,
    meshCount,
    meshNames,
    vertexCount,
    morphTargetCount: Object.keys(morphIndexMap).length,
    missingMorphTargets,
    bounds,
    isSuspicious,
    health: isSuspicious ? 'needs-repair' : 'healthy',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEV FALLBACK — simple box mesh used when the real GLB cannot be loaded
// ─────────────────────────────────────────────────────────────────────────────

function buildFallbackMesh() {
  const geometry = new THREE.CapsuleGeometry(0.2, 1.4, 8, 16);
  const material = new THREE.MeshStandardMaterial({
    color:     0x8b7355,
    roughness: 0.8,
    metalness: 0.0,
  });
  const mesh      = new THREE.Mesh(geometry, material);
  mesh.name       = 'Body_Fallback';
  mesh.position.y = 0.9; // lift so feet are at y=0
  return mesh;
}

function buildFallbackBounds() {
  const size = new THREE.Vector3(0.4, 1.8, 0.4);
  const center = new THREE.Vector3(0, 0.9, 0);
  return {
    center,
    size,
    height: size.y,
    radius: 0.4,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useModelLoader — main hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads and returns a cloned humanoid scene ready for morphing.
 * Each call returns an independent clone (separate morphTargetInfluences).
 *
 * @returns {{
 *   bodyMesh:     THREE.Mesh | THREE.SkinnedMesh,
 *   morphIndexMap: Object,
 *   skeleton:     THREE.Skeleton | null,
 *   scene:        THREE.Group,
 *   bounds:       { center: THREE.Vector3, size: THREE.Vector3, height: number, radius: number },
 *   diagnostics:  { health: string, ... },
 *   isDev:        boolean,
 * }}
 */
export function useModelLoader() {
  // useGLTF must be called unconditionally (Rules of Hooks).
  // Suspense promises must be re-thrown so React Suspense can catch them.
  // Network / parse errors are caught and we fall through to the dev fallback.
  let gltf = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gltf = useGLTF(MODEL_PATH, 'https://www.gstatic.com/draco/v1/decoders/');
  } catch (err) {
    if (err && typeof err.then === 'function') throw err; // re-throw Suspense promises
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[useModelLoader] GLB load failed, using fallback mesh:', err?.message ?? err);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
      if (!gltf || !gltf.scene) {
        // GLB not yet available — return dev fallback
        const mesh  = buildFallbackMesh();
        const group = new THREE.Group();
        group.add(mesh);
        const bounds = buildFallbackBounds();
        return {
          bodyMesh: mesh,
          morphIndexMap: {},
          skeleton: null,
          scene: group,
          bounds,
          diagnostics: buildDiagnosticsFromScene(group, mesh, {}, bounds),
          isDev: true,
        };
      }

    try {
      // Clone the scene so each HumanoidClone gets its own morph influence array.
      // SkeletonUtils.clone also correctly rebinds bone references for SkinnedMeshes.
      const clonedScene = SkeletonUtils.clone(gltf.scene);

      let bodyMesh     = null;
      let morphIndexMap = {};
      let skeleton     = null;
      let bounds = null;

      clonedScene.traverse((node) => {
        // The GLB Body node may be a plain Mesh (morph-only) or a SkinnedMesh.
        // Accept both. The name check is case-insensitive.
        if (!bodyMesh && (node.isMesh || node.isSkinnedMesh) && node.name.toLowerCase().includes('body')) {
          bodyMesh      = node;
          morphIndexMap = buildMorphIndexMap(node);
          skeleton      = node.skeleton ?? null;
          node.castShadow    = true;
          node.receiveShadow = true;
          // Pre-compute morph normals for correct lighting under deformation
          if (node.geometry?.morphAttributes?.position) {
            node.geometry.computeMorphNormals?.();
          }
          if (skeleton?.bones?.length) {
            console.log('[useModelLoader] Found skeleton bones:', skeleton.bones.map(b => b.name));
          } else {
            console.log(`[useModelLoader] Body mesh "${node.name}" loaded (morph-only, no skeleton).`);
          }
        }
      });

      if (!bodyMesh) {
        // GLB loaded OK but no mesh named "body" found — log what IS there
        const meshNames = [];
        clonedScene.traverse(n => { if (n.isMesh || n.isSkinnedMesh) meshNames.push(n.name); });
        console.warn('[useModelLoader] No "body" mesh found. All meshes in GLB:', meshNames);
        // Fall through to dev fallback below
      } else {
        // Normalize the model so the humanoid reads like a full body figure.
        // Many GLBs arrive with an offset origin or inconsistent scale, which
        // makes the human look cropped even when the mesh itself is correct.
        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const height = Math.max(size.y, 0.001);
        const targetHeight = 1.92;
        const scale = targetHeight / height;
        const radius = Math.max(size.x, size.y, size.z) * 0.5 * scale;

        // Lift the model so feet rest on y=0 after centering.
        clonedScene.scale.setScalar(scale);
        clonedScene.position.x = -center.x * scale;
        clonedScene.position.z = -center.z * scale;
        clonedScene.position.y = -(box.min.y * scale);
        bounds = { center, size, height: height * scale, radius };
        return {
          bodyMesh,
          morphIndexMap,
          skeleton,
          scene: clonedScene,
          bounds,
          diagnostics: buildDiagnosticsFromScene(clonedScene, bodyMesh, morphIndexMap, bounds),
          isDev: false,
        };
      }
    } catch (err) {
      console.error('[useModelLoader] Error processing GLB:', err);
    }

    // ── DEV FALLBACK ─────────────────────────────────────────────────────────
    console.info('[useModelLoader] Using fallback capsule mesh.');
    const mesh  = buildFallbackMesh();
    const group = new THREE.Group();
    group.add(mesh);
    const bounds = buildFallbackBounds();
    return {
      bodyMesh: mesh,
      morphIndexMap: {},
      skeleton: null,
      scene: group,
      bounds,
      diagnostics: buildDiagnosticsFromScene(group, mesh, {}, bounds),
      isDev: true,
    };
  }, [gltf]);
}
