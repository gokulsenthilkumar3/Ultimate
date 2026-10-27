# 3D human strategy review: parametric assets, realism and identity capture

Date: **26 October 2026**.

Scope: research and documentation only. This reviews the proposed replacement strategy against primary project sources and an independently inspected public GLB. No application code, model registry, installed dependencies, saved profiles or bundled assets were changed. No photographs were submitted to a service and no commercial subscription was started.

Related baseline: [Forensic 3D human audit](FORENSIC_3D_HUMAN_AUDIT_2026-10-26.md).

**Subsequent implementation, 26 October 2026:** the user later authorized code changes. The opt-in parametric editor, independent Current/Goal state, editable-package restore and compact/306-shape GLB exports are now implemented. Blender 5.1.1 interoperability and focused regression checks passed. See [the implementation and evidence record](real-human-3d/20-parametric-editor-and-export.md) for exact capabilities, remaining limits and commands. The research-only scope and unverified statements below describe the earlier review; they are not an updated implementation status.

## Decision

Revise the earlier continuity-first recommendation. Select the next foundation through a measured comparison of customization, visual quality, deformation, delivery cost and rights. Further R2 polishing should not be the default investment while that comparison remains unresolved.

Adopt these architectural principles:

- A versioned canonical human family with semantic parameters.
- Separate identity shape, proportions, expression, pose and surface appearance.
- Garments and hair with explicit compatibility and deformation contracts.
- Optional identity capture through an adapter, with a demonstrated path into the chosen human family.
- Separate mobile full-body and desktop portrait acceptance targets.

The named alternatives justify an evaluation, but the proposed text overstates several guarantees. In particular, `three.ws` is a more extensive customization implementation on a MakeHuman/MPFB foundation. Its base GLB is not a finished realistic human. A shared skeleton does not guarantee garment fit, and a GLB from a selfie service does not automatically acquire the canonical base's shape controls.

**Recommended next deliverable:** an isolated comparison using the actual `three.ws` base and one licensed high-quality head/body candidate, assessed against fixed reference views, selected parameter changes, deformation cases and named devices. Preserve R2 as a baseline and fallback until a replacement passes those checks.

**User-confirmed first-release requirement:** support both in-app use and external avatar use, with continued editing after export. This requirement was confirmed in this conversation on **26 October 2026**. A static viewing-only download is insufficient. The portable editing contract is detailed in section 12; subsequent implementation and Blender verification are recorded in the follow-up linked above.

Whether photo-created and manually created avatars must expose identical controls remains a separate requirement. Export alone does not require a canonical mesh; a vendor GLB may be exportable when its licence permits it. A unified parameter editor across independently produced identities is the requirement that introduces canonical fitting or a compatible shared vendor family.

## Evidence labels and limits

- **VERIFIED — binary:** independently read from the pinned public GLB.
- **VERIFIED — source:** inspected in project implementation, tests, specifications or licence files. This does not mean the project's test suite was run here.
- **VERIFIED — vendor documentation:** the vendor currently documents the capability, price or limitation. This does not establish output quality or negotiated rights for this product.
- **ENGINEERING ASSESSMENT:** a conclusion or proposed design based on the evidence.
- **UNKNOWN — needs verification:** not established by the work performed.

No fresh browser visual comparison, upstream full test-suite execution, physical-phone benchmark or paid avatar-generation trial was performed. The conclusions below do not certify candidate visual quality or performance.

## 1. What the original recommendation should change

The original audit correctly identified asset, material, deformation and customization gaps. Its recommended primary route gave too much weight to continuity before comparing externally available parametric implementations. It should explicitly separate:

1. **Customization foundation:** parameter coverage, stable topology, rig behaviour and reproducible state.
2. **Visual asset quality:** anatomical sculpt, maps, eyes, mouth, hair and material response.
3. **Identity capture:** obtaining a recognizable identity and translating it into the supported asset family.
4. **Delivery:** editor cost, viewing cost, LODs, portability and device capability.

It would also be incorrect to conclude that MakeHuman ancestry alone makes a human unsuitable. Its assets can be modified and reauthored. The relevant limits are the resulting topology, shape basis, rig, materials, licence and validated parameter domain. A fixed topology and a single UV set do not inherently prevent local nose or eyelid customization; they also do not guarantee sufficient close-up detail.

The proposed `three.ws` alternative itself uses MakeHuman/MPFB2 source data. This is an architectural and parameter-coverage comparison within a related asset family, rather than proof that changing the source label solves realism.

## 2. Independent inspection of `three.ws`

Repository: [nirholas/three.ws](https://github.com/nirholas/three.ws).

Pinned revision inspected: [`9952a5ae1c888179b25cf24ef97a4280be7ae7fd`](https://github.com/nirholas/three.ws/commit/9952a5ae1c888179b25cf24ef97a4280be7ae7fd), dated **25 October 2026, 12:06:06 UTC**.

Asset: [`public/avatars/parametric-base.glb`](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/public/avatars/parametric-base.glb).

The GitHub connector was used for source and metadata. Because it does not support binary downloads, the public GLB was read over HTTPS into memory and parsed without saving or executing it. Its Git blob identity matched the pinned repository metadata.

| Identity | Independently verified value |
|---|---|
| File bytes | **6,806,984** |
| SHA-256 | `6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18` |
| Git blob SHA-1 | `652ee3882097d41e7920c7de0454e1c73a94a507` |
| Meshes | **4** |
| Skeletons | **1** |
| Skeleton joints | **52** |
| Total exported vertices | **15,066** |
| Total triangles | **27,676** |
| Embedded images | **0** |

### Per-mesh data

| Mesh | Vertices | Triangles | Position morphs | Morph normal targets |
|---|---:|---:|---:|---|
| Body | 14,517 | 26,756 | 306 | Absent |
| Eyes | 160 | 280 | 30 | Absent |
| Teeth | 136 | 192 | 32 | Absent |
| Tongue | 253 | 448 | 27 | Absent |

The quoted **14,517 vertices / 26,756 triangles** refers to the body, not the complete file.

All four meshes contain position, normal, UV, joint-index and skin-weight attributes. The file provides ordinary metallic/roughness material values and contains no embedded texture images. No normal-morph targets were present.

| Material | Base colour factor | Roughness | Metalness |
|---|---|---:|---:|
| Body | `[0.72, 0.42, 0.29, 1]` | 0.85 | 0 |
| Eyes | `[0.18, 0.12, 0.09, 1]` | 0.25 | 0 |
| Teeth | `[0.93, 0.91, 0.86, 1]` | 0.4 | 0 |
| Tongue | `[0.66, 0.3, 0.28, 1]` | 0.6 | 0 |

**ENGINEERING ASSESSMENT:** this is a useful shape-editing foundation. Substituting the file by itself would not supply realistic skin textures, pore normals, scattering, corneal optics, authored hair or a production expression system. It also retains the morph-normal issue that the application needs to solve.

**UNKNOWN — needs verification:** visual quality under the target lighting, skinning quality across combinations, facial contact, generated-avatar likeness, and sustained rendering performance.

### Morph count and grouping

The current baker declares **306 unique morph recipes**, independently counted from its `M`, `PAIR` and `BOTH` entries. The binary confirms **306 body morph targets**.

The supplied list of groups totals **274**, not 306. The missing groups are **Cheeks 16, Neck 10 and Brows 6**, adding 32.

| Group | Channels | Group | Channels |
|---|---:|---|---:|
| Eyes | 42 | Neck | 10 |
| Nose | 36 | Torso | 22 |
| Mouth | 35 | Hips & Midsection | 17 |
| Ears | 32 | Arms | 15 |
| Head Shape | 27 | Legs | 22 |
| Cheeks | 16 | Body | 12 |
| Jaw | 14 | Brows | 6 |

Opposing increase/decrease shapes are separate channels, and some facial channels are left/right pairs. Therefore, **306 channels is not equivalent to 306 independent anatomical dimensions or 306 beginner-facing controls**.

Sources: [pinned builder](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/scripts/build-parametric-base.mjs), [pinned parameter specification](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/specs/PARAMETRIC_AVATAR.md), [sculpt UI](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/src/avatar-sculpt.js).

### Independent sliders: what is and is not established

The source offers named local shape controls and tests broad localization. For example, a nose target must affect the face region rather than the feet. That is valuable evidence of local deformation.

It does not demonstrate zero cheek influence, statistical independence, collision-free combinations, calibrated millimetre ranges or acceptable anatomy for every combination. Lips, eyelids, nose and cheeks have physical dependencies; correctives and constraints are necessary even with good semantic controls.

**ENGINEERING ASSESSMENT:** require a defined influence region, a documented parameter meaning, combination constraints and correctives. Do not promise that every control can have an entirely non-interfering response.

Source: [localization and structure tests](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/tests/parametric-base.test.js). These tests were read, not executed in this review.

### Capabilities the upstream project still calls reserved

The pinned canonical-body specification lists these as reserved work:

- Canonical conforming hair/garment auto-fitting.
- Canonical texture layers.
- Folding identity morphs into a baked viewing mesh.
- Animation identity.

There is implemented general garment skeleton remapping in a separate module. Skeleton attachment is distinct from canonical auto-fitting across all body shapes. Other documents use broader feature-status language, so the individual source paths and a working demo must be checked rather than relying on an umbrella “live” label.

The selfie identity implementation inspected in `src/avatar-face-capture.js` uses geometric ratios from **478 landmarks**, returns at most approximately **12 identity-style keys**, and explicitly describes its heuristics as crude. It is not evidence of a finished scan-to-canonical-human reconstruction pipeline.

Sources: [reserved-work ledger](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/specs/PARAMETRIC_AVATAR.md#reserved), [garment implementation](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/src/avatar-garment.js), [identity capture implementation](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/src/avatar-face-capture.js).

## 3. The mobile cost omitted by the proposed strategy

Sparse glTF morph accessors reduce download size. They do not make the standard Three.js WebGL morph textures sparse on the GPU.

Installed Three.js **0.184.0** creates a floating-point texture array with one layer per morph target. For position-only morphs, the unpadded estimate is:

```text
sum(vertices × morph targets × 16 bytes)

Body:   14,517 × 306 × 16
Eyes:      160 ×  30 × 16
Teeth:     136 ×  32 × 16
Tongue:    253 ×  27 × 16

Total: approximately 68.03 MiB
```

This excludes texture-dimension padding, geometry, decoded CPU data, skin/hair maps, render targets and other scene costs. Two independently cloned geometry sets can roughly double that morph allocation. Adding normal morphs increases storage again. These are calculations from the inspected data and renderer implementation, not measured device-memory readings.

There is also a capability risk: the body requests **306 array layers**. OpenGL ES 3.0 guarantees only a minimum of **256** array-texture layers; WebGL 2 is based on that API. A device limited to 256 layers cannot host this body through the unchanged one-layer-per-target path. Query `MAX_ARRAY_TEXTURE_LAYERS` rather than assuming mobile compatibility.

The untextured **6.81 MB** base also exceeds the application's existing **3 MB mobile model** target and **5 MB initial payload** target before appearance assets are added. Further compression or a different delivery representation may reduce transfer size, but would not remove the GPU-layer requirement by itself.

**Required architecture:** keep a complete semantic parameter document, but distinguish editing from viewing. Evaluate identity changes on demand, bake the chosen identity for ordinary viewing, regenerate normals, and retain only the expression targets required by that view. Expression deformation must still be validated on the baked identity. A worker/CPU evaluator or a custom morph-packing strategy is another candidate; none is assumed implemented.

Sources: [installed WebGL morph allocation](../node_modules/three/src/renderers/webgl/WebGLMorphtargets.js), [upstream morph budget](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/specs/PARAMETRIC_AVATAR.md#the-vram-budget-the-real-ceiling-on-slider-count), [Khronos array-layer limits](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/es3.0/glGet.xml), [WebGL 2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/).

**UNKNOWN — needs verification:** the selected phones' actual limits, allocation, first-frame time, slider latency, thermal behaviour and frame-time p95. Neither 30 FPS mobile nor 60 FPS desktop is certified here.

### WebGPU qualification

The 256-layer guaranteed minimum is not a universal hardware ceiling. Some WebGPU adapters expose a higher `maxTextureArrayLayers` limit. A request for **2,048** layers can succeed only when the selected adapter supports that limit; it does not create additional hardware capability. The WebGPU specification's default array-layer limit is also **256**, and device creation fails when requested limits cannot be supplied.

For this body, request the capability actually required by the chosen representation, rather than demanding 2,048 layers indiscriminately. Check both the adapter's available limit and the created device's enabled limit. Treat unsupported devices as a defined fallback case.

Installed Three.js **0.184.0** also uses `DataArrayTexture` in its node-based `MorphNode`, with one layer per target. Moving this asset to that renderer does not, by itself, remove the storage cost. The current application uses a WebGL canvas and shader modifications through `onBeforeCompile`; a WebGPU path needs a separate material/post-processing compatibility review and device benchmark.

**ENGINEERING ASSESSMENT:** retain identity baking and optimized viewing assets as the broadly compatible delivery strategy. Evaluate a higher-limit WebGPU editor as an optional path on supported adapters. Neither a renderer change nor a successful allocation proves acceptable frame time, energy consumption or mobile stability.

Sources: [WebGPU specification source: limits and device requests](https://github.com/gpuweb/gpuweb/blob/main/spec/index.bs), [installed node-based morph allocation](../node_modules/three/src/nodes/accessors/MorphNode.js), [active WebGL canvas](../src/components/ChamberCanvas.jsx), [current skin shader hooks](../src/components/body3d/physicalSkinMaterial.js).

## 4. Shared topology and skeleton: useful contracts, limited guarantees

### What a canonical family helps solve

- Stable vertex correspondence within a topology/LOD.
- Reusable parameter bindings and garment transfer data.
- Consistent rig mappings and animation adapters.
- Reproducible versions and supported combinations.

### What it does not solve automatically

- A shirt following a larger waist, bust or shoulder shape.
- Cloth ease, thickness, layering and collision/contact.
- Eye/lid contact after head changes.
- Animation foot contact, root motion, twist quality or differing rest frames.
- Neck seams and skin continuity when substituting a separately generated head.
- Correspondence between different LOD topologies.

If a torso grows using a mesh morph, a garment sharing only the skeleton does not inherit that surface growth. The garment needs corresponding morphs, barycentric/cage bindings, fitting or another explicit deformation mechanism.

The commercial API documentation makes the same distinction: when body shape changes at runtime, matching garment blendshapes must also be applied to avoid intersections. Hats and necklaces have analogous requirements. [Avatar SDK fitting notes](https://api.avatarsdk.com/#outfits).

**Conclusion:** replacing the body's vertex count does not repair the existing garments. Their bindings must be regenerated for the selected canonical body. The current 16,001-vertex compatibility check remains relevant until that work is completed.

## 5. This is not a drop-in GLB replacement for GrowthTrack

The existing loader builds its morph map from the application's fixed `GEOMETRY_MORPH_TARGETS` list. The current contract uses names such as `nose_bridge_width`, `jaw_width`, `overall_mass` and `blink`; the candidate uses names such as `noseWider` and `bodyHeavier` for identity shapes.

The candidate's 306-channel identity bank does not provide a demonstrated replacement for the application's expression/performance contract. A migration needs semantic mappings and capability discovery rather than a filename switch.

The bone resolver contains Mixamo-style aliases but resolves by exact string comparison. Candidate names include the `mixamorig:` prefix. Name normalization, rest frames, bind matrices, finger coverage and pose behaviour need verification. A matching word such as “Mixamo” is not sufficient acceptance evidence.

Other paths requiring adapters include:

- Body/feature discovery and material assignment.
- Measurement mapping and an explicit choice between artistic shape and calibrated dimensions.
- Head, eye, mouth and accessory attachment.
- Pose controls and motion sampling.
- Garment bindings, capture and export.
- Current/Goal independence, snapshots and existing saved profiles.
- LOD-specific asset manifests and correspondence.

Do not replace saved values silently. A migration should preserve the previous asset version and parameter record, and report unsupported or approximate mappings explicitly.

Local evidence: [morph-index loader](../src/components/morphEngine/useModelLoader.js), [morph names](../src/components/morphEngine/constants.js), [morph-domain contract](../src/components/morphEngine/morphMath.js), [bone resolver](../src/components/morphEngine/boneMap.js), [garment compatibility](../src/components/morphEngine/authoredGarments.js).

## 6. Identity capture: Avatar SDK and MetaPerson

**VERIFIED — vendor documentation:** MetaPerson is a product/pipeline of **Avatar SDK / itSeez3D**, not a second independent supplier. Its REST API supports photograph-based avatar generation and GLB exports. The current documented MetaPerson pipeline is **`metaperson_2.1`**, with `2.0` still available.

The API documents an ARKit-compatible **`mobile_51`** expression set. Therefore, “all Avatar SDK exports contain ARKit-52” is not an established specification. Request the exact expression set and inspect a sample export.

Sources: [MetaPerson REST documentation](https://docs.metaperson.avatarsdk.com/rest_api/), [pipeline and expression reference](https://api.avatarsdk.com/).

### Pricing correction

The public Pro page inspected displays **US$800/month**, **1,000 avatars/month**, and **US$0.03 per additional avatar**. It advertises annual discounts up to **25%**. The supplied **US$600/month** could refer to a discounted annual equivalent or an older price, but that billing interpretation was not verified.

Pro eligibility requires less than **US$2 million revenue over the past 12 months** and less than **US$2 million total funding raised**. Enterprise is quoted separately. A model with custom topology or custom blendshapes is listed among Enterprise capabilities.

**UNKNOWN — needs verification:** an actual quote, commitment term, taxes, exact discount, rights to modify/export/redistribute avatars in this product, and long-term storage/offline rights.

Source: [current vendor pricing](https://avatarsdk.com/pricing-cloud/).

The public figures were rechecked on **26 October 2026** and remain dated observations, not a procurement commitment. Before choosing a paid integration, obtain the exact billing term, included generations, overage, eligibility thresholds, exportable expression names, modification/redistribution rights and storage/retention terms. Do not substitute a marketing statement or an older quota for the applicable agreement.

### Three integration choices

| Choice | Benefit | Required work and limitation |
|---|---|---|
| Use the vendor's complete avatar family | Fastest route to testing its likeness and existing wardrobe | Customization becomes vendor-family-specific; validate available controls and terms |
| Fit captured identity into the canonical parameter model | Preserves one internal editor and asset family | Requires a real fitting/texture-transfer stage and measured residuals; retargeting alone is insufficient |
| Attach a vendor-generated head to the canonical body | Can retain more head detail | Requires compatible neck geometry, rest frames, skin weights, materials, hair and facial correctives |

**ENGINEERING ASSESSMENT:** begin with a licensed sample exported as the vendor's complete avatar. Prove visual quality and required rights before committing to canonical identity fitting or modular head attachment.

A single selfie is an inferred reconstruction. Use a product label such as “Create from a photo.” Calling it a “scan” implies measurement fidelity that has not been established.

No accounts were created and no personal images were uploaded during this review.

## 7. MetaHuman-to-GLB: real project, consequential limitations

The proposed exporter exists: [creategamecharacters/metahuman-to-glb](https://github.com/creategamecharacters/metahuman-to-glb).

Pinned revision inspected: [`5faa13fbfccefb3a194943433f6dd42ef6195d00`](https://github.com/creategamecharacters/metahuman-to-glb/commit/5faa13fbfccefb3a194943433f6dd42ef6195d00), dated **1 October 2026**.

Its README reports a UE **5.7** export pipeline with **51** ARKit-style shapes. It explicitly identifies `tongueOut` as requiring a non-default rig variant. “All 51” must not be presented as complete 52-channel coverage.

The project's stated output is approximately **40 MB**, with **1024 px** texture caps and Draco compression. That is approximately **8×** the current 5 MB initial target and **13.3×** the 3 MB mobile target, using the README's rounded size. The README says it was tested on iPhone X; it does not provide measured p95 frame times, memory or a 60 FPS acceptance result.

It also records known gaps:

- Fine lip/wrinkle corrective deformation is lost, reported around **5–10 mm**.
- Eye-occlusion geometry has an incorrect broad dark overlay.
- Eyelash coverage textures look low resolution.
- Scalp darkening under the cards is absent.
- A bilateral brow shape loses left/right asymmetry.
- Some clothing colour blending is not carried through.

These are upstream-reported limitations, not independent reproduction results. The pipeline and a complete output were not run or visually certified here.

Source: [pinned README](https://github.com/creategamecharacters/metahuman-to-glb/blob/5faa13fbfccefb3a194943433f6dd42ef6195d00/README.md).

The exporter code is **MIT**. The generated MetaHuman assets remain subject to **Epic's applicable terms**. MIT exporter code does not convert proprietary source assets into MIT or CC0 assets.

Epic currently permits MetaHumans in other engines/software and describes the licence as included with Unreal, free below **US$1 million revenue**, with applicable Unreal terms above the threshold. Exact product use, distribution and export rights still need review. [Exporter licence](https://github.com/creategamecharacters/metahuman-to-glb/blob/5faa13fbfccefb3a194943433f6dd42ef6195d00/LICENSE), [Epic licensing](https://www.metahuman.com/license).

The web Creator shutdown is separate from the desktop pipeline: Epic's announcement gives **5 November 2026** as the final web-app access date, followed by a **90-day retrieval window**. In-engine Creator is available from UE **5.6** onward. [Epic announcement](https://forums.unrealengine.com/t/metahuman-creator-web-application-is-being-discontinued/2695297), [in-engine Creator documentation](https://dev.epicgames.com/documentation/metahuman/metahuman-creator-in-unreal-engine).

**ENGINEERING ASSESSMENT:** use this as a portrait benchmark/export experiment. It does not demonstrate a complete editable MetaHuman character generator running inside the browser.

## 8. Skin and hair: retain the direction, qualify the claims

### Skin

The active application skin material still needs scattering work. For the intended close-up target, realistic light transport through tissue is an important missing component. It must be developed together with anatomy, albedo, regional roughness, normals and thickness information.

“Three.js has no subsurface scattering feature” is too broad. Three.js **r184** includes an example `SubsurfaceScatteringShader` and an example scene. This is not a stock `MeshPhysicalMaterial` skin mode or a production human-skin solution. It provides a starting approximation to evaluate.

Compare at least:

1. A pre-integrated or thickness-driven approximation suitable for the mobile target.
2. A higher-quality diffusion approximation for a portrait tier, if its cost is justified.

Integration must preserve skinning, morphs, correct colour handling, shadows, captures, exports and the chosen normal strategy. SSS alone does not certify skin realism.

Sources: [r184 shader](https://github.com/mrdoob/three.js/blob/r184/examples/jsm/shaders/SubsurfaceScatteringShader.js), [r184 demonstration](https://github.com/mrdoob/three.js/blob/r184/examples/webgl_materials_subsurface_scattering.html), [current skin implementation](../src/components/body3d/physicalSkinMaterial.js).

### Hair

Groom curves authored offline and baked into textured cards are a sensible mobile/browser candidate. Include strand-direction/tangent information, opacity coverage, root variation, scalp coverage, highlights, shadows and LODs. Alpha overdraw and antialiasing can make cards expensive or visibly poor despite a low polygon count.

Treat body shape, hair and wardrobe as separate asset workstreams with their own acceptance evidence. Reusing a parametric body basis does not supply a finished hairstyle catalogue or a parametric garment generator. Exact catalogue coverage and quality remain **UNKNOWN — needs verification** for the selected asset versions.

“Ribbons” and “cards” are not a reliable good/bad distinction: both use polygon strips. The present broad strips need better authored coverage, groom structure, materials and silhouettes. An exporter or an anisotropy checkbox does not supply those assets.

Epic documents strands, cards and meshes as different scalability representations. Strands need an explicit budget and are not supported on every platform; cards are a fallback when appropriate. [Epic groom scalability](https://dev.epicgames.com/documentation/unreal-engine/groom-scalability-and-performance-with-unreal-engine).

**UNKNOWN — needs verification:** visual match and total rendering cost of any proposed groom/card set on the selected devices.

## 9. Licensing and service availability

| Component | Verified licence/status | Consequence |
|---|---|---|
| `three.ws` repository code | Apache-2.0 | Preserve applicable notices when copying code; review the selected files and dependencies |
| Vendored `anny` MakeHuman/MPFB2 data | CC0 licence and provenance files inspected | Candidate data is suitable for commercial evaluation; preserve provenance |
| NAVER Anny code | Apache-2.0 | Separate from the asset licence; inspect exact modules/dependencies before adoption |
| Optional Anny SMPL-X topology | Explicitly non-commercial in the upstream README | Exclude it from a commercial pipeline without appropriate separate rights |
| MetaHuman exporter | MIT code | Does not supersede Epic asset terms |
| MetaHuman assets | Epic/Unreal terms | Browser use is possible; full product/distribution terms still require checking |
| Avatar SDK/MetaPerson | Commercial service | Price, supported output, availability and rights are contract dependencies |
| Ready Player Me hosted service | Closure corroborated by an integration partner's announcement for 31 January 2026 | Do not choose its hosted creator/API for a new dependency |
| Previously downloaded RPM GLBs | Standard files may remain technically loadable | Do not confuse service closure with file invalidation; retained use still depends on the original rights |

Sources: [`three.ws` code licence](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/LICENSE), [vendored data provenance](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/avatar-sources/anny/README.md), [CC0 text](https://github.com/nirholas/three.ws/blob/9952a5ae1c888179b25cf24ef97a4280be7ae7fd/avatar-sources/anny/LICENSE.md), [Anny licence distinctions](https://github.com/naver/anny#license), [Frame's RPM closure notice](https://learn.framevr.io/blog/rpm-closure).

The RPM date is corroborated by a direct integration partner's operational notice. An accessible first-party RPM shutdown announcement was not verified in this review. A competitor's migration article alone should not be treated as the sole evidence.

No vendor was contacted. No commercial redistribution agreement, full dependency audit or asset-by-asset legal certification was obtained.

## 10. Recommended architecture

```text
Manual creation / optional photo provider
                  |
       identity or provider adapter
                  |
   Versioned semantic avatar document
   - identity shape and proportions
   - measured values and provenance
   - surface, hair, clothing, accessories
   - asset family / topology / rig / solver versions
                  |
        canonical shape evaluation
                  |
     fit rig + features + conforming assets
                  |
       validate normals and correctives
                  |
       editor preview / baked viewing asset
                  |
      mobile body tier / desktop portrait tier
```

Required contracts:

1. **Semantic parameter registry.** Each parameter has a meaning, unit/range, support state, dependency rules and bindings. Merge opposing source channels into a simpler signed control where appropriate. Preserve advanced access without making 306 sliders the default user journey.
2. **Asset identity.** Store source revision, canonical family, topology hash, LOD, rig version, material version and licence evidence. Vertex count alone is insufficient identity.
3. **Topology correspondence.** Preserve vertex order across variants within a given LOD. Author explicit mappings between LODs rather than requiring all LODs to have equal geometry.
4. **Proportion handling.** Coordinate mesh shape, skeleton rest positions/scales and bind behaviour. A morph can change limb length geometrically, but skinning will be wrong unless the rig is updated appropriately; a blanket statement that morphs cannot express length is inaccurate.
5. **Expression handling.** Distinguish identity controls from expression channels. Validate expressions after identity edits and keep eyelids, teeth, tongue, hair and facial accessories attached correctly.
6. **Conforming assets.** Transfer body deformation, preserve cloth ease and layer clearance, and declare a tested shape/pose range. Do not promise “any body.”
7. **Identity adapters.** Select one proven integration route per provider: native family, canonical fitting or modular head. Reject unsupported topology rather than silently pretending all controls still work.
8. **Editor/viewer separation.** Save semantic state, but serve an optimized baked identity with an appropriate expression bank. Handle GPU capability limits explicitly.
9. **Persistence compatibility.** Preserve Current/Goal, saved people, snapshots and historical versions. Use explicit migrations with visible approximation/unsupported states.
10. **Export semantics.** Specify which shapes, expressions, materials, fitting and correctives survive standalone GLB export. Browser-side JavaScript does not automatically travel with the file.

## 11. Revised roadmap with acceptance gates

All durations below are planning estimates for appropriately skilled staff. They are not commitments or evidence that the phase has been implemented.

| Phase | Deliverable | Indicative effort | Gate before committing further work |
|---|---|---|---|
| 0. Evidence and target | Candidate comparison, named devices, references, editable-export scope and rights ledger | 1–2 weeks | Approve a visual target and demonstrate shape edits plus a plausible memory/delivery path; candidate rights permit continued external editing |
| 1. Canonical prototype | Semantic model, candidate adapter, editor, normals and save/reload | 2–4 weeks for a constrained prototype | Representative controls work; history/current/goal remain isolated; no reliance on unsupported 306-layer devices |
| 2. Surface and head | One finished head/body, SSS comparison, eyes/oral parts, one hair set | 3–5 weeks for a constrained demonstration | Neutral/reference lighting and portrait views pass; expression contacts and frame costs are measured |
| 3. Optional photo identity | Provider sample, rights, one explicit adaptation route | 3–4 weeks for basic API integration; canonical fitting separately estimated | Likeness and editable parameters survive adaptation without hidden topology substitutions |
| 4. Wardrobe | One garment set bound to the selected family/LODs | 2–3 weeks for a simple prototype set; complexity-dependent | Tested shape/pose matrix, valid exports, acceptable clearance and layer behaviour |
| 5. Release | Device measurements, migrations, fallback and editable-export evidence | UNKNOWN — needs verification | Physical-device performance, approved visual evidence and external-tool edit/reimport checks on exact versioned assets |

A **proposed** first garment matrix is **30 body configurations × 5 poses = 150 cases per garment**. This is finite regression coverage, not proof of every possible body or motion. The selected dimensions, extremes, clearance tolerances and poses must match the product's supported range.

Keep mobile full-body **30 FPS / approximately 33.3 ms** and desktop portrait **60 FPS / approximately 16.7 ms** as candidate targets until measured on named devices. Specify p95, image size, DPR, pose, number of avatars and enabled effects. No tier may advertise photorealism on the basis of its name alone.

The supplied schedule omits the editor/viewer memory architecture, rig/head adapters, migration, validation and rights work. It should not be accepted as a production delivery commitment.

### Operational sequence for the first comparison

These gates refine the implementation roadmap. They are proposed tests; no physical-device result is claimed.

| Stage | Scope | Evidence required | Gate |
|---|---|---|---|
| 1. Parametric feasibility | The exact pinned 306-morph base on named minimum phone and desktop hardware | Renderer/backend version, texture-array limits, morph representation, image size/DPR, first-frame time, frame-time p95, slider latency and memory accounting | Demonstrated 30 FPS viewing target on the minimum phone, or an optimized baked-view path that meets the agreed budget; proposed slider-response target ≤100 ms |
| 2. Garment compatibility | One authored garment with actual body-shape transfer | At least 10 deliberately selected extreme shapes, plus combinations and relevant shoulder/waist/hip poses; neutral and animated views | No visible body penetration in the accepted matrix and documented clearance/coverage behaviour; extend to the 150-case matrix before release |
| 3. Visual target | One licensed Avatar SDK/MetaPerson sample and one MetaHuman-export portrait sample | Fixed neutral lighting, camera/FOV, full-body and portrait framing, reference images, asset hashes, rights and defect ledger | Approved target images with specific remaining anatomy, skin, hair, eye and oral defects assigned to workstreams |
| 4. Identity integration | Vendor-native avatar versus canonical fitting or modular-head adaptation | Likeness before/after edits, supported parameter coverage, neck/material continuity, expressions, wardrobe behaviour and rights | Select one demonstrated adaptation route; preserve likeness and supported editing without silently changing topology or capabilities |

For memory reporting, distinguish estimates of resident resources from measured allocations. Geometry/texture counts alone are not GPU byte measurements. Where the device/browser exposes no reliable memory measurement, report **UNKNOWN — needs verification**, provide the resource-size estimate and document its exclusions.

Run the selected interaction sequence long enough to observe warming and throttling; **10 minutes** is a proposed first soak duration. Record browser errors, context/device loss, quality-tier changes and frame-time p95. Fixed screenshots and a successful load are insufficient performance evidence.

## 12. Immediate changes to the strategy, without implementing them

1. Replace “finish the current MakeHuman derivative by default” with a candidate-selection gate covering both parameter coverage and visual quality.
2. Put `three.ws`/Anny-derived parametric authoring on the shortlist, with the actual texture, normal and GPU limitations recorded.
3. Put the MetaHuman exporter on a separate portrait/reference experiment, retaining its reported corrective losses and payload cost.
4. Treat Avatar SDK/MetaPerson as one commercial provider; obtain a sample and exact terms before deciding on canonical fitting.
5. Add identity baking, morph-layer limits, conforming-asset transfer and topology migration as named workstreams.
6. Preserve existing assets and owner data until a replacement has measurable acceptance evidence.

### Export and unified editing are separate decisions

| Requirement | Feasible starting direction | What still needs proof |
|---|---|---|
| View/customize only inside GrowthTrack, using vendor-exposed controls | A vendor's complete family can be the fastest evaluation path | Its controls, visual quality, wardrobe, operational cost and application-use rights satisfy the product |
| Download a standard GLB for external use | A vendor or authored family can both support this when the applicable rights permit | Redistribution rights, textures/rig/expressions in the file and behaviour in the target viewer |
| Keep photo-created and manual avatars editable with the same granular controls | A compatible vendor family, or canonical parameter fitting and texture transfer | Shape/expression correspondence, supported identity range, garment transfer and reproducible edits |
| Round-trip an externally edited avatar back into GrowthTrack | A versioned reimport contract and preservation of semantic state | Topology/rig validation, parameter-sidecar handling, asset provenance and behaviour when external edits invalidate correspondence |

A canonical basis is useful for product-controlled interoperability, but export by itself does not logically require one. Conversely, app-only use can still require canonical authoring when the vendor's controls cannot express the promised customization.

The user has answered **where the avatar may be used**: inside GrowthTrack and externally, with continued editing. The remaining contract is **which editing capabilities must survive generation, export and reimport**. Do not begin an expensive canonical identity-fitting implementation solely because a download button is required.

### Confirmed requirement: editable external export

**Confirmed by the user:** “Both, with continued editing after export.”

**Proposed design, not implemented:** export an editable avatar package containing a standard GLB and a versioned semantic document/manifest. Preserve the authoritative avatar state in GrowthTrack as well. A generic GLB viewer or DCC can edit the GLB features it supports; it will not automatically understand GrowthTrack's semantic controls or fitting logic.

| Package component | Purpose | Required verification |
|---|---|---|
| `avatar.glb` | Portable mesh, UVs, textures, rig and the declared morph/expression channels | Loads, poses and edits correctly in the selected external tools; exact unsupported material features are recorded |
| `avatar.json` | Semantic shape/proportion/appearance values, units, custom edits and schema/solver versions | Reopens the same supported editing state without relying on an undocumented current default |
| Asset manifest | Family, topology, LOD, rig, material and source hashes, plus dependencies and licence evidence | Required basis/maps are available under terms permitting the intended export and further modification |
| Editable basis or versioned basis reference | Reconstructs semantic edits that an optimized viewing GLB has baked into its positions | Identity controls remain recoverable; do not discard the only basis needed for later editing |

Keep the optimized **viewing representation** and the complete **editing state** distinct. An identity-baked GLB can be useful for lightweight playback and ordinary DCC geometry editing, while the package preserves the parameter basis needed to reopen semantic controls. Including a full 306-target editing GLB is an optional profile with a larger cost; it does not change the minimum-device limitations of the viewing path.

Do not promise that exporting a small baked GLB alone preserves every original slider. Do not promise that a third-party editor implements the sidecar parameter schema.

### External edit and reimport acceptance

The following is a proposed support boundary, not a claim of completed round-trip support:

1. Export and reopen an unchanged package with the same supported semantic values, rig and visible result, within agreed numerical/visual tolerances.
2. Verify direct external material, pose and morph edits in at least one named DCC. **Blender 5.1.1** is a candidate test target because it is already present in the asset records; no interoperability result is implied by that choice.
3. For custom sculpt edits that preserve vertex correspondence, investigate storing the difference as a separate bind-space delta layer. Identity values and external deltas must remain distinguishable.
4. If an external tool changes topology, vertex order, rig structure or bind space, validate correspondence before accepting it back into the canonical editor. Preserve the external file and explain which semantic or wardrobe capabilities cannot be restored automatically.
5. Check that external modifications do not silently destroy expression shapes, garment bindings, normals, units or material interpretation.
6. Test Current/Goal isolation and saved-history reproducibility after an accepted reimport.

**UNKNOWN — needs verification:** required external applications, supported edit categories, whether reimport is a first-release feature, acceptable round-trip tolerances, and the exact redistribution/modification rights of any commercial content. Continued external editing is confirmed; arbitrary topology-changing edits with automatic recovery of all original parameters are not assumed promised.

## 13. Open questions before implementation

1. Is the first release optimizing generic-human realism, personal likeness or measurement accuracy?
2. Which reference images define acceptance at full-body and portrait distance?
3. Which minimum physical phones and desktop GPUs must work, and how many avatars are visible together?
4. Is a commercial avatar API and recurring cost acceptable, or must creation work offline?
5. Must photo-derived identities retain the same granular shape controls and wardrobe as manually created avatars?
6. Given the confirmed requirement for in-app use and editable external exports, which external tools and edit categories must be supported? Must the first release reimport those edits into the same semantic editor?
7. Which sexes, ages, body ranges, hairstyles and garment categories are in the first accepted catalogue?
8. What character-art, rigging and WebGL staff, budget and deadline are available?

**Final recommendation:** adopt the separation of canonical customization, surface realism and identity capture. Evaluate the named projects as candidates using the actual files and explicit gates. The evidence supports a better architecture; it does not support a promise that one replacement GLB solves anatomy, garment fit, personal identity and photoreal rendering.
