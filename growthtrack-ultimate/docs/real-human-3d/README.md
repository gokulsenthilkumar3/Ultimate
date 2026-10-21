# Real human 3D: research, specification and implementation plan

Status: **partially implemented in the live application.** This folder originated as research on `claude/real-human-3d-plan`. Camera, quality and capture reference modules now re-export runtime policies; measurement entry is integrated into the live Measure tab and check-in form. See [implementation progress](IMPLEMENTATION_PROGRESS.md) for the current milestone, evidence and limitations. The historical audits below are baselines, not current completion percentages.

**The goal:** make the Physique 3D person read as a real human, not a model, and make the viewer behave the way its controls
promise (a fixed floor, a true 360° turntable, free orbit from above, a model that never rotates, zoom without broken pixels,
quality tiers that mean something, working auto-rotate, screenshots, sharing and presentation mode, drag-a-limb posing and
walking, a space background, friendly metric entry).

## Read in this order

| # | Document | Answers |
| --- | --- | --- |
| 01 | [Findings](01-findings.md) | What the model and viewer are today, measured, with screenshots. Why pixels break, why auto-rotate does nothing, why the camera can go under the floor |
| 02 | [Open-source landscape](02-open-source-landscape.md) | Is there a ready-made real human? Licences, what to adopt, what we must build |
| 03 | [Anatomy specification](03-anatomy-spec.md) | Every part a person has, head to toe (hair, brows, eyes, lids, nose, ears, lips, teeth, neck, torso, hands, nails, feet, body hair, wear, underlay), what real looks like, how it is built, the 79-joint rig, 52 face shapes, texture tiles |
| 04 | [Skin, hair, eyes](04-skin-hair-eyes.md) | **Skin tone, tan and melanin kept separate**, blood, hair colour, strands, eyes, nails, teeth, wet surfaces, the zoom detail ladder, garments |
| 05 | [Viewer and interaction](05-viewer-and-interaction-spec.md) | Camera modes and the hard floor, hanging model, quality governor, space skies, drag-a-limb IK and walking, high-resolution screenshots, real sharing, real presentation mode |
| 06 | [Metrics and controls](06-ui-for-metrics.md) | Text box, slider, progress bar or gauge: which where, per tab, with forgiving input and plain-language progress |
| 07 | [Asset pipeline and GLB v3](07-asset-pipeline-and-glb-spec.md) | How the model is built, packaged and proven; the conformance scorecard (9 of 23 required checks pass today) |
| 08 | [Roadmap](08-roadmap.md) | Step by step, with gates that can fail, quick wins, effort, risks, and the decisions needed from you |

## What is in this folder

| Path | What |
| --- | --- |
| `code/` | **Tested reference modules** the specs rely on: `viewer-camera`, `quality-governor`, `texel-density`, `skin-layers`, `hair-color`, `idle-motion`, `ik`, `share-export`, `metric-entry`, `anatomy-spec` (data), `v3-conformance`; plus `render-anatomy` (generates parts of 03) and `repo-facts` (reads the app's real metric keys, regions and wardrobe presets) |
| `data/` | The measured audits: GLB audit (`glb-audit.*.json/md`), v3 conformance baselines (`v3-conformance.*.md`), and the live viewer audit (`viewer-audit.json`: 7 claims, 0 pass today) |
| `evidence/` | Screenshots of the current viewer (default view, face, hand at maximum zoom, camera below the floor, top-down) |

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
everything that needs the new asset to exist.
