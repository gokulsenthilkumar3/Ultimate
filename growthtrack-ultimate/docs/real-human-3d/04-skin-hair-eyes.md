# 04 · Skin, hair, eyes and the small things that read as human

This document specifies how the surface of the person is built: skin (with tone, tan and blood kept apart), eyes, hair
(scalp, brows, lashes, beard, body hair), nails, teeth and the wet surfaces, then the **detail ladder** that keeps every
region sharp as the camera approaches. All numbers marked *tested* come from the reference modules in
[`code/`](code/), which run with `node --test docs/real-human-3d/code/*.check.mjs` and are the contract the shader and
asset code must match. All constants marked *starting value* are calibrated in step S3 of the
[roadmap](08-roadmap.md) against reference photographs.

**2026-10-23 research correction:** [R2/I2](16-private-anatomy.md#review-findings-and-corrections) is the current full-human approval plan. Numerical reference tests below do not validate optical constants or clinical skin classes. Fitzpatrick phototype describes sun response, not a calibrated RGB/ITA identity; preset conversions remain artistic approximations. Standard glTF ORM is red occlusion, green roughness and blue metallic (zero for skin), not blue cavity. The proposed maps and scattering tiers are not all present in the runtime.

**2026-10-21 runtime checkpoint:** shared artistic skin swatches, regional roughness, retained authored maps, local bundled eyelid correction and deterministic blink/breath/gaze motion now run in the application. The idle reference tests import the runtime sampler. This is the partial appearance milestone recorded in [implementation progress](IMPLEMENTATION_PROGRESS.md), not completion of the texture, cornea, pupil, strand-hair or anatomical authoring specifications below.

**20-point checkpoint:** the live Skin tab now saves an independent clothing exposure history. Swim shorts, tank/shorts, tee/shorts and long sleeves/trousers protect skin using the wardrobe's neutral bands and blended rest-surface regions; no pattern remains the default. Only the tan term is masked, preserving base colour, undertone and flush. Current/Goal layers, reset, full/lite transitions, mobile controls and protected PNGs are covered by runtime tests. These are approximate neutral styles, not authored seam masks or calibrated sun-response predictions. The absolute optical model and asset-authoring requirements below remain targets.

## 1 · Why skin tone, tan and "melanin" must be separate data

At the original audit, the skin used **one photographic albedo that already contained a tan**, tinted by artistic skin presets
(`physicalSkinMaterial.js`): the file notes that the map's own median colour is linear `(0.776, 0.429, 0.27)` and tints
it by the ratio to that, clamped to `[0.02, 2.5]` per channel. That historical baseline had four consequences visible in the audit
screenshots:

1. A tan **cannot** be added or removed: it is baked into the one map.
2. Tone and tan cannot differ between body regions (a swimwear tan line, a pale area under the shorts, a tanned face on
   a pale body).
3. Freckles, veins and shading baked into the photo are tinted along with the tone, so a dark tone gets dark freckles
   and a light tone gets bleached ones.
4. Blood colour (blush, flush) cannot change without changing the tone.

The proposed renderer separates baseline pigmentation from exposure-related darkening, so base appearance and tan can be edited independently and masked by region. Its additive optical-density formula is an approximation, not a complete account of melanin chemistry, skin physiology or an individual's UV response. Regional appearance remains editable rather than inferred from ethnicity or a phototype label. See [DermNet's phototype definition](https://dermnetnz.org/topics/skin-phototype).

| Layer | What it is | Who sets it | Changes with | Region-dependent |
| --- | --- | --- | --- | --- |
| **Baseline pigmentation** | Approximate constitutive appearance | User-selected colour or calibrated colour input; phototype is separate metadata | Stable default, user editable | Editable regional multipliers, not universal fixed biological offsets |
| **Facultative melanin (tan)** | UV-induced darkening | A "sun tan" amount, plus "tan lines" | Weeks | Yes (exposure per region × clothing coverage) |
| **Haemoglobin** | Redness from blood | Baseline per region; "flush" and "burn" are transient | Seconds to days | Yes (cheeks, nose, ears, lips, knuckles) |
| **Carotene** | Yellowness | Undertone | Slowly | Mild |
| **Features** | Freckles, moles, scars, veins, stretch marks | A seed, counts and user decals | Rarely | Yes (freckles follow exposure) |
| **Surface condition** | Oil, sweat, dryness, goosebumps | Activity and environment | Seconds | Yes (T-zone oil) |

## 2 · The colour model (tested)

Here, **tested means numerical behavior of a reference approximation**. It does not mean measured optical validation, a melanin assay, a clinical phototype classifier or proof of a real person's skin colour. Source calibration and uncertainty remain open under R2-11/12.

`code/skin-layers.mjs`: a two-layer Beer-Lambert reflectance. Light crosses the epidermis (melanin and carotene absorb),
is scattered by the dermis (haemoglobin absorbs) and crosses the epidermis again:

```
albedo_c = R0_c · exp(−sHb · kHb_c · Hb) · exp(−2 · (sMel · kMel_c · (Mc + Mf) + sCar · kCar_c · Car))
```

`Mc` is constitutive melanin, `Mf` the tan, both feeding one term: that is how a tan adds to the same pigment instead
of being a second colour multiplied on top. `kMel` follows the published power law for melanin absorption (proportional to
wavelength⁻³·³³, which makes blue absorb about 2.5× and green about 1.4× as much as red); `kHb` absorbs mostly green and some
blue; `kCar` mostly blue. The scale constants are *starting values* chosen so that melanin 0 to 1.2 spans the full range
of the Individual Typology Angle (ITA = atan((L\* − 50) / b\*), the colorimetric measure of skin colour dermatologists use;
tested: ITA falls monotonically with melanin and spans about +73° (no melanin) to −66° (melanin 1.2)).

**One input per axis:**

| Input | Range | Meaning |
| --- | --- | --- |
| `tone` | Artistic preset or reference ITA −60° to +70° | Baseline appearance. The reference lookup assigns I 60°, II 48°, III 35°, IV 20°, V −5°, VI −45°; these are preset fixture values, not a one-to-one biological conversion from phototype |
| `undertone` | −1 cool/pink to +1 warm/golden | Artistic chromophore adjustment; may affect both chroma and lightness while preserving the stored baseline input |
| `tan` | 0 to 1 | Artistic exposure-related darkening; the reference response multipliers I 0.2, II 0.5, III 0.85, IV 1.0, V 0.75, VI 0.35 are uncalibrated fixture values and do not predict an individual's tanning or burning |
| `coverage` | 0 to 1 per region/texel | 0 under clothing that is always worn (tan line), 1 where skin is bare |
| `flush`, `burn` | 0 to 1 | Artistic transient-redness controls; the baseline input stays unchanged, while rendered lightness/chroma may also change. This is not physiological prediction |

**Region table** (`REGIONS`, 19 skin regions): each has `exposure` (how much sun it normally gets), `hb` (redness
multiplier) and `mel` (pigment multiplier). Examples: face exposure 1.0, hb 1.35; palm exposure 0.04, mel 0.45; lips hb
3.2, mel 0.45; glutes exposure 0.10; back of hand exposure 1.0. The same table is **baked into the mask textures** by a
build script, so the shader and the tested JavaScript read one source.

**Tested properties** (`code/skin-layers.check.mjs`, 9 tests):

- The approximation's ITA is monotonic in its melanin parameter; the preset lookup round-trips its assigned ITA values within 0.2°. This is not a clinical phototype validation.
- A tan darkens exposed skin for every type **and leaves the constitutive layer unchanged** (the separation).
- Skin with coverage 0 (swim trunks) is bit-identical with tan 0 and tan 1: tan lines work.
- In the reference fixture, palm darkening is strongly reduced and preset I darkens less than preset IV. These are model assumptions, not universal physiology.
- A flush or sunburn raises redness without changing the constitutive layer.
- Every region × type combination yields valid sRGB.
- The GLSL constants are **generated** from the module (`node code/skin-layers.mjs --glsl`), never copied by hand.

Swatches from the model (sRGB, *starting values*; "unexposed" is the inner arm, the baseline skin tone):

| Type | ITA | Unexposed | Forearm, no tan | Tan 50% | Tan 100% | Face, full flush |
| --- | --- | --- | --- | --- | --- | --- |
| I | 60° | `#e2b3a3` | `#e1b4a2` | `#dcae99` | `#d7a890` | `#df8b8e` |
| II | 48° | `#d7a68f` | `#d6a68d` | `#ca997a` | `#be8d69` | `#d3817c` |
| III | 35° | `#cb997c` | `#c99878` | `#b6845d` | `#a57248` | `#c67669` |
| IV | 20° | `#bc8965` | `#b88760` | `#a47247` | `#926033` | `#b66854` |
| V | −5° | `#9d693e` | `#976538` | `#8a582b` | `#7e4d21` | `#954d30` |
| VI | −45° | `#5a2d09` | `#532806` | `#4f2504` | `#4c2204` | `#521d04` |

Read these as a first fit, not a final palette: type I is slightly pink-orange and type VI is more saturated than real
dark skin (the single-power-law melanin spectrum is too steep at the red end). Step S3 fits the absorption constants to
measured reflectance. For comparison the app's existing display swatches are lighter and warmer (for example type I
`#ffe8d6`, type IV `#c78542`), chosen by eye rather than anchored to ITA.

**Tan lines** come from wardrobe, not painting: `coverage` is the share of each texel that the active garment set covers,
computed once per wardrobe change by rasterising the garment meshes into the skin's UV space (blurred by 1 to 2 mm so the
edge is soft), cached, and applied only when "tan lines" is on. The SWIMWEAR and UNDERWEAR presets define what was worn
"for the summer"; the default is off, so the person has an even tan.

**What stays in the textures:** separate intrinsic colour variation from lighting and from the chosen baseline tone. A relative-detail map may target linear mean 1.00 ± 0.02, but that does not guarantee unchanged perceived colour after nonuniform lighting, nonlinear tone mapping or roughness changes. Preserve meaningful regional/vascular variation; do not blindly remove it by blur division. Calibrate the complete render path using [the linear colour workflow](https://threejs.org/manual/pages/color-management.html). Masks pack as:

| Map | R | G | B | A |
| --- | --- | --- | --- | --- |
| `MASK_A` | Regional haemoglobin | Regional melanin multiplier | Sun exposure (from `REGIONS`) | Freckle/mole density |
| `MASK_B` | Vein map | Scar / stretch-mark / birthmark | Oil / sheen | Skin thickness (ears, nostrils, lids, fingertips are thin) |
| `ORM` | Ambient occlusion | Roughness | Metallic (zero for skin) | — |

Fine cavity modulation, if separately needed, requires an explicitly declared map role; it must not be written into glTF's metallic channel. The channel contract follows [Khronos export documentation](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst).

## 3 · Light transport by quality tier

The rows below are proposed techniques, not completed runtime features. Benchmark the complete viewer, skin mask boundaries and all pass allocations on named devices; published paper timings and a fixed hair-count reduction cannot establish this application's budget. Scattering must not bleed into eyes, hair, teeth or background.

| Tier | Skin shading | Ears, nostrils, fingers | Cost |
| --- | --- | --- | --- |
| LOW | Lambert with a wrap term and a red-shifted terminator; no micro-normal | None | Lowest |
| BALANCED | Pre-integrated-style curvature lookup (Penner and Borshukov 2011) with the layered albedo; micro-normal and Toksvig roughness | A thickness-based backlight term from `MASK_B.a` | Moderate |
| HIGH | Separable subsurface scattering (Jimenez et al. 2015) on the skin only, in two blur passes, plus everything in BALANCED | Same, plus shadow-map thickness | Highest; measured in step S4, and if p95 exceeds the 16.7 ms budget on the reference GPUs the HIGH strand count drops to 40,000 |

WebGPU's node materials are a later option; the WebGL path above is the plan of record because the app's renderer
selection already falls back to WebGL2.

Shader sketch (hooked into `MeshPhysicalMaterial` with `onBeforeCompile`, as the plan page's eye and skin materials
already are). The constants come from `skin-layers.mjs --glsl`:

```glsl
// -- generated: node docs/real-human-3d/code/skin-layers.mjs --glsl
const vec3 SKIN_K_MEL = vec3(1.0, 1.41169, 2.46905);
const vec3 SKIN_K_HB = vec3(0.05, 1.0, 0.5);
const vec3 SKIN_K_CAR = vec3(0.0, 0.1, 1.0);
const vec3 SKIN_R0 = vec3(0.88, 0.76, 0.62);
const float SKIN_S_MEL = 1.300;
const float SKIN_S_HB = 0.900;
const float SKIN_S_CAR = 0.250;
// -- end generated
const float TAN_MAX_MELANIN = 0.22;

uniform float uMelanin;        // melaninForIta(ITA) in JS, once per change
uniform float uTan, uTanCapacity, uFlush, uBurn, uUndertone, uCarotene, uBaseHb;
uniform sampler2D uMaskA, uMaskB, uDetail;

vec3 skinAlbedo(vec4 maskA, float coverage) {
  float exposure = maskA.b * coverage;
  float mel = uMelanin * maskA.g + TAN_MAX_MELANIN * uTan * uTanCapacity * exposure;
  float hb  = (uBaseHb * maskA.r + 0.5 * uFlush + 0.35 * uBurn) * (1.0 - 0.18 * uUndertone);
  float car = max(0.0, uCarotene * (1.0 + 0.8 * uUndertone));
  return SKIN_R0 * exp(-SKIN_S_HB * SKIN_K_HB * hb) * exp(-2.0 * (SKIN_S_MEL * SKIN_K_MEL * mel + SKIN_S_CAR * SKIN_K_CAR * car));
}
// diffuseColor.rgb = skinAlbedo(texture2D(uMaskA, vUv), coverage) * texture2D(uDetail, vUv).rgb;
```

This is the same formula as `skinColor()` with the region multipliers read from `MASK_A` instead of the `REGIONS` table, so
a golden-value test compares the two for every type and region before the shader ships.

## 4 · Eyes

**35-point runtime checkpoint:** the normal Face tab now edits seven named/custom iris colours, radial/collarette detail, a limbal-ring toggle, a saved seed and fixed or exposure-responsive cosmetic pupils. Iris frames derive from the loaded paired eye geometry and remain attached through morphs and gaze. Current/Goal values use the existing database JSON/profile paths. Reduced motion and captures settle immediately; capture guards restore the live transition on success or error. Existing eye maps and wet material are retained. The response follows the artistic renderer exposure, not a measured illuminance/medical model. Separate cornea/wetline geometry and the remaining authored specification below stay open; see [implementation progress](IMPLEMENTATION_PROGRESS.md) and [architecture](09-appearance-architecture.md#eye-rendering-and-capture).

The shipped eye is a textured sphere with a dark grey photo map. The plan page already replaced it with a procedural eye
(`plan-assets/src/eyes.mjs`); the plan ports that and adds what an eye needs to look alive.

| Part | Spec |
| --- | --- |
| Globe | Radius about 12 mm (the shipped mesh is 12.7 mm), scaled with the `eyeSize` morph; sclera warm off-white, reddening toward the corners and lids, faint vessels (`uVein`) |
| Iris | 11.7 mm across (range 10 to 13), radial fibres, a ragged collarette ring at about 43% radius, crypts, a dark limbal ring, round pupil; 7 named colours (Dark brown, Brown, Hazel, Amber, Green, Blue, Grey, as on the plan page) plus any hex |
| Pupil | About 3.8 mm in normal room light (roughly 2 mm in bright light to 6 or 7 mm in the dark); **contracts in bright light and dilates in dim light** from the scene's exposure (a visible sign of life), with a response of a few hundred milliseconds |
| Cornea | A transparent shell drawn as specular only, so windows and lamps show as wet catchlights; catchlight position follows the key light |
| Wet line | A thin meniscus strip along the lower lid and the caruncle drawn with a high-gloss, low-roughness material |
| Gaze | Eye joints with a look-at constraint (about 22° yaw and 15° pitch when looking at the viewer, as the plan page uses; up to 35° and 25° when following a pointer), **vergence** (the eyes converge when the target is near), micro-saccades from `idle-motion.mjs`, and "look at the camera" on a toggle (default on in presentation mode) |
| Lids | `eyeBlinkLeft/Right` close the lid fully; `eyeLook*` shapes move the lid with the globe so the lid never lags the eye; blinks follow `idle-motion.mjs` (about 17 a minute, closing in 80 ms and opening over 150 ms; tested) |

Why this matters: the eye region is where a viewer decides whether a face is alive. The most common "doll" cues are dry
eyes (no catchlight, no wet line), eyes that stare unmoving, and lids that do not close all the way.

## 5 · Hair

### 5.1 Scalp hair

The plan page's strand system is the foundation (`plan-assets/src/hairgrow.mjs` and `hair.mjs`): guide strands grown from
the scalp mask, clump interpolation, camera-facing ribbons with Kajiya-Kay diffuse and two shifted specular lobes (a
white surface highlight and a tinted one from inside the fibre), darker toward the roots, self-shadowed on the unlit side.
It uses a **dithered discard**, not alpha-to-coverage, because alpha-to-coverage writes partial alpha into a transparent
canvas and leaves pale halos in screenshots (found and fixed on the plan page).

| Tier | Hair |
| --- | --- |
| LOW | Cards only (the shipped approach), with a smooth hairline mask |
| BALANCED | About 20,000 strand ribbons (guide strands with clump interpolation) |
| HIGH | About 60,000 strands; a real scalp has roughly 100,000 to 150,000 fibres, and clumping makes 60,000 read as full |

Inputs: `hairStyle` (the store has `bald | short`; the plan adds the eight styles built on the plan page: bald, buzz, crop, medium, long, quiff,
curly, afro), `hairColor` (see 5.2), **`hairGreyPct`**, **`hairDensity`**, **`hairCurl`**. The hairline and nape come
from a growth mask with a soft falloff so the edge is made of single fibres, not a cut.

### 5.2 Hair colour (tested)

`code/hair-color.mjs`: colour comes from two pigments, eumelanin (brown to black) and pheomelanin (red to yellow), by the
same Beer-Lambert idea as skin. Eight named shades (black, dark brown, brown, light brown, auburn, red, blonde, platinum)
are defined as pigment amounts; the mean colour error against typical colours for those shades is under 8 CIELAB units
(tested; *starting values*). **Grey is a fraction of white fibres, not a mid-tone**: the strand shader picks per fibre with
probability `hairGreyPct`, which is how real greying looks (tested: the pigment colour is unchanged and only the mean
rises). A free colour picker sets a `dye` that overrides the pigment colour and is flagged "dyed" so the roots can grow
out in natural colour if a root-regrowth option is added later.

### 5.3 Eyebrows and eyelashes

- **Brows:** a strand set with a direction field (up and in at the head, along the arch, down and out at the tail),
  density thicker at the head, length 5 to 10 mm, colour from the hair colour with a `browTone` offset (many fair-haired
  people have visibly darker or lighter brows than scalp hair).
- **Lashes:** about 100 to 150 upper and 50 to 75 lower, rooted on the lid-edge loop, curved away from the globe, of
  unequal length (the middle longest), with the lid shadow cast on the eye. Cards remain for LOW.

### 5.4 Facial hair and body hair

| Part | Growth area | Strand length | Notes |
| --- | --- | --- | --- |
| Stubble | Beard region mask | 0.5 to 2 mm | Also a darkening mask so it reads at distance |
| Beard, moustache | Beard region mask | 5 to 80 mm | Growth direction differs by area; colour often lighter or greyer than the scalp |
| Chest, abdomen | Torso mask × `bodyHairDensity` | 4 to 15 mm | Density gradient, not uniform |
| Arms, legs | Limb masks | 3 to 12 mm | Thicker on forearms and lower legs |
| Hands, feet | Back of hand, toes | 2 to 6 mm | None on palms or soles |
| Underarm | Axilla mask | 20 to 60 mm | Skinned to upper arm and spine joints |

Rendering: the existing `bodyHairDensity` slider (0 to 1) is kept as the global multiplier. HIGH draws strands within
1.2 m of the camera (capped at about 40,000); BALANCED draws strands within 0.6 m and a normal-map fuzz beyond; LOW draws
none. Body hair colour is the hair colour lightened by 10 to 30% by default.

## 6 · Nails, teeth and wet surfaces

| Part | Material |
| --- | --- |
| **Fingernails and toenails** | `MeshPhysicalMaterial` with `clearcoat` (a glossy plate over a coloured bed); bed colour from the **same haemoglobin layer** as the fingertip, so a flush reddens nail beds too; a pale lunula mask at the base; a cuticle fold in the geometry; a translucent free edge (`thickness` and a white tint beyond the bed); optional polish (colour + higher clearcoat). Own 2048² atlas (about 284 texels/cm) so nails stay sharp at 0.06 to 0.09 m |
| **Teeth** | Off-white enamel (never pure white) with a slight blue-grey translucent edge, yellower toward the gum line, a few per-tooth variation values, soft ambient occlusion in the gaps; 32 adult teeth (28 without wisdom teeth); a typical smile shows about 6 to 10 of them |
| **Gums, tongue, mouth** | Pink subsurface material, a rough textured tongue, a dark cavity cap with strong ambient occlusion; wet (low roughness, clearcoat) |
| **Lips** | Same skin material with high `hb`, low `mel`, a lip-line micro-normal, and a wet inner edge mask |
| **Wet film** | A mask on the eyes, inner lip, nostrils and mouth interior lowers roughness and adds a thin specular layer; a global `sweat` parameter (0 to 1) lowers roughness elsewhere, slightly darkens albedo, and adds a bump of droplets |

## 7 · Skin features, seeded

**30-point runtime checkpoint:** editable freckles now ship as integer-seeded, jittered rest-space projections blended with skin normals/exposure. Density, radius, contrast and seed are saved for Current/Goal and included in quality changes and protected exports. Named/custom hair shades, seeded greying and thinning also operate on the existing hair cards with matching shadows and scalp coverage. These are partial A2/A6 runtime slices; the authored Poisson-disc/mask design below, new strand geometry, other marks and calibrated optical layers remain open. See [implementation progress](IMPLEMENTATION_PROGRESS.md) and [architecture](09-appearance-architecture.md).

Moles, freckles, scars and stretch marks are generated deterministically from a per-person seed so they never change
between sessions or devices.

- **Freckles:** Poisson-disc placement in UV space, density from `MASK_A.a`, weighted by exposure and by lightness
  (types I to III), size 0.5 to 3 mm; darkness scales with the tan.
- **Moles:** a count (default 12 to 40 across the body), radius 1 to 5 mm, flat or raised (normal bump), darker than the
  surrounding skin; none on palms, soles, lips, nails.
- **Scars and stretch marks:** user-defined decals in UV space (position, length, angle, age), rendered through `MASK_B.g`
  as a lighter, smoother, slightly raised patch.
- **Veins:** `MASK_B.r`, strongest on forearms, hands, feet and, at low body fat, the abdomen and upper arm; a
  blue-green absorber layered under the skin colour so they read through it; scaled by lean-ness and pale tone.
- **Asymmetry:** each feature set is generated separately for left and right, so the person is not a mirror image.

## 8 · The detail ladder: zoom in without breaking pixels

Three layers keep the surface sharp at any distance. The camera's closest distance is computed from them, region by
region, so the user can zoom as far as the data actually supports and no further (`code/texel-density.mjs`, tested):

| Layer | Carries | Density | Limit |
| --- | --- | --- | --- |
| **Base tile** (HEAD 94, HANDS 50, FEET 38, BODY 31 texels/cm) | Colour variation, large features, regional masks | Per region (see [03](03-anatomy-spec.md)) | May be stretched to 2.0 screen pixels per texel, because skin colour varies slowly |
| **Micro tile** (shared, 256 texels/cm, repeats every 2 cm) | Pores, fine creases, roughness variation, a hexagonal skin-lines pattern | World-scale mapped with a per-vertex `microScale` baked from UV density; hex-tiled to hide repetition (Mikkelsen) | Must not be stretched beyond 1.25 px per texel |
| **Geometry** | Silhouette, nostrils, lids, finger pads | 2.5 to 3 mm edges on the face, 1.5 mm on hands | Not magnified by the camera |

Closest camera distance per region at three common views (30° field of view; `closestDistance()`; "today" uses the shipped
single 2048² map with no micro layer):

| Region | Planned base density | Small canvas, 580 px, 1× | Laptop, 900 px, 2× | Large display, 1440 px, 2× | **Today** (laptop 2×) |
| --- | --- | --- | --- | --- | --- |
| Head | 94 /cm | 0.06 m | **0.18 m** | 0.29 m | 0.73 m |
| Hand | 50 /cm | 0.11 m | **0.34 m** | 0.54 m | 1.63 m |
| Foot | 38 /cm | 0.14 m | **0.44 m** | 0.71 m | 1.77 m |
| Body | 31 /cm | 0.17 m | **0.54 m** | 0.86 m | 1.40 m |
| Nail | 284 /cm | 0.02 m | 0.06 m | 0.09 m | not present |

On a high-density laptop the head can be approached to 0.18 m instead of 0.73 m, the hand to 0.34 m instead of 1.63 m.
That is the actual meaning of "zoom without the pixels breaking": the plan raises the data until the limits in the
viewer's zoom are not in the way, and the viewer sets its per-region `minDistance` from this table instead of from a ratio
of the framing distance (`CameraRig.jsx` today uses `base × 0.35`).

Supporting rules:

- **Mip-mapped KTX2 textures, anisotropic filtering 4 (BALANCED) to 16 (HIGH).** Normal maps use Toksvig roughness so a
  minified micro-normal turns into roughness instead of shimmering.
- **Never upscale a tile in the pipeline:** the bake script fails if a tile's measured density is under `TILE_MIN_TEXELS`
  (tested in `anatomy-spec.check.mjs`).
- **Distance blending:** micro detail fades in as the camera gets close and its contrast fades out with distance, so
  the full-body view stays clean.
- **A visual test per region**, taken by the viewer probe at its closest distance and compared with a stored reference, so
  a texture or camera change that reintroduces blocks fails CI (see [08](08-roadmap.md), gate G3).

## 9 · Wear: real garments, not shaded copies of the body

Today a garment is a shell cloned from the body and offset along its normals, coloured by a coverage attribute
(`garmentGeometry.js`, `WardrobeShader.js`). It has no thickness at the hem, no seams, and cannot fold differently from the
skin. Replace it with garment meshes.

| Preset (store) | Garment parts | Fabric | Notes |
| --- | --- | --- | --- |
| GYM | Shorts, tank top or tee, trainers | Jersey (matte, fine weave normal) | Seams along the side; waistband band |
| CASUAL | Tee, jeans or chinos, sneakers | Cotton and denim (twill normal) | Cuff turn-ups; jeans have a faint fade mask |
| FORMAL | Shirt, trousers, jacket, shoes | Wool, cotton poplin, leather | Collar, cuffs and lapel are modelled |
| SWIMWEAR | Trunks (and optional top) | Stretch nylon (sheen, fine micro-weave) | Defines tan lines when enabled |
| UNDERWEAR | Briefs or a sports bra | Cotton jersey | Waistband and leg bands modelled |
| ANATOMICAL | None (adult-gated, covered by the policy in [03](03-anatomy-spec.md)) | — | — |
| BODY_COMP | None (a data overlay on the skin) | — | Keep as an overlay with a colour key |

Rules: garments are skinned to the same 79-joint skeleton with proxy weights copied from the body (so fingers, elbows and
knees fold the cloth too); each has a 1K to 2K texture pair; fold shading comes from pose-driven normals and pose
correctives first, with cloth simulation a stretch goal; each garment is a separate GLB so a wardrobe change loads one
file. Footwear sets the floor contact (the sole, not the skin), which is what stops feet floating or sinking.

## 10 · How this ports into the app

| Change | Where | Replaces |
| --- | --- | --- |
| Layered skin material | `src/components/body3d/physicalSkinMaterial.js`, wrapped by `createSkinMaterial` in `UberShader.js`; called from `HumanoidClone.jsx` | The tinted single albedo and `FITZPATRICK_TABLE` base colours (kept as the LOW-tier fallback) |
| New inputs (`tan`, `tanLines`, `undertone`, `flush`, `rednessBase`, …) | `use3DStore.js` appearance typedef and `ProfileEditor.jsx`; UI in [06](06-ui-for-metrics.md) | `skinTone` alone |
| Strand hair, brows, lashes, body hair | Port `plan-assets/src/hairgrow.mjs`, `hair.mjs` into `src/components/morphEngine/hair/`; `featureMaterials.js` keeps the LOW-tier cards | Hair-card meshes in the GLB |
| Eye material and gaze | Port `plan-assets/src/eyes.mjs`, `eyelayout.mjs`; add eye joints to the GLB ([07](07-asset-pipeline-and-glb-spec.md)) | `GrowthTrackEyes` photo texture, browser-side eyeball rotation |
| Idle motion | `idle-motion.mjs` as `src/components/morphEngine/idleMotion.js`, driven from `useFrame` | Nothing (the figure is currently static) |
| Garment meshes | Wardrobe loader beside `useModelLoader.js` | `garmentGeometry.js` shell |

Every row is one step in the [roadmap](08-roadmap.md), each with a gate that can fail.
