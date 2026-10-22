import { useEffect, useMemo } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import ErrorBoundary from "../ErrorBoundary";
import use3DStore from "../../store/use3DStore";
import { getCinematicSceneProfile } from "./cinematicProfiles";
import SpaceSky from './SpaceSky';
import { bakeSpaceSky } from './spaceSkyMaterial';
import { spaceSkyResolution } from '../../lib/spaceSky';

function applyAtmosphere(scene, profile, preferences, renderer, tier) {
  const previous = { background: scene.background, fog: scene.fog };
  const custom=preferences.backgroundMode !== 'scene';
  let texture;
  let skyTarget;
  if (preferences.backgroundMode === 'space') {
    skyTarget = bakeSpaceSky(renderer, preferences.spaceSky, tier);
    texture = skyTarget.texture;
  }
  if(preferences.backgroundMode === 'gradient') {
    // Small local texture, independent of viewport size. No remote assets.
    const canvas=document.createElement('canvas');canvas.width=1;canvas.height=256;
    const context=canvas.getContext('2d');
    if(context) {
      const gradient=context.createLinearGradient(0,0,0,256);
      gradient.addColorStop(0,preferences.backgroundColor);gradient.addColorStop(1,preferences.backgroundBottomColor);
      context.fillStyle=gradient;context.fillRect(0,0,1,256);
      texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    }
  }
  scene.background = texture || new THREE.Color(custom ? preferences.backgroundColor : profile.background);
  scene.fog = custom || preferences.lightingMode === 'neutral' ? null : new THREE.FogExp2(profile.fog, profile.fogDensity);
  previous.texture=texture;
  previous.skyTarget=skyTarget;
  return previous;
}

function restoreAtmosphere(scene, previous) {
  scene.background = previous.background;
  scene.fog = previous.fog;
  if (previous.skyTarget) previous.skyTarget.dispose();
  else previous.texture?.dispose();
}

function publishSky(renderer, preset, resolution) {
  renderer.domElement.dataset.spaceSky = preset;
  renderer.domElement.dataset.spaceSkyResolution = String(resolution);
  return () => {
    delete renderer.domElement.dataset.spaceSky;
    delete renderer.domElement.dataset.spaceSkyResolution;
  };
}

function Atmosphere({ profile, disableSky = false }) {
  const scene = useThree((state) => state.scene);
  const renderer = useThree((state) => state.gl);
  const tier = use3DStore(state=>state.gpuTier);
  const {backgroundMode,spaceSky,backgroundColor,backgroundBottomColor,lightingMode}=use3DStore(state=>state.avatarWorkspace);

  useEffect(() => {
    const previous = applyAtmosphere(scene, profile, {backgroundMode:disableSky && backgroundMode === 'space' ? 'scene' : backgroundMode,spaceSky,backgroundColor,backgroundBottomColor,lightingMode}, renderer, tier);
    // Expose the applied resource, rather than just the requested preference,
    // for browser checks of loading, quality changes and exported images.
    const clearEvidence = publishSky(renderer, previous.skyTarget ? spaceSky : 'off', previous.skyTarget ? spaceSkyResolution(tier) : 0);
    return () => {
      restoreAtmosphere(scene, previous);
      clearEvidence();
    };
  }, [profile,scene,renderer,tier,backgroundMode,spaceSky,backgroundColor,backgroundBottomColor,lightingMode,disableSky]);

  return null;
}

function EnvironmentRig({ profile, lodConfig }) {
  const resolution = lodConfig?.environmentResolution ?? 256;
  const {backgroundMode,spaceSky}=use3DStore(state=>state.avatarWorkspace);
  const sky = backgroundMode === 'space' ? spaceSky : null;

  return (
    <>
      <Atmosphere profile={profile} />
      {/* One local studio capture owns scene.environment; no network HDR dependency. */}
      <Environment key={`${profile.id}-${profile.key}-${sky}-${resolution}`} background={false} resolution={resolution} frames={1} environmentIntensity={profile.environmentIntensity ?? 0.42}>
        {sky && <SpaceSky preset={sky} />}
        {/* Key: primary studio spot — left-high, large area for soft wraparound */}
        <Lightformer intensity={4.0} color={profile.key} position={[-1.5, 4.2, 2.2]} rotation={[0.25, 0.15, 0]} scale={[5.0, 1.6, 1]} />
        {/* Fill: right-side large soft box — reduces harsh shadow areas */}
        <Lightformer intensity={2.6} color={profile.fill} position={[-4, 1.6, 0.4]} rotation={[0, Math.PI / 2, 0]} scale={[4.4, 1.8, 1]} />
        {/* Primary rim — separates body silhouette from dark bg */}
        <Lightformer intensity={3.4} color={profile.rim} position={[4, 2.4, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[3.6, 1.2, 1]} />
        {/* Warm opposite rim — adds skin-tone warmth to shadow side */}
        <Lightformer intensity={1.2} color="#ffe8d0" position={[-3.5, 1.8, -2.4]} rotation={[0.1, Math.PI * 0.62, 0]} scale={[2.8, 1.0, 1]} />
        {/* Hair / top kicker — separates head from background */}
        <Lightformer intensity={2.0} color={profile.key} position={[0, 5.5, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[2.8, 2.8, 1]} />
        {/* Ground bounce — reduced to maintain deep shadows while keeping slight contact fill */}
        <Lightformer intensity={0.25} color="#fff4e0" position={[0, -0.6, 2.5]} rotation={[Math.PI / 2, 0, 0]} scale={[3.6, 3.6, 1]} />
      </Environment>
    </>
  );
}

export default function SceneEnvironment({ lodConfig }) {
  const environment = use3DStore((state) => state.cinematicState.sceneEnvironment);
  const lightingMode=use3DStore(state=>state.avatarWorkspace.lightingMode);
  const backgroundMode=use3DStore(state=>state.avatarWorkspace.backgroundMode);
  const spaceSky=use3DStore(state=>state.avatarWorkspace.spaceSky);
  const profile = useMemo(()=>getCinematicSceneProfile(environment,lightingMode),[environment,lightingMode]);

  return (
    <ErrorBoundary resetKey={`${environment}-${lightingMode}-${backgroundMode}-${spaceSky}`} fallback={<Atmosphere profile={profile} disableSky />}>
      <EnvironmentRig profile={profile} lodConfig={lodConfig} />
    </ErrorBoundary>
  );
}
