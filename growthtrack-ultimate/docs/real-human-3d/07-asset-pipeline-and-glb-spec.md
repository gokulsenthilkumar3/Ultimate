# 07 · Building the model: asset pipeline and the GLB v3 specification

This is how the human is built, packaged and proven. It extends, rather than replaces, the repository's existing contracts:
`DIGITAL_HUMAN_V2_PLAN.md` (budgets and release gates), `digitalHumanV2.js` (required parts, at least 55 bones and 80 morph
targets), `humanoid-glb-spec.md`, `ASSET-PROVENANCE.json` and `npm run check:assets`. **GLB v3 is the target asset contract**;
conformance, human visual quality and runtime behavior must each be demonstrated. The current approval scope is
[the R2/I2 full-human plan](16-private-anatomy.md#implementation-plan-i2); a new file name or larger rig does not satisfy it by itself.

**Current implementation at 75 planning points:** the default male preset resolves the additive preview-75 full/lite pair; covered female/neutral fallbacks and custom asset choices remain. The new pair has 79 named joints, generated digit bindings, measured morph metadata, surface attributes, micro tiles and separate cornea/tearline/nails, passing **17/23 applicable required checks and 0/5 recommended checks**. It is not a complete v2/v3 authored asset. The four retained source files keep their historical 9/23 baseline. Full/lite still share the body geometry and the lite file exceeds the proposed compressed first-paint budget. See [current architecture](12-articulated-surface-architecture.md) and [fresh verification](data/milestone-75/review.json). Budgets below remain acceptance targets.

## 1 · Budgets

| Budget | Value | Source |
| --- | --- | --- |
| Initial 3D payload (first paint) | ≤ 5 MB | `DIGITAL_HUMAN_V2_PLAN.md` |
| Mobile model | ≤ 3 MB | `DIGITAL_HUMAN_V2_PLAN.md` |
| Frame time p95 | 16.7 ms desktop, 33 ms phone | `DIGITAL_HUMAN_V2_PLAN.md` |
| Joints | 79 (budget 100); v2 contract needs ≥ 55, target 70 | [03](03-anatomy-spec.md), `digitalHumanV2.js` |
| Morph targets | 110 planned (58 proportion + 52 face), budget 160; v2 contract needs ≥ 80 | |
| Body triangles | LOD0 ≤ 120,000, LOD1 ≈ 35,000, LOD2 (core) ≤ 30,000 | Plan; today 29,682 |
| GPU texture memory | LOW 40, BALANCED 100, HIGH 150 MiB | Computed in [03](03-anatomy-spec.md) |
| Hero file | ≤ 28 MiB (today 22.7) | Plan |

## 2 · What gets loaded, and when

```
 first paint ───────────────────────────────────────────────────► on demand
 core.glb (≤ 3 MB)         hero.glb (streamed)       parts/…                        private/…
 rig + LOD2 body           LOD0/LOD1 geometry        teeth-tongue.glb  nails.glb    anatomy.glb
 morphs (sparse)           morphs for LOD0/1         hair-guides.bin   garments/*.glb   (only after the adult gate)
 eyes, brows, cards        full texture tiles        underlay/*.glb
 half-size tiles
```

- `humanoid-v3-core.glb` loads first and is enough to show a correct, small figure on any device (the "lite" role today).
- `humanoid-v3-hero.glb` follows after first paint on devices whose tier allows it; the viewer cross-fades when it is ready.
- Parts load when their feature is used (open mouth → teeth and tongue; Clothing tab → one garment; Anatomy tab → underlay).
- **The adult-gated anatomy is a separate file that is not requested at all** until the eligibility check passes
  (`anatomyEligibility`), which also keeps it out of any cache for users who never enable it.
- `manifest.json` lists each file, its sha256, size, licence entry and the tiers it applies to; the app verifies it.
- The registry follows the pattern of the existing opt-in `VITE_HUMANOID_V2_*` variables: `VITE_HUMANOID_V3_*`, or
  `modelVersion: 'v3'` in a profile, with the legacy file as the fallback. Nothing changes for users until v3 exists.

## 3 · The GLB v3 contract

### Nodes and meshes

| Name | Content | Notes |
| --- | --- | --- |
| `Armature` | The 79-joint skeleton ([03](03-anatomy-spec.md)) | Rest pose A-pose; units metres; Y up; +Z forward |
| `GrowthTrackBody` | Skin from head to feet | One mesh, one material `Skin`, per-vertex tile and region ids |
| `GrowthTrackEyes`, `GrowthTrackCornea`, `GrowthTrackTearline` | Eyeballs, cornea shells, wet-line strip | v2 contract names |
| `GrowthTrackTeeth`, `GrowthTrackGums`, `GrowthTrackTongue` | Mouth interior | Loaded as a part |
| `GrowthTrackScalp` | The hair-root surface | Strand growth mask; v2 contract name |
| `GrowthTrackHair`, `GrowthTrackEyebrows`, `GrowthTrackEyelashes` | Cards for the LOW tier | Strands are generated at runtime |
| `GrowthTrackNails` | Twenty nails | NAILS atlas |
| `GrowthTrackPrivateAnatomy` | Adult-gated, in its own file | `extras.sensitive: true`, unchanged policy |

### Vertex attributes on the body mesh

`POSITION`, `NORMAL`, `TANGENT`, `TEXCOORD_0` (tile UVs), `JOINTS_0`, `WEIGHTS_0` (4 influences), and three custom attributes
(glTF requires the underscore prefix): **`_TILE`** (uint8, which skin tile), **`_REGION`** (uint8, one of the 19 skin regions
in `skin-layers.mjs`, driving the region table and wardrobe coverage) and **`_MICROSCALE`** (float, tiles of the micro texture
per UV unit, so the micro tile is 2 cm everywhere regardless of UV stretching).

### Morph targets

Names are stable identifiers. The 58 existing proportion morphs keep their names (so every saved profile and the
`metricsToBlendshapes.js` mapping still work); the 52 face shapes use the ARKit names. Targets are stored as **sparse
accessors** (most move a few hundred vertices) and compressed with meshopt.

### `extras.growthtrack` (on the body mesh)

```json
{
  "contract": "3.0",
  "rig": { "version": 3, "restPose": "A", "units": "m" },
  "tiles": { "HEAD": 4096, "BODY": 4096, "HANDS": 2048, "FEET": 2048, "NAILS": 2048, "MICRO": 512 },
  "regions": ["face", "ears", "lips", "neck", "chest", "back", "abdomen", "shoulder", "upperArm", "inner_arm", "forearm",
              "hand_dorsal", "palm", "glutes", "thigh", "knee", "shin", "foot_dorsal", "sole"],
  "morphRegions": { "waist_narrow": ["Spine", "Spine1", "Hips"], "jawOpen": ["Head", "Jaw"], "torso_length": "global" },
  "jointOffsets": { "waist_narrow": { "Spine1": [0, 0.004, 0] } },
  "bodyBase": "male",
  "privacy": { "cover": "separate-file" }
}
```

`morphRegions` is the declared region of influence of every morph (or `"global"` for the few that are broad by design);
`jointOffsets` moves joints with the shape so a rotated limb pivots in the right place at every body size. The conformance
check ([§5](#5--proving-it-the-conformance-scorecard)) fails an asset that omits either.

### Textures

One image set per tile. Maps use the existing tile names plus these roles:

| Map | Contents | Colour space | KTX2 mode |
| --- | --- | --- | --- |
| `albedoDetail` | High-pass detail, mean 1.0 per region (never a skin tone; see [04](04-skin-hair-eyes.md)) | sRGB | ETC1S |
| `normal` | Tangent-space geometry normal | Linear | UASTC |
| `orm` | R ambient occlusion, G roughness, B metallic (zero for skin) | Linear | ETC1S |
| `maskA` | R regional haemoglobin, G regional melanin multiplier, B sun exposure, A freckle/mole density | Linear | ETC1S |
| `maskB` | R veins, G scars/stretch marks, B oil/sheen, A thickness | Linear | ETC1S |

The MICRO tile has `normal`, `rough` and `height-detail` maps and tiles seamlessly. Mask maps are produced from the `REGIONS`
table in `skin-layers.mjs` by a build script, with hand-painted overrides.

The ORM contract follows [Khronos export documentation](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst). Optional cavity detail needs a separately declared role, not a replacement for metallic. Texture formats, compression settings and UV seam margins must pass a real Blender/glTF/runtime round trip. The statements above describe the proposed asset, not a completed set of production maps.

### Extensions

`KHR_texture_basisu` (KTX2), `EXT_meshopt_compression` and `KHR_mesh_quantization` for geometry, `KHR_materials_clearcoat`
(already used) for nails and wet surfaces. **Draco is not used**: it does not
compress morph targets.

## 4 · The build, stage by stage

| # | Stage | Tool | Input → output | Exists? |
| --- | --- | --- | --- | --- |
| 1 | Base and targets | MakeHuman CC0 sources | `npm run humanoid:fetch` → compiled targets | Yes |
| 2 | Sculpt the high-detail regions | Blender (+ MPFB2 for the MakeHuman targets) | Base mesh → head (2.5 to 3 mm), hands (1.5 mm), feet; true ears, nostrils, lid loops, finger pads | **New (authoring)** |
| 3 | Add rig parts | Blender | Fingers, toes, jaw, eyes, tongue, twist joints with weights | **New**; spike S1 evaluates Anny's weights first |
| 4 | Face shapes | Blender shape keys | 52 ARKit shapes on the head only | **New** |
| 5 | Re-target the 58 body morphs | `build-makehuman-glb.py` + `scripts/` | Existing morphs on the new topology, with `morphRegions` and `jointOffsets` | Extend |
| 6 | Parts | Blender | Teeth, gums, tongue, cornea, tearline, nails, scalp, garments (own meshes) | **New** |
| 7 | UV tiles and bake | `bake-geometry-surface.mjs` (extended) | Tile layout, `normal` and `orm` bake, `_TILE`/`_REGION`/`_MICROSCALE` attributes | Extend |
| 8 | Masks | **`scripts/build-skin-masks.mjs`** | `REGIONS` table + paint overrides → `maskA`, `maskB` | **New** |
| 9 | Micro tile | **`scripts/generate-micro-tile.mjs`** | Seeded procedural pores, creases, skin lines → seamless tile | **New** |
| 10 | LODs | meshoptimizer simplify + **`scripts/bake-lod-morphs.mjs`** | LOD0 → LOD1, LOD2; morph targets re-projected by barycentric closest point | **New** |
| 11 | Compress | glTF-Transform (`dedup`, `prune`, `quantize`, `meshopt`, `etc1s`/`uastc`) | GLB → core/hero GLBs | **New** (flags checked against the installed version in S2) |
| 12 | Validate | `scripts/validate-glb.js`, `glb-health.js`, **`analyze-human-model.mjs`** + **`code/v3-conformance.mjs`** | GLB → pass/fail scorecard | Exists / **new** |
| 13 | Pose-stability test | three.js headless | Extremes of each morph × ±30° of each limb joint; silhouette volume change under 3% | **New** |
| 14 | Provenance | `ASSET-PROVENANCE.json`, `npm run check:assets -- --release` | Every file hashed with licence and status | Yes |

### Rules for the authored parts

- **Head topology:** concentric edge loops around the eyes and mouth, a loop following the nasolabial fold, an ear with real
  helix and concha, nostril openings with an interior cap, a lid with thickness and a lash-line loop. Quads, with poles away
  from deforming regions.
- **Hands:** four loops per finger segment, flat on the palm side with crease loops at each joint, fingertip pads, a nail bed
  surface that the nail mesh sits on without z-fighting (0.1 mm offset along the normal).
- **Twist weights:** each limb segment's twist joint takes a smooth 0 to 1 gradient from the proximal to the distal end, so the
  skin twists instead of collapsing (the audit found no twist joints; wrist rotation collapses the forearm).
- **Garments:** weights transferred from the body by closest point, then hand-cleaned at seams; thickness and hem modelled; one
  GLB per garment.

## 5 · Proving it: the conformance scorecard

The audit that exposed the gaps is also the acceptance gate for their replacement. `scripts/analyze-human-model.mjs` measures
a GLB; [`code/v3-conformance.mjs`](code/v3-conformance.mjs) turns the measurements into 23 required and 5 recommended checks
(skeleton, face shapes and their scope, morph regions and joint offsets, vertex attributes, triangle and file budgets, mesh edge
length, texture density against the tile minimums, micro tile, KTX2, meshopt, and every required part). It is tested against an
imaginary asset built from the spec (passes everything), against the shipped audit (fails where the audit said), and from the
command line (non-zero exit on any failed required check).

**Baseline today** (`humanoid-base.glb`, profile `full`): **9 of 23 required checks pass, 0 of 5 recommended**
([`data/v3-conformance.humanoid-base.md`](data/v3-conformance.humanoid-base.md)). The failures are exactly the work list:

| Failed check | Needs |
| --- | --- |
| Every v3 joint exists | 59 new joints: fingers 30, toes 12 plus 2 `ToeBase`, twist 8, face 6 (jaw, eyes, tongue), `Neck1` |
| 52 ARKit face shapes exist | New face shape set |
| Morph regions and joint offsets declared | Authoring metadata for the 58 morphs |
| Body attributes (`TANGENT`, `_TILE`, `_REGION`, `_MICROSCALE`) | Bake step |
| Texture density (head 23 < 90, hand 10.3 < 45, foot 9.5 < 35, body 7.9 < 30) | New tiles |
| Micro tile | Generator script |
| Parts: cornea, tearline, teeth, gums, tongue, scalp, nails | New meshes |
| Head and hand edge length (6.0 and 6.6 mm vs 3.5 and 2.0) | Re-sculpt |
| KTX2 and meshopt (recommended) | Compression stage |
| No empty morphs (recommended) | Remove `d_length`, `d_girth` or give them targets |

The `lite` file, as the `core` profile, passes 4 of 10 required checks
([`data/v3-conformance.humanoid-base-lite.md`](data/v3-conformance.humanoid-base-lite.md)).

## 6 · Loader and runtime changes

| Change | File | Notes |
| --- | --- | --- |
| Add KTX2 and meshopt support | `useModelLoader.js` | `useGLTF(url, true, true, loader => loader.setKTX2Loader(ktx2))`; host the Basis transcoder files under `/basis/` and call `ktx2.detectSupport(gl)` |
| Resolve v3 | `modelAssetRegistry.js` | `VITE_HUMANOID_V3_*`, `modelVersion: 'v3'`; fall back to v2 then legacy |
| Core then hero | `useModelLoader.js`, `HumanoidClone.jsx` | Show core, then swap to hero on a cross-fade when decoded |
| Parts on demand | New `usePartLoader.js` | Teeth, nails, garments, underlay |
| Tier-aware textures | `ChamberCanvas.jsx` + loader | Half-size tile files per `TIER_TILE_LEVELS` |
| v3 readiness | `digitalHumanV2.js` | Extend `inspectDigitalHumanV2` with the v3 parts and `extras.growthtrack` presence |
| Private anatomy | `useAnatomyEligibility.js` | Request `private/anatomy.glb` only when eligible |

## 7 · Provenance and contracts

- Every authored file gets an `ASSET-PROVENANCE.json` entry with status `project` (authored by this project or a contractor
  under copyright assignment), the build command, and the sha256; `check:assets --release` fails on any `unresolved` entry.
- The artist contract states: copyright assignment or an exclusive perpetual worldwide licence that covers modification and
  real-time web, desktop and mobile distribution; no third-party content; no AI-generated geometry without disclosure
  (as `16-private-anatomy.md` already requires).
- Sources taken under [02](02-open-source-landscape.md) (MakeHuman CC0, anything from the Anny spike) are recorded with licence
  evidence and retrieval date, as the existing components are.
- The adult-gated asset keeps its existing marks (`sensitive`, declared `anatomySex`, cover policy).
