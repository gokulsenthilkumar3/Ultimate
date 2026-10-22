# Review 1–100: creating yourself and another person

Reviewed 2026-10-22. The viewer uses a skinned human mesh with a head, torso, limbs, hands, feet, face and articulated rig. It can now keep a separate editable avatar for the owner and up to 30 named people. This is an approximate human creator. The full likeness and anatomical calibration requirements are **not complete**.

My development review score is **66/100**, based on the following rubric. This is a judgment of readiness for “create myself or my friend,” not a measurement of likeness, a test-pass percentage, or an increase in the historical 75-point milestone ledger.

| Area | Score | Evidence and limitation |
| --- | ---: | --- |
| Discoverable customization | 17/20 | Guided setup, 77 searchable measurement/shape fields, face, skin, eyes, hair, clothing and pose editors. Some assets remain unavailable. |
| Measurements driving geometry | 10/20 | Existing shape channels respond to measurements; nine missing profile mappings restored. No circumference fit/error solver; several records have no independent shape channel; bilateral measurements still share a shape. |
| Personal likeness | 8/20 | Human silhouette, 13 facial shape sliders and local photo reference. Synthetic close-up face; no reconstruction or reference-comparable identity result. |
| Separate people and persistence | 17/20 | Named records, separate Current/Goal, appearance, poses, clothing and history; queued saves and failed-switch recovery. Uses the existing account JSON collection, not a dedicated person service. |
| Rendering and interaction | 14/20 | Existing articulation, camera, capture, speech and appearance flows retained. Native GPU/Safari performance and authored contact-correct animation are still open. |
| Total | **66/100** | Useful approximate editor; not a finished digital replica system. |

## What changed

Open **Physique → 3D → Person**. Choose **Me · my avatar** for the existing profile or **Create a person** for someone else. A new person starts with no copied measurements, appearance, goals, photos or date of birth. Use **Guided setup**, then **Measure → Measurement group / Find a measurement**, **Face**, **Hair**, **Skin**, **Clothing** and **Pose**. Keep Current and Goal as two versions of the selected person.

The measurement editor now exposes the shared 77-field catalog instead of only eleven essentials. It includes composition, girths and breadths, segment lengths, head and face dimensions, paired limb records, posture angles and unitless face controls. Explicit units, decimal commas, empty states and validation reuse the existing measurement input. Unknown values remain unrecorded. Zero goals remain zero. Each field states whether it drives an approximate shape, a bounded pose, a shared bilateral shape or a saved record only.

The profile mapper previously dropped torso length, upper-arm length, forearm length, hand length, leg length, foot length, head circumference and both wrist measurements despite existing database columns. All nine now round-trip. Recorded head/pelvic angles now feed the existing posture rig, including neutral reset and explicit zero goals. Other unsupported angle fields are labeled as records.

The setup wizard now sends all edits through the same persistence callbacks as the main editor, uses centimetres for segment lengths, uses real facial morph overrides, saves clothing preferences, offers only available hair assets, supports keyboard focus containment and closes without erasing edits. It no longer claims that a solver perfectly aligns the mesh.

## Review of every range from 1 through 100

| Range | Review result |
| --- | --- |
| 1–5 | Measurement parsing, validation and persistence retained; catalog expanded and missing mappings repaired. Geometry fitting remains approximate. |
| 6–10 | Five space skies and saved background settings retained. |
| 11–15 | Authored maps, skin rendering, eyelids and idle motion retained; human silhouette visually inspected. |
| 16–20 | Skin base pigment, tan/exposure history and reset retained. |
| 21–25 | Saved hair shade, grey and thinning retained. Short/bald assets available; other styles and facial-hair assets remain open. |
| 26–30 | Seeded freckle appearance and context separation retained. |
| 31–35 | Iris appearance, pupil size and exposure response retained. Calibrated eye optics remain open. |
| 36–40 | Saved per-context poses retained and scoped per person. Recorded head/pelvic posture is connected to the rig. |
| 41–45 | Bounded wrist/ankle reach retained. Collision-aware reach remains open. |
| 46–50 | Named camera bookmarks retained and scoped per person. |
| 51–55 | Endpoint dragging, camera exclusion and cancellation retained. |
| 56–60 | Finger/toe controls retained. Per-digit direct handles and contact calibration remain open. |
| 61–65 | Shape-dependent rig pivots retained. Artist-approved fitting remains open. |
| 66–70 | Micro skin tiles retained. Regional source texture density remains below the full specification. |
| 71–75 | Separate eye/nail surfaces retained. Optical calibration and authored attachment refinement remain open. |
| 76–80 | Previous mouth correction and lip-following oral assembly retained. Authored dental topology remains open. |
| 81–85 | Speech integration retained. Tests use stubbed device APIs; native audio/microphone and phoneme-aligned visemes remain open. |
| 86–90 | Generic/personal face editing retained; named people and comprehensive measurements added. Exact personal likeness remains open. |
| 91–95 | Selected-joint dragging retained. Hip/per-digit handles and collision constraints remain open. |
| 96–100 | Actions and saved-pose handoff retained; switching people flushes drafts, remounts reference/speech state and restores the selected record. Contact-correct animation remains open. |

## Persistence and isolation

`avatarPeople.js` updates `physiqueTargets.avatarPeople` through the existing serialized singleton queue. The owner's existing body profile and targets remain in their current locations. A named record holds its own body profile, targets/preferences and check-in history. `AvatarPeopleWorkspace` supplies scoped callbacks through `useAvatarRecord`; the authenticated account still owns requests and formatting preferences.

Before changing people, registered measurement, view, clothing and lighting writers finish their pending work. Failed saves keep the selected person and draft open for retry. Person-keyed remounting releases local reference photos and speech sessions. Rendering uses only the selected record; missing friend values never inherit the owner's profile or date of birth. Camera, pose and clothing preferences use the same scoped save path. No schema migration or owner-database rewrite was performed.

## Remaining human-creation requirements

- A calibrated fit solver with measured mesh girths/lengths and displayed errors, plus independent left/right body shapes.
- Independent eye spacing and ear dimensions, further facial proportions and authored expression shapes.
- A high-detail face/body sculpt, regional textures, scalp and oral anatomy; authored hair and facial-hair options.
- Assessed female/neutral body assets. Their current covered fallback is explicitly identified during creation.
- Personal reference matching/reconstruction and visual likeness acceptance. No personal reference photographs were supplied in this review.
- Contact-correct actions, real geometry LODs/compression and native-device performance review.

No GLB geometry or source textures were changed in this review. Full/lite preview assets still have the historical **17/23 required full-v3 checks**, not full conformance. The 101–200 acceptance list in [the prior review](13-face-studio-review.md) remains open where marked.

## Verification and evidence

The new browser flow covers friend creation, a unit-converted height, immediate switch while a save is pending, owner isolation, hand-length shape output, independent goals/face overrides, reload, failed save/retry, guided setup, zero-angle goals and a 390-pixel layout. Persistence tests reconnect to a temporary SQLite database with two distinct people and an untouched second account. These fixtures never open the owner's database.

Verification results are recorded in [the review data](data/review-100.json). Selected evidence: [rendered human](evidence/review-100/buddy-human.png), [person selector at mobile width](evidence/review-100/people-mobile.png). The rendered model image is an unedited completed WebGL frame; the mobile image demonstrates controls, not GPU performance.

The broad focused run passed **357 tests in 53 files**. A final **49-test follow-up in seven files** covers the posture refinement and measurement workbench and overlaps the broad run. All **23 Chromium flows passed together**, followed by **six passing browser checks** after the final posture/setup/zero-value refinements. All **84 human-spec checks**, TypeScript, targeted ESLint, six project/official GLB validations and asset provenance passed. The production build passed with the existing large Three.js chunk warning. A green repository-wide suite and native-device performance are not claimed.

Reproduce the browser suite with `npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts`. The normal production build remains local; no remote deployment was performed.
