import { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import use3DStore, { CAMERA_PRESETS } from '../../store/use3DStore';
import useStore from '../../store/useStore';
import { BODY_PART_MAP } from './bodyRegions';
import { fitHumanFrame, fitRegionFrame, nearestOrbitAngle } from './cameraFraming';
import { useAnatomyEligibility } from './useAnatomyEligibility';
import {constrain,autoRotate as advanceRotation,DEFAULTS as CAMERA_LIMITS} from './viewerCamera';
import {closestDetailedDistance} from './textureDensity';
import { normalizeCameraView, restoreCameraView } from '../../lib/cameraBookmarks';
import { registerBookmarkCamera } from './cameraBookmarkRuntime';

function updateClipping(camera,distance){
  const near=Math.max(.005,Math.min(.1,distance*.025)),far=Math.max(20,distance*40);
  if(camera.near!==near || camera.far!==far){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}
}

export default function CameraRig() {
  const orbitRef = useRef();
  const { camera, gl, size } = useThree();
  const dpr=useThree(state=>state.viewport.dpr);
  const cameraPreset = use3DStore((s) => s.cameraPreset);
  const cameraZoom = use3DStore((s) => s.cameraZoom);
  const cameraRevision = use3DStore((s) => s.cameraRevision);
  const bookmarkView=use3DStore(s=>s.cameraBookmarkView);
  const viewMode = use3DStore((s) => s.viewMode);
  const autoRotate = use3DStore((s) => s.autoRotate);
  const poseDragging=use3DStore(s=>s.poseDragging);
  const cameraMode=use3DStore(s=>s.avatarWorkspace.cameraMode);
  const showStage=use3DStore(s=>s.avatarWorkspace.showStage);
  const rotationSpeed=use3DStore(s=>s.avatarWorkspace.autoRotateSpeed);
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
  const interacting=useRef(false),resumeAt=useRef(0);

  const reportCamera = useCallback(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    // Camera-only diagnostics; never include source body measurements.
    const fields = { cameraDistance: camera.position.distanceTo(controls.target).toFixed(4),
      cameraTarget: controls.target.toArray().map(v => v.toFixed(4)).join(','),
      cameraPosition: camera.position.toArray().map(v => v.toFixed(4)).join(','),
      cameraFocus: use3DStore.getState().focusedBodyPart || 'body',
      cameraMode:use3DStore.getState().avatarWorkspace.cameraMode,
      cameraMinDistance:controls.minDistance.toFixed(4),
      cameraAzimuth:controls.getAzimuthalAngle().toFixed(5),cameraPolar:controls.getPolarAngle().toFixed(5),
      cameraRegionSource: use3DStore.getState().modelRegionFrames[use3DStore.getState().avatarWorkspace.avatarContext === 'goal' ? 'B' : 'A'][use3DStore.getState().focusedBodyPart]?.source || 'reference',
      cameraRegionGeometry: use3DStore.getState().modelRegionFrames[use3DStore.getState().avatarWorkspace.avatarContext === 'goal' ? 'B' : 'A'][use3DStore.getState().focusedBodyPart]?.sourceGeometry || '' };
    for (const [key, value] of Object.entries(fields)) if (gl.domElement.dataset[key] !== value) gl.domElement.setAttribute(`data-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, value);
  }, [camera, gl]);

  useEffect(()=>registerBookmarkCamera(gl.domElement,()=>orbitRef.current
    ? normalizeCameraView({position:camera.position.toArray(),target:orbitRef.current.target.toArray(),frame:use3DStore.getState().modelFrame}) : null),[camera,gl]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReducedMotion(media?.matches ?? false);
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    if (manualStart.current) {
      manualStart.current = false;
      // Skip only the state change caused by this gesture. A later named
      // preset or bookmark must never inherit a stale gesture suppression.
      if(cameraPreset==='CUSTOM' && !bookmarkView)return;
    }
    const saved=viewMode==='SOLO'?restoreCameraView(bookmarkView,modelFrame):null;
    if(saved) {
      const fit=fitHumanFrame({frame:modelFrame,width:size.width,height:size.height,fov:camera.fov});
      const densities=Object.entries(regionFrames).filter(([key,value])=>key!=='anatomy' && value?.texelsPerWorldUnit>0).map(([,value])=>value.texelsPerWorldUnit);
      const detail=densities.length?closestDetailedDistance({pixelHeight:size.height*dpr,fov:camera.fov,texelsPerUnit:Math.min(...densities)}):fit.distance*.35;
      controls.minDistance=Math.max(.12,detail);
      controls.maxDistance=Math.max(controls.minDistance*1.1,Math.min(40,fit.distance*3.4));
      const zoom=use3DStore.getState().cameraZoom;
      const desired={...saved,distance:saved.distance*zoom};
      const floor=showStage && cameraMode!=='HANGING'?0:null;
      if(floor!==null)desired.target[1]=Math.max(desired.target[1],floor+CAMERA_LIMITS.floorMargin-Math.max(controls.minDistance,desired.distance)+.001);
      const bounded=constrain(desired,{mode:cameraMode,floorY:floor,minDistance:controls.minDistance,maxDistance:controls.maxDistance});
      const start=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      animation.current={current:start,target:new THREE.Spherical(bounded.distance,bounded.polar,nearestOrbitAngle(start.theta,bounded.azimuth)),
        center:controls.target.clone(),destination:new THREE.Vector3(...bounded.target),immediate:initialFrame.current || reducedMotion};
      baseDistance.current=saved.distance;previousZoom.current=zoom;initialFrame.current=false;
      return;
    }
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
    const detailDistance=region?closestDetailedDistance({pixelHeight:size.height*dpr,fov:camera.fov,texelsPerUnit:regionFrames[focusedBodyPart]?.texelsPerWorldUnit}):0;
    controls.minDistance = Math.max(0.12, baseDistance.current * 0.35,detailDistance);
    controls.maxDistance = Math.max(controls.minDistance*1.1,Math.min(40, baseDistance.current * 3.4));
    const start = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const theta = cameraPreset === 'CUSTOM' && !region ? start.theta : THREE.MathUtils.degToRad(hint.azimuth || 0);
    let phi = cameraPreset === 'CUSTOM' && !region ? start.phi : THREE.MathUtils.degToRad(90 - (hint.elevation || 0));
    const bounded=constrain({target:target.toArray(),azimuth:theta,polar:phi,distance},{mode:cameraMode,floorY:showStage && cameraMode!=='HANGING'?0:null,minDistance:controls.minDistance,maxDistance:controls.maxDistance});
    phi=bounded.polar;
    animation.current = {
      current: start,
      target: new THREE.Spherical(distance, phi, nearestOrbitAngle(start.theta, theta)),
      center: controls.target.clone(), destination: target,
      immediate: initialFrame.current || reducedMotion,
    };
    initialFrame.current = false;
  }, [camera, cameraPreset, cameraRevision, bookmarkView, focusedBodyPart, modelFrame, regionFrames, privateAllowed, reducedMotion, size.height, size.width, viewMode,cameraMode,showStage,dpr]);

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
      interacting.current=true;
      const state=use3DStore.getState();
      manualStart.current = state.cameraPreset!=='CUSTOM' || Boolean(state.cameraBookmarkView);
      use3DStore.setState({ cameraPreset: 'CUSTOM',cameraBookmarkView:null });
    };
    const onEnd = () => {
      interacting.current=false;resumeAt.current=performance.now()+3000;
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
    const down = (event) => {if(event.defaultPrevented || use3DStore.getState().poseDragging){start=null;last=null;return;} pointers.add(event.pointerId); if (pointers.size > 1) { start = null; last = null; return; } start = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, time: event.timeStamp } : null; };
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

  useFrame((_, delta) => {
    const controls = orbitRef.current;
    if (!controls) return;
    if(poseDragging){animation.current=null;reportCamera();return;}
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
    } else if (autoRotate && !interacting.current && performance.now()>=resumeAt.current && cameraMode!=='TOP') {
      const next=advanceRotation({target:controls.target.toArray(),azimuth:controls.getAzimuthalAngle(),polar:controls.getPolarAngle(),distance:camera.position.distanceTo(controls.target)},delta,{degPerSec:rotationSpeed},{mode:cameraMode,floorY:showStage && cameraMode!=='HANGING'?0:null});
      controls.setAzimuthalAngle(next.azimuth);
    }
    // Recompute after pan and dolly, not just on preset changes. Even a target
    // panned below the stage must leave a feasible camera position above it.
    const distance=camera.position.distanceTo(controls.target),floor=showStage && cameraMode!=='HANGING'?0:null;
    if(floor!==null)controls.target.y=Math.max(controls.target.y,floor+CAMERA_LIMITS.floorMargin-distance+.001);
    const state={target:controls.target.toArray(),azimuth:controls.getAzimuthalAngle(),polar:controls.getPolarAngle(),distance};
    const bounded=constrain(state,{mode:cameraMode,floorY:floor,minDistance:controls.minDistance,maxDistance:controls.maxDistance});
    const fixed=cameraMode==='TURNTABLE'||cameraMode==='TOP';
    controls.minPolarAngle=fixed?bounded.polar:.02;
    controls.maxPolarAngle=fixed?bounded.polar:floor===null?Math.PI-.02:Math.min(Math.PI-.02,Math.acos(THREE.MathUtils.clamp((floor+CAMERA_LIMITS.floorMargin-controls.target.y)/Math.max(distance,.001),-1,1)));
    controls.update();
    if(floor!==null)camera.position.setY(Math.max(camera.position.y,floor+CAMERA_LIMITS.floorMargin));
    updateClipping(camera,camera.position.distanceTo(controls.target));
    reportCamera();
  });

  return <OrbitControls ref={orbitRef} enabled={!poseDragging} rotateSpeed={0.7} zoomSpeed={0.8} minDistance={0.12} maxDistance={40}
    minPolarAngle={.02} maxPolarAngle={Math.PI/2}
    enablePan panSpeed={0.65} screenSpacePanning enableDamping={!reducedMotion} dampingFactor={0.08}
    mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    target={[0, 0.98, 0]} autoRotate={false} makeDefault />;
}
