/**
 * GrowthTrack Ultimate — 3D Engine Constants
 */

export const MORPH_TARGET_NAMES = [
  // Body composition
  "overall_mass",
  "gut_volume",
  "face_roundness",
  "chest_depth",
  "pec_thickness",
  "deltoid_width",
  "trap_swell",
  "waist_narrow",
  "oblique_def",
  "bicep_peak",
  "tricep_horse",
  "forearm_girth",
  "glute_volume",
  "hip_width",
  "quad_sweep",
  "ham_thickness",
  "calf_diamond",
  "ankle_width",
  "neck_thickness",
  "trap_rise",
  // Facial anatomy
  "brow_depth",
  "nose_bridge_width",
  "nose_tip_size",
  "ear_prominence",
  "jaw_width",
  "chin_projection",
  "lip_fullness",
  "eye_size",
  // Genitalia
  "d_length",
  "d_girth",
  // Shader-driven (no geometry morph, uniform only)
  "vascularity_intensity",
  "fitzpatrick_index",
];


export const VIEW_MODES = {
  SOLO: "SOLO",
  DUAL: "DUAL",
  GHOST: "GHOST",
  SPLIT: "SPLIT",
  DELTA: "DELTA",
  TIMELINE: "TIMELINE",
};
