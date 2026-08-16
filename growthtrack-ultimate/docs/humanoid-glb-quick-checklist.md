# Humanoid GLB Quick Checklist

Use this as the fast production sheet for `humanoid-base.glb`.

## 1. Base Mesh

- [ ] Start from a neutral A-pose or relaxed T-pose
- [ ] Keep the mesh symmetrical
- [ ] Preserve clean quads
- [ ] Keep even density around joints and facial features

## 2. Body Regions

- [ ] Head and face: eyes, lids, brow, nose, mouth, jaw, ears
- [ ] Neck and shoulders: neck base, clavicles, traps, delts, underarm
- [ ] Torso: chest, ribs, waist, abdomen, back, pelvis
- [ ] Arms and hands: upper arm, elbow, forearm, wrist, palm, fingers, thumb
- [ ] Legs and feet: hip socket, glute fold, thigh, knee, calf, ankle, arch, toes

## 3. Shape Keys

- [ ] Build structural keys first
- [ ] Then add body-volume keys
- [ ] Then add face and surface-detail keys
- [ ] Keep every key sculpted from the neutral base only
- [ ] Test each key at low, mid, and high values

## 4. Must-Have Keys

- [ ] `overall_mass`
- [ ] `torso_length`
- [ ] `leg_length`
- [ ] `shoulder_slope`
- [ ] `neck_thickness`
- [ ] `chest_depth`
- [ ] `waist_narrow`
- [ ] `hip_width`
- [ ] `glute_volume`
- [ ] `face_roundness`

## 5. Export

- [ ] Export as `.glb`
- [ ] Enable normals
- [ ] Enable tangents
- [ ] Enable shape keys
- [ ] Enable shape key normals
- [ ] Enable shape key tangents
- [ ] Keep the `Body` mesh name stable

## 6. Validation

- [ ] Model stays centered
- [ ] Camera frames the body cleanly
- [ ] No tearing at shoulders, elbows, hips, knees, or face
- [ ] Morphs stay readable when zoomed in and zoomed out
- [ ] Import looks human at a distance and up close

