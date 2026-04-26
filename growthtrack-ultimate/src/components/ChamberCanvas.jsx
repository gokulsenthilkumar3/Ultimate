/**
 * ChamberCanvas.jsx — The WebGL 3D Scene for Mirror Chamber
 *
 * Separated from HumanoidViewer so the Canvas only re-renders on 3D state changes.
 * Contains: Lighting rig, floor reflector, human models, organs, shaders.
 */

import React, { useRef, useMemo, useEffect, memo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls, Environment, MeshReflectorMaterial, useProgress, Html, Bvh,
  useGLTF,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import use3DStore from '../store/use3DStore';
import { USER, BODY_PARTS } from '../data/userData';

// ── Fallback model
const FALLBACK_GLB = 'https://threejs.org/examples/models/gltf/Soldier.glb';

// ── Skin material
function createSkinMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color || '#C68642'),
    roughness: 0.72,
    metalness: 0.0,
    thickness: 0.8,
    attenuationColor: new THREE.Color('#ff9966'),
    attenuationDistance: 0.3,
    clearcoat: 0.05,
    clearcoatRoughness: 0.9,
    sheen: 0.15,
    sheenColor: new THREE.Color('#ffddcc'),
    envMapIntensity: 0.8,
    transparent: true,
    opacity: 1.0,
    side: THREE.FrontSide,
  });
}

// ── Muscle material (peel shader)
const peelShader = {
  uniforms: {
    uDepth: { value: 1.0 },
    uColor: { value: new THREE.Color(0xf43f5e) },
    uEmissive: { value: new THREE.Color(0x440000) },
    uIntensity: { value: 0.4 },
    uIsOrgan: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uDepth;
    uniform vec3 uColor;
    uniform vec3 uEmissive;
    uniform float uIntensity;
    uniform float uIsOrgan;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 lightDir = normalize(vec3(1.0, 2.0, 3.0));
      float diff = max(dot(vNormal, lightDir), 0.2);
      vec3 finalColor = uColor * diff + (uEmissive * uIntensity);
      float alpha = 1.0;
      if (uIsOrgan > 0.5) {
        alpha = smoothstep(0.7, 0.3, uDepth) * 0.9;
      } else {
        alpha = smoothstep(0.0, 0.5, uDepth);
      }
      if (alpha < 0.05) discard;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

function createPeelMaterial(colorHex, emissiveHex, intensity = 0.4, isOrgan = false) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(peelShader.uniforms),
    vertexShader: peelShader.vertexShader,
    fragmentShader: peelShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
  mat.uniforms.uColor.value.setHex(colorHex);
  mat.uniforms.uEmissive.value.setHex(emissiveHex);
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uIsOrgan.value = isOrgan ? 1.0 : 0.0;
  return mat;
}

// ── Organs
const ORGANS = [
  { color: 0xdd2233, pos: [-0.06, 1.27, 0.07], r: 0.052, key: 'heart' },
  { color: 0xcc7755, pos: [-0.11, 1.21, 0.05], r: 0.072, key: 'chest' },
  { color: 0xcc7755, pos: [0.11, 1.21, 0.05], r: 0.072, key: 'chest' },
  { color: 0xc85020, pos: [0.08, 1.10, 0.05], r: 0.06, key: 'liver' },
  { color: 0xb07070, pos: [0.0, 1.0, 0.05], r: 0.075, key: 'core' },
  { color: 0xaa2222, pos: [-0.09, 0.96, -0.08], r: 0.038, key: 'kidneys' },
  { color: 0xaa2222, pos: [0.09, 0.96, -0.08], r: 0.038, key: 'kidneys' },
  { color: 0x9966ee, pos: [0.0, 1.15, 0.04], r: 0.028, key: 'hormones' },
  { color: 0x4488ff, pos: [0.0, 1.30, 0.04], r: 0.042, key: 'immune' },
];

function Organs({ depth }) {
  const group = useRef();
  const mats = useMemo(() =>
    ORGANS.map((o) => createPeelMaterial(o.color, o.color, 0.7, true)),
    []
  );
  useFrame(() => {
    group.current?.traverse((m) => {
      if (m.isMesh && m.material.uniforms?.uDepth) {
        m.material.uniforms.uDepth.value = depth / 100;
      }
    });
  });
  return (
    <group ref={group}>
      {ORGANS.map((o, i) => (
        <mesh key={i} position={o.pos} material={mats[i]}
          userData={{ ...BODY_PARTS[o.key], key: o.key }}
          onClick={(e) => {
            e.stopPropagation();
            use3DStore.getState().setSelectedPart(o.key);
          }}>
          <sphereGeometry args={[o.r, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}

// ── Human Model
function HumanModel({ type, morphs, depth, wardrobe, stressLevel }) {
  const { scene } = useGLTF(FALLBACK_GLB);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const skinMat = useMemo(() => createSkinMaterial(USER.skinTone), []);
  const muscleMat = useMemo(() => createPeelMaterial(0xf43f5e, 0x440000, 0.4, false), []);

  const ghostMat = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0x22d3ee,
    emissive: 0x003344,
    emissiveIntensity: 0.3,
    opacity: 0.25,
    transparent: true,
    depthWrite: false,
  }), []);

  useEffect(() => {
    clonedScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;

        // Apply morphs if available
        if (node.morphTargetDictionary) {
          const dict = node.morphTargetDictionary;
          const inf = node.morphTargetInfluences;
          if (dict['chest_wide'] !== undefined) inf[dict['chest_wide']] = Math.max(0, morphs.chest - 1);
          if (dict['shoulders_wide'] !== undefined) inf[dict['shoulders_wide']] = Math.max(0, morphs.shoulders - 1);
          if (dict['waist_wide'] !== undefined) inf[dict['waist_wide']] = Math.max(0, morphs.waist - 1);
          if (dict['arms_thick'] !== undefined) inf[dict['arms_thick']] = Math.max(0, morphs.arms - 1);
        }

        // Wardrobe visibility
        const name = node.name.toLowerCase();
        if (node.userData.isApparel || name.includes('clothes') || name.includes('shirt') || name.includes('pants')) {
          node.visible = wardrobe !== 'anatomical' && wardrobe !== 'underwear';
        }
      }
    });
  }, [clonedScene, morphs, wardrobe]);

  // Anatomy depth + ghost mode
  useFrame(() => {
    const viewMode = use3DStore.getState().viewMode;
    const isGoal = type === 'goal';
    const d = depth / 100;

    clonedScene.traverse((node) => {
      if (!node.isMesh) return;

      // Ghost mode: goal model becomes translucent
      if (isGoal && viewMode === 'GHOST') {
        node.material = ghostMat;
        return;
      }

      // Anatomy peel (only on current model)
      if (!isGoal) {
        const skinOpacity = THREE.MathUtils.smoothstep(d, 0.3, 0.7);
        const muscleOpacity = (1 - skinOpacity) * THREE.MathUtils.smoothstep(d, 0.1, 0.4);
        if (d > 0.4) {
          node.material = skinMat;
          node.material.opacity = skinOpacity;
        } else if (d > 0.1) {
          node.material = muscleMat;
          if (muscleMat.uniforms) muscleMat.uniforms.uDepth.value = d;
        } else {
          node.visible = false;
        }
        if (d > 0.1) node.visible = true;
      }
    });
  });

  return (
    <primitive object={clonedScene}
      onClick={(e) => {
        e.stopPropagation();
        const name = e.object.name.toLowerCase();
        const keyMap = { head: 'head', neck: 'neck', chest: 'chest', spine: 'spine', arm: 'arms', leg: 'legs', core: 'core', waist: 'core' };
        const key = Object.keys(keyMap).find((k) => name.includes(k));
        if (key) use3DStore.getState().setSelectedPart(keyMap[key]);
      }}
    />
  );
}

// ── Loading indicator
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="chamber-loader">
        <div className="chamber-loader__ring">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--chamber-glow)" strokeWidth="5"
              strokeDasharray={`${progress * 2.83} 283`}
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
              transform="rotate(-90 50 50)" />
          </svg>
          <span className="chamber-loader__pct">{progress.toFixed(0)}%</span>
        </div>
        <span className="label-caps" style={{ color: 'var(--text-1)', fontSize: '0.65rem', letterSpacing: '0.2em' }}>
          BIO-SCANNING TWIN
        </span>
      </div>
    </Html>
  );
}

// ── Main Scene (memo'd for performance)
const ChamberScene = memo(() => {
  const curRef = useRef();
  const goalRef = useRef();
  const organsRef = useRef();
  const { gl } = useThree();
  const internalRot = useRef(0);

  // Subscribe to store slices
  const anatomyDepth = use3DStore((s) => s.anatomyDepth);
  const morphOverrides = use3DStore((s) => s.morphOverrides);
  const viewMode = use3DStore((s) => s.viewMode);
  const autoRotate = use3DStore((s) => s.autoRotate);
  const cameraPreset = use3DStore((s) => s.cameraPreset);
  const splitPos = use3DStore((s) => s.splitPos);
  const heatmapMode = use3DStore((s) => s.heatmapMode);
  const stressLevel = use3DStore((s) => s.stressLevel);
  const wardrobe = use3DStore((s) => s.wardrobe);
  const timelinePos = use3DStore((s) => s.timelinePos);

  // Dynamic morph calculations based on timeline
  const currentMorphs = useMemo(() => {
    if (viewMode === 'TIMELINE') {
      const { currentMetrics, goalMetrics } = use3DStore.getState();
      const t = timelinePos / 100;
      const lerp = (a, b) => a + (b - a) * t;
      const weight = lerp(currentMetrics.weight, goalMetrics.weight);
      const height = lerp(currentMetrics.height, goalMetrics.height);
      const bodyFat = lerp(currentMetrics.bodyFat, goalMetrics.bodyFat);
      
      return {
        chest: 0.85 + (1.3 - 0.85) * ((weight - 45) / 85),
        shoulders: 0.9 + (1.4 - 0.9) * ((height - 150) / 60),
        waist: 0.7 + (1.5 - 0.7) * ((bodyFat - 5) / 35),
        arms: 0.85 + (1.3 - 0.85) * ((weight - 45) / 85),
      };
    }
    return morphOverrides;
  }, [viewMode, timelinePos, morphOverrides]);

  const goalMorphs = useMemo(() => {
    const { goalMetrics } = use3DStore.getState();
    return {
      chest: 0.85 + (1.3 - 0.85) * ((goalMetrics.weight - 45) / 85),
      shoulders: 0.9 + (1.4 - 0.9) * ((goalMetrics.height - 150) / 60),
      waist: 0.7 + (1.5 - 0.7) * ((goalMetrics.bodyFat - 5) / 35),
      arms: 0.85 + (1.3 - 0.85) * ((goalMetrics.weight - 45) / 85),
    };
  }, []);

  // Clipping planes for split
  const splitPlaneCur = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  const splitPlaneGoal = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  // Animation loop
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // 1. Rotation
    if (autoRotate) {
      internalRot.current += delta * 0.4;
    } else {
      if (cameraPreset === 'FRONT') internalRot.current = 0;
      else if (cameraPreset === 'LEFT') internalRot.current = Math.PI / 2;
      else if (cameraPreset === 'BACK') internalRot.current = Math.PI;
      else if (cameraPreset === 'RIGHT') internalRot.current = -Math.PI / 2;
    }

    [curRef, goalRef, organsRef].forEach((ref) => {
      if (ref.current) ref.current.rotation.y = internalRot.current;
    });

    // 2. Float
    const floatY = Math.sin(t) * 0.01;
    [curRef, goalRef, organsRef].forEach((ref) => {
      if (ref.current) ref.current.position.y = floatY;
    });

    // 3. Layout by view mode
    gl.localClippingEnabled = viewMode === 'SPLIT';

    const showGoal = viewMode !== 'SOLO' && viewMode !== 'DELTA';

    if (goalRef.current) goalRef.current.visible = showGoal;

    if (viewMode === 'GHOST') {
      if (curRef.current) curRef.current.position.x = 0;
      if (goalRef.current) goalRef.current.position.x = 0;
    } else if (viewMode === 'SPLIT') {
      const xOff = (splitPos / 100) * 2.4 - 1.2;
      splitPlaneCur.constant = xOff;
      splitPlaneGoal.constant = -xOff;
      [curRef, goalRef].forEach((ref) => {
        if (ref.current) ref.current.position.x = 0;
      });
      // Apply clipping
      curRef.current?.traverse((m) => { if (m.isMesh) m.material.clippingPlanes = [splitPlaneCur]; });
      goalRef.current?.traverse((m) => { if (m.isMesh) m.material.clippingPlanes = [splitPlaneGoal]; });
    } else if (viewMode === 'DUAL') {
      if (curRef.current) curRef.current.position.x = -1.2;
      if (goalRef.current) goalRef.current.position.x = 1.2;
      [curRef, goalRef].forEach((ref) => {
        ref.current?.traverse((m) => { if (m.isMesh) m.material.clippingPlanes = null; });
      });
    } else {
      if (curRef.current) curRef.current.position.x = 0;
      if (goalRef.current) goalRef.current.position.x = 0;
      [curRef, goalRef].forEach((ref) => {
        ref.current?.traverse((m) => { if (m.isMesh) m.material.clippingPlanes = null; });
      });
    }

    // 4. Heatmap / Delta glow
    if (heatmapMode) {
      [curRef, goalRef].forEach((ref) => {
        ref.current?.traverse((m) => {
          if (m.isMesh && m.material.emissive) {
            const isFat = m.name.toLowerCase().includes('waist') || m.name.toLowerCase().includes('gut');
            m.material.emissive.setHex(isFat ? 0xff6600 : 0x00aaff);
            m.material.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.2;
          }
        });
      });
    } else if (viewMode === 'DELTA') {
      curRef.current?.traverse((m) => {
        if (m.isMesh && m.material.emissive) {
          const name = m.name.toLowerCase();
          const isGrowth = name.includes('chest') || name.includes('arm') || name.includes('shoulder');
          const isLoss = name.includes('waist') || name.includes('gut');
          if (isGrowth) {
            m.material.emissive.setHex(0x22c55e);
            m.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
          } else if (isLoss) {
            m.material.emissive.setHex(0xf97316);
            m.material.emissiveIntensity = 0.6 + Math.cos(t * 3) * 0.3;
          } else {
            m.material.emissiveIntensity = 0.1;
          }
        }
      });
    } else {
      [curRef, goalRef].forEach((ref) => {
        ref.current?.traverse((m) => {
          if (m.isMesh && m.material.emissive) m.material.emissiveIntensity = 0.35;
        });
      });
    }
  });

  const isZoomed = use3DStore((s) => s.isZoomed);

  return (
    <>
      {/* Lighting Rig — "Studio God Light" */}
      <directionalLight position={[-3, 5, 3]} intensity={2.2} color="#fff5e0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.001} />
      <directionalLight position={[4, 2, 2]} intensity={0.7} color="#d6eeff" />
      <directionalLight position={[0, 1, -5]} intensity={1.2} color="#8899ff" />
      <pointLight position={[0, -0.3, 0.5]} intensity={0.5} color="#ffcc88" distance={3} />
      <ambientLight intensity={0.08} color="#0d0d1a" />
      <Environment preset="studio" />

      {/* Reflective Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <MeshReflectorMaterial
          blur={[400, 200]} resolution={512} mixBlur={0.9} mixStrength={0.5}
          roughness={1} depthScale={1.2}
          minDepthThreshold={0.4} maxDepthThreshold={1.4}
          color="#030508" metalness={0.5}
        />
      </mesh>
      <gridHelper args={[10, 40, 0x1d2d44, 0x0a0f1a]} position={[0, -0.038, 0]} />

      {/* YOU NOW */}
      <group position={[-1.2, 0, 0]} ref={curRef}>
        <Suspense fallback={<Loader />}>
          <HumanModel type="current" morphs={currentMorphs} depth={anatomyDepth}
            wardrobe={wardrobe} stressLevel={stressLevel} />
        </Suspense>
      </group>

      {/* Organs */}
      <group position={[-1.2, 0, 0]} ref={organsRef}>
        {anatomyDepth < 30 && <Organs depth={anatomyDepth} />}
      </group>

      {/* YOUR GOAL */}
      <group position={[1.2, 0, 0]} ref={goalRef}>
        <Suspense fallback={<Loader />}>
          <HumanModel type="goal" morphs={goalMorphs} depth={100}
            wardrobe={wardrobe} stressLevel={0} />
        </Suspense>
      </group>

      <OrbitControls enableZoom enablePan={false} minDistance={1.5} maxDistance={7}
        target={isZoomed ? [0, 1.2, 0] : [0, 0.9, 0]} />
    </>
  );
});

// ── Exported Canvas component
export default function ChamberCanvas() {
  const quality = use3DStore((s) => s.quality);
  const isZoomed = use3DStore((s) => s.isZoomed);

  return (
    <Canvas
      shadows={quality !== 'LOW'}
      camera={{
        position: isZoomed ? [0, 1.2, 1.5] : [0, 0.9, 3.8],
        fov: isZoomed ? 25 : 40,
      }}
      gl={{
        antialias: quality === 'HIGH',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Bvh firstHitOnly>
        <color attach="background" args={['#020307']} />
        <fog attach="fog" args={['#020307', 6, 14]} />
        <ChamberScene />
        {quality !== 'LOW' && (
          <EffectComposer disableNormalPass>
            <Bloom 
              luminanceThreshold={0.8} 
              mipmapBlur 
              intensity={0.4} 
            />
            <ChromaticAberration 
              blendFunction={BlendFunction.NORMAL} 
              offset={[0.0005, 0.0005]} 
            />
            <Vignette 
              eskil={false} 
              offset={0.1} 
              darkness={1.1} 
            />
          </EffectComposer>
        )}
      </Bvh>
    </Canvas>
  );
}
