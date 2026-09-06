import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import use3DStore, { CAMERA_PRESETS } from '../../store/use3DStore';
import { BODY_PART_MAP } from './BodyPartInteraction';
import { fitHumanFrame, nearestOrbitAngle } from './cameraFraming';

export default function CameraRig() {
  const orbitRef = useRef();
  const { camera, gl, size } = useThree();
  const cameraPreset = use3DStore((s) => s.cameraPreset);
  const cameraZoom = use3DStore((s) => s.cameraZoom);
  const cameraRevision = use3DStore((s) => s.cameraRevision);
  const viewMode = use3DStore((s) => s.viewMode);
  const autoRotate = use3DStore((s) => s.autoRotate);
  const cameraMotion = use3DStore((s) => s.cinematicState.cameraMotion);
  const focusedBodyPart = use3DStore((s) => s.focusedBodyPart);
  const modelFrame = use3DStore((s) => s.modelFrame);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const animation = useRef(null);
  const offset = useRef(new THREE.Vector3());
  const initialFrame = useRef(true);
  const manualStart = useRef(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media?.matches ?? false);
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    if (manualStart.current && cameraPreset === 'CUSTOM') { manualStart.current = false; return; }
    const preset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.FRONT;
    const region = viewMode === 'SOLO' ? BODY_PART_MAP[focusedBodyPart] : null;
    const hint = region?.cameraHint || preset;
    const frame = fitHumanFrame({ frame: modelFrame, width: size.width, height: size.height, fov: camera.fov, viewMode, azimuth: hint.azimuth || 0, elevation: hint.elevation || 0 });
    const target = new THREE.Vector3(...frame.center);
    let distance = frame.distance * cameraZoom;
    if (region) {
      target.set(region.position[0], region.position[1] * (modelFrame?.height || 1.92) / 1.92, region.position[2]);
      distance = Math.max(0.7, (hint.distance || 1.5) * cameraZoom);
    }
    const start = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const theta = cameraPreset === 'CUSTOM' && !region ? start.theta : THREE.MathUtils.degToRad(hint.azimuth || 0);
    let phi = cameraPreset === 'CUSTOM' && !region ? start.phi : THREE.MathUtils.degToRad(90 - (hint.elevation || 0));
    // Low-angle views must stay above the floor at every viewport size.
    phi = Math.min(phi, Math.acos(THREE.MathUtils.clamp((0.12 - target.y) / distance, -1, 1)));
    animation.current = {
      current: start,
      target: new THREE.Spherical(distance, phi, nearestOrbitAngle(start.theta, theta)),
      center: controls.target.clone(), destination: target,
      immediate: initialFrame.current || reducedMotion,
    };
    initialFrame.current = false;
  }, [camera, cameraPreset, cameraZoom, cameraRevision, focusedBodyPart, modelFrame, reducedMotion, size.height, size.width, viewMode]);

  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    const onStart = () => {
      animation.current = null;
      manualStart.current = use3DStore.getState().cameraPreset !== 'CUSTOM' || Boolean(use3DStore.getState().focusedBodyPart);
      use3DStore.setState({ cameraPreset: 'CUSTOM', autoRotate: false, focusedBodyPart: null });
    };
    controls.addEventListener('start', onStart);
    return () => controls.removeEventListener('start', onStart);
  }, []);

  // Double taps belong to this canvas and must be taps, not drag/pinch starts.
  useEffect(() => {
    const canvas = gl.domElement;
    let start = null;
    let last = null;
    const down = (event) => { start = event.isPrimary ? { x: event.clientX, y: event.clientY, time: event.timeStamp } : null; };
    const up = (event) => {
      if (!start || !event.isPrimary || event.timeStamp - start.time > 280 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) { start = null; return; }
      const tap = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      if (last && tap.time - last.time < 320 && Math.hypot(tap.x - last.x, tap.y - last.y) < 24) {
        use3DStore.getState().fitCameraToBody(); last = null;
      } else last = tap;
      start = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); };
  }, [gl]);

  useFrame(({ clock }, delta) => {
    const controls = orbitRef.current;
    if (!controls) return;
    const transition = animation.current;
    if (transition) {
      const t = transition.immediate ? 1 : 1 - Math.exp(-Math.max(0, delta) * 7);
      const current = transition.current;
      current.radius = THREE.MathUtils.lerp(current.radius, transition.target.radius, t);
      current.phi = THREE.MathUtils.lerp(current.phi, transition.target.phi, t);
      current.theta = THREE.MathUtils.lerp(current.theta, transition.target.theta, t);
      transition.center.lerp(transition.destination, t);
      controls.target.copy(transition.center);
      camera.position.copy(offset.current.setFromSpherical(current).add(transition.center));
      controls.update();
      if (Math.abs(current.radius - transition.target.radius) + Math.abs(current.phi - transition.target.phi) + Math.abs(current.theta - transition.target.theta) + transition.center.distanceTo(transition.destination) < 0.001) animation.current = null;
    } else if (autoRotate && cameraMotion && !reducedMotion && cameraPreset === 'FRONT' && !focusedBodyPart) {
      const targetAngle = Math.sin(clock.elapsedTime * 0.24) * THREE.MathUtils.degToRad(9);
      controls.setAzimuthalAngle(THREE.MathUtils.lerp(controls.getAzimuthalAngle(), targetAngle, 1 - Math.exp(-delta * 1.8)));
    }
  });

  return <OrbitControls ref={orbitRef} rotateSpeed={0.7} zoomSpeed={0.8} minDistance={0.65} maxDistance={40}
    minPolarAngle={THREE.MathUtils.degToRad(5)} maxPolarAngle={THREE.MathUtils.degToRad(115)}
    enablePan={false} enableDamping dampingFactor={0.08} target={[0, 0.98, 0]} autoRotate={false} makeDefault />;
}
