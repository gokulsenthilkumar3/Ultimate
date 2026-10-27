# Face anatomy implementation continuation

Date: 2026-10-24. Status: **first editor/oral slices implemented and checked; final visual acceptance open**.

The owner requested, “continue implemenation of the face anatomy chnages in design, code and so on.” This supersedes the research packet's former implementation hold. It authorises work on the existing head editor and renderer with the documented research gaps retained. It is not evidence that the complete head, calibrated fitting, global representation or likeness acceptance gates have passed.

## Scope of this continuation

The first executable slices turn part of the [universal head architecture](head-system-architecture.md) into shared feature definitions and grouped, capability-aware editing. They also improve the existing procedural mouth fallback with differentiated tooth crowns and explicit head/jaw ownership. The existing person, Current/Goal, profile save, renderer and asset paths remain the integration points.

This is partial M0/M3/M6 implementation from the [delivery proposal](implementation-proposal.md). The priority remains one coherent reference-matched adult head before expanding the supported asset library. Registry entries and passing software checks are not a completed realism prototype.

## Delivered code and design

| Slice | Current behaviour | Scope and limits |
| --- | --- | --- |
| Shared artistic registry | `src/lib/headFeatureRegistry.js` defines v1 IDs, labels, aliases, help, units, bounds, groups and legacy morph bindings for 13 existing channels | This is the first executable subset, not the complete matrix or a physical measurement registry. Coupled legacy fields retain a `legacy.*` namespace instead of claiming independent anatomy. |
| Feature editor | `HeadFeatureControls.jsx` provides six groups: Head and cheeks, Eyes and brow ridge, Nose, Lips, Jaw and chin, Ears; search accepts familiar and anatomical terms | Shape strength is a unitless 0–1 value. A region can return to its existing measurement-derived shape by removing only its editable manual overrides. Undo history, individual left/right editing and calibrated physical inputs are not added. |
| Capability reporting | `headCapabilities.js` inspects finite nonzero morph displacement; the editor uses actual shape/expression targets and disables unsupported, loading, failed and sprite paths | Structural displacement support is not contact, calibration, likeness or export certification. Saved values remain retained when the selected model cannot show a control. |
| Asset capability inventory | `scripts/audit-head-capabilities.mjs` prepares eight retained/R2 public assets, checks all 13 shape bindings and three expression bindings, constructs the oral assembly and samples jaw states | [Capability report](../data/head-anatomy/capabilities.json) records GLB/source hashes and results. This inventory checks engineering support, not physical accuracy, complete expression contact or human realism. |
| Identity and expression | Starting-face presets contain supported shape channels only; group resets retain other groups and expression values | Existing person/Current/Goal and morph-override save paths remain in use. The broader observations/physical-target/custom-shape payload remains future work. |
| Differentiated dental fallback | `dentalGeometry.js` builds broad incisor edges, a canine point, two-cusp premolars and four-cusp molars, with distinct crown proportions and stable fixture records | The fixed fallback has 28 crowns in two arches. This fixture does not infer a person's dentition or provide missing/restored tooth editing, measured dental anatomy or a reference-matched oral asset. |
| Mouth attachments | `faceGeometry.js` fits the upper arch to identity skull landmarks and the head skin transform; lower teeth and tongue follow a fitted procedural jaw hinge. Gums, palate/floor backing and cavity remain separate from crowns | Lip gap controls cavity visibility rather than moving the upper dental row. Lip/nose/eye expression changes do not drag the skull-bound arch. The hinge is an engineering approximation, not externally calibrated jaw anatomy. The fallback retains six material draws. |
| Oral export | `avatarExport.js` bakes evaluated dental world positions for the visible upper and hinged lower rows, preserving geometry material groups | The regression checks a posed retained preview fixture and source-geometry isolation. It is limited geometric export evidence, not full material/LOD/viewer visual parity. |

Registry channels are the existing `eye_size`, `brow_depth`, `nose_bridge_width`, `nose_tip_size`, `lip_fullness`, `ear_prominence`, `jaw_width`, `chin_projection`, `cheekbone_width`, `forehead_height`, `temple_narrowing`, `nose_length` and `jaw_angle`. New UI grouping does not convert those weights into mm, degrees, population averages or a reconstruction accuracy score.

The upper dental envelope uses an artistic three-point skull fit. `jaw_width` and `chin_projection` do not independently refit bite geometry. Nonzero shape targets therefore do not establish dental clearance or anatomically correct bite across identity combinations; coordinated identity-to-jaw/dentition fitting remains open.

## Verification evidence

The integrated focused suite passed **48 tests across six files**:

```powershell
node node_modules/vitest/vitest.mjs run src/components/morphEngine/headCapabilities.test.js src/components/morphEngine/oralExport.test.js src/components/morphEngine/faceGeometry.test.js src/lib/headFeatureRegistry.test.js src/components/physique/HeadFeatureControls.test.jsx src/tests/metricsToBlendshapes.test.js
```

This includes 23 editor/registry/metric-mapping tests, 22 oral geometry/attachment tests, two capability checks and one posed dental export check. The oral tests use actual decompressed R2 core/hero and retained preview core/hero geometry. They cover differentiated deterministic crowns, outward geometry, skull/jaw ownership, expression/lip invariants, pose following, circumference changes, jaw reset, aperture visibility, unsupported imports and disposal.

The protected-capture regression passed separately (**one test**), making **49 passing tests in seven files across the two commands**:

```powershell
node node_modules/vitest/vitest.mjs run src/components/morphEngine/protectedCapture.test.js
```

Live images revealed defects that transform-only tests did not catch: upper crowns sat above the visible aperture, while the cavity and tongue obscured the receding lower row. The crown mounts/depth and cavity/tongue placement were corrected. Added front-ray occlusion regressions check both dental rows at jaw strengths 0.65 and 1 across retained preview and R2 core/hero assets. The later open-mouth screenshot shows visible teeth; this is a portrait check, not a calibrated dental fit assessment.

The capability inventory passed for **eight assets and 13 shape controls**:

```powershell
node scripts/audit-head-capabilities.mjs
```

The [generated report](../data/head-anatomy/capabilities.json) records source and asset hashes, all supported shape/expression channels and sampled jaw reports. Re-run it after changing those sources or GLBs; its source hashes bind it to a particular implementation.

Focused ESLint passed for the registry/editor/likeness/metric-mapping changes and oral geometry/tests. The final production build and TypeScript checks passed with exit code 0 (`npm.cmd run build`, `npm.cmd run typecheck`). TypeScript includes an appearance-field tuple correction. The final browser rerun is tracked below. Registry versioning describes adapter definitions; no personal-record schema migration is introduced.

### Browser evidence

The stable five-case browser run completed **four passes**: R2 core, R2 hero, mouth/speech behaviour, and legacy reference/upgrade behaviour. The remaining pose/reload case timed out during a 43.1-second transfer of an approximately 8.1 MB local GLB; saved pose values remained intact. The unchanged pose case then passed separately (**one pass in 31.1 seconds**).

The pose test now waits separately for the five actual rendered surfaces after reload, with a 60-second load allowance before asserting the saved pose. The final hardened targeted rerun passed **one browser test in approximately 1.2 minutes**. This changes the load-readiness assertion rather than treating slow model delivery as missing saved data. The final evidence is **four suite passes plus one hardened targeted pass across runs**; there was no single five-of-five suite pass. The Playwright-owned preview process was still tearing down when the targeted browser result was recorded.

```powershell
node node_modules/@playwright/test/cli.js test --config playwright.head-anatomy.config.ts --output .tmp/head-anatomy/final-browser
node node_modules/@playwright/test/cli.js test --config playwright.head-anatomy.config.ts --grep "selected head" --output .tmp/head-anatomy/final-pose
```

| Artifact | Review purpose |
| --- | --- |
| [Core neutral](../../../artifacts/head-anatomy/core-face-neutral.png), [core open mouth](../../../artifacts/head-anatomy/core-face-open.png) | Same R2 core face in resting and open-mouth portrait views |
| [Hero neutral](../../../artifacts/head-anatomy/hero-face-neutral.png), [hero open mouth](../../../artifacts/head-anatomy/hero-face-open.png) | Corresponding R2 hero portrait views, including visible teeth after the oral fit correction |
| [Mobile editor](../../../artifacts/head-anatomy/face-editor-mobile.png) | Narrow-viewport feature editing layout |
| [Core diagnostics](../../../artifacts/head-anatomy/core-browser.json), [hero diagnostics](../../../artifacts/head-anatomy/hero-browser.json) | Browser runtime state captured alongside the images |
| [Verification record](../../../artifacts/head-anatomy/review.json) | Source and artifact hashes, passed checks, browser rerun details and remaining visual limits |

The face images are approximately **559 × 609 portrait UI renders**, not the 1600 × 1600 matched-reference stills required by [the realism acceptance contract](audit-and-realism.md). They demonstrate current application output at that scale, not reference-matched likeness, all-angle anatomy, validated materials or complete motion/contact. No external reference or new scan is introduced by these checks.

Direct review of the current hero open-mouth image shows visibly differentiated teeth after the fit correction. The head still reads as synthetic at portrait distance and the groom remains coarse. This is a visible implementation improvement with unresolved head/material/groom fidelity, not a passed lifelike-human gate.

Focused success does not establish an independently reviewed realistic head. Historical observations stay in [the research audit](audit-and-realism.md); they describe the files inspected during that earlier pass, not an automatic revalidation of later code.

## Remaining gates

- Select and record a licensed reference set with camera, scale and uncertainty where known; retain observed versus reconstructed information.
- Produce matched front, profile, oblique, rear, top and under-chin head views in clay and materials, including a head/neck/body junction view.
- Complete a repeatable motion review with partial/full blink, gaze, smile, jaw motion, oral contact and stable groom roots.
- Author and fit eyelid/lip/nose/ear targets, independent grooms and oral assets where the current fallback is insufficient.
- Implement the broader versioned head observation/target/adapter path, calibrated landmark protocols, achieved geometry and residuals. Artistic weights remain dimensionless.
- Verify independent colours, beard/mustache regions, missing/altered components, asymmetry and future/custom asset support before advertising them.
- Measure runtime performance and export parity for the delivered scope; obtain owner visual acceptance separately from technical checks.
- Retain [research coverage gaps](coverage.md), including representative contemporary Tamil Nadu references. No community preset or demographic distribution follows from the synthetic fixtures.

No completion percentage or finished-human claim is assigned to this continuation.
