import React, { useRef, useEffect, useMemo, Suspense, memo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import HumanModel from "./HumanModel";
import Organs from "./Organs";
import Loader from "./Loader";
import { createSkinMaterial } from "./materials";

// ── SYSTEM SCENE ──
// FIX 1: Removed <Environment preset="studio" /> — drei Environment uses
// PMREMGenerator internally (three.js 0.184 CubeCamera breaking change) and
// was also trying to load a local /assets/hdri/studio-softbox.hdr that
// doesn't exist on GitHub Pages (404). Scene lighting is provided by the
// directional + point + ambient rig below which is sufficient.
const SystemScene = memo(function SystemScene({
  anatomyDepth,
  morphs,
  autoRotate,
  currentView,
  onSelectPart,
  setAutoRotate,
  setCurrentView,
  hairPreset,
  comparisonMode,
  splitPos,
  heatmapMode,
  stressLevel,
  wardrobe
}) {
  const curRef    = useRef();
  const goalRef   = useRef();
  const organsRef = useRef();
  const { gl }    = useThree();

  const internalRot = useRef(0);
  const isDrag      = useRef(false);

  const splitPlaneCur  = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  const splitPlaneGoal = useMemo(() => new THREE.Plane(new THREE.Vector3( 1, 0, 0), 0), []);

  const ghostMat = useMemo(() => new THREE.MeshPhongMaterial({
    color:             0x22d3ee,
    emissive:          0x003344,
    emissiveIntensity: 0.3,
    opacity:           0.25,
    transparent:       true,
    depthWrite:        false
  }), []);

  useEffect(() => {
    if (!curRef.current || !goalRef.current) return;

    if (comparisonMode === 'ghost') {
      goalRef.current.traverse(m => { if (m.isMesh) m.material = ghostMat; });
    } else {
      goalRef.current.traverse(m => {
        if (m.isMesh && m.material === ghostMat) {
          m.material = createSkinMaterial('#C68642');
        }
      });
    }

    const clippingCur  = comparisonMode === 'split' ? [splitPlaneCur]  : null;
    const clippingGoal = comparisonMode === 'split' ? [splitPlaneGoal] : null;
    curRef.current.traverse(m  => { if (m.isMesh && m.material) m.material.clippingPlanes = clippingCur; });
    goalRef.current.traverse(m => { if (m.isMesh && m.material) m.material.clippingPlanes = clippingGoal; });
  }, [comparisonMode, ghostMat, splitPlaneCur, splitPlaneGoal]);

  useFrame((state, delta) => {
    // 1. Rotation
    if (autoRotate && !isDrag.current) {
      internalRot.current += delta * 0.4;
    } else if (currentView === "Front") internalRot.current = 0;
    else if (currentView === "Side")    internalRot.current = Math.PI / 2;
    else if (currentView === "Back")    internalRot.current = Math.PI;

    if (curRef.current)    curRef.current.rotation.y    = internalRot.current;
    if (goalRef.current)   goalRef.current.rotation.y   = internalRot.current;
    if (organsRef.current) organsRef.current.rotation.y = internalRot.current;

    // 2. Floating
    const t      = state.clock.elapsedTime;
    const floatY = Math.sin(t) * 0.01;
    if (curRef.current)    curRef.current.position.y    = floatY;
    if (goalRef.current)   goalRef.current.position.y   = floatY;
    if (organsRef.current) organsRef.current.position.y = floatY;

    // 3. Viewport mode
    gl.localClippingEnabled = comparisonMode === 'split';

    if (comparisonMode === 'ghost') {
      if (curRef.current)  curRef.current.position.x  = 0;
      if (goalRef.current) goalRef.current.position.x = 0;
    } else if (comparisonMode === 'split') {
      const xOffset = (splitPos / 100) * 2.4 - 1.2;
      splitPlaneCur.constant  =  xOffset;
      splitPlaneGoal.constant = -xOffset;
      if (curRef.current)  curRef.current.position.x  = 0;
      if (goalRef.current) goalRef.current.position.x = 0;
    } else {
      if (curRef.current)  curRef.current.position.x  = -1.2;
      if (goalRef.current) goalRef.current.position.x =  1.2;
    }

    // 4. Heatmap / Delta emissive pulse
    if (heatmapMode) {
      [curRef, goalRef].forEach(ref => {
        ref.current?.traverse(m => {
          if (m.isMesh && m.material?.emissive) {
            const isFatZone = m.name.toLowerCase().includes('waist') || m.name.toLowerCase().includes('gut');
            m.material.emissive.setHex(isFatZone ? 0xff6600 : 0x00aaff);
            m.material.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.2;
          }
        });
      });
    } else if (comparisonMode === 'delta') {
      curRef.current?.traverse(m => {
        if (m.isMesh && m.material?.emissive) {
          const isGrowth = m.name.toLowerCase().includes('chest') || m.name.toLowerCase().includes('arm') || m.name.toLowerCase().includes('shoulders');
          const isLoss   = m.name.toLowerCase().includes('waist') || m.name.toLowerCase().includes('gut');
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
      [curRef, goalRef].forEach(ref => {
        ref.current?.traverse(m => {
          if (m.isMesh && m.material?.emissive) m.material.emissiveIntensity = 0.35;
        });
      });
    }
  });

  const pointerDown = ()  => { isDrag.current = true;  setAutoRotate(false); setCurrentView("Custom"); };
  const pointerUp   = ()  => { isDrag.current = false; };
  const pointerMove = (e) => { if (isDrag.current) internalRot.current += e.movementX * 0.01; };

  return (
    <group onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerMove={pointerMove} onPointerLeave={pointerUp}>
      {/* Photorealistic Lighting Rig — replaces Environment preset */}
      <directionalLight position={[-3, 4,  3]} intensity={1.8} color="#fff5e8" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[ 4, 2,  2]} intensity={0.6} color="#d6e8ff" />
      <directionalLight position={[ 0, 3, -5]} intensity={0.9} color="#88aaff" />
      <pointLight       position={[ 0, -0.5, 0.5]} intensity={0.4} color="#ffcc88" distance={4} />
      <ambientLight intensity={0.15} color="#1a1a2e" />
      {/* NOTE: <Environment> intentionally removed — see Fix 1 comment above */}

      {/* Dark Mirror Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <MeshReflectorMaterial
          blur={[200, 100]}
          resolution={512}
          mixBlur={0.9}
          mixStrength={0.4}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050810"
          metalness={0.5}
        />
      </mesh>

      <gridHelper args={[10, 40, 0x1d2d44, 0x0a0f1a]} position={[0, -0.038, 0]} />

      {/* YOU NOW */}
      <group position={[-1.2, 0, 0]} ref={curRef}>
        <Suspense fallback={<Loader />}>
          <HumanModel
            type="current"
            morphs={morphs}
            depth={anatomyDepth}
            onSelectPart={onSelectPart}
            hairPreset={hairPreset}
            wardrobe={wardrobe}
            stressLevel={stressLevel}
          />
        </Suspense>
      </group>

      <group position={[-1.2, 0, 0]} ref={organsRef}>
        {anatomyDepth < 30 && <Organs depth={anatomyDepth} />}
      </group>

      {/* YOUR GOAL */}
      <group position={[1.2, 0, 0]} ref={goalRef}>
        <Suspense fallback={<Loader />}>
          <HumanModel
            type="goal"
            morphs={morphs}
            depth={100}
            onSelectPart={() => {}}
            hairPreset={hairPreset}
            wardrobe={wardrobe}
            stressLevel={0}
          />
        </Suspense>
      </group>
    </group>
  );
});

export default SystemScene;
