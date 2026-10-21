# Metric → Morph Target Table

Source of truth reconciliation between the three places this data lives:

- **Declared list**: `MORPH_TARGET_NAMES` in `src/components/morphEngine/constants.js`
  (54 names — this is what the GLB *should* contain and what `useModelLoader.js`
  validates against)
- **Computed weights**: `computeMorphWeights()` in `src/store/use3DStore.js`
  (what the app actually calculates from user metrics today)
- **Blender**: what you author as shape keys, in this order

Type legend: **G** = geometry shape key (author in Blender) · **S** = shader
uniform, not a shape key (drive in code only — do not create as a shape key).

---

## Body composition

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `overall_mass` | G | `weight` | `normalise(weight, "weight")` | ✅ mapped |
| `gut_volume` | G | `weight`, `bodyFat` | `max(weight_norm×0.6, bodyFat_norm×0.4)` | ✅ mapped |
| `face_roundness` | G | `bodyFat` | `bodyFat_norm × 0.7` | ✅ mapped |
| `chest_depth` | G | `chest` | `normalise(chest, "chest")` | ✅ mapped |
| `pec_thickness` | G | `chest` | `chest_norm × 0.85` | ✅ mapped |
| `deltoid_width` | G | `shoulders` | `normalise(shoulders, "shoulders")` | ✅ mapped |
| `trap_swell` | G | `shoulders` | `shoulders_norm × 0.6` | ✅ mapped |
| `waist_narrow` | G | `waist` | `1 − normalise(waist, "waist")` (inverted) | ✅ mapped |
| `oblique_def` | G | `waist` | `1 − waist_norm × 0.7` | ✅ mapped |
| `bicep_peak` | G | `arms` | `normalise(arms, "arms")` | ✅ mapped |
| `tricep_horse` | G | `arms` | `arms_norm × 0.9` | ✅ mapped |
| `forearm_girth` | G | `forearm` | `normalise(forearm, "forearm")` | ✅ mapped |
| `glute_volume` | G | `glutes` | `normalise(glutes, "glutes")` | ✅ mapped |
| `hip_width` | G | `hips` | `normalise(hips, "hips")` | ✅ mapped |
| `quad_sweep` | G | `thighs` | `normalise(thighs, "thighs")` | ✅ mapped |
| `ham_thickness` | G | `thighs` | `thighs_norm × 0.8` | ✅ mapped |
| `calf_diamond` | G | `calves` | `normalise(calves, "calves")` | ✅ mapped |
| `ankle_width` | G | `ankle` | `normalise(ankle, "ankle")` | ✅ mapped |
| `neck_thickness` | G | `neck` | `normalise(neck, "neck")` | ✅ mapped |
| `trap_rise` | G | `neck` | `neck_norm × 0.5` | ✅ mapped |
| `torso_length` | G | `torsoLength` or `height×0.28` | `normalise(...)` | ✅ mapped |
| `shoulder_slope` | G | `shoulders` | `shoulders_norm × 0.5` | ✅ mapped |
| `clavicle_width` | G | `shoulders` | `shoulders_norm × 0.8` | ✅ mapped |
| `ribcage_depth` | G | `chest` | `chest_norm × 0.75` | ✅ mapped |
| `pelvis_width` | G | `hips` | `hips_norm × 0.85` | ✅ mapped |
| `neck_length` | G | `neck` | `neck_norm × 0.45` | ✅ mapped |
| `upper_arm_length` | G | `upperArm` (default 34) | `normalise(...)` | ✅ mapped |
| `forearm_length` | G | `lowerArm` (default 29) | `normalise(...)` | ✅ mapped |
| `hand_length` | G | `handLength` (default 19) | `normalise(...)` | ✅ mapped |
| `leg_length` | G | `legLength` or `height×0.52` | `normalise(...)` | ✅ mapped |
| `foot_length` | G | `footLength` (default 27) | `normalise(...)` | ✅ mapped |

## Facial anatomy

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `brow_depth` | G | — | none | ⚠️ **declared, never computed** — manual/sculpt-only today |
| `nose_bridge_width` | G | — | none | ⚠️ **declared, never computed** |
| `nose_tip_size` | G | — | none | ⚠️ **declared, never computed** |
| `ear_prominence` | G | — | none | ⚠️ **declared, never computed** |
| `jaw_width` | G | — | none | ⚠️ **declared, never computed** |
| `chin_projection` | G | — | none | ⚠️ **declared, never computed** |
| `lip_fullness` | G | — | none | ⚠️ **declared, never computed** |
| `eye_size` | G | — | none | ⚠️ **declared, never computed** |
| `cheekbone_width` | G | `bodyFat`, `shoulders` | `bodyFat_norm×0.35 + shoulders_norm×0.15` | ✅ mapped |
| `forehead_height` | G | `headCirc` (default 57) | `headCirc_norm × 0.25` | ✅ mapped |
| `temple_narrowing` | G | `headCirc` (default 57) | `1 − headCirc_norm × 0.15` | ✅ mapped |
| `nose_length` | G | `bodyFat` | `bodyFat_norm×0.18 + 0.15` | ✅ mapped |
| `jaw_angle` | G | `bodyFat` | `bodyFat_norm × 0.2` | ✅ mapped |
| `shoulder_drop` | G | `shoulders` | `1 − shoulders_norm × 0.3` | ✅ mapped |

## Extremity / pose helpers

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `knee_spacing` | G | `hips` | `hips_norm × 0.22` | ✅ mapped |
| `ankle_taper` | G | `ankle` | `1 − ankle_norm × 0.3` | ✅ mapped |
| `hand_splay` | G | `handLength` | `handLength_norm × 0.25` | ✅ mapped |
| `foot_arch` | G | `footLength` | `footLength_norm × 0.2` | ✅ mapped |

## Private / gated (anatomical mode only)

| Morph target | Type | Driven by | Formula (today) | Status |
|---|---|---|---|---|
| `d_length` | G | `d_size` (metric key mismatch — see below) | `normalise(d_size, "d_size")` | ⚠️ works but key names don't match |
| `d_girth` | G | `d_girth` | `normalise(d_girth, "d_girth")` | ✅ mapped |

## Shader-only (do NOT create as shape keys)

| Name | Type | Driven by | Formula (today) |
|---|---|---|---|
| `vascularity_intensity` | S | `bodyFat` | `bodyFat < 15 ? (15−bodyFat)/10 : 0` |
| `fitzpatrick_index` | S | `skinTone` | index into `["I","II","III","IV","V","VI"]` |

---

## Discrepancies to resolve before/while rebuilding

1. **8 facial morphs are declared but never computed**: `brow_depth`,
   `nose_bridge_width`, `nose_tip_size`, `ear_prominence`, `jaw_width`,
   `chin_projection`, `lip_fullness`, `eye_size`. Either wire these up in
   `computeMorphWeights()` (e.g. to a face-metrics input, if you collect one)
   or explicitly document them as manual/UI-slider-only so Blender authoring
   doesn't waste time chasing a metric binding that doesn't exist.
2. **`head_circumference` is computed but not declared.** `computeMorphWeights()`
   returns a `head_circumference` key that isn't in `MORPH_TARGET_NAMES` at all
   — it's currently a dead value the loader will never look up. Either add it
   to the declared list (and author the shape key) or remove it from the
   computation.
3. **`d_length` reads from a metric called `d_size`**, not `d_length` — the
   morph target name and the store's `MORPH_RANGES`/metrics key don't match.
   Harmless today because `computeMorphWeights` hardcodes the mapping, but
   confusing for anyone maintaining this later. Rename one side for consistency.

The validation script (`scripts/validate-glb.js`) checks the GLB against the
**declared list only** (#1 above), since that's the contract the 3D loader
code actually enforces. Discrepancies #2 and #3 are data-layer bugs, not GLB
bugs — fix them in `use3DStore.js`, not in Blender.
