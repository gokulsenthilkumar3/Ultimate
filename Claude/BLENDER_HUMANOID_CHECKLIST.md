# Humanoid GLB Rebuild — Blender Worksheet

Working spec for rebuilding `public/assets/models/humanoid-base.glb`. Check items
off in order — each section gates the next. Don't move to rigging until topology
is signed off; don't move to shape keys until rigging is signed off.

Current asset baseline (for comparison, re-measure with `scripts/validate-glb.js`
after each pass): **234 verts / 416 tris / 1 joint / 0 textures**.

Morph targets: the file *does* contain 24 named targets (correction to earlier
review — the previous pass under-inspected this and reported zero), but their
deltas are ±0.008 units against a ~1.58-unit-tall body — under 1% of body
height, i.e. structurally present but not meaningfully sculpted. 29 of the 54
declared names in `MORPH_TARGET_NAMES` have no target at all, and
`vascularity_intensity`/`fitzpatrick_index` are incorrectly baked as geometry
targets when they should be shader-only. Full breakdown in
`docs/MORPH_TARGET_TABLE.md` and live in `scripts/validate-glb.js` output.

---

## 1. Base mesh source

- [ ] Started from a real topology source (MakeHuman export, licensed scan-based
      base, or commissioned retopo) — **not** hand-built primitives/lathes
- [ ] Base mesh is in a neutral A-pose or T-pose
- [ ] All modifiers applied except Armature (Mirror, Subsurf, etc. baked down)
- [ ] Mesh is manifold: `Select > All by Trait > Non Manifold` returns empty
- [ ] No n-gons outside flat areas (soles of feet, palm interior are fine); no
      loose verts/edges (`Select > All by Trait > Loose Geometry` returns empty)

## 2. Region topology

Check off once each region has clean quad flow and meets the vertex budget.
Budgets are targets, not hard limits — go over before going under.

| Region | Budget (verts) | Loop requirements | Done |
|---|---|---|---|
| Torso | 1,800–2,500 | loops at chest, waist, navel; spine curvature, not a straight profile | [ ] |
| Pelvis/hips | 800–1,200 | dedicated loop density independent of torso and legs (this is where `gut_volume`/`hip_width` deform) | [ ] |
| Each leg | 1,200–1,800 | loops at hip, mid-thigh, knee ×3+, mid-calf, ankle | [ ] |
| Each arm | 800–1,200 | loops at shoulder, bicep, elbow ×3+, forearm, wrist | [ ] |
| Each hand | 600–900 | real finger geometry (5 digits, 3 loops/finger min) — not a capped cylinder | [ ] |
| Each foot | 400–600 | toes present, arch has geometry to deform | [ ] |
| Neck | 300–400 | independent loop count from head and torso | [ ] |
| Head/face | 3,000–5,000 | dedicated topology for brow, nose, lips, ears, jaw, cheekbones | [ ] |

- [ ] Running total is in the **12,000–18,000 vert / 20,000–30,000 tri** range
- [ ] Joint loops verified by test-bending each region 90°+ in Edit Mode preview —
      no visible pinching or self-intersection before moving to rigging

## 3. Armature / rigging

- [ ] Standard humanoid hierarchy: Hips → Spine1–3 → Neck → Head, full L/R arm
      chains (shoulder, upper arm, forearm, hand + 5 fingers), full L/R leg
      chains (thigh, calf, foot, toe)
- [ ] Hierarchy is symmetric — bone names/counts match exactly on L and R
- [ ] Weight painted with automatic weights as a starting point, then hand-corrected
- [ ] No vertex has more than 4 bone influences (matches the GLB's `WEIGHTS_0`
      VEC4 accessor — a 5th influence will silently get dropped on export)
- [ ] Deformation test: full elbow bend, full knee bend, arm raised overhead,
      spine twist — no pinching, no volume loss, no mesh popping through itself
- [ ] Rest pose exported matches the pose the shape keys were sculpted against

## 4. Shape keys (morph targets)

- [ ] Basis shape key is the neutral rest pose with **all other keys at 0** —
      verify no influence is baked into Basis before adding further keys
- [ ] Shape keys created in the exact order and naming from
      `MORPH_TARGET_TABLE.md` (mirrors `MORPH_TARGET_NAMES` in
      `src/components/morphEngine/constants.js`)
- [ ] Every body-composition and facial-anatomy name in that table has a
      corresponding shape key — no silent gaps
- [ ] `vascularity_intensity` and `fitzpatrick_index` are **not** shape keys —
      confirm no geometry key exists with these names (they're shader uniforms,
      driven in code, not mesh deformation)
- [ ] Each shape key tested independently at influence = 1.0 — no geometry blow-up,
      no self-intersection, no normal flipping
- [ ] Combinatorial spot-check: 3–4 keys driven simultaneously at realistic
      combined values (e.g. `overall_mass` + `gut_volume` + `waist_narrow`) to
      catch keys that fight each other

## 5. Materials & textures

- [ ] Base Color texture authored (2K minimum, 4K for hero/close-up use), wired
      into Principled BSDF
- [ ] Normal map baked from high-poly detail (pores/wrinkles), wired in
- [ ] Roughness map authored/baked — skin is not uniformly rough (oilier at
      T-zone, forehead, palms)
- [ ] AO map baked and wired in (or left to bake-in-normal if using a single
      packed texture)
- [ ] Subsurface scattering configured on the skin shader (Principled BSDF's
      Subsurface input, or a thickness map if targeting a custom SSS shader in
      three.js) — flat color with zero SSS is the #1 reason synthetic skin
      reads as plastic
- [ ] Eyes, teeth/mouth interior (if present), and nails have separate material
      slots from skin

## 6. Export

- [ ] Format: `.glb` binary
- [ ] Transform: `+Y Up` (glTF/three.js convention)
- [ ] Mesh: Apply Modifiers ON
- [ ] Mesh: Shape Keys ON — confirm exporter log reports a shape key count
      matching your table, not 0
- [ ] Skinning: ON, "Include All Bone Influences" only if any vertex legitimately
      exceeds 4 weights (should be rare after clean weight painting)
- [ ] Compression: Draco ON (the app's loader already fetches a Draco decoder —
      this closes that loop)
- [ ] Materials: Export ON, confirm textures are embedded (not external `.bin`/
      `.png` references) so the single-file `.glb` pipeline still works

## 7. Sign-off

- [ ] Run `node scripts/validate-glb.js public/assets/models/humanoid-base.glb`
      — all checks pass
- [ ] Load in the app locally, confirm `useModelLoader` diagnostics report
      `health: 'healthy'` and `isDev: false`
- [ ] Visual check in all `VIEW_MODES` (SOLO/DUAL/GHOST/SPLIT/DELTA/TIMELINE) —
      new topology doesn't break any existing shader pass (heatmap, delta,
      vascularity)
- [ ] File committed with size/vert-count noted in the commit message for
      future regression comparison
