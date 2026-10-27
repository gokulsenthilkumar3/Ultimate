# Parametric editor and editable exports

Implemented and verified on **26 October 2026**. This is an opt-in customization prototype, not a lifelike-human or production-release certification.

**Subsequent visual asset pass:** [Desktop skin, hair and tee integration](21-desktop-visual-assets.md) adds authored CC0 colour, estimated surface maps and conforming attachments. It records the user's desktop-first/personal-likeness and Android 15 targets, new sample sizes and active-editing timings. The counts and untextured limitations below describe the preceding foundation checkpoint.

## Open the editor

Open **Wellness → Physique → 3D Mirror → Parametric human editor**. The existing Body tracker remains available. The parametric document is saved per person through the existing save queue; Current and Goal have independent shape and colour values. Tracker measurements and check-in history are separate.

The default interface provides 22 signed controls, region selection and search. Advanced mode exposes the 306 named source channels. Skin/eye colours, front/side/back/face views and a clay inspection view are available. The controls express artistic shape weights, not calibrated measurements.

## Asset and rendering contract

- Source: `nirholas/three.ws`, pinned revision `9952a5ae1c888179b25cf24ef97a4280be7ae7fd`; MakeHuman/MPFB2 basis via Anny. The imported GLB and source notices are hash-checked before use/export.
- Source GLB: **6,806,984 bytes**, SHA-256 `6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18`. Licence/source records are in `public/assets/parametric/` and `public/assets/models/ASSET-PROVENANCE.json`.
- Body: **14,517 vertices, 26,756 triangles, 306 position targets**. Eyes/teeth/tongue retain their corresponding source shapes. The skeleton has **52 joints**.
- The live viewer evaluates identity shapes on the CPU and recomputes normals. It renders **zero identity morph layers**, avoiding the approximately **68 MiB source morph-texture estimate** and the 306-layer requirement. That estimate is not a measured GPU allocation; the CPU authoring basis still occupies memory.
- A bound shorts preview follows body vertices. This is approximate cover geometry, not a garment fitting or collision certification.
- GrowthTrack's procedural skin-scattering shader has a standard PBR export fallback. The imported source has no texture images. This implementation does not supply finished skin maps, hair, corneal optics or expression correctives.

## Export and restore

| Action | Contents and supported use | Limit |
|---|---|---|
| Export GLB | Selected identity baked into a **1,264,324-byte** sample, skin colours, five meshes including shorts and the 52-joint rig | No original identity morph bank; browser shader code does not travel with the file |
| Export shape-editing GLB | **57,166,832-byte** desktop sample retaining all 306 named body targets, corresponding auxiliary/cover targets and selected weights | Intended for a desktop DCC such as Blender; never mounted as the browser viewing scene |
| Export editable package | `avatar.glb`, versioned `avatar.json`, original `basis.glb`, manifest, README and source notices | Third-party tools do not automatically implement GrowthTrack's semantic editor |
| Open editable package | Validates the package, then previews a confirmation before restoring both Current/Goal semantic states for the selected person | External mesh/sculpt/rig/material changes are not applied back to the semantic editor |

Packages are capped at 128 MiB. Import checks the STORE-only ZIP structure, entry set and sizes, hashes, source/asset identity, document schema and embedded GLB structure. ZIP comments are rejected because competing end-of-directory records could otherwise make preflight and decoding inspect different entries. A crafted-archive regression verifies that rejection.

External topology-changing sculpt reimport, automatic recovery of semantic parameters, fitted rest-skeleton updates and migration from older tracker figures are not implemented.

## Verification and evidence

- **82 unit/regression tests passed across 11 files**: semantic document/package validation, independent Current/Goal state, delayed saves, CPU identity evaluation, source immutability, cover deformation, named-shape export, rig isolation and skin materials.
- **Two Chromium flows passed**: save/navigation, independent versions, editable-package download/restore, compact and shape-editing GLB validation, 306 named weights, per-person state and 390 px layout. All API calls use fixtures; these checks do not open the owner database.
- Both app-generated GLBs have **zero glTF validation errors and zero warnings**. Reports: `artifacts/parametric-human/export-validation.json` and `shape-editing-validation.json`.
- **Blender 5.1.1** imported the compact export and the shape-editing export. The latter retained all 306 named body keys and all 52 source joints. Changing `noseWider` from approximately **0.45 to 0.60**, roughness, a vertex and a pose succeeded; the re-export preserved the named channels, edited weight and source joints. Evidence: `artifacts/parametric-human/blender-shape-editing/blender-edit-verification.json` and its `.blend`/GLB outputs.
- Blender's re-export has **zero validation errors and five `NODE_SKINNED_MESH_NON_ROOT` warnings**; these differ from the warning-free app exports. External-tool material/render parity and animation correctness are not certified.
- The desktop Chromium sample recorded **17.30 ms p95 frame interval across 181 frames**, five draw calls and 28,742 triangles, at a 1440 × 1050 browser viewport. Last CPU evaluation was 14.70 ms. These are one short stationary browser sample, not a physical-phone benchmark or sustained performance guarantee. Raw record: `artifacts/parametric-human/browser-preview.json`.
- `npm run typecheck` and `npm run build` passed. ESLint completed with **zero errors and 93 warnings**; the production build retains the large Three.js chunk warning.

Reproduce the browser checks with `npm run test:e2e:parametric`. The DCC check is `blender --background --factory-startup --python scripts/verify-parametric-blender.py -- artifacts/parametric-human/avatar-shape-editing.glb artifacts/parametric-human/blender-shape-editing 306`. Targeted test files are named `avatarDocument`, `parametricHuman`, `parametricExport`, `parametricEditingExport`, `parametricIdentity`, `avatarPackage`, `canonicalCover`, `useParametricAvatar`, `skinScattering`, `physicalSkinMaterial` and `cloneHumanoidScene`.

## Remaining acceptance gates

The next product work is visual asset quality and supported deformation: authored skin/eyes/hair, proportion-aware rig fitting, expression/feature contact, a tested garment matrix and approved reference images. Named physical devices, a sustained performance soak, vendor identity capture and arbitrary external-edit reimport still need separate implementation and evidence. No deployment or owner-data migration was performed.
