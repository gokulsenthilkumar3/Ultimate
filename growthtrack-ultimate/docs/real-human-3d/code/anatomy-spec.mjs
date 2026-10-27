// Single source of truth for the "real human" anatomy plan. 03-anatomy-spec.md is generated from this file
// (`node docs/real-human-3d/code/render-anatomy.mjs --write`), and anatomy-spec.check.mjs verifies it against the repo.
//
// Fields
//   id            stable key, also the node/mesh/material prefix in the GLB v3 spec (07-asset-pipeline-and-glb-spec.md)
//   group         head | eyes | mouth | neck | torso | arms | hands | legs | feet | hair | skin | wear | underlay | private
//   today         what the shipped humanoid-base.glb has: mesh | skin-surface | partial | absent   (from glb-audit.humanoid-base.md)
//   bones         joints added in GLB v3 (the shipped rig has 20 joints and none of these)
//   tile          texture tile that holds the region's skin (see TEXTURE_TILES); texel density is derived from the tile, not typed
//   edgeMm        target mean edge length of the mesh in that region, in millimetres
//   region        name in src/components/morphEngine/bodyRegions.js that selects this part in the viewer, or null
//   metrics       keys the app already has (physiqueProfile.js, metricsToBlendshapes.js, bodyMetricContract.js) that drive this part
//   appearance    avatar appearance fields that already exist in the 3D store (skinTone, eyeColor, hairColor, hairStyle, bodyHairDensity)
//   newMetrics    keys the plan adds (see 06-ui-for-metrics.md); they must not collide with existing keys
//   real          what a real one is like, i.e. what the model has to reproduce to read as a person
//   build         how the plan builds it

/**
 * Texture tiles ("UDIM-like"): one skin material, several image sets selected by a per-vertex tile id. Density is
 * derived: sqrt(size^2 * UV_UTILISATION / areaCm2). Areas are the audited region areas (glb-audit.humanoid-base.md).
 */
export const UV_UTILISATION = 0.8;
export const TEXTURE_TILES = {
  HEAD:  { size: 4096, areaCm2: 1530,  maps: 5, note: 'face, ears, scalp and neck above the collar' },
  BODY:  { size: 4096, areaCm2: 13776, maps: 5, note: 'torso, arms, legs and the private-anatomy skin' },
  HANDS: { size: 2048, areaCm2: 1360,  maps: 5, note: 'both hands' },
  FEET:  { size: 2048, areaCm2: 2334,  maps: 5, note: 'both feet and ankles' },
  NAILS: { size: 2048, cells: 20, cellsPerRow: 5, nailLongEdgeCm: 1.3, maps: 2, note: 'all ten fingernails and ten toenails in one atlas (albedo and normal only)' },
  MICRO: { size: 512, coverCm: 2, maps: 3, note: 'tiling pore/crease detail, shared by every skin region and blended in by distance' },
};
/** Texture level per quality tier: 0 = full size, 1 = half size (a quarter of the memory). */
export const TIER_TILE_LEVELS = {
  LOW:      { HEAD: 1, BODY: 1, HANDS: 1, FEET: 1, NAILS: 1, MICRO: 0 },
  BALANCED: { HEAD: 0, BODY: 1, HANDS: 0, FEET: 1, NAILS: 0, MICRO: 0 },
  HIGH:     { HEAD: 0, BODY: 0, HANDS: 0, FEET: 0, NAILS: 0, MICRO: 0 },
};
/** GPU texture memory budgets per tier, in MiB. */
export const TIER_TEXTURE_BUDGET_MIB = { LOW: 40, BALANCED: 100, HIGH: 150 };
/** The lowest density each tile must reach at level 0 (texels per cm), so a change to a tile cannot silently thin a region. */
export const TILE_MIN_TEXELS = { HEAD: 90, BODY: 30, HANDS: 45, FEET: 35, NAILS: 250, MICRO: 250 };
/** Bytes per texel per map with GPU-compressed KTX2 (ETC1S colour maps 0.5, UASTC normals 1.0); mips add one third. */
export const MAP_BYTES = { colour: 0.5, normal: 1.0 };

export function tileDensity(name, level = 0) {
  const t = TEXTURE_TILES[name]; if (!t) throw new RangeError(`unknown tile ${name}`);
  const size = t.size / 2 ** level;
  if (name === 'MICRO') return size / t.coverCm;
  if (name === 'NAILS') return (size / t.cellsPerRow) * 0.9 / t.nailLongEdgeCm;
  return Math.sqrt((size * size * UV_UTILISATION) / t.areaCm2);
}

export function tileMiB(name, level = 0) {
  const t = TEXTURE_TILES[name]; const size = t.size / 2 ** level;
  const bytesPerTexel = name === 'NAILS' ? MAP_BYTES.colour + MAP_BYTES.normal : name === 'MICRO' ? MAP_BYTES.colour + MAP_BYTES.normal * 2 : MAP_BYTES.colour * 3 + MAP_BYTES.normal;
  return (size * size * bytesPerTexel * (4 / 3)) / 1048576;
}

export const GROUPS = {
  head: 'Head and face', eyes: 'Eyes', mouth: 'Mouth', neck: 'Neck', torso: 'Torso', arms: 'Arms', hands: 'Hands', legs: 'Legs', feet: 'Feet',
  hair: 'Hair', skin: 'Skin', wear: 'Wear', underlay: 'Underlying anatomy', private: 'Adult external anatomy',
};

export const ANATOMY = [
  // ---- head and face --------------------------------------------------------------------------------------------
  { id: 'cranium_scalp', group: 'head', label: 'Cranium and scalp', today: 'skin-surface', bones: ['Head'], tile: 'HEAD', edgeMm: 3, region: 'head', metrics: ['faceWidth', 'faceHeight', 'headCirc'], newMetrics: [],
    real: 'A skull-shaped head with a visible temple hollow, occipital bulge and a scalp that is a different skin from the face (thicker, hair-bearing, pale where covered).',
    build: 'Sculpt on an anatomical skull reference; the scalp is the hair-root surface (skin tile HEAD, region mask "scalp") that the strand system grows from.' },
  { id: 'forehead_brow', group: 'head', label: 'Forehead and brow ridge', today: 'skin-surface', bones: ['Head'], tile: 'HEAD', edgeMm: 2.5, region: 'head', metrics: ['faceHeight'], newMetrics: [],
    real: 'Brow ridge casting a soft shadow into the orbit, a frontal bossing that varies by person, and faint horizontal creases that deepen with raised brows.',
    build: 'Shapes browInnerUp, browOuterUpLeft/Right, browDownLeft/Right as FACS-style morph targets; wrinkle normal maps blended by those weights.' },
  { id: 'cheeks_midface', group: 'head', label: 'Cheeks and midface', today: 'skin-surface', bones: ['Head'], tile: 'HEAD', edgeMm: 2.5, region: 'head', metrics: ['faceWidth'], newMetrics: ['cheekFullness'],
    real: 'Malar fat pad, zygomatic prominence, nasolabial fold and, in many people, a darker infra-orbital shadow; cheeks blush first.',
    build: 'Morphs cheekPuff, cheekSquintLeft/Right plus a cheekFullness body-fat-linked corrective; blood-flow mask raised over the cheeks.' },
  { id: 'jaw_chin', group: 'head', label: 'Jaw and chin', today: 'absent', bones: ['Jaw'], tile: 'HEAD', edgeMm: 2.5, region: 'head', metrics: ['jawWidth', 'chinProjection'], newMetrics: [],
    real: 'A mandible that hinges, drops and slides, with a jawline whose definition depends on body fat and masseter size.',
    build: 'Add a Jaw joint (the audit found none), jawOpen/jawLeft/jawRight/jawForward shapes, and a chin-dimple option. Existing jaw_width, chin_projection morphs stay as proportion shapes.' },
  { id: 'nose', group: 'head', label: 'Nose', today: 'skin-surface', bones: ['Head'], tile: 'HEAD', edgeMm: 1.5, region: 'head', metrics: ['noseLength', 'noseWidth', 'noseTipSize', 'noseBridgeWidth'], newMetrics: [],
    real: 'Bridge, dorsum, tip, alar wings and columella; nostrils that are real openings with depth and a dark interior; thin skin that shows blood at the tip and oil at the sides.',
    build: 'Model nostril openings with 8 to 10 mm of interior to a dark cap; noseSneerLeft/Right and nostril flare shapes; thin-skin thickness mask and an oil-sheen mask.' },
  { id: 'ears', group: 'head', label: 'Ears', today: 'skin-surface', bones: ['Head'], tile: 'HEAD', edgeMm: 1.5, region: 'head', metrics: ['earLength', 'earWidth', 'earProminence'], newMetrics: ['earLobeType'],
    real: 'Helix, antihelix, tragus, antitragus, concha and lobe, thin enough that backlight glows red through them, often a little redder than the face.',
    build: 'Sculpt true ear topology (not a flap); transmission driven by a thickness map; separate pink bias in the blood-flow mask; optional fine ear hair.' },

  // ---- eyes ---------------------------------------------------------------------------------------------------
  { id: 'eyeballs', group: 'eyes', label: 'Eyeballs (sclera, iris, pupil, cornea)', today: 'mesh', bones: [], tile: null, edgeMm: 0.8, region: 'head', metrics: ['eyeSpacing', 'eyeSize'], appearance: ['eyeColor'], newMetrics: ['irisSizeMm', 'pupilSizeMm', 'eyeScleraTone'],
    real: 'A 24 mm globe with an 11.7 mm iris (varying 10 to 13 mm), radial fibres, a collarette, a dark limbal ring, a clear bulging cornea with wet catchlights, and faintly veined off-white sclera.',
    build: 'Keep the procedural iris/cornea shader from the plan page (plan-assets/src/eyes.mjs); iris colour, iris size and pupil size become inputs.' },
  { id: 'eye_gaze', group: 'eyes', label: 'Eye bones, gaze and pupil response', today: 'absent', bones: ['LeftEye', 'RightEye'], tile: null, edgeMm: 0, region: 'head', metrics: [], newMetrics: ['gazeFollowsCamera'],
    real: 'Two eyes that converge on what they look at, flick in small saccades, drift when idle, and whose pupils contract in bright light; eyes that look at the camera are what makes a face feel present.',
    build: 'Eye joints with a look-at constraint (limits about 35 degrees yaw and 25 pitch), vergence from the target distance, micro-saccades on a timer, pupil radius from scene brightness, and eyeLook* shapes so lids follow the globe. The audit found no eye joints: gaze is faked by rotating the eyeball meshes in the browser.' },
  { id: 'eyelids', group: 'eyes', label: 'Eyelids and lash line', today: 'skin-surface', bones: ['Head'], tile: 'HEAD', edgeMm: 0.8, region: 'head', metrics: [], newMetrics: ['lidCrease', 'eyeOpenness'],
    real: 'Upper and lower lids with thickness, a crease, a wet inner edge and a tarsal plate; lids follow the eyeball when it looks up or down and close fully with a seal.',
    build: 'Dedicated lid loops with their own morphs eyeBlinkLeft/Right, eyeSquint, eyeWide, and eyeLook* corrective shapes that move the lid with the globe. Replaces the whole-face "blink" shape (audit: it moves 2940 vertices).' },
  { id: 'eye_corners', group: 'eyes', label: 'Caruncle, tear duct and tear line', today: 'absent', bones: [], tile: 'HEAD', edgeMm: 0.6, region: 'head', metrics: [], newMetrics: [],
    real: 'A pink caruncle in the inner corner, a fold (plica), a wet meniscus along the lower lid, and shine on all of it.',
    build: 'Small separate meshes with a wet-surface material; a meniscus strip along the lower lid.' },
  { id: 'eyelashes', group: 'hair', label: 'Eyelashes', today: 'mesh', bones: [], tile: null, edgeMm: 0, region: 'head', metrics: [], newMetrics: ['lashLength'],
    real: 'Roughly 100 to 150 upper and 50 to 75 lower lashes, curved, of different lengths, rooted along the lid edge, not a textured card.',
    build: 'Strands from the same generator as scalp hair, rooted on the lid-edge loop, with curl and length variation; cards remain for the LOW tier.' },
  { id: 'eyebrows', group: 'hair', label: 'Eyebrows', today: 'mesh', bones: [], tile: null, edgeMm: 0, region: 'head', metrics: [], newMetrics: ['browThickness', 'browArch'],
    real: 'Hairs that change direction across the brow (up and in at the head, along the arch, down and out at the tail), thicker at the head, with visible individual strands.',
    build: 'Strand set with a direction field, density and length falloff, colour tied to the hair colour model with a lighter default for fair hair.' },

  // ---- mouth --------------------------------------------------------------------------------------------------
  { id: 'lips', group: 'mouth', label: 'Lips and mouth corners', today: 'skin-surface', bones: ['Jaw'], tile: 'HEAD', edgeMm: 1.2, region: 'head', metrics: ['lipFullness'], newMetrics: ['lipTone'],
    real: 'A defined vermilion border, cupid\'s bow, philtrum columns, lip lines (a fingerprint-like micro texture), wet inner edge, and a seal line that parts and rolls.',
    build: 'Mouth shapes mouthClose, mouthPucker, mouthFunnel, mouthSmileLeft/Right, mouthFrownLeft/Right, mouthStretch*, mouthRoll*, mouthShrug*, mouthPress*, mouthDimple*, mouthUpperUp*, mouthLowerDown*, mouthLeft/Right; lip-line normal tile; per-person lip tone.' },
  { id: 'teeth_gums_tongue', group: 'mouth', label: 'Teeth, gums, tongue and mouth interior', today: 'absent', bones: ['Tongue0', 'Tongue1', 'Tongue2'], tile: 'HEAD', edgeMm: 0.8, region: 'head', metrics: [], newMetrics: ['teethTone'],
    real: '32 adult teeth with different shapes, a slightly translucent enamel edge, pink gums, a textured tongue and a dark cavity; teeth are rarely pure white or perfectly aligned.',
    build: 'A separate teeth/gums mesh (upper and lower), tongue with three bones and tongueOut, a cavity cap with ambient occlusion, a mild per-person colour and misalignment option. Needed for any open mouth, smile or speech.' },

  // ---- neck ---------------------------------------------------------------------------------------------------
  { id: 'neck', group: 'neck', label: 'Neck', today: 'skin-surface', bones: ['Neck', 'Neck1'], tile: 'HEAD', edgeMm: 5, region: 'neck', metrics: ['neck', 'neckLength'], newMetrics: ['neckTrapSlope'],
    real: 'Sternocleidomastoid cords, a suprasternal notch, a larynx prominence in many men, a nape crease, and a trapezius slope that shifts with posture.',
    build: 'Two neck joints for natural head turn; sternocleidomastoid and trapezius corrective shapes keyed to head rotation; hairline/nape taper from the hair generator.' },

  // ---- torso --------------------------------------------------------------------------------------------------
  { id: 'shoulders_clavicles', group: 'torso', label: 'Shoulders and clavicles', today: 'skin-surface', bones: ['LeftShoulder', 'RightShoulder'], tile: 'BODY', edgeMm: 8, region: 'shoulders', metrics: ['shoulders', 'shoulderBreadth', 'bideltoidBreadth', 'shoulderTilt', 'shoulderRounding'], newMetrics: [],
    real: 'Visible clavicles, acromion points, deltoid caps and a trapezius line; a raised arm shortens the clavicle and bunches the armpit.',
    build: 'Keep the clavicle joints, add scapula-driven correctives for arm raise, and sculpt acromion and clavicle relief.' },
  { id: 'chest', group: 'torso', label: 'Chest and pectorals', today: 'skin-surface', bones: ['Spine2'], tile: 'BODY', edgeMm: 6, region: 'chest', metrics: ['chest', 'chestDepth', 'underbust'], newMetrics: [],
    real: 'Sternum groove, pectoral edge, nipples and areolae with their own colour and a slight relief, and chest hair where a person has it.',
    build: 'Sculpt areolae as raised skin patches with a pigment offset in the skin mask; pec correctives for arm raise and cross-body; chest hair from the body-hair field.' },
  { id: 'back', group: 'torso', label: 'Back', today: 'skin-surface', bones: ['Spine', 'Spine1', 'Spine2'], tile: 'BODY', edgeMm: 8, region: null, metrics: ['spineCurvature'], newMetrics: [],
    real: 'Spinal groove, scapula edges, latissimus fold, sacral dimples and a lumbar curve; more freckles and tan on the upper back.',
    build: 'Three spine joints with twist; scapula correctives; lumbar and thoracic curvature shapes keyed to spineCurvature.' },
  { id: 'core', group: 'torso', label: 'Core: abdomen, navel and obliques', today: 'skin-surface', bones: ['Spine', 'Spine1'], tile: 'BODY', edgeMm: 6, region: 'waist', metrics: ['waist', 'bodyFat', 'visceralFat'], newMetrics: [],
    real: 'Linea alba, rectus segments only at low body fat, oblique line, a navel with an inner fold, and soft folds that appear on a forward bend.',
    build: 'A navel as modelled geometry; body-fat driven definition correctives (replace the "gut_volume" and "oblique_def" blends with region-bounded versions); bend-fold correctives.' },
  { id: 'waist_hips', group: 'torso', label: 'Waist, hips and pelvis', today: 'skin-surface', bones: ['Hips'], tile: 'BODY', edgeMm: 8, region: 'waist', metrics: ['waist', 'hips', 'highHip', 'pelvicBreadth', 'pelvicTilt', 'hipRotation'], newMetrics: [],
    real: 'Iliac crest, waist taper, hip width set by the bony pelvis, and tilt that changes how the lower back and abdomen sit.',
    build: 'Pelvis-referenced sculpt; keep the shipped pelvis refinement; separate pelvic-width (bone) from hip-soft-tissue (fat) morphs so measurements map to the right cause.' },
  { id: 'glutes', group: 'torso', label: 'Glutes', today: 'skin-surface', bones: ['Hips', 'LeftUpLeg', 'RightUpLeg'], tile: 'BODY', edgeMm: 8, region: 'glutes', metrics: ['glutes'], newMetrics: [],
    real: 'A gluteal fold, mass that deforms on hip flexion and sitting, and a different (paler, less exposed) skin tone.',
    build: 'Hip-flexion correctives for sitting and squat; low sun-exposure value in the skin mask so tan lines and tone differ here.' },

  // ---- arms ---------------------------------------------------------------------------------------------------
  { id: 'upper_arm', group: 'arms', label: 'Upper arm', today: 'partial', bones: ['LeftUpperArm', 'LeftUpperArmTwist', 'RightUpperArm', 'RightUpperArmTwist'], tile: 'BODY', edgeMm: 6, region: 'leftArm', metrics: ['arms', 'leftUpperArm', 'rightUpperArm'], newMetrics: [],
    real: 'Deltoid, biceps, triceps horseshoe, a medial vein path in lean people; the skin does not collapse when the arm twists.',
    build: 'Twist joints (the audit found none: wrist rotation collapses the forearm skin), bicep/tricep correctives, separate left and right so asymmetry metrics have effect.' },
  { id: 'elbow', group: 'arms', label: 'Elbow', today: 'skin-surface', bones: ['LeftForeArm', 'RightForeArm'], tile: 'BODY', edgeMm: 4, region: 'leftArm', metrics: ['elbow'], newMetrics: [],
    real: 'An olecranon point, a cubital fossa crease, loose darker skin with fine wrinkles on the point.',
    build: 'Flexion corrective for the inner crease and the outer bulge; per-region pigment offset (slightly darker) and a wrinkle tile on the point.' },
  { id: 'forearm', group: 'arms', label: 'Forearm', today: 'partial', bones: ['LeftForeArmTwist', 'RightForeArmTwist'], tile: 'BODY', edgeMm: 5, region: 'leftForearm', metrics: ['forearm', 'leftForearm', 'rightForearm'], newMetrics: [],
    real: 'Brachioradialis bulge, extensor cords that move with the fingers, visible veins in lean people, arm hair, more tan than the upper arm.',
    build: 'Twist joints for pronation and supination; vein mask scaled by body fat; arm hair field; tendon correctives driven by finger curl.' },
  { id: 'wrist', group: 'arms', label: 'Wrist', today: 'partial', bones: ['LeftHand', 'RightHand'], tile: 'BODY', edgeMm: 3, region: 'leftHand', metrics: ['wrist', 'leftWrist', 'rightWrist'], newMetrics: [],
    real: 'Ulnar styloid, wrist creases, visible tendons when the hand is flexed.',
    build: 'Hand joint with flexion/extension and radial/ulnar deviation correctives; crease normal tile.' },

  // ---- hands ----------------------------------------------------------------------------------------------------
  { id: 'palm', group: 'hands', label: 'Palm', today: 'partial', bones: [], tile: 'HANDS', edgeMm: 2.5, region: 'leftHand', metrics: ['handLength'], newMetrics: ['handWidth'],
    real: 'Thenar and hypothenar pads, flexion creases that deepen when the hand closes, paler pink skin and no hair.',
    build: 'Palm crease normal map, a closing-hand corrective, and a palm preset in the skin region table (lighter, redder, no body hair).' },
  { id: 'hand_dorsum', group: 'hands', label: 'Back of the hand', today: 'partial', bones: [], tile: 'HANDS', edgeMm: 2.5, region: 'leftHand', metrics: ['handLength'], newMetrics: ['handVeinVisibility'],
    real: 'Metacarpal tendons that show when fingers extend, veins, knuckle wrinkles, fine hair, and the most sun exposure after the face.',
    build: 'Knuckle wrinkle tile, vein mask, dorsal hair field, tan-exposure 1.0.' },
  { id: 'fingers', group: 'hands', label: 'Fingers (thumb to little finger)', today: 'partial', bones: ['@fingers'], tile: 'HANDS', edgeMm: 1.5, region: 'leftHand', metrics: ['handLength'], newMetrics: ['fingerLengthRatio'],
    real: 'Three phalanges per finger (two for the thumb plus the metacarpal), joint creases on the palm side, knuckle skin that stretches when bent, finger pads, and fingers that taper.',
    build: 'Per-finger joints (the audit found 288 vertices per finger and no finger joints), fingertip pad geometry, joint-crease normal tiles, and a grip pose library. 15 hand shapes (fist, point, pinch, open, relaxed curl).' },
  { id: 'fingernails', group: 'hands', label: 'Fingernails', today: 'absent', bones: [], tile: 'NAILS', edgeMm: 0.4, region: 'leftHand', metrics: [], newMetrics: ['nailLength', 'nailShape', 'nailCare'],
    real: 'A translucent plate over a pink nail bed with a pale half-moon (lunula), a cuticle fold, a curved free edge, longitudinal ridges and a slight sheen; the colour changes where the plate lifts off the bed.',
    build: 'Ten nail meshes sharing the NAILS atlas (about 280 texels per cm), thin-film translucency, a bed-colour gradient, a growth length slider and optional polish.' },

  // ---- legs ---------------------------------------------------------------------------------------------------
  { id: 'thigh', group: 'legs', label: 'Thigh', today: 'skin-surface', bones: ['LeftUpLeg', 'LeftUpLegTwist', 'RightUpLeg', 'RightUpLegTwist'], tile: 'BODY', edgeMm: 8, region: 'leftThigh', metrics: ['thighs', 'leftThigh', 'rightThigh', 'upperLegLength'], newMetrics: [],
    real: 'Quadriceps sweep, adductor line, hamstring, and a fat distribution that varies by person; skin slides over muscle when the leg flexes.',
    build: 'Twist joints; quadriceps/hamstring correctives for hip flexion; fat-distribution shape separate from muscle shape.' },
  { id: 'knee', group: 'legs', label: 'Knee', today: 'skin-surface', bones: ['LeftLeg', 'RightLeg'], tile: 'BODY', edgeMm: 4, region: 'leftThigh', metrics: ['kneeAlignment', 'leftKneeAngle', 'rightKneeAngle'], newMetrics: [],
    real: 'Patella, patellar tendon, a popliteal crease behind, and skin that wrinkles and folds on bend.',
    build: 'Patella and tendon relief sculpted into the skin, a flexion corrective for both sides, valgus/varus shape from kneeAlignment.' },
  { id: 'calf', group: 'legs', label: 'Calf and shin', today: 'skin-surface', bones: ['LeftLegTwist', 'RightLegTwist'], tile: 'BODY', edgeMm: 8, region: 'calves', metrics: ['calves', 'leftCalf', 'rightCalf', 'lowerLegLength'], newMetrics: [],
    real: 'Gastrocnemius bellies, soleus line, shin crest, leg hair, veins and a tan that fades toward the ankle.',
    build: 'Gastrocnemius contraction corrective driven by ankle plantar flexion; shin hair field; vein and tan masks.' },
  { id: 'ankle', group: 'legs', label: 'Ankle', today: 'skin-surface', bones: ['LeftFoot', 'RightFoot'], tile: 'FEET', edgeMm: 3, region: 'calves', metrics: ['ankle'], newMetrics: [],
    real: 'Medial and lateral malleolus, the Achilles tendon, and creases on dorsiflexion.',
    build: 'Malleolus and Achilles relief; ankle flexion and inversion correctives.' },

  // ---- feet ---------------------------------------------------------------------------------------------------
  { id: 'foot', group: 'feet', label: 'Foot: arch, sole and heel', today: 'partial', bones: ['LeftToeBase', 'RightToeBase'], tile: 'FEET', edgeMm: 4, region: 'leftFoot', metrics: ['footLength', 'leftFootRotation', 'rightFootRotation'], newMetrics: ['footWidth', 'archHeight'],
    real: 'A medial arch, a thick heel pad, the ball of the foot, a paler plantar surface with rough callus patches and tendons on the top.',
    build: 'Sole texture tile with creases and callus, arch shape from archHeight, weight-bearing correctives that flatten the sole against the floor.' },
  { id: 'toes', group: 'feet', label: 'Toes', today: 'partial', bones: ['@toes'], tile: 'FEET', edgeMm: 2, region: 'leftFoot', metrics: [], newMetrics: ['toeSplay'],
    real: 'Five toes of unequal length, separate joints, creases, toe-pad skin and a gap that opens with weight.',
    build: 'Per-toe joints (none today), toe-pad geometry and a toe-grip pose; toes press against the floor when standing.' },
  { id: 'toenails', group: 'feet', label: 'Toenails', today: 'absent', bones: [], tile: 'NAILS', edgeMm: 0.4, region: 'leftFoot', metrics: [], newMetrics: ['nailCare'],
    real: 'Flatter, thicker, more opaque than fingernails, with a visible lunula on the big toe.',
    build: 'Ten nail meshes sharing the nail atlas with a thicker translucency preset.' },

  // ---- hair ---------------------------------------------------------------------------------------------------
  { id: 'scalp_hair', group: 'hair', label: 'Scalp hair', today: 'mesh', bones: [], tile: null, edgeMm: 0, region: 'head', metrics: [], appearance: ['hairStyle', 'hairColor'], newMetrics: ['hairGreyPct', 'hairDensity', 'hairCurl'],
    real: 'Tens of thousands of fibres in clumps with a parting, a hairline and a wave pattern, lit with a bright primary and a coloured secondary highlight, darker near the scalp and translucent at the edges.',
    build: 'Port the strand system from the plan page (Kajiya-Kay ribbons, 20k balanced / 60k high strands, cards for LOW). Styles, curl, grey fraction and a melanin-based colour model.' },
  { id: 'facial_hair', group: 'hair', label: 'Beard, moustache and stubble', today: 'absent', bones: [], tile: null, edgeMm: 0, region: 'head', metrics: [], newMetrics: ['facialHairStyle', 'stubbleDays'],
    real: 'Hair that grows at different angles by area, patchier on the cheeks, a lighter or greyer tone than the scalp for many people, and stubble that is a dark shadow made of tiny strands.',
    build: 'Strand set on a face growth mask with a direction field; stubble as short strands plus a darkening mask so it also reads at distance.' },
  { id: 'body_hair', group: 'hair', label: 'Body hair (chest, abdomen, arms, legs, hands, feet)', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: [], appearance: ['bodyHairDensity'], newMetrics: ['bodyHairPattern'],
    real: 'Fine, short, sparse hair whose density and thickness change region by region (thicker on the lower legs and forearms, sparse on the back of the hand, none on palms and soles), lighter in colour than the scalp.',
    build: 'A density field per region (a mask in the skin tile) and a short-strand set generated at load; strand length 3 to 12 mm; the HIGH tier draws strands, BALANCED fades them into a normal-map fuzz, LOW omits them. The existing bodyHairDensity slider (0 to 1) is kept.' },
  { id: 'underarm_hair', group: 'hair', label: 'Underarm hair', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: [], newMetrics: ['underarmHair'],
    real: 'A denser patch in the axilla that flattens when the arm lowers.',
    build: 'Strands rooted on the axilla mask and skinned to the upper-arm and spine joints.' },

  // ---- skin ---------------------------------------------------------------------------------------------------
  { id: 'skin_tone', group: 'skin', label: 'Skin tone (constitutive melanin)', today: 'partial', bones: [], tile: null, edgeMm: 0, region: null, metrics: [], appearance: ['skinTone'], newMetrics: ['skinToneIta', 'skinUndertone'],
    real: 'The colour of skin that the sun never reaches, set by genetics; it shifts with undertone but not with the season.',
    build: 'User-selected or calibrated baseline colour with independent undertone/tan. The existing reference preset-to-ITA lookup is an artistic approximation, not a clinical conversion from Fitzpatrick phototype. Optical calibration and uncertainty remain open in [R2-11/12](16-private-anatomy.md#research-plan-r2).' },
  { id: 'skin_tan', group: 'skin', label: 'Tan and tan lines (facultative melanin)', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: [], newMetrics: ['tanLevel', 'tanLines'],
    real: 'A reversible, uneven darkening that is strongest on the face, forearms and hands, absent under clothing, and edged where clothing used to be; skin type I tans little.',
    build: 'A separate layer added to the same melanin quantity and masked by region exposure and wardrobe coverage (tan lines follow the swimwear preset when "tan lines" is on).' },
  { id: 'skin_blood', group: 'skin', label: 'Blood flow: blush, flush, veins', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: [], newMetrics: ['rednessBase', 'flushLevel', 'veinVisibility'],
    real: 'Pink cheeks, nose, ears and knuckles; flushing after exercise; bluish veins on forearms, hands and feet that show more in lean, pale skin.',
    build: 'Haemoglobin as its own layer (oxygenated pink, deoxygenated blue-green for veins), driven by a mask and by activity; the vein map is scaled by body fat.' },
  { id: 'skin_features', group: 'skin', label: 'Freckles, moles, scars, stretch marks, birthmarks', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: [], newMetrics: ['frecklesDensity', 'molesCount', 'scars'],
    real: 'Dozens of moles of different sizes, freckles that concentrate on sun-exposed skin, scars with a different texture, stretch marks along the flanks, and nothing perfectly symmetrical.',
    build: 'Procedural, deterministic from a user seed (so it never changes between sessions) and placed on a feature mask; user-defined marks are added as decals in UV space.' },
  { id: 'skin_surface', group: 'skin', label: 'Micro surface: pores, creases, sheen, sweat', today: 'partial', bones: [], tile: 'MICRO', edgeMm: 0, region: null, metrics: [], newMetrics: ['skinOiliness', 'skinAge'],
    real: 'Pores that differ by area (large on the nose and cheeks), a hexagonal diamond pattern on the forearms and neck, fine lines, goosebumps, and a sheen that changes with oil and sweat.',
    build: 'Tiling micro-normal and roughness tiles (the MICRO tile, 256 texels per cm), blended in by distance so close zoom stays sharp; roughness driven by an oiliness mask and a sweat parameter.' },

  // ---- wear ---------------------------------------------------------------------------------------------------
  { id: 'wear_underwear', group: 'wear', label: 'Underwear', today: 'absent', bones: [], tile: null, edgeMm: 3, region: null, metrics: [], newMetrics: [],
    real: 'Fabric with a waistband, seams and a fit that depends on the body underneath.',
    build: 'A real garment mesh (not a body-clone shell), skinned to the same skeleton with cloth-proxy weights; its coverage feeds the tan-line mask.' },
  { id: 'wear_swimwear', group: 'wear', label: 'Swimwear', today: 'absent', bones: [], tile: null, edgeMm: 3, region: null, metrics: [], newMetrics: [],
    real: 'Stretch fabric with a visible texture, and a tan-line boundary on the body when worn for a long time.',
    build: 'Trunks and optional top as garment meshes; tan-line preset that shades only skin that the garment never covers.' },
  { id: 'wear_gym', group: 'wear', label: 'Gym wear', today: 'absent', bones: [], tile: null, edgeMm: 5, region: null, metrics: [], newMetrics: [],
    real: 'Shorts, a fitted top and shoes with seams, folds and tension lines.',
    build: 'Shorts, tank/tee and trainers as garment meshes with pose-dependent fold normals.' },
  { id: 'wear_casual', group: 'wear', label: 'Casual wear', today: 'absent', bones: [], tile: null, edgeMm: 6, region: null, metrics: [], newMetrics: [],
    real: 'Jeans/chinos, tee, jacket and sneakers with believable drape.',
    build: 'Garment meshes with a cloth-proxy skinning set; no physics at first (fold normals only).' },
  { id: 'wear_formal', group: 'wear', label: 'Formal wear', today: 'absent', bones: [], tile: null, edgeMm: 6, region: null, metrics: [], newMetrics: [],
    real: 'Shirt, trousers, jacket, shoes with a structured silhouette.',
    build: 'Garment meshes with a collar and cuff; cloth physics is a stretch goal.' },
  { id: 'wear_body_comp', group: 'wear', label: 'Body-composition overlay', today: 'partial', bones: [], tile: null, edgeMm: 0, region: null, metrics: ['bodyFat', 'leanMass', 'skeletalMuscle'], newMetrics: [],
    real: 'Not clothing: a data view that shades fat, lean and water regions on the body.',
    build: 'Keep as a shader overlay on the skin (not on a garment) with a clear key.' },
  { id: 'wear_footwear', group: 'wear', label: 'Shoes and socks', today: 'absent', bones: [], tile: null, edgeMm: 4, region: null, metrics: [], newMetrics: [],
    real: 'A sole that meets the floor flat, laces, a tongue and a collar.',
    build: 'Footwear meshes weighted to foot and toe joints; the floor contact point is set from the sole, not the skin.' },

  // ---- underlay -----------------------------------------------------------------------------------------------
  { id: 'underlay_skeleton', group: 'underlay', label: 'Skeleton', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: ['boneMass'], newMetrics: [],
    real: 'A full skeleton that moves with the pose.',
    build: 'Sourced from Z-Anatomy (CC BY-SA 4.0, attribution and share-alike apply to the asset only) or built; decimated and skinned to the same joints.' },
  { id: 'underlay_muscle', group: 'underlay', label: 'Muscles', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: ['skeletalMuscle', 'leanMass'], newMetrics: [],
    real: 'Named muscle groups that scale with the user\'s measurements.',
    build: 'Muscle meshes scaled by region metrics; fade-through in the existing anatomy-depth slider.' },
  { id: 'underlay_fat', group: 'underlay', label: 'Fat layer', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: ['bodyFat', 'visceralFat'], newMetrics: [],
    real: 'A subcutaneous layer whose thickness and distribution change with body fat.',
    build: 'A shell between skin and muscle whose thickness is driven by bodyFat and a distribution preset; used for definition correctives too.' },
  { id: 'underlay_organs', group: 'underlay', label: 'Organs', today: 'absent', bones: [], tile: null, edgeMm: 0, region: null, metrics: ['visceralFat'], newMetrics: [],
    real: 'Heart, lungs, liver, stomach, intestines, kidneys.',
    build: 'Optional educational layer; the existing ORGANS = 0 level of the anatomy-depth control.' },

  // ---- private ------------------------------------------------------------------------------------------------
  { id: 'adult_external', group: 'private', label: 'Adult external anatomy (adult-gated)', today: 'mesh', bones: ['Hips', 'LeftUpLeg', 'RightUpLeg'], tile: 'BODY', edgeMm: 4, region: 'anatomy', metrics: ['anatomyLengthCm', 'anatomyGirthCm'], newMetrics: [],
    real: 'Skin that matches the rest of the body (same tone layers, body-hair field and wear rules), a believable pose-dependent shape, and nothing that looks pasted on.',
    build: 'Stays a separate, adult-gated mesh shown only when the cover key, eligibility and wardrobe allow it; it joins the shared skin pipeline (tone, tan, pigment offset, hair field) and is excluded from every screenshot, share and export by construction (see policy in 03-anatomy-spec.md).' },
];


/**
 * The GLB v3 skeleton. The shipped rig has 20 joints (Hips, Spine, Spine1, Spine2, Neck, Head, and Shoulder, UpperArm,
 * ForeArm, Hand, UpLeg, Leg, Foot on each side). Everything else here is new. Names keep the existing convention.
 */
export const RIG_GROUPS = {
  core: ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Neck1', 'Head'],
  face: ['Jaw', 'LeftEye', 'RightEye', 'Tongue0', 'Tongue1', 'Tongue2'],
  arms: ['Shoulder', 'UpperArm', 'UpperArmTwist', 'ForeArm', 'ForeArmTwist', 'Hand'].flatMap(n => [`Left${n}`, `Right${n}`]),
  fingers: ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap(f => [1, 2, 3].flatMap(i => [`Left${f}${i}`, `Right${f}${i}`])),
  legs: ['UpLeg', 'UpLegTwist', 'Leg', 'LegTwist', 'Foot', 'ToeBase'].flatMap(n => [`Left${n}`, `Right${n}`]),
  toes: ['ToeBig1', 'ToeBig2', 'Toe2', 'Toe3', 'Toe4', 'Toe5'].flatMap(n => [`Left${n}`, `Right${n}`]),
};
export const RIG_JOINT_BUDGET = 100;
export const SHIPPED_JOINTS = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', ...['Shoulder', 'UpperArm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot'].flatMap(n => [`Left${n}`, `Right${n}`])];

/** The 52 ARKit-compatible face blendshapes the head mesh gets in GLB v3 (names are the ARKit identifiers). */
export const FACE_BLENDSHAPES = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight', 'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthFunnel', 'mouthLeft', 'mouthLowerDownLeft',
  'mouthLowerDownRight', 'mouthPressLeft', 'mouthPressRight', 'mouthPucker', 'mouthRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower',
  'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
  'noseSneerLeft', 'noseSneerRight', 'tongueOut',
];

/** The parts named in the request, each mapped to the spec entries that cover it. */
export const REQUEST_INDEX = [
  ['Head', ['cranium_scalp', 'forehead_brow', 'cheeks_midface', 'jaw_chin']],
  ['Hair', ['scalp_hair', 'eyebrows', 'eyelashes', 'facial_hair', 'body_hair', 'underarm_hair']],
  ['Eyebrows', ['eyebrows']],
  ['Eyes, eye colour', ['eyeballs', 'eye_gaze', 'eye_corners']],
  ['Eyelids', ['eyelids']],
  ['Ear', ['ears']],
  ['Nose', ['nose']],
  ['Mouth, lips, teeth', ['lips', 'teeth_gums_tongue']],
  ['Neck', ['neck']],
  ['Shoulders', ['shoulders_clavicles']],
  ['Arms', ['upper_arm', 'elbow']],
  ['Forearms', ['forearm', 'wrist']],
  ['Hand, fingers, nails', ['palm', 'hand_dorsum', 'fingers', 'fingernails']],
  ['Waist and chest', ['chest', 'waist_hips']],
  ['Core', ['core', 'back']],
  ['Hips', ['waist_hips']],
  ['Curls (glutes; hair curl is in scalp hair)', ['glutes', 'scalp_hair']],
  ['Thigh', ['thigh', 'knee']],
  ['Calf', ['calf', 'ankle']],
  ['Foot, toes, toenails', ['foot', 'toes', 'toenails']],
  ['Body hair', ['body_hair', 'underarm_hair', 'facial_hair']],
  ['Skin tone, tanning, melanin', ['skin_tone', 'skin_tan', 'skin_blood', 'skin_features', 'skin_surface']],
  ['Wear', ['wear_underwear', 'wear_swimwear', 'wear_gym', 'wear_casual', 'wear_formal', 'wear_body_comp', 'wear_footwear']],
  ['Under the skin', ['underlay_skeleton', 'underlay_muscle', 'underlay_fat', 'underlay_organs']],
  ['The private anatomy', ['adult_external']],
];
