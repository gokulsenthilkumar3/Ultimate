import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { NeutralToneMapping, PCFShadowMap, SRGBColorSpace, MeshStandardMaterial } from 'three';
import { createParametricIdentity, readMorphCapabilities } from '../morphEngine/parametricIdentity';
import { createCanonicalCover } from '../morphEngine/canonicalCover';
import { updatePhysicalSkinMaterial } from '../body3d/physicalSkinMaterial';
import { createParametricSkinMaterial } from '../body3d/parametricSkinMaterial';
import { createParametricAttachments } from '../morphEngine/parametricAttachments';
import { createParametricEyes } from '../morphEngine/parametricEyes';

function IdentityModel({ candidate, context, appearanceMode, onRuntime, onEvidence, onFitting, view, benchmark, onBenchmark }) {
  const { gl, invalidate, camera } = useThree();
  const controls = useRef(null), samples = useRef({ token: null, started: 0, previous: 0, values: [] });
  const [instance, setInstance] = useState(null);
  useEffect(() => {
    const identity = createParametricIdentity(candidate.scene);
    let skin, clay, cover, attachments, eyes, created;
    try {
      const body = identity.scene.getObjectByName('Body');
      if (!body?.isSkinnedMesh) throw new Error('The parametric body has no supported skin binding.');
      skin = createParametricSkinMaterial(candidate.skin.textures, candidate.skin.manifest, '#bd8b6a', { tissueManifest: candidate.skin.tissueManifest });
      clay = new MeshStandardMaterial({ color: '#b2aaa1', roughness: 0.8 });
      cover = createCanonicalCover(body);
      attachments = createParametricAttachments(body, candidate.attachments, { asyncFitting: true, onFitState: state => {
        gl.domElement.dataset.garmentFit = state.status;
        gl.domElement.dataset.garmentFitRevision = String(state.revision);
        if (state.status === 'ready') {
          gl.domElement.dataset.garmentSolveMs = state.result.solveMs.toFixed(3);
          gl.domElement.dataset.garmentGapMm = (state.result.minimumGapMetres * 1000).toFixed(4);
        }
        onFitting(state); invalidate();
      } });
      eyes = createParametricEyes(identity.scene.getObjectByName('Eyes'), candidate.eyes);
      identity.scene.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; node.frustumCulled = false; } });
      for (const mesh of eyes.meshes) { mesh.castShadow = false; mesh.receiveShadow = mesh.userData.eyeLayer !== 'cornea'; }
      body.material = skin;
      created = { ...identity, body, skin, clay, cover, attachments, eyes };
    } catch (error) { eyes?.dispose(); attachments?.dispose(); cover?.dispose(); skin?.dispose(); clay?.dispose(); identity.dispose(); throw error; }
    setInstance(created);
    onRuntime(created);
    const canvas = gl.domElement;
    canvas.dataset.parametricReady = 'true';
    return () => {
      for (const key of ['parametricReady', 'skinMaps', 'attachmentCount', 'eyeMeshes', 'skinScattering', 'garmentFit', 'garmentFitRevision', 'garmentSolveMs', 'garmentGapMm']) delete canvas.dataset[key];
      onRuntime(null);
      created.eyes.dispose(); created.attachments.dispose(); created.cover.dispose(); created.skin.dispose(); created.clay.dispose(); created.dispose();
    };
  }, [candidate, onRuntime, onFitting, gl, invalidate]);
  useEffect(() => {
    if (!instance) return;
    const result = instance.setWeights(context.parameters);
    instance.cover.update();
    instance.attachments.update();
    instance.body.material = appearanceMode === 'clay' ? instance.clay : instance.skin;
    updatePhysicalSkinMaterial(instance.skin, { skinColorHex: context.appearance.skinColor || '#bd8b6a' });
    instance.eyes.update({ eyeColor: context.appearance.eyeColor || '#523b2d' });
    const capabilities = readMorphCapabilities(gl);
    const skinMaps = Object.keys(candidate.skin.textures).length;
    const garmentContact = instance.attachments.meshes.find(mesh => mesh.userData.authoredAttachment === 'tee')?.userData.contactFit;
    const evidence = { ...instance.statistics, ...capabilities, sliderEvaluationMs: result.durationMs, skinMaps, attachments: instance.attachments.statistics, garmentContact, eyes: instance.eyes.statistics };
    onEvidence(evidence);
    gl.domElement.dataset.identityMorphLayers = String(instance.statistics.largestViewingMorphBank);
    gl.domElement.dataset.identityEvaluationMs = result.durationMs.toFixed(3);
    gl.domElement.dataset.skinMaps = String(skinMaps);
    gl.domElement.dataset.eyeMeshes = String(instance.eyes.meshes.length);
    gl.domElement.dataset.skinScattering = instance.skin.userData.skinScattering.model;
    gl.domElement.dataset.attachmentCount = String(instance.attachments.meshes.length);
    invalidate();
  }, [instance, candidate, context, appearanceMode, gl, invalidate, onEvidence]);
  useEffect(() => {
    const target = view === 'face' ? [0, 1.5, 0] : [0, 0.83, 0];
    camera.position.set(...(view === 'back' ? [0, 0.9, -3.3] : view === 'side' ? [3.3, 0.9, 0] : view === 'face' ? [0, 1.5, 0.8] : [0, 0.9, 3.3]));
    controls.current?.target.set(...target);
    controls.current?.update(); invalidate();
  }, [view, camera, invalidate]);
  useEffect(() => { if (benchmark) invalidate(); }, [benchmark, invalidate]);
  useFrame(() => {
    if (!benchmark) return;
    const now = performance.now();
    if (samples.current.token !== benchmark) samples.current = { token: benchmark, started: now, previous: now, values: [] };
    const sample = samples.current;
    if (now > sample.previous) sample.values.push(now - sample.previous);
    sample.previous = now;
    if (now - sample.started < 3000) { invalidate(); return; }
    const sorted = [...sample.values].sort((a, b) => a - b);
    onBenchmark({ frames: sorted.length, durationMs: now - sample.started, p95FrameIntervalMs: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)], drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles });
    sample.token = null;
  });
  return <>{instance && <primitive object={instance.scene} dispose={null} />}<OrbitControls ref={controls} target={[0, 0.83, 0]} enableDamping={false} minDistance={0.45} maxDistance={6} maxPolarAngle={Math.PI * 0.9} /></>;
}

export default function ParametricAvatarViewport(props) {
  const lost = useRef(false);
  return <div className="parametric-studio__canvas">
    <Canvas shadows={{ type: PCFShadowMap }} frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0.9, 3.3], fov: 35, near: 0.05, far: 20 }}
      gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = SRGBColorSpace;
        gl.setClearColor('#e8e7e3', 1);
        const canvas = gl.domElement;
        canvas.setAttribute('aria-label', 'Parametric human preview');
        canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost.current = true; props.onContextError('The 3D context was lost. Reopen the editor to retry.'); });
        canvas.addEventListener('webglcontextrestored', () => { if (lost.current) props.onContextError('The 3D context was restored. Reopen the editor before exporting.'); });
      }}>
      <color attach="background" args={['#e8e7e3']} />
      <hemisphereLight args={['#f4f5f7', '#777b82', 1.1]} />
      <directionalLight position={[2.5, 3, 3]} intensity={2.7} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-1.5} shadow-camera-right={1.5} shadow-camera-top={2} shadow-camera-bottom={-1} shadow-normalBias={0.015} />
      <directionalLight position={[-2, 1.8, -2]} intensity={1.1} color="#e7ecf5" />
      <Suspense fallback={null}><IdentityModel {...props} /></Suspense>
    </Canvas>
  </div>;
}
