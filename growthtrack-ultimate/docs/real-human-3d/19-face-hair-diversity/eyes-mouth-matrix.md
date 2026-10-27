# Eyes, brows, lips and mouth: a person-editable matrix

Reviewed 2026-10-24. **Research and proposed data/asset contract; the full matrix is not implemented.** This extends the [head customization architecture](head-system-architecture.md) and [implementation proposal](implementation-proposal.md). It specifies reusable controls for each person, not code written after receiving one person's measurements. The current application has partial eye appearance, facial morph, blink and procedural mouth support; those do not implement the definitions below. See the [implementation record](implementation-progress.md) for the later authorised continuation.

The beginner sees pictures, ordinary labels, a live preview and **Not sure**. They do not see anatomical abbreviations, gene names, percentages of realism or a spreadsheet of mandatory dimensions. Physical measurements are optional. A handful of distances cannot identify an entire eye or mouth: contours, depth, surfaces and motion remain separate information. No adult template is certified to represent every person, child, dentition, disability, reconstruction or prosthesis.

## The short path a person uses

1. Tap **Eyes**. First controls are **Space between eyes**, **Eye opening**, **Outer corners**, **Eyelid fold** and **Eye colour**. A small diagram identifies exactly what moves. A single “eye size” control must not silently change globe diameter, eyelid opening and iris diameter together.
2. Tap **Brows and lashes**. Choose a brow outline, position and hair appearance. The brow's hair outline and the bone ridge beneath it are different controls. Offer **No hair** and independent left/right choices.
3. Tap **Lips**. First controls are **Mouth width**, **Upper lip**, **Lower lip**, **Top lip curve** and **Lip colour**. Advanced controls reveal projection, corners and small contour details.
4. Tap **Smile and teeth** only if wanted. Select a starting dental arrangement; tap an individual tooth to change it, mark it missing or choose a restoration. No requirement to know dental numbering or to enter a tooth count.
5. Review front, both obliques and both profiles, then try a blink, smile and comfortable mouth opening. Save identity separately from the test expression. Every step may be skipped; unedited features retain a labelled starting value, not a claim to be measured.

**Same on both sides** is an editing convenience. Turning it off reveals the person's own left/right values. Re-enabling it previews the proposed copy before replacing either side. Mirrored selfies must be labelled; **Your left** means the subject's anatomical left, not the viewer's screen left. Keyboard fields and selectable view buttons must provide the same adjustments as dragging. No required animation, colour-only instruction or image-only label.

## Shared reading and measurement rules

All rows are optional proposed fields. Each record stores `id`, a separate `side` where applicable, `value`, `valueType`, `method`, `referenceId`, `poseId`, uncertainty, and definition version. A blank value is unknown, never zero. `notApplicable`, `notVisible`, `notMeasured` and `unsupportedByAsset` have different meanings. An actual zero (for example a gap of zero) remains valid. These names are specification vocabulary; the shared architecture owns the final serialization.

- **V — visual choice:** labelled examples or a continuous shape adjustment. It has no physical unit and no population percentile. More/less means a preview direction, not better/worse.
- **M — measurable:** an optional millimetre or degree field with the exact method below. Save whether it is a 3D straight-line distance, a projected image distance, a surface curve or an angle. These methods are not interchangeable.
- **A — authored structure:** an asset/contour choice or control requiring specialist fitting. Ordinary users choose by appearance; hidden anatomy is not reconstructed from a selfie.
- **P — preview pose:** transient blink, gaze, jaw or expression state. It must not overwrite identity. An optional saved pose is stored outside identity.

Use a relaxed face and a fixed, comfortably straight-ahead gaze for eye/lip identity observations; record mouth state explicitly. Do not force closed lips or a particular bite when that is not the person's resting state. A feature not visible in that state stays unmeasured. Numeric entry can use mm, cm or inches and convert once to canonical mm. A photograph without trustworthy scale and camera calibration supplies visual/projection evidence, not a true 3D millimetre measurement. Do not place rulers or calipers against eyes or inside the mouth; users may supply existing professionally obtained measurements or use visual matching.

**Measurement landmarks used below:** inner/outer eye corners are `en`/`ex`; mouth corners are `ch`; base of nose is `sn`; top and bottom outer lip borders at the middle are `ls`/`li`; relaxed lip junction is `sto`; the groove below the lower lip is `sl`; top-lip peaks are `cph`. These technical aliases are optional help text. The endpoint conventions follow the [FaceBase measurement definitions](https://www.facebase.org/resources/human/facial_norms/summary/), while proposed shape, UI and solver choices below are engineering decisions. A feature's named point can be unidentifiable; never invent a landmark merely to fill a form.

For this document, **front** is a head-aligned view with roll removed; **profile** is the relevant side; **oblique** is a three-quarter view; **dental** is a separately supplied dental reference or fitted dental mesh. Values taken from an image must also retain camera/view identity. The head coordinate frame is shared with the architecture; tooth-local frames and eye-local frames are declared explicitly by their assets.

## Eyes and eyelids

Eye capture research treats the sclera, cornea and iris as distinct but interacting structures. It does not support reproducing all eyes with one sphere radius and one colour. The following separation is a design inference from [Bérard et al., High-Quality Capture of Eyes](https://studios.disneyresearch.com/2014/11/19/high-quality-capture-of-eyes/), not a claim that this app implements that capture system.

| Stable ID | What the person sees | Type; optional definition | Views / essential dependency |
| --- | --- | --- | --- |
| `eye.innerCornerDistance` | Space between the inner corners | M: 3D distance `en L` to `en R`, mm; V alternative | Front. Distinct from pupil spacing and nose width. |
| `eye.outerCornerDistance` | Width across both eye openings | M: 3D distance `ex L` to `ex R`, mm | Front. Redundant constraints can disagree; report residual rather than changing saved input. |
| `eye.pupilCentreDistance` | Space between the pupil centres | M: apparent centre-to-centre distance in the calibrated frontal projection, mm, with gaze/distance recorded | Front, straight-ahead gaze. Not interchangeable with globe-centre spacing or corner spacing. |
| `eye.placement` | Move this eye | V/A; explicit subfields `horizontal`, `vertical`, `depth`; M only for fitted globe-centre coordinates in a declared head frame | Side per eye; front and both obliques/profile. Socket, lids and wet surfaces must refit together. |
| `eye.globeShape` | Eye shape inside the lids | A; explicit fitted `horizontalDiameterMm`, `verticalDiameterMm`, `depthMm` and asset reference; unknown by default | Advanced fitted asset only. A visible opening does not measure hidden globe dimensions. No universal 24-mm constraint. |
| `eye.corneaShape` | Clear front of the eye | A; fitted surface asset and documented optical approximation | Profile/oblique highlights. No beginner radius input; must meet sclera and preserve intended iris appearance. |
| `eye.irisVisibleDiameter` | Size of the coloured part | V; M: apparent horizontal visible limbal diameter in a calibrated front view, mm, only if both edges are observed | Per side. Do not label apparent diameter as internal anatomical iris diameter; lids may hide borders and corneal optics affect appearance. |
| `eye.irisColour` | Eye colour | V: swatches plus custom colour; per side | Neutral-light front. Save source colour separately from scene exposure. |
| `eye.irisPattern` | Flecks, rings and colour patches | V/A; explicit `radialPattern`, `innerRing`, `outerRing`, `sectorPatches`, `seed`, optional reference texture | Per side; allow different eyes and sectors within one iris. Seed must not move across sessions. |
| `eye.scleraAppearance` | White of the eye | V; explicit `baseColour`, `vesselVisibility`, `localPatches`, `roughness` | Per side. Not restricted to pure white; no diagnosis generated from a colour. |
| `eye.presence` | Natural eye, prosthetic eye, or other supported appearance | A: optional asset state and custom asset reference | Per side. Missing/altered structures require appropriate topology, not a zero scale on a normal eye. Unsupported state stays saved. |
| `lid.openingWidth` | Width of this eye opening | M: `en` to `ex` 3D distance, mm; V alternative | Per side, neutral front. The lid endpoints, not the iris diameter. |
| `lid.openingHeight` | Height of this eye opening | M: front-plane vertical separation of upper/lower lid margins on the line through the apparent pupil centre, mm; V alternative | Per side, same fixed gaze and pose. Projected definition, not a 3D chord or maximum opening at any point. |
| `lid.cornerTilt` | Outer corner lower or higher | V; M: front-plane angle of inner-to-outer corner vector against local outward horizontal, degrees, positive when outer corner is higher | Per side. Head roll must be removed; sign convention is identical on both anatomical sides. |
| `lid.upperContour` | Shape of the upper edge | V/A: editable landmark-bound curve, from inner to outer corner | Per side, front/oblique. Allows flatter, rounder and nonuniform contours without changing the entire eye. |
| `lid.lowerContour` | Shape of the lower edge | V/A: independent landmark-bound curve | Per side, front/oblique. Preserve globe contact and corner continuity. |
| `lid.creaseVisibility` | Fold above the eye | V: no visible fold, partial, visible; continuously editable contour/visibility, not a compulsory binary anatomy | Per side, straight-ahead and downward-gaze references. Visibility and hooding are separate. |
| `lid.creaseHeight` | How high the fold sits | M: projected vertical distance from upper lash margin to chosen crease on the pupil-centre line, mm, in recorded pose; V alternative | Per side. Undefined if no crease is visible; do not encode absence as 0 mm. |
| `lid.creaseContour` | Shape and extent of the fold | V/A: curve and inner/outer termination | Per side; front/downward gaze. A single crease-height value cannot define this curve. |
| `lid.hooding` | Skin over the fold | V: local coverage/depth map | Per side, front/oblique/profile. Keep separate from crease presence and eye opening. |
| `lid.innerFold` | Skin fold at the inner corner | V/A: contour, extent and coverage | Per side; close front/oblique. Available without ancestry labels; do not conflate with the small moist corner structures. |
| `lid.marginThickness` | Thickness at the eye edge | V/A; upper/lower subfield; calibrated 3D thickness only from fitted geometry | Oblique/profile. Lash roots and tearline attach to the appropriate margin. |
| `lid.cornerDetail` | Small detail at the inner corner | A/V; explicit `caruncle`, `plica`, `punctaVisibility` | Per side. Preserve fitted moist surfaces; these are not holes through the eyeball. |
| `lid.tearFilm` | Shine along the lid edge | V/A; explicit `meniscusShape`, `wetness` | Upper/lower and side. Film must not float or become a duplicate oversized cornea. |
| `lid.underEyeContour` | Shape beneath the eye | V/A; explicit `hollow`, `fullness`, `foldContour` | Per side, front/oblique; skin colour/marks are separate appearance fields. |
| `lid.presence` | This lid's structure | A: upper/lower topology variant, alterations or fitted custom asset | Per side. Needed for scars, reconstruction or incomplete structures outside ordinary morph support. |
| `eye.gaze` | Look here | P: target or separate per-eye yaw/pitch; optional alignment offset outside shape | All views. Use fitted pivots; an explicit alignment difference must not be automatically “corrected.” |
| `eye.pupilPreview` | Pupil size for this preview | P: fixed apparent diameter or named cosmetic response mode | Per side; freeze for matching/capture. Renderer exposure is not retinal illumination; no physiological accuracy claim. |
| `lid.blink` | Close this eye | P: independently controllable L/R trajectory | Test partial and full closure. Closure target follows chosen anatomy and motion; do not erase an intentional visible gap to satisfy a generic template. |

The published 697-person Han Chinese eyelid study measures crease presence and reports limited prediction, not all eyelid contours or a rule for anyone's face. Thus the matrix includes independent fold, contour, hooding and side controls without DNA or ancestry inputs. [Wang et al.](https://pubmed.ncbi.nlm.nih.gov/33969445/) The eye-colour study likewise supports a complex trait, with much broader European than Asian sampling; it supplies no universal RGB palette. [Simcoe et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7946369/)

## Brows and lashes

The [hair and skin matrix](hair-skin-details-matrix.md) owns fibre length, thickness, density, curvature, direction, pigment, grey, dye and groom seeds. These controls point to the same records rather than create competing copies. Absence of brow or lash hair is a supported desired state. Cosmetics and extensions are removable layers.

| Stable ID | What the person sees | Type; optional definition | Views / essential dependency |
| --- | --- | --- | --- |
| `brow.outline` | Brow shape | V/A: upper/lower outline curves on the skin, inner/outer ends, arch anchor | Per side, neutral front/oblique. Bone prominence belongs to the head matrix. |
| `brow.position` | Move the brow | V/A; explicit horizontal/vertical placement in the brow skin frame | Per side, front/profile. Must follow forehead expression without rewriting neutral placement. |
| `brow.length` | Brow length | M: 3D surface curve from visible inner to outer endpoint, mm, with chosen centreline; V alternative | Per side, close front. Surface arc length is not endpoint chord length. Undefined when no visible brow. |
| `brow.bandThickness` | Brow thickness from top to bottom | M: projected thickness perpendicular to the centreline at a specified station (inner/middle/outer), mm; V alternative | Per side. This is the width of the hair band, not fibre diameter. |
| `brow.arch` | Arch height and position | V/A; explicit `height`, `positionAlongBrow`; optional mm only against declared endpoint baseline in frontal projection | Per side. Do not tie arch to gender or age. |
| `brow.gap` | Space between the brows | M: projected front distance between nearest visible inner hair endpoints, mm; V alternative | Negative overlap is not a required representation: use a connected growth mask when joined. |
| `brow.growthMask` | Gaps, joined centre or shaved sections | V/A: editable skin-bound mask | Per side/centre. Tattoos belong to an independent surface layer, not simulated fibres. |
| `hair.browGroom` | Brow hair | V/A: shared groom record described in the hair/skin matrix | Per side. Outline/position owned above; no automatic matching to scalp colour or density. |
| `hair.lashGroom` | Upper or lower lashes | V/A: shared groom record, separate side and upper/lower row | Front, closed-eye and profile. Root positions are parameterized along the lid margin; lashes follow deformation without passing through the globe. |

Research on eyelash airflow is evidence of a physical function, not a prescribed lash length for every person. A cross-species experimental ratio must not become a human editor bound or a beauty target. [Amador et al., Eyelashes divert airflow to protect the eye](https://pmc.ncbi.nlm.nih.gov/articles/PMC4387520/)

## Lips and the visible mouth

| Stable ID | What the person sees | Type; optional definition | Views / essential dependency |
| --- | --- | --- | --- |
| `mouth.width` | Mouth width | M: 3D distance `ch L` to `ch R`, mm; V alternative | Relaxed front. A smiling width is a different observation. |
| `mouth.position` | Move the mouth | V/A; explicit horizontal/vertical placement and neutral orientation | Front/profile. Keep dental assembly, nose base and chin constraints visible. |
| `mouth.cornerPosition` | Position of this corner | V/A: side-specific 3D offsets from the neutral mouth frame | Per side, front/oblique. Allows unequal corner height, depth and extension. |
| `lip.upperVisibleHeight` | Height of the coloured upper lip | M: `ls` to `sto`, mm, on a compatible relaxed reference; V alternative | Front. Keep actual measured method; upper lip skin height is a different quantity. |
| `lip.lowerVisibleHeight` | Height of the coloured lower lip | M: `sto` to `li`, mm, on the same compatible reference; V alternative | Front. Mouth opening changes the observed shape; do not reuse an open-mouth value as closed identity. |
| `lip.philtrumLength` | Space from the nose to the top lip | M: `sn` to `ls`, mm; V alternative | Front/profile; distinct from upper lip including its coloured part. |
| `lip.philtrumWidth` | Width between the top-lip peaks | M: `cph L` to `cph R`, mm; V alternative | Front. If peaks cannot be identified, retain a contour reference and leave measurement unknown. |
| `lip.upperSkinHeight` | Nose to the lip meeting line | M: `sn` to `sto`, mm | Front; can be redundant with other distances, not an extra independent unconstrained morph. |
| `lip.lowerSkinHeight` | Lower lip border to the groove below it | M: `li` to `sl`, mm | Front/profile; separate from lower vermilion height and chin height. |
| `lip.upperContour` | Shape of the upper lip | V/A: upper border and meeting-edge curves with side-specific anchors | Front/oblique. Includes top-lip curve, central notch and unequal peaks. |
| `lip.lowerContour` | Shape of the lower lip | V/A: lower border and meeting-edge curves | Front/oblique. A single fullness control cannot define the contour. |
| `lip.cupidBow` | Top lip curve | V/A; explicit `peakSpacing`, `notchDepth`, `peakRoundness` | Front/oblique. Zero/not visible remains a valid appearance, not an error. |
| `lip.philtrumRelief` | Groove and ridges above the lip | V/A; explicit groove depth and left/right column shape | Front/oblique/profile. Shape and colour stay separate. |
| `lip.upperProjection` | How far the upper lip comes forward | V/A: forward displacement in the fixed mouth/head frame; optional fitted surface M | Both profiles/obliques. No undeclared “ideal” nose–chin line. |
| `lip.lowerProjection` | How far the lower lip comes forward | V/A: independently defined forward displacement | Both profiles/obliques. Refits lip thickness/contact; does not move the lower dental arch automatically. |
| `lip.crossSection` | Roundedness and rolled-in edge | V/A; explicit upper/lower thickness, roll and central fullness | Profile/oblique. Requires real inner and outer lip surfaces. |
| `lip.cornerContour` | Shape at the mouth corners | V/A: side-specific contour, crease and local depth | Front/oblique. A crease is not the same as a smile pose. |
| `lip.chinGroove` | Groove below the lower lip | V/A: curve and relief | Both profiles/front. Shares its boundary with the chin matrix; one owner per surface region. |
| `lip.colour` | Lip colour | V: independent upper/lower and local patches | Neutral diffuse light; do not force “pink” or a fixed multiplier of face colour. |
| `lip.surface` | Lip lines and shine | V/A; explicit line pattern/scale, dryness appearance, inner wet edge and seed | Close-up. No baked highlight used as geometry. |
| `mouth.restState` | How the mouth rests | A/V: relaxed contact, visible gap or custom reference; gap contour, not just one number | Front/profile. Preserve the person's state; a generic lip-seal constraint is conditional. |
| `lip.structure` | Other lip shapes or reconstructed areas | A: optional regional topology/patch asset and contour reference | Any side/region. Needed for geometry that ordinary continuous morphs cannot represent. |
| `mouth.expression` | Smile, purse or open the mouth | P: expression channels and intensity; left/right where supported | Test neutral return and combinations. Does not redefine mouth width or lip height. |

The endpoint rows above adopt established facial-landmark conventions; all additional outline, material and user-interface controls are proposed design choices. The [FaceBase technical notes](https://www.facebase.org/resources/human/facial_norms/notes/) caution that expressions can invalidate lip landmark placement. Its documented recruitment phase also has ancestry, age and condition exclusions, so its distributions cannot be global limits for this matrix.

## Teeth and oral interior

The default editor presents an illustrated dental map. Stable tooth records use an internal `toothId`, `dentition` (permanent/primary/custom), `arch` (upper/lower), `side` and `slot`; UI names are **upper left front tooth**, **lower right canine**, and so on. Extra teeth use a persistent custom ID rather than shifting every later tooth's identity. A missing tooth is an explicit state, not a zero-sized crown. A mixed dentition requires both sets of records and suitable assets; this architecture does not certify a child head asset or infer eruption from age.

The original tooth study distinguishes measured **clinical crown height** from full anatomical crown height and omits third molars from its analysis. Its measurements do not reconstruct an individual's tooth, root, bite or full dental arch. This matrix preserves that distinction and adds per-tooth artistic choices; it does not use genes to generate teeth. [Li et al., primary paper, methods pp. 15–16](https://oro.open.ac.uk/102116/1/102116.pdf)

| Stable ID | What the person sees | Type; optional definition | Views / essential dependency |
| --- | --- | --- | --- |
| `mouth.dentition` | Which teeth are present | A: collection of tooth records, optional starting layout, primary/permanent/custom sets | Dental map. No universal fixed 28/32 count, automatic symmetry or inferred missing wisdom teeth. |
| `tooth.presence` | Present, missing, not visible, or restoration | A: explicit state per tooth; distinguish hidden/unobserved from absent | Per tooth. Restorations may use separate material/shape records. |
| `tooth.form` | Tooth shape | A/V: tooth class and authored crown variant; custom asset when needed | Per tooth, smile/dental/oblique. Incisors, canines, premolars and molars need different silhouettes. |
| `tooth.crownWidth` | Width of this tooth | M: crown extent along the declared local mesiodistal axis (along the arch), mm; V alternative | Dental fitted mesh. Declare mesh segmentation and orientation; do not use global head width. |
| `tooth.crownDepth` | Thickness from cheek side to tongue side | M: crown extent along local buccolingual axis, mm; V alternative | Dental fitted mesh. A front smile image does not observe this. |
| `tooth.visibleHeight` | Visible height of this tooth | M: declared crown-axis extent between visible gum boundary and highest crown point, mm; V alternative | Dental reference. Records clinical visible height, not concealed root or full anatomical crown height. |
| `tooth.position` | Move this tooth | V/A; explicit along-arch, inward/outward and vertical offsets in arch frame | Per tooth. Neighbours, gums and lips refit; actual source observations remain preserved. |
| `tooth.rotation` | Turn or tilt this tooth | V/A; explicit local yaw/pitch/roll, optional degrees | Per tooth. Three axes and rotation order are in the asset adapter contract. |
| `tooth.edgeShape` | Rounded, pointed, worn or chipped edges | V/A: incisal/cusp contour and per-surface detail | Per tooth. Independent from crown dimensions; no diagnostic label inferred. |
| `tooth.surfaceForm` | Grooves, ridges and inner shape | A/V: per-tooth surface variant, including lingual shape | Dental view. Anterior dimensions alone cannot recover cusps or shovel-like inner surfaces. |
| `tooth.appearance` | Shade and surface detail | V/A; explicit base shade, local variation, edge translucency, roughness, stains and optional restoration mask | Per tooth. Distinguish enamel from metal/resin or other selected restoration appearance. |
| `mouth.toothGap` | Space between these teeth | M/V: closest separation of declared adjacent crown surfaces in the recorded neutral dental state, mm | Pair of stable tooth IDs. Zero is allowed; overlap/contact conflict is reported rather than hidden. |
| `mouth.upperArchShape` | Shape of the upper row | A/V: declared arch curve with tooth anchors | Dental/front/oblique. Upper row follows skull/maxillary frame. |
| `mouth.lowerArchShape` | Shape of the lower row | A/V: independent arch curve with tooth anchors | Dental/front/oblique. Lower row follows the jaw frame. |
| `mouth.archWidth` | Width of a tooth row | M: distance between named left/right tooth landmarks, mm; store tooth IDs and cusp/surface point definitions | Per arch. No value when endpoint tooth/landmark is missing; never silently substitute another tooth. |
| `mouth.archDepth` | Depth of a tooth row | M: distance in declared arch plane from selected front midpoint to a named posterior landmark line, mm | Per arch, dental reference. Definition stores selected teeth, points and plane. |
| `mouth.biteRelationship` | How upper and lower teeth meet | A/V: recorded jaw/dental pose and fitted relative arch transform | Front/profile/dental. Optional professional bite observations require their own landmark/axis definitions; neutral lips do not identify bite. |
| `mouth.gumContour` | Gum line around the teeth | A/V: per-arch boundary, local height and between-tooth papilla contours | Dental/smile. Gum line affects visible crown height; avoid double-solving it independently without reporting the coupling. |
| `mouth.gumAppearance` | Gum colour and texture | V/A: colour, regional pigmentation, texture and moisture | Dental/smile. No mandatory uniform pink; not a health assessment. |
| `mouth.gumExposure` | How much gum shows in this smile | P/derived observation: exposed gingival area or named lip-to-gum distance in recorded smile | Frontal smile. Derived from lips, teeth, gum shape and expression; not a substitute for gum geometry. |
| `mouth.tongueShape` | Tongue size and shape | A/V: width, thickness, tip and neutral volume shape; fitted scan dimensions only when supplied | Oral view. External face metrics do not determine it. |
| `mouth.tongueSurface` | Tongue colour and texture | V/A: regional colour, papilla relief and moist surface | Oral view. No diagnosis from texture/colour. |
| `mouth.tonguePose` | Tongue position | P: tip, blade and body deformation on fitted rig | Mouth open/speech. Maintain volume and clearance from teeth, floor and palate. |
| `mouth.hardPalate` | Roof of the mouth | A/V: fitted vault/arch shape and surface detail | Dental/open-mouth. Hidden parts remain generic/unknown unless observed. |
| `mouth.softPalate` | Back of the roof of the mouth | A: soft palate and uvula asset; pose capability declared separately | Open-mouth. No need to ask the beginner for hidden dimensions. |
| `mouth.innerCheek` | Inside of the cheeks and lips | A: buccal surfaces and vestibule, separate inner-lip material | Oral/oblique. Maintain continuous cavity during opening and smiling. |
| `mouth.floor` | Floor under the tongue | A: fitted oral floor and visible mucosal folds | Oral view. Does not follow the tongue as a rigid painted surface. |
| `mouth.frenula` | Small connecting folds | A: visible lip/tongue connection assets where represented | Oral close-up; optional detail capability. No mandatory self-measurement. |
| `mouth.cavity` | Depth inside the mouth | A: continuous enclosed interior and documented rear boundary | Open-mouth/oblique/underside. Dark cap is a rendering termination, not a person's actual throat. |
| `mouth.jawMotion` | Open, shift or move the jaw forward | P: fitted rotation/translation path and permitted preview range | Front/both profiles; no hard-coded human maximum or forced opening. Lower arch follows jaw; upper arch stays skull-bound. |
| `mouth.structure` | Other oral structure or prosthesis | A: missing/altered region or dental prosthesis asset, fit and attachment | Region-specific. Preserve user choice even if the loaded adult asset cannot render it. |

The oral assembly needs tooth enamel, underlying visible tooth material where appropriate, gums, tongue and other mucosa with different appearance. Internal nerves, root canals and tooth roots are not required customization inputs for an externally viewed head. The [American Dental Association's tooth anatomy](https://www.mouthhealthy.org/all-topics-a-z/tooth) supports the distinction between tooth tissues; it does not license a supplied mesh or prescribe a shader. Likewise, [NIDCR's jaw-joint explanation](https://www.nidcr.nih.gov/health-info/tmd) confirms paired jaw joints and movement, not a universal hinge angle or diagnostic avatar solver.

## Fitting, contact and failure behavior

**One input definition, many people:** the shared registry supplies the label, help picture, optional measurement method, validation and asset dependency. The person record supplies values. A per-asset adapter maps them to geometry and reports achieved values; an adapter is authored for an asset family, never for a person. The matrix must not degenerate into user-specific conditional code.

**Fit identity first.** Eye/lid/socket fitting and dental/lip fitting are coupled problems. Resolve neutral geometry and landmarks, then expression/jaw/gaze transforms, then correctives and attached grooms/wet surfaces. Recompute measurement output on the resulting surface. A “10 mm” input is a requested observation until its measured result and residual are known. Display unavailable/approximate/fitted capabilities separately.

**Preserve intent when controls conflict.** For example, measured outer-corner span plus two opening widths may not match an assumed inner-corner gap; visible gumline height may change when crown length or gum contour changes. Retain all original observations, show which cannot currently fit, and offer a visible preview adjustment. Never silently clip a person's value into a population average or show it as exactly achieved because a slider saved.

**Separate geometry defects from individual anatomy.** Unintended eye penetration, detached lash roots, leaking cavity surfaces and sliding teeth are defects. Asymmetry, absent teeth, a prosthesis, a visible resting lip gap or a deliberately represented incomplete lid closure are not defects to normalize away. The constraint set is conditional on the selected anatomy and supported topology.

**Photographs have missing data.** A neutral front photograph does not reveal posterior teeth, tongue underside, iris depth, eye-globe diameter or an unseen side. Unobserved regions stay flagged. The capture literature describes surface loss and artifacts in occluded/deep regions; this is why multiple views and explicit uncertainty belong in the data. [Heike et al., practical acquisition guide](https://pmc.ncbi.nlm.nih.gov/articles/PMC2920242/)

## Required review fixtures

| Fixture | Required evidence | What must remain true |
| --- | --- | --- |
| Neutral front, both profiles and both obliques | Same identity, camera convention, fixed gaze and expression; optional reference overlay | Dimensions/contours agree in visible regions; no side silently mirrored. |
| Top and underside inspection | Head orbit plus eye/lip/cavity contact close-ups where visible | No hidden detached surface or cavity leak. Views add evidence only where features are actually visible. |
| Open, partly closed and closed lids | Each eye independently, then both; straight/up/down/side gaze | Skin/wetline/lash contact holds for chosen structure, iris/cornea stay fitted. A hide-at-full-blink trick is not proof of partial-blink correctness. |
| Colour/asymmetry fixtures | Different iris colours/patterns, uneven brows, one sparse/absent lash row | Per-side values survive edits, save/reload, quality changes and capture. |
| Lip identity extremes and asymmetry | Mouth width with different upper/lower contours, projections, corner heights and resting gaps | No identity reset when smiling/opening; only intentional changes to neighbours. |
| Dental fixture family | Varied arch shapes, tooth rotations, gaps, absent teeth, restorations, missing endpoint landmarks | Stable tooth IDs; no fabricated dimension or involuntary symmetric replacement. |
| Oral poses | Comfortable opening, smile, lip closure where applicable, tongue motion and speech samples | Upper arch remains skull-bound; lower arch moves with jaw; interior remains connected. |
| Changed/missing structure | Supported prosthetic/altered topology case; unsupported desired case | Supported geometry behaves correctly; unsupported values remain retained and honestly labelled. |
| Reference uncertainty | Unscaled selfie, obscured crease, absent tooth landmark, mismatched gaze | Correct “unknown/visual only” states; no invented mm or percentage likeness. |
| Software behavior | Two different people, Current/Goal, undo/reset, units, zero/unknown, save failure/retry, export/restore | No state leakage, identity drift, lost side/tooth fields or per-person implementation branch. |

Review geometry in a neutral material and materials under neutral, warm, cool and grazing light. Measure per-region residuals when calibrated references exist, with explicit error budgets; no universal accuracy threshold is established here. Test combinations that stress contact, not merely each slider alone. Face labels and software tests do not establish likeness. Required authoring, browser integration, device performance, calibrated fit and user visual acceptance remain open.

## Corrections and audit scope

| Existing document | Disposition for the eye/mouth scope |
| --- | --- |
| [03 anatomy specification](../03-anatomy-spec.md) | Head/eye/mouth sections reviewed. Fixed globe/iris dimensions, a universal crease, “32 adult teeth” and pink gums are example construction assumptions, not individual measurement bounds. Generated blocks are owned by `code/anatomy-spec.mjs`; update the source or retain an explicit superseding correction. Anatomical presence and separate controllability must be distinguished. |
| [04 skin/hair/eyes](../04-skin-hair-eyes.md) | Surface and eye/mouth specification reviewed. Exposure-responsive pupils are cosmetic; fixed blink timings are animation fixtures. Eye opening, globe and iris size must be independent intents. Universal tooth count/pink oral material and mandatory scalp-linked brow/lash colour do not serve this matrix. Late runtime checkpoint text must govern historical “currently static” wording. |
| [11 checkpoint review](../11-review-50.md) | Dated repair record reviewed; its test and asset counts are historical, not new face readiness evidence. No new substantive eye/mouth claim accepted from those counts. |
| [12 articulated surfaces](../12-articulated-surface-architecture.md) | Reviewed in full. It correctly calls the cornea a preview cap and face joint names structural. Retain that distinction; hiding a cornea at full blink does not validate all lid contact. |
| [13 face studio review](../13-face-studio-review.md) | Reviewed in full. Correctly identifies procedural mouth, limited morphs and open authored dental/eye work. Its five-photo guide is a starting reference workflow, not complete all-angle evidence. |
| [14 people review](../14-review-100-and-people.md) | Reviewed face, measurement and persistence sections. Existing 77 fields and named people are useful infrastructure; neither establishes complete independent facial geometry. |
| [17 asset family](../17-human-asset-family.md) | Reviewed in full. Existing facial assembly remains, and replacement dental/eye anatomy is explicitly open. Higher subdivision or exported eye colour does not complete this matrix. |
| [Portfolio/3D audit](../../PORTFOLIO_3D_AUDIT_AND_IMPLEMENTATION_PLAN.md) | Targeted face/asset gate review. A symmetrical authoring base is acceptable; it must not force symmetric saved identities. Front/side/back/oblique gates need both sides, top/underside and eye/oral close-ups for this scope. |
| [Diversity research](README.md), [coverage](coverage.md), [audit](audit-and-realism.md), [proposal](implementation-proposal.md) | Eye/lid/brow/lash/lip/dental claims and source entries reviewed. Existing caution on genetic inference, sampling and authored assets stands. This matrix supplies missing measurable definitions, altered-anatomy states and user-level controls. Source papers were checked as described below; raw analyses were not reproduced. |

Source access in this pass: FaceBase summary/technical pages; Wang PubMed abstract; Simcoe PMC abstract/methods sections; Disney original publication page; Li primary PDF methods after publisher retrieval returned 403; Amador primary article excerpt; Heike acquisition article sections; ADA and NIDCR official explanations. Apple documentation required JavaScript and its linked Markdown fetch failed, so no new claim about exact ARKit coverage is based on that failed retrieval. The study references establish only the stated methods/findings, not universal UI ranges, approved assets or population completeness.
