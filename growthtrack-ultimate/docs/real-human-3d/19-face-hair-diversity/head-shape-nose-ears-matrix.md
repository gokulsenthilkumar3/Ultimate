# Whole-head shape, nose and ear matrix

Reviewed 2026-10-24. **Proposed universal data and editing contract; these controls are not a claim of implemented or calibrated asset support.** This matrix covers the visible head surface from the crown to the under-chin/head–neck junction. Eyes, lids, mouth, teeth, skin and hair have companion matrices. Internal skull, brain, sinuses and middle/inner ear cannot be recovered from external face measurements and are not implied by an external likeness editor.

The person should see a small set of visual choices first. Every number is optional. The detailed matrix is the shared definition behind the editor, so new people supply data to one implementation; a developer does not write a new face generator for each person. A finite collection of measurements cannot uniquely specify an arbitrary head surface. Local contours, asymmetry and optional imported/sculpted geometry are therefore first-class parts of the design.

## A person-facing route

1. **Overall shape:** adjust head width, front-to-back shape and face height while looking at front and side views. “Keep this for now” is always available.
2. **Main features:** choose Cheeks and jaw, Nose, or Ears. Start with the few broad controls in that group; open **More detail** only when needed.
3. **Make it yours:** offer **Adjust by eye**, **Enter a measurement**, or **Match a reference** on the same feature. No anatomy vocabulary quiz is required.
4. **Check around the head:** show front, both sides, back, above and below, then a continuous orbit. A missing reference means **Not checked from this angle**, not a presumed match.
5. **Check differences:** **Edit both together** and **Edit left/right separately** use the person's left/right, labelled on the preview. Linking edits must not delete previously saved differences without an undoable explicit action.

Example card: **Nose width — how wide your nose is at its widest outer edges.** The diagram marks two points; a front view is suggested. Buttons: **Narrower / Wider**, **I have a measurement**, **Keep this for now**. The numerical route asks for units and how the measurement was obtained. A helper or validated 3D capture is appropriate for exact breadths; a tape laid across curved skin is not a straight width. No user is asked to measure inside a nostril or ear canal.

“Round,” “long,” “square” and similar names may describe editable visual starting points. They do not partition humanity, impose attractive proportions or lock other traits. Age, ancestry, sex, gender, body fat and nationality never determine an individual's nose, ears or jaw. The schema can represent different life stages; existing adult assets do not certify child or infant likeness. A supported age-appropriate asset and separate validation are required before offering those renderings.

## Measurement and control language

All rows are optional. Missing values are `null`, never zero, a population average or an implicit measured value. Store input method, uncertainty when known, pose, observation date, side and definition version with the value. Keep **entered value**, **rendered value** and **difference** separate. An unsupported measurement can be retained as recorded data without claiming it changed the mesh.

| Mark | Meaning in the tables | Display and validation |
| --- | --- | --- |
| V | Visual control with illustrative endpoints | No physical units or biological percentile. Show a plain-language comparison and live effect. |
| P | Editable surface contour or localized shape patch | A curve/patch on the head, with stable attachment coordinates and an optional reference. Not a single “shape percentage.” |
| M | Optional measurement with the exact construction stated | Store millimetres; display mm/cm/in as chosen. A value from an unscaled photo remains a visual estimate. |
| A | Optional angle with a specified construction | Degrees, only with defined landmarks, axes and pose. Otherwise use V. |
| C | Presence or authored variant | Explicit choice including unknown; absence is not encoded as a zero-sized normal feature. |

`L/R` means the same ID accepts separate `left` and `right` observations, not that two mirrored IDs are required. `Whole` applies to a shared extent. `Midline` permits displacement/asymmetry; it does not force the feature onto an ideal centre line. Neither “separately editable” nor two independent input fields means the surrounding anatomy can intersect or ignore its attachments.

Measurements use relaxed neutral identity shape, a recorded jaw-rest state, no imposed smile, and hair excluded from the skin surface. Store camera/head pose separately. Three-dimensional straight distance, planar projected width, along-surface curve length and tape circumference are different definitions and must never be silently interchanged. Source measurements identified through palpation are not interchangeable with visually identified surface landmarks: FaceBase specifically warns about this distinction and about unreliable surface localization of gonion, the jaw-angle landmark. [FaceBase technical notes](https://www.facebase.org/resources/human/facial_norms/notes/).

For the engineering constructions below, store a versioned head frame: X toward the person's left, Y upward in the recorded neutral orientation, Z forward, with origin at the midpoint of the two marked tragion skin landmarks in front of the ears. Store the rigid transform and the landmarks used to establish it; do not re-estimate the frame after each feature edit. A 3D asset's arbitrary axis orientation is not itself an anatomical reference plane. Photo-only views cannot supply this calibrated frame.

For measurements defined on a region, the asset manifest must provide the named region boundary, landmark locations/uncertainty, and a repeatable extraction method. If these are unavailable, the field has V support only. These are proposed engineering definitions, not a replacement anthropometric standard. Existing records with a different protocol retain their original definition.

## Head, forehead and facial envelope

Each identifier below names one control. A curve can have multiple editable points under its one versioned contour schema. “More detail” contains rows not needed for the first pass.

| Stable ID | User label and visible effect | Input and precise meaning | Useful views | Side |
| --- | --- | --- | --- | --- |
| `head.width` | Head width | V; optional M = maximum X span of the hair-free cranial-vault region, excluding ears and facial cheek/jaw regions; region version required | Front, top, rear | Whole |
| `head.depth` | Front-to-back head size | V; optional M = maximum Z span of the same vault region, excluding nose and facial projection | Both profiles, top | Whole |
| `head.height` | Top of head to chin | V; optional M = Y difference between hair-free crown maximum and the lowest marked chin-surface point in the saved frame | Front, profile | Whole |
| `head.circumference` | Distance around the head | M only when the actual tape route/protocol is supplied; for model matching use the same recorded closed path. A generic circular formula from width is not acceptable | Front, side, rear | Whole |
| `head.crown_height` | How high the crown sits | V; moves crown above the upper face independently of face height | Profiles, rear | Whole |
| `head.crown_contour` | Shape across the top | P = hair-free top silhouette/surface contour, with editable flattening or fullness | Top, front, rear | L/R |
| `head.rear_projection` | How far the back of the head extends | V; moves occipital surface independently of face projection | Profiles, top | Whole |
| `head.rear_contour` | Shape at the back of the head | P; preserves left/right flattening or fullness rather than a mandatory ellipse | Rear, top, profiles | L/R |
| `head.side_contour` | Shape above and behind each ear | P on the side-of-vault surface | Profiles, rear, top | L/R |
| `face.height` | Nose root to bottom of chin | V; optional M = straight 3D distance between the documented surface nose-root and chin-underturn points; endpoint protocol required, not hairline-to-chin | Front and profile | Whole |
| `face.upper_height` | Nose root to nose base | V; optional M = straight 3D distance between the same root point and nose/upper-lip junction; shares the nose-height observation rather than a second independent lock | Front and profile | Whole |
| `face.lower_height` | Nose base to bottom of chin | V; optional M = straight 3D distance between that junction and chin-underturn point | Front and profile | Whole |
| `face.width` | Width across the cheeks | V; optional M = X span of the specified cheek region at its widest surface section; label as surface breadth, not palpated bone breadth | Front, obliques | Whole |
| `face.profile_contour` | How the face projects from the head | P = forehead-to-chin profile curve with nose/lip/chin points identified; supports midface projection separately from nasal length | Both profiles | L/R |
| `face.center_offset` | Face shifted slightly to one side | V; regional midface displacement relative to saved head frame, distinct from camera turn | Front, top | Midline |
| `forehead.visible_height` | Hairline to brow area | V; optional M = Y distance from marked central hairline to marked brow-reference level. Unavailable if hairline absent/hidden; never substitutes for bony forehead height | Front, profiles | Midline |
| `forehead.width` | Width of the forehead | V; optional M = X distance between user-confirmed temple-transition marks at a saved Y level | Front, top | Whole |
| `forehead.slope` | Forehead leaning back or upright | V; advanced A = profile angle between saved upper/lower forehead contour landmarks and Y axis; use same fixed marks and frame | Profiles | Midline |
| `forehead.roundness` | Forehead flatter or more rounded | V; surface bulge independent of overall slope | Profiles, grazing light | L/R |
| `forehead.brow_ridge` | Ridge above the eyes | V; bony-surface appearance independent of eyebrow hair or raised-brow expression | Front, profiles, obliques | L/R |
| `forehead.center_relief` | Shape between the eyebrows | P for glabella/nose-root transition; static identity separated from frowning | Front, obliques, profile | Midline |
| `temple.fullness` | Temples hollow or full | V; lateral forehead-to-cheek transition | Obliques, front, top | L/R |
| `temple.contour` | Detailed temple outline | P; supports local indentation/bulge without moving ear roots | Top, profile | L/R |

Head circumference does not determine depth, width or crown shape uniquely. Full face height and its component distances are also not automatically additive when they are straight 3D chords. Derive a requested ratio from matched definitions; never “correct” the source records to enforce a textbook face-third pattern.

## Cheeks, jaw, chin and underside

| Stable ID | User label and visible effect | Input and precise meaning | Useful views | Side |
| --- | --- | --- | --- | --- |
| `cheek.bone_width` | Cheekbones farther apart | V; lateral prominence distinct from soft-cheek volume; M requires a separately named palpated or validated surface method | Front, top, obliques | L/R |
| `cheek.projection` | Cheekbones flatter or more prominent | V; forward prominence without automatically widening the face | Obliques, profiles | L/R |
| `cheek.height` | Cheekbone prominence higher or lower | V; vertical position of the visible cheek prominence | Front, obliques | L/R |
| `cheek.upper_fullness` | Fullness below the eye | V; separate from eyelid contour and transient squint | Front, obliques, profile | L/R |
| `cheek.lower_fullness` | Fullness beside the mouth | V; buccal contour, not inferred from body-fat percentage | Front, profile | L/R |
| `cheek.hollow` | Hollow below the cheekbone | V; localized hollow, not a global narrowing control | Obliques, grazing light | L/R |
| `cheek.nose_fold` | Fold beside the nose and mouth | P = nasolabial crease route/depth appearance at rest; expression folds add separately | Front, obliques | L/R |
| `cheek.dimple` | Cheek dimple | P = optional location/shape at rest; expression-dependent depth is a separate behavior | Front, obliques, smile | L/R |
| `jaw.width` | Width at the back of the jaw | V; M only with a named, repeatable protocol for the chosen jaw-corner landmarks. Do not label a photo guess as bigonial breadth | Front, below | Whole |
| `jaw.corner_height` | Jaw corner higher or lower | V; placement of visible rear jaw turn | Profiles, front | L/R |
| `jaw.corner_shape` | Rounded or angular jaw corner | P; visible soft-tissue contour, distinct from a radiographic mandibular angle | Profiles, obliques, below | L/R |
| `jaw.side_fullness` | Fullness at the side of the jaw | V; static outer contour; clenching pose must not rewrite identity | Front, profiles | L/R |
| `jaw.lower_edge` | Shape along the jawline | P; includes local jowl contour, dips and sides joining the chin | Front, profiles, below | L/R |
| `jaw.forward_position` | Lower jaw farther forward or back | V; resting identity relationship to upper face, not current jaw-forward animation or a bite diagnosis | Profiles, below | Whole |
| `jaw.rest_offset` | Resting lower jaw shifted sideways | V; asymmetric rest shape separate from transient jaw movement | Front, below | Midline |
| `chin.width` | Chin width | V; optional M = X span between marked chin-side boundaries on a versioned transverse section; not an unspecified maximum | Front, below | Whole |
| `chin.height` | Chin height | V; optional M = Y separation of marked lower-lip/chin groove and bottom chin point in the saved frame | Front, profile | Whole |
| `chin.projection` | Chin farther forward or back | V; optional M = Z difference between forward-most chin landmark and nose-base landmark. This reference-specific signed offset is not a clinical projection score | Profiles | Midline |
| `chin.tip_contour` | Chin rounded, flat or pointed | P; supports contours between illustrative options | Front, profiles, below | L/R |
| `chin.cleft` | Cleft or dimple in the chin | P; optional location and contour rather than a binary inherited-type claim | Front, below, grazing light | Midline |
| `chin.lip_groove` | Fold below the lower lip | P; labiomental transition; keep lip closure and lower-lip projection coherent | Profiles, obliques | Midline |
| `chin.offset` | Chin slightly to one side | V; independent of global head turn | Front, below | Midline |
| `chin.underside_fullness` | Fullness under the chin | V; submental surface envelope independent of beard and body-fat estimate | Profiles, below | L/R |
| `chin.underside_contour` | Under-chin shape | P; continuous underside and lateral jaw-to-neck attachment, no cut-off cap | Below, profiles, head turn | L/R |
| `head.neck_junction` | Where the head joins the neck | P; behind ears, nape and under-jaw transition for continuity only; neck/body controls stay in their own registry | Rear, profiles, below | L/R |

A fixed rest profile can reflect bone, muscle, fat and skin together. External editing does not identify which tissue caused the observed surface. Identity controls must not infer muscle size, health, hormone state or weight changes from a facial outline. Resting folds may be retained without compulsory aging presets. Smile folds and jaw motion require contact-aware correctives on top of the selected shape.

## Nose

The simple card exposes **Width**, **Length**, **Bridge profile**, **Tip shape** and **Tip direction**. More detail exposes the remaining rows. “Length” must select an explicit definition on the measured route: nose height, bridge chord and forward projection are different dimensions. The primary 3D Facial Norms paper distinguishes these landmark distances; a labelled line drawing is essential to avoid swapping them. [Weinberg et al., 3D Facial Norms repository methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC4841760/).

| Stable ID | User label and visible effect | Input and precise meaning | Useful views | Side |
| --- | --- | --- | --- | --- |
| `nose.height` | Nose root to nose base | V/M = straight distance between documented surface root and nose/upper-lip junction; alias the `face.upper_height` observation | Front, profiles | Whole |
| `nose.bridge_length` | Bridge length | V/M = straight chord from documented root to tip landmark; not length along the curved bridge | Profiles, obliques | Whole |
| `nose.projection` | How far the nose sticks out | V/M = straight nose-base-to-tip chord, labelled with these endpoints. A Z-only forward offset is a distinct derived metric | Profiles, below | Midline |
| `nose.width` | Width at the widest outer edges | V/M = straight distance between the widest outer nasal-wing landmarks, neutral rest | Front, below | Whole |
| `nose.root_height` | Bridge starts higher or lower | V; moves root location without shifting eye position | Front, profiles | Midline |
| `nose.root_depth` | Dip where nose meets forehead | V; preserves distinction between marked nose root and deepest visible dip | Profiles, obliques | Midline |
| `nose.bridge_width` | Bridge narrower or wider | V; optional M = X span at a user-confirmed cross-section stored along root-to-tip route | Front, obliques | Whole |
| `nose.bridge_profile` | Bridge straight, curved in or curved out | P; central profile spline, not a forced straight/concave/convex category | Both profiles | Midline |
| `nose.bridge_sidewalls` | Shape along the sides of the bridge | P; controls sidewall contour without making a sharp rectangular ridge | Front, obliques | L/R |
| `nose.centerline` | Nose straight or slightly to one side | P; editable frontal centreline, distinct from camera pose | Front, below, top | Midline |
| `nose.tip_width` | Nose-tip width | V; optional M = X span of versioned tip region at marked section | Front, below | Whole |
| `nose.tip_fullness` | Nose tip fuller or more defined | V; soft contour independently of bridge width | Front, profiles, below | L/R |
| `nose.tip_direction` | Tip turns up or down | V; no unqualified “tip angle” in degrees. Advanced angle would require its own landmarks and reference rays | Profiles, below | Midline |
| `nose.tip_contour` | Detail across the nose tip | P; supports broad/rounded/divided or uneven tip surfaces | Below, front, obliques | L/R |
| `nose.supratip_contour` | Transition just above the tip | P; visible dip/fullness between bridge and tip | Profiles, obliques | Midline |
| `nose.wing_flare` | Nasal wing spreads outward | V; static alar contour separate from animated flare | Front, below | L/R |
| `nose.wing_height` | Height of the nasal wing | V; side-specific rim/cheek relationship | Front, profiles, below | L/R |
| `nose.wing_thickness` | Thickness of the nostril rim | V; silhouette-changing wall thickness needs geometry, not a shadow texture | Below, low oblique | L/R |
| `nose.wing_attachment` | Where the wing joins the cheek | P; alar crease route and base attachment | Obliques, profiles, below | L/R |
| `nose.nostril_contour` | Nostril opening shape | P; independent closed aperture outline in the local rim plane; permits asymmetric openings | Below, low obliques | L/R |
| `nose.nostril_width` | Width of the opening | V; optional M = maximum side-to-side span of the aperture projected into its stored local rim plane, with scale and full rim visibility | Below | L/R |
| `nose.nostril_length` | Front-to-back opening size | V; optional M = extent perpendicular to the width axis in that same local plane; not interior airway length | Below | L/R |
| `nose.nostril_orientation` | Direction of each nostril | V; advanced A = opening's major-axis angle to the stored local forward axis; undefined for nearly circular apertures | Below | L/R |
| `nose.columella_width` | Width of the strip between nostrils | V; optional M = cross-sectional span at a marked station on that strip | Below, front | Midline |
| `nose.columella_show` | How much of that strip shows from the side | V; relation between central lower nose surface and each alar rim | Profiles, below | L/R |
| `nose.base_transition` | Nose-to-upper-lip transition | P; junction contour coordinated with philtrum and lip projection | Profiles, low obliques | Midline |
| `nose.vestibule` | Visible depth inside the nostrils | C/P = supported visible interior geometry; no home depth measurement and no inferred full nasal cavity | Below, low obliques | L/R |

Keep authored nostril thickness, rim contact and a continuous visible vestibule through expressions. A historical “8–10 mm interior cap” is a rendering shortcut, not a universal nasal anatomy measurement. It must be deep enough for the supported views without pretending that its depth reconstructs an individual's airway.

## Ears

The simple card offers **Size**, **Stick out**, **Tilt** and **Lobes**. A global size action is a linked edit of length/width with a visible link indicator; it is not a new measurement that competes with them. The detailed structure must remain visible from behind as well as from the face. Ear measurement methods differ, including the reference surface used for protrusion, so one unlabeled “ear angle” is insufficient. The cited methods study uses a cadaver head and compares measurement approaches; it supplies neither universal living-ear ranges nor a novice measurement accuracy guarantee. [Three-dimensional auricle measurement study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11087560/).

| Stable ID | User label and visible effect | Input and precise meaning | Useful views | Side |
| --- | --- | --- | --- | --- |
| `ear.presence` | Ear present, partial or absent | C; supported structural variant/prosthesis references; do not shrink a normal ear to zero | Profiles, front, rear | L/R |
| `ear.length` | Ear top to bottom | V/M = straight 3D distance from topmost to bottommost external-ear points in its stored orientation | Profiles, rear | L/R |
| `ear.width` | Ear front to back | V/M = extent perpendicular to the length axis within the fitted ear plane; reference plane/version recorded | Profiles | L/R |
| `ear.vertical_position` | Ear sits higher or lower | V; optional M = Y of marked upper ear-root attachment relative to the saved head origin | Front, profiles, rear | L/R |
| `ear.forward_position` | Ear farther forward or back | V; optional M = Z of same attachment relative to saved origin | Profiles, top | L/R |
| `ear.protrusion_upper` | Upper ear sticks out | V; optional M = perpendicular distance from marked upper rim to locally fitted scalp patch behind it; patch/version recorded | Front, rear, top | L/R |
| `ear.protrusion_middle` | Middle ear sticks out | V; same construction at the marked tragus-level rim, independently of upper/lower ear | Front, rear, top | L/R |
| `ear.protrusion_lower` | Lower ear sticks out | V; same construction at a marked lower rim/lobe level | Front, rear, below | L/R |
| `ear.tilt` | Ear tilts forward or backward | V/A = angle of top-to-bottom ear axis projected onto YZ plane relative to Y, with direction convention recorded | Profiles | L/R |
| `ear.outer_contour` | Outline of the ear | P; includes folded, pointed, notched or locally thickened outlines where assets support them | Profiles, rear | L/R |
| `ear.helix_roll` | Rolled outer rim | V; helix rim relief/thickness | Profiles, obliques, rear | L/R |
| `ear.antihelix` | Raised inner ridge | P; antihelix and upper branches, independently shaped | Profiles, obliques | L/R |
| `ear.scapha` | Groove inside the outer rim | P; channel between helix and antihelix | Profiles, obliques | L/R |
| `ear.triangular_fossa` | Small upper hollow | P; hollow between upper antihelix branches | Profiles, obliques | L/R |
| `ear.concha` | Bowl in the middle of the ear | P; upper/lower bowl shape and visible depth | Profiles, obliques | L/R |
| `ear.tragus` | Small flap in front of the opening | P; local contour independent of the whole-ear silhouette | Profiles, front oblique | L/R |
| `ear.antitragus` | Small bump above the lobe | P; coordinated with adjoining notch | Profiles, low obliques | L/R |
| `ear.intertragic_notch` | Notch above the lobe | P; gap between tragus/antitragus, not a painted dark triangle | Profiles, low obliques | L/R |
| `ear.lobe_length` | Lobe length | V; optional M = distance from marked lowest cartilage/lobe transition to lobe tip along stored ear-length axis; missing transition means unknown | Profiles, front, rear | L/R |
| `ear.lobe_width` | Lobe width | V; optional M = maximum span of defined lobe region perpendicular to ear-length axis | Profiles, front | L/R |
| `ear.lobe_attachment` | Lobe joined to cheek or hanging free | P; continuous attachment boundary with illustrative examples, not a simple inherited binary | Profiles, front, rear | L/R |
| `ear.lobe_fullness` | Lobe thin or full | V; volumetric contour independent of length | Profiles, front, rear | L/R |
| `ear.posterior_attachment` | Fold and attachment behind the ear | P; rear auricular surface and groove; must not float off the scalp | Rear, top, profiles | L/R |
| `ear.canal_entrance` | Visible ear opening | C/P; visible entrance and shallow shaded interior only; no instrument insertion or home canal depth entry | Profile, oblique | L/R |
| `ear.modification` | Piercing, stretched lobe or other change | C/P; accessory or structural variant has its own placement/attachment; not destructive editing of original observation | All local views | L/R |

A published 3D ear study measured 25 dimensions in 326 participants from two sampled groups; its observed variation within groups reinforces the need for individual editable ears. It is not global coverage or a licence to use participant scans as avatar assets. [Lee et al., 2018](https://pubmed.ncbi.nlm.nih.gov/29989490/).

## Constraints that the shared engine must enforce

| When a person changes… | Recompute together | Preserve or explain |
| --- | --- | --- |
| Head width/depth/crown | Scalp, hair roots, temple/ear attachment frames and head joint fit | Keep nose, mouth and eye measurements locked where requested; report a conflicting combination rather than overwrite it |
| Cheekbone/temple/jaw shape | Neighbouring skin transitions and jaw pivot fit | Bone-looking and soft-tissue-looking controls remain separately editable; no body-fat-to-nose-length rule |
| Jaw/chin rest shape | Lower lip, lower dental arch, tongue/cavity and under-chin junction | Upper teeth stay attached to upper face; transient jaw opening remains a separate pose |
| Nose base/tip/nostril | Rim thickness, vestibule, upper-lip/philtrum transition | Keep both nostril observations and report occlusion/unsupported folds; never silently mirror |
| Ear shape/position | Front/rear attachment, local scalp, accessories and hair avoidance | Ear measurements do not rescale eyes or facial width |
| A measured lock | Solve supported shape basis, then measure achieved surface | Retain original measurement, method and uncertainty; display residual and any tradeoff |
| A local contour or structural variant | Region topology, attached details, deformation and LOD correspondence | Keep prior values and support undo; out-of-basis shape needs an authored/imported variant, not a fabricated success label |

The implementation should resolve measurements as constraints on an authored shape basis, with optional contour fitting. It must not convert each measurement independently to a morph percentage and assume the result fits. Check dimensions after shape resolution; expression/pose checks are separate states. Asset switches keep unsupported input values in the record. No ethnicity switch, face-type bucket or generic anatomical average supplies missing personal data.

All proposed controls need capability metadata by asset and LOD: `supportedVisual`, `supportedMeasured`, `recordedOnly`, or `unsupported`, plus definition/calibration versions and valid combinations. “Measured” means the measurement extraction and fitting are tested for that method; it is not an accuracy certification of the input reference. Exact data shape and application integration belong to the shared architecture document.

## Views, uncertainty and acceptance

| Review view | What it must establish | Common missing evidence |
| --- | --- | --- |
| Front | Face proportions, nasal width, jaw/chin outline, ear heights and asymmetry | Forward projection and rear skull remain unseen |
| Left and right profiles | Forehead/nose/lip/chin contour, ear position, crown/rear depth, under-chin | One profile cannot certify the opposite side |
| Left and right obliques | Cheek projection, nose sidewalls, temple and ear contact | Lens/perspective mismatch can resemble a shape error |
| Rear | Rear skull, both posterior ears and nape junction | Hair can hide all of the relevant skin geometry |
| Above | Vault width/depth, asymmetry, nose centreline and ear protrusion | Hairstyle volume is not head-surface size |
| Below | Nostril apertures, columella, jaw/chin underside, lobe attachment | Tilt and shadow affect the apparent opening shape |
| Continuous orbit and head turn | Silhouette between checkpoints and attachment continuity | A few good stills do not certify arbitrary angles |
| Neutral, smile, jaw open and asymmetric motion | Shape survives deformation; oral/eye contacts assessed with their matrices | Static fitting cannot establish expression accuracy |

Close-range photography can change apparent facial proportions. A primary study varied camera distance and focal length in 12 volunteers and found distortion at short selfie distances; it does not give every phone a universal correction factor. Capture guidance should ask for a consistent camera, a greater working distance where practical, unfiltered images and recorded uncertainty. A ruler in one plane does not calibrate every depth plane of a perspective photo. [Derakhshan et al., 2024](https://pubmed.ncbi.nlm.nih.gov/37543968/).

For a measured reference, report per-region landmark residuals, profile/silhouette discrepancy and registered surface error where the reference actually supplies a surface. Record repeatability separately from fitting error, and retain masked/unseen regions. No single universal millimetre threshold is established here. For visual references, report matched-view review without inventing mm accuracy. Unseen, occluded and unsupported are distinct statuses.

Coverage fixtures must include asymmetry; full and flat rear/crown shapes; varied forehead and midface projection; cheek/jaw/chin combinations; broad/narrow noses with differing projection and nostril shapes; attached/free and asymmetrical lobes; protruding/folded/partial ears; older-adult surface changes; and individual modifications. These are structural test cases, not population stereotypes. Congenital differences, trauma, surgery and prostheses need optional variants or a custom geometry route with explicit unsupported states until the asset work passes. No anatomical pattern is declared universal merely because it fits the base model.

## Source-check scope

Sources were checked on 2026-10-24. The source-backed claims are the short linked statements above. Matrix IDs, UI choices, frame conventions, region constructions and acceptance rules are this project's proposed engineering contract. They are not a copied clinical measurement standard or a source-validated complete parameterization.

| Source | Material inspected | Permitted use here |
| --- | --- | --- |
| FaceBase technical notes | Official protocol, landmarking and measurement sections | Method incompatibility and surface-landmark uncertainty |
| Weinberg et al., repository paper | Primary paper and indexed measurement table | Distinguish nasal distances; no cohort averages imported |
| 3D auricle algorithm paper | Primary methods and parameter definitions | Explicit ear reference surfaces; no population range |
| Lee et al., ear dimensions | PubMed abstract of primary study | Sample-specific multidimensional ear variation only |
| Derakhshan et al., photography | PubMed abstract and publisher methods/discussion | Short-distance photographic distortion and study limitations |

## Existing-document findings for integration

This specialist audit inspected the complete text of `13-face-studio-review.md`, `15-model-measurements-and-clone-isolation.md`, `19-face-hair-diversity/audit-and-realism.md`, `MORPH_TARGET_TABLE.md`, `BLENDER_PRIORITY_FIXES.md`, `BLENDER_HUMANOID_CHECKLIST.md` and `humanoid-glb-quick-checklist.md`; it inspected relevant sections of `03-anatomy-spec.md`, `coverage.md`, `HUMAN_REALISM_AND_MEASUREMENT_PLAN.md`, `humanoid-glb-spec.md`, and the `Claude/` copies, plus the research README/proposal portions available in the parent audit. It did not rerun the renderer or certify current asset bytes.

| Existing statement or omission | Required interpretation/correction |
| --- | --- |
| `03-anatomy-spec.md` labels jaw/chin and oral assembly “absent” in generated historical tables | Date those tables as the original asset audit. Later runtime jaw/oral repairs are documented in 13; structural authored assets and preview behavior are different capabilities. Update the generating data if changing generated rows |
| `03` gives 32 adult teeth as the description of a real mouth | Treat 32 as a full permanent dentition including third molars, not a compulsory count; missing teeth/restorations and varied dentition need explicit support |
| `03` drives cranium by face width/height/circumference; forehead largely by face height; ears by length/width/prominence | These channels do not cover rear/crown/temple shape, independent forehead slope, ear internal/posterior detail or local asymmetry |
| `03` prescribes 8–10 mm of nostril interior | Rendering shortcut only; not an individual's measured nasal cavity or a universal anatomical depth |
| Current `MORPH_TARGET_TABLE.md` links nose length/jaw angle to body fat, cheekbone width to body fat/shoulders, forehead/temples to circumference | Describe these as historical heuristic mappings; they are not empirical personal anatomy equations. Independent intent and measured fitting take precedence in the new contract |
| `Claude/MORPH_TARGET_TABLE.md` and `Claude/ClaudeUpdated.md` say eight face channels are never computed and head circumference is undeclared | Historical copies disagree with the later canonical table and checklist; mark historical and link current contract rather than revive those bugs without a code check |
| `BLENDER_HUMANOID_CHECKLIST.md` calls 234 vertices/416 triangles/1 joint/0 textures the “Current asset baseline” | Historical placeholder baseline, incompatible with 13's later articulated preview figures; date and identify asset/hash before treating any counts as current |
| Quick checklist says keep the mesh symmetrical; other docs require individual asymmetry | Symmetric base topology can simplify authoring, but saved identity and deformed geometry must support asymmetry |
| `humanoid-glb-spec.md` gives fixed loop counts and “ear shells”; checklist treats oral parts as “if present” | Topology counts are starting guidance, not quality proof. Above-neck close-ups require actual ear interiors/posterior attachments and visible oral anatomy under supported motion |
| `HUMAN_REALISM_AND_MEASUREMENT_PLAN.md` describes 14 readings in a separate plan-preview face solver and population norms bounding sliders | Numerical success against that preview's landmarks is not personal calibration or universal coverage. Preserve out-of-range user data; expose asset limits. Keep the HTML prototype distinct from the application renderer |
| `15` reports chest/waist/hip contour checks | Useful infrastructure precedent, not a head-measurement implementation or fit solver |
| The research packet lists many traits but no plain-language per-field endpoint/view protocol | This matrix supplies the proposed control definitions; diagrams, calibration, authored assets and novice usability checks still have to be built |

This document strengthens feature coverage and measurement semantics. It does not claim every human head can already be represented, that reference collection is complete, or that a flawless personal reconstruction follows from a small matrix.
