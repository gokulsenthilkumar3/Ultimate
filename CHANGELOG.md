# Changelog

## Unreleased — 3D human model plan, revision 04

- Added `v4Plan_3DModel.html`: the model plan reorganised by the Physique page's own tabs (Blueprint, Measurements, 3D Mirror, Targets, History) plus a Roadmap. Each tab shows what you see on the model, your numbers in plain words, what you enter, and what the plan adds.
- The page now shows a real, orbitable 3D human (generated from the app's CC0 humanoid asset) instead of flat silhouettes. Tape loops are real cross-sections of the fitted mesh, and entries are fitted until the model measures what was typed, with a visible status: fitted, model limit, roughly shown, or saved only.
- Measurements are written for people: plain names, one landmark / tool / mistake each, metric or imperial (including ft + in), enter / adjust by eye / skip, soft range hints and an optional Navy body-fat estimate.
- Added `plan-assets/` (preview model, bundled viewer, page script), build scripts under `growthtrack-ultimate/scripts/plan-preview/` (`npm run plan:model`, `npm run plan:viewer`) and `tests/plan-preview.test.mjs` (`npm run test:plan`). The previous revision, `v3Plan_HumanRealism.html`, is unchanged.

## Unreleased — runtime resilience

- Added deterministic shared design-adapter generation and drift checks for all five companion products.
- Added explicit shared recovery states and documented the verification matrix, including uncompleted acceptance work.

- Added a WebGL2 capability gate before the physique canvas mounts, a 2D fallback on capability/context failure, and an explicit retry control.
- Fixed the Projects icon's invalid DOM property.
- Weather now requests location through an explicit button; passive network diagnostics and Settings no longer request GPS.
- Missing analytics configuration or consent quietly disables optional analytics.
- Added capability tests for unavailable, blocked, lost, and working WebGL contexts and cleanup failure.

## Unreleased — iOS-inspired foundation

- Added the Ultimate visual refinement layer with adaptive glass surfaces, semantic depth, tactile controls, mobile dock polish, and reduced-motion support.
- Versioned the design-token source and documented shared component/accessibility expectations.
- Preserved Ultimate authentication, SQLite persistence, gateway routes, product handoffs, and logging interfaces.
- Added a migration guide for users and contributors.
