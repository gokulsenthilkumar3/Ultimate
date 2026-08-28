# Humanoid GLB Spec

This document defines the Blender authoring and export target for `humanoid-base.glb` so the model stays consistent with the app's metric system and morph pipeline.

## Goal

Build a full-body humanoid that:

- Reads as a realistic human in neutral pose
- Responds clearly to body metrics
- Supports stable morph deformation in glTF
- Exports cleanly as a single `.glb`

## Model Requirements

- Neutral A-pose or relaxed T-pose
- Symmetrical base topology
- Even quad distribution around all deformation zones
- Clean edge loops around joints and facial features
- Single skinned body mesh named `Body`
- Armature using standard humanoid bone naming where possible
- Shape keys enabled for all body and face morph targets
- Tangent-space normals and tangents exported

## Topology Zones To Refine

### Face

- Eye sockets
- Eyelids
- Brow ridge
- Nose bridge
- Nostril wings
- Upper lip and lower lip loops
- Chin and jawline
- Ear shells

### Neck And Shoulders

- Neck cylinder to clavicle transition
- Sternocleidomastoid region
- Trap to shoulder cap transition
- Deltoid ring loops
- Underarm crease

### Torso

- Chest expansion area
- Ribcage to waist taper
- Lower abdomen
- Oblique side wall
- Back lat transition
- Pelvis / hip shelf

### Arms And Hands

- Upper arm volume loop
- Elbow bend loop
- Forearm taper
- Wrist transition
- Knuckle loops
- Thumb base

### Legs And Feet

- Glute to hamstring transition
- Glute fold
- Thigh mass distribution
- Knee articulation ring
- Calf shape
- Ankle taper
- Arch of foot
- Toe base loops

## Vertex-Loop Guidance By Area

### Head

- Keep 3 to 5 concentric loops around each eye.
- Add one loop at the eyelid crease, one at the orbital rim, and one at the brow ridge.
- Use a vertical nose bridge strip that widens at the nostrils.
- Keep a circular mouth ring with support loops for lip compression.
- Separate jawline flow from the neck so head-tilt keys do not collapse the throat.

### Neck And Shoulders

- Use ring loops around the neck base and clavicle line.
- Add a transition loop from trapezius into deltoid.
- Preserve an underarm crease loop for arm-raise deformation.

### Torso

- Maintain horizontal loops across chest, ribcage, navel, and lower abdomen.
- Add one side seam loop from armpit to hip for twist and waist pinching.
- Keep back and flank loops evenly distributed so the torso stays readable under morphs.

### Arms

- Use at least 3 loops around the shoulder socket.
- Add 2 or 3 loops around the elbow with a clear bend center.
- Keep the forearm taper smooth from elbow to wrist.
- Include a wrist ring and a separate thumb base loop.

### Hands

- Keep one loop around the palm and one loop at each finger base.
- Preserve knuckle ridge flow, but do not over-sharpen it.
- Use individual finger segment loops so finger-length keys remain stable.

### Legs

- Add a hip socket loop, a glute fold loop, and a thigh mass loop.
- Keep one strong knee ring with support loops above and below it.
- Use calf and Achilles loops so leg-length keys still bend naturally.

### Feet

- Keep an ankle ring, arch loop, and toe base loop.
- Do not flatten the foot into a wedge; keep heel and toe volume.
- Make sure toe keys do not collapse the metatarsal zone.

## Shape Key List

### Core Body

- `overall_mass`
- `gut_volume`
- `face_roundness`
- `chest_depth`
- `pec_thickness`
- `deltoid_width`
- `trap_swell`
- `waist_narrow`
- `oblique_def`
- `bicep_peak`
- `tricep_horse`
- `forearm_girth`
- `glute_volume`
- `hip_width`
- `quad_sweep`
- `ham_thickness`
- `calf_diamond`
- `ankle_width`
- `neck_thickness`
- `trap_rise`

### Structural Proportions

- `torso_length`
- `shoulder_slope`
- `upper_arm_length`
- `forearm_length`
- `hand_length`
- `leg_length`
- `foot_length`
- `head_circumference`

### Face

- `brow_depth`
- `nose_bridge_width`
- `nose_tip_size`
- `ear_prominence`
- `jaw_width`
- `chin_projection`
- `lip_fullness`
- `eye_size`

### Surface Detail

- `cheekbone_width`
- `temple_narrowing`
- `forehead_height`
- `nipple_projection`
- `areola_scale`
- `navel_depth`
- `scapula_prominence`
- `knee_cap`
- `elbow_point`

### Private Anatomy

- `d_length`
- `d_girth`

### Shader-Only

- `vascularity_intensity`
- `fitzpatrick_index`

## Metric To Morph Mapping

### Weight And Fat

- `weight` -> `overall_mass`, `gut_volume`
- `bodyFat` -> `face_roundness`, `gut_volume`, `vascularity_intensity`

### Upper Body

- `chest` -> `chest_depth`, `pec_thickness`
- `shoulders` -> `deltoid_width`, `trap_swell`, `shoulder_slope`
- `neck` -> `neck_thickness`, `trap_rise`

### Midsection

- `waist` -> `waist_narrow`, `oblique_def`
- `hips` -> `hip_width`
- `glutes` -> `glute_volume`

### Arms

- `arms` -> `bicep_peak`, `tricep_horse`
- `forearm` -> `forearm_girth`, `forearm_length`
- `upperArm` -> `upper_arm_length`
- `handLength` -> `hand_length`

### Lower Body

- `thighs` -> `quad_sweep`, `ham_thickness`
- `calves` -> `calf_diamond`
- `ankle` -> `ankle_width`
- `legLength` -> `leg_length`
- `footLength` -> `foot_length`

### Head

- `headCirc` -> `head_circumference`
- `bodyFat` -> `face_roundness`

## Compact Metric To Morph Table

| Metric | Primary Morphs | Secondary Morphs |
| --- | --- | --- |
| `weight` | `overall_mass` | `gut_volume` |
| `bodyFat` | `face_roundness` | `gut_volume`, `vascularity_intensity` |
| `chest` | `chest_depth` | `pec_thickness` |
| `shoulders` | `deltoid_width` | `trap_swell`, `shoulder_slope` |
| `waist` | `waist_narrow` | `oblique_def` |
| `arms` | `bicep_peak` | `tricep_horse` |
| `forearm` | `forearm_girth` | `forearm_length` |
| `upperArm` | `upper_arm_length` | `bicep_peak` |
| `handLength` | `hand_length` | `forearm_length` |
| `thighs` | `quad_sweep` | `ham_thickness` |
| `calves` | `calf_diamond` | `ankle_width` |
| `hips` | `hip_width` | `glute_volume` |
| `glutes` | `glute_volume` | `hip_width` |
| `neck` | `neck_thickness` | `trap_rise` |
| `legLength` | `leg_length` | `torso_length` |
| `footLength` | `foot_length` | `ankle_width` |
| `headCirc` | `head_circumference` | `face_roundness` |
| `skinTone` | `fitzpatrick_index` | `vascularity_intensity` |
| `d_size` | `d_length` | `d_girth` |
| `d_girth` | `d_girth` | `d_length` |

## Recommended Shape-Key Order

Build and test the keys in this body-region order so the silhouette is stable before detail:

1. `overall_mass`
2. `torso_length`
3. `leg_length`
4. `shoulder_slope`
5. `neck_thickness`
6. `chest_depth`
7. `pec_thickness`
8. `deltoid_width`
9. `trap_swell`
10. `waist_narrow`
11. `oblique_def`
12. `hip_width`
13. `glute_volume`
14. `quad_sweep`
15. `ham_thickness`
16. `calf_diamond`
17. `ankle_width`
18. `bicep_peak`
19. `tricep_horse`
20. `forearm_girth`
21. `forearm_length`
22. `upper_arm_length`
23. `hand_length`
24. `foot_length`
25. `head_circumference`
26. `face_roundness`
27. `jaw_width`
28. `chin_projection`
29. `nose_bridge_width`
30. `nose_tip_size`
31. `eye_size`
32. `ear_prominence`
33. `lip_fullness`
34. `brow_depth`
35. `vascularity_intensity`
36. `fitzpatrick_index`
37. `d_length`
38. `d_girth`

## Blender Checklist Worksheet

### Base Mesh

- [ ] Start from a neutral human base in A-pose or relaxed T-pose
- [ ] Confirm left-right symmetry before sculpting
- [ ] Keep the mesh in quads where possible
- [ ] Maintain even density around shoulders, elbows, hips, knees, face, hands, and feet

### Deformation Loops

- [ ] Eye loops
- [ ] Mouth loops
- [ ] Jaw / chin loops
- [ ] Neck loops
- [ ] Shoulder loops
- [ ] Elbow loops
- [ ] Wrist loops
- [ ] Hip loops
- [ ] Knee loops
- [ ] Ankle loops
- [ ] Toe loops

### Shape Keys

- [ ] Create the base silhouette keys first
- [ ] Author each key from the neutral base only
- [ ] Test each key at 0.25, 0.5, 0.75, and 1.0
- [ ] Check for pinching at joints and face
- [ ] Verify shape key names exactly match the app mapping

### Rigging

- [ ] Bind the mesh to a clean humanoid armature
- [ ] Keep deformation bones only
- [ ] Verify shoulders, wrists, hips, knees, ankles, and neck rotate correctly

### Export

- [ ] Export as `.glb`
- [ ] Enable normals
- [ ] Enable tangents
- [ ] Enable shape keys
- [ ] Enable shape key normals
- [ ] Enable shape key tangents
- [ ] Validate the exported file in the app

## Region-Ordered Build Sequence

1. Head and face:
   - Eye sockets
   - Eyelids
   - Brow ridge
   - Nose bridge
   - Mouth ring
   - Jaw and chin
   - Ears
2. Neck and shoulders:
   - Neck base
   - Clavicles
   - Trap transition
   - Deltoid cap
   - Underarm crease
3. Torso:
   - Chest
   - Ribcage
   - Waist
   - Lower abdomen
   - Back and flank transitions
   - Pelvis / hip shelf
4. Arms and hands:
   - Upper arm
   - Elbow
   - Forearm
   - Wrist
   - Palm
   - Fingers
   - Thumb base
5. Legs and feet:
   - Hip socket
   - Glute fold
   - Thigh
   - Knee
   - Calf
   - Achilles
   - Ankle
   - Arch
   - Toe base

### Private Measurements

- `d_size` -> `d_length`
- `d_girth` -> `d_girth`

## Recommended Blender Setup

1. Start from a clean human mesh with matched left/right topology.
2. Keep quads on the base mesh where possible.
3. Add shape keys for the morph list above.
4. Sculpt each key from the neutral base only.
5. Preserve mouth, eye, shoulder, elbow, hip, knee, and ankle loops.
6. Avoid moving unrelated zones when authoring a single key.
7. Verify left/right symmetry for bilateral keys.
8. Test each shape key at low, medium, and high values before export.

## Minimum Viable Humanoid GLB Pass

Follow this path if you want the fastest route to a believable, stable model:

1. Build one neutral base mesh with correct human proportions.
2. Add clean loops for the face, neck, shoulders, elbows, wrists, hips, knees, ankles, and toes.
3. Skin the mesh to a simple humanoid armature.
4. Create the first 10 keys only:
   - `overall_mass`
   - `torso_length`
   - `chest_depth`
   - `waist_narrow`
   - `hip_width`
   - `glute_volume`
   - `quad_sweep`
   - `calf_diamond`
   - `neck_thickness`
   - `face_roundness`
5. Check the model in neutral, flexed, and extreme poses.
6. Add arm-length and leg-length keys next.
7. Add facial detail keys only after the body reads correctly at a distance.
8. Export as `.glb` with normals, tangents, and shape keys enabled.
9. Validate in the app:
   - centered
   - properly scaled
   - no tearing at shoulders, hips, elbows, or knees
   - readable when zoomed in and zoomed out
10. Add the remaining detail keys only after the MVP pass is visually solid.

## Export Checklist

Use Blender `glTF 2.0` export with:

- Format: `glTF Binary (.glb)`
- Selected Objects: on
- UVs: on
- Normals: on
- Tangents: on
- Shape Keys: on
- Shape Key Normals: on
- Shape Key Tangents: on
- Skinning: on
- Include All Bone Influences: on if the rig needs it
- Use Rest Position Armature: on
- Export Deformation Bones Only: on
- Apply Modifiers: on
- +Y Up: on
- Compression: Draco only after topology and morphs are final

## Validation Checklist

- `Body` exists as a skinned mesh
- Morph target count matches the app's expected list
- Morph names are stable and ordered
- Base pose is neutral and unbroken
- Mesh scale is human-realistic when imported
- No shape key tears at shoulders, elbows, hips, knees, or face
- Normal and tangent data export correctly
- Model looks correct both with and without morphs enabled

## Notes For The App

- The app normalizes model scale and centering on load.
- The app expects the `Body` mesh name to stay stable.
- The app can use extra shape keys as long as the names are added to the morph constant list.
- Structural keys are especially useful for making the figure read as human instead of generic.
