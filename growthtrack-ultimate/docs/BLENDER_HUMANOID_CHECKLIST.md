# Humanoid GLB Rebuild - Blender Worksheet

Working spec for rebuilding `public/assets/models/humanoid-base.glb`. Check items off in order - each section gates the next. Don't move to rigging until topology is signed off; don't move to shape keys until rigging is signed off.

Current asset baseline (for comparison, re-measure with `scripts/validate-glb.js` after each pass): **234 verts / 416 tris / 1 joint / 0 textures**.

Morph targets: the file does contain 24 named targets, but their deltas are tiny and not meaningfully sculpted. 29 of the declared names have no target at all, and `vascularity_intensity` / `fitzpatrick_index` are incorrectly baked as geometry targets when they should be shader-only. Full breakdown in `docs/MORPH_TARGET_TABLE.md` and live in `scripts/validate-glb.js` output.

## Quick sheet

- Base order: torso -> pelvis -> legs -> arms -> hands -> feet -> neck -> head
- Rig order: build skeleton, then weight paint, then test bends
- Shape-key order: follow `docs/MORPH_TARGET_TABLE.md` exactly
- Shader-only: do not author `vascularity_intensity` or `fitzpatrick_index`
- Export: `.glb`, `+Y Up`, modifiers on, shape keys on, textures embedded
- Validate: `node scripts/validate-glb.js public/assets/models/humanoid-base.glb`

## Build order

1. Start from a clean, human-grade base mesh.
2. Rebuild topology by region in this order: torso, pelvis, legs, arms, hands, feet, neck, head.
3. Rig the mesh and validate joint deformation before adding shape keys.
4. Author shape keys in the canonical table order.
5. Add materials and textures.
6. Export as `.glb` with `+Y Up`.
7. Run the validator and fix every failing line before shipping.

## Blender workflow

### Step 1: Prepare the base

1. Open Blender and import or create a neutral humanoid base.
2. Remove any nonessential modifiers except Mirror and Subdivision.
3. Freeze scale, rotation, and transform so the mesh is clean before editing.
4. Confirm the pose is neutral A-pose or T-pose.
5. Delete any accidental duplicate geometry or loose fragments.

### Step 2: Block the main anatomy

1. Shape the torso first.
2. Add a dedicated pelvis loop system.
3. Extend clean quad topology into the legs.
4. Build the arms with elbow-friendly loop spacing.
5. Model hands with full finger geometry.
6. Model feet with toe and arch support.
7. Separate the neck so it can deform independently.
8. Build the head last, with enough loops for brow, nose, lips, cheeks, and jaw.

### Step 3: Refine by region

1. Check chest, waist, and navel flow on the torso.
2. Test hip and gut deformation on the pelvis.
3. Bend each knee and elbow to verify loop support.
4. Check wrist, ankle, and shoulder transitions for pinching.
5. Smooth the face mesh until facial morphs can work cleanly.

### Step 4: Rig the mesh

1. Add a standard humanoid armature.
2. Mirror the rig so left and right match exactly.
3. Weight paint with four influences or fewer per vertex.
4. Test extreme bends before moving on.
5. Fix any collapsing folds or stretched zones now, not after export.

### Step 5: Create shape keys in order

Create shape keys in this exact order:

1. `overall_mass`
2. `gut_volume`
3. `face_roundness`
4. `chest_depth`
5. `pec_thickness`
6. `deltoid_width`
7. `trap_swell`
8. `waist_narrow`
9. `oblique_def`
10. `bicep_peak`
11. `tricep_horse`
12. `forearm_girth`
13. `glute_volume`
14. `hip_width`
15. `quad_sweep`
16. `ham_thickness`
17. `calf_diamond`
18. `ankle_width`
19. `neck_thickness`
20. `trap_rise`
21. `torso_length`
22. `shoulder_slope`
23. `clavicle_width`
24. `ribcage_depth`
25. `pelvis_width`
26. `neck_length`
27. `upper_arm_length`
28. `forearm_length`
29. `hand_length`
30. `leg_length`
31. `foot_length`
32. `head_circumference`
33. `brow_depth`
34. `nose_bridge_width`
35. `nose_tip_size`
36. `ear_prominence`
37. `jaw_width`
38. `chin_projection`
39. `lip_fullness`
40. `eye_size`
41. `cheekbone_width`
42. `forehead_height`
43. `temple_narrowing`
44. `nose_length`
45. `jaw_angle`
46. `shoulder_drop`
47. `d_length`
48. `d_girth`
49. `knee_spacing`
50. `ankle_taper`
51. `hand_splay`
52. `foot_arch`

Do not create:

- `vascularity_intensity`
- `fitzpatrick_index`

Those are shader-driven in code, not Blender shape keys.

### Step 6: Assign materials and textures

1. Create or import a proper skin material.
2. Add base color, normal, roughness, and AO maps.
3. Separate eyes, nails, teeth, and mouth interior if needed.
4. Make sure skin has believable subsurface behavior.

### Step 7: Export cleanly

1. Export as `.glb`.
2. Enable shape keys in the exporter.
3. Apply modifiers before export.
4. Use `+Y Up`.
5. Enable Draco compression if available.
6. Keep the asset single-file and embedded.

### Step 8: Validate immediately

1. Run `node scripts/validate-glb.js public/assets/models/humanoid-base.glb`.
2. Fix every failed line.
3. Reload the app and confirm the GLB badge shows healthy.
4. Repeat until the validator passes and the model reads like a real human.

---

## 1. Base mesh source

- [ ] Started from a real topology source (MakeHuman export, licensed scan-based base, or commissioned retopo) - not hand-built primitives/lathes
- [ ] Base mesh is in a neutral A-pose or T-pose
- [ ] All modifiers applied except Armature (Mirror, Subsurf, etc. baked down)
- [ ] Mesh is manifold: `Select > All by Trait > Non Manifold` returns empty
- [ ] No n-gons outside flat areas (soles of feet, palm interior are fine); no loose verts/edges (`Select > All by Trait > Loose Geometry` returns empty)

## 2. Region topology

Check off once each region has clean quad flow and meets the vertex budget. Budgets are targets, not hard limits - go over before going under.

| Region | Budget (verts) | Loop requirements | Done |
|---|---|---|---|
| Torso | 1,800-2,500 | loops at chest, waist, navel; spine curvature, not a straight profile | [ ] |
| Pelvis/hips | 800-1,200 | dedicated loop density independent of torso and legs (this is where `gut_volume`/`hip_width` deform) | [ ] |
| Each leg | 1,200-1,800 | loops at hip, mid-thigh, knee x3+, mid-calf, ankle | [ ] |
| Each arm | 800-1,200 | loops at shoulder, bicep, elbow x3+, forearm, wrist | [ ] |
| Each hand | 600-900 | real finger geometry (5 digits, 3 loops/finger min) - not a capped cylinder | [ ] |
| Each foot | 400-600 | toes present, arch has geometry to deform | [ ] |
| Neck | 300-400 | independent loop count from head and torso | [ ] |
| Head/face | 3,000-5,000 | dedicated topology for brow, nose, lips, ears, jaw, cheekbones | [ ] |

- [ ] Running total is in the **12,000-18,000 vert / 20,000-30,000 tri** range
- [ ] Joint loops verified by test-bending each region 90+ degrees in Edit Mode preview - no visible pinching or self-intersection before moving to rigging

## 3. Armature / rigging

- [ ] Standard humanoid hierarchy: Hips -> Spine1-3 -> Neck -> Head, full L/R arm chains (shoulder, upper arm, forearm, hand + 5 fingers), full L/R leg chains (thigh, calf, foot, toe)
- [ ] Hierarchy is symmetric - bone names/counts match exactly on L and R
- [ ] Weight painted with automatic weights as a starting point, then hand-corrected
- [ ] No vertex has more than 4 bone influences (matches the GLB's `WEIGHTS_0` VEC4 accessor - a 5th influence will silently get dropped on export)
- [ ] Deformation test: full elbow bend, full knee bend, arm raised overhead, spine twist - no pinching, no volume loss, no mesh popping through itself
- [ ] Rest pose exported matches the pose the shape keys were sculpted against

## 4. Shape keys (morph targets)

- [ ] Basis shape key is the neutral rest pose with all other keys at 0 - verify no influence is baked into Basis before adding further keys
- [ ] Shape keys created in the exact order and naming from `MORPH_TARGET_TABLE.md` (mirrors `MORPH_TARGET_NAMES` in `src/components/morphEngine/constants.js`)
- [ ] Every body-composition and facial-anatomy name in that table has a corresponding shape key - no silent gaps
- [ ] `vascularity_intensity` and `fitzpatrick_index` are not shape keys - confirm no geometry key exists with these names (they're shader uniforms, driven in code, not mesh deformation)
- [ ] Each shape key tested independently at influence = 1.0 - no geometry blow-up, no self-intersection, no normal flipping
- [ ] Combinatorial spot-check: 3-4 keys driven simultaneously at realistic combined values (e.g. `overall_mass` + `gut_volume` + `waist_narrow`) to catch keys that fight each other

## 5. Materials & textures

- [ ] Base Color texture authored (2K minimum, 4K for hero/close-up use), wired into Principled BSDF
- [ ] Normal map baked from high-poly detail (pores/wrinkles), wired in
- [ ] Roughness map authored/baked - skin is not uniformly rough (oilier at T-zone, forehead, palms)
- [ ] AO map baked and wired in (or left to bake-in-normal if using a single packed texture)
- [ ] Subsurface scattering configured on the skin shader (Principled BSDF's Subsurface input, or a thickness map if targeting a custom SSS shader in three.js) - flat color with zero SSS is the #1 reason synthetic skin reads as plastic
- [ ] Eyes, teeth/mouth interior (if present), and nails have separate material slots from skin

## 6. Export

- [ ] Format: `.glb` binary
- [ ] Transform: `+Y Up` (glTF/three.js convention)
- [ ] Mesh: Apply Modifiers ON
- [ ] Mesh: Shape Keys ON - confirm exporter log reports a shape key count matching your table, not 0
- [ ] Skinning: ON, "Include All Bone Influences" only if any vertex legitimately exceeds 4 weights (should be rare after clean weight painting)
- [ ] Compression: Draco ON (the app's loader already fetches a Draco decoder - this closes that loop)
- [ ] Materials: Export ON, confirm textures are embedded (not external `.bin`/`.png` references) so the single-file `.glb` pipeline still works

## 7. Sign-off

- [ ] Run `node scripts/validate-glb.js public/assets/models/humanoid-base.glb` - all checks pass
- [ ] Load in the app locally, confirm `useModelLoader` diagnostics report `health: 'healthy'` and `isDev: false`
- [ ] Visual check in all `VIEW_MODES` (SOLO/DUAL/GHOST/SPLIT/DELTA/TIMELINE) - new topology doesn't break any existing shader pass (heatmap, delta, vascularity)
- [ ] File committed with size/vert-count noted in the commit message for future regression comparison

## Notes

- The app-side facial sliders are now wired, so the Blender export should include the same facial target names rather than treating them as manual-only.
- `d_length` may still be represented as `d_size` in some profile inputs; the code accepts both, but the export target should stay `d_length`.
