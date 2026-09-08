import { useEffect } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import ErrorBoundary from "../ErrorBoundary";
import use3DStore from "../../store/use3DStore";
import { getCinematicSceneProfile } from "./cinematicProfiles";

function applyAtmosphere(scene, profile) {
  const previous = { background: scene.background, fog: scene.fog };
  scene.background = new THREE.Color(profile.background);
  scene.fog = new THREE.FogExp2(profile.fog, profile.fogDensity);
  return previous;
}

function restoreAtmosphere(scene, previous) {
  scene.background = previous.background;
  scene.fog = previous.fog;
}

function Atmosphere({ profile }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const previous = applyAtmosphere(scene, profile);
    return () => restoreAtmosphere(scene, previous);
  }, [profile, scene]);

  return null;
}

function EnvironmentRig({ profile, lodConfig }) {
  const resolution = lodConfig?.environmentResolution ?? 256;

  return (
    <>
      <Atmosphere profile={profile} />
      {/* One local studio capture owns scene.environment; no network HDR dependency. */}
      <Environment key={profile.id} background={false} resolution={resolution} frames={1} environmentIntensity={profile.environmentIntensity ?? 0.42}>
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
  const profile = getCinematicSceneProfile(environment);

  return (
    <ErrorBoundary fallback={<Atmosphere profile={profile} />}>
      <EnvironmentRig profile={profile} lodConfig={lodConfig} />
    </ErrorBoundary>
  );
}
