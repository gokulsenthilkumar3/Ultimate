# 3D implementation progress

Updated: 2026-10-22.

Latest review: [Review 1–100 and separate people](14-review-100-and-people.md) adds saved people, 77 searchable measurement/shape fields, nine repaired profile mappings, connected posture records and a corrected persistent setup wizard. It preserves the historical planning ledger below and records outstanding likeness, calibration and asset gates explicitly.

Latest work: [Face studio and continuation through 200](13-face-studio-review.md) records the complete 1–75 runtime review, repaired mouth/eyes and context saves, generic/personal-reference controls, speech, joint dragging and action handoff. The scope now extends to 200 acceptance checkpoints; no percentage or finished-human claim is assigned. The historical milestone ledger below remains unchanged. Asset authoring and final human-likeness gates are still open.

**Current checkpoint: 75/100 planning points.** The five new partial slices and the [articulated surface architecture](12-articulated-surface-architecture.md) extend the reviewed 50-point baseline. Full-v3 asset readiness is reported separately: the new pair passes 17/23 applicable required checks.

The previous "0% implemented" description was incorrect: the application already imports the camera, quality-governor and capture policies and includes wardrobe and skin controls. The original research README and saved audit reports describe an earlier baseline. Passing reference tests alone does not establish that a feature works in the application.

## Milestone 1: measurement controls (A7, partial) — 5 points

Implementation checklist: **5 / 5 delivered**.

| Deliverable | Runtime implementation | Evidence |
| --- | --- | --- |
| Type measurements with explicit units, decimal commas, feet/inches and pounds | `src/lib/metricEntry.js`, `src/lib/measurementEntry.js`, live 3D Measure tab | Component tests cover `5 ft 10 in`, `98,5 cm`, `180 lb`, percentages and signed angles |
| Reject impossible inputs without changing the avatar | Shared body-metric validation before existing current/goal store and save callbacks | `400 cm` rejected; draft retained with an accessible error |
| Edit precisely with the keyboard | Arrows, Shift for larger steps, PageUp/PageDown, Enter/blur to apply, Escape to cancel | Component tests cover draft stepping, cancellation, commit and external-value refresh |
| Explain goal progress with text and an accessible bar | Live Measure tab uses baseline/current/goal values and selected display units | Reference tests cover upward/downward goals, wrong direction, missing values and remaining distance |
| Save through existing profile and history paths | 3D callbacks retain canonical metric units; Measurements page shares parsing | Integration test verifies profile save and snapshot values; application build and TypeScript pass |

No new GLB geometry was authored in this milestone. Full A7 remains open: this milestone does not claim the five-person usability session or all planned tabs, gauges and estimation controls are complete.

## Milestone 2: space backgrounds (V4, partial) — 5 points

Delivered on 2026-10-21 as the next 5-point increment. Open **Physique → 3D → View → Model background → Space sky**.

| Deliverable | Runtime implementation | Evidence |
| --- | --- | --- |
| Five distinct local skies | Orbit, Nebula, Deep field, Aurora and Void studio in `spaceSkyMaterial.js`; no sky image downloads | Chromium renders and screenshots all five presets without shader or page errors |
| Save and restore the choice | Whitelisted `backgroundMode: space` and `spaceSky` in the existing viewer-preferences path | Browser reload restores Nebula; contract tests round-trip every preset and reject unknown IDs |
| Match reflections while retaining studio lighting | `SpaceSky.jsx` contributes the same sky shader at 0.12 intensity to the studio environment capture; existing key/fill/rim remain | Browser render passes; unit checks verify the shared shader and subdued intensity |
| Bound rendering work and clean up resources | Static cube maps at 128 / 256 / 512 pixels per face for LOW / MED / HIGH; rebake on selection or tier change; dispose previous target | Browser verifies LOW/MED transitions; tests cover six-face capture, disposal and renderer restoration on failure |
| Keep skies in protected captures and usable on mobile | Background belongs to the live Three.js scene; existing capture protection, floor, Floating camera and custom backgrounds remain available | Browser compares exported PNG background pixels with the preview, switches back to custom color and checks a 390-pixel viewport |

**Scope limits:** this is the static V4 slice. Aurora animation and optional HIGH-tier twinkle are deferred; all skies stay still, including under reduced motion. The <1 ms GPU gate and cross-device/Safari checks have not been measured. Existing Studio/Floating behavior is reused, not credited again. No GLB geometry, anatomy, rig or texture authoring is claimed.

## Milestone 3: human skin, eyelids and natural motion (A1/A3/A4, partial) — 5 points

Delivered on 2026-10-21 as the next 5-point increment. Open **Physique → 3D**; use **Skin** for appearance, **Face** for a close view and expression controls, and **View → Natural idle motion** for breathing, blinking and small eye movements.

| Deliverable | Runtime implementation | Evidence |
| --- | --- | --- |
| Consistent, less yellow skin and restrained surface shine | One artistic palette shared by editor and physical material; regional roughness derived from actual skin weights; skin self-emission removed | Unit checks cover all six editor/render colours, texture-relative tinting, finite regional masks and zero emission |
| Keep texture detail through appearance edits | Loader preserves original body/feature materials separately from the materials applied by the renderer; clone-owned geometry and gaze state | Browser selects all six appearances and verifies that body, eye, hair, brow and lash texture resources remain present and unchanged |
| Close the lids over the eyes | Bundled-asset corrective replaces the old whole-face blink with local lid movement; eyes remain visible behind the lids; brow cards transfer facial displacement from skin triangles | Ray tests on both bundled lite GLBs verify skin occludes the eye apertures at full blink, with zero displacement below the head; browser verifies closing and reopening |
| Add subtle, independently controlled natural motion | Deterministic per-clone sampler drives blink, small eye rotations and chest-bone breathing; wet eye material omits the incorrectly shared body normal map | Unit tests check sampling consistency, blink rhythm, bounded gaze and independent eye materials; browser observes changing eye uniforms and actual chest-bone scale |
| Respect inspection, accessibility and saved preferences | Natural motion pauses for measurements, comparisons, captures, reduced motion, paused playback and non-idle animations; explicit blink remains available | Unit checks cover every pause condition and no clock catch-up; browser checks the toggle, persistence after reload, neutral scale, measurement mode and reduced motion |

**Scope limits:** this is a visible appearance/runtime milestone on the existing assets. It does not certify photorealism or anatomical measurement accuracy. Hair still uses cards, with further artistic refinement remaining. Neutral detail albedo, authored eyelid shapes through all facial extremes, separate cornea/wetline geometry, pupil response, subsurface transport, strand hair and reference-device performance gates remain open. No new source sculpt, production rig or texture bake is claimed. The review below repairs incomplete feature topology in the shipped GLBs. The idle sampler reference re-exports the runtime implementation so the plan tests exercise the live code.

Retained browser evidence: [full body](evidence/milestone-03-human-full-body.png), [face](evidence/milestone-03-human-face.png), [closed lids](evidence/milestone-03-human-blink.png) and [mobile face](evidence/milestone-03-human-mobile.png).

## Review of the complete 15-point milestone

The follow-up review found and fixed three defects; it adds no planning points.

Visual comparison: [previous face with incomplete features](evidence/review-15-human-before.png) → [reviewed human face](evidence/milestone-03-human-face.png). The retained face, blink, full-body and mobile images above were refreshed from the verified browser run.

1. **Missing eyebrow, hair, eyelash and eye triangles.** The MakeHuman converter read `nfaces`, which is vertex valence, as polygon arity. Some four-corner faces therefore exported as a single triangle. Diagnostic renders with opaque white material and depth testing disabled confirmed real holes, rather than texture or skin intersection problems. `make_static_mesh` now determines arity from the actual corner indices. The four shipped full/lite GLBs were repaired from the verified CC0 proxies: eyebrows 138 → 192 triangles, hair 3,185 → 3,344, eyelashes 275 → 368 and eyes 1,944 → 2,040. Every existing feature position and morph is checked against the source before a repair is permitted. The body surfaces, all body morphs, rig bindings, node transforms and embedded image payloads remain byte-identical; hashes and triangle counts are recorded in [repair evidence](data/feature-topology-repair.json). Provenance hashes were updated and the release asset check passed. Brow subdivision was reduced from two passes to one and excess alpha boosting was reduced after fixing the actual topology.
2. **Motion frozen only after another frame.** A still captured while the render loop was paused could retain an incidental blink, gaze or chest expansion. `freezeIdlePose` is now a synchronous capture guard. It preserves explicit facial expression, uses resting gaze/chest scale for the image, and restores the live pose even when PNG encoding throws.
3. **Camera using a previous quality tier's surface.** Changing full/lite assets did not re-arm region sampling when measurements stayed the same. It now refreshes when the sampler changes. Browser checks compare the camera region's geometry identity with the currently rendered body after both HIGH and LOW transitions, so an old atlas cannot satisfy the test.

Review verification covers all three milestones together: **185 focused unit/integration checks**, **84 human-spec checks**, **4 Chromium browser flows** (including desktop and a 390-pixel viewport), the exporter regression, all **4 GLB validations**, **97 pinned source checks**, release provenance, TypeScript, targeted ESLint and the production build. Browser coverage includes all six skin colours, texture retention, full/lite transitions, eyelid closing/reopening, Current/Goal/Compare motion suppression, saved preferences, protected export, measurement validation/persistence and all five space skies. The existing bundle-size warning remains.

The pre-fix repository-wide baseline was also run: 815 tests passed, two unrelated assertions failed in App Hub and Finance, and two UI layout suites could not launch the missing Playwright headless-shell executable. Those failures were present before this review's runtime/asset fixes; this report does not claim a green repository-wide suite. Native-device/Safari performance, visual approval across facial extremes and anatomical calibration remain separate open gates.

Re-run the full milestone browser review with `npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts`. For the asset repair, see the reproducible source/export instructions in [scripts](../../scripts/README.md).

## Milestone 4: clothing exposure history and reliable skin editing (A1, partial) — 5 points

Open **Physique → 3D → Skin → Tan lines** and increase **Tan amount**. The new increment brings the credited execution budget to **20 / 100**.

| Deliverable | Runtime implementation | Evidence |
| --- | --- | --- |
| Choose and save clothing exposure history | No clothing pattern, Swim shorts, Tank & shorts, T-shirt & shorts, Long sleeves & trousers; the pattern describes past sun coverage independently of the outfit displayed today | Browser selects every pattern, changes outfits, reloads and verifies the saved selection |
| Bind soft boundaries to the actual body | `skinTanRegions` blends joint ownership; normalized rest coordinates follow morphs, stature and pose without recomputing from deformed bounds; the bands, tank and sleeve definitions are shared with wardrobe | Tests on all four real GLBs verify finite exposed/protected/transition regions, preserved positions and attached rest coordinates; hand/head cases prevent horizontal bands on unrelated parts |
| Protect covered skin without replacing other layers | The physical skin shader multiplies regional exposure by the clothing mask only for the tan pigment term; base colour, undertone, flush and the original albedo/normal maps remain separate | Unit checks verify protected skin has the zero-tan result while retaining flush/undertone; browser image comparison verifies lighter covered areas, mostly unchanged image pixels and unchanged base colour/maps |
| Edit Current and Goal safely, with a local reset | Saved `skinTanPattern` belongs to appearance records, not measurement database columns or check-in snapshots. Reset clears tan, flush, undertone and pattern for the edited context while retaining base colour | Browser preserves distinct Current/Goal settings in comparison, verifies the reset and keeps Goal unchanged when Current is reset |
| Retain the result through quality changes, mobile and protected export | The same shader/uniforms run on full/lite geometry and protected PNG export; no texture downloads or additional render pass | Browser upgrades/downgrades quality, verifies a protected export at least 2× the canvas drawing-buffer width with matching torso colours, and checks the controls at 390 pixels |

The delayed-save regression exposed a real editing defect: a body-profile response could hydrate the renderer before its corresponding appearance record arrived, erasing a more recent Goal edit. The viewer now keeps the latest owner-scoped draft during hydration, skips stale save revisions and serializes profile writes. A browser test deliberately holds the first body-profile response, edits additional Goal layers, then releases it and verifies that all edits persist and comparison uses separate clone uniforms. The asset URL revision also now invalidates older cached GLBs after the previous checkpoint's feature-topology repair.

This increment credits the new coverage/history integration, reset and editing reliability. Existing tan/undertone controls and the previous milestone's skin palette are not credited again. No new GLB geometry or texture bake is claimed. Exact authored garment seams, calibrated skin reflectance, neutral albedo, sun-response accuracy, subsurface transport and native-device performance remain open. These artistic tan lines use fixed neutral wardrobe styles, not the current garment's custom hem, rise or authored sewing pattern. Defaults use no clothing pattern, preserving existing saved appearances. The extra six Float32 values per body vertex require approximately 375 KiB per clone on the current 16,001-vertex body; there is no new texture allocation or render pass. This is not a measured GPU performance gate.

Retained evidence: [without clothing history](evidence/milestone-04-tan-no-pattern.png), [tank history](evidence/milestone-04-tan-tank.png), [detail](evidence/milestone-04-tan-detail.png), [Current and Goal](evidence/milestone-04-current-goal.png), [protected export](evidence/milestone-04-protected-export.png), [mobile controls](evidence/milestone-04-mobile-controls.png).

Verification: **213 focused tests across 37 files**, **84 human-spec checks**, **six Chromium flows**, all **four GLB validations**, release asset provenance, TypeScript, targeted ESLint and the production build passed. Five browser regression flows passed together; the final skin export/persistence flow passed in a focused rerun after the test distinguished CSS screenshot rounding from the physical canvas width and waited for the reloaded body. The focused suite was run separately from the WebGL browser job because the existing measurement component test can exceed its five-second timeout under concurrent load. No product timeout or assertion was relaxed. The existing 1.29 MB Three.js bundle warning and the previously documented unrelated repository-wide failures remain; there is no new claim of a fully green repository suite or native-device performance approval.

Reproduce the new unit checks with `npm.cmd exec -- vitest run src/components/body3d/skinTanLines.test.js src/components/physique/SkinLayerControls.test.jsx src/components/morphEngine/garmentGeometry.test.js src/tests/physiqueProfile.test.js --maxWorkers=2`. Run this checkpoint in the browser with `npm.cmd exec -- playwright test --config playwright.skin-layers.config.ts`, or all four checkpoints with `npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts`.

## Review of the complete 20-point milestone

The review covers all four checkpoints together and adds no planning points. It found and corrected five issues:

1. **A fine opening in a closed blink.** The first ray tests checked the centre of the opening, missing the actual contact seam. A denser aperture grid found uncovered eye samples at the seam in front and oblique views. The local corrective now gives the lid margins 0.35 mm of contact on either side, with the upper surface slightly in front of the lower one. Rows still retain their spacing instead of collapsing onto a single plane. A new regression checks front and ±0.6-radian views on all four shipped full/lite GLBs, requires genuinely visible eye samples in the open pose and verifies skin occludes them at full closure. The eyes remain present. This improves the existing runtime corrective; authored corrective shapes across all facial extremes are still a separate gate.
2. **A delayed profile response could replace a newer account or snapshot.** Body-profile writes previously applied success and rollback unconditionally. They now use the store's session/snapshot guard, a shared write queue for separate physique editors, and an identity check before replacing an optimistic snapshot. All six new regressions failed before the fix and now pass, covering success, failure, account replacement, queued requests and newer snapshots.
3. **Failed physique saves had no direct retry.** The viewer now offers **Retry physique save** while preserving the visible draft. A browser test rejects the body-profile request, verifies the skin stays as edited, changes the space background, retries, then reloads to verify both the skin and background persisted.
4. **Malformed undertone names could reach the shader as objects/functions.** The lookup now accepts only its own named entries, so legacy values such as `constructor` and `__proto__` fall back to neutral. Unit tests reproduce the old nonnumeric values; the browser's failed-save/retry fixture also starts with a malformed undertone and verifies finite, neutral uniforms and no shader errors.
5. **Eye/hair feature materials were disposed twice.** The duplicate cleanup effect was removed, leaving one owner for each feature material lifecycle.

The intermittent measurement integration-test timeout was also investigated. Its whole-page queries scanned every control in collapsed measurement groups, and its final status assertion could run before the save completed rendering. Queries now target the essential-measurement fieldset, retain an explicit visible-submit check and await the success status. The isolated test fell from roughly 6.4 seconds to 2.0 seconds on this machine; its five-second limit and canonical-value/profile/history assertions were kept.

Visual review includes the [oblique face](evidence/review-20-face-oblique.png), [closed lids](evidence/review-20-blink-oblique.png), [back view with tan history](evidence/review-20-back.png), and [save recovery control](evidence/review-20-save-retry.png). The [previous closed-lid image](evidence/review-20-blink-before.png) is retained for comparison. Earlier checkpoint images were refreshed from the final browser review.

Final review verification: **274 focused tests across 39 files**, **84 human-spec checks**, and **all eight Chromium flows in one combined run** passed, together with TypeScript, targeted ESLint, the production build, all four GLB validations and release asset provenance. The browser fixtures intercept every API request and do not write the owner's database. The existing Three.js bundle-size warning remains; the unrelated repository-wide failures documented in the 15-point review were not included in this focused pass.

The credited budget remains **20 / 100**. These are review fixes within the delivered scope. Reference-device/Safari performance, calibrated anatomy and skin reflectance, authored garment-seam masks, advanced face extremes and the rest of the 100-point asset plan remain open. No new GLB geometry, source sculpt, rig or texture bake is claimed.

Reproduce the combined browser review with `npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts`. The additional store regressions are in `src/store/__tests__/bodyProfilePersistence.test.js`; dense closure checks are in `src/components/morphEngine/humanAppearance.test.js`.

## Milestone 5: saved hair shades, greying and thinning (A2, partial) — 5 points

Open **Physique → 3D → Hair**. Named shades and a custom colour, density, greying and a saved pattern seed now operate on the existing authored hair cards. The inspector edits the selected Current or Goal context; previously this tab always edited Current. Defaults preserve existing appearances.

Hair thinning uses a stable integer hash over rest UV columns. The visible material and its directional/point-light shadow materials share the same cutout, so removed strands do not cast a full-hair shadow. Scalp coverage follows density and its colour follows greying. Texture resources stay shared and unchanged; materials and shadow materials belong to each clone and are disposed together. A zero density hides the cards and makes the scalp cap transparent. Saved values use the existing body-profile/appearance JSON paths; there is no new schema or static per-user record.

Browser evidence checks visible brown-to-silver and full-to-zero-density image changes, saved seeds after reload and independent Current/Goal uniforms. The feature adds no new geometry or texture request. This is customization of the current card asset, not the planned strand-hair authoring, new hair lengths or beard assets. Hairline/phenotype authoring, alpha-edge refinement and reference-device performance remain open.

Retained evidence: [brown hair](evidence/milestone-05-hair-brown.png), [silver strands](evidence/milestone-05-hair-grey.png), [zero density](evidence/milestone-05-hair-zero-density.png), [Current and Goal](evidence/milestone-05-hair-current-goal.png).

## Milestone 6: seeded freckle pigment (A6, partial) — 5 points

Open **Physique → 3D → Skin → Freckles**. Density, radius, contrast and a pattern seed control cosmetic pigment independently of base tone, tan, flush and undertone. **Hide freckles** changes only density and retains the chosen size/seed. Current and Goal have separate saved values; absent Goal properties inherit Current through the existing renderer merge.

The physical skin shader projects the saved pattern onto rest coordinates in glTF metres, blending with rest normals and the existing exposure weights. Jittered centres, varying radii and elliptical shapes remove the regular grid found during the first visual review. Neighbour sampling retains complete marks across cell edges. Derivatives fade unresolved marks at a distance. There is no texture download or additional render pass, but enabled freckles add fragment work; no reference-GPU performance result is inferred.

Browser checks verify changed skin pixels, unchanged base tone, saved values after reload, full/lite quality transitions, protected PNG export, Current/Goal isolation and 390-pixel controls. Integer arithmetic tests check signed rest-space cells and seed limits against an independent unsigned arithmetic reference. This is artistic pigment, not a medical model or the complete authored Poisson-disc, mole, scar, vein and stretch-mark pipeline. Authored region masks and visual approval on native devices remain open.

See [appearance architecture](09-appearance-architecture.md) for the UI → owner-scoped draft → API → Prisma/SQLite → clone material → protected-capture flow and the commit inclusion decision. `appearanceDetail.json` defines bounds, shades, defaults and pattern settings; selected user values remain database records. A separate integration test reconnects to a temporary SQLite file to verify queued store serialization, Current/Goal values, preservation of viewer preferences and owner separation. The HTTP boundary is a test adapter; browser fixtures verify the live UI request/payload flow without opening the owner's database.

Retained evidence: [without procedural freckles](evidence/milestone-06-freckles-hidden.png), [maximum-density inspection](evidence/milestone-06-freckles-face.png), [protected export](evidence/milestone-06-protected-export.png), [mobile controls](evidence/milestone-06-controls-mobile.png).

## Review of the complete 30-point checkpoint

Verification on 2026-10-21: **249 focused tests across 46 files**, **84 human-spec checks**, **all ten Chromium flows together against an isolated production build**, TypeScript, targeted ESLint, the final production build, all four GLB validations and asset provenance passed. The 248-test broader 3D run and the one-test measurement integration run were separated to retain that test's existing five-second timeout. The SQLite persistence check is included in the focused count. The repository-wide suite was not claimed green; earlier unrelated failures and native-device/Safari gates remain as documented above.

The first combined browser run used the previous development-server setup: seven flows passed, then the server disappeared during a quality switch and later navigations failed. The milestone runner now creates a separate root-based production build under `.tmp/milestone-smoke-dist` and starts its own preview on `GROWTHTRACK_SMOKE_PORT` (default 5177), with reuse disabled. All ten flows passed together on that setup, including the interrupted Current/Goal quality switch and save-retry/sky checks. Windows restricted Playwright's process-tree termination at teardown; the test-owned preview was stopped to let that run finish. The final launcher uses Vite's build/preview API in one process and a run-specific token to close its localhost preview from global teardown. A focused measurement browser rerun verified build, rendering, persistence and automatic shutdown, exiting successfully in 34.6 seconds without manual process cleanup. Normal workspace entry points and finance apps are unchanged. The existing large Three.js chunk warning remains.

The commit review found no eligible 3D additions to import; all finance additions, workspace replacements and deletion entries were excluded. No current tracked files were deleted. No new source mesh, rig, GLB or texture bake was authored for these two checkpoints; the prior local model repairs were preserved. The [review record](data/milestone-30-review.json) distinguishes planning points, checks and remaining gates.

Re-run the complete browser smoke with `npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts`. Run the new focused checks with `npm.cmd exec -- vitest run src/lib/appearanceDetail.test.js src/components/physique/AppearanceDetailControls.test.jsx src/store/__tests__/appearanceDatabase.test.js --maxWorkers=2`.

## Milestone 7: iris appearance and exposure-responsive pupils (A3, partial) — 5 points

Open **Physique → 3D → Face → Eye appearance**. The eye editor is now reachable in the normal inspector rather than only the inactive settings drawer. Seven named iris shades, a custom colour, iris detail, a dark limbal-ring toggle and an iris-pattern seed edit the selected Current or Goal context. Cosmetic pupil diameter can be fixed or follow the scene exposure; its saved fixed value is retained while response mode is active.

| Deliverable | Runtime implementation | Evidence |
| --- | --- | --- |
| Derive eye detail from the loaded asset | Each eye's bounds and forward cap define the rest-space iris plane; the same coordinates follow morphs and gaze | All four shipped GLBs produce finite frames with unchanged position buffers; browser checks visible pupil-size pixel changes |
| Render independent iris and pupil layers | Linear selected pigment, filtered radial fibres, collarette, optional limbal ring, a seeded phase and a round pupil on the existing wet material | All seven shades reach the applied material; Current/Goal comparison checks separate colour, detail, ring, seed and diameter |
| Respond to actual scene exposure | `renderer.toneMappingExposure` maps the viewer's existing exposure range to bounded cosmetic pupil sizes; exponential convergence smooths changes | Unit tests cover monotonic response, fixed-size independence, equal results at 30/60 steps, no overshoot and invalid values; browser checks low/high exposure targets |
| Preserve inspection, quality and protected capture | Reduced motion, measurement inspection, paused playback and captures settle immediately; synchronous capture guard restores the live transition even after encoding failure | Unit capture checks cover both success and thrown PNG encoding; browser tests full/lite transitions, reduced motion and a protected PNG at least 2× the physical drawing-buffer width |
| Store choices using the existing profile flow | Existing eye-colour/rim columns remain mapped; new mode/diameter/detail/seed use Current/Goal JSON records | Browser verifies reload, retained fixed size and separate Goal edits; real SQLite reconnect test retains distinct eye records and a false ring value |

Controls, presets, defaults, pupil limits and response settings live in `src/config/appearanceDetail.json`. Selected user values remain database records; no schema migration or owner-database rewrite is required. See the [architecture](09-appearance-architecture.md#eye-rendering-and-capture) for the data/render/capture flow.

Retained evidence: [small pupil](evidence/milestone-07-small-pupil.png), [large pupil](evidence/milestone-07-large-pupil.png), [Current and Goal](evidence/milestone-07-current-goal.png), [dim exposure](evidence/milestone-07-dim-exposure.png), [bright exposure](evidence/milestone-07-bright-exposure.png), [protected export](evidence/milestone-07-protected-export.png), [390-pixel controls](evidence/milestone-07-controls-mobile.png).

This is partial A3 runtime delivery on the existing forward-facing paired eye meshes. Existing wet material, authored maps, gaze and blink correction are reused and receive no additional points. The exposure control is an artistic setting, not a lux measurement or physiological calibration; displayed pupil millimetres are cosmetic parameters. Separate corneal/wetline geometry, authored eye parts, advanced gaze/lid correctives, anatomical calibration and reference-device/Safari performance remain open. No GLB geometry, rig or source texture was changed in this checkpoint.

## Review of the complete 35-point checkpoint

The new eye flows and the existing ten browser flows passed together against the isolated production build: **12 Chromium flows in 4.7 minutes**, including desktop/mobile controls, distinct Current/Goal records, all five skies, measurement validation/persistence, skin maps, tan history/reset, hair, freckles, idle motion, dense blink review, oblique views, quality transitions, delayed saves, failed-save recovery and protected exports. Automatic preview shutdown completed without manual process cleanup.

The focused checks passed **262 tests across 47 files**: 261 in the broader run, plus the measurement integration test run separately with its existing five-second test limit. This includes real Prisma/SQLite reconnect coverage for eye settings alongside the earlier appearance fields. All **84 human-spec checks**, including documentation links and retained evidence, passed. TypeScript, targeted ESLint, the normal `/Ultimate/` production build, all four GLB validations and asset provenance passed. The existing large Three.js chunk warning remains; the earlier unrelated repository-wide failures were not included in this focused verification.

The first new browser attempt stopped at surface readiness while the initial physical-eye shader compiled. The trace showed the evaluation waiting during first rendering, with no shader error. The shared browser helper now gives the five rendered surfaces the same 45-second asset-readiness budget already used for the canvas, rather than the five-second assertion default. No product timeout, measurement-test limit, surface-count assertion or appearance assertion was relaxed. All twelve flows then passed in the combined run. This is a test-host readiness correction, not a reference-GPU performance result.

The existing 1–30 point implementation was rechecked with the new layer active; no tracked files were deleted and no finance application files were changed. The [35-point review record](data/milestone-35-review.json) records the scope and open gates. Reproduce the combined smoke with `npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts` and the new focused checks with `npm.cmd exec -- vitest run src/lib/eyeAppearance.test.js src/components/morphEngine/eyeMaterial.test.js src/components/physique/AppearanceDetailControls.test.jsx src/store/__tests__/appearanceDatabase.test.js --maxWorkers=2`.

## Milestone 8: independent saved joint poses — 5 points

Open **Physique → 3D → Pose** in Current or Goal. Enable **Use saved pose**, choose a starting pose, then edit local pitch, turn and roll on the supported head, neck, spine, arm, leg and foot joints. Fourteen joint definitions, bounds and four starting poses live in `src/config/poseStudio.json`; selected values save independently under `viewerPreferences.poseStudio.current` and `.goal` in the existing database JSON. Missing poses start disabled, rather than inheriting another context.

The existing `PostureRig` remains the only skeleton transform owner. Saved poses restore rest transforms before adding measured posture and saved angles. Disabling/resetting a pose restores all touched bones; measurement/anatomy inspection and comparisons use immediate neutral transforms, and timeline/snapshot previews suppress poses. Natural idle and motion previews pause while a saved pose is active. Existing animation presets receive no new credit. The editor explains precedence, has keyboard controls and exposes save retry. Layout reset preserves saved poses and views, and account changes discard old-owner drafts.

Visual inspection of a 55° head turn exposed a pre-existing mismatch: body face weights included shoulders while eye/hair accessories followed Head rigidly. A bounded repair copies the loaded default clone's head/neck skin weights, makes facial vertices rigid to Head and blends the lower neck using measured joint separation. Unrelated vertex weights, source GLBs, rest positions, morphs and custom assets remain unchanged. Tests cover the repair on all four assets; this is not a newly authored/calibrated full rig. See [architecture and persistence flow](10-pose-camera-architecture.md).

## Milestone 9: saved wrist and ankle reach — 5 points

The Pose tab can position either wrist or ankle with three keyboard-operable target sliders. Targets begin at the actual rendered endpoint, quantized to the JSON-defined step. Saved offsets are relative to the current shoulder/hip and normalized by the limb's measured upper-plus-lower length. The runtime solves exact two-bone geometry in the authored rig frame, then aims each bone in its parent frame; viewer height scaling and outer rotation do not distort the solution.

Reachable targets meet the endpoint within the tested 1 mm bound without stretching bones. Out-of-range or over-folded targets clamp to reach/bend limits and **Check reach** explains the remaining error. Collinear poles use a nondegenerate perpendicular fallback. Cyan/amber endpoint markers are read-only; protected export hides them, settles the static pose synchronously and restores transforms/visibility afterward. Surface regions resample after pose changes. Saved endpoints survive reloads and quality replacement, while Current/Goal records and body measurements stay separate.

The tests use actual hierarchies/translations from all four GLBs and check endpoints, preserved lengths, bounds, finite full-body skin positions, neutral reset and capture restoration. Pointer dragging, FABRIK head/hip manipulation, collision limits, authored hand/finger/toe controls and walking foot lock remain open; this is partial V6a, not completion of its original drag-and-walk gate.

## Milestone 10: named saved camera views — 5 points

Open **View → Saved camera views**. Orbit, pan and zoom the real camera, name the view and save it. Up to eight views can be opened, renamed and removed. A canvas-scoped bridge reads actual camera/OrbitControls state. The saved record contains angles, distance divided by evaluated model height and a similarly normalized target, rather than preset labels or fixed body coordinates. Recall re-evaluates current model size, quality, floor, camera-mode and texture-density limits. Active limits can adjust a saved view. Manual orbit/pan, focus, fit and presets release the bookmark override.

Records use the same database-backed `viewerPreferences` queue as posing. JSON defines record/name/bounds limits. Layout resets retain the collection, account changes clear old active requests, and comparison/timeline/sprite views disable save/open. Browser checks exercise actual orbit and pan recall before and after reload, record rename/removal, and floor/top constraints. Existing camera presets, floor rules and presentation controls receive no additional points. Native-device camera gestures/performance remain open.

## Review of the complete 50-point checkpoint

Verification on 2026-10-22: **294 distinct focused tests across 51 files**, **84 human-spec checks**, **all 15 Chromium flows together in 6 minutes**, TypeScript, targeted ESLint, the normal production build, all four GLB validations and asset provenance passed. The isolated preview shut down automatically. The measurement integration test ran separately as before. One existing procedural anatomy-texture test exceeded its unchanged five-second limit while competing with browser rendering; it passed alone without changing a test or product timeout. The repository-wide suite is not claimed green. The existing large Three.js chunk warning remains.

The three new flows run with the existing twelve in `playwright.milestone-review.config.ts`, against the isolated production build and test-owned API fixtures. They check actual joint quaternions and endpoints, Current/Goal records, neutral measurement/comparison restoration, reloads, quality changes, mobile controls, protected export and actual camera recall. The persistence test reconnects to an isolated Prisma/SQLite database with pose, endpoint and camera-view records alongside the earlier appearance fields. Neither fixture opens the owner's database.

The three new browser flows passed again in 1.2 minutes after the final pose-value invalidation refinement. They retained verified drawing-buffer images and included the settled manual-pan → preset → bookmark recall regression. Both the combined and focused production previews closed automatically. No unrelated layout/background edit needs to schedule a pose-region update simply because validated preferences were cloned.

The runtime head-binding repair came from screenshot review, beyond the original joint assertions. The browser test also waits for actual lower-body painted pixels when scrolling back from the long inspector: applied joint metadata alone can describe a previously paused frame. Model evidence saves that same verified drawing-buffer PNG after test-only GPU completion. Some displayed image previews were incomplete; an independent decode of the retained PNG files confirms full-body pixel extents, including thousands of lower-body pixels in all three model images. No image pixels are edited and the application render loop adds no GPU synchronization. Endpoint assertions check the requested normalized position as well as error. Asset quality transitions verify a replaced geometry instance; the current full/lite assets both contain 16,001 body vertices, so a guessed lower vertex count would be an invalid gate.

Retained visual evidence: [head turn with attached eyes](evidence/milestone-08-head-turn.png), [full-body wrist reach](evidence/milestone-09-wrist-reach.png), [posed protected export](evidence/milestone-09-protected-export.png), [390-pixel controls](evidence/milestone-09-mobile-controls.png), [recalled camera orbit](evidence/milestone-10-camera-oblique.png).

See the [50-point review record](data/milestone-50-review.json) for final counts, retained evidence, scope and open gates. No current tracked files were deleted and finance applications remain unchanged. No new GLB geometry, source rig, texture bake or calibrated anatomy is claimed by these checkpoints. The earlier repository-wide failures and native-device/Safari gates remain outside the focused verification.

## Re-review of the complete 50-point checkpoint

The [50-point re-review](11-review-50.md) found and repaired stale posed-skin bounds, joint-origin weights that deformed the torso/hand during arm rotation, and a camera-frame integration defect exposed by the new bounds. Binding uses measured rig segments and a smooth shoulder-span gate defined in JSON; bounds follow pose, morphs, capture and restoration. The loader now keeps a precise neutral camera reference independent of conservative animation envelopes and outer viewer transforms.

The fresh focused regression suite passes **314 tests across 54 files**, including four-asset bounds, actual triangle picking, combined morphs/transforms, hand/torso drift, source-buffer preservation and camera-normalization invariance. The measurement integration test runs separately. Final browser/build/check results and before/after evidence are recorded in the [re-review record](data/review-50/review.json).

The final combined production smoke passes **all 16 Chromium flows together in 6.3 minutes**, including camera recall after reload and the new raised-arm/front/back/export/quality path. The first combined run exposed the camera-frame coupling (15 passed, one failed); it was repaired with the neutral reference before the final green run. TypeScript, targeted ESLint, the normal production build, 84 reference/specification checks, four GLB validations and provenance checks pass. The isolated preview closes automatically; the existing large Three.js chunk warning remains. The repository-wide suite is not claimed green.

Fresh audits of all four source assets still pass **9/23 applicable full-v3 required checks and 0/5 recommended checks**. These repairs retain 50/100 planning points and do not establish finished anatomical assets. No source GLB was changed during this re-review. Full artist-authored weights, twist/shoulder correctives, fingers/toes, face shapes and the other asset/device gates remain open.

## Milestones 11–15: articulated and surface preview — 25 points

The authorized 50 → 75 continuation delivers five partial five-point slices on 2026-10-22. Open **Physique → 3D → Pose → Use saved pose** for direct wrist/ankle dragging and hand/toe controls; use **Skin → Skin surface detail** for pore strength. The male preset uses the new additive full/lite pair. Existing custom choices and the covered female/neutral fallback remain available.

| Milestone | Delivered behavior | Verification and limits |
| --- | --- | --- |
| **11 · Pointer reach — 5** | Four captured wrist/ankle handles project onto the view plane, pause the real camera and use the existing measured two-bone solver and serialized save path. Sliders retain keyboard/depth control. Escape, lost capture, blur and tool/context/owner replacement cancel the session. | Actual browser dragging reaches the fixture target within 1 mm, leaves camera position unchanged, restores the previous target on Escape and reloads the saved target. This does not add general collision, multi-pointer posing, head/hips FABRIK or walking foot lock. |
| **12 · Articulated rig — 5** | New `humanoid-preview-75.glb` and `-lite.glb` extend 20 joints to the specified 79 names, with 30 finger joints, 12 toe joints and generated digit weights on 4,948 real skin vertices. Saved per-side hand shapes/strength and toe curl remain independent in Current/Goal. | Both assets pass deformation/neutral-reset tests; browser checks pose quaternions, independent contexts, reload, neutral Measure mode and mobile controls. The **Fist study** is an artistic preview; authored contact, collision, twist/shoulder weights and anatomical calibration remain open. Jaw/tongue/eye joint names do not establish finished facial animation. |
| **13 · Shape-dependent pivots — 5** | Measured region and joint-offset metadata follows 41 non-empty physical morphs. Runtime changes relative pivots with segment-relative limits, updates inverse binds, compensates rigid head attachments and retains dynamic skin bounds. | Tests verify actual pivot movement, neutral skin equivalence under external transforms, head attachment compensation, posed vertices inside bounds and complete reset. These are geometric estimates, not clinical or artist-approved joint fits. |
| **14 · Micro surface data — 5** | A deterministic periodic 256-pixel height/normal resource uses physical scales from JSON. Skin uses height-derived relief and roughness with pixel fade and a saved pore-strength control. The build measures tangents, region/tile identifiers and local UV scale. | Seed/reproducibility, tile-boundary, packaged-byte, shader/control/persistence and browser image-change checks pass. LOW quality pauses the layer. The legacy atlas remains: true regional texture density, head/hand refinement, KTX2 and meshopt are open. |
| **15 · Separate surface parts — 5** | Two eye caps, two tearline strips and twenty projected nail patches carry their own physical materials and non-empty morph subsets. Cornea follows gaze and hides on full closure; still capture freezes/restores live state and excludes pose handles. | Assets, real skin projection, outward cornea normals, linear glTF material colour factors, material/visibility/gaze restoration, actual blink and protected export are tested. The optics are a preview approximation; mouth/scalp geometry and calibrated refraction remain open. |

`humanSurface.json` owns definitions, limits, source/sculpt inputs and surface policy. User values remain in the existing owner-scoped Prisma `User.physiqueTargets` JSON through `/api/physique_targets`; there is no new static user profile. The SQLite test writes the new appearance/pose fields, reconnects and checks another owner remains unchanged. The builder checks the pinned CC0 source hashes and assessed input GLBs. It does not use the AGPL distribution weight file.

All original body positions, normals, UVs, topology, 58 morph deltas and embedded source image bytes remain unchanged in the derivatives. Original model files remain available. Nail rays that miss use closest-triangle projection and barycentric transfer; no helper-plane fallback floats free of the body. Integration review also corrected doubled head-accessory movement, optical parts overwritten by skin materials, surface winding, unnecessary empty part morphs, and non-linear glTF colour factors.

The complete focused suite passes **337 tests across 62 files**: 336 in the main run and the measurement integration separately. TypeScript, targeted ESLint, the normal production build, **84 reference/spec checks**, **six GLB validations** and release provenance checks pass. The combined production smoke passes **19 Chromium flows together in 8.8 minutes**, rechecking earlier measurement, sky, skin, hair, freckle, eye, pose, IK, camera, retry, quality and export behavior. Final per-asset hashes and any targeted follow-up are in [the verification record](data/milestone-75/review.json). The large Three.js chunk warning remains; the repository-wide suite and native-device/Safari performance are not claimed green.

Fresh audits of both new files pass **17/23 applicable full-v3 required checks and 0/5 recommended checks**. Full is 24,817,392 bytes and lite 7,902,880 bytes; both retain the same 29,682-triangle body. Lite is not the planned compressed 3 MiB core or a new geometric LOD. The original four-file 9/23 audit remains a historical baseline. The remaining required gaps are the 52 face shapes, texture density and teeth/gums/tongue/scalp meshes. Structural passes do not certify anatomy or pose quality.

## Re-review of the complete 1–75 checkpoint

This review adds no planning points. It covers all six retained full/lite GLBs, their selected-asset runtime path, neutral and posed rendering, eyelid closure, protected export and the official Khronos glTF validator. The detailed [review record](data/review-75/review.json) includes before/after validator reports and per-model browser captures from front, back, side, oblique, head-turned and closed-eye views.

The official validator found defects missed by the project validator: missing bounds on morph POSITION accessors, missing tangent frames for normal-mapped legacy parts, invalid empty child lists, misaligned packed scalar attributes, zero-weight joint slots with nonzero joint indices, missing buffer-view targets and non-schema mesh properties. These are fixed without changing original surface positions, normals, UVs, indices, morph deltas, images or active skin influences. Original source files remain in the repository, with pre-repair GLB backups in `.tmp/review75-before/`. All six assets now pass both project and Khronos GLB validation; Khronos reports zero errors and warnings. Retained informational `UNUSED_OBJECT` notices cover resources used by the viewer's texture-material path.

The browser review caught two runtime defects: explicitly selecting a bundled GLB bypassed corrective rig/eyelid preparation, and lash cards crossed the eyelid at full closure. Bundled-model preparation now keys off the reviewed-asset registry, and lash cards hide only near full closure using the JSON threshold. All six assets pass the repeated multi-angle, 30° head turn, blink/reopen, and protected-export browser flow. TypeScript, targeted lint, production build, 84 plan/spec checks, release asset provenance and 68 focused model/feature regressions pass.

The different-angle review confirms a coherent human-shaped body and head turn across full/lite models, but the face still reads as a stylized mannequin in close views. This review does not claim photorealism or completed human likeness. The v3 score remains **17/23 required, 0/5 recommended** for the new pair; authored facial shapes, teeth/gums/tongue/scalp, measured regional skin density, better authored hand contact and calibrated anatomy remain open.

Updated preview asset sizes are 25,047,568 bytes full and 8,133,056 bytes lite. The review did not delete any file or edit finance applications.

Retained fixture views: [layered eye/skin](evidence/milestone-75-layered-eye.png), [closed eye](evidence/milestone-75-closed-eye.png), [articulated side](evidence/milestone-75-articulation-side.png), [hand inspection](evidence/milestone-75-hand-close.png), [toe inspection](evidence/milestone-75-toes-close.png), [390-pixel controls](evidence/milestone-75-controls-mobile.png), [protected export](evidence/milestone-75-protected-export.png). Screenshots use completed original WebGL readback in the tests; synchronization is absent from the application render loop. The [architecture](12-articulated-surface-architecture.md) documents source/build, owner/database, pointer, morph/pose/bounds and capture flow with primary references.

## Progress accounting

The fifteen delivered checkpoints are assigned **75 planning points out of 100**. The latest continuation uses the final five viewer-reserve points for direct reach dragging and twenty of the thirty asset-reserve points for four partial rig/surface slices. Review repairs receive no extra points. This is a planning estimate, not a measurement of mesh completion, elapsed effort, photorealism or all historical implementation. Existing animation presets, camera controls and prior review fixes have not been rescored. The remaining 25 points cover measurement/user validation (5), asset authoring (10), and cross-device/privacy/final conformance (10).

`[███████████████░░░░░] 75 / 100 planning points credited`

| Area | Budget | Credited to date |
| --- | ---: | ---: |
| Measurement entry, validation, keyboard and goal feedback | 5 | 5 |
| Remaining measurement UX and user validation | 5 | 0 |
| Static space backgrounds, saved selection, lighting and capture integration | 5 | 5 |
| Independent saved joint poses | 5 | 5 |
| Saved wrist/ankle reach with bounded two-bone IK | 5 | 5 |
| Named database-backed camera views | 5 | 5 |
| Direct wrist/ankle pointer posing and camera ownership | 5 | 5 |
| Skin, eyes, eyelids, texture retention and natural motion milestone | 5 | 5 |
| Clothing exposure history and reliable skin editing | 5 | 5 |
| Saved hair shades, greying and thinning | 5 | 5 |
| Seeded freckle pigment and context-safe editing | 5 | 5 |
| Iris appearance and exposure-responsive pupils | 5 | 5 |
| Asset authoring: rig, face shapes, parts, textures, morphs, LODs and garments | 30 | 20 (partial slices) |
| Cross-device performance, privacy and final conformance | 10 | Not reassessed |
| Total | 100 | 75 |

The allocations above are tracking weights and can be revised when the full backlog is estimated. Asset readiness is reported separately using freshly generated conformance results; the final asset and device gates remain mandatory.

## Reproduce

From `growthtrack-ultimate`:

```powershell
npm.cmd exec -- vitest run src/components/ui/MeasurementInput.test.jsx src/components/physique/MeasurementWorkbench.entry.test.jsx src/components/physique/physiqueWorkspace.test.js
npm.cmd run test:human-spec
npm.cmd run typecheck
npm.cmd run build
node scripts/build-human-75.mjs
npm.cmd run validate:glb
npm.cmd run check:assets -- --release
npm.cmd exec -- vitest run src/components/morphEngine/human75Assets.test.js src/components/morphEngine/poseDrag.test.js src/components/morphEngine/surfaceParts.test.js src/tests/human75Validation.test.js src/tests/humanMicroTile.test.js src/components/physique/HumanSurfaceControls.test.jsx src/store/__tests__/appearanceDatabase.test.js
npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts
npm.cmd exec -- playwright test --config playwright.measurement-entry.config.ts
npm.cmd exec -- vitest run src/components/morphEngine/spaceSkyMaterial.test.js src/lib/avatarPresentation.test.js src/tests/avatarWorkspace.test.js src/hooks/useAvatarPresentation.test.jsx src/components/morphEngine/captureRuntime.test.js src/components/morphEngine/protectedCapture.test.js
npm.cmd exec -- playwright test --config playwright.space-sky.config.ts
npm.cmd exec -- vitest run src/components/morphEngine/humanAppearance.test.js src/components/morphEngine/eyeMaterial.test.js src/components/morphEngine/featureMaterials.test.js src/tests/physicalSkinMaterial.test.js src/components/body3d/skinAppearance.test.js src/lib/avatarPresentation.test.js src/tests/avatarWorkspace.test.js src/hooks/useAvatarPresentation.test.jsx src/components/morphEngine/captureRuntime.test.js src/components/morphEngine/protectedCapture.test.js
npm.cmd exec -- playwright test --config playwright.human-fidelity.config.ts
```

The browser test uses intercepted API fixtures and never writes the owner's database. Browser screenshots and traces are written under `test-results/`.

Milestone 2 verification: **23 focused unit/integration tests**, **84 human-spec checks**, TypeScript, targeted ESLint, production build and the Chromium browser test (desktop plus a 390-pixel viewport) passed. Retained fixture evidence: [Nebula preview](evidence/milestone-02-nebula.png) and [protected PNG export](evidence/milestone-02-protected-export.png). The production build retains the existing large-chunk warning. No reference-device performance result is inferred from these passes.

Milestone 3 verification: **53 focused unit/integration tests**, **84 human-spec checks**, **2 Chromium browser tests**, TypeScript, targeted ESLint and the production build passed. The browser fixture uses actual WebGL rendering, authored asset resources, a saved preference reload and a 390-pixel mobile viewport. Existing large-chunk build warning remains; native mobile GPUs, Safari and a calibrated anatomical reference review are still outstanding.

Next appearance checkpoint: refine the hairline and brow silhouette, validate lid closure across facial morph combinations and author the missing eye/skin surface layers before claiming the full A1/A2/A3 gates.

## Continuation 2026-10-22: model measurements and clone isolation

**Measure → Model fit** now reports estimated neutral chest/waist/hip mesh contours, entered targets and signed differences. Actual triangle intersections replace unavailable feedback; missing targets, open contours and unsupported models are explicitly handled. Reports are scoped to the canvas and Current/Goal, invalidate on meaningful input changes and never write measurements. Fixed preview landmarks are approximate; automatic fitting and calibrated anatomical landmarks remain open.

Visual review also exposed inverse-bind matrices shared by cloned skeletons. Morph-dependent rig updates could corrupt the cached GLB and another figure, causing floating hair/eyes on later loads. Figures now own those matrices while sharing them among their own bound surfaces. Full/lite regressions reproduce the original fault and pass with isolation.

See [the continuation record](15-model-measurements-and-clone-isolation.md) for methods, limits, tests and application work. No additional planning points or realism score are assigned, and this continuation changes no asset bytes.
