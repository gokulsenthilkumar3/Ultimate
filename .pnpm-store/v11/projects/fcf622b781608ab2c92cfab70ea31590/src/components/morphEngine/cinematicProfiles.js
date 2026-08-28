/** Shared visual direction for every cinematic scene subsystem. */
export const CINEMATIC_SCENE_PROFILES = Object.freeze({
  studio: Object.freeze({
    id: "studio",
    background: "#08080a",
    fog: "#111116",
    fogDensity: 0.017,
    environmentIntensity: 0.84,
    key: "#fff7ed",
    fill: "#dfe5ec",
    rim: "#b7a8d6",
    accent: "#d7e0e8",
    secondary: "#8d96a3",
    floor: "#09090c",
  }),
  outdoor: Object.freeze({
    id: "outdoor",
    background: "#0d0a10",
    fog: "#24151b",
    fogDensity: 0.019,
    environmentIntensity: 0.82,
    key: "#ffd3a4",
    fill: "#b7d8ff",
    rim: "#ff8a5c",
    accent: "#fbbf24",
    secondary: "#fb7185",
    floor: "#120b0d",
  }),
  night: Object.freeze({
    id: "night",
    background: "#010208",
    fog: "#080625",
    fogDensity: 0.03,
    environmentIntensity: 0.66,
    key: "#d8f7ff",
    fill: "#55ddff",
    rim: "#b05cff",
    accent: "#22d3ee",
    secondary: "#a855f7",
    floor: "#02030a",
  }),
});

export function getCinematicSceneProfile(id) {
  return CINEMATIC_SCENE_PROFILES[id] || CINEMATIC_SCENE_PROFILES.studio;
}
