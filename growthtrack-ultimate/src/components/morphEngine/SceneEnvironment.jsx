import { useEffect } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import ErrorBoundary from "../ErrorBoundary";
import use3DStore from "../../store/use3DStore";
import { getCinematicSceneProfile } from "./cinematicProfiles";

// Map our scene environment IDs to drei Environment presets
// These use internally-cached HDR maps — no external file needed.
const ENVIRONMENT_PRESET_MAP = {
  studio:  "studio",
  outdoor: "sunset",
  night:   "night",
};

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
  const resolution = lodConfig?.environmentResolution ?? 128;
  const preset = ENVIRONMENT_PRESET_MAP[profile.id] || "studio";

  return (
    <>
      <Atmosphere profile={profile} />
      {/* Primary: drei built-in HDR preset for proper IBL — key for skin SSS */}
      <Environment
        preset={preset}
        background={false}
        resolution={resolution}
        environmentIntensity={profile.environmentIntensity * 0.72}
      />
      {/* Secondary: custom lightformers to reinforce the three-point portrait rig */}
      <Environment background={false} resolution={Math.min(resolution, 96)}>
        <Lightformer intensity={3.2} color={profile.key} position={[-1.5, 4.2, 2.2]} rotation={[0.25, 0.15, 0]} scale={[4.6, 1.4, 1]} />
        <Lightformer intensity={2.2} color={profile.fill} position={[-4, 1.6, 0.4]} rotation={[0, Math.PI / 2, 0]} scale={[4, 1.5, 1]} />
        <Lightformer intensity={2.8} color={profile.rim} position={[4, 2.4, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[3.2, 1.1, 1]} />
        {/* Hair / top light — separates head from background */}
        <Lightformer intensity={1.6} color={profile.key} position={[0, 5.5, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[2.4, 2.4, 1]} />
        {/* Ground bounce — warms up legs and reduces under-chin shadow */}
        <Lightformer intensity={0.7} color="#fff4e0" position={[0, -0.6, 2.5]} rotation={[Math.PI / 2, 0, 0]} scale={[3, 3, 1]} />
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
