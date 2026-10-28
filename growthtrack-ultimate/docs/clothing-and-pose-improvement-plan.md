# Clothing and poses: analysis and improvement plan

Date: 29 October 2026
Scope: GrowthTrack Ultimate, Physique / 3D Mirror
Status: runtime and control improvements implemented on 29 October 2026; asset-authoring and full visual matrix remain pending. See implementation record below.

## Decision

Keep the existing wardrobe and pose capabilities, but reorganize them around two straightforward tasks: choose an outfit and choose how the avatar stands or moves. Advanced tailoring, individual joints, reach targets, hands and toes should be optional sections. Prioritize asset loading and trustworthy state feedback before adding more styles or animations.

Evidence: inspected the full configured catalog and its renderer, loader, persistence and control paths; opened the live Appearance and Clothing navigation; ran seven existing test files, with 38 tests passing. Individual outfit/pose combinations have not all received visual sign-off. The item-specific visual risks below are inspection targets, not claims that those defects were reproduced.

## Confirmed findings

1. Twelve garment variants resolve to four shared authored asset keys. Underwear, all gym styles, swimwear and casual tee resolve to `tee`; casual sweatshirt resolves to `sweatshirt`; formal resolves to `shirt` or `suit`. Coverage and material changes distinguish several styles. Do not describe the catalog as twelve independent authored sewing patterns.
2. The loader fetches geometry, diffuse and normal maps together regardless of chosen surface. The default Solid fabric does not use the diffuse map; underwear, gym and swimwear do not use the normal map in `createClothMaterial`. The shared tee bundle totals 2,833,755 bytes on disk (about 2.83 MB), so there is a concrete opportunity to defer maps. On-disk bytes are not measured network transfer or decoded GPU memory.
3. In-flight loads are cached and failed loads can retry. Preserve these existing strengths. Cache entries have no explicit memory budget or eviction in this loader.
4. Color, fabric, fit and geometry preferences flow into material/garment creation dependencies in `HumanoidClone`. Profile whether color-only edits rebuild geometry; split those dependencies before assuming every slider needs a full refit.
5. Clothing adjustment details are expanded by default. Style, fit, fabric, surface, multiple colors and four sliders are exposed together in a narrow sidebar.
6. Static poses and looping animations share one selector. Selecting even a static preset sets `playing: true`, while playback controls appear only for looping presets. Make the distinction explicit in state and presentation.
7. Saved custom pose, animated motion and neutral measurement/comparison views have precedence rules, explained mostly through long paragraphs. Reach targets override the limb's joint-angle edits.
8. Choosing a custom-pose starting point replaces joints and reach targets but retains existing digit settings through the patch operation. A Neutral starting point can therefore retain a prior hand shape. Decide and label whether a starting point resets the entire pose or only the body.
9. Hands/toes availability currently requires all four digit groups. One missing foot group disables hand controls too. Gate each group separately.
10. The live page still exposed a Preparing the 3D view status while the model was visible during this review. Treat readiness consistency as an observed prerequisite for reliable clothing/pose feedback; do not assume the earlier loading fix fully resolved every path.

## Clothing inventory: every configured style

All rows need front, side and back visual evidence. Changes listed here are proposed.

| Category / style | Current basis | Need and proposed improvement | Main visual acceptance check |
| --- | --- | --- | --- |
| Underwear / Briefs | Shared tee pattern with briefs coverage | Keep as a minimal-coverage inspection option; dedicated compact lower garment is preferable to loading a full outfit bundle | Waistband, leg openings, seat coverage and thigh intersection |
| Underwear / Trunks | Shared tee pattern with shorter-leg coverage | Keep; show a silhouette thumbnail that distinguishes it from briefs and boxer briefs | Hem length visibly differs; no crotch gaps |
| Underwear / Boxer briefs | Shared tee pattern with longer-leg coverage | Keep as a covered inspection default; validate a lightweight dedicated asset | Seat/thigh coverage through flex and squat |
| Gym / Tank + running shorts | Shared tee pattern, tank coverage | Keep as a common presentation outfit; use a tank-specific neckline/armhole mesh if coverage clipping looks artificial | Armholes, shoulder edges and shorts during raised arms |
| Gym / Training tee + shorts | Shared tee pattern, short sleeves | Keep; use the same compact shared resources where genuinely equivalent | Sleeve/armpit clipping during wave and jumping jack |
| Gym / Compression set | Shared tee pattern, longer lower coverage | Keep as optional; describe close fit without implying physical compression simulation | Clear difference from training set; no skin breakthrough at knees/hips |
| Casual / Sweatshirt + joggers | Authored sweatshirt bundle | Keep; label it consistently as sweatshirt, not hoodie; defer texture maps until needed | Cuffs, neckline, untucked overlap, knees and seat |
| Casual / T-shirt + joggers | Authored tee bundle | Keep; share tee geometry/cache with training where appropriate but keep fit and coverage independent | Tee hem over joggers, waist fit and sleeve opening |
| Formal / Shirt + trousers | Authored shirt bundle | Keep as optional presentation clothing; suggest a shirt-appropriate fabric rather than wool for every formal variant | Collar, placket, cuffs, trouser waist and tucked/untucked behavior |
| Formal / Suit + shirt + trousers | Authored suit bundle | Keep as advanced presentation; load only on selection, with explicit preparation/failure state | Jacket/shirt layering, lapels, elbows, seated hips and cloth separation |
| Swimwear / Board shorts | Shared tee pattern with board-short coverage | Keep as optional; prefer dedicated light shorts geometry | Waistband, hem distinction, seat and crotch during step/squat |
| Swimwear / Swim shorts | Shared tee pattern with shorter coverage | Keep as a second silhouette only if visibly distinct; otherwise merge later with a length choice after migration review | Visibly shorter than board shorts without sudden boundary cuts |

Anatomical view is a separate body-display mode, not a garment. Keep it outside ordinary outfit cards, with existing eligibility, coverage and protected-export rules intact. No need to activate it for wardrobe review.

### Clothing controls: what is actually needed

Default: category, style thumbnail, fit and primary color. For two-piece outfits expose top/bottom colors with clear labels. Show a concise outfit description and load status.

Optional Appearance details: fabric look, surface/pattern, trim and fabric detail. Explain that fabric changes shading, not cloth drape. Hide or disable Original garment texture when no usable map exists. Preview how original colors combine with tint. Pinstripe should be meaningful for the garment rather than offered indiscriminately.

Optional Fit adjustments: ease, hem length and waistband height. Explain that these change the clothing, not body measurements. Use style-specific ranges and controls; do not offer an adjustment when it has no visible effect. Reset outfit should affect only the selected outfit, with Undo for accidental changes.

Proposed UI order: Outfit > Style > Fit & colors > Fit adjustments (collapsed) > Fabric & detail (collapsed). Keep save status separate from asset-loading status. Show a retry on failed asset loading instead of silently implying the detailed outfit loaded successfully.

## Pose and motion inventory: every registered preset

| Preset | Current type | Need and proposed improvement | Visual acceptance check |
| --- | --- | --- | --- |
| Standing | Static | Essential default; call it Neutral standing in user-facing presentation after reconciling it with the custom Neutral preset | Symmetric reference, soles on floor, relaxed arms and repeatable silhouette |
| Idle | Loop, 4 seconds | Optional natural motion; off for measurement and reduced-motion contexts | Subtle breathing/weight shifts, no foot sliding or perpetual rendering when paused |
| Sitting | Static | Optional presentation; provide a seat reference or explain unsupported seating | Pelvis height, bent knees, foot position and trouser/jacket intersections |
| Walking | Loop, 1 second | Optional motion preview; validate contacts and interpolation before expanding speed range | Heel/toe contact, no floor sliding, stable clothing throughout loop |
| Running | Loop, 0.6 seconds | Advanced/high-motion preview; default paused until explicitly played | Flight/contact timing, limb clearance and no snapping at loop boundary |
| T-Pose | Static | Keep under Technical poses, not among the first everyday choices | Symmetric rig reference and sleeve/shoulder deformation |
| Jumping Jack | Loop, 1.2 seconds | Optional motion stress test; identify it as animated | Overhead shoulder range, leg separation, garment clipping and ground contact |
| Flex | Static | Useful physique presentation option, separate from neutral comparison | Shoulder/elbow deformation, hand clearance and no misleading measurement changes |
| Squat | Static | Optional presentation/stress pose; do not present as a movement-quality assessment | Knee/hip bend, heel contact, torso balance and crotch/seat intersection |
| Wave | Loop, 1.4 seconds | Optional presentation action | Wrist/elbow continuity, hand shape and sleeve deformation |

Duration values above are configured cycle durations, not measured loading or performance results.

### Custom pose starting points and advanced controls

- Neutral: consolidate terminology with Standing; explicitly reset the body and optionally hands/toes according to a visible reset scope.
- Look left: useful simple orientation preset; validate combined neck/head rotation and hair/neck continuity.
- Open arms: useful clothing inspection preset; validate shoulder clearance and left/right symmetry.
- Step study: advanced fitting/stress preset; label as a study and validate grounding rather than suggesting a calibrated walking pose.
- Four hand shapes on each side: Open, Relaxed, Fist study and Point. Keep Open/Relaxed easy to find; place closure strength under hand details. Check finger intersections, thumb contact, nails and left/right mirroring. These controls are artistic, not calibrated hand biomechanics.
- Toe curl on each side: advanced only; expose when that foot is supported, and validate nail/skin contact. Do not disable hands because toes are unavailable.
- Four reach endpoints: left/right wrist and ankle. Keep under Position hands & feet. Use on-model labels and a reachable/limited indicator; show which joint controls are overridden.
- Fourteen joint selectors: head, neck, lower/upper spine, left/right upper arm, forearm, thigh, shin and foot. Group by Head & torso / Arms / Legs. Translate Pitch/Turn/Roll into Bend/Turn/Tilt with an illustration where appropriate. Keep precise degrees and keyboard input in advanced mode.

### Proposed pose UI

1. Pose presets: Neutral standing, Flex, Sitting, Squat; Technical poses expands to T-Pose and rig studies.
2. Motion: Idle, Walk, Run, Jumping jack, Wave; a single Play/Pause control and simple speed choices initially. Advanced speed stays available on demand.
3. Custom pose: start from a preset, then Body joints / Position hands & feet / Hands & toes, all with clear Current or Goal scope.
4. One state banner: Neutral for measurements, Motion playing, Motion paused, or Custom pose active. When a mode overrides the saved pose, say why and provide the action to return.
5. Add undo/redo for editing and a scoped Reset. Escape must cancel a drag without saving its transient state; keyboard edits must offer equivalent control.

Retain neutral poses for measurement, anatomy, comparison and timeline workflows. This prevents a pose change from being mistaken for a body-shape change.

## Prioritized implementation sequence

### P0: dependable loading and state feedback

Owners: viewer engineer and frontend engineer.

- Fix model-ready feedback for first load, cached return, outfit replacement, context loss and offscreen resume. Readiness must reflect the body, not unrelated global resources.
- Separate required geometry from optional diffuse/normal downloads. Keep shared in-flight requests and retry behavior. Do not skip geometry merely because a garment has no top: confirm lower coverage still has a valid source or dedicated lower asset.
- Add per-outfit pending/ready/fallback/error feedback; never show a saved preference as proof its asset loaded.
- Make precedence between neutral, motion and custom pose explicit. Preserve account/person isolation, pending-save flushing, protected captures and fallback coverage.

Acceptance: cold load and cached return reach usable controls; a deliberately failed texture does not block the body; unavailable detail has a retry; no stale Preparing banner after a rendered body is ready; choosing clothing cannot reveal uncovered protected regions.

### P1: simplify the two panels

Owner: frontend engineer with product/design review.

- Implement the clothing and pose hierarchies above; collapse tailoring and joint controls by default.
- Add outfit/preset thumbnails, short purpose text and visible selected states. Generate thumbnails from actual shipped assets.
- Separate static pose selection from playback; reset semantics include an explicit body/hands scope.
- Make unsupported controls independently unavailable with a reason. Keep all necessary actions keyboard accessible and labels readable in a 280–320 px sidebar and at 390 px page width.

Acceptance: a user can change outfit, choose a static pose and play/pause motion without reading rig terminology; no horizontal clipping; focus remains visible; all advanced controls remain discoverable.

### P2: visual fit and garment identity

Owners: 3D artist and viewer engineer.

- Capture the full style/preset matrix before changing geometry. Prioritize underwear coverage, gym shoulders, formal layering and sitting/squat hips.
- Author dedicated lower garments and genuinely different silhouettes where shared coverage cannot produce a convincing style. Preserve saved IDs through a versioned mapping.
- Refine collision/contact and normal continuity at waist, crotch, armpits, elbows and knees. Preserve both cloth/body separation and garment construction.
- Improve gait/ground contact, loop transitions and pose blending. Do not expand joint limits as a shortcut for a bad pose.

Acceptance: approved front/side/back evidence for each style in reference and stress poses; no visible body penetration, floating waistbands, open seams or abrupt pose snaps at supported settings. Record unsupported body/rig combinations explicitly.

### P3: performance and resource lifecycle

Owner: viewer engineer.

- Baseline first model, first outfit, cached outfit, pose interaction, animation frame time and memory before optimization.
- Separate material-only changes from geometry refits and shader recompilation. Refit on actual body/fit changes; reuse bounded caches keyed by asset, rig/body revision and fit parameters.
- Profile main-thread geometry preparation and contact fitting; move proven long operations to existing workers where applicable, with stale-result cancellation and person/model revision checks.
- Add cache/resource budgets with ownership-safe texture/material disposal. Shared resources must stay alive while either comparison clone uses them.
- Keep static/paused views on demand; animate only when requested and visible. Respect reduced motion. Evaluate compressed texture/geometry candidates only after confirming loader compatibility and visual parity.

Proposed gates, to calibrate after baseline: p95 field-to-preview feedback <=100 ms on the agreed desktop; active motion p95 frame time <=33 ms on the agreed low-tier device; static/paused rendering settles to idle; warm outfit switches make no duplicate geometry requests; performance tests record cold/warm caches and fixed hardware, viewport and quality tier. These are targets, not achieved results.

## Verification matrix and release gates

- Catalog baseline: 12 clothing styles x 10 registered pose/motion presets = 120 primary combinations on the reference supported rig. This is planned coverage, not completed testing.
- For each combination: neutral lighting, front/side/back, coverage, intersections, pose silhouette and floor contact. For loops inspect the full cycle and loop boundary, not a single frame.
- Focused extension: four custom starting points; all four hand shapes and toe limits; reach endpoints at reachable/unreachable targets; fit/ease/hem/rise extremes; supported body-size and model-base boundaries. Do not imply every legacy/female/neutral asset has the same garment binding.
- Persistence: reload, person switch during pending save, account switch, Current/Goal scope, failed save/retry, and reset/undo. Verify no cross-person changes.
- Failure/performance: delayed/failed geometry or maps, cached loads, rapid switching, offscreen/hidden pause, reduced motion, WebGL loss/fallback and protected export during loading.
- Evidence per release: screenshots/clips, actual executed matrix rows, resource requests, interaction/frame timings and memory snapshots. Unit tests support this evidence but do not replace visual checks.

## Source map

Catalog and UI: `src/lib/wardrobePreferences.js`, `src/lib/wardrobeCoverage.js`, `src/components/physique/WardrobeOptions.jsx`, `src/components/physique/PoseStudioControls.jsx`, `src/components/physique/DigitPoseControls.jsx`, `src/components/HumanoidViewer.tsx`.

Assets and rendering: `public/assets/wardrobe/manifest.json`, `src/components/morphEngine/useWardrobeAsset.js`, `authoredGarments.js`, `garmentGeometry.js`, `WardrobeShader.js`, `HumanoidClone.jsx`, `posedGarmentContact.js`.

Pose state: `src/config/poseStudio.json`, `src/config/humanSurface.json`, `src/lib/poseStudio.js`, `src/components/morphEngine/animationPresets.js`, `AnimationPanel.jsx`, `poseRuntime.js`.

Existing tests run: wardrobe preferences, wardrobe options, wardrobe persistence, wardrobe asset loader, pose runtime, pose dragging and drag cancellation. Result: 7 files / 38 tests passed. No application implementation changes were made as part of this plan.


## Implementation record — 29 October 2026

Implemented:

- Geometry-first wardrobe loading, with only the requested surface maps downloaded. Solid underwear/gym/swimwear no longer request the tee diffuse and normal maps (1,929,375 combined on-disk bytes avoided per cold resource set; this is not a measured network-transfer saving).
- Shared geometry and in-flight jobs across outfits/clones; failed geometry retries; failed optional maps retain a usable outfit and expose a separate loading retry.
- Fitted garment geometry is retained for color/material-only edits. Fit/ease/hem/rise changes still replace it; per-clone geometry ownership and cleanup are preserved.
- A first frame is explicitly requested after the suspended body mounts, so readiness no longer waits on a camera interaction. Live ready-state clearance was observed before later browser-tool failures.
- Clothing: style/fit/colors first; Fit adjustments and Fabric and detail collapsed; separate loading/save state; local reset with Undo.
- Poses: static presets separated from looping motions, technical poses collapsed, explicit Play/Pause, simple speeds with advanced speed optional, reduced-motion playback guard.
- Custom poses: joints/reach/hands grouped into disclosures; joint groups and bend/turn/tilt labels; overridden angle controls disabled; starting points clear stale digit settings; last 20 local edits can be undone.
- Hand and toe support checked independently, with capability recheck when the asynchronous body becomes ready.
- Still standing startup. Static/paused/saved poses and neutral measurement/comparison previews do not request unused animated frames; captures, speech, intentional orbit and cinematic effects keep their existing wake paths.

Pending from the broader proposal:

- Newly authored garment silhouettes, dedicated lightweight lower-body assets, actual-asset thumbnails, gait/contact animation refinements, and visual approval of all 120 combinations.
- Hardware-calibrated cold/warm loading, frame-time and GPU-memory benchmarks. No application-wide speedup is claimed.

The implementation changes resource scheduling and control presentation; no new clothing assets or rewritten animation keyframes have been introduced without rendered fit evidence.

Final visual follow-up: the live gym tank was missing shoulder straps because the tank mask excluded shoulder-weighted garment vertices. The mask now retains those vertices for both visible and shadow passes; the rebuilt page visibly shows the straps. Pose cards now use shared theme colors and wrapping descriptions rather than the old fixed-color, single-line styling.

Verification record: 114 affected tests across 27 files passed before the final shader regression; the final garment suite then passed 9 tests including the new color/depth/distance strap-coverage check. Production builds, changed-file lint and the UI impact check passed. The application-wide suite was attempted at default and reduced worker counts; responsive-layout failures outside these controls were observed, and the incomplete long runs were stopped. This is not a clean full-suite result.


## Follow-up: rendered fit and human realism

See [clothing-pose-realism-review.md](clothing-pose-realism-review.md) for the implemented human-model, skinning, pose, arm/finger-mask and control corrections. The follow-up records 196 historical synchronized renders requiring rerun after the final fixes, with 248 remaining captures. Browser control was disabled before completion. No complete visual fit approval or photorealistic accuracy claim is made.
