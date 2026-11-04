# Forensic audit of the 3D human model system

> Evidence availability: linked local artifacts are not included in this checkout. This historical record does not establish current rendered coverage. Use the [maintained architecture](../../docs/ARCHITECTURE.md) and fresh scoped tests when assessing the current implementation.

Audit date: **26 October 2026**.

**Strategy follow-up:** [Parametric assets, realism and identity-capture review](3D_HUMAN_STRATEGY_REVIEW_2026-10-26.md) evaluates the subsequently proposed `three.ws`, Avatar SDK/MetaPerson and MetaHuman export paths. It revises the continuity-first recommendation; the inventory and measured findings below remain the dated audit baseline.

**Verdict:** the application has a substantial avatar editor, but it does **not** currently deliver a lifelike, fully customizable human. The main limitations are the human assets, skin response, facial system, hair, deformation, and compatibility between asset versions. Replacing React or Three.js would not address most of those limitations.

This audit covers the working tree in `D:\Projects\Tracker\growthtrack-ultimate`, including its uncommitted changes. The last repository commit inspected was `8ed1a62eb1572634fd1b752f9f91a8386ad2dea4`, dated **22 October 2026**. Several newer assets and implementation files were uncommitted.

**Evidence labels:** “Verified” means inspected in source, measured from asset binaries, or checked during the audit. Visual conclusions are identified as assessments. Unestablished facts are marked **UNKNOWN — needs verification.**

No application code or assets were changed. This document records the audit delivered in the conversation; saving it does not represent a second execution of the checks.

## A. WHAT EXISTS TODAY — INVENTORY

### 1. Relevant repository structure

Paths below are relative to `growthtrack-ultimate/`.

| Path | Responsibility |
|---|---|
| `src/components/HumanoidViewer.tsx` | Main avatar workspace, editing, comparison, persistence |
| `src/components/ChamberCanvas.jsx` | Active WebGL canvas, quality tiers, renderer lifecycle |
| `src/components/morphEngine/` | Loading, morphs, rigging, eyes, mouth, hair, garments, camera, lighting, export |
| `src/components/body3d/physicalSkinMaterial.js` | Active physical skin material |
| `src/components/body3d/skinAppearance.js` | Skin colour and regional appearance calculations |
| `src/components/physique/` | Measurement, face, hair, skin, clothing, anatomy and view controls |
| `src/store/use3DStore.js` | Renderer and customization state |
| `src/lib/physiqueProfile.js` | Measurement and appearance persistence mappings |
| `src/config/humanSurface.json` | Default asset selection and surface settings |
| `src/config/humanAssetFamily.json` | R2 candidate family configuration |
| `src/config/humanAssetManifest.json` | R2 filenames, sizes and hashes |
| `public/assets/models/` | Ten human GLBs and micro-detail textures |
| `public/assets/wardrobe/` | Four garment GLBs, textures and manifest |
| `scripts/makehuman/`, `scripts/build-makehuman-glb.py` | MakeHuman source acquisition and conversion |
| `scripts/human75/` | Articulated preview asset construction |
| `scripts/human-realism/` | R2 geometry, materials, packaging and Blender handoff |
| `artifacts/human-r2/` | Generated Blender scenes, standalone GLBs, renders and offline viewer |
| `docs/real-human-3d/` | Plans, historical audits, implementation records and evidence |
| `prisma/schema.prisma`, `server.js` | Profile persistence and API |

There are older components with overlapping names. `Body3D.jsx` is now a compatibility wrapper around `ChamberCanvas`. The active canvas imports lighting and post-processing from **`morphEngine/`**. Reading only the older top-level components would produce an inaccurate audit.

### 2. Full stack

Verified installed versions match the lockfile for the following principal packages:

| Layer | Implementation |
|---|---|
| Frontend | React **19.2.4**, React DOM **19.2.4** |
| Renderer | Three.js **0.184.0**, WebGL renderer |
| React integration | `@react-three/fiber` **9.6.1** |
| Scene utilities | `@react-three/drei` **10.7.7** |
| Loader utilities | `three-stdlib` **2.36.1**; Three.js addon loaders |
| Human loading | Drei `useGLTF`; independently cloned scenes |
| Garment loading | Three.js `GLTFLoader` |
| R2 private-package loading | `GLTFLoader` with a bundled Meshopt decoder |
| Post-processing | `postprocessing` **6.39.1**, used directly |
| Additional installed wrapper | `@react-three/postprocessing` **3.0.4**, used by the older component |
| State | Zustand **5.0.3** |
| Animation | Custom frame-driven morph, pose, idle, gaze and speech code; GSAP **3.15.0** primarily for interface motion |
| GPU detection | `detect-gpu` **5.0.70** |
| Geometry acceleration | `three-mesh-bvh` **0.8.3** |
| Geometry compression | `meshoptimizer` **1.1.1** |
| Backend | Express **5.2.1** |
| Persistence | SQLite schema; Prisma client **7.9.1**, Prisma CLI **7.10.0**, libSQL adapter **7.9.1** |
| Build | Vite **8.3.0**, React plugin **6.0.1**, TypeScript **6.0.3** |
| Desktop packaging | Electron **44.3.0**, electron-builder **26.15.3** |
| Tests | Vitest **5.0.1**, Playwright **1.59.1** |
| Local JavaScript environment | Node **24.12.0**, npm **11.6.2** |

The backend stores customization data. No production backend that reconstructs a human from photographs or generates a personalized human mesh was established.

Sources: [package.json](../package.json), [package-lock.json](../package-lock.json), [useModelLoader.js](../src/components/morphEngine/useModelLoader.js).

### 3. Asset origins and pipeline

Verified:

- The underlying human foundation comes from **MakeHuman 1.3.0** source data, pinned to commit `1f508f6083b2f823dab15de924b3bde72e08d77c`.
- The pipeline uses the base mesh and **73 source target files**.
- Skin, eyes, original short hair, eyebrows, eyelashes and garments come from the MakeHuman **CC0 system-assets pack**.
- The recorded archive is **280,737,770 bytes**, SHA-256 `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107`.
- Custom Python and Node scripts build and modify the GLBs. These are generated derivatives of a parametric foundation.
- R2 adds scripted surface shaping, subdivision/refinement, a ribbon groom and separate anatomy packages. **It is not a scanned human.**
- Blender **5.1.1** is recorded in the actual R2 source-export report.
- The cached Python environment reports Python **3.13.9**, NumPy **2.3.4**. It also emits a `sitecustomize` error about a missing `blender.shared` file. Bare `python` is unavailable on PATH in the inspected shell. Reproduction therefore has an environment dependency beyond the npm scripts.

The Blender handoff exports GLB with selection filtering, extras and morphs enabled. Its round-trip GLB is an export probe, **not the shipping binary**. The `.blend` files demonstrate editable generated scenes; they do not establish that a character artist finished the anatomy.

Compression differs by family:

- Base, adult-v2 and preview-75: **no geometry compression extension**.
- R2: **`EXT_meshopt_compression`**.
- No inspected human GLB uses Draco or KTX2/Basis textures.
- R2 public albedo is JPEG, exported at quality **90**; normal/packed maps remain PNG.

Sources: [asset provenance](../public/assets/models/ASSET-PROVENANCE.json), [Blender export record](../../docs/evidence/ARTIFACTS.md#artifact-009), [R2 build script](../scripts/build-human-realism.mjs).

### 4. Actual model numbers

These numbers were read from the GLB binaries in the audited working tree. Vertex counts are exported attribute counts, including UV-seam duplication. Triangle totals include every mesh in each file, including hidden scaffold geometry where present.

| GLB | Bytes | Vertices | Triangles | Joints |
|---|---:|---:|---:|---:|
| `humanoid-base.glb` | 24,345,560 | 24,317 | 45,162 | 20 |
| `humanoid-base-lite.glb` | 7,431,040 | 24,317 | 45,162 | 20 |
| `humanoid-adult-v2.glb` | 24,376,652 | 24,317 | 45,162 | 20 |
| `humanoid-adult-v2-lite.glb` | 7,462,132 | 24,317 | 45,162 | 20 |
| `humanoid-preview-75.glb` | 25,047,568 | 26,273 | 47,818 | 79 |
| `humanoid-preview-75-lite.glb` | 8,133,056 | 26,273 | 47,818 | 79 |
| `humanoid-human-r2-core.glb` | 1,946,332 | 22,185 | 37,610 | 79 |
| `humanoid-human-r2-hero.glb` | 4,318,948 | 58,367 | 100,778 | 79 |
| `humanoid-human-r2-private-core.glb` | 1,180,304 | 9,284 | 17,380 | 79 |
| `humanoid-human-r2-private-hero.glb` | 2,073,924 | 12,840 | 24,488 | 79 |

The **body mesh alone** is:

| Family | Body vertices | Body triangles |
|---|---:|---:|
| Base/adult-v2/preview-75 | 16,001 | 29,682 |
| R2 core | 16,377 | 30,434 |
| R2 hero | 45,999 | 87,842 |

Important distinctions:

- Full/lite preview files have **identical geometry**. Lite reduces textures.
- R2 has genuinely different core/hero geometry.
- Increasing R2 body triangles from 30,434 to 87,842 does not itself add measured facial anatomy, realistic skin reflectance or expression quality.
- Some documentation contains earlier counts. For example, the R2 implementation record lists 29,682 core body triangles; the audited binary contains **30,434**.

**Default selection:** male profiles normally resolve to preview-75; female/neutral profiles retain base-family fallbacks. R2 requires an explicit `human-r2` preference or matching asset selection. HIGH selects hero; other tiers select core.

**UNKNOWN — needs verification:** the exact asset selected in the deployed build and saved profile, including environment overrides.

Sources: [default surface configuration](../src/config/humanSurface.json), [asset registry](../src/components/morphEngine/modelAssetRegistry.js), [R2 manifest](../src/config/humanAssetManifest.json).

#### Topology and UVs

Verified:

- The pinned source `base.obj` contains **18,486 quad faces**, including source/helper geometry.
- Shipping GLBs use triangles; no quad/ngon topology survives as such.
- The body has **one UV set**, `TEXCOORD_0`.
- Inspected body UV coordinates lie approximately within **U 0.0092–0.9935, V 0.0261–0.9904**.
- There is no demonstrated multi-tile UDIM texture system.
- Preview/R2 bodies have **zero zero-length normals** and **zero degenerate triangles** under the numerical thresholds checked.

**UNKNOWN — needs verification:** atlas overlap, regional texel density, distortion, seam visibility across every morph, and topology suitability for all intended facial expressions.

#### Texture inventory

| Map/part | Preview full | Preview lite | R2 hero | R2 core |
|---|---|---|---|---|
| Body colour | Three 2048² PNG variants | Three 512² PNG variants | One 1024² JPEG | One 512² JPEG |
| Body normal | 1024² | 512² | 1024² | 512² |
| AO/roughness/metallic packed map | 1024² | 512² | 1024² | 512² |
| Eye colour atlas | 1024² | 512² | Vertex pigmentation/procedural live iris | Same |
| Original hair colour + normal | Two 2048² maps | Two 512² maps | Replaced by ribbon geometry/material | Same |
| Eyebrows | 512² | 512² | 512² | 512² |
| Eyelashes | 512² | 512² | 512² | 512² |
| Micro height + normal tiles | Two 256² images | Same | Runtime shared detail | Runtime shared detail |
| Skin thickness/SSS map | Absent | Absent | Absent | Absent |
| Authored wrinkle/displacement set | Absent | Absent | Absent | Absent |

The body normal map is baked from the mesh’s face/vertex normals. The bake explicitly records **`sculptDetail: false`**. It cannot supply anatomical detail that was never present in the source geometry.

Micro detail is primarily a shading perturbation. Configuration specifies a **20 mm tile** and **0.035 mm relief scale**. This is not a measured pore scan or a displacement-based anatomical surface.

#### Material setup

The live body uses `MeshPhysicalMaterial` with metallic/roughness PBR:

- Metalness **0**.
- Specular intensity **0.38**.
- IOR **1.42**.
- Clearcoat **0.03 × appearance strength**.
- Sheen **0.06 × appearance strength**.
- Transmission **0**.
- Regional roughness is bounded to approximately **0.32–0.85**.

**No implemented subsurface diffusion was found in the active skin path.** Variables called `sss`, `uSSSColor`, or tier labels such as `sss-profile` do not establish scattering.

`UberShader.js` contains an older scattering shader, but its exported `createSkinMaterial()` delegates to the physical-material factory.

The live factory also **does not copy the asset AO map**. AO has instead been baked into colour. Its explanation that current Three.js requires UV2 is stale: installed Three.js supports a texture’s selected UV channel, including channel 0.

Sources: [physical skin material](../src/components/body3d/physicalSkinMaterial.js), [surface baker](../scripts/bake-geometry-surface.mjs), [Three.js UV-channel selection](../node_modules/three/src/renderers/webgl/WebGLPrograms.js).

### 5. Rig, face and attachments

Verified:

- Retained base/adult assets have **20 joints**.
- Preview-75/R2 have **79 named joints**.
- The hierarchy includes hips, spine chain, clavicles/arms, legs, an additional neck joint, jaw, eyes, three tongue joints, finger chains, toes and eight twist bones.
- Fingers have **three joints per digit**.
- Body skinning uses up to **four influences per vertex**.

Hierarchy outline:

```text
Hips
├─ Spine → Spine1 → Spine2
│  ├─ Neck → Neck1 → Head
│  │  ├─ Jaw → Tongue0 → Tongue1 → Tongue2
│  │  └─ LeftEye / RightEye
│  └─ Left/Right Shoulder → UpperArm → ForeArm → Hand → fingers
└─ Left/Right UpLeg → Leg → Foot → ToeBase → toes
```

Numerical skin checks on preview/R2 bodies:

- Weight sums approximately **0.99999995–1.00000005**.
- **Zero** vertices outside a `1e-4` normalization tolerance.
- **62 of 79 joints** have nonzero body skin influence.
- All **eight twist bones have zero body skin weight** in the inspected exports.

Some remaining unused joints belong to eyes/oral parts, which can reasonably be controlled separately. However, the twist-bone finding means the 79-joint count overstates the number of bones actually deforming the body.

Weight construction and repairs are procedural. The source explicitly describes them as preview repairs rather than artist-authored anatomical skinning.

#### Morphs and facial rig

- **58 named body morph channels**.
- Two body channels, `d_length` and `d_girth`, are zero on the body and serve separate anatomy handling.
- **13 exposed artistic head-shape controls**.
- Only **three facial expression channels:** `blink`, `smile`, `jaw_open`.
- No complete **52-channel ARKit** set.
- No independent left/right expression set.
- No phoneme/viseme shape set.
- Speech uses text timing and a jaw-opening heuristic, including an approximate **12 characters/second** progression.

There is blink, breathing and gaze motion. A statement that the avatar has “no animation” would be incorrect. It has a small procedural performance system, not a production facial-performance rig.

#### Normals during customization

Preview/R2 body morphs contain **position deltas but no normal deltas**. The loader calls `computeMorphNormals?.()`, but that function is **undefined on the installed Three.js BufferGeometry**. The explicit runtime normal updater is attached to the private anatomy mesh.

Consequently, body shape changes do not have a demonstrated corresponding body-normal update path. This is a concrete deformation-shading issue requiring stress testing.

#### Eyes, mouth, hair and clothing

- Eyes have a combined eye mesh plus separate cornea and tearline geometry.
- Iris, pupil, limbal ring and gaze are shader-driven.
- These are approximations; calibrated corneal refraction and iris depth are not established.
- The current dental fallback generates **28 differentiated procedural crowns**, gums, tongue and cavity geometry. It is more developed than older documentation describing repeated ellipsoids, but remains a procedural fallback.
- Original short hair is textured card geometry.
- R2 replaces scalp hair with swept ribbons: **240 roots in core, 640 in hero**.
- The active scalp-hair material uses general physical-material shading. A physically calibrated fibre-scattering model is absent.
- Brows and lashes use separate textured geometry.
- Nails exist as separate geometry in preview/R2.
- No general accessories catalogue was established.

Clothing assets:

| Asset | Vertices | Triangles | GLB bytes |
|---|---:|---:|---:|
| Tee | 7,042 | 12,960 | 904,380 |
| Sweatshirt | 8,846 | 16,480 | 1,137,860 |
| Shirt | 10,403 | 19,200 | 1,335,548 |
| Suit | 32,199 | 59,824 | 4,133,404 |

Their external colour/normal maps are **1024²**; the suit has no separate normal map.

Garments use body-surface bindings, shared skinning and fitting logic. They do not have a demonstrated cloth-physics system.

**Critical compatibility defect:** all four garments declare **16,001 body vertices**. The garment constructor rejects a different body count. R2 core has **16,377**, and hero has **45,999**, so R2 falls back to clothing constructed from an expanded body copy.

Sources: [body binding](../src/components/morphEngine/bodyPoseBinding.js), [head registry](../src/lib/headFeatureRegistry.js), [dental fallback](../src/components/morphEngine/dentalGeometry.js), [garment compatibility check](../src/components/morphEngine/authoredGarments.js), [fallback selection](../src/components/morphEngine/HumanoidClone.jsx).

### 6. Rendering setup

Verified active settings:

| Setting | LOW | MED/Balanced | HIGH |
|---|---:|---:|---:|
| DPR cap | 1 | 1.5 | 2 |
| Shadow map | Disabled | 1024² | 2048² |
| Composer MSAA request | 0 | 4 | 8 |
| Environment capture resolution | 64 | 96 | 256 |
| Nominal frame target | 30 FPS | 60 FPS | 60 FPS |

MSAA is capped by device capability; SMAA is used when sample count is zero.

Other verified settings:

- Camera FOV **30°**, near **0.01**, far **100**.
- Output colour space **sRGB**.
- Initialization sets ACES, but the active compositor switches the renderer to no tone mapping and applies **PBR Neutral** tone mapping.
- Default cinematic state is **ANALYTIC**, exposure **1.0**.
- Default lighting mode is **neutral**.
- Neutral rig: **three directional lights, one ambient and one hemisphere light**.
- Cinematic HIGH/MED rig: **11 light objects**; LOW uses **6**.
- Environment lighting is generated locally using **six Lightformers**. It is not a photographed HDRI.
- Shadows use **PCFShadowMap**.
- Bloom, vignette, DOF, grain, chromatic aberration and SSAO code exist, with tier/setting gates.
- There is **no TAA implementation** in this path.
- SSAO is disabled by default. Its constructor receives an empty `THREE.Texture`; no populated normal pass is wired there. **UNKNOWN — needs verification:** whether explicitly enabling this effect produces correct AO.
- LOW still constructs a compositor containing antialiasing/tone mapping despite its `postFx: "NONE"` label.
- `preserveDrawingBuffer: true` remains enabled.
- Rendering pauses when hidden/offscreen, but visible scenes use an `always` frame loop.
- The governor uses a **120-frame window**, p95 thresholds and hysteresis.

There is no demonstrated progressive “load core, then seamlessly upgrade” path for default preview assets. Tier selection chooses between files; R2 supplies real core/hero alternatives.

Sources: [ChamberCanvas](../src/components/ChamberCanvas.jsx), [active post-processing](../src/components/morphEngine/PostProcessingStack.jsx), [quality governor](../src/components/morphEngine/qualityGovernor.js).

### 7. Customization as built

Verified:

- **77 measurement/shape/posture fields** are defined.
- Those are not 77 independently calibrated geometric controls.
- Thirteen head controls use unitless **0–1** shape strengths.
- Available scalp styles are **bald and short**. Buzz, medium and long are marked unavailable.
- Seven eye-colour presets plus a colour picker.
- Pupil diameter **2–7 mm**, iris detail, limbal ring and seed.
- Hair colour, density, grey proportion and seed.
- Skin colour, appearance presets, undertone, tan, flush, tan patterns, freckles and micro detail.
- Three artistic starting faces: **neutral, broad, soft**.
- Five wardrobe presets: gym, casual, underwear, formal, swimwear.
- Current/Goal, comparison and timeline workflows.
- Multiple saved people; code permits **30 additional person records**.

The six-step setup wizard is:

1. Scale.
2. Measurements.
3. Face.
4. Hair and skin.
5. Proportions.
6. Clothing.

A photograph can be displayed as a **temporary manual reference**. It does not reconstruct a face.

Sources: [wizard](../src/components/AvatarCreationWizard.jsx), [appearance configuration](../src/config/appearanceDetail.json), [measurement support declarations](../src/lib/avatarMetricSupport.js).

## B. WHAT WAS INTENDED

The documented product started as a **fitness/body-progress digital twin**: enter measurements, inspect a body, compare Current and Goal, and review history. Later plans expanded the target to a realistic, calibrated, customizable digital human. The R2 record describes a **lifelike generic adult human**.

Those are related but different products. A plausible generic person, a recognizable personal likeness, and a measurement-calibrated body require different evidence.

The documented intentions include:

- Credible face, shoulders, hands, feet, pelvis and joints.
- Male, female and neutral base shapes.
- Separate eye, cornea, tearline, teeth, gums, tongue, scalp, lashes, nails and garment assets.
- Independent measured, estimated and stylistic values.
- Corrective deformation and a calibrated measurement-to-shape solver.
- Mobile and desktop LODs.
- An authored facial system, with the later plan targeting **52 face channels** in addition to proportion channels.

Documented performance targets include:

| Target | Stated budget |
|---|---:|
| Initial 3D payload | ≤5 MB |
| Mobile model | ≤3 MB |
| Optional hero upgrade | ≤8 MB additional |
| Desktop p95 frame time | ≤16.7 ms |
| Mid-range phone p95 frame time | ≤33 ms |
| Visible slider response | ≤100 ms |
| Planned texture-memory tiers | 40 / 100 / 150 MiB |

Measurement targets include **≤1 cm height error**, and circumference errors of **≤2 cm or 3%, whichever is larger**.

These are acceptance targets, not verified achievements. Documents also contain conflicting generations of budgets, including a later **28 MiB hero-file allowance**.

Explicit limits include no clinical-accuracy claim and no assumption that a saved value is a measured geometric result.

**UNKNOWN — needs verification:**

- Approved visual reference defining “lifelike.”
- Required personal-likeness accuracy.
- Minimum supported phones, GPUs and browsers.
- Required viewing distance and face close-up resolution.
- Required age, body-type and appearance coverage.
- Whether VR is a real requirement.
- The intended downstream meaning of “uses it”: visualization, exercise animation, conversation, clothing simulation or export.
- A single authoritative release contract reconciling the successive plans.

Sources: [Digital Human v2 plan](DIGITAL_HUMAN_V2_PLAN.md), [asset pipeline specification](real-human-3d/07-asset-pipeline-and-glb-spec.md), [master product specification](MASTER_PRODUCT_SPEC.md).

## C. WHAT IS ACTUALLY ACHIEVED

**Verified achievement:** a measurement-reactive, editable generic human preview with persistence, comparison, pose controls, basic facial motion, appearance controls and several asset families.

**Not established:** photoreal appearance, personal likeness, comprehensive head-to-toe variation, production deformation quality or physical-device performance acceptance.

Fresh checks during the audit:

- **10 human GLBs:** zero validator errors and zero warnings, including validation after decoding R2 Meshopt data.
- **Four garment GLBs:** each has **2 errors and 1 warning**, totalling **8 errors and 4 warnings**.
- Asset provenance release check: **passed**.
- The inspected body weight sums and rest-pose geometry pass the numerical checks described above.

The garment errors are specific:

- `_BODY_INDICES`: vertex attribute alignment violates the four-byte requirement.
- `_GARMENT_WELD`: uses an unsigned-integer component type forbidden for mesh attributes.
- Skin attributes exist without a skin attached to the exported node.

The application may tolerate these because it binds garments at runtime. They remain invalid portable GLBs.

### Ranked visual assessment

1. **The head and body lack sufficient authored anatomical specificity.** The system largely reshapes one generic male foundation. R2 refinement increases density but retains the existing facial assembly. Stock morphology plus local procedural corrections produces a generic mannequin appearance.
2. **Skin lacks tissue scattering and a convincing regional reflectance system.** The active material has no subsurface diffusion. The main normal map reproduces existing mesh shading, while procedural micro detail supplies generic grain. A “human realism 100” setting is an effect-strength value, not a quality measurement.
3. **Hair exposes its construction.** The inspected face render shows broad ribbon-like clumps, conspicuous hairline/ear-region strands and sparse silhouette detail. General physical-material shading does not reproduce hair-fibre scattering.
4. **Eyes, eyelids and mouth remain visibly approximate.** The inspected face has bright, hard-edged sclera/iris presentation. The mouth uses procedural dentition and limited expression deformation. Cornea and tearline geometry exist, but their presence does not establish convincing optics or tissue contact.
5. **Shape changes are insufficiently supported by deformation and shading.** Eight twist bones have no body influence, only three combination correctives are named, and body morph normals are absent. The generic jaw/smile/blink system cannot supply nuanced expression.
6. **Clothing quality regresses on R2.** The new body topology fails the existing garment binding check and activates the body-copy fallback.
7. **Detail allocation is poorly matched to close-up use.** R2 hero has 100,778 total triangles but only a 1024² whole-body colour map. More geometry cannot compensate for missing facial texture detail.
8. **Presentation can obscure the underlying quality.** Cinematic lights, glow, grain and lens effects do not establish realism. The neutral inspection mode is useful, but still needs a reference-based review.

The evidence does **not** support a diagnosis of universally broken normals, missing UVs, missing normal maps or completely absent animation.

### Images and current-state inspection

- [R2 face, neutral](../../docs/evidence/ARTIFACTS.md#artifact-006).
- [R2 face, mouth open](../../docs/evidence/ARTIFACTS.md#artifact-007).
- [R2 Blender full-body render](../../docs/evidence/ARTIFACTS.md#artifact-010).
- [Earlier browser full-body render](real-human-3d/evidence/milestone-03-human-full-body.png).
- [Offline interactive R2 viewer](../../docs/evidence/ARTIFACTS.md#artifact-011).

The face images are dated **24 October**; the earlier browser body image is dated **21 October**. These are saved evidence, not screenshots captured from a fresh authenticated session during this audit.

**UNKNOWN — needs verification:** exact current browser appearance, all extreme morph combinations, animation contact and production-device frame times.

## D. GAP ANALYSIS

| Requirement | Current state | Gap severity | What it would take to close it |
|---|---|---|---|
| Defined lifelike acceptance target | No established signed visual benchmark | Blocker | Approve reference people, lighting, camera distances and acceptance views |
| Credible human anatomy | Generic foundation with scripted refinement | High | Character-artist sculpt and topology review; reference-based corrections |
| Personal likeness | Manual reference plus 13 artistic face controls | Blocker if likeness is required | Multi-view fitting/capture, richer shape basis and likeness validation |
| Broad body coverage | Male foundation; female/neutral fallbacks | High | Authored compatible base variants and combination tests |
| Skin tissue response | Opaque PBR, no diffusion | High | Validated real-time scattering approximation and regional optical maps |
| Skin detail | Stock colour, geometry-derived normal, procedural micro grain | High | Clean reflectance maps, regional pore/wrinkle detail and suitable texture allocation |
| Expressive face | Blink, smile, jaw open | High | Authored facial rig, left/right controls, eyelid/lip correctives and visemes |
| Natural hair | One short style, cards/ribbons | High | Authored grooms/cards, scalp fitting, fibre shading and LODs |
| Production skinning | Procedural weights; inactive twist influences | High | Artist weight painting, active twist deformation and stress-pose correctives |
| Correct morph shading | Position morphs without body normal morphs | High | Export normal deltas or validated runtime normal reconstruction |
| Compatible wardrobe | Four garments bound to the old body count | High | Rebind/re-author per topology/LOD; repair GLB conformance |
| Granular customization | Many stored fields lack independent render behaviour | High | Capability-based parameter definitions and supported asset variants |
| Measurement accuracy | Mostly heuristic mapping | High | Landmark-based inverse fitting and a measured validation set |
| Mobile payload | Default lite is 8.13 MB | High | Compressed progressive assets and complete payload accounting |
| Device performance | Governor exists; acceptance pending | High | Physical-device p95, memory, loading and slider-latency measurements |
| Portable export parity | Runtime correctives exceed standard GLB behaviour | Medium/high | Define export scope; bake or package required deformation behaviour |
| Release reproducibility | Uncommitted assets; stale counts; Python environment issue | Medium | Versioned release manifest, reproducible environment and consolidated evidence |

## E. STACK AUDIT

This table covers the 3D runtime and its build, validation and persistence chain. Unrelated payment, email and finance libraries have no direct realism role.

Versions and npm licence fields were inspected locally. **U** below means **UNKNOWN — needs verification** for current upstream maintenance/support; it does not mean the package is abandoned.

| Dependency | Version | Licence/type | Maintenance | Realism relevance |
|---|---|---|---|---|
| React / React DOM | 19.2.4 | MIT, open source | U | Suitable UI foundation; neutral visual effect |
| Three.js and addon loaders/exporters | 0.184.0 | MIT, open source | Active upstream | Keep; supports substantially better assets/materials |
| React Three Fiber | 9.6.1 | MIT, open source | Active upstream | Keep; scene integration |
| Drei | 10.7.7 | MIT, open source | Active; newer stable releases exist | Useful loaders, controls and environment utilities |
| three-stdlib | 2.36.1 | MIT, open source | U | Loader/helper implementation; neutral |
| postprocessing | 6.39.1 | Zlib, open source | Active upstream | Useful finishing; cannot repair anatomy/material inputs |
| React post-processing wrapper | 3.0.4 | MIT, open source | Exact compatibility U | Older path; active path bypasses it |
| Zustand | 5.0.3 | MIT, open source | Active upstream | Keep; neutral visual effect |
| detect-gpu | 5.0.70 | MIT, open source | U | Initial quality selection; needs actual-device checks |
| GSAP | 3.15.0 | Custom “no charge” licence | Vendor maintained; exact terms U | Interface animation; little direct human-realism value |
| meshoptimizer | 1.1.1 | MIT, open source | Active upstream | Useful compression and geometry processing |
| three-mesh-bvh | 0.8.3 | MIT, open source | Active upstream | Useful fitting/contact acceleration |
| gltf-validator | 2.0.0-dev.3.10 | Apache-2.0 | Exact release support U | Essential format checks; no visual certification |
| Vite / React plugin | 8.3.0 / 6.0.1 | MIT | U | Build tooling; neutral |
| TypeScript | 6.0.3 | Apache-2.0 | U | Engineering correctness; neutral |
| ESLint | 9.39.4 | MIT | U | Engineering checks; neutral |
| Vitest | 5.0.1 | MIT | U | Behaviour tests; neutral |
| Playwright | 1.59.1 | Apache-2.0 | U | Browser evidence and regression checks |
| Express | 5.2.1 | MIT | U | API; neutral |
| Prisma client / CLI / libSQL adapter | 7.9.1 / 7.10.0 / 7.9.1 | Apache-2.0 | U | Persistence; neutral |
| libSQL client | 0.17.4 | MIT | U | Persistence; neutral |
| TanStack React Query | 5.100.11 | MIT | U | Server-state handling; neutral |
| Electron / electron-builder | 44.3.0 / 26.15.3 | MIT | U | Desktop distribution; does not improve human rendering |
| Python / NumPy | 3.13.9 / 2.3.4 | PSF / BSD-3-Clause | Exact environment support U | Offline asset processing |
| Blender | 5.1.1 | GPL authoring software | Exact build support U | Essential authoring/baking tool; export must be validated |

Upstream activity was checked for [Three.js](https://github.com/mrdoob/three.js/releases), [Fiber](https://github.com/pmndrs/react-three-fiber/releases), [Drei](https://github.com/pmndrs/drei/releases), [postprocessing](https://github.com/pmndrs/postprocessing/releases), [Zustand](https://github.com/pmndrs/zustand/releases), [meshoptimizer](https://github.com/zeux/meshoptimizer/releases) and [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh/releases). Activity does not certify the installed combination.

GSAP uses its own licence, rather than MIT. Its upstream README identifies that licence; the linked terms page was unavailable during this audit. [GSAP licence declaration](https://raw.githubusercontent.com/greensock/GSAP/master/README.md).

### Asset-source audit

| Source | Version/identity | Licence | Maintenance and realism assessment |
|---|---|---|---|
| MakeHuman base mesh and targets | 1.3.0, pinned commit above | CC0 assets; application code separately AGPL | Useful parametric foundation; stock output requires substantial finishing |
| MakeHuman skin maps | Pinned CC0 archive | CC0 | Reusable; insufficient evidence of modern calibrated reflectance |
| MakeHuman eyes | High-poly proxy + brown-eye source | CC0 | Useful starting geometry; optics need replacement/refinement |
| MakeHuman original short hair | `short02` | CC0 | Limited style and dated card construction |
| MakeHuman brows/lashes | `eyebrow001`, `eyelashes01` | CC0 | Useful foundation; limited variation |
| MakeHuman garments | Three casual-suit sources and one elegant-suit source | CC0 | Real garment topology, currently incompatible with R2 bindings |
| Project-generated refinements | Preview-75 and R2 | Project-authored derivatives; project MIT provenance where specified | Local maintenance; visual acceptance pending |
| Project dental, eye and surface additions | Audited source | Project-authored | Useful prototypes; no reference-fitted anatomical certification |
| Purchased scans/commercial human library | None established in this chain | — | No evidence of one being integrated |

The official MakeHuman project states that its old standalone GUI is largely no longer modified; MPFB is actively supported. **MPFB 2.0.18** was released on **10 October 2026**. The legacy forum/asset repository was shut down on **21 October**, while static asset packs and GitHub remained available. [Maintenance status](https://static.makehumancommunity.org/makehuman/faq/current_status.html), [MPFB release](https://static.makehumancommunity.org/news/2026-10-10-mpfb-2-0-18-has-been-released.html), [service availability](https://static.makehumancommunity.org/news/2026-10-21-community-site-shut-down.html).

### Licensing landmines

- The older MakeHuman licence uncertainty documented in this repository was addressed by switching to pinned CC0 sources. The provenance release check passes. Do not describe that historical issue as an established current violation.
- Third-party MakeHuman downloads do **not** automatically inherit the bundled assets’ CC0 status.
- **MB-Lab is a poor default replacement:** its repository was archived on **21 July 2024**; its licence explicitly assigns AGPL terms to its database and generated models. That is materially different from MakeHuman’s CC0 asset arrangement. [Repository](https://github.com/animate1978/MB-Lab), [licence](https://raw.githubusercontent.com/animate1978/MB-Lab/master/license.txt).
- SMPL-family research availability does not establish commercial redistribution rights. Commercial licensing needs separate verification. [Original project licensing explanation](https://files.is.tue.mpg.de/black/talks/SMPL-made-simple-FAQs.pdf).
- Reallusion distinguishes ordinary exported-content use from embedding content in applications/services. Its current page also retains inconsistent older FAQ text. An avatar-creation product needs written confirmation of its precise rights. [Content policy](https://www.reallusion.com/license/content.html).
- Commercial scan/skin libraries need explicit permission for browser-delivered assets, modification, generated variants and user export. **UNKNOWN — needs verification:** suitable vendor terms and prices.
- Full transitive npm/native dependency licensing and complete distributed notices are **UNKNOWN — needs verification**; the asset provenance check is not a complete software bill-of-materials audit.

### Open-source candidates not currently integrated

| Candidate | Licence/status | Useful role |
|---|---|---|
| MPFB 2.0.18 | GPLv3 code, CC0 core assets; active | Blender-native parametric authoring and better-maintained workflow |
| Blender Rigify workflow | Blender GPL tooling | Authoring/retargeting support; still requires export-compatible rigs |
| glTF Transform | MIT | Standardized packaging, optimization and inspection |
| KTX-Software/Basis workflow | Primarily Apache-2.0, with component-specific terms | GPU-compressed textures and reduced memory/payload |
| COLMAP | BSD; dependencies separate | Multi-view reconstruction |
| Meshroom/AliceVision | MPL-2.0; dependencies separate | Photogrammetry authoring |
| Poly Haven HDRIs | CC0 | Reference lighting and material evaluation |
| Authored real-time SSS implementation | Licence depends on chosen implementation | Skin diffusion approximation |
| TRELLIS.2 | MIT model/code, separate dependency terms | Experimental image-to-3D or texture assistance |

Sources: [MPFB licence](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/LICENSE.md), [glTF Transform licence](https://raw.githubusercontent.com/donmccurdy/glTF-Transform/main/LICENSE.md), [KTX licence](https://raw.githubusercontent.com/KhronosGroup/KTX-Software/main/LICENSE.md), [COLMAP](https://github.com/colmap/colmap), [Meshroom licence](https://raw.githubusercontent.com/alicevision/Meshroom/develop/COPYING.md), [Poly Haven terms](https://docs.polyhaven.com/en/faq), [TRELLIS.2](https://github.com/microsoft/TRELLIS.2).

KTX’s repository includes an optional non-open-source ETC decoder component, so the exact distribution needs component-level review.

**Stack recommendation:** retain Three.js, Fiber, React and Zustand. Prioritize asset authoring, texture delivery and the active material/deformation path. Review removal of unused legacy rendering paths and the bypassed wrapper after a complete import audit.

## F. CUSTOMIZATION ARCHITECTURE

### Current end-to-end flow

1. Resolve the selected person through `useAvatarRecord`.
2. Load the owner’s `BodyProfile` and serialized `physiqueTargets`, or the selected additional person’s scoped records.
3. Resolve missing measurements through fallback estimates.
4. `AvatarParameterMatrix` maps values to morph weights using ranges and formulas.
5. Apply manual overrides and constraints.
6. Resolve an asset from preset, profile preference, environment configuration and GPU tier.
7. Clone the scene and apply morphs, skinning, materials, attachments and pose.
8. Persist edits through debounced save queues: profile changes use approximately **650 ms**, wardrobe **350 ms**, presentation changes **450 ms**.
9. Store snapshots for check-ins and timeline use.

This is primarily forward heuristic mapping. It is not a general inverse solver that repeatedly measures the resulting human and makes every requested dimension fit.

Examples of limitations:

- `eyeSpacing`, ear width and ear length are explicitly recorded without independent shape channels.
- Paired arm, forearm, thigh and calf measurements drive averaged shared shapes.
- Numerous posture/composition fields are saved without independent geometric behaviour.
- Body height is visually clamped to **140–210 cm** through a **0.8–1.2** scale range around a **175 cm** reference.
- `jaw_angle` and some other facial values are partly inferred from unrelated measurements such as body fat.
- The reference photo is temporary, manual and excluded from saves/exports.
- Garment compatibility is tied to vertex counts rather than a complete versioned compatibility contract.

Sources: [parameter mapping](../src/components/morphEngine/metricsToBlendshapes.js), [profile mappings](../src/lib/physiqueProfile.js), [record scoping](../src/hooks/useAvatarRecord.js), [likeness controls](../src/components/physique/LikenessControls.jsx).

### UX friction assessment

- Users encounter more fields than the geometry can independently represent.
- Unitless face strengths require trial and error.
- Feature coupling makes a requested local edit affect multiple characteristics.
- Several apparently relevant choices are unavailable or saved-only.
- Likeness matching requires the user to perform the visual judgment.
- Current/Goal/person/pose/appearance contexts increase the chance of editing the wrong target.
- Upgrading the model can silently change garment implementation.
- Names such as `v2`, `preview-75` and `humanRealismPercent` can imply quality guarantees they do not encode.

### Required data model

A replacement should preserve the existing person/current/goal separation but formalize these records:

| Record | Required contents |
|---|---|
| Avatar identity | Person ID, revision, schema version, asset family, topology ID, rig version |
| Measurement | Value, unit, anatomical definition, side, source, confidence, date; unknown distinct from zero |
| Parameter definition | Semantic name, range, unit, dependencies, supported assets, actual render capability |
| Shape state | Body/face parameters, manual overrides, solver version and fitting residuals |
| Appearance state | Skin optical parameters, regional maps, hair/groom, brows, lashes, eyes, nails |
| Wardrobe/accessories | Asset IDs, material choices, layer order, fitting settings and compatibility |
| Asset manifest | Hashes, licence evidence, LODs, map channels, budgets and compatible bindings |
| Pose/performance | Separate transient expression, viseme, gaze and motion state |
| Snapshot/export | Exact asset, solver and parameter versions needed to reproduce the result |

The interface should expose semantic edits such as nose width or hairline position, while the engine handles morphs, corrective shapes and compatibility.

A practical beginner flow would use presets followed by roughly **15–30 understandable controls**, with measured and advanced editing available separately. That number is a proposed UX scope, not an existing requirement.

Every control needs an explicit capability: **rendered**, **approximate**, **saved only** or **unavailable**. No field should imply independent geometric behaviour merely because it exists in the database.

## G. CONSTRAINTS & FEASIBILITY

### Verified constraints

- Current delivery is browser WebGL with Electron desktop packaging.
- Mobile presentation and quality tiers exist.
- Current comparison modes can render two figures.
- Default mobile/balanced loading still uses an **8.13 MB** preview GLB.
- R2 public core reduces that to **1.95 MB**, but optional anatomy, garments, JavaScript and textures add payload.
- Quality adapts to measured frame times, but visible rendering remains continuous.
- Physical-device acceptance remains marked pending in the candidate configuration.
- The existing plans require both engineering and technical-art work.

**UNKNOWN — needs verification:**

- Actual team size and character-art/rigging skills.
- Available budget and external-asset allowance.
- Committed deadline.
- Minimum GPU/RAM and phone models.
- Peak GPU memory, draw calls and shader cost in real sessions.
- Thermal behaviour during sustained mobile use.
- Required frame rate during two-avatar comparison.
- Native mobile 3D parity and VR requirements.

### Feasibility verdict

A substantially more lifelike human is feasible in the existing Three.js/Fiber stack. The implementation needs a different **asset-production and validation approach**: authored anatomy, appropriate maps, skin scattering, facial deformation, hair and topology-compatible clothing.

Photoreal close-ups with unrestricted customization, motion and clothing across mid-range phones are **not an established feasible promise** under the current budgets. Quality must be defined separately for full-body inspection, portrait close-ups and animation.

Further subdivision and procedural shader patches alone will not deliver the target.

**Planning estimates, not commitments:** a constrained proof with one finished adult asset should first take **1–2 weeks** to establish visual quality, compatibility and device cost. A limited product-quality implementation is plausibly **8–16 weeks** with an experienced character artist, technical artist/rigger and WebGL engineer working in parallel. A broad appearance/wardrobe catalogue is a multi-month programme beyond that.

Actual staffing, cost and schedule remain **UNKNOWN — needs verification.**

## H. OPTIONS & RECOMMENDED PATH (no code changes yet)

| Path | Realism potential | Customization | Cost/licence | Performance/effort |
|---|---|---|---|---|
| Professionally finish MakeHuman/MPFB foundation | Good with strong art work | Strong compatible shape basis | Core tools/assets can have no licence fee; labour required | Best continuity; substantial head, skin, rig and groom work |
| Own photogrammetry/scan pipeline | High surface specificity | Requires retopology and shape-space construction | Capture, talent consent and processing costs; tooling can be open source | High authoring effort; scan alone is not a browser-ready avatar |
| Commercial scan/skin assets | High starting surface detail | Depends on topology and licensed variants | Proprietary; prices and app/export rights need verification | Faster reference quality; significant integration work |
| MetaHuman/Unreal pipeline | Strong face/animation starting point | Rich authoring; product editor remains work | Proprietary Epic terms | Heavy native workflow; browser conversion or streaming adds complexity |
| AI/diffusion-assisted generation | Useful for proposals and some surface work | Stable parametric editing is not supplied automatically | Model, dependencies and output rights vary | Retopology, rigging, validation and cleanup remain necessary |
| Hybrid parametric mesh + scan-derived detail | High, while retaining controls | Strong if topology stays controlled | CC0 foundation plus commissioned/licensed detail | Best fit for this product; requires disciplined asset/version ownership |

MetaHuman is currently usable with other engines/software. Epic states it is included under the Unreal Engine licence and free below **US$1 million revenue**, with applicable terms above that threshold. The old blanket claim that it is restricted to Unreal rendering would be inaccurate. Exact redistribution and application use still need review. [Epic licensing](https://www.metahuman.com/license).

TRELLIS.2 is an example of an available generative option, but its upstream requirements include Linux and an NVIDIA GPU with at least **24 GB** memory. It generates arbitrary topology and PBR assets; it does not establish a compatible human rig, measurement model or facial-expression system. Its suitability here is an engineering hypothesis requiring a spike. [Official repository](https://github.com/microsoft/TRELLIS.2).

### Recommended primary path: hybrid authoring, retaining the web renderer

Use MPFB/MakeHuman as a legally clear parametric foundation, then commission or author a finished human with:

- Reference-based head/body anatomy.
- Proper eyes, eyelids, mouth and facial correctives.
- Scan-derived or professionally authored skin detail with suitable redistribution rights.
- A tested real-time skin-scattering approximation.
- Authored hair and compatible clothing.
- Versioned LODs and bindings.

The first deliverable should be **one approved human**, assessed in clay, neutral skin lighting, face close-up and representative poses. Expansion to many customizable variants should follow that proof.

### Recommended alternative: MetaHuman benchmark/prototype

If face performance and close-up realism dominate, build a separate MetaHuman comparison prototype. Use it to assess the visual target and total platform cost before choosing native Unreal, streaming or browser conversion. Do not assume its authoring interface can simply become this application’s runtime editor.

### (1) The five biggest reasons the model looks like a toy, ranked

1. Generic, insufficiently finished head/body anatomy.
2. Skin without subsurface diffusion or convincing regional reflectance detail.
3. Visible hair-card/ribbon construction and inadequate fibre shading.
4. Approximate eyes, eyelids, mouth and a three-channel expression system.
5. Procedural skinning/correctives and missing body morph-normal updates.

### (2) The five highest-leverage changes to reach lifelike

1. Produce and approve one professionally finished canonical human against reference images.
2. Replace the skin inputs/material response with proper regional maps and tested scattering.
3. Rebuild the eye/lid/oral assembly and facial rig, including expression correctives and visemes.
4. Author hair and clothing for the chosen topology/LODs; eliminate compatibility fallbacks.
5. Validate deformation, morph shading, loading and performance on named devices before expanding the catalogue.

### (3) Questions needed before the next step

1. Is the first target a convincing generic person, a recognizable personal likeness, or a measurement-accurate twin?
2. Which exact reference images or products define acceptable realism?
3. What must the avatar do: stand, exercise, speak, wear clothing, or export?
4. Which minimum phone, desktop GPU, browser and frame rate must be supported?
5. Is the first release one adult body family or a broad range of sexes, ages and body types?
6. Must users download editable GLBs or redistribute their avatars?
7. What budget, deadline and character-art/rigging staff are available?
8. Is a web-first product mandatory, or would native Unreal/streaming be acceptable if the visual target requires it?
