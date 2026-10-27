# Hair, skin and visible details: universal input matrix

Reviewed 2026-10-24. **Proposed design and research correction, not a claim that these controls or assets ship.** This matrix covers the exterior of the entire head: front, sides, crown, rear, behind the ears, and underside of the chin. It complements the [head shape matrix](head-shape-nose-ears-matrix.md), [eye and mouth matrix](eyes-mouth-matrix.md), [implementation proposal](implementation-proposal.md), and [research limitations](coverage.md).

The system accepts each person's observations through the same fields. No person-specific code, ethnicity preset, sex gate, age gate, or assumed relationship between hair and skin colour is required. An all-age data contract does not establish all-age assets: the present asset evidence is predominantly adult, and child or older-adult likeness needs appropriate shape, hair, skin and motion validation. Age is not a command to add wrinkles, remove hair or whiten every groom.

## How a person uses this

1. Choose **Hair**, **Facial hair**, or **Skin and marks** on the head picture. Turn the preview to see the part being edited.
2. Pick the closest picture, colour, or plain-language amount. Use **Not sure** for anything unknown. Every field is optional; leave the rest unchanged.
3. If needed, choose **Different on each side**, **Edit one patch**, or **Enter a measurement**. A miniature diagram shows exactly what that measurement means.
4. Review front, both sides, back, top and under the chin. Save the same identity with different hair, styling or makeup without losing the underlying face.

Show only the current region's useful controls. Do not ask people to learn pigment chemistry, count every follicle, supply an ethnicity, or fill this entire engineering matrix. **None**, **Unknown**, **Hidden by hair/accessory**, and **Not supported by this model** are separate states. A visible shaved surface is not a diagnosis of absent follicles. A covered region is not an observed bald patch. Mirroring is an explicit editing aid, not a reason to overwrite an existing asymmetric region.

## Reading the matrix

- **Visual** means an artistic choice or adjustment; the UI must not attach millimetres, biological percentages or population percentiles to it.
- **Measured** means an optional physical value with a defined method, unit, site, date and uncertainty. A typed number alone is not proof that the rendered result meets it.
- **Position/path** means points attached to the unposed head surface, with a visible diagram. Local measurements use the specified surface path or straight-line distance; the two are not interchangeable.
- **Record** means an explicitly structured set of subfields listed in the row. The stable ID names the record; each subfield remains separately editable and independently capable.
- Front = **F**; subject's left/right = **L/R**; rear = **B**; top = **T**; underside = **U**. Left and right always belong to the person, even in a mirrored reference.

Every record can carry `side`, `region`, and an optional `patchId`. Patches may overlap; their order, blending and stable identity must be saved. A record without a measurement uses a visual value and never silently acquires a physical unit. Numerical limits come from verified asset support and calibrated capture methods, not an asserted universal human minimum/maximum.

## Scalp and hairstyle

The scalp regions are front centre, left/right front corners, left/right temples, left/right sides above the ears, crown, left/right rear, occipital centre, behind each ear, and the rear hairline at the head/neck junction. Region names are navigation aids; a free patch may cross them.

| Stable ID | User-facing control | Input and precise meaning | Check views and dependencies |
| --- | --- | --- | --- |
| `hair.presence` | Hair here | Choice: visible hair, shaved/stubble, no visible hair, unknown; per region/patch. Store visible state without inferring cause. | F/L/R/B/T; scalp remains visible and shaded where hair is absent. |
| `hair.style` | Hairstyle | Supported thumbnail/asset ID: loose, cropped, tied, braided, twisted, locs, etc.; custom asset when supported. Style is not fibre shape. | Full turntable; preserve fibre/colour intent when changing compatible styles. |
| `hair.hairline` | Where your hair starts | Editable surface path around front, temples, ears and rear; endpoints and intermediate points remain individually editable. Optional measured point coordinates require a calibrated head frame. | F/L/R/B/T; do not move the forehead or redefine face height when a hairline moves. |
| `hair.frontPoint` | Point at the front | Visual centre point and local outline, including absent/rounded/pointed/irregular options; no forced widow's peak. | F/T; part of the hairline path, not a second conflicting mask. |
| `hair.edgeSoftness` | Fine hairs at the edge | Visual edge feathering plus optional fine-hair length in mm measured along a fibre from skin emergence to tip. | F/L/R/B close-up; no opaque helmet border. |
| `hair.part` | Parting | Record: one or more surface paths, visible gap width, optional gap width in mm perpendicular across the path on the scalp. None and multiple parts allowed. | T/F/B; parting exposes scalp without permanently deleting the stored growth mask. |
| `hair.whorls` | Hair swirl | Record per swirl: surface centre, clockwise/counterclockwise/mixed flow as viewed outward from that patch, strength (visual), local direction field. Multiple or unknown swirls allowed. | T/B; directions use scalp tangents, not screen axes. |
| `hair.flow` | Which way hair falls | Visual direction arrows and guide curves over each region; local overrides and asymmetry. | All; separate root growth direction from styled mid-length/tip direction. |
| `hair.length` | Hair length | Optional mm/cm **along the fibre** from visible skin emergence to cut tip, with region and condition recorded. Visual short/long control is separate. | L/R/B/T; specify dry/wet and stretched/natural state; do not measure curly hair only as straight-line endpoint distance. |
| `hair.visibleReach` | How far the hair hangs | Optional straight-line root-to-tip distance in mm/cm for a selected lock in the stated pose; visual alternative. | L/R/B; distinct from fibre length and volume. |
| `hair.fibreShape` | Straight, wavy, curly or coiled | Visual examples with continuous variation and mixed-patch support. These are navigation labels, not ancestry classes or an eight-bin biological law. | L/R/B close-up; changing style must not silently reset fibre shape. |
| `hair.curlGeometry` | Size and spacing of curls | Advanced record: local curve radius in mm and axial advance per complete turn in mm, plus local variation; fitted to a selected near-helical segment only. Non-helical waves/kinks use a drawn guide curve. | Profile close-up; radius is half diameter; do not force every strand into one perfect helix. |
| `hair.fibreThickness` | Fine or thick strands | Visual amount; optional measured fibre diameter in micrometres with method/site/condition. For noncircular sections retain measured major/minor widths or an explicitly named effective diameter. | Close-up; screen ribbon width is not a biological diameter measurement. |
| `hair.fullness` | How full it looks | Visual amount describing visible coverage/volume. Independent of strand thickness and hairstyle. | F/L/R/B/T under fixed light; not labelled hairs/cm². |
| `hair.rootDensity` | Measured hairs in a patch | Advanced count of visible emerging shafts per cm² on a declared scalp surface patch; method and visibility required. Follicular units are a different count and must be named separately if imported. | T/L/R/B close-up; renderer may draw fewer representative fibres while preserving appearance. |
| `hair.thinPatches` | Thin or bare patches | Record: surface outline, visual density profile, edge softness; multiple arbitrary regions. Optional patch area is measured on the scalp in cm², not image pixels. | All; permit front, crown, temporal, rear and irregular patterns without sex or diagnosis gates. |
| `hair.clumps` | Hair groups together | Visual clump amount/size/distribution with stable seed; structured guides for locks. | All; clumping is separate from curl and root count. |
| `hair.flyaways` | Loose and frizzy hairs | Visual amount, location and spread; optional guide lengths use fibre-length definition. | All, including backlight; no required increase for a particular skin colour or fibre category. |
| `hair.volume` | Hair silhouette | Visual local lift/width/depth and guide envelope; optional measured offset from scalp in mm along a declared surface normal. | F/L/R/B/T; hair volume must not change the underlying skull. |
| `hair.cutBoundary` | Hair ends and shaved edges | Editable tips/envelope and surface shave boundary, including uneven/asymmetric cuts. | All; haircut length differs from scalp growth area. |
| `hair.colour` | Hair colour | Record: named/custom sRGB swatch, local patches, optional along-length gradient. Colour is editable independently of skin and every other groom. | Fixed light and all views; retain colour-space metadata. |
| `hair.grey` | Grey and white hairs | Record: visual mixture amount, local distribution, light-fibre colour, stable seed, optional along-fibre pigment pattern. If entered as an observed fraction, store counted shafts and denominator/method separately. | All; no automatic coupling to age; a renderer mixture fraction is not a verified biological assay. |
| `hair.dye` | Dye, highlights and roots | Record: overlay colour, patch/path mask, strength, along-fibre coverage and optional root-regrowth length in mm along the fibre. | All; hiding dye restores saved underlying colour. |
| `hair.finish` | Shine and wet look | Visual roughness/highlight and wet/clumped appearance; optional preset does not change saved baseline hair geometry. | Neutral/side/back light; not an oil-content or hydration measurement. |
| `hair.additions` | Wig or extensions | Separate accessory/groom asset and placement record, with underlying scalp/hair retained. | All; record attachment and collision behavior; not a permanent scalp morph. |

### Facial hair, brows and lashes

Beard regions are sideburns, cheeks, jaw edges, chin, under-lip patch and underside of the jaw. The underside of the jaw is in this head scope. Beard continuing onto the neck must join the existing neck system at a declared seam, rather than being cropped at the jaw or pretending the entire neck is head anatomy. Long hair may extend below the neck while its roots remain on the head; its full visible length and collisions still need rendering support.

| Stable ID | User-facing control | Input and precise meaning | Check views and dependencies |
| --- | --- | --- | --- |
| `beard.presence` | Facial hair here | Same visible/none/shaved/unknown states as scalp, independent per region and side. | F/L/R/U; allow beard on any supported head without sex/age gating. |
| `beard.outline` | Beard edges | Editable cheek, sideburn, under-lip, chin and underside boundaries; local masks may be disconnected. | F/L/R/U; sideburn connects to scalp only when chosen. |
| `beard.length` | Beard length | Optional mm/cm along fibres from skin emergence to tip, by region; visual length alternative. | L/R/U; no universal 80 mm ceiling. |
| `beard.fullness` | Beard fullness and gaps | Record: visual fullness, patch outlines and feathering. Optional shaft-density measurement uses a declared skin patch in cm². | F/L/R/U; retain skin colour under gaps rather than painting a uniform dark block. |
| `beard.fibres` | Beard texture | Record: fibre shape, guide flow, thickness, clumps and flyaways using scalp definitions; independent values. | All relevant views; must follow cheek and jaw deformation. |
| `beard.colour` | Beard colour | Same independent swatch/patch/gradient record as scalp colour. | Fixed light; no mandated lighter/darker offset from scalp. |
| `beard.greyDye` | Grey or dyed beard | Record: grey mixture/distribution/seed and dye overlay/root length, using the separate fields defined for scalp. | F/L/R/U; changing this record never changes scalp or mustache. |
| `beard.style` | Beard shape or style | Supported groom asset/guide arrangement; individually editable boundaries and retained underlying fields. | Neutral/smile/jaw-open; styles do not imply population membership. |
| `mustache.presence` | Mustache | Visible/none/shaved/unknown independently of beard. | F/L/R; upper lip hair remains separate from lip tissue. |
| `mustache.outline` | Mustache edges | Editable left/right upper-lip surface outlines with centre gap and outer ends. Optional gap is surface distance in mm between nearest inner growth-boundary points. | F/oblique; growth-mask width differs from styled tip span. |
| `mustache.length` | Mustache length | Optional mm along fibre, side/patch-specific; visual length alternative. | F/L/R; length must not force lip or mouth width. |
| `mustache.fullness` | Mustache fullness | Visual amount and patches; optional measured shaft density uses a declared upper-lip skin patch. | F close-up; no shared beard density requirement. |
| `mustache.fibres` | Mustache texture and direction | Record: fibre shape, thickness, local flow, clumps/flyaways; definitions as above. | F/L/R, smile/jaw-open; root anchors follow upper-lip surface. |
| `mustache.tips` | Mustache ends | Visual guide curves, lift/turn and optional tip-to-tip straight-line span in mm in neutral pose. | F/L/R; lifted tips are styling, not root direction. |
| `mustache.connections` | Join to beard | Independently toggle/edit left/right connecting growth patches. | F/oblique; no all-or-none link. |
| `mustache.colour` | Mustache colour | Independent colour/patch/gradient record. | Fixed light; permit different colour from beard. |
| `mustache.greyDye` | Grey or dyed mustache | Separate grey/distribution/seed and dye/root-length fields as above. | F/oblique; preserve underlying colour. |
| `hair.browGroom` | Eyebrow hairs | Record per side/patch: presence, visual fullness, optional shaft density, fibre length/thickness/shape/flow, colour, grey, dye and stable seed; use definitions above. | F/L/R with brow motion; eyebrow outline, arch and placement belong to the eye/brow shape matrix. |
| `hair.lashGroom` | Eyelashes | Record per side and upper/lower row: presence, fullness, length/thickness/curve/flow, colour, grey/dye, seed; extensions are a separate overlay. | F/L/R through full blink; roots bind to the lid, and there is no required universal lash count. |
| `hair.fineFacialHair` | Fine face hairs | Record: region/patch, visual amount, length/thickness/flow/colour; includes cheeks, forehead and chin without beard classification. | Grazing light, close-up; keep independent of coarser beard. |
| `hair.earNoseVisible` | Visible ear or nose hairs | Record: ear-rim/entrance or nostril-rim patch, length/fullness/flow/colour. Only externally visible parts; no internal follicle reconstruction claim. | Side/underside close-up; roots must attach to appropriate local tissue, not bridge openings. |

All fibre records use the same reusable data structure and capability resolver. This is code reuse across regions, not a requirement that their values match. Unsupported subfields are individually disclosed; retaining one supported colour input must not make an unavailable shape input appear supported.

## Skin, surface and individually placed marks

Skin coverage includes exposed scalp, forehead, temples, nose, cheeks, eyelids, under-eyes, lips, chin, under-chin, both sides of each ear and skin behind the ears. The lip/oral matrix owns tissue geometry and internal oral colours; skin detail can add an explicitly placed visible lip mark without assigning a diagnosis.

| Stable ID | User-facing control | Input and precise meaning | Check views and dependencies |
| --- | --- | --- | --- |
| `skin.baseColour` | Skin colour | Named/custom colour with sRGB metadata and optional reference swatch. Advanced colourimetry can store CIE L\*, a\*, b\* coordinates with declared illuminant/observer; spectral reflectance stores wavelength in nm and reflectance fraction. Both require instrument, geometry, site and uncertainty. | All under fixed neutral light; phone pixels alone are not calibrated skin reflectance, and Lab/ITA values are not melanin percentages. |
| `skin.colourVariation` | Colour varies here | Local surface masks, colour offset or swatch and blend strength for all head regions. | F/L/R/B/T/U; no universal dark-ear/red-lip multiplier. |
| `skin.undertone` | More pink, golden, olive or neutral | Visual tint adjustment and custom option; no required biochemical interpretation. | Fixed light; keep independent from baseline choice and local colour patches. |
| `skin.tan` | Tan or lighter covered areas | Visual darkening/colour overlay, local mask and edge softness; optional saved exposure context. | All; a visibility mask is not a prediction of sun response. |
| `skin.redness` | Redder areas | Visual local amount/colour, with baseline and temporary layer separated. | F/L/R including ears/lips; do not infer blood concentration, disease or emotional state. |
| `skin.shine` | Matte or shiny | Visual roughness/shine per region; stable baseline separate from temporary wetness. | Neutral and grazing light; forehead, nose and cheeks remain independently editable. |
| `skin.lightSoftness` | Softness in side or back light | Optional visual material adjustment for supported skin-scattering approximation, with local ear/nose/lid response; no biological percentage or inferred tissue thickness. | Neutral, grazing and back light; does not mean enabling glass-like transmission or hiding geometric errors. |
| `skin.wetness` | Sweat or wet skin | Temporary visual mask, droplet appearance/size and shine; physical droplet diameter only if actually defined/calibrated. | All; turning it off restores baseline roughness and colour. |
| `skin.pores` | Pore detail | Visual size/contrast/density by region; optional visible opening diameter in mm from calibrated macro imagery with method. | Close-up/normal portrait; not inferred from gender, age or ethnicity. |
| `skin.fineTexture` | Fine skin texture | Visual direction, scale and strength of micro-lines/roughness with saved seed. | Grazing light and multiple distances; surface texture does not replace silhouette geometry. |
| `skin.flaking` | Dry or flaky areas | Visual patch, scale and strength; no diagnosis or hydration estimate. | Close-up; texture, normals and colour handled separately. |
| `detail.restLines` | Lines visible when relaxed | Editable paths/patches for forehead, between brows, eye corners, under-eyes, nose/lip folds, mouth corners, lips, chin and ears. Optional length/width follows the local surface in mm; depth requires a calibrated surface, not a shadow estimate. | Neutral F/L/R; link folds that change silhouette to geometry capability. |
| `detail.expressionLines` | Lines when you move | Record: path/patch and amount keyed to named expression, separate from neutral detail. | Smile, brow raise, squint, jaw-open; expression does not alter saved identity. |
| `detail.freckles` | Freckles | Visual coverage/contrast/size/colour and seeded distribution; individually move/add/remove a mark. Optional diameter is the largest local surface extent in mm, not radius. | All exposed head surfaces; any base skin colour can retain user-chosen marks. |
| `detail.moles` | Small dark or raised marks | Individual shape, surface anchor, colour, flat/raised appearance and optional largest surface extent in mm. Optional relief is signed offset from surrounding skin in mm only with calibrated geometry. | F/L/R/B/T/U; visible lip/ear/scalp marks allowed; no diagnosis from a label or size. |
| `detail.birthmarks` | A larger colour patch | Arbitrary surface outline, colour/gradient, edge softness and optional relief; can span multiple regions or be unilateral. | All; no forced round shape or causal category. |
| `detail.pigmentPatches` | Lighter or darker patches | Arbitrary patch outlines, local colours and blending; asymmetry and sharp/soft borders. | All; do not require a medical condition to reproduce an observed pattern. |
| `detail.scars` | Scars and dents | Surface path/outline, colour, flat/raised/depressed relief, texture and hair interruption as separate fields. Measured length/width follow surface; relief is signed local offset. | Neutral and expressions, grazing light; do not force scars to be pale, smooth or raised. |
| `detail.bumpDepression` | A small bump or hollow | Local position, outline and visual height/depth; calibrated signed mm only when available. | At least two angles; surface material cannot reproduce a silhouette-changing bump alone. |
| `detail.vessels` | Fine visible veins | Optional drawn/seeded surface paths, visible colour and contrast; an artistic subsurface effect. | Side/grazing light; no BMI, fitness or skin-tone gating. |
| `detail.underEyeColour` | Colour under the eyes | Per-side local tint/mask; independent of under-eye bags/hollows in the shape matrix. | F/oblique; shadows from lighting are not stored as permanent pigmentation. |
| `detail.stubbleShadow` | Shaved-hair shadow | Local cosmetic colour/coverage linked to the chosen groom mask where desired, with explicit override. | F/L/R/U; not a substitute for visible projecting stubble at close range. |
| `detail.tattoo` | Tattoo or drawn design | User-owned/licensed image/vector, surface placement, scale, rotation, colour and opacity; separate layer with stable anchor. | All and expression; do not bake lighting into the design. |
| `detail.makeup` | Makeup | Separate named/custom masks for eyes, lips, brows, skin and cheeks with colour, opacity and finish; removable independently. | Neutral/motion; cosmetics must not rewrite baseline skin or tissue dimensions. |
| `detail.customSurface` | Add another visible detail | Extension record with named type, surface anchor, units/visual semantics, material/geometry role, provenance and capability declaration. | All relevant views; unsupported imports stay stored with an explicit status, not flattened silently. |

## Modifications, assistive items and occlusion

| Stable ID | User-facing control | Input and precise meaning | Check views and dependencies |
| --- | --- | --- | --- |
| `accessory.piercings` | Piercings and jewellery | Instances with asset ID, surface anchor, orientation and optional physical size in mm; left/right independent. | All relevant views; visible hole/stretch belongs to geometry and remains if jewellery is hidden, when intentionally saved. |
| `accessory.earItems` | Hearing aids or ear devices | Supported asset, side, fit and optional size; separate from ear anatomy. | L/R/B; do not delete hidden ear detail. |
| `accessory.faceItems` | Glasses, eye cover or face item | Supported asset and fit; frame scale and contact points; independent visibility. | F/L/R/U; remove temporarily for anatomy review without changing the face. |
| `accessory.headCover` | Hat, wrap or other head covering | Supported asset, fit, appearance and occlusion mask. | Full turntable; retain underlying scalp/hair as unknown or saved data. |
| `accessory.prosthesis` | Visible prosthesis or custom replacement | Explicit part replacement/overlay, asset provenance, attachment frame, geometry interface and appearance. | Relevant views and motion; do not claim a generic morph can represent absent tissue or every reconstruction. |

An absent, replaced, modified or atypical feature must be represented by part/capability state, not forced to zero on a slider whose mesh cannot support it. **Custom** is an extension path, not proof that arbitrary anatomy already renders correctly. Deeper skull anatomy, nerves, glands, vessels, sinuses and internal hair follicles are not inferred from external appearance; they are outside this likeness matrix unless a separately evidenced internal-anatomy mode is built.

## Attachment, reproducibility and measurements

1. Save growth masks, parting/styling masks and accessory occlusion separately. A new haircut or hat must not erase the saved hairline.
2. Anchor patches and roots in a versioned rest-surface coordinate system. Use topology-safe transfer when changing assets/LODs. If transfer cannot preserve a mark, retain its original data and show that review is needed.
3. Preserve stable seeds and explicitly placed details across save/reload, clone comparison, quality changes and export. Rendering fewer fibres must not rerandomise the person's hairline or grey patch.
4. Recompute attachments after identity deformation, then follow expression/jaw/lid motion. Scalp hair follows the scalp; brows follow skin; lashes follow lids; mustache follows the upper lip; lower beard follows its local deforming surface. Hair shafts may need corrective guides/collision handling beyond root attachment.
5. Measure geometry in its declared neutral frame and units; compare requested versus achieved values with uncertainty. An asset limit must report the mismatch and preserve the requested value. Do not silently clamp a person's measurement into a purported population norm.
6. Expose simple visual controls first. Measured fibre lengths, density, pigment values, pore widths and skin reflectance require different acquisition methods. A single photograph, centimetre ruler, colour picker or curl slider cannot supply all of them.
7. Treat colour, shape, surface detail, grooming, temporary conditions and accessories as separate layers. Changing light/camera exposure cannot change saved pigmentation or physical dimensions.
8. Keep exact licensing, source hashes, shader/solver version and data provenance with assets. A paper's open text does not establish rights to its participant photographs, meshes or third-party materials.

Legacy adapters must preserve meanings. In particular, existing `hairDensity` is card coverage, not `hair.rootDensity`; existing `skinFreckleSizeMm` is documented as a radius bound, whereas the new mark-size definition uses largest extent/diameter. Conversion requires an explicit versioned adapter and the actual implementation's definition, not copying a number to a similarly named field.

## What the research actually supports

The tables above are original product/measurement-contract proposals. Their ID names, interaction choices and asset requirements are engineering decisions, not distributions extracted from the studies.

| Source rechecked | Supported finding | Limit on its use here |
| --- | --- | --- |
| [Loussouarn et al., 2007](https://pubmed.ncbi.nlm.nih.gov/17919196/) | The abstract reports geometric hair classification using 2,449 participants from 22 countries, based on curl/kink descriptors rather than ethnic categories. | Its eight groups are a study classification, not an exhaustive style menu or a universal mapping from words to parameters. Abstract inspected; detailed calibration tables not imported. |
| [Adhikari et al., 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4773514/) | Scalp and facial-hair traits were separately assessed; the methods restrict facial-hair traits to men. | Does not establish all-person distributions or warrant gating who can edit beard/brows. Indexed methods/results inspected after publisher access failed. |
| [Rosenberg et al., 2021](https://elifesciences.org/articles/67437) | Measurements document pigment changes along individual hair shafts, including two-colour hairs. | A white-versus-pigmented strand mixture is a useful approximation, not all possible greying. This small, selected study does not provide a universal ageing or stress model. Indexed primary article sections inspected. |
| [Weyrich et al., 2006](https://dash.harvard.edu/entities/publication/73120378-8d6d-6bd4-e053-0100007fdf3b) | Measured facial appearance in 149 subjects separates reflectance components, diffuse colour and subsurface scattering. | Supports separating surface and colour responsibilities; not a global skin palette or evidence that the current browser shader implements measured skin. Institutional abstract and primary-paper abstract inspected; the large ETH PDF could not be fetched. |
| [Morphological characteristics of facial scars, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10958093/) | The retrospective study distinguishes scar relief types and lighter, darker or unchanged pigmentation. | Supports allowing these visible alternatives; no participant proportions become app defaults. Indexed primary results inspected; direct PMC page presented a challenge. |
| [Characterization of oral melanocytic nevi, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12721702/) | The study includes vermilion-lip and intraoral nevi. | Counters a blanket ban on lip marks; no diagnostic appearance model or disease inference is proposed. Indexed abstract/methods inspected. |
| [Three.js colour management](https://threejs.org/manual/pages/color-management.html) | Colour inputs, linear-light calculations, output conversion and non-colour textures have distinct roles. | Correct colour-space handling is necessary but does not calibrate a camera, monitor or person's skin by itself. Official guide inspected. |

No numerical human min/max, biological percentage, shade accuracy guarantee, diagnosis or complete population model is established by this source set. Universal architecture means extensible per-person inputs with honest support states; successful recreation still depends on the observed reference, calibrated geometry, authored grooms/materials and actual multi-view review.

## Legacy claims to supersede

These are documentation corrections, not changes to historical runtime or provenance records.

| Existing location | Problem found | Replacement rule |
| --- | --- | --- |
| [04 §5.1](../04-skin-hair-eyes.md#51-scalp-hair) | A fixed list mixes styles with fibre classes; biological strand counts and a fixed rendering count may imply guaranteed coverage. | Separate style, fibre geometry, masks and rendered budget; validate silhouette/appearance rather than infer it from count. |
| [04 §5.2](../04-skin-hair-eyes.md#52-hair-colour-tested) | “Grey is a fraction of white fibres” is stated as a complete biological explanation; fixture colour error can read as external validation. | Label mixture as rendering approximation; allow local and along-length variation. Test agreement with chosen swatches is not measured-world colour accuracy. |
| [04 §5.3–5.4](../04-skin-hair-eyes.md#53-eyebrows-and-eyelashes) | Brow colour is derived from scalp; beard/mustache share one mask and bounded example lengths. | Independently stored colours, grooms, regions and measured lengths; existing examples are not universal limits. |
| [04 §7](../04-skin-hair-eyes.md#7--skin-features-seeded) | Freckles are weighted toward phototypes I–III; moles exclude lips; scars are only lighter/smoother/raised. | User-visible marks are not phototype-gated; permit lip marks and varied colour/relief/texture, without diagnosis. |
| [04 §2](../04-skin-hair-eyes.md#2--the-colour-model-tested) | Narrative says coverage 0 means covered, later describes coverage as share covered; shader multiplies exposure by coverage. | Explicitly name an exposure mask where 0 is protected and 1 is exposed; a clothing coverage mask uses the inverse. Never reuse an ambiguously named mask. |
| [04 §10](../04-skin-hair-eyes.md#10--how-this-ports-into-the-app) | “Figure is currently static” conflicts with the page's later runtime checkpoint for implemented idle motion. | Preserve as historical baseline or replace with the dated checkpoint; do not present it as current state. |
| [09 appearance architecture](../09-appearance-architecture.md) | Current density controls operate on cards and scalp opacity; they do not measure roots or author new length/style. | Keep legacy meaning; map new visual and measured fields explicitly, without relabelling old values as hairs/cm². |
| [Digital Human v2 plan](../../DIGITAL_HUMAN_V2_PLAN.md) | Dated body error thresholds of 1–2 cm and generic breadth/depth tolerances could be reused for head details. | Head-specific error must be tied to landmarks/regions and acquisition uncertainty. Do not apply body-scale tolerances to lashes, scars, lips or eyelids. |
| [Digital Human production plan](../../DIGITAL_HUMAN_PERFECTION_PLAN.md) | “Percentile measurements for each base phenotype” does not name a defensible cohort or measurement protocol. | Per-person inputs do not need a population percentile; any statistical preset needs a documented eligible cohort and separate validation. |
| [Asset licence resolution](../../ASSET_LICENCE_RESOLUTION.md) | Historical unresolved wording persists below a resolved dated header; base source names contain ancestry categories. | Keep source identifiers/provenance intact, mark history as history, and never expose source category names as a person's required appearance. This pass did not rerun licence hash checks. |
| [Open-source landscape](../02-open-source-landscape.md) | ANSUR II is offered for general proportion/range calibration; adult military data cannot establish all heads, skin/hair or all-age bounds. | Use only eligible directly defined measurements and scope; no universal input bounds or new asset adoption follows from this audit. |
| [Inspo reference matrix](../../INspo_REFERENCE_MATRIX.md) | Avatar Studio visual study is still marked not started. | This anatomical input contract does not count as a tested usability study or a completed UI design. |

## Acceptance fixtures for this matrix

- A person can leave every measurement unknown, edit a visible feature and save/reload without a tutorial on anatomy.
- One profile combines asymmetric hairline, different left/right brows, missing lashes on one row, separate mustache colour, a local grey patch, and a scar crossing a groom boundary. Each feature remains independent through neutral and expression views.
- Bald/shaved, very long, tightly curled, mixed-texture, sparse and covered hair cases retain the underlying head silhouette and declared support states. Unsupported styles are not offered as working choices.
- Raised, depressed, light, dark and lip/scalp/ear marks stay attached under movement and quality changes. Lighting changes do not move or recolour the saved inputs.
- Review F/L/R/B/T/U plus intermediate orbit angles in neutral and grazing/back light. Include hair-hidden views, full blink, smile and jaw opening; check roots, cutout shadows, lip clearance, rear scalp and behind-ear surfaces.
- Compare the achieved dimensions with the requested measurements only where calibrated; report residuals and uncertainty. All other values retain a visible artistic/unknown label.
- Stable patterns, separate Current/Goal/person state, undo/reset, unsupported fallback and export parity are verified on the actual implementation. This research pass does not claim those tests have run for new fields.
