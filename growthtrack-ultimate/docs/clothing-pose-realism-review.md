# Clothing, poses and human realism — implementation review

29 October 2026 · GrowthTrack Ultimate / 3D Mirror

## Result and current verification limit

The supported male default now uses the refined R2 human. The public core model is 2,066,456 bytes with 1024-pixel skin detail; the explicitly selected high-detail model is 4,776,532 bytes with 2048-pixel skin detail. Model selection preserves owner-uploaded assets and explicit legacy choices. Female/neutral fallbacks have not received a new sculpt. These are generic human previews, not an exact likeness or a clinically validated reconstruction.

The clothing renderer now transfers the corrected body joint weights to its independently fitted garment, preventing body and clothing from following different deformation fields. Preset retargeting corrects arm reach and knee bend direction for the shipped rig. Skin detail, neutral lighting and floor clearance have been improved. The briefs have a distinct leg cut.

Rendered review found two additional defects: sleeve masking erased exposed arms, and finger joints named Index/Middle/Ring/Pinky were classified as torso skin. Both have source corrections. Finger classification is checked against the actual articulated source, R2 core and R2 hero rigs. The final finger correction still needs browser verification.

**Executed evidence:** 196 synchronized case captures from seven styles; 248 of the 444 planned cases have no capture. All 196 historical captures predate the final finger fix and are marked for rerun. This is not 444 passing checks. Browser control became disabled in Work settings before the review could finish. The user authorized enabling it, but the browser tool continued to report disabled.

## Every clothing style

The piece count describes the outfit a user sees. It is separate from draw-mesh count: every wardrobe GLB has one mesh/primitive with upper and lower connected components. Suit jacket and shirt share their upper component and color control.

| Style | Pieces | Source | Finding and required follow-up |
| --- | ---: | --- | --- |
| Briefs | 1 | Shared tee lower geometry | Distinct high-leg cut corrected and seen in front renders. Still needs final side/back and pose review. |
| Trunks | 1 | Shared tee lower geometry | Shorter leg than boxer briefs is visible. Dedicated underwear construction remains absent. |
| Boxer briefs | 1 | Shared tee lower geometry | Longest underwear hem is visible. Seated/squat openings and seat need side/back review. |
| Tank + running shorts | 2 | Shared tee | Shoulder straps restored; neckline/armholes are coverage cuts. Final raised-arm review pending. |
| Training tee + shorts | 2 | Shared tee | Rendered review exposed missing arms/fingers from the body mask; source corrected, rerun pending. |
| Compression set | 2 | Shared tee | A close-fit appearance/coverage variant, without physical compression or dedicated compression sewing topology. |
| Sweatshirt + joggers | 2 | Sweatshirt | Dedicated upper silhouette; 16 synchronized front cases captured before interruption. Cuffs and waist layering remain review targets. |
| T-shirt + joggers | 2 | Shared tee | Same upper basis as training clothing, with longer lower coverage. Final rendered review outstanding. |
| Shirt + trousers | 2 | Shirt | Default now uses cotton rather than wool. Stored fabric selections remain intact. Collar/cuffs/seated fit need rendered review. |
| Suit + shirt + trousers | 3 conceptual | Suit | Control explicitly labels the shared jacket-and-shirt color. Layering, collar and seated hips need rendered review. |
| Board shorts | 1 | Shared tee lower geometry | Longer swim coverage, not a dedicated board-short pattern. Rendered review outstanding. |
| Swim shorts | 1 | Shared tee lower geometry | Shorter hem than board shorts. Rendered review outstanding. |

Nine of the twelve styles share the tee bundle. Underwear/swimwear still load that bundle, including hidden upper geometry. Dedicated lower-only assets and independently authored underwear/swim constructions are the appropriate next asset task; more measurement fields will not fix these construction limits.

## Colors, fit and control meaning

- Three default color samples are queued for every style: white, near-black and red. A separate case uses white top, red bottom and black trim to check channel independence. The review records actual material colors.
- Suit jacket and shirt cannot be colored independently with the current asset. The UI now states this directly.
- Original texture supplies its own trim. The trim color control is disabled for that surface and its explanation reflects the actual shader behavior.
- Fitted/regular/relaxed scale native garment clearance by 0.65/1/1.6; they are not retail S/M/L sizes.
- Extra surface clearance moves fabric outward along its normals; it is not additional circumference. The control and help now say so.
- Bottom hem length changes the lower garment only. The former generic hem label has been corrected.
- Fabrics and pinstripes change shading; cloth drape and material compression are not simulated.

## Every pose

| Pose | Implemented or observed | Remaining acceptance work |
| --- | --- | --- |
| Standing | Relaxed hand endpoints, repeatable reference silhouette, lower floor clearance | Final arm/finger visibility and floor contact in all outfits |
| Idle | Four cycle samples captured on the reviewed styles | Full loop continuity and subtle foot movement |
| Sitting | Corrected hip/thigh and knee direction; seated silhouette seen | Side/back seat, crotch and jacket fit; no chair supplied |
| Walking | Four synchronized phases captured on reviewed styles | Natural heel/toe contact and gait timing; current loop is a preview |
| Running | Four synchronized phases captured on reviewed styles | Flight/contact timing, foot orientation and arm swing |
| T-pose | Wrist endpoints retargeted level with shoulders | Sleeve/underarm deformation in every asset |
| Jumping jack | Four distinct arm/leg phases captured | Closed-leg penetration candidates, overhead shoulders and full-loop floor contact |
| Flex | Bent elbows and partial fist replace the former raised straight-arm silhouette | Natural thumb opposition and shoulder/wrist orientation |
| Squat | Hip, spine and knee angles retargeted; bent-leg silhouette seen | Side-view balance, heels, seat and crotch fit |
| Wave | Distinct greeting phases captured | Finger visibility rerun and sleeve/hand continuity |

The stronger fist proposal was rejected after geometric screening on both real R2 models: it introduced thumb/index crossings and some palm/finger contacts. Positive curl direction is correct. Keep the existing partial fist until thumb opposition and contact are properly solved; increasing curl alone would make the hand worse.

## Loading and performance

Normal quality loads the 2.07 MB core and high quality explicitly loads the 4.78 MB hero. Adaptive frame quality does not trigger repeated model downloads. The wardrobe path retains geometry on color/material edits, shares in-flight loads, and defers unused texture maps. Static/paused scenes settle to demand-rendering idle. Readiness now completes after the rendered task instead of waiting for an extra animation frame that can be delayed in a background tab.

These are concrete payload and scheduling improvements. There is no measured application-wide speedup, physical-device frame-time baseline or GPU-memory certification in this record. A future performance run must fix hardware, viewport, quality, cold/warm cache and model/wardrobe versions.

## Reproduce and finish the review

From the application directory:

1. Run `node node_modules/vite/bin/vite.js --config scripts/realism-review/vite.config.mjs`.
2. Open `http://127.0.0.1:5182/scripts/realism-review/index.html` using enabled browser control.
3. Select Human realism candidate, start at case 0 and run all cases. The isolated harness uses fictional reference metrics and does not write account measurements.
4. Run `node scripts/realism-review/summarize.mjs`. Only matching pose IDs, sampled times and the current review revision count as current captures.
5. Inspect the saved PNGs/contact sheets. Sparse intersection candidates are screening evidence, not proof that a garment fits. Record actual front/side/back defects separately from mesh-sampling flags.

The 444 cases comprise 300 pose samples, 24 additional fitted/relaxed cases, 36 solid color cases, 72 side/back standing/seated/squat cases and 12 independent-color cases. They do not cover every body size, every color, every custom pose or every imported rig.

Local evidence: `.tmp/realism-review/results/`, `.tmp/realism-review/sheets/` and `.tmp/realism-review/summary.json`. The latest revision is `clothing-fit-r3`. These are local review outputs, not release approval.

## Next asset priorities

1. Correct thumb opposition and artist-refine hand closure, shoulder/hip weights and gait contact; validate through full motion clips.
2. Author dedicated underwear and swimwear, then separate suit jacket/shirt controls where the asset supports it.
3. Complete 360-degree face/skin/hair and clothing review on core and hero, followed by supported body-size boundaries.
4. Benchmark first model, first outfit, cached switch, field-to-preview response and active-motion frame time on agreed devices.

Do not add mandatory measurement fields to compensate for a generic sculpt, inaccurate saved units, shared sewing topology or rig defects. Existing optional measurements remain grouped by purpose.

## Final automated verification

89 affected tests across 13 files passed after the final source corrections. The production build, asset-provenance check, changed-file lint and required UI-impact drift check passed. The human-family validator passed with zero decoded errors/warnings and all four payload budgets satisfied. This does not replace the outstanding browser review or establish a clean application-wide test suite.
