# Scripts

This folder contains one-off utility and migration scripts used during development.
These are **not part of the application runtime** — they are developer tools only.

## Files

| Script | Purpose |
|--------|--------|
| `fix-usestore.mjs` | Migrates old `useStore.js` references to new `userStore.js` Zustand store |
| `replace-hovers.js` | Replaces legacy hover styles across components with CSS variable equivalents |
| `generate_humanoid.py` | Python utility to generate/modify the `humanoid-base.glb` 3D model |
| `plan-preview/build-model.mjs` | Builds `plan-assets/human-preview.js` (the v4 plan page's 3D human) from `humanoid-base.glb`: the body, a 2048 px skin map, five shape morphs for the face, and the eye, brow and lash guides (no photo hair cards, no eye texture, no external-anatomy mesh); needs `sharp` (`npm install --no-save sharp`). Run via `npm run plan:model` |
| `plan-preview/build-viewer.mjs` | Bundles `plan-assets/src/` and three.js into `plan-assets/human-stage.js`. Run via `npm run plan:viewer` |
| `upgrade-human-attachments.mjs` | Creates the adult-v2 full/lite derivatives from the assessed CC0 GLBs, preserving body/face data and calibrated sections while binding pelvic attachment tissue to body triangles and morphs. Checks source hashes and archived licences, then records derivative hashes. Run `npm run humanoid:upgrade`. |
| `verify-human-sources.mjs` | Verifies all 97 cached MakeHuman source and system-pack files against pinned manifests. Run after `humanoid:fetch` and source extraction; the source cache is not required in release CI. |
| `build-human-75.mjs` | Builds the additive preview-75 full/lite pair, 79-joint rig, measured morph pivots, skin attributes, surface parts and periodic micro PNGs from hash-verified assessed assets and five pinned CC0 source inputs. Definitions live in `src/config/humanSurface.json`; implementation lives in `human75/`. Existing GLBs are retained. |
| `makehuman/export-feature-repair.py` | Uses the existing converter/numpy environment to export complete CC0 proxy faces and the old vertex mapping. The corrected converter reads actual polygon corners, never vertex valence as face arity. |
| `repair-human-feature-topology.mjs` | Verifies every old proxy position/morph against the export, then repairs feature geometry only. Default is a dry run under `.tmp/human-review/repaired`; `--write` backs up inputs, writes validated GLBs and updates provenance. Preserves body, rig, transforms and image bytes. |
| `makehuman/test-feature-topology.py` | Regression for the quad/vertex-valence error, plus padded triangles. Run with the converter's existing numpy environment. |
| `makehuman/compile_wardrobe.py` | Verifies the cached CC0 archive and compiles four authored garment sets with source hashes and archived release notices. Uses the humanoid converter's project numpy environment. |
| `makehuman/resize_wardrobe_maps.ps1` | Optional Windows build step that caps wardrobe maps at 1024 pixels. Originals remain in the source cache. |
| `build-wardrobe-assets.mjs` | Subdivides and binds authored garment patterns to the approved body, transfers pose weights, and updates geometry/texture provenance. Run `npm run wardrobe:build`; see [Wardrobe customization](../docs/WARDROBE.md). |

## Usage

Run migration utilities only for their named migrations. Keep the model/wardrobe build and verification tools as part of the reproducible asset pipeline.

## Reproduce the articulated preview

Prepare the existing pinned source cache with `humanoid:fetch` / `humanoid:compile` as documented for the converter. The new builder itself uses Node and the installed project dependencies; it reads the source OBJ and four macro targets, verifies their pinned hashes, and does not read the AGPL distribution weight file.

```powershell
node scripts/build-human-75.mjs
npm.cmd run validate:glb
npm.cmd run check:assets -- --release
node scripts/analyze-human-model.mjs public/assets/models/humanoid-preview-75.glb --out docs/real-human-3d/data/milestone-75
node scripts/analyze-human-model.mjs public/assets/models/humanoid-preview-75-lite.glb --out docs/real-human-3d/data/milestone-75
```

`validate:glb` runs both the project checks and `gltf-validator` on all six retained models. To inspect complete Khronos JSON reports, use `node scripts/validate-glb-format.mjs --out docs/real-human-3d/data/review-75/format-after`. The reviewed-source normalization command is `npm.cmd run normalize:glb-format`; it records and backs up each hash-verified input, preserves original geometry/morph/image payloads, updates provenance, then must be followed by both GLB validators. See `data/review-75/format-repair.json` for the verified preservation chain.

The build writes only its new asset/PNG names, matching provenance entries and `data/milestone-75/asset-build.json`. It verifies the assessed source GLB hashes before use. Release checks and tests consume the generated files directly and do not require the source cache. See [architecture and limitations](../docs/real-human-3d/12-articulated-surface-architecture.md).

## Reproduce the feature topology repair

Use the pinned CC0 source cache prepared by `humanoid:fetch` / `humanoid:compile` and the converter's existing Python environment:

```powershell
node scripts/verify-human-sources.mjs
.tmp/model-python/Scripts/python.exe -I scripts/makehuman/test-feature-topology.py
.tmp/model-python/Scripts/python.exe -I scripts/makehuman/export-feature-repair.py
node scripts/repair-human-feature-topology.mjs
node scripts/repair-human-feature-topology.mjs --write
npm.cmd run validate:glb
npm.cmd run check:assets -- --release
```

The repair refuses unknown input geometry, mismatched provenance or any difference in existing source positions/morphs greater than 1 µm. It checks body/rig/image payloads before writing any release file. Inputs are backed up under `.tmp/human-review/originals`. Re-running an already repaired asset is a no-op. The source cache is a development dependency; release verification uses the committed GLBs, provenance and repair evidence instead.
