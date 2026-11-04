# Changelog

## Unreleased — local architecture graph and Firebase setup cleanup (2026-11-04)

- Inspect direct dependencies and indirect consumers with a local code graph, including type-only filtering, import-line evidence, bounded traversal and coverage diagnostics. Generated indexes remain ignored and queries reject stale source.
- Configure NiftyLens Firebase values in an ignored local environment file; tracked setup instructions now contain blank placeholders.

## Unreleased — typed records and reliable saves (2026-11-03)

- Metrics, goals, skills, notes and plans now use typed fields and related records for their stable data, retaining JSON for flexible settings and legacy extensions.
- Skills, Goals and Health+ preserve failed drafts, wait for confirmed saves and prevent duplicate submissions. Goal progress and its history save together, with safe retries.
- Health+ dialogs support keyboard navigation, and Skills controls fit narrow screens.
- Strengthened database ownership, references and monetary precision across Ultimate, Family, Equity and FinSync/OxFin. Forex cached candles retain their requested interval and timezone identity.
- Added guarded local schema-repair tooling and synthetic migration, persistence and browser checks. Existing installations still require a backup, migration-history reconciliation and rehearsal before upgrades.

## Unreleased — 3D human model plan, revision 04

- Reworked the plan page's 3D person so it reads as a human rather than a mannequin. The face now has eyes (procedural iris, pupil, clear cornea with catchlights, warm sclera, looking at the viewer), strand eyebrows and eyelashes, and strand scalp hair in ten styles; the skin has a ten-step tone scale with undertone, freckles, flush, shine, pores, light that wraps past shadow edges, glowing thin skin and natural lips.
- Added a Face and hair studio to the 3D Mirror tab: skin, hair (style, texture, shade, grey, length, density, thickness, parting, hairline, volume, shine), eyes (colour, iris and pupil size, whites), brows and lashes, nose and mouth, jaw, cheeks and ears. Fourteen face sizes are read off the drawn face in millimetres (inches in imperial); typing one adjusts the face to it or says where the limit is.
- Roadmap tab: new "Research behind the face, eyes and hair" table with sources, what the preview does with each, and what is only a design choice. The preview body is now built from `humanoid-base.glb` (2048 px skin map, 22 morphs); hair, brows, lashes and irises are drawn in the browser, so the photo hair cards and eye texture are no longer shipped.
- Tests grew from 5 to 16 (eye layout, landmarks, generated channels, readings and solver, hairline, seeded hair, strands following skin, brows and lid edge, colour tables).

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
