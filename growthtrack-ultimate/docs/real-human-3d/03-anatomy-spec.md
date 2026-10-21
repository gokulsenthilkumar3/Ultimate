# 03 · Anatomy specification: every part a person has

This is the part-by-part answer to "what does a real human have, and what must the 3D person reproduce so nobody
thinks it is a model?". It covers the face (hair, eyebrows, eyes, eyelids, nose, ears, lips, teeth), the neck, torso
(chest, core, waist, hips, glutes), arms (forearm, wrist), hands (fingers, nails), legs (thigh, knee, calf, ankle),
feet (toes, toenails), body hair, skin, wear, the layers under the skin, and the adult-gated external anatomy.

The part list is **data, not prose**: [`code/anatomy-spec.mjs`](code/anatomy-spec.mjs) is the single source, the
sections between the `begin`/`end` markers below are generated from it
(`node docs/real-human-3d/code/render-anatomy.mjs --write`), and
[`code/anatomy-spec.check.mjs`](code/anatomy-spec.check.mjs) fails if the spec drifts from the repository (a metric
that does not exist, a wardrobe preset with no plan, a part the GLB audit flagged that has no plan, a joint that is not
in the rig, a quality tier that no longer fits its texture-memory budget).

## Your list, mapped to the spec

<!-- begin:request-index -->
| You named | Covered by (and what the shipped model has) |
| --- | --- |
| Head | Cranium and scalp (part of the skin); Forehead and brow ridge (part of the skin); Cheeks and midface (part of the skin); Jaw and chin (absent) |
| Hair | Scalp hair (separate mesh); Eyebrows (separate mesh); Eyelashes (separate mesh); Beard, moustache and stubble (absent); Body hair (chest, abdomen, arms, legs, hands, feet) (absent); Underarm hair (absent) |
| Eyebrows | Eyebrows (separate mesh) |
| Eyes, eye colour | Eyeballs (sclera, iris, pupil, cornea) (separate mesh); Eye bones, gaze and pupil response (absent); Caruncle, tear duct and tear line (absent) |
| Eyelids | Eyelids and lash line (part of the skin) |
| Ear | Ears (part of the skin) |
| Nose | Nose (part of the skin) |
| Mouth, lips, teeth | Lips and mouth corners (part of the skin); Teeth, gums, tongue and mouth interior (absent) |
| Neck | Neck (part of the skin) |
| Shoulders | Shoulders and clavicles (part of the skin) |
| Arms | Upper arm (partial); Elbow (part of the skin) |
| Forearms | Forearm (partial); Wrist (partial) |
| Hand, fingers, nails | Palm (partial); Back of the hand (partial); Fingers (thumb to little finger) (partial); Fingernails (absent) |
| Waist and chest | Chest and pectorals (part of the skin); Waist, hips and pelvis (part of the skin) |
| Core | Core: abdomen, navel and obliques (part of the skin); Back (part of the skin) |
| Hips | Waist, hips and pelvis (part of the skin) |
| Curls (glutes; hair curl is in scalp hair) | Glutes (part of the skin); Scalp hair (separate mesh) |
| Thigh | Thigh (part of the skin); Knee (part of the skin) |
| Calf | Calf and shin (part of the skin); Ankle (part of the skin) |
| Foot, toes, toenails | Foot: arch, sole and heel (partial); Toes (partial); Toenails (absent) |
| Body hair | Body hair (chest, abdomen, arms, legs, hands, feet) (absent); Underarm hair (absent); Beard, moustache and stubble (absent) |
| Skin tone, tanning, melanin | Skin tone (constitutive melanin) (partial); Tan and tan lines (facultative melanin) (absent); Blood flow: blush, flush, veins (absent); Freckles, moles, scars, stretch marks, birthmarks (absent); Micro surface: pores, creases, sheen, sweat (partial) |
| Wear | Underwear (absent); Swimwear (absent); Gym wear (absent); Casual wear (absent); Formal wear (absent); Body-composition overlay (partial); Shoes and socks (absent) |
| Under the skin | Skeleton (absent); Muscles (absent); Fat layer (absent); Organs (absent) |
| The private anatomy | Adult external anatomy (adult-gated) (separate mesh) |
<!-- end:request-index -->

## What makes a person read as a person

A model reads as a model when every part is individually fine and the whole is too clean. The same ten properties
show up in every region below, so they are rules, not decoration:

1. **Asymmetry.** Left and right differ by a little in every person (eye height, nostril shape, arm girth). The
   metrics already have left and right entries; the face and skin features must use them too.
2. **Softness at the silhouette.** Edges of the body are slightly soft because skin is translucent and fuzzy
   with fine hair. A hard, perfectly smooth edge is a tell.
3. **Translucency where skin is thin.** Ears, nostrils, eyelids, finger webs and fingertips glow red when backlit.
4. **Wetness where it is wet.** Eyes, the inner lip, the tear line and the mouth interior have a thin glossy film.
   Dry matte eyes are the single strongest "doll" cue.
5. **Different skin in different places.** Palms, soles, lips, knuckles, elbows, areolae and the face do not match
   the forearm. Regional pigment, redness, thickness and roughness are part of the model, not a global tint.
6. **Imperfection with a seed.** Moles, freckles, a scar, uneven brows, a slightly misaligned tooth; placed from a
   per-person seed so they are stable between sessions.
7. **Detail at every distance.** Pores and creases that arrive as the camera approaches, so zooming in never shows
   blocky texels (see [04](04-skin-hair-eyes.md), the detail ladder).
8. **Mass that moves.** Flesh deforms with pose: the thigh flattens on a chair, the biceps bulges, the knee folds.
   That needs correctives and twist joints, not just bones.
9. **Gaze and idle motion.** Eyes that find the camera, blink, saccade, and a body that breathes. A frozen figure
   looks like a statue however good the skin is.
10. **Consistent lighting response.** The skin, eyes, hair, nails and teeth all use one lighting model, so they look
    like one object in one room.

## Texture tiles and quality-tier memory

Skin uses one material with several image sets ("tiles"), chosen per vertex, so each region gets the density it needs
without one enormous atlas. The densities below are computed from the audited region areas, not typed.

<!-- begin:tiles -->
| Tile | Size | Holds | Texels/cm (full) | MiB (full) | Texels/cm (half) | MiB (half) |
| --- | --- | --- | --- | --- | --- | --- |
| HEAD | 4096² | face, ears, scalp and neck above the collar | 93.7 | 53.3 | 46.8 | 13.3 |
| BODY | 4096² | torso, arms, legs and the private-anatomy skin | 31.2 | 53.3 | 15.6 | 13.3 |
| HANDS | 2048² | both hands | 49.7 | 13.3 | 24.8 | 3.3 |
| FEET | 2048² | both feet and ankles | 37.9 | 13.3 | 19.0 | 3.3 |
| NAILS | 2048² | all ten fingernails and ten toenails in one atlas (albedo and normal only) | 283.6 | 8.0 | 141.8 | 2.0 |
| MICRO | 512² | tiling pore/crease detail, shared by every skin region and blended in by distance | 256.0 | 0.8 | 128.0 | 0.2 |
<!-- end:tiles -->

Memory per quality tier (see [05](05-viewer-and-interaction-spec.md) for the governor that moves between them):

<!-- begin:tier-memory -->
| Tier | Tiles at half size | Texture memory (MiB) | Budget (MiB) |
| --- | --- | --- | --- |
| LOW | HEAD, BODY, HANDS, FEET, NAILS | 36.2 | 40 |
| BALANCED | BODY, FEET | 92.2 | 100 |
| HIGH | none | 142.2 | 150 |
<!-- end:tier-memory -->

For scale: the shipped model's head is **23 texels/cm** and each hand about **10 texels/cm** (measured, see
[01](01-findings.md)). The plan gives the head about 94 and the hand about 50, then adds a shared micro-detail tile at
256 texels/cm so the surface stays sharp when the camera is close.

## Skeleton (GLB v3)

The shipped rig has **20 joints** and none of: fingers, toes, jaw, eyes, twist. v3 adds all of them and stays well under
the joint budget (4 influences per vertex, as glTF allows).

<!-- begin:rig -->
| Group | Joints | New | Names |
| --- | --- | --- | --- |
| core | 7 | 1 | Hips, Spine, Spine1, Spine2, Neck, Neck1, Head |
| face | 6 | 6 | Jaw, LeftEye, RightEye, Tongue0, Tongue1, Tongue2 |
| arms | 12 | 4 | LeftShoulder, RightShoulder, LeftUpperArm, RightUpperArm, … (12) |
| fingers | 30 | 30 | LeftThumb1, RightThumb1, LeftThumb2, RightThumb2, … (30) |
| legs | 12 | 6 | LeftUpLeg, RightUpLeg, LeftUpLegTwist, RightUpLegTwist, … (12) |
| toes | 12 | 12 | LeftToeBig1, RightToeBig1, LeftToeBig2, RightToeBig2, … (12) |
| **Total** | **79** | **59** | shipped rig: 20 joints |
<!-- end:rig -->

## Face shapes

Fifty-two ARKit-compatible blendshapes are the standard vocabulary for facial animation, supported by most
capture tools and most open-source face rigs, so adopting the same names makes retargeting and future face tracking
cheap. They are authored as morph targets on the **head mesh only**. The shipped facial shapes cannot be reused: `blink`
moves 2,940 head vertices (the whole face, so a lid cannot close on its own), and `smile` and `jaw_open` move
vertices outside the face (the largest group of `jaw_open`'s 576 vertices is in the upper arm), which is why the plan
page generated its own facial shapes.

<!-- begin:blendshapes -->
| Region | Count | Shapes |
| --- | --- | --- |
| brow | 5 | browDownLeft, browDownRight, browInnerUp, browOuterUpLeft, browOuterUpRight |
| cheek | 3 | cheekPuff, cheekSquintLeft, cheekSquintRight |
| eye | 14 | eyeBlinkLeft, eyeBlinkRight, eyeLookDownLeft, eyeLookDownRight, eyeLookInLeft, eyeLookInRight, eyeLookOutLeft, eyeLookOutRight, eyeLookUpLeft, eyeLookUpRight, eyeSquintLeft, eyeSquintRight, eyeWideLeft, eyeWideRight |
| jaw | 4 | jawForward, jawLeft, jawOpen, jawRight |
| mouth | 23 | mouthClose, mouthDimpleLeft, mouthDimpleRight, mouthFrownLeft, mouthFrownRight, mouthFunnel, mouthLeft, mouthLowerDownLeft, mouthLowerDownRight, mouthPressLeft, mouthPressRight, mouthPucker, mouthRight, mouthRollLower, mouthRollUpper, mouthShrugLower, mouthShrugUpper, mouthSmileLeft, mouthSmileRight, mouthStretchLeft, mouthStretchRight, mouthUpperUpLeft, mouthUpperUpRight |
| nose | 2 | noseSneerLeft, noseSneerRight |
| tongue | 1 | tongueOut |
| **Total** | **52** | |
<!-- end:blendshapes -->

The existing 58 proportion morphs stay, with three rules from the audit:

1. **Each morph declares its region of influence** in the asset (`extras.growthtrack.morphRegions`), and the validator
   ([07](07-asset-pipeline-and-glb-spec.md)) checks the moved vertices against it. Broad shapes are fine when declared
   (`torso_length` moves 10,559 vertices by up to 103 mm and `leg_length` by up to 94 mm by design; `clavicle_width` and
   `shoulder_slope` carry the arms and hands with the shoulder).
2. **The skeleton follows the shape.** A morph that moves a joint's surroundings also carries that joint's offset
   (`extras.growthtrack.jointOffsets`), so a rotated shoulder, hip or knee pivots at the right place for every body shape.
   The shipped file has no such data, which is why the plan adds a pose-stability test.
3. **One cause, one shape.** A pelvic-width measurement drives a bone-width shape and a hip-circumference measurement drives a
   soft-tissue shape, never one shape for both.

## Adult external anatomy: policy that does not change

The existing mesh (`GrowthTrackPrivateAnatomy`, 4,803 vertices) and its policy stay exactly as defined in
[`ANATOMY_ASSET_PLAN.md`](../ANATOMY_ASSET_PLAN.md), and the plan adds nothing that weakens them:

- **Adult gate:** shown only when a saved date of birth shows 18 or older (`anatomyPolicy.js`); age is never inferred.
- **Off by default, per session,** and only when the loaded asset declares a matching body base.
- **Never in a capture:** screenshots, shares, presentation snapshots, exports and the high-resolution still in
  [05](05-viewer-and-interaction-spec.md) force the cover on (`captureRedacted`); `mustRedact()` in
  [`code/share-export.mjs`](code/share-export.mjs) encodes the rule and is unit-tested.
- **Shared pipeline, not a separate look.** What the plan changes is that the region stops looking pasted on: it uses
  the same skin tone, tan, regional-pigment offset and body-hair field as the surrounding skin, so the transition has no
  seam. Authoring remains contracted, provenance-tracked and CC0 or assigned (see
  [07](07-asset-pipeline-and-glb-spec.md)).

## Part by part

<!-- begin:anatomy -->
| Part | Group | Today | Tile (texels/cm) | Joints (**new** in bold) |
| --- | --- | --- | --- | --- |
| Cranium and scalp | Head and face | part of the skin | HEAD (94) | Head |
| Forehead and brow ridge | Head and face | part of the skin | HEAD (94) | Head |
| Cheeks and midface | Head and face | part of the skin | HEAD (94) | Head |
| Jaw and chin | Head and face | absent | HEAD (94) | **Jaw** |
| Nose | Head and face | part of the skin | HEAD (94) | Head |
| Ears | Head and face | part of the skin | HEAD (94) | Head |
| Eyeballs (sclera, iris, pupil, cornea) | Eyes | separate mesh | — | — |
| Eye bones, gaze and pupil response | Eyes | absent | — | **LeftEye**, **RightEye** |
| Eyelids and lash line | Eyes | part of the skin | HEAD (94) | Head |
| Caruncle, tear duct and tear line | Eyes | absent | HEAD (94) | — |
| Eyelashes | Hair | separate mesh | — | — |
| Eyebrows | Hair | separate mesh | — | — |
| Lips and mouth corners | Mouth | part of the skin | HEAD (94) | **Jaw** |
| Teeth, gums, tongue and mouth interior | Mouth | absent | HEAD (94) | **Tongue0**, **Tongue1**, **Tongue2** |
| Neck | Neck | part of the skin | HEAD (94) | Neck, **Neck1** |
| Shoulders and clavicles | Torso | part of the skin | BODY (31) | LeftShoulder, RightShoulder |
| Chest and pectorals | Torso | part of the skin | BODY (31) | Spine2 |
| Back | Torso | part of the skin | BODY (31) | Spine, Spine1, Spine2 |
| Core: abdomen, navel and obliques | Torso | part of the skin | BODY (31) | Spine, Spine1 |
| Waist, hips and pelvis | Torso | part of the skin | BODY (31) | Hips |
| Glutes | Torso | part of the skin | BODY (31) | Hips, LeftUpLeg, RightUpLeg |
| Upper arm | Arms | partial | BODY (31) | LeftUpperArm, **LeftUpperArmTwist**, RightUpperArm, **RightUpperArmTwist** |
| Elbow | Arms | part of the skin | BODY (31) | LeftForeArm, RightForeArm |
| Forearm | Arms | partial | BODY (31) | **LeftForeArmTwist**, **RightForeArmTwist** |
| Wrist | Arms | partial | BODY (31) | LeftHand, RightHand |
| Palm | Hands | partial | HANDS (50) | — |
| Back of the hand | Hands | partial | HANDS (50) | — |
| Fingers (thumb to little finger) | Hands | partial | HANDS (50) | **30 fingers** |
| Fingernails | Hands | absent | NAILS (284) | — |
| Thigh | Legs | part of the skin | BODY (31) | LeftUpLeg, **LeftUpLegTwist**, RightUpLeg, **RightUpLegTwist** |
| Knee | Legs | part of the skin | BODY (31) | LeftLeg, RightLeg |
| Calf and shin | Legs | part of the skin | BODY (31) | **LeftLegTwist**, **RightLegTwist** |
| Ankle | Legs | part of the skin | FEET (38) | LeftFoot, RightFoot |
| Foot: arch, sole and heel | Feet | partial | FEET (38) | **LeftToeBase**, **RightToeBase** |
| Toes | Feet | partial | FEET (38) | **12 toes** |
| Toenails | Feet | absent | NAILS (284) | — |
| Scalp hair | Hair | separate mesh | — | — |
| Beard, moustache and stubble | Hair | absent | — | — |
| Body hair (chest, abdomen, arms, legs, hands, feet) | Hair | absent | — | — |
| Underarm hair | Hair | absent | — | — |
| Skin tone (constitutive melanin) | Skin | partial | — | — |
| Tan and tan lines (facultative melanin) | Skin | absent | — | — |
| Blood flow: blush, flush, veins | Skin | absent | — | — |
| Freckles, moles, scars, stretch marks, birthmarks | Skin | absent | — | — |
| Micro surface: pores, creases, sheen, sweat | Skin | partial | MICRO (256) | — |
| Underwear | Wear | absent | — | — |
| Swimwear | Wear | absent | — | — |
| Gym wear | Wear | absent | — | — |
| Casual wear | Wear | absent | — | — |
| Formal wear | Wear | absent | — | — |
| Body-composition overlay | Wear | partial | — | — |
| Shoes and socks | Wear | absent | — | — |
| Skeleton | Underlying anatomy | absent | — | — |
| Muscles | Underlying anatomy | absent | — | — |
| Fat layer | Underlying anatomy | absent | — | — |
| Organs | Underlying anatomy | absent | — | — |
| Adult external anatomy (adult-gated) | Adult external anatomy | separate mesh | BODY (31) | Hips, LeftUpLeg, RightUpLeg |

### Head and face

#### Cranium and scalp
`cranium_scalp` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 3 mm · viewer region: head

- **What a real one is like:** A skull-shaped head with a visible temple hollow, occipital bulge and a scalp that is a different skin from the face (thicker, hair-bearing, pale where covered).
- **How the plan builds it:** Sculpt on an anatomical skull reference; the scalp is the hair-root surface (skin tile HEAD, region mask "scalp") that the strand system grows from.
- **Driven by:** `faceWidth`, `faceHeight`, `headCirc`. **New inputs:** —.

#### Forehead and brow ridge
`forehead_brow` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 2.5 mm · viewer region: head

- **What a real one is like:** Brow ridge casting a soft shadow into the orbit, a frontal bossing that varies by person, and faint horizontal creases that deepen with raised brows.
- **How the plan builds it:** Shapes browInnerUp, browOuterUpLeft/Right, browDownLeft/Right as FACS-style morph targets; wrinkle normal maps blended by those weights.
- **Driven by:** `faceHeight`. **New inputs:** —.

#### Cheeks and midface
`cheeks_midface` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 2.5 mm · viewer region: head

- **What a real one is like:** Malar fat pad, zygomatic prominence, nasolabial fold and, in many people, a darker infra-orbital shadow; cheeks blush first.
- **How the plan builds it:** Morphs cheekPuff, cheekSquintLeft/Right plus a cheekFullness body-fat-linked corrective; blood-flow mask raised over the cheeks.
- **Driven by:** `faceWidth`. **New inputs:** `cheekFullness`.

#### Jaw and chin
`jaw_chin` · today: **absent** · tile: HEAD, 93.7 texels/cm · mesh edge 2.5 mm · viewer region: head

- **What a real one is like:** A mandible that hinges, drops and slides, with a jawline whose definition depends on body fat and masseter size.
- **How the plan builds it:** Add a Jaw joint (the audit found none), jawOpen/jawLeft/jawRight/jawForward shapes, and a chin-dimple option. Existing jaw_width, chin_projection morphs stay as proportion shapes.
- **Driven by:** `jawWidth`, `chinProjection`. **New inputs:** —.

#### Nose
`nose` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 1.5 mm · viewer region: head

- **What a real one is like:** Bridge, dorsum, tip, alar wings and columella; nostrils that are real openings with depth and a dark interior; thin skin that shows blood at the tip and oil at the sides.
- **How the plan builds it:** Model nostril openings with 8 to 10 mm of interior to a dark cap; noseSneerLeft/Right and nostril flare shapes; thin-skin thickness mask and an oil-sheen mask.
- **Driven by:** `noseLength`, `noseWidth`, `noseTipSize`, `noseBridgeWidth`. **New inputs:** —.

#### Ears
`ears` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 1.5 mm · viewer region: head

- **What a real one is like:** Helix, antihelix, tragus, antitragus, concha and lobe, thin enough that backlight glows red through them, often a little redder than the face.
- **How the plan builds it:** Sculpt true ear topology (not a flap); transmission driven by a thickness map; separate pink bias in the blood-flow mask; optional fine ear hair.
- **Driven by:** `earLength`, `earWidth`, `earProminence`. **New inputs:** `earLobeType`.

### Eyes

#### Eyeballs (sclera, iris, pupil, cornea)
`eyeballs` · today: **separate mesh** · tile: none · mesh edge 0.8 mm · viewer region: head

- **What a real one is like:** A 24 mm globe with an 11.7 mm iris (varying 10 to 13 mm), radial fibres, a collarette, a dark limbal ring, a clear bulging cornea with wet catchlights, and faintly veined off-white sclera.
- **How the plan builds it:** Keep the procedural iris/cornea shader from the plan page (plan-assets/src/eyes.mjs); iris colour, iris size and pupil size become inputs.
- **Driven by:** `eyeSpacing`, `eyeSize`, `eyeColor` (appearance). **New inputs:** `irisSizeMm`, `pupilSizeMm`, `eyeScleraTone`.

#### Eye bones, gaze and pupil response
`eye_gaze` · today: **absent** · tile: none · viewer region: head

- **What a real one is like:** Two eyes that converge on what they look at, flick in small saccades, drift when idle, and whose pupils contract in bright light; eyes that look at the camera are what makes a face feel present.
- **How the plan builds it:** Eye joints with a look-at constraint (limits about 35 degrees yaw and 25 pitch), vergence from the target distance, micro-saccades on a timer, pupil radius from scene brightness, and eyeLook* shapes so lids follow the globe. The audit found no eye joints: gaze is faked by rotating the eyeball meshes in the browser.
- **Driven by:** —. **New inputs:** `gazeFollowsCamera`.

#### Eyelids and lash line
`eyelids` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 0.8 mm · viewer region: head

- **What a real one is like:** Upper and lower lids with thickness, a crease, a wet inner edge and a tarsal plate; lids follow the eyeball when it looks up or down and close fully with a seal.
- **How the plan builds it:** Dedicated lid loops with their own morphs eyeBlinkLeft/Right, eyeSquint, eyeWide, and eyeLook* corrective shapes that move the lid with the globe. Replaces the whole-face "blink" shape (audit: it moves 2940 vertices).
- **Driven by:** —. **New inputs:** `lidCrease`, `eyeOpenness`.

#### Caruncle, tear duct and tear line
`eye_corners` · today: **absent** · tile: HEAD, 93.7 texels/cm · mesh edge 0.6 mm · viewer region: head

- **What a real one is like:** A pink caruncle in the inner corner, a fold (plica), a wet meniscus along the lower lid, and shine on all of it.
- **How the plan builds it:** Small separate meshes with a wet-surface material; a meniscus strip along the lower lid.
- **Driven by:** —. **New inputs:** —.

### Mouth

#### Lips and mouth corners
`lips` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 1.2 mm · viewer region: head

- **What a real one is like:** A defined vermilion border, cupid's bow, philtrum columns, lip lines (a fingerprint-like micro texture), wet inner edge, and a seal line that parts and rolls.
- **How the plan builds it:** Mouth shapes mouthClose, mouthPucker, mouthFunnel, mouthSmileLeft/Right, mouthFrownLeft/Right, mouthStretch*, mouthRoll*, mouthShrug*, mouthPress*, mouthDimple*, mouthUpperUp*, mouthLowerDown*, mouthLeft/Right; lip-line normal tile; per-person lip tone.
- **Driven by:** `lipFullness`. **New inputs:** `lipTone`.

#### Teeth, gums, tongue and mouth interior
`teeth_gums_tongue` · today: **absent** · tile: HEAD, 93.7 texels/cm · mesh edge 0.8 mm · viewer region: head

- **What a real one is like:** 32 adult teeth with different shapes, a slightly translucent enamel edge, pink gums, a textured tongue and a dark cavity; teeth are rarely pure white or perfectly aligned.
- **How the plan builds it:** A separate teeth/gums mesh (upper and lower), tongue with three bones and tongueOut, a cavity cap with ambient occlusion, a mild per-person colour and misalignment option. Needed for any open mouth, smile or speech.
- **Driven by:** —. **New inputs:** `teethTone`.

### Neck

#### Neck
`neck` · today: **part of the skin** · tile: HEAD, 93.7 texels/cm · mesh edge 5 mm · viewer region: neck

- **What a real one is like:** Sternocleidomastoid cords, a suprasternal notch, a larynx prominence in many men, a nape crease, and a trapezius slope that shifts with posture.
- **How the plan builds it:** Two neck joints for natural head turn; sternocleidomastoid and trapezius corrective shapes keyed to head rotation; hairline/nape taper from the hair generator.
- **Driven by:** `neck`, `neckLength`. **New inputs:** `neckTrapSlope`.

### Torso

#### Shoulders and clavicles
`shoulders_clavicles` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 8 mm · viewer region: shoulders

- **What a real one is like:** Visible clavicles, acromion points, deltoid caps and a trapezius line; a raised arm shortens the clavicle and bunches the armpit.
- **How the plan builds it:** Keep the clavicle joints, add scapula-driven correctives for arm raise, and sculpt acromion and clavicle relief.
- **Driven by:** `shoulders`, `shoulderBreadth`, `bideltoidBreadth`, `shoulderTilt`, `shoulderRounding`. **New inputs:** —.

#### Chest and pectorals
`chest` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 6 mm · viewer region: chest

- **What a real one is like:** Sternum groove, pectoral edge, nipples and areolae with their own colour and a slight relief, and chest hair where a person has it.
- **How the plan builds it:** Sculpt areolae as raised skin patches with a pigment offset in the skin mask; pec correctives for arm raise and cross-body; chest hair from the body-hair field.
- **Driven by:** `chest`, `chestDepth`, `underbust`. **New inputs:** —.

#### Back
`back` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 8 mm · viewer region: to add

- **What a real one is like:** Spinal groove, scapula edges, latissimus fold, sacral dimples and a lumbar curve; more freckles and tan on the upper back.
- **How the plan builds it:** Three spine joints with twist; scapula correctives; lumbar and thoracic curvature shapes keyed to spineCurvature.
- **Driven by:** `spineCurvature`. **New inputs:** —.

#### Core: abdomen, navel and obliques
`core` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 6 mm · viewer region: waist

- **What a real one is like:** Linea alba, rectus segments only at low body fat, oblique line, a navel with an inner fold, and soft folds that appear on a forward bend.
- **How the plan builds it:** A navel as modelled geometry; body-fat driven definition correctives (replace the "gut_volume" and "oblique_def" blends with region-bounded versions); bend-fold correctives.
- **Driven by:** `waist`, `bodyFat`, `visceralFat`. **New inputs:** —.

#### Waist, hips and pelvis
`waist_hips` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 8 mm · viewer region: waist

- **What a real one is like:** Iliac crest, waist taper, hip width set by the bony pelvis, and tilt that changes how the lower back and abdomen sit.
- **How the plan builds it:** Pelvis-referenced sculpt; keep the shipped pelvis refinement; separate pelvic-width (bone) from hip-soft-tissue (fat) morphs so measurements map to the right cause.
- **Driven by:** `waist`, `hips`, `highHip`, `pelvicBreadth`, `pelvicTilt`, `hipRotation`. **New inputs:** —.

#### Glutes
`glutes` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 8 mm · viewer region: glutes

- **What a real one is like:** A gluteal fold, mass that deforms on hip flexion and sitting, and a different (paler, less exposed) skin tone.
- **How the plan builds it:** Hip-flexion correctives for sitting and squat; low sun-exposure value in the skin mask so tan lines and tone differ here.
- **Driven by:** `glutes`. **New inputs:** —.

### Arms

#### Upper arm
`upper_arm` · today: **partial** · tile: BODY, 31.2 texels/cm · mesh edge 6 mm · viewer region: leftArm

- **What a real one is like:** Deltoid, biceps, triceps horseshoe, a medial vein path in lean people; the skin does not collapse when the arm twists.
- **How the plan builds it:** Twist joints (the audit found none: wrist rotation collapses the forearm skin), bicep/tricep correctives, separate left and right so asymmetry metrics have effect.
- **Driven by:** `arms`, `leftUpperArm`, `rightUpperArm`. **New inputs:** —.

#### Elbow
`elbow` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 4 mm · viewer region: leftArm

- **What a real one is like:** An olecranon point, a cubital fossa crease, loose darker skin with fine wrinkles on the point.
- **How the plan builds it:** Flexion corrective for the inner crease and the outer bulge; per-region pigment offset (slightly darker) and a wrinkle tile on the point.
- **Driven by:** `elbow`. **New inputs:** —.

#### Forearm
`forearm` · today: **partial** · tile: BODY, 31.2 texels/cm · mesh edge 5 mm · viewer region: leftForearm

- **What a real one is like:** Brachioradialis bulge, extensor cords that move with the fingers, visible veins in lean people, arm hair, more tan than the upper arm.
- **How the plan builds it:** Twist joints for pronation and supination; vein mask scaled by body fat; arm hair field; tendon correctives driven by finger curl.
- **Driven by:** `forearm`, `leftForearm`, `rightForearm`. **New inputs:** —.

#### Wrist
`wrist` · today: **partial** · tile: BODY, 31.2 texels/cm · mesh edge 3 mm · viewer region: leftHand

- **What a real one is like:** Ulnar styloid, wrist creases, visible tendons when the hand is flexed.
- **How the plan builds it:** Hand joint with flexion/extension and radial/ulnar deviation correctives; crease normal tile.
- **Driven by:** `wrist`, `leftWrist`, `rightWrist`. **New inputs:** —.

### Hands

#### Palm
`palm` · today: **partial** · tile: HANDS, 49.7 texels/cm · mesh edge 2.5 mm · viewer region: leftHand

- **What a real one is like:** Thenar and hypothenar pads, flexion creases that deepen when the hand closes, paler pink skin and no hair.
- **How the plan builds it:** Palm crease normal map, a closing-hand corrective, and a palm preset in the skin region table (lighter, redder, no body hair).
- **Driven by:** `handLength`. **New inputs:** `handWidth`.

#### Back of the hand
`hand_dorsum` · today: **partial** · tile: HANDS, 49.7 texels/cm · mesh edge 2.5 mm · viewer region: leftHand

- **What a real one is like:** Metacarpal tendons that show when fingers extend, veins, knuckle wrinkles, fine hair, and the most sun exposure after the face.
- **How the plan builds it:** Knuckle wrinkle tile, vein mask, dorsal hair field, tan-exposure 1.0.
- **Driven by:** `handLength`. **New inputs:** `handVeinVisibility`.

#### Fingers (thumb to little finger)
`fingers` · today: **partial** · tile: HANDS, 49.7 texels/cm · mesh edge 1.5 mm · viewer region: leftHand

- **What a real one is like:** Three phalanges per finger (two for the thumb plus the metacarpal), joint creases on the palm side, knuckle skin that stretches when bent, finger pads, and fingers that taper.
- **How the plan builds it:** Per-finger joints (the audit found 288 vertices per finger and no finger joints), fingertip pad geometry, joint-crease normal tiles, and a grip pose library. 15 hand shapes (fist, point, pinch, open, relaxed curl).
- **Driven by:** `handLength`. **New inputs:** `fingerLengthRatio`.

#### Fingernails
`fingernails` · today: **absent** · tile: NAILS, 283.6 texels/cm · mesh edge 0.4 mm · viewer region: leftHand

- **What a real one is like:** A translucent plate over a pink nail bed with a pale half-moon (lunula), a cuticle fold, a curved free edge, longitudinal ridges and a slight sheen; the colour changes where the plate lifts off the bed.
- **How the plan builds it:** Ten nail meshes sharing the NAILS atlas (about 280 texels per cm), thin-film translucency, a bed-colour gradient, a growth length slider and optional polish.
- **Driven by:** —. **New inputs:** `nailLength`, `nailShape`, `nailCare`.

### Legs

#### Thigh
`thigh` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 8 mm · viewer region: leftThigh

- **What a real one is like:** Quadriceps sweep, adductor line, hamstring, and a fat distribution that varies by person; skin slides over muscle when the leg flexes.
- **How the plan builds it:** Twist joints; quadriceps/hamstring correctives for hip flexion; fat-distribution shape separate from muscle shape.
- **Driven by:** `thighs`, `leftThigh`, `rightThigh`, `upperLegLength`. **New inputs:** —.

#### Knee
`knee` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 4 mm · viewer region: leftThigh

- **What a real one is like:** Patella, patellar tendon, a popliteal crease behind, and skin that wrinkles and folds on bend.
- **How the plan builds it:** Patella and tendon relief sculpted into the skin, a flexion corrective for both sides, valgus/varus shape from kneeAlignment.
- **Driven by:** `kneeAlignment`, `leftKneeAngle`, `rightKneeAngle`. **New inputs:** —.

#### Calf and shin
`calf` · today: **part of the skin** · tile: BODY, 31.2 texels/cm · mesh edge 8 mm · viewer region: calves

- **What a real one is like:** Gastrocnemius bellies, soleus line, shin crest, leg hair, veins and a tan that fades toward the ankle.
- **How the plan builds it:** Gastrocnemius contraction corrective driven by ankle plantar flexion; shin hair field; vein and tan masks.
- **Driven by:** `calves`, `leftCalf`, `rightCalf`, `lowerLegLength`. **New inputs:** —.

#### Ankle
`ankle` · today: **part of the skin** · tile: FEET, 37.9 texels/cm · mesh edge 3 mm · viewer region: calves

- **What a real one is like:** Medial and lateral malleolus, the Achilles tendon, and creases on dorsiflexion.
- **How the plan builds it:** Malleolus and Achilles relief; ankle flexion and inversion correctives.
- **Driven by:** `ankle`. **New inputs:** —.

### Feet

#### Foot: arch, sole and heel
`foot` · today: **partial** · tile: FEET, 37.9 texels/cm · mesh edge 4 mm · viewer region: leftFoot

- **What a real one is like:** A medial arch, a thick heel pad, the ball of the foot, a paler plantar surface with rough callus patches and tendons on the top.
- **How the plan builds it:** Sole texture tile with creases and callus, arch shape from archHeight, weight-bearing correctives that flatten the sole against the floor.
- **Driven by:** `footLength`, `leftFootRotation`, `rightFootRotation`. **New inputs:** `footWidth`, `archHeight`.

#### Toes
`toes` · today: **partial** · tile: FEET, 37.9 texels/cm · mesh edge 2 mm · viewer region: leftFoot

- **What a real one is like:** Five toes of unequal length, separate joints, creases, toe-pad skin and a gap that opens with weight.
- **How the plan builds it:** Per-toe joints (none today), toe-pad geometry and a toe-grip pose; toes press against the floor when standing.
- **Driven by:** —. **New inputs:** `toeSplay`.

#### Toenails
`toenails` · today: **absent** · tile: NAILS, 283.6 texels/cm · mesh edge 0.4 mm · viewer region: leftFoot

- **What a real one is like:** Flatter, thicker, more opaque than fingernails, with a visible lunula on the big toe.
- **How the plan builds it:** Ten nail meshes sharing the nail atlas with a thicker translucency preset.
- **Driven by:** —. **New inputs:** `nailCare`.

### Hair

#### Eyelashes
`eyelashes` · today: **separate mesh** · tile: none · viewer region: head

- **What a real one is like:** Roughly 100 to 150 upper and 50 to 75 lower lashes, curved, of different lengths, rooted along the lid edge, not a textured card.
- **How the plan builds it:** Strands from the same generator as scalp hair, rooted on the lid-edge loop, with curl and length variation; cards remain for the LOW tier.
- **Driven by:** —. **New inputs:** `lashLength`.

#### Eyebrows
`eyebrows` · today: **separate mesh** · tile: none · viewer region: head

- **What a real one is like:** Hairs that change direction across the brow (up and in at the head, along the arch, down and out at the tail), thicker at the head, with visible individual strands.
- **How the plan builds it:** Strand set with a direction field, density and length falloff, colour tied to the hair colour model with a lighter default for fair hair.
- **Driven by:** —. **New inputs:** `browThickness`, `browArch`.

#### Scalp hair
`scalp_hair` · today: **separate mesh** · tile: none · viewer region: head

- **What a real one is like:** Tens of thousands of fibres in clumps with a parting, a hairline and a wave pattern, lit with a bright primary and a coloured secondary highlight, darker near the scalp and translucent at the edges.
- **How the plan builds it:** Port the strand system from the plan page (Kajiya-Kay ribbons, 20k balanced / 60k high strands, cards for LOW). Styles, curl, grey fraction and a melanin-based colour model.
- **Driven by:** `hairStyle` (appearance), `hairColor` (appearance). **New inputs:** `hairGreyPct`, `hairDensity`, `hairCurl`.

#### Beard, moustache and stubble
`facial_hair` · today: **absent** · tile: none · viewer region: head

- **What a real one is like:** Hair that grows at different angles by area, patchier on the cheeks, a lighter or greyer tone than the scalp for many people, and stubble that is a dark shadow made of tiny strands.
- **How the plan builds it:** Strand set on a face growth mask with a direction field; stubble as short strands plus a darkening mask so it also reads at distance.
- **Driven by:** —. **New inputs:** `facialHairStyle`, `stubbleDays`.

#### Body hair (chest, abdomen, arms, legs, hands, feet)
`body_hair` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** Fine, short, sparse hair whose density and thickness change region by region (thicker on the lower legs and forearms, sparse on the back of the hand, none on palms and soles), lighter in colour than the scalp.
- **How the plan builds it:** A density field per region (a mask in the skin tile) and a short-strand set generated at load; strand length 3 to 12 mm; the HIGH tier draws strands, BALANCED fades them into a normal-map fuzz, LOW omits them. The existing bodyHairDensity slider (0 to 1) is kept.
- **Driven by:** `bodyHairDensity` (appearance). **New inputs:** `bodyHairPattern`.

#### Underarm hair
`underarm_hair` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** A denser patch in the axilla that flattens when the arm lowers.
- **How the plan builds it:** Strands rooted on the axilla mask and skinned to the upper-arm and spine joints.
- **Driven by:** —. **New inputs:** `underarmHair`.

### Skin

#### Skin tone (constitutive melanin)
`skin_tone` · today: **partial** · tile: none · viewer region: to add

- **What a real one is like:** The colour of skin that the sun never reaches, set by genetics; it shifts with undertone but not with the season.
- **How the plan builds it:** Computed in the shader from one ITA number (code/skin-layers.mjs); the existing Fitzpatrick choice (I to VI) maps to ITA, and a free ITA slider is the advanced control.
- **Driven by:** `skinTone` (appearance). **New inputs:** `skinToneIta`, `skinUndertone`.

#### Tan and tan lines (facultative melanin)
`skin_tan` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** A reversible, uneven darkening that is strongest on the face, forearms and hands, absent under clothing, and edged where clothing used to be; skin type I tans little.
- **How the plan builds it:** A separate layer added to the same melanin quantity and masked by region exposure and wardrobe coverage (tan lines follow the swimwear preset when "tan lines" is on).
- **Driven by:** —. **New inputs:** `tanLevel`, `tanLines`.

#### Blood flow: blush, flush, veins
`skin_blood` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** Pink cheeks, nose, ears and knuckles; flushing after exercise; bluish veins on forearms, hands and feet that show more in lean, pale skin.
- **How the plan builds it:** Haemoglobin as its own layer (oxygenated pink, deoxygenated blue-green for veins), driven by a mask and by activity; the vein map is scaled by body fat.
- **Driven by:** —. **New inputs:** `rednessBase`, `flushLevel`, `veinVisibility`.

#### Freckles, moles, scars, stretch marks, birthmarks
`skin_features` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** Dozens of moles of different sizes, freckles that concentrate on sun-exposed skin, scars with a different texture, stretch marks along the flanks, and nothing perfectly symmetrical.
- **How the plan builds it:** Procedural, deterministic from a user seed (so it never changes between sessions) and placed on a feature mask; user-defined marks are added as decals in UV space.
- **Driven by:** —. **New inputs:** `frecklesDensity`, `molesCount`, `scars`.

#### Micro surface: pores, creases, sheen, sweat
`skin_surface` · today: **partial** · tile: MICRO, 256.0 texels/cm · viewer region: to add

- **What a real one is like:** Pores that differ by area (large on the nose and cheeks), a hexagonal diamond pattern on the forearms and neck, fine lines, goosebumps, and a sheen that changes with oil and sweat.
- **How the plan builds it:** Tiling micro-normal and roughness tiles (the MICRO tile, 256 texels per cm), blended in by distance so close zoom stays sharp; roughness driven by an oiliness mask and a sweat parameter.
- **Driven by:** —. **New inputs:** `skinOiliness`, `skinAge`.

### Wear

#### Underwear
`wear_underwear` · today: **absent** · tile: none · mesh edge 3 mm · viewer region: to add

- **What a real one is like:** Fabric with a waistband, seams and a fit that depends on the body underneath.
- **How the plan builds it:** A real garment mesh (not a body-clone shell), skinned to the same skeleton with cloth-proxy weights; its coverage feeds the tan-line mask.
- **Driven by:** —. **New inputs:** —.

#### Swimwear
`wear_swimwear` · today: **absent** · tile: none · mesh edge 3 mm · viewer region: to add

- **What a real one is like:** Stretch fabric with a visible texture, and a tan-line boundary on the body when worn for a long time.
- **How the plan builds it:** Trunks and optional top as garment meshes; tan-line preset that shades only skin that the garment never covers.
- **Driven by:** —. **New inputs:** —.

#### Gym wear
`wear_gym` · today: **absent** · tile: none · mesh edge 5 mm · viewer region: to add

- **What a real one is like:** Shorts, a fitted top and shoes with seams, folds and tension lines.
- **How the plan builds it:** Shorts, tank/tee and trainers as garment meshes with pose-dependent fold normals.
- **Driven by:** —. **New inputs:** —.

#### Casual wear
`wear_casual` · today: **absent** · tile: none · mesh edge 6 mm · viewer region: to add

- **What a real one is like:** Jeans/chinos, tee, jacket and sneakers with believable drape.
- **How the plan builds it:** Garment meshes with a cloth-proxy skinning set; no physics at first (fold normals only).
- **Driven by:** —. **New inputs:** —.

#### Formal wear
`wear_formal` · today: **absent** · tile: none · mesh edge 6 mm · viewer region: to add

- **What a real one is like:** Shirt, trousers, jacket, shoes with a structured silhouette.
- **How the plan builds it:** Garment meshes with a collar and cuff; cloth physics is a stretch goal.
- **Driven by:** —. **New inputs:** —.

#### Body-composition overlay
`wear_body_comp` · today: **partial** · tile: none · viewer region: to add

- **What a real one is like:** Not clothing: a data view that shades fat, lean and water regions on the body.
- **How the plan builds it:** Keep as a shader overlay on the skin (not on a garment) with a clear key.
- **Driven by:** `bodyFat`, `leanMass`, `skeletalMuscle`. **New inputs:** —.

#### Shoes and socks
`wear_footwear` · today: **absent** · tile: none · mesh edge 4 mm · viewer region: to add

- **What a real one is like:** A sole that meets the floor flat, laces, a tongue and a collar.
- **How the plan builds it:** Footwear meshes weighted to foot and toe joints; the floor contact point is set from the sole, not the skin.
- **Driven by:** —. **New inputs:** —.

### Underlying anatomy

#### Skeleton
`underlay_skeleton` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** A full skeleton that moves with the pose.
- **How the plan builds it:** Sourced from Z-Anatomy (CC BY-SA 4.0, attribution and share-alike apply to the asset only) or built; decimated and skinned to the same joints.
- **Driven by:** `boneMass`. **New inputs:** —.

#### Muscles
`underlay_muscle` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** Named muscle groups that scale with the user's measurements.
- **How the plan builds it:** Muscle meshes scaled by region metrics; fade-through in the existing anatomy-depth slider.
- **Driven by:** `skeletalMuscle`, `leanMass`. **New inputs:** —.

#### Fat layer
`underlay_fat` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** A subcutaneous layer whose thickness and distribution change with body fat.
- **How the plan builds it:** A shell between skin and muscle whose thickness is driven by bodyFat and a distribution preset; used for definition correctives too.
- **Driven by:** `bodyFat`, `visceralFat`. **New inputs:** —.

#### Organs
`underlay_organs` · today: **absent** · tile: none · viewer region: to add

- **What a real one is like:** Heart, lungs, liver, stomach, intestines, kidneys.
- **How the plan builds it:** Optional educational layer; the existing ORGANS = 0 level of the anatomy-depth control.
- **Driven by:** `visceralFat`. **New inputs:** —.

### Adult external anatomy

#### Adult external anatomy (adult-gated)
`adult_external` · today: **separate mesh** · tile: BODY, 31.2 texels/cm · mesh edge 4 mm · viewer region: anatomy

- **What a real one is like:** Skin that matches the rest of the body (same tone layers, body-hair field and wear rules), a believable pose-dependent shape, and nothing that looks pasted on.
- **How the plan builds it:** Stays a separate, adult-gated mesh shown only when the cover key, eligibility and wardrobe allow it; it joins the shared skin pipeline (tone, tan, pigment offset, hair field) and is excluded from every screenshot, share and export by construction (see policy in 03-anatomy-spec.md).
- **Driven by:** `anatomyLengthCm`, `anatomyGirthCm`. **New inputs:** —.
<!-- end:anatomy -->
