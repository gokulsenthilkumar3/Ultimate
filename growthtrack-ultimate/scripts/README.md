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
| `makehuman/compile_wardrobe.py` | Verifies the cached CC0 archive and compiles four authored garment sets with source hashes and archived release notices. Uses the humanoid converter's project numpy environment. |
| `makehuman/resize_wardrobe_maps.ps1` | Optional Windows build step that caps wardrobe maps at 1024 pixels. Originals remain in the source cache. |
| `build-wardrobe-assets.mjs` | Subdivides and binds authored garment patterns to the approved body, transfers pose weights, and updates geometry/texture provenance. Run `npm run wardrobe:build`; see [Wardrobe customization](../docs/WARDROBE.md). |

## Usage

Run migration utilities only for their named migrations. Keep the model/wardrobe build and verification tools as part of the reproducible asset pipeline.
