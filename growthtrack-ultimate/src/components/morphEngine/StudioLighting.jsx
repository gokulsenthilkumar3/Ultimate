/** Physically layered portrait rig shared by every digital-human render mode. */

import { useRef } from "react";

import use3DStore from "../../store/use3DStore";
import { getCinematicSceneProfile } from "./cinematicProfiles";

const LIGHTING_BY_TIER = {
  HIGH: { key: 48, fill: 2.8, point: 2.4, edge: 36, edgeSecondary: 22, hair: 28, backlight: 12, ambient: 0.08, hemisphere: 0.28 },
  MED:  { key: 42, fill: 2.2, point: 1.8, edge: 28, edgeSecondary: 16, hair: 18, backlight: 8, ambient: 0.10, hemisphere: 0.32 },
  LOW:  { key: 34, fill: 1.5, point: 1.2, edge: 0, edgeSecondary: 0, hair: 0, backlight: 0, ambient: 0.16, hemisphere: 0.40 },
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
      angle={0.46}
      penumbra={0.84}
      castShadow={Boolean(shadowMapSize)}
      shadow-mapSize-width={shadowMapSize ?? 512}
      shadow-mapSize-height={shadowMapSize ?? 512}
      shadow-camera-near={0.4}
      shadow-camera-far={12}
      shadow-bias={-0.0003}
      shadow-normalBias={0.022}
    />
  );
}

function PortraitFill({ profile, lighting }) {
  return (
    <>
      <rectAreaLight position={[2.8, 2.4, 2.5]} rotation={[0, -0.72, 0]} width={3.2} height={4.4} intensity={lighting.fill} color={profile.fill} />
      <pointLight position={[0, 0.55, 1.8]} intensity={lighting.point} color={profile.key} distance={4.5} decay={2} />
    </>
  );
}

function EdgeLights({ profile, lighting }) {
  if (!lighting.edge) return null;
  return (
    <>
      {/* Primary rim — separates body silhouette from background */}
      <spotLight position={[2.7, 3.0, -3.4]} intensity={lighting.edge} color={profile.rim} distance={9} decay={2} angle={0.40} penumbra={0.90} />
      {/* Secondary rim — opposite side fill for dimensionality */}
      <spotLight position={[-2.5, 2.0, -2.8]} intensity={lighting.edgeSecondary} color={profile.accent} distance={8} decay={2} angle={0.50} penumbra={0.88} />
      {/* Hair/kicker light — top-down, separates head from background */}
      {lighting.hair > 0 && (
        <spotLight position={[0.4, 5.2, -1.8]} intensity={lighting.hair} color={profile.key} distance={8} decay={2} angle={0.38} penumbra={0.92} />
      )}
      {/* Subtle backlight — adds depth behind the models */}
      {lighting.backlight > 0 && (
        <pointLight position={[0, 1.5, -3.8]} intensity={lighting.backlight} color={profile.rim} distance={7} decay={2} />
      )}
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
