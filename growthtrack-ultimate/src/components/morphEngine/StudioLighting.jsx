/** Physically layered portrait rig shared by every digital-human render mode. */

import { useRef } from "react";

import use3DStore from "../../store/use3DStore";
import { getCinematicSceneProfile } from "./cinematicProfiles";

function CinematicKey({ profile, shadowMapSize }) {
  const ref = useRef();

  return (
    <spotLight
      ref={ref}
      position={[-2.8, 4.8, 3.6]}
      intensity={52}
      color={profile.key}
      distance={10}
      decay={2}
      angle={0.48}
      penumbra={0.82}
      castShadow={Boolean(shadowMapSize)}
      shadow-mapSize-width={shadowMapSize ?? 512}
      shadow-mapSize-height={shadowMapSize ?? 512}
      shadow-camera-near={0.4}
      shadow-camera-far={12}
      shadow-bias={-0.0003}
      shadow-normalBias={0.025}
    />
  );
}

function PortraitFill({ profile }) {
  return (
    <>
      <rectAreaLight position={[2.8, 2.4, 2.5]} rotation={[0, -0.72, 0]} width={3.2} height={4.4} intensity={2.6} color={profile.fill} />
      <pointLight position={[0, 0.45, 1.6]} intensity={3.4} color={profile.key} distance={4.5} decay={2} />
    </>
  );
}

function EdgeLights({ profile }) {
  return (
    <>
      <spotLight position={[2.7, 3.0, -3.4]} intensity={38} color={profile.rim} distance={9} decay={2} angle={0.42} penumbra={0.9} />
      <spotLight position={[-2.5, 2.0, -2.8]} intensity={24} color={profile.accent} distance={8} decay={2} angle={0.52} penumbra={0.88} />
    </>
  );
}

export default function StudioLighting({ lodConfig }) {
  const environment = use3DStore((state) => state.cinematicState.sceneEnvironment);
  const profile = getCinematicSceneProfile(environment);

  return (
    <group name="cinematic-portrait-lighting">
      <ambientLight intensity={0.18} color={profile.fill} />
      <hemisphereLight skyColor={profile.key} groundColor={profile.fog} intensity={0.46} />
      <CinematicKey profile={profile} shadowMapSize={lodConfig.shadowMapSize} />
      <PortraitFill profile={profile} />
      <EdgeLights profile={profile} />
    </group>
  );
}
