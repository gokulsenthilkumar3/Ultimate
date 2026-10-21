# Digital Human v2 — implementation and acceptance plan

Updated: 2026-09-11

This is the execution plan for moving GrowthTrack’s current 3D body viewer from
a stable, measurement-reactive avatar to a realistic, calibrated digital human.
It expands the 3D portion of `PORTFOLIO_3D_AUDIT_AND_IMPLEMENTATION_PLAN.md` and
uses measurable release gates in place of subjective claims of perfection.

## Current baseline

The runtime architecture is ready for a higher-quality asset:

- `HumanoidViewer.tsx` owns the product workflow, comparison modes, timeline,
  editing, persistence, and accessibility.
- `ChamberCanvas.jsx` owns GPU tiers, camera, lighting, post-processing,
  lifecycle, and telemetry.
- `CloneEngine.jsx` and `HumanoidClone.jsx` compose the views and apply morphs,
  posture, materials, hair, clothing, and body interactions.
- `metricsToBlendshapes.js` converts measurements into the current linear morph
  weights. `use3DStore.js` is the renderer state contract.
- The authored model validates at 14,517 vertices, 26,756 triangles, 20 joints,
  and 58 morph targets. The production file is 21.5 MiB. The 4.83 MiB lite file
  reduces textures but uses the same geometry.
- Male, female, and neutral presets currently resolve to one base asset unless
  an environment-specific asset is supplied.

The current pass has corrected camera framing, relaxed arm posture, hands,
eye-surface placement, scalp-fitting hair, skin shader guards, comparison and
timeline behavior, Delta legibility, 2D fallback timing, and mobile controls.
The remaining realism ceiling is the source mesh, head anatomy, deformation
quality, and measurement calibration. More shader patches cannot reliably fix
those asset-level limits.

The first v2 runtime slice is now in place: the registry accepts opt-in
`VITE_HUMANOID_V2_*` hero and mobile assets, reports the selected model version,
and the loader exposes bone counts for readiness checks. The pure
`digitalHumanV2` contract validates required anatomical parts, bone and morph
budgets, and deterministic calibration error. Until authored v2 GLBs are
provided, the shipped defaults intentionally remain the validated legacy asset.

## Product contract

The viewer must communicate three different kinds of truth clearly:

1. **Measured** — dimensions entered by the user or imported from a validated
   source.
2. **Estimated** — values inferred from related measurements, visibly marked as
   estimates with confidence.
3. **Stylistic** — hair, skin presentation, wardrobe, environment, and pose.

Current and Goal profiles remain independent. Timeline snapshots are immutable
render inputs. Missing values use documented neutral estimates and can never
produce a blank viewport, NaN, inverted surface, or hidden anatomy state.

## Delivery sequence

### Phase 0 — freeze and baseline the current renderer

Scope:

- Freeze the metric, morph, bone, material-slot, texture-channel, and model-preset
  contracts.
- Keep deterministic fixtures for empty, partial, typical, and extreme profiles.
- Capture front, side, back, three-quarter, Current, Goal, Ghost, Split, Delta,
  Timeline, mobile, and 2D fallback baselines.
- Wire every visible control to rendered behavior or remove it from the release.

Exit gate:

- Full regression suite, production build, strict desktop/mobile GLB validation,
  renderer lint, and the 8-part quality gate pass.
- No face obstruction, blank fallback, console error, context loss, or broken
  visible control in the deterministic fixtures.

### Phase 1 — author the canonical Digital Human v2 asset

Build one versioned source topology with male, female, and neutral base shapes.
The source must include anatomically credible shoulders, clavicles, face, hands,
feet, pelvis, glutes, and joint loops. Target 55–70 deforming bones with upper-arm
and forearm twist bones, finger chains, jaw, and eyelids.

Separate the body, eyes, cornea, tearline, teeth, gums, tongue, brows, lashes,
nails, scalp, hair, and garments so each can use the correct material and render
order. Produce topology-compatible hero, medium, and mobile LODs with stable
morph and bone names.

Exit gate:

- All three base silhouettes pass front, side, back, and three-quarter review.
- No seams, flipped normals, self-intersections, collapsed joints, or topology
  drift between presets and LODs.
- Every shape key passes 0 → 1 deformation and representative combination tests.

### Phase 2 — replace linear mapping with a calibrated inverse solver

Define anatomical landmarks and measurement loops on the canonical mesh. An
offline calibration tool must deform the mesh, measure the resulting surface,
and fit the inverse mapping from requested body dimensions to morph weights.
Height, mass, and body-fat estimates must be conditioned together; direct facial
measurements must drive face width/height, eye spacing, jaw, nose, and ears.

Preserve left/right inputs where provided. Add combination correctives for the
shoulder/arm, chest/ribcage, waist/abdomen, hip/thigh, knee/calf, and common pose
interactions. Keep the solver pure and versioned so historical snapshots remain
reproducible.

Use at least 12 representative calibration profiles spanning stature, body
composition, base shape, and sex, plus a separate holdout set.

Exit gate:

| Measurement | Maximum error |
| --- | ---: |
| Height | 1 cm |
| Chest, waist, hip, thigh, arm and calf circumference | 2 cm or 3%, whichever is larger |
| Breadth and depth | 1.5 cm |
| Paired left/right measurements | 1 cm |

Every supported metric must be monotonic across its legal range and affect only
its documented region plus named correctives. No output weight may be non-finite
or outside its supported bounds.

### Phase 3 — rebuild the head and surface system

- Use neutral albedo plus melanin and undertone controls, regional roughness and
  sebum masks, pore micro-normal, thickness/transmission, and restrained lip,
  nail, and vascular masks.
- Give the eye separate sclera/iris and cornea shells, iris depth, limbal ring,
  tearline, wetline, and authored blink morphs.
- Replace temporary oral primitives with authored teeth, gums, tongue, and inner
  mouth geometry.
- Use fitted scalp meshes and on-demand hairstyle GLBs with LODs. Test face,
  ear, neck, shoulder, and wardrobe clearance through the full morph range.

Exit gate:

- Face close-ups remain coherent in every environment and supported skin tone.
- Blinks preserve eye position and never expose or hide the complete eyeball.
- Hair and mouth assets have no visible clipping, helmet silhouette, or eye-line
  seam in the acceptance profiles.

### Phase 4 — build real garments and body interaction

Replace shader-discarded body copies with weighted garments that have thickness,
shape-specific correctives, and stable body clearance. Replace fixed invisible
hit boxes with body-region vertex attributes or bone-bound interaction volumes
that follow pose and morph deformation.

Support hover and focus highlighting, one-tap mobile selection, background-tap
dismissal, stable camera framing, and body-anchored measurement labels. Keep the
default workflow focused on Current, Goal, Compare, and Inspect; move precision
controls into the advanced editor.

Exit gate:

- At least 95% first-attempt region selection on the desktop and phone test set.
- No garment/body clipping across the calibrated profile and pose matrix.
- Every operation has visible feedback and keyboard and touch equivalents.

### Phase 5 — make quality progressive

- Compress geometry with Meshopt and textures with KTX2; self-host decoders.
- Load the medium model first, then promote to hero only when the device remains
  within its frame and memory budget. Load hair and garments on demand.
- Build a genuinely reduced mobile mesh instead of reusing desktop geometry.
- Export images through a temporary render target so normal rendering does not
  require a permanent preserved drawing buffer.
- Change quality tiers from measured frame time with hysteresis and recovery,
  including memory and device limits. Pause idle/off-screen rendering.

Exit gate:

| Budget | Target |
| --- | ---: |
| Initial 3D payload | 5 MB or less |
| Optional hero upgrade | 8 MB or less additional |
| Mobile model | 3 MB or less |
| Desktop p95 frame time | 16.7 ms or less |
| Mid-range phone p95 frame time | 33 ms or less |
| Visible slider response | 100 ms or less |

There must be no uncontrolled quality-tier oscillation, accumulating GPU
resources, or blank frame during LOD promotion.

### Phase 6 — release evidence

Add login-independent fixture routes and automated geometry, visual, browser,
accessibility, and soak checks. Cover every mode, LOD, base shape, skin tone,
hairstyle, wardrobe, missing-data state, rapid mode change, and context recovery.

Exit gate:

- A 10-minute interaction soak has zero browser errors and zero WebGL losses.
- Stable fixture screenshots stay within 1% approved visual drift.
- WCAG AA controls, keyboard operation, touch targets, and reduced motion pass.
- Geometry checks report no NaNs, inverted triangles, or meaningful
  self-intersections across the calibration matrix.
- A dated human review compares the avatar with consented scans or professionally
  measured references and records error against the Phase 2 thresholds.

## Implementation map

| Workstream | Primary code/assets |
| --- | --- |
| Asset variants and LOD selection | `public/assets/models`, `modelAssetRegistry.js`, `useModelLoader.js` |
| Measurement calibration | `metricsToBlendshapes.js`, new offline measurement/calibration scripts and datasets |
| Body composition and posture | `HumanoidClone.jsx`, `PostureRig.jsx`, authored corrective morphs |
| Skin, eyes, mouth, hair | `physicalSkinMaterial.js`, `UberShader.js`, new head and hair assets/components |
| Garments and hit testing | `WardrobeShader.js`, `BodyPartInteraction.jsx`, authored weighted garments |
| Camera, performance, export | `CameraRig.jsx`, `ChamberCanvas.jsx`, quality telemetry and render-target export |
| Product workflow | `HumanoidViewer.tsx`, `use3DStore.js`, physique profile persistence |
| Release gates | `src/tests`, `tests/e2e`, `validate-glb.js`, `quality-gate.js` |

## Definition of done

Digital Human v2 is ready when a person can enter partial or complete
measurements and receive a coherent Current and Goal avatar whose measured
dimensions satisfy the calibration gates; the model remains realistic across
accepted profiles, views, poses, clothing, lighting, and devices; comparisons
and timeline views never mutate live data; all interactions are inclusive and
reversible; performance budgets hold; and the automated plus human evidence is
recorded against a specific asset and solver version.
