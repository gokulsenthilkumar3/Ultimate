# Real human 3D: research, specification and implementation plan

**Latest solver comparison (27 October 2026):** [Exact capsules and cached geodesic projection](26-analytic-capsules-and-geodesic-timing.md) evaluates curved palm/finger capsules, torso boxes and mixed colliders on the four control/problem fixtures. The best new belly/elbow candidate still has 142 garment crossings, so it remains offline and production stays at **149/150**. Cached projection alone takes 12.5–33.3 ms in these samples; full contact fitting remains much slower. No wardrobe expansion or visual acceptance is claimed.

**Current desktop continuation (27 October 2026):** [Garment classification and projection](25-garment-classification-and-projection.md) brings the production matrix to **149/150**. A certified convex-part fallback clears the two flexed-torso cases while reporting their body self-intersections separately. The belly/elbow case still has 77 garment/body crossing pairs; wardrobe expansion and visual acceptance remain gated. Bone-collider and graph-geodesic experiments stay offline. [Asynchronous fitting and editable joints](24-asynchronous-garment-fitting.md) established the worker and fitted export rigs; geometric solve time remains costly. This follows [garment contact verification](23-garment-contact-verification.md), [local skin diffusion and layered eyes](22-portrait-tissue-and-eyes.md), the [skin/hair/tee pass](21-desktop-visual-assets.md) and the [parametric export foundation](20-parametric-editor-and-export.md). Hair finishing, expressions, calibrated joint placement, personal references and physical Android acceptance remain open. The target is the user's likeness on desktop first, then Android 15; engineering checks do not establish lifelike fidelity.

**Current browser finish pass:** [Rendered anatomy and movement verification](18-private-anatomy-finish.md) includes the movable offline viewer, local pelvic refinement, 150 static fixtures and 420 intermediate motion samples. The user limited device testing to browsers. Photorealistic visual acceptance remains open; the report identifies the visible attachment seam rather than treating numerical fit as visual approval.

**Approved and in progress:** R2 and I2 target a **lifelike generic adult human**. The [new implementation record](17-human-asset-family.md) documents four actual GLBs, an editable Blender scene, new groom, public/private loading and native triangle-frame deformation. The family is selectable in the viewer and stays opt-in; finished sculpt/optics/contact fidelity and independent visual/device acceptance remain open.

**Latest anatomy continuation:** [Private anatomy](16-private-anatomy.md) consolidates the earlier plans and includes independent padded guide fitting, reversible placement, a branched body/shaft/scrotum junction, paired sac fullness and refined glans/foreskin contours. Skin, clay and grazing-light reviews accompany the measured neutral fit readout and covered exports. Authored lifelike fidelity, continuous collision/contact and device acceptance remain open; no planning score was increased.

**Latest continuation:** [Neutral model measurements and independent figures](15-model-measurements-and-clone-isolation.md). Model fit now compares three actual neutral mesh contours with entered Current/Goal targets. A skeleton clone isolation fix prevents edits from corrupting another figure or later loads. Anatomical landmark calibration and automatic fitting remain open; historical scores are unchanged.

**Latest review:** [Review 1–100: creating yourself and another person](14-review-100-and-people.md). Named people now have separate measurements, appearance, goals, poses and history; the viewer exposes 77 searchable fields and a corrected guided setup. The review rates readiness for personal human creation at **66/100**, a subjective product assessment distinct from the historical planning ledger. Exact likeness, calibrated geometry and all required assets are **not complete**. The earlier [face studio and continuation through 200](13-face-studio-review.md) remains the asset backlog.

**Current execution checkpoint: 75/100 planning points.** Direct wrist/ankle dragging, articulated fingers/toes, measured morph pivots, micro skin detail and separate eye/nail surfaces extend the reviewed 50-point baseline. See [implementation progress](IMPLEMENTATION_PROGRESS.md), [articulated surface architecture](12-articulated-surface-architecture.md), [milestone record](data/milestone-75/review.json) and [full 1–75 re-review](data/review-75/review.json). All six retained GLBs now pass project checks and the official Khronos validator; the new pair still has open authored-asset and human-likeness gates.

The historical [50-point re-review](11-review-50.md) fixes stale posed-skin bounds and unrelated-bone skin deformation, and retains four-source-asset audits and front/back evidence. Those source assets remain available with their 9/23 baseline; review fixes add no planning points. The additive 75-point pair preserves source geometry/morph/image bytes while extending rig and surface data.

Status: **partially implemented in the live application, with 75/100 planning points credited.** This folder originated as research on `claude/real-human-3d-plan`. All earlier measurement, sky, appearance, pose, IK and camera checkpoints remain integrated. The 75-point continuation adds five partial rig/surface/pointer slices, with owner values persisted through the existing database JSON and definitions in `humanSurface.json`. See [implementation progress](IMPLEMENTATION_PROGRESS.md) for all fifteen milestones and limitations. These points track an execution budget; anatomical asset quality and photorealism have separate gates. Historical audits below are baselines.

**The goal:** make the Physique 3D person read as a real human, not a model, and make the viewer behave the way its controls
promise (a fixed floor, a true 360° turntable, free orbit from above, a model that never rotates, zoom without broken pixels,
quality tiers that mean something, working auto-rotate, screenshots, sharing and presentation mode, drag-a-limb posing and
walking, a space background, friendly metric entry).

The 15-point follow-up review repairs dropped feature triangles in all four GLBs, freezes idle pose synchronously during image capture and refreshes camera regions when quality changes. It verifies preserved body/rig/texture payloads against the pre-repair assets. See the [review and verification](IMPLEMENTATION_PROGRESS.md#review-of-the-complete-15-point-milestone) and [repair evidence](data/feature-topology-repair.json). The fourth checkpoint adds the next five points without crediting those review fixes again.

The [complete 20-point review](IMPLEMENTATION_PROGRESS.md#review-of-the-complete-20-point-milestone) tightened the blink contact seam, protected newer/account-specific profile state from delayed saves, added save retry, rejected malformed undertone names and removed duplicate feature-material cleanup. Dense aperture tests check all four GLBs from front and oblique angles. That review added no points; the two new appearance checkpoints bring the tracker to 30/100.

The [35-point review](IMPLEMENTATION_PROGRESS.md#review-of-the-complete-35-point-checkpoint) rechecks the existing implementation with the iris/pupil checkpoint active. All twelve production browser flows pass together, alongside 262 focused tests. The eye changes reuse the current GLBs, maps and wet material; authored cornea/wetline geometry and calibrated optics remain open.

## Read in this order

| # | Document | Answers |
| --- | --- | --- |
| 01 | [Findings](01-findings.md) | What the model and viewer are today, measured, with screenshots. Why pixels break, why auto-rotate does nothing, why the camera can go under the floor |
| 02 | [Open-source landscape](02-open-source-landscape.md) | Is there a ready-made real human? Licences, what to adopt, what we must build |
| 03 | [Anatomy specification](03-anatomy-spec.md) | Every part a person has, head to toe (hair, brows, eyes, lids, nose, ears, lips, teeth, neck, torso, hands, nails, feet, body hair, wear, underlay), what real looks like, how it is built, the 79-joint rig, 52 face shapes, texture tiles |
| 04 | [Skin, hair, eyes](04-skin-hair-eyes.md) | **Skin tone, tan and melanin kept separate**, blood, hair colour, strands, eyes, nails, teeth, wet surfaces, the zoom detail ladder, garments |
| 05 | [Viewer and interaction](05-viewer-and-interaction-spec.md) | Camera modes and the hard floor, hanging model, quality governor, space skies, drag-a-limb IK and walking, high-resolution screenshots, real sharing, real presentation mode |
| 06 | [Metrics and controls](06-ui-for-metrics.md) | Text box, slider, progress bar or gauge: which where, per tab, with forgiving input and plain-language progress |
| 07 | [Asset pipeline and GLB v3](07-asset-pipeline-and-glb-spec.md) | How the model is built, packaged and proven; 17/23 required checks on the new preview pair, 9/23 on the retained source baseline |
| 08 | [Roadmap](08-roadmap.md) | Step by step, with gates that can fail, quick wins, effort, risks, and the decisions needed from you |

## What is in this folder

| Path | What |
| --- | --- |
| `code/` | **Tested reference modules** the specs rely on: `viewer-camera`, `quality-governor`, `texel-density`, `skin-layers`, `hair-color`, `idle-motion`, `ik`, `share-export`, `metric-entry`, `anatomy-spec` (data), `v3-conformance`; plus `render-anatomy` (generates parts of 03) and `repo-facts` (reads the app's real metric keys, regions and wardrobe presets) |
| `data/` | Historical GLB/viewer baselines, four-source-asset audits under `review-50/`, and new pair/build/conformance/verification records under `milestone-75/`. The old `viewer-audit.json` describes the original baseline. |
| `evidence/` | Screenshots of the current viewer (default view, face, hand at maximum zoom, camera below the floor, top-down) |

## Commit scope and generated files

Commit the 3D runtime modules and JSON definitions, model assets and provenance, tests, asset builders and validators, dependency manifests, architecture documents and compact review records. The small modules separate rendering, pose, capture and persistence responsibilities; their count does not add duplicate application screens. User selections remain in the existing owner database JSON.

Generated browser output, raw 1–75 validator reports and repeated screenshots stay on disk and are ignored by Git. The [compact format summary](data/review-75/format-summary.json) retains all six before/after asset hashes, validator versions and issue counts. Eight representative [preview views](evidence/review-75/) are retained in Git from 54 generated captures. Regenerate current reports with `node scripts/validate-glb-format.mjs --out .tmp/review-75-format`; historical pre-repair reports remain local. The pinned repair and integrity records support a clean checkout without requiring local backup GLBs. Keep the reference modules and canonical JSON under `data/`, because the checks read them.

The 75/100 marker measures completed planning slices. Close-up human likeness, facial shapes, mouth/scalp geometry, texture density, calibrated skin weights and optics, compression/LOD and device checks remain open. Passing the current checks does not certify a finished or photorealistic human asset.

Related tools elsewhere in the repository: `scripts/analyze-human-model.mjs` (GLB audit),
`scripts/audit-physique-viewer.mjs` (live viewer audit).

## Run the checks

```bash
cd growthtrack-ultimate
node --test docs/real-human-3d/code/*.check.mjs          # every reference module and the plan-versus-repo checks
node docs/real-human-3d/code/render-anatomy.mjs --check  # 03-anatomy-spec.md matches the spec data
node scripts/analyze-human-model.mjs                     # re-measure the shipped GLB
node docs/real-human-3d/code/v3-conformance.mjs docs/real-human-3d/data/glb-audit.humanoid-base.json --md
npm run dev                                              # then, in another terminal:
node scripts/audit-physique-viewer.mjs --url http://127.0.0.1:5173/Ultimate/wellness/physique?view=3d
```

## How your questions were read

| You wrote | Read as |
| --- | --- |
| "a new branch from `masters`" | The default branch, `main` |
| "types of wear" | The app's wardrobe presets (Gym, Casual, Formal, Swimwear, Underwear, Anatomical, Body composition) |
| "the matrix" (of skin) | Pigment layers: skin tone (constitutive melanin), tan (facultative melanin), blood and carotene, kept as separate inputs |
| "the matrix" (of metrics) | The measurement inputs: text box, slider and progress bar |
| "curls", "waistChest", "autonomies" | Glutes and hair curl; waist and chest; anatomies |
| "the 3D model hanging somewhere" | A floating display with no floor, viewable from any angle including above and below; the figure itself never moves |
| "the private anatomy" | The existing adult-gated mesh, with its existing policy unchanged |

## What is proven and what is not

**Proven by running code in this branch:** the viewer's current defects (measured in a real browser), the GLB's missing parts
and resolution (measured from the file), the camera floor rule, the quality governor, the colour model's separation of tone and
tan, hair colour ordering, blink and breathing rates, IK reach and bone lengths, share and export decisions, metric parsing and
progress, and the match between the plan and the repository (metric keys, regions, wardrobe presets, rig, audit parts).

**Not yet proven (marked as starting values in the text):** absolute skin and hair colour accuracy (needs calibration against
reference photographs, step S3), frame-time budgets on real devices (step S4), the Anny licence question (spike S1), and
the remaining face/mouth/scalp authoring and full-v3 gates. The additive preview assets now exist; their structural and behavioral checks are recorded separately in [milestone-75](data/milestone-75/review.json).
