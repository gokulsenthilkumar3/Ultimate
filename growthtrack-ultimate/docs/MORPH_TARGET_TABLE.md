# Metric -> Morph Target Table

Source of truth reconciliation between the three places this data lives:

- Declared list: `MORPH_TARGET_NAMES` in `src/components/morphEngine/constants.js`
- Computed weights: `computeMorphWeights()` in `src/store/use3DStore.js`
- Blender: what you author as shape keys, in this order

Type legend: G = geometry shape key (author in Blender) · S = shader uniform, not a shape key (drive in code only).

---

## Body composition

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `overall_mass` | G | `weight` | `normalise(weight, "weight")` | mapped |
| `gut_volume` | G | `weight`, `bodyFat` | `max(weight_norm x 0.6, bodyFat_norm x 0.4)` | mapped |
| `face_roundness` | G | `bodyFat` | `bodyFat_norm x 0.7` | mapped |
| `chest_depth` | G | `chest` | `normalise(chest, "chest")` | mapped |
| `pec_thickness` | G | `chest` | `chest_norm x 0.85` | mapped |
| `deltoid_width` | G | `shoulders` | `normalise(shoulders, "shoulders")` | mapped |
| `trap_swell` | G | `shoulders` | `shoulders_norm x 0.6` | mapped |
| `waist_narrow` | G | `waist` | `1 - normalise(waist, "waist")` | mapped |
| `oblique_def` | G | `waist` | `1 - waist_norm x 0.7` | mapped |
| `bicep_peak` | G | `arms` | `normalise(arms, "arms")` | mapped |
| `tricep_horse` | G | `arms` | `arms_norm x 0.9` | mapped |
| `forearm_girth` | G | `forearm` | `normalise(forearm, "forearm")` | mapped |
| `glute_volume` | G | `glutes` | `normalise(glutes, "glutes")` | mapped |
| `hip_width` | G | `hips` | `normalise(hips, "hips")` | mapped |
| `quad_sweep` | G | `thighs` | `normalise(thighs, "thighs")` | mapped |
| `ham_thickness` | G | `thighs` | `thighs_norm x 0.8` | mapped |
| `calf_diamond` | G | `calves` | `normalise(calves, "calves")` | mapped |
| `ankle_width` | G | `ankle` | `normalise(ankle, "ankle")` | mapped |
| `neck_thickness` | G | `neck` | `normalise(neck, "neck")` | mapped |
| `trap_rise` | G | `neck` | `neck_norm x 0.5` | mapped |
| `torso_length` | G | `torsoLength` or `height x 0.28` | `normalise(...)` | mapped |
| `shoulder_slope` | G | `shoulders` | `shoulders_norm x 0.5` | mapped |
| `clavicle_width` | G | `shoulders` | `shoulders_norm x 0.8` | mapped |
| `ribcage_depth` | G | `chest` | `chest_norm x 0.75` | mapped |
| `pelvis_width` | G | `hips` | `hips_norm x 0.85` | mapped |
| `neck_length` | G | `neck` | `neck_norm x 0.45` | mapped |
| `upper_arm_length` | G | `upperArm` | `normalise(...)` | mapped |
| `forearm_length` | G | `lowerArm` | `normalise(...)` | mapped |
| `hand_length` | G | `handLength` | `normalise(...)` | mapped |
| `leg_length` | G | `legLength` or `height x 0.52` | `normalise(...)` | mapped |
| `foot_length` | G | `footLength` | `normalise(...)` | mapped |
| `head_circumference` | G | `headCirc` | `normalise(headCirc, "headCirc")` | mapped |

## Facial anatomy

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `brow_depth` | G | `brow_depth` | `normalise(brow_depth ?? 0.35, "brow_depth")` | mapped |
| `nose_bridge_width` | G | `nose_bridge_width` | `normalise(nose_bridge_width ?? 0.32, "nose_bridge_width")` | mapped |
| `nose_tip_size` | G | `nose_tip_size` | `normalise(nose_tip_size ?? 0.33, "nose_tip_size")` | mapped |
| `ear_prominence` | G | `ear_prominence` | `normalise(ear_prominence ?? 0.38, "ear_prominence")` | mapped |
| `jaw_width` | G | `jaw_width` | `normalise(jaw_width ?? 0.36, "jaw_width")` | mapped |
| `chin_projection` | G | `chin_projection` | `normalise(chin_projection ?? 0.30, "chin_projection")` | mapped |
| `lip_fullness` | G | `lip_fullness` | `normalise(lip_fullness ?? 0.42, "lip_fullness")` | mapped |
| `eye_size` | G | `eye_size` | `normalise(eye_size ?? 0.40, "eye_size")` | mapped |
| `cheekbone_width` | G | `bodyFat`, `shoulders` | `bodyFat_norm x 0.35 + shoulders_norm x 0.15` | mapped |
| `forehead_height` | G | `headCirc` | `headCirc_norm x 0.25` | mapped |
| `temple_narrowing` | G | `headCirc` | `1 - headCirc_norm x 0.15` | mapped |
| `nose_length` | G | `bodyFat` | `bodyFat_norm x 0.18 + 0.15` | mapped |
| `jaw_angle` | G | `bodyFat` | `bodyFat_norm x 0.2` | mapped |
| `shoulder_drop` | G | `shoulders` | `1 - shoulders_norm x 0.3` | mapped |

## Extremity / pose helpers

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `knee_spacing` | G | `hips` | `hips_norm x 0.22` | mapped |
| `ankle_taper` | G | `ankle` | `1 - ankle_norm x 0.3` | mapped |
| `hand_splay` | G | `handLength` | `handLength_norm x 0.25` | mapped |
| `foot_arch` | G | `footLength` | `footLength_norm x 0.2` | mapped |

## Private / gated

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `d_length` | G | `d_length` or `d_size` | `normalise(d_length ?? d_size, "d_size")` | mapped via alias |
| `d_girth` | G | `d_girth` | `normalise(d_girth, "d_girth")` | mapped |

## Shader-only

| Name | Type | Driven by | Formula (today) |
|---|---|---|---|
| `vascularity_intensity` | S | `bodyFat` | `bodyFat < 15 ? (15 - bodyFat) / 10 : 0` |
| `fitzpatrick_index` | S | `skinTone` | index into `["I","II","III","IV","V","VI"]` |

---

## Discrepancies to resolve

1. `head_circumference` is now declared and computed.
2. `d_length` still accepts `d_size` as the live profile alias, so keep the profile/store naming consistent if you want to rename it later.
