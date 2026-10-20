import { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import use3DStore, { CAMERA_PRESETS } from '../../store/use3DStore';
import useStore from '../../store/useStore';
import { BODY_PART_MAP } from './bodyRegions';
import { fitHumanFrame, fitRegionFrame, nearestOrbitAngle } from './cameraFraming';
import { useAnatomyEligibility } from './useAnatomyEligibility';

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
  const avatarContext = use3DStore(s => s.avatarWorkspace.avatarContext);
  const regionFrames = use3DStore(s => s.modelRegionFrames[avatarContext === 'goal' ? 'B' : 'A']);
  const wardrobe = use3DStore(s => s.wardrobeState);
  const redacted = use3DStore(s => s.captureRedacted);
  const diagnostics = use3DStore(s => s.modelDiagnostics);
  const privateAllowed = useAnatomyEligibility(diagnostics).allowed && wardrobe === 'ANATOMICAL' && !redacted;
  const profileReducedMotion = useStore((s) => s.reducedMotion);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const reducedMotion = Boolean(profileReducedMotion || systemReducedMotion);
  const animation = useRef(null);
  const offset = useRef(new THREE.Vector3());
  const initialFrame = useRef(true);
  const manualStart = useRef(false);
  const previousZoom = useRef(cameraZoom);
  const baseDistance = useRef(4);

  const reportCamera = useCallback(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    // Camera-only diagnostics; never include source body measurements.
    const fields = { cameraDistance: camera.position.distanceTo(controls.target).toFixed(4),
      cameraTarget: controls.target.toArray().map(v => v.toFixed(4)).join(','),
      cameraPosition: camera.position.toArray().map(v => v.toFixed(4)).join(','),
      cameraFocus: use3DStore.getState().focusedBodyPart || 'body',
      cameraRegionSource: use3DStore.getState().modelRegionFrames[use3DStore.getState().avatarWorkspace.avatarContext === 'goal' ? 'B' : 'A'][use3DStore.getState().focusedBodyPart]?.source || 'reference' };
    for (const [key, value] of Object.entries(fields)) if (gl.domElement.dataset[key] !== value) gl.domElement.setAttribute(`data-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, value);
  }, [camera, gl]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReducedMotion(media?.matches ?? false);
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    if (manualStart.current && cameraPreset === 'CUSTOM') { manualStart.current = false; return; }
    const preset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.FRONT;
    const candidate = viewMode === 'SOLO' ? BODY_PART_MAP[focusedBodyPart] : null;
    const region = candidate?.private && !privateAllowed ? null : candidate;
    const hint = region && cameraPreset === 'CUSTOM' ? region.cameraHint : preset;
    const frame = fitHumanFrame({ frame: modelFrame, width: size.width, height: size.height, fov: camera.fov, viewMode, azimuth: hint.azimuth || 0, elevation: hint.elevation || 0 });
    const target = new THREE.Vector3(...frame.center);
    const zoom = use3DStore.getState().cameraZoom;
    let distance = frame.distance * zoom;
    if (region) {
      const local = fitRegionFrame({ region, frame: modelFrame, evaluated: regionFrames[focusedBodyPart], width: size.width, height: size.height, fov: camera.fov });
      target.set(...local.center);
      distance = local.distance * zoom;
    }
    baseDistance.current = distance / zoom;
    previousZoom.current = zoom;
    controls.minDistance = Math.max(0.12, baseDistance.current * 0.35);
    controls.maxDistance = Math.min(40, baseDistance.current * 3.4);
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
  }, [camera, cameraPreset, cameraRevision, focusedBodyPart, modelFrame, regionFrames, privateAllowed, reducedMotion, size.height, size.width, viewMode]);

  // Zoom around the user's current target and direction, including after a pan.
  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls || previousZoom.current === cameraZoom) return;
    const start = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const pending = animation.current;
    const distance = THREE.MathUtils.clamp((pending?.target.radius ?? start.radius) * cameraZoom / previousZoom.current, controls.minDistance, controls.maxDistance);
    previousZoom.current = cameraZoom;
    animation.current = { current: start, target: new THREE.Spherical(distance, pending?.target.phi ?? start.phi, pending?.target.theta ?? start.theta),
      center: controls.target.clone(), destination: pending?.destination.clone() ?? controls.target.clone(), immediate: reducedMotion };
  }, [camera, cameraZoom, reducedMotion]);

  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    const onStart = () => {
      animation.current = null;
      manualStart.current = use3DStore.getState().cameraPreset !== 'CUSTOM';
      use3DStore.setState({ cameraPreset: 'CUSTOM', autoRotate: false });
    };
    const onEnd = () => {
      const zoom = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) / baseDistance.current, 0.35, 3.4);
      previousZoom.current = zoom;
      use3DStore.getState().setCameraZoom(zoom);
      reportCamera();
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    return () => { controls.removeEventListener('start', onStart); controls.removeEventListener('end', onEnd); };
  }, [camera, gl, reportCamera]);

  // Double taps belong to this canvas and must be taps, not drag/pinch starts.
  useEffect(() => {
    const canvas = gl.domElement;
    let start = null;
    let last = null;
    let pointers = new Set();
    const down = (event) => { pointers.add(event.pointerId); if (pointers.size > 1) { start = null; last = null; return; } start = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, time: event.timeStamp } : null; };
    const up = (event) => {
      pointers.delete(event.pointerId);
      if (!start || !event.isPrimary || event.timeStamp - start.time > 280 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) { start = null; return; }
      const tap = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      if (last && tap.time - last.time < 320 && Math.hypot(tap.x - last.x, tap.y - last.y) < 24) {
        use3DStore.getState().fitCameraToBody(); last = null;
      } else last = tap;
      start = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    const cancel = () => { pointers.clear(); start = null; last = null; };
    canvas.addEventListener('pointercancel', cancel);
    return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); };
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
    reportCamera();
  });

  return <OrbitControls ref={orbitRef} rotateSpeed={0.7} zoomSpeed={0.8} minDistance={0.12} maxDistance={40}
    minPolarAngle={THREE.MathUtils.degToRad(5)} maxPolarAngle={THREE.MathUtils.degToRad(115)}
    enablePan panSpeed={0.65} screenSpacePanning enableDamping={!reducedMotion} dampingFactor={0.08}
    mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    target={[0, 0.98, 0]} autoRotate={false} makeDefault />;
}
