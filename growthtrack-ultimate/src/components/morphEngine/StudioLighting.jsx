/** Physically layered portrait rig shared by every digital-human render mode. */

import { useRef } from "react";

import use3DStore from "../../store/use3DStore";
import { getCinematicSceneProfile } from "./cinematicProfiles";

const LIGHTING_BY_TIER = {
  HIGH: { key: 38, fill: 2.1, point: 2.0, edge: 28, edgeSecondary: 18, ambient: 0.12, hemisphere: 0.32 },
  MED:  { key: 34, fill: 1.8, point: 1.6, edge: 22, edgeSecondary: 14, ambient: 0.14, hemisphere: 0.36 },
  LOW:  { key: 28, fill: 1.35, point: 1.1, edge: 0, edgeSecondary: 0, ambient: 0.18, hemisphere: 0.42 },
};

function CinematicKey({ profile, shadowMapSize, lighting }) {
  const ref = useRef();

  return (
    <spotLight
      ref={ref}
      position={[-2.8, 4.8, 3.6]}
      intensity={lighting.key}
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

function PortraitFill({ profile, lighting }) {
  return (
    <>
      <rectAreaLight position={[2.8, 2.4, 2.5]} rotation={[0, -0.72, 0]} width={3.2} height={4.4} intensity={lighting.fill} color={profile.fill} />
      <pointLight position={[0, 0.45, 1.6]} intensity={lighting.point} color={profile.key} distance={4.5} decay={2} />
    </>
  );
}

function EdgeLights({ profile, lighting }) {
  if (!lighting.edge) return null;
  return (
    <>
      <spotLight position={[2.7, 3.0, -3.4]} intensity={lighting.edge} color={profile.rim} distance={9} decay={2} angle={0.42} penumbra={0.9} />
      <spotLight position={[-2.5, 2.0, -2.8]} intensity={lighting.edgeSecondary} color={profile.accent} distance={8} decay={2} angle={0.52} penumbra={0.88} />
    </>
  );
}

export default function StudioLighting({ lodConfig }) {
  const environment = use3DStore((state) => state.cinematicState.sceneEnvironment);
  const profile = getCinematicSceneProfile(environment);
  const lighting = LIGHTING_BY_TIER[lodConfig?.tier] || LIGHTING_BY_TIER.HIGH;

  return (
    <group name="cinematic-portrait-lighting">
      <ambientLight intensity={lighting.ambient} color={profile.fill} />
      <hemisphereLight skyColor={profile.key} groundColor={profile.fog} intensity={lighting.hemisphere} />
      <CinematicKey profile={profile} shadowMapSize={lodConfig.shadowMapSize} lighting={lighting} />
      <PortraitFill profile={profile} lighting={lighting} />
      <EdgeLights profile={profile} lighting={lighting} />
    </group>
  );
}
