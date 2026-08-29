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
import use3DStore from '../../store/use3DStore';

import { GEOMETRY_MORPH_TARGETS } from './morphMath';
import { DEFAULT_ASSETS, resolveModelAsset } from './modelAssetRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const MODEL_PATH = DEFAULT_ASSETS.production;
export const MODEL_PATH_LITE = DEFAULT_ASSETS.lite;

// ─────────────────────────────────────────────────────────────────────────────
// PRELOAD — call this at app root to start loading immediately
// ─────────────────────────────────────────────────────────────────────────────

export function preloadHumanoidModel() {
  useGLTF.preload(MODEL_PATH, 'https://www.gstatic.com/draco/v1/decoders/');
  useGLTF.preload(MODEL_PATH_LITE, 'https://www.gstatic.com/draco/v1/decoders/');
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
  for (const name of GEOMETRY_MORPH_TARGETS) {
    if (name in dict) {
      map[name] = dict[name];
    }
  }
  // Also accept any morph target present in the GLB dict (even if not in our named list)
  // This allows partial morph override — GLB morphs + procedural fallback for the rest
  return map;
}

function buildDiagnosticsFromScene(scene, bodyMesh, morphIndexMap, bounds, privateAnatomyMesh = null) {
  const meshNames = [];
  const meshCount = { mesh: 0, skinnedMesh: 0 };
  scene?.traverse?.((node) => {
    if (node.isMesh || node.isSkinnedMesh) {
      meshNames.push(node.name || '(unnamed)');
      if (node.isSkinnedMesh) meshCount.skinnedMesh += 1;
      else meshCount.mesh += 1;
    }
  });

  const missingMorphTargets = GEOMETRY_MORPH_TARGETS.filter((name) => !(name in morphIndexMap));
  const vertexCount = bodyMesh?.geometry?.attributes?.position?.count ?? 0;
  // Only mark suspicious if the mesh itself is fundamentally broken —
  // morph target count is NOT a suspicious indicator (GLBs may use different naming).
  const isSuspicious =
    !bodyMesh ||
    vertexCount < 800 ||
    meshNames.length > 48 ||
    (bounds?.height ? bounds.height < 1.10 || bounds.height > 2.65 : true) ||
    (bounds?.radius ? bounds.radius < 0.10 || bounds.radius > 1.25 : true);

  return {
    hasScene: !!scene,
    hasBodyMesh: !!bodyMesh,
    hasPrivateAnatomy: !!privateAnatomyMesh,
    privateAnatomyVertexCount: privateAnatomyMesh?.geometry?.attributes?.position?.count ?? 0,
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
 *   morphMeshes:  Array<{ mesh: THREE.Mesh | THREE.SkinnedMesh, morphIndexMap: Object, sensitive: boolean }>,
 *   privateAnatomyMesh: THREE.Mesh | THREE.SkinnedMesh | null,
 *   morphIndexMap: Object,
 *   skeleton:     THREE.Skeleton | null,
 *   scene:        THREE.Group,
 *   bounds:       { center: THREE.Vector3, size: THREE.Vector3, height: number, radius: number },
 *   diagnostics:  { health: string, ... },
 *   isDev:        boolean,
 * }}
 */
export function useModelLoader(modelPreference = {}) {
  const gpuTier = use3DStore((state) => state.gpuTier);
  const { avatarAsset, biologicalSex, modelPreset } = modelPreference;
  const modelAsset = useMemo(
    () => resolveModelAsset({ avatarAsset, biologicalSex, modelPreset }, gpuTier),
    [avatarAsset, biologicalSex, gpuTier, modelPreset],
  );
  const modelPath = modelAsset.path;
  // useGLTF must be called unconditionally (Rules of Hooks).
  // Suspense promises must be re-thrown so React Suspense can catch them.
  // Network / parse errors are caught and we fall through to the dev fallback.
  let gltf = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gltf = useGLTF(modelPath, 'https://www.gstatic.com/draco/v1/decoders/');
  } catch (err) {
    if (err && typeof err.then === 'function') throw err; // re-throw Suspense promises
    if (import.meta.env.DEV) {
      console.warn('[useModelLoader] GLB load failed, using fallback mesh:', err?.message ?? err);
    }
  }

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
          morphMeshes: [{ mesh, morphIndexMap: {}, sensitive: false }],
          privateAnatomyMesh: null,
          featureMeshes: [],
          skinVariantMaterials: {},
          skeleton: null,
          scene: group,
          bounds,
          diagnostics: { ...buildDiagnosticsFromScene(group, mesh, {}, bounds), modelAsset },
          isDev: true,
        };
      }

    try {
      // Clone the scene so each HumanoidClone gets its own morph influence array.
      // SkeletonUtils.clone also correctly rebinds bone references for SkinnedMeshes.
      const clonedScene = SkeletonUtils.clone(gltf.scene);
      const skinVariantMaterials = Object.fromEntries(
        Object.entries(gltf.materials || {}).filter(([name]) => name.startsWith('SkinVariant_')),
      );

      let bodyMesh     = null;
      let morphIndexMap = {};
      const morphMeshes = [];
      let privateAnatomyMesh = null;
      const featureMeshes = [];
      let skeleton     = null;
      let bounds = null;

      clonedScene.traverse((node) => {
        if (!(node.isMesh || node.isSkinnedMesh)) return;

        const lowerName = String(node.name || '').toLowerCase();
        const isSensitive = lowerName.includes('privateanatomy') || node.userData?.sensitive === true;
        if (lowerName.includes('growthtrackeyes') || lowerName.includes('growthtrackhair')) {
          featureMeshes.push({
            mesh: node,
            feature: lowerName.includes('eyes') ? 'eyes' : 'hair',
          });
        }
        const nodeMorphIndexMap = buildMorphIndexMap(node);
        if (Object.keys(nodeMorphIndexMap).length > 0) {
          morphMeshes.push({ mesh: node, morphIndexMap: nodeMorphIndexMap, sensitive: isSensitive });
        }

        node.castShadow = true;
        node.receiveShadow = true;
        if (node.geometry?.morphAttributes?.position) {
          node.geometry.computeMorphNormals?.();
        }

        if (isSensitive) {
          privateAnatomyMesh = node;
          node.visible = false;
          return;
        }

        // Accept: nodes explicitly named body, OR the first SkinnedMesh with significant vertex count,
        // OR the largest Mesh by vertex count as a last resort.
        const isBodyNamed = lowerName.includes('body') || lowerName === 'mesh' || lowerName === 'human' || lowerName === 'character';
        const vertCount = node.geometry?.attributes?.position?.count ?? 0;
        const isLargeEnough = vertCount > 2000;

        if (!bodyMesh && (isBodyNamed || (node.isSkinnedMesh && isLargeEnough))) {
          bodyMesh      = node;
          morphIndexMap = nodeMorphIndexMap;
          skeleton      = node.skeleton ?? null;
          if (import.meta.env.DEV) {
            console.log(`[useModelLoader] Body mesh found: "${node.name}" (${vertCount} verts, ${Object.keys(nodeMorphIndexMap).length} morphs mapped)`);
          }
        }
      });

      // Second pass: if still no body mesh found, take the largest skinned mesh
      if (!bodyMesh) {
        let largestVerts = 0;
        clonedScene.traverse((node) => {
          if (!(node.isMesh || node.isSkinnedMesh)) return;
          const lowerName = String(node.name || '').toLowerCase();
          if (lowerName.includes('privateanatomy')) return;
          const vertCount = node.geometry?.attributes?.position?.count ?? 0;
          if (vertCount > largestVerts) {
            largestVerts = vertCount;
            bodyMesh = node;
            morphIndexMap = buildMorphIndexMap(node);
            skeleton = node.skeleton ?? null;
          }
        });
        if (bodyMesh && import.meta.env.DEV) {
          console.log(`[useModelLoader] Body mesh selected by largest vertex count: "${bodyMesh.name}" (${largestVerts} verts)`);
        }
      }

      if (bodyMesh) {
        // Normalize the model so the humanoid reads like a full body figure.
        // Many GLBs arrive with an offset origin or inconsistent scale, which
        // makes the human look cropped even when the mesh itself is correct.
        const box = new THREE.Box3().setFromObject(bodyMesh);
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
          morphMeshes,
          privateAnatomyMesh,
          featureMeshes,
          skinVariantMaterials,
          skeleton,
          scene: clonedScene,
          bounds,
          diagnostics: { ...buildDiagnosticsFromScene(clonedScene, bodyMesh, morphIndexMap, bounds, privateAnatomyMesh), modelAsset },
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
      morphMeshes: [{ mesh, morphIndexMap: {}, sensitive: false }],
      privateAnatomyMesh: null,
      featureMeshes: [],
      skinVariantMaterials: {},
      skeleton: null,
      scene: group,
      bounds,
      diagnostics: { ...buildDiagnosticsFromScene(group, mesh, {}, bounds), modelAsset },
      isDev: true,
    };
  }, [gltf, modelAsset]);
}
