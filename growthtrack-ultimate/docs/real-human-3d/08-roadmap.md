# 08 · Roadmap: step by step, each step with a gate that can fail

The requested continuation now runs through **200 acceptance checkpoints** in the [current face-studio review](13-face-studio-review.md). That ledger distinguishes implemented runtime subsets from remaining asset work. The original work tracks and estimates below remain useful technical context, not a claim that all steps are complete.

The plan is built so that **every step ships on its own, changes something a person can see, and has a gate that can fail**.
Work splits into three tracks that run in parallel because they depend on different things:

- **V · Viewer** (camera, floor, quality, space, capture, presentation, pose): needs no new asset.
- **A · Appearance on today's mesh** (skin layers, hair, eyes, micro detail, idle motion): needs no new asset; large visible gain.
- **B · The v3 asset** (rig, face, parts, tiles, LODs, garments): the long pole, authored in Blender.

Effort figures are planning estimates in person-weeks for one engineer or technical artist, to be re-estimated after each
spike; they are not commitments.

## 0 · Make the truth visible (week 1)

| Step | What | Gate |
| --- | --- | --- |
| S0.1 | Commit the audit tooling and data (this branch): `scripts/analyze-human-model.mjs`, `scripts/audit-physique-viewer.mjs`, `docs/real-human-3d/` | Both scripts run from a clean checkout |
| S0.2 | Fix the dev-server start-up defect (`build/serviceWorkerPlugin.js` is ignored by `.gitignore`, so `vite` fails on a clean clone) | `npm run dev` starts on a fresh clone |
| S0.3 | Run `node --test docs/real-human-3d/code/*.check.mjs` and `render-anatomy.mjs --check` in CI | CI red if the plan and the code drift |
| S0.4 | Wrap `scripts/audit-physique-viewer.mjs` as a Playwright spec that **expects** today's failures and flips to required as each step lands | Spec exists; its failures list is the work list |
| S0.5 | Silence the three console warnings (`THREE.Clock`, `PCFSoftShadowMap`, accessor bounds) | Zero warnings in the probe's log |

## V · Viewer track

2026-10-22 **75/100 continuation**: pointer wrist/ankle dragging now shares the existing rig-frame solver, save queue, capture protection and keyboard controls. The camera pauses during a captured drag and cancellation restores the previous target. Four partial asset slices add actual finger/toe bindings, measured morph pivots, micro resources/attributes and separate cornea/tearline/nail surfaces. Both new models pass 17/23 applicable required full-v3 checks; all 19 combined Chromium flows pass. See [milestones 11–15](IMPLEMENTATION_PROGRESS.md#milestones-1115-articulated-and-surface-preview--25-points) and [architecture](12-articulated-surface-architecture.md). General collision, head/hips FABRIK and walking foot lock remain open.

2026-10-22 implementation note: saved Current/Goal joint poses, keyboard wrist/ankle two-bone reach and named camera bookmarks bring the tracker to **50/100 planning points**. [Pose/camera architecture](10-pose-camera-architecture.md) documents actual rig-frame solving, the bounded facial-weight repair, neutral measurement/comparison behavior, persistence and capture. V6a remains partial: pointer dragging, FABRIK head/hips, collision/hand controls and walking foot lock are not delivered. Camera bookmarks extend V1 rather than claiming a new asset gate. See [implementation progress](IMPLEMENTATION_PROGRESS.md#review-of-the-complete-50-point-checkpoint).

2026-10-21 implementation note: the **static portion of V4** now ships (all five presets, saved selection, subdued sky lighting, tier-sized cube maps and capture integration). Animation/twinkle and the reference-GPU <1 ms gate remain open. See [implementation progress](IMPLEMENTATION_PROGRESS.md); this does not mark all of V4 complete.

| Step | What | Detail | Gate | Effort |
| --- | --- | --- | --- | --- |
| **V1** | Camera modes, hard floor, ViewCube, real auto-rotate, keyboard | [05 §2, §5](05-viewer-and-interaction-spec.md); `viewer-camera.mjs` | **G1** floor never crossed (unit: 12,000 random moves; e2e: drag up 2,000 px); **G2a** auto-rotate moves the azimuth ≥ 20° in 8 s | 1.5 |
| **V5** | High-resolution still, native share with the file, copy, download, real presentation mode | [05 §8, §9](05-viewer-and-interaction-spec.md); `share-export.mjs` | **G5** export ≥ 2× canvas; `navigator.share` receives a file; **G6** fullscreen and chrome hides; **G9** private anatomy absent from every capture | 2 |
| **V2** | Quality governor, tiers that change real settings, antialiasing without remount | [05 §4](05-viewer-and-interaction-spec.md); `quality-governor.mjs` | **G2b** tiers differ in measured settings; governor never flaps on the recorded frame-time traces | 2 |
| **V4** | Space skies (five presets), image-based lighting from the sky, Studio/Floating scenes | [05 §7](05-viewer-and-interaction-spec.md) | Sky costs < 1 ms at BALANCED on the reference GPU; screenshots include the sky | 1.5 |
| **V6a** | Pose mode with arm and leg IK on the 20-joint rig, motion tray (walk in place, run, wave), idle motion | [05 §6](05-viewer-and-interaction-spec.md); `ik.mjs`, `idle-motion.mjs` | **G10** a dragged wrist reaches its target within 1 mm when reachable; feet do not skate during a walk (< 5 mm); metrics views use the neutral pose | 3 |
| **V3** | Per-region closest zoom from texel density | [04 §8](04-skin-hair-eyes.md); `texel-density.mjs` | **G3** magnification ≤ 2.0 (base) and ≤ 1.25 (micro) at every region's closest distance | 0.5 (needs A5 or B4 for the data) |

**Quick wins** (each a small patch, each makes one visible thing true, before the larger steps replace them):

| # | Patch | Fixes | Replaced by |
| --- | --- | --- | --- |
| QW1 | Set `maxPolarAngle` each frame from `floorPolarLimit()` | Camera under the floor | V1 |
| QW2 | Drive azimuth with `autoRotate()` instead of the sin sway | Auto-rotate that rotates | V1 |
| QW3 | Mount the motion tray (the existing `AnimationPanel`) | "Walk" is reachable | V6a |
| QW4 | Export at 2× through a resized renderer | Low-resolution screenshots | V5 |
| QW5 | `navigator.share({ files })` when `canShare` says yes | Sharing without the picture | V5 |
| QW6 | Raise the shipped quality tiers' DPR cap (`dpr` 1/1.5/2) and mark the tier label live | Tiers that mean something | V2 |

## A · Appearance track (today's mesh)

2026-10-21 implementation note: the third **5-point appearance milestone** now brings the credited execution budget to **15/100**. It shares skin swatches between editor and renderer, retains authored maps through edits, adds regional roughness, corrects bundled lid closure and integrates the deterministic idle sampler with real eye/chest motion and saved accessibility controls. This is partial A1/A3/A4 delivery; authored skin layers, strand hair, wetline/pupil work and final visual/performance gates remain open. See [implementation progress](IMPLEMENTATION_PROGRESS.md) and its retained full-body, face, blink and mobile evidence.

| Step | What | Detail | Gate | Effort |
| --- | --- | --- | --- | --- |
| **A1** | **Layered skin**: tone, tan, blood, undertone as separate inputs; neutral detail albedo; region masks from `REGIONS`; tan lines from wardrobe coverage | [04 §1–3](04-skin-hair-eyes.md); `skin-layers.mjs` | **G4** unit: tan leaves constitutive unchanged; e2e: tan 100% darkens a forearm and leaves the inner arm unchanged; golden colours match the JS model per type and region | 3 |
| **A2** | **Strand hair, eyebrows, eyelashes, body hair** ported from the plan page | [04 §5](04-skin-hair-eyes.md); `hair-color.mjs` | Strand count within tier budget; no alpha halo in captures; p95 within budget at BALANCED | 3 |
| **A3** | **Procedural eyes** with wet line, pupil response, gaze to camera | [04 §4](04-skin-hair-eyes.md) | Catchlight visible in a close render; blink closes fully | 1.5 |
| **A4** | **Idle motion**: blink, breath, saccades | `idle-motion.mjs` | Blink 12–24 a minute, breathing 12–16 a minute (unit) | 0.5 |
| **A5** | **Micro-detail tile and the detail ladder** on the existing UVs (`_MICROSCALE` computed at load) | [04 §8](04-skin-hair-eyes.md); `generate-micro-tile.mjs` | **G3** (base part) pores stay sharp at the closest zoom in the probe | 2 |
| **A6** | **Skin features**: freckles, moles, veins, scars from a seed | [04 §7](04-skin-hair-eyes.md) | Same seed gives the same marks on two devices (unit) | 1.5 |
| **A7** | **Metric entry and the new tabs** | [06](06-ui-for-metrics.md); `metric-entry.mjs` | **G11** U1, U4, U5, U6 unit-pass; U2, U3 in a five-person session | 2.5 |

**20/100 checkpoint:** partial A1 now includes saved clothing exposure history, smooth rest-surface tan lines from shared neutral wardrobe bands, independent Current/Goal editing and a reset that preserves base colour. The live-image checks compare protected/exposed skin and verify export, reload, delayed-save edits and quality transitions. Exact authored seam masks, neutral albedo and calibrated optical colours remain open; this does not close the full G4 gate. See [milestone 4](IMPLEMENTATION_PROGRESS.md#milestone-4-clothing-exposure-history-and-reliable-skin-editing-a1-partial--5-points).

## B · The v3 asset

**Current partial delivery at 75 points:** the additive male preview has all 79 structural rig names, generated digit weights on 4,948 vertices, 41 physical morph offset sets, measured attributes and periodic micro PNGs, plus separate cornea/tearline/nails. Existing body positions, UVs, normals, topology, 58 morph deltas and image bytes are preserved. Original models and covered female/neutral fallbacks remain available. The build uses pinned CC0 helper landmarks, not the AGPL distribution weights. This advances portions of B1/B3/B4/B5/V6b; it does not close their complete authoring gates. Fresh reports and explicit limitations are in [milestone-75](data/milestone-75/review.json).

Still open: artist weight/corrective/contact calibration, 52 face shapes and mouth/scalp parts, true regional density and geometric refinement, compression/streaming/LODs, and reference-device/user acceptance. Full/lite retain the same body geometry; the 7.5 MiB lite file does not meet the 3 MiB first-paint core target. The remaining 25 planning points are measurement/user validation 5, asset authoring 10, and cross-device/privacy/final conformance 10; they are budget weights rather than estimated person-weeks.

**35/100 checkpoint:** partial A3 now includes a visible Face-tab eye editor, seven named/custom iris shades, seeded radial/collarette detail, optional limbal rim, fixed pupil sizes and an optional response to the actual scene exposure control. Saved Current/Goal records remain independent; capture settles the pupil synchronously and restores it after encoding. All twelve combined browser flows recheck the earlier 1–30 point implementation with this new layer active. This does not author a cornea, wet line or new eye geometry, and the artistic exposure response is not physiological calibration. See [milestone 7 and its review](IMPLEMENTATION_PROGRESS.md) and [eye architecture](09-appearance-architecture.md#eye-rendering-and-capture).

**30/100 checkpoint:** partial A2 now includes saved named/custom hair shades, seeded greying and thinning on the existing cards, matching shadow cutouts and scalp coverage, and Current/Goal context editing. Partial A6 adds seeded rest-surface freckles with editable size/contrast, independent pigment, quality/capture/reload integration and a local hide action. These are two runtime checkpoints, not new strand geometry or source asset authoring. Moles, scars, authored region masks, beard assets, advanced eye layers and native-device performance remain open. See [milestones 5–6](IMPLEMENTATION_PROGRESS.md#milestone-5-saved-hair-shades-greying-and-thinning-a2-partial--5-points) and [data flow](09-appearance-architecture.md).

| Step | What | Detail | Gate | Effort |
| --- | --- | --- | --- | --- |
| **S1** | **Spike: Anny and the licence.** Can its MakeHuman-topology output supply finger/toe/jaw/eye weights and phenotype targets under clear terms? | [02](02-open-source-landscape.md) | A written yes/no with licence evidence; if yes, `ASSET-PROVENANCE.json` entries drafted | 1 |
| **B1** | Re-sculpt head, hands, feet; add rig parts and weights (79 joints) | [03](03-anatomy-spec.md), [07 §4](07-asset-pipeline-and-glb-spec.md) | Conformance: rig, edge length checks pass | 8–10 |
| **B2** | 52 face shapes on the head only | [03](03-anatomy-spec.md) | Conformance: shapes exist and move face vertices ≥ 98% | 3 |
| **B3** | Parts: teeth, gums, tongue, cornea, tearline, scalp, nails | [03](03-anatomy-spec.md), [04 §6](04-skin-hair-eyes.md) | Conformance: all parts present; an open-mouth render shows teeth | 4 |
| **B4** | Tiles, bake, masks, attributes, micro tile | [07 §3–4](07-asset-pipeline-and-glb-spec.md) | **G3** at the planned densities; conformance texture and attribute checks | 3 |
| **B5** | Re-target the 58 morphs with `morphRegions` and `jointOffsets`; pose-stability test | [07 §4](07-asset-pipeline-and-glb-spec.md) | Silhouette volume change < 3% across morph extremes × ±30° limb joints | 3 |
| **B6** | LODs, compression, core/hero split, loader | [07 §2, §6](07-asset-pipeline-and-glb-spec.md) | **G7** conformance 23 of 23 required; **G8** core ≤ 3 MB, first paint within the existing budget | 3 |
| **B7** | Garments (Gym, Casual, Formal, Swimwear, Underwear, footwear), tan lines from garments | [04 §9](04-skin-hair-eyes.md) | Wardrobe change loads one file; tan lines follow swimwear | 5–6 |
| **B8** | Underlay (skeleton, muscle, fat, organs), after the licence decision | [03](03-anatomy-spec.md) | Optional; does not block | 4–6 |
| **V6b** | Finger, toe and jaw poses; speech-ready mouth; grip library | [05 §6](05-viewer-and-interaction-spec.md) | Fist and point poses deform without collapse | 2 |

B1 to B6 is roughly **26 to 30 person-weeks** of authoring and tooling. The viewer and appearance tracks together are about
**30 person-weeks** and deliver most of the visible change without waiting for B.

## Suggested order (two people)

| Weeks | Person 1 (engineer) | Person 2 (technical artist) |
| --- | --- | --- |
| 1 | S0 (all), QW1 to QW6 | S1 spike; set up Blender, MPFB2, glTF-Transform |
| 2–3 | V1 | A1 (skin layers) |
| 4–5 | V5 | A1 finish, A5 (micro tile) |
| 6–7 | V2 | A2 (strand hair port) |
| 8–9 | V4, V3 | A3, A4, A6 |
| 10–13 | V6a | B1 begins (head), A7 UI with the engineer |
| 14 onward | A7, loaders for v3 | B1 to B6 |

After week 9 the viewer does everything you asked for and the person looks markedly more real on today's mesh; the v3 asset
then raises the ceiling (hands, nails, teeth, face movement, garments).

## Gates (all of them can fail)

| Gate | Proves | How |
| --- | --- | --- |
| G1 | Camera never below the floor | Unit property test plus e2e drag |
| G2 | Auto-rotate rotates; quality tiers differ in measured settings; governor does not flap | e2e probe and recorded-trace unit tests |
| G3 | No visible pixel blocks at any region's closest zoom | `magnification()` per region in the probe plus a stored reference image |
| G4 | Tone and tan are independent; tan lines follow clothing | Unit and golden-colour tests plus e2e pixel check |
| G5 | Export is high resolution; share carries the file | e2e with a stubbed `navigator.share` |
| G6 | Presentation is fullscreen, hides chrome, restores settings | e2e |
| G7 | The GLB conforms to v3 | `v3-conformance.mjs`, 23 of 23 required checks |
| G8 | Budgets: first paint, core size, p95 frame time, texture memory | Probe and conformance |
| G9 | No private anatomy pixel in any capture | e2e with a test profile that has the anatomy unlocked |
| G10 | A dragged limb reaches its target; feet do not skate | Unit (`ik.mjs`) and e2e |
| G11 | The metric fields are forgiving and clear | `metric-entry.mjs` tests and a five-person session |

## Risks and how the plan answers them

| Risk | Answer |
| --- | --- |
| **Frame time** with 60,000 strands, separable subsurface scattering and 8× antialiasing | Tiers and the governor; strand count as a draw range; SSS only on HIGH; S4 measures on a reference device matrix before the numbers are fixed |
| **Licences** (Anny, Z-Anatomy, MHR, Mixamo) | Nothing ships without a provenance entry; the spike S1 returns yes or no with evidence; own-authored fallback for every part |
| **iOS and Safari limits** (canvas size about 16.7 megapixels, no Fullscreen API on iPhone, Web Share file support varies) | Run-time capability probes with fallbacks written into [05](05-viewer-and-interaction-spec.md); Safari is in the device matrix |
| **Uncanny valley**: stills that look real while motion does not | Keep idle motion and gaze subtle and always on; avoid claiming photorealism; a five-person review before the face ships |
| **Authoring effort** for hands, face and garments | Artist budget stated; B steps are independent, so the viewer and appearance tracks pay off first |
| **Software-GL test results differ from a GPU** | The probe runs both (`--gpu`); gates that depend on frame time run on a real device |
| **Privacy of a realistic body** | The existing adult gate, cover policy and capture redaction are unchanged and tested; v3 requests the gated file only after eligibility; no feature creates a likeness of a real person's face |
| **Scope creep** | Each step has one gate; underlay organs and cloth simulation are explicitly optional |

## Decisions needed from you

1. **Default camera mode** for new users: Turntable (simplest) or Orbit (more freedom)? Recommendation: Turntable with a one-tap
   "Free" toggle.
2. **Z-Anatomy** (CC BY-SA 4.0): accept share-alike for the underlay *asset* files, or author the underlay ourselves?
3. **Authoring budget** for track B: contractor, in-house, or both?
4. **Minimum device**: the oldest phone and browser versions the HIGH tier may assume (sets the device matrix for the governor).
5. **Default scene**: Studio floor (current look) or a space sky as the first impression?

## Start here

If you say "go", the first branch of work is **S0 + QW1 to QW6 + V1**: it fixes the floor, the auto-rotate, the screenshot size
and the share file, adds the ViewCube and camera modes, and needs no new asset. Everything it relies on is already written and
tested in [`code/`](code/).
