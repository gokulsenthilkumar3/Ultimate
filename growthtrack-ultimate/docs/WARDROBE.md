# Wardrobe customization

The Clothing editor uses separate garment meshes on the approved humanoid assets. The body is not recolored into a shirt or trousers. Garment topology, collars, cuffs, plackets, folds and UV seams come from verified CC0 MakeHuman patterns. Underwear, gym and swim styles crop and refit the trouser/T-shirt patterns; they are derivative previews rather than newly authored sewing patterns.

| Mode | Styles and controls |
| --- | --- |
| Anatomical | Opens the anatomy editor, or returns to underwear. Reveal remains session-only and is never restored from wardrobe preferences. |
| Underwear | Briefs, trunks, boxer briefs; fabric/trim colors, fit, fabric, surface, ease, hem and waist rise. |
| Gym | Tank with shorts, training tee with shorts, compression set; separate top/bottom/trim colors and fit/fabric controls. Compression uses a sleeved top. |
| Casual | Authored sweatshirt or T-shirt with trousers; separate colors and fit/fabric controls. |
| Formal | Collared shirt with trousers, or jacket/shirt/trousers; original texture is available for the authored suit details. |
| Swimwear | Board shorts or shorter swim shorts with adjustable waist and hem. |

The controls beneath each outfit affect the current preview and save independently for that outfit:

- **Fit** scales the pattern's native clearance. **Garment ease** adds a separate normal offset in centimetres; these settings do not overwrite chest, waist, hip or private measurements.
- **Hem length** adjusts the cut and lower garment geometry. **Waist rise** moves the waistband. Extended hems keep feet visible.

- **Fabric** changes physical-material roughness, sheen and weave. **Fabric detail** controls surface detail. Casual/formal patterns use their authored normal maps; underwear and sportswear avoid the source jeans' normal-map details.
- **Surface** supports a solid fabric, original garment texture, or pinstripes. Original texture colors are multiplied by the chosen tint, so their final color can differ from the color picker.
- **Reset this outfit** affects only the selected outfit. Failed saves keep the preview and offer an explicit retry.

Lower garments retain the waist opening from their authored pattern, rather than being cropped at the legacy shell's fixed hip-height band. Waistband trim and hidden-body masking follow that opening's curved front, side and back profile. Waist-rise edits move the waistband and its mask together, independently of body measurements. Underwear and swimwear keep the torso exposed.

Saved wardrobe data stays under `physiqueTargets.wardrobePreferences`, using the existing owner-scoped functional update path. Old records receive presentation defaults. Other targets, anatomy records, lighting and custom backgrounds are preserved.

## Renderer and fitting

`authoredGarments.js` follows the evaluated body surface using three-vertex barycentric bindings, then applies the body's pose through normalized skin weights. Each clone owns its garment buffers. Changing the current body does not alter the goal garment's geometry. Garment source buffers and body measurements remain unchanged.

At the waist, upper fabric is separated from the outermost fitted trouser surface using a BVH and a small thickness clearance. Both vertices and triangle interiors are checked, and correction is shared across UV seams. The owned acceleration structure refits when body measurements or morphs change and is disposed with the garment. This addresses raised-waistband intersections with shirts; it does not simulate fabric drape. Authored and fallback shaders have separate cache keys, so a completed garment download replaces the temporary shell's cut rules.

The importer preserves every source polygon corner using per-face corner counts, independently of MakeHuman's per-vertex connection counts. The offline binding step subdivides coarse garment faces and gives them outward clearance against the approved body surface. UV seam duplicates share physical offsets and smoothed normals, keeping sewn edges together as ease changes. Rendering omits hidden body interiors under covered fabric; exposed hands, feet, neck and garment openings remain available. Authored shirt openings are preserved instead of receiving a second bone-based sleeve cut. The same crop rules apply to garment depth and distance shadows. Body masking is removed on returning to Anatomical mode.

The selected garment preloads alongside the body. Geometry downloads are split by source pattern and cached for subsequent outfit changes, rather than downloading the entire wardrobe before showing detailed clothing.

Bindings target the approved body topology. A custom avatar with incompatible topology retains the earlier body-following shell fallback. A failed detailed-asset request is logged and can be retried by changing to another outfit or style and returning. Screenshots capture the wardrobe; the existing physical-avatar GLB export excludes shader-based wardrobe effects.

These are fitted garment previews, not cloth simulation, validated tailoring sizes or a guarantee of collision-free behavior at every possible combination of body proportions and pose. Dynamic drape and a dedicated authored pattern for every sports/underwear style remain further work.

## Sources and reproducible build

The [official system-asset catalog](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) lists the selected assets as CC0. The byte-verified archive has SHA-256 `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107`. Selected `.mhclo`/`.mhmat` files contain explicit September 2020 CC0 release notices. Those headers are archived in [wardrobe-cc0-notices.txt](licenses/wardrobe-cc0-notices.txt); the complete CC0 text is already archived with the humanoid asset evidence.

`public/assets/wardrobe/manifest.json` records every input member hash, compiled geometry hash, body binding hash and shipped output hash. The main asset provenance manifest also covers each wardrobe GLB and texture. Release checks verify both geometry and textures.

After preparing the existing MakeHuman source cache:

```powershell
.tmp/model-python/Scripts/python.exe -I scripts/makehuman/compile_wardrobe.py
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/makehuman/resize_wardrobe_maps.ps1
npm run wardrobe:build
npm run check:assets -- --release
```

The Python compiler needs the same numpy environment as the humanoid converter. The optional Windows texture step caps maps at 1024 pixels while preserving original cached sources. The Node binding builder uses the project's existing Three.js/BVH tools; release runtime does not require Python or the source cache.

Regression coverage lives in `wardrobePreferences.test.js`, `WardrobeOptions.test.jsx`, `useWardrobePreferences.test.jsx`, `authoredGarments.test.js`, `garmentGeometry.test.js`, the asset-provenance suite, and `tests/e2e/physique-customization.spec.ts`.
