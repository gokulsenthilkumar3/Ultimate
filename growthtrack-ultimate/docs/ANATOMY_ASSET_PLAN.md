# Authored external anatomy — sourcing, licensing and Blender plan

Historical sourcing plan and implementation record, 2026-10-19. Sections 1–6 describe the original findings and proposed authored replacement; sections 7–9 record subsequent code and asset changes. The application uses the model for adult body-measurement comparison.

Current runtime update (2026-10-20): the bundled assets now support independent section deformation and optional schematic guides through `anatomyDeformation.js`. Dimensions outside the original two-morph bands are retained and visualized; those bands are advisory. See the implementation status at the end of [Human realism and visual measurement plan](HUMAN_REALISM_AND_MEASUREMENT_PLAN.md). Earlier two-channel descriptions below document the historical implementation.

For the researched state-aware measurements, independent scrotal and buttock controls, regional skin appearance, and migration plan, see [Adult anatomy customization research plan](ANATOMY_CUSTOMIZATION_RESEARCH_PLAN.md). That plan supersedes the original population-range clamping and unspecified-measurement defaults in section 4 below; it is proposed work, not a list of implemented controls.

## 1. Original findings before implementation (measured)

| Finding | Evidence |
| --- | --- |
| Male anatomy is a **procedural placeholder**, not authored anatomy. | `make_private_anatomy_mesh()` in `scripts/build-makehuman-glb.py` builds a 32-segment parametric surface; its docstring notes the HM08 helper is "intentionally very sparse". |
| It is a **separate mesh** that does not follow the body. | `GrowthTrackPrivateAnatomy` has 2 shape keys; the body has 58. At full weight `overall_mass` opens an 11.9 mm gap at the attachment, `pelvis_width` 3.1 mm, `hip_width` and `oblique_def` 2.3 mm. Up to ~4 mm gap at rest. |
| Its girth key **moves the root**. | `d_girth` shifts the attachment ring 6.7 mm while the body stays put. |
| **No female anatomy exists.** "Female Base" loads the male asset. | `modelAssetRegistry.js` falls back to `DEFAULT_ASSETS.production` for `female`. MakeHuman 1.1.1 targets on disk include `genitals/penis-*` only. |
| **No adult check.** | Anatomical mode is a plain toggle in `HumanoidViewer.tsx`. `OwnerProfile.dateOfBirth` exists but is unused here. |
| Size inputs have **no units or basis**. | `d_size` 3–9 and `d_girth` 3–7 in `metricsToBlendshapes.js`. |

Already right and kept: the mode is off by default, screenshots and sharing hide the anatomy mesh, and the GLB marks it `sensitive`.

## 2. Asset sources compared

| Source | Licence position (verified 2026-10-19) | Female external anatomy | Fit for us |
| --- | --- | --- | --- |
| **MakeHuman 1.1 / MPFB core assets** (already on disk: `male_generic`, `female_generic`, skins, breast targets) | Core assets CC0; no payment or attribution. Third-party asset packs are separate, and each needs checking. The earlier review found AGPLv3 headers on bundled eye/hair proxies. | Female base and breast targets yes; **no female genital targets**; male genital targets are sparse. | **Use as the base body for both sexes.** Not enough on its own for accurate anatomy. |
| **Commissioned sculpt** (freelance character or medical artist) | Clean if the contract assigns copyright (work-for-hire or written assignment) and allows web/app distribution. | Yes, to brief. | **Recommended for the anatomy itself.** |
| **Z-Anatomy / BodyParts3D** | CC BY-SA 4.0 (derived from BodyParts3D). Share-alike would apply to any shipped derivative. External-genitalia coverage not confirmed. | Unconfirmed. | **Reference only**: an artist may study it; do not ship derived geometry unless we accept BY-SA for the asset. |
| **Daz 3D (Genesis 9 + anatomical add-ons)** | Shipping 3D data in an app needs a per-product Interactive License, which each product's creator may not offer. Nothing found on anatomical add-ons specifically. | Product-dependent. | Only if every product used offers an Interactive License covering web GLB delivery. Otherwise excluded. |
| **3D Scan Store** | Terms prohibit producing an "anatomy / photography viewer" from any scan. | Yes, but irrelevant. | **Excluded.** |
| Reallusion CC4, MetaHuman, SMPL-X | Not verified for this use. MetaHuman and SMPL-X have no external genital geometry; SMPL-X is non-commercial research. | No / unverified. | Not pursued. |

**Recommendation:** MakeHuman CC0 bases for both sexes, with external anatomy sculpted by a contracted artist under a copyright assignment, directly on the body's own topology. Z-Anatomy and medical atlases serve as reference only. This avoids per-product runtime licences and share-alike obligations, and it removes the seam by construction.

## 3. Licensing evidence (required before shipping)

For every source file in the build, add an entry to `public/assets/models/ASSET-PROVENANCE.json`: source URL or contract ID, author, licence name and version, retrieval date, file SHA-256, and whether it was modified. CI fails the build if any packaged mesh, texture or proxy lacks an entry. The artist contract must state: copyright assignment (or exclusive, perpetual, worldwide licence) covering modification and real-time web/desktop/mobile distribution, no third-party content, and no AI-generated geometry without disclosure. Replace the generated "CC0" claim in the GLB `asset` block with the provenance file's actual result.

## 4. Blender production plan

1. **Two base bodies, one topology.** Build `GrowthTrackBody` male and female from the MakeHuman HM08 base and its CC0 targets, using the existing `build-makehuman-glb.py` path. Shared topology and UVs keep all 58 morphs, measurements and skin bakes common to both.
2. **Sculpt anatomy into the body mesh, not beside it.** The artist works on the pelvic region of each base in Blender. Add edge loops there for resolution, but no separate floating object, so it can never separate from the body. Deliver a multires sculpt plus a retopologised runtime level.
3. **Privacy without a hole.** Instead of hiding a separate mesh, author a `privacy_cover` shape key: a smooth, neutral surface over the same vertices. Default weight 1 (covered); Anatomical mode sets it to 0. Screenshots and sharing force it back to 1. This keeps today's privacy guarantees and avoids the current attachment problem.
4. **Size variation from published ranges.** Replace unitless `d_size`/`d_girth` with keys calibrated in centimetres:
   - **Male:** length and circumference spanning the population range in the Veale et al. (2015, *BJU International*) nomograms.
   - **Female:** the measured variation reported by Lloyd et al. (2005, *BJOG*) — labia, clitoral hood and perineum dimensions.
   
   Clamp inputs to those ranges. A neutral "prefer not to specify" default uses population medians.
5. **Body-wide morph check.** Because the anatomy shares the body mesh, every existing morph deforms it. The artist reviews the extremes (`overall_mass`, `pelvis_width`, `hip_width`, `glute_volume`, `gut_volume`) and adds corrective keys where the shape distorts.
6. **Rig weights.** Weight the region to pelvis and upper-thigh bones; add hip-flexion and leg-abduction correctives so seated or spread poses do not tear or collapse.
7. **Surface.** Extend the existing UV atlas and skin texture into the region and re-run `bake-geometry-surface.mjs` so normal, AO and albedo match the surrounding skin. The skin-tone variants must cover the region consistently.
8. **Export.** Produce `humanoid-male.glb` and `humanoid-female.glb` (plus lite LODs) through the existing build script, mark them `sensitive`, and point `VITE_HUMANOID_MALE_MODEL` / `VITE_HUMANOID_FEMALE_MODEL` at them. The registry must refuse to show anatomy when the selected sex has no matching asset.

## 5. Acceptance gates

| Gate | Pass condition |
| --- | --- |
| Seam / follow | The existing measurement script reports ≤ 0.5 mm separation across all morphs at weights 0, 0.5 and 1, for both assets. |
| Calibration | Size keys reproduce the entered centimetre values within ±5 % on the deformed mesh. |
| Topology | No non-manifold edges or inverted normals in the region; triangle budget within the current body budget +10 %. |
| Visual review | Artist plus owner review neutral clinical renders (front, side, three-quarter) of both assets at three body types. Review images stay in the private review directory and are never committed or shipped. |
| Privacy | Unit tests prove the cover key is forced on for screenshots, sharing and exports, and that Anatomical mode starts off for every session. |
| Licensing | `ASSET-PROVENANCE.json` covers every packaged file; CI check passes. |

## 6. App changes that come with the asset

- **Adult gate:** Anatomical mode requires `OwnerProfile.dateOfBirth` showing 18 or older. If the date of birth is missing, ask for it once; never infer age.
- **Sex selection:** Choose the base from the owner's chosen body base, with an explicit "neutral / covered" option. Never show anatomy that does not match the selected base.
- **Units and copy:** Size inputs in cm with the published range shown; plain clinical wording.
- **Exports:** The "Download body GLB" export keeps the cover key on unless the owner explicitly includes anatomy for that one export.

## 7. Done on 2026-10-19 (no new art)

- **Adult gate:** `anatomyPolicy.js` requires a saved date of birth showing 18 or older; the renderer's `isAnatomyVisible` now requires an explicit eligibility flag, so body export (visible meshes only) is gated too. A missing date prompts once in the anatomy card. The wizard no longer offers Anatomical as a default outfit.
- **Body base matching:** the shipped assets are declared to carry male anatomy; a female or neutral base, or any asset that does not declare `anatomySex` in its anatomy node extras, stays covered. The build script now writes that declaration.
- **Centimetres:** resting length and mid-shaft circumference are entered in cm (accepted 3–16 cm and 5–14 cm; typical bands from Veale 2015 shown). Morph weights are derived from the asset's measured geometry, locked by a test that re-measures both GLBs. Since the 2026-10-19 rebuild the asset draws the whole accepted range (3–16 cm length, 5–14 cm circumference at 175 cm stature), so typical values are drawn as entered; an unset value is drawn at the Veale mean and only converted legacy values can still be clamped (the UI says so). The surface is project-modelled rather than authored: a curved shaft rooted flush with the skin, coronal ridge and closed glans, and a two-lobed scrotum, with pigment vertex colours, procedural scrotal folds and pubic hair that follows the profile's body-hair pattern. It is anchored to HM08 pelvis vertices, follows body morphs and is bound to the Hips bone. An authored, scan-quality asset (below) remains the target. Older inch values are read as converted cm and kept as recorded. Private sizes were removed from the general metric logger.
- **Provenance:** `public/assets/models/ASSET-PROVENANCE.json` plus `npm run check:assets` (CI step). Reading the source package showed its data is "GPL-3 or MH-output-exception" (CC0 only for MakeHuman-application exports) and the eye and hair proxies are marked AGPLv3, so four components of each GLB are recorded as **unresolved**; `--release` fails until they are resolved. The shipped notice no longer claims CC0.

## 8. What can start now vs. what needs a decision

- **Licence:** resolved on 2026-10-19 by rebuilding from pinned CC0 sources; see `ASSET_LICENCE_RESOLUTION.md`. New authored anatomy must arrive with equally verifiable evidence.

- **Licence resolution (new):** re-derive the body through the MakeHuman application's own export (which carries the CC0 exception) or a current CC0-labelled MakeHuman/MPFB release, replace the AGPLv3 eye and hair proxies, or obtain written clarification; then mark components verified.
- **Needs your decision:** the artist brief and contract (budget and timeline come from quotes; none estimated here), and whether to keep MakeHuman as the base or move to a commissioned base as well.
- **Interim option:** bind the current placeholder to body morphs to close the measured seam. This is worth doing only if the commissioned asset is more than a few weeks away, since step 2 replaces it.

## 9. Pelvis refinement pass, 2026-10-19

The shipped full and lite GLBs now contain a local conforming subdivision of
the rear pelvis (1,484 added body vertices) and a 4,803-vertex external-anatomy
mesh. The scrotal surface has a continuous asymmetric envelope and shallow
midline rather than a pinched pair of spheres. Circumferential detail uses
irregular, seamless relief below 0.5 mm instead of the earlier oversized ridges.
Pubic hair uses distance-filtered fine strands rather than a solid colour patch.
Anatomy normals are recomputed from the active morph pose and cached until the
pose changes; comparison figures own separate geometry buffers.

`build-makehuman-glb.py` runs `refine-pelvis-assets.mjs` before surface baking.
Its `--pelvis-geometry-output FILE` option also supports updating anatomy while
preserving the existing baked textures and accessory bindings. Original body
vertices, skin weights, morph names and the centimetre calibration are retained.
The source assets remain procedural; this pass does not certify scan fidelity
or replace the commissioned sculpt described above.

Review with `scripts/review-pelvis.html` through the development server and
`playwright.physique.config.ts`. Neutral front, side, back and oblique images
are written to the ignored `.tmp/anatomy-realism-review/` directory. Previous
shipped GLBs were backed up there before promotion. The provenance manifest
records the promoted hashes; adult eligibility, default covering and capture
redaction remain enforced by the existing tests.

## Sources

- MakeHuman licence: https://static.makehumancommunity.org/about/license.html
- MakeHuman asset packs FAQ (third-party assets): https://static.makehumancommunity.org/assets/assetpacks/faq.html
- Z-Anatomy repository (CC BY-SA 4.0): https://github.com/Z-Anatomy/Models-of-human-anatomy
- Daz Interactive Licenses: https://www.daz3d.com/interactive-license-info
- 3D Scan Store terms and licensing: https://www.3dscanstore.com/terms-and-conditions-licensing
- Veale D. et al. (2015). Am I normal? A systematic review and construction of nomograms for flaccid and erect penis length and circumference in up to 15,521 men. *BJU International* 115(6).
- Lloyd J. et al. (2005). Female genital appearance: "normality" unfolds. *BJOG* 112(5).
