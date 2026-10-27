# Desktop visual asset pass

Date: **26 October 2026**. Target confirmed by the user: **their own likeness, desktop first, then Android 15**. No front/profile reference photographs or Android hardware model have been provided. This pass supplies reusable skin and attachment assets; it does not certify personal likeness or a lifelike finished character.

## Visible result and remaining defects

Review the actual renders: [neutral portrait](../../artifacts/parametric-visual/desktop-neutral-face.png), [front](../../artifacts/parametric-visual/desktop-neutral-front.png), [side](../../artifacts/parametric-visual/desktop-neutral-side.png), [back](../../artifacts/parametric-visual/desktop-neutral-back.png), and [head combination](../../artifacts/parametric-visual/desktop-head-combination-face.png). Three further torso-combination views are in the same evidence directory.

Skin now has authored colour variation and lip/face detail. The head has attached textured hair, and the body wears an authored tee over the existing shorts preview. The portrait still has flat dark eyes without corneal/iris depth, a coarse hairline and a generic neutral face. The tee is a finite fitting prototype. These are visible outstanding defects, not issues that passing numerical tests resolves.

The next acceptance step is comparison against the user's front and profile photographs under matched framing and neutral lighting. Eye/oral construction, expressions, proportion-aware rig fitting and higher-quality hair remain open. No personal identity is inferred from the generic source textures.

## Asset work

| Component | Delivered | Evidence and limits |
|---|---|---|
| Skin albedo | Unmodified 2048 × 2048 MakeHuman CC0 authored atlas | All 14,517 seam-expanded canonical vertices match the HM08 source UVs; maximum UV error 4.21e-8. No reprojection. The source retains some baked shading/stubble; it is not a certified delit scan |
| Roughness | 1024 × 1024 regional bake | Project-estimated geometry regions, including facial oil/skin variation; not measured roughness |
| Pore normals | Existing 256 × 256 seeded project microtile, repeated 64 × 64 | Procedural detail; not scanned pores. Normal-map UV transform and tangents are included in exports |
| Scattering mask | 1024 × 1024 regional weight map | Modulates the normalized direct diffuse-wrap approximation. This is not physiological thickness or diffusion/ear transmission |
| Hair | CC0 authored `short02`, 2,061 vertices / 3,344 triangles | All 707 proxy anchors use exact HM08 body correspondence; textured cards have normal maps, alpha testing and anisotropic shading. Hairline/style quality remains below the intended portrait target |
| Tee | CC0 authored casual tee, 916 vertices / 1,528 triangles | Six visible-body anchors are exact; 1,805 helper anchors transfer through visible-body barycentric bindings. Maximum neutral helper projection distance is 19.25 mm. Triangle interiors and posed collision are not certified |

Maps are hash-verified before loading. The albedo uses sRGB; roughness, normal and scattering data use no colour-space conversion. Per-person materials own their settings, while cached maps remain loader-owned. The lighting uses neutral white key light and Khronos PBR Neutral tone mapping. Shared legacy tracker materials/assets are preserved.

The skin map files total **3,846,902 bytes**. Skin plus hair/tee decoded RGBA8 textures with mipmaps have an approximate **85.7 MiB** resource-size budget, excluding geometry, CPU copies and render targets. This is an estimate, not measured resident GPU memory. Avoiding the original identity morph texture does not eliminate the need for an Android texture budget and compression/quality work.

Asset identities, file hashes, source archive records and uniquely named export notices live under `public/assets/parametric/skin/` and `attachments/`. The existing [CC0 source evidence](../ASSET_LICENCE_RESOLUTION.md) and [MakeHuman system asset catalog](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) identify the reused art. Estimated auxiliary maps are labelled as project-generated throughout.

## Deformation and portability

The live scene still evaluates identity on the CPU and renders **zero identity morph layers**, including attachments. Hair and tee follow the current body positions and share its skinning bind space. Their tests cover ten named shape configurations, transferred skin weights, a head-pose change and signed vertex clearance. This proves that selected geometry and binding operations work; it does not establish arbitrary-body, limb-length or cloth-motion correctness.

The compact export now contains seven meshes, embedded skin/hair/tee maps and the 52-joint rig. The current sample is **15,547,680 bytes**. The desktop editing GLB is **82,577,020 bytes**, retaining all 306 named body shapes and corresponding hair/tee/cover channels. Nonlinear fitting at combined extremes is approximated by additive per-channel export deltas.

The portable editing material version is `growthtrack-skin-v2`. A narrowly scoped adapter accepts the known `growthtrack-skin-v1` with an otherwise identical pinned source/topology/rig/solver, preserves Current/Goal shape and colour values, and records the visual upgrade in provenance. The UI exposes that upgrade. Unknown versions and topology mismatches remain rejected. Merely opening the editor does not write an owner-data migration.

Both app-generated exports pass the Khronos glTF validator with **zero errors and zero warnings**. Blender **5.1.1** imported both profiles, retained all seven source meshes and all 52 joints, and retained/edited all 306 body shape keys in the editing profile. Re-export preserved the edited nose weight and the normal-map repeat transform. Blender's re-exports have **zero errors and seven `NODE_SKINNED_MESH_NON_ROOT` warnings**. External render parity and arbitrary sculpt reimport remain unsupported. Evidence is in `artifacts/parametric-visual/blender-compact/` and `blender-shape-editing/`.

## Desktop evidence

The dedicated visual harness passed with four skin maps, two attachments, zero identity GPU layers, eight screenshots and no WebGL error/context loss. Hardware reported by the browser: **Intel Iris Xe through ANGLE/D3D11**. Browser viewport: 1440 × 1050; actual drawing buffer: **625 × 682**, DPR 1.

Twenty sequential changed slider samples with a combined head/torso identity recorded:

| Metric | Median | p95 | Interpretation |
|---|---:|---:|---|
| CPU identity evaluation | 10.0 ms | **19.6 ms** | Excludes attachment fitting and rendering |
| Input to two animation-frame callbacks | 78.9 ms | **116.9 ms** | Includes React/main-thread work and paint opportunities; not GPU timing |
| Host animation-frame interval during edits | See raw record | **50.0 ms** | Host callbacks under sequential test edits, not continuously rendered GPU frames |

This does **not** establish 60 FPS during active editing. The p95 input-to-two-frame sample is above the earlier proposed 100 ms response target. It does not establish mobile 30 FPS, sustained thermal behaviour or shader agreement with a reference portrait. Raw samples and limits are in `artifacts/parametric-visual/desktop-active-editing.json`.

Final interaction checking also caught unnecessary body-tangent generation on live identity edits. That data is now generated in an owned detached export geometry instead; the live normal-map shader derives its tangent frame. The table records the subsequent run. Timings vary with host load and this short sample is not a certified budget.

## Verification and reproduction

- **94 focused tests across 14 files passed** (91 together plus the delayed-loader regression and two export ownership regressions separately). Coverage includes old semantic/export behavior, the known material adapter, skin map/shader ownership, ten attachment fitting cases, offline shape banks, delayed texture-load failure cleanup/retry and tangent preparation without mutating the live scene.
- **Three Chromium flows passed**: two existing save/export/mobile-width flows and the dedicated desktop visual/active-editing harness. Mobile width is browser layout emulation, not Android hardware testing.
- Typecheck, production build and targeted ESLint passed. `npm run check:assets -- --release` passes with twelve newly tracked visual assets; other existing provenance entries are preserved. The existing large Three.js bundle warning remains.
- The source skin/attachment builders verify their pinned inputs before writing. No new external service, subscription, owner database mutation or deployment was performed.

```powershell
node scripts/parametric-visual/build-skin-assets.mjs
node scripts/parametric-visual/build-attachments.mjs
node scripts/parametric-visual/update-provenance.mjs
npm run check:assets -- --release
npm run test:e2e:parametric
node node_modules/playwright/cli.js test --config playwright.parametric-visual.config.ts
```

Builders require the already pinned local MakeHuman source caches documented in the source manifests. Missing/mismatched inputs stop the build. The next pass should be approved through personal reference comparisons and the named remaining defects above, rather than an editor feature count.
