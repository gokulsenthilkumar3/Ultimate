# Human realism and visual measurement plan

Researched and revised 2026-10-20. Status: implementation specification plus an interactive explanation prototype; the production model has not been upgraded by this document.

Implementation update, 2026-10-20: the first application slice is now implemented. The historical audit below describes the state before these code changes. The model's underlying realism and advanced anatomy capabilities still require the later stages.

- Public measurement fields and the 3D Measure editor now have illustrated definitions, methods, warnings and preview-support explanations. Private anatomy fields provide state-aware base/middle/distal-section help and recorded-only status.
- Measurement diagrams support zoom, pointer dragging, keyboard-accessible pan buttons and reset. Opening help does not save unchanged anatomy fields.
- A body-part navigator supports click/keyboard selection, desktop drag/drop and touch drag/drop onto the model. Orbit, pan, wheel/pinch and zoom buttons preserve the selected region. Front/side/back inspection can preserve region focus; Full Body explicitly exits it.
- Camera framing and hit regions use evaluated skinned/morphed surface bounds for the active asset, with reference-region fallback. This supports hands/feet and fixes the old mirrored side references. These are inspection bounds, not calibrated anthropometric sections.
- The Skin editor now exposes the existing renderer's continuous base-color path; appearance presets explicitly replace that color. Regional pigmentation, tan masks, advanced anatomy deformation and constrained measurement fitting remain pending and are labeled accordingly.

Implementation files: `src/lib/bodyMeasurementDefinitions.js`, `src/components/physique/MeasurementHelp.jsx`, `BodyPartNavigator.jsx`, `bodyPartDrag.js`, `src/components/morphEngine/regionFrames.js`, `CameraRig.jsx`, and the existing measurement/anatomy/viewer integration points. Regression coverage is in `regionFrames.test.js` and `tests/e2e/physique-inspection.spec.ts`; run the latter with `playwright.inspection.config.ts`. No new database or service is required.

Verification for this slice: production build passed; 30 focused unit tests passed; all five new Chrome inspection tests and two existing measurement/responsive-editor browser regressions passed. Browser coverage includes desktop orbit/pan, every public part's zoom directions, focus-preserving front/side views, native drag/drop, mobile touch drag/drop and pinch zoom, public/private help behavior, and base-color persistence. Touch behavior was tested through browser emulation, not physical-device testing. The existing large-chunk build warning remains.

Interaction follow-up, 2026-10-20: mobile part buttons now wrap so horizontal scrolling cannot cancel a diagonal touch drag. Full body also brings the model back into view. The inspection suite now covers native drops for all 17 public regions in goal context, explicitly revealed private-region drops and zoom, invalid and covered-private drop rejection, canceled/outside touch drops, wheel zoom, pinch in/out, two-finger pan, touch rotation and double-tap reset. These interactions leave recorded measurements and background/lighting preferences intact. Native-drag tests start the drag before scrolling the destination; touch tests keep both endpoints clear of fixed mobile navigation and wait for the evaluated model surface.

Repeat the application scenarios with `npx playwright test --config playwright.inspection.config.ts`, `--config playwright.customization.config.ts`, `--config playwright.avatar-ui.config.ts`, and `--config playwright.physique.config.ts tests/e2e/physique-ui.spec.ts`. These configurations use frontend-only API fixtures. The companion scenarios exercise measurement drafts and validation, current/goal editing, persistence after reload, custom backgrounds, clothing variants, empty states, imperial conversion, partial-save failures, history/CSV export, and responsive keyboard navigation. Touch coverage uses Chrome emulation; physical-device validation remains separate.

Follow-up verification: all seven inspection scenarios passed together; the four customization, one avatar-presentation, and eight physique-UI scenarios also passed across the targeted runs (20 distinct scenarios). All 11 focused interaction/presentation unit tests passed. Production build passed; lint reported no errors and 97 warnings elsewhere in the project. Browser runs used a frontend-only preview on port 5177 with an isolated Vite cache alongside the running application on port 5000.

Companion: [interactive plan, tab by tab (revision 04)](3d-plans/v4Plan_3DModel.html) — a real 3D human fitted to entered measurements, organised by the Physique tabs; the earlier [measurement guide (revision 03)](3d-plans/v3Plan_HumanRealism.html) is kept. Extends [adult anatomy research](real-human-3d/16-private-anatomy.md) and the [original model plan](3d-plans/v2Plan_3DModel.html).

## 1. Outcome and limits

Build a believable human whose shape can also match the owner. These are two separate goals: **human realism** (skin, proportions, anatomy, movement) and **personal likeness** (this person's shape, face, colors and asymmetries). A beautiful generic human can have poor personal likeness; a dimensionally accurate scan can still render like plastic.

The reported “70% human” is a subjective description, not a measured baseline. There is no defensible universal “100% human” score or number of input fields that guarantees photorealism. Replace the percentage with explicit acceptance checks for shape accuracy, appearance, deformation, usability and performance. More metrics help only when the mesh can represent them and the renderer actually applies them.

User clarification: “tibrian tanning” means **skin tone and tanning**. Treat regional pigmentation, UV tan, skin surface and lighting separately. Do not add a field with the unconfirmed phrase.

## 2. Current implementation audit

Observed in the working tree on 2026-10-20; some files already contain ongoing changes. This plan does not overwrite those implementations.

- `src/lib/bodyMetricContract.js` already includes girths, shoulder/pelvic breadth, chest depth, segment lengths, face dimensions, bilateral measurements and posture angles. Much of the required data vocabulary exists.
- `src/lib/physiqueProfile.js` groups many of those fields for the measurement workbench. Adding another long list is not the first priority.
- `src/components/physique/MeasurementWorkbench.jsx` renders number fields with names and units, but no field-specific illustrated tape path, landmark explanation or preview effect. Its body-fat estimator also needs its own protocol-specific measurement definitions; a generic waist field cannot silently stand in for every formula's abdominal measurement.
- `src/lib/anatomyCustomization.js` and `src/components/physique/AnatomyCustomizationPanel.jsx` now contain resting/erect fields, base/middle/distal girths, scrotal dimensions, buttock contour and regional skin controls. The older anatomy research document's statement that the controls do not exist is therefore stale.
- The anatomy panel explicitly says only resting length, mid-shaft circumference and hip circumference currently affect its 3D preview; other anatomy settings are stored. A saved field is not evidence of calibrated geometry support.
- `src/components/morphEngine/metricsToBlendshapes.js` maps measurements through normalized ranges and shape channels; for example `glutes` drives `glute_volume`, and some proportions use fallbacks. These are shape drivers, not proof that final mesh measurements match source values. `glute_volume` is not a calibrated mL volume.
- `src/components/morphEngine/modelAssetRegistry.js` defaults male, female and neutral presets to the same production asset unless configured otherwise. The v2 asset paths are opt-in. Audit actual asset capabilities before promising distinct body/anatomy presets; a preset label alone cannot supply missing geometry.
- `src/components/body3d/physicalSkinMaterial.js` uses a base tone table, texture-relative tint, roughness and shader approximations for skin. Its current strategy also includes baked ambient occlusion in the base color and a small warm emissive contribution; review those against neutral albedo and controlled lighting before pursuing more detailed scattering. This is a useful foundation, not a validated capture of an individual's reflectance. UI references to Fitzpatrick types should not imply a measured skin-color system.

First delivery should make existing inputs understandable and wire up their actual effects before asking for dozens of new measurements.

## 3. What the terms mean

- **Anthropometry:** measuring the human body. **Landmark:** an identifiable reference point, such as the top of the hip bone. Every measurement needs named landmarks or a defined plane.
- **Length / height:** distance along a specified axis or between specified endpoints. State whether it is a straight line, surface path or curved centerline. Overall standing height is floor to crown; lower-leg segment length needs its own endpoints.
- **Breadth / width:** side-to-side distance. Shoulder breadth across bony landmarks differs from the outer width over the deltoid muscles. “Shoulders” alone is ambiguous.
- **Depth / projection:** front-to-back thickness; projection is how far a contour extends from a named reference plane. Chest depth and buttock rear projection describe different geometry.
- **Circumference / girth:** a complete loop around a defined cross-section. It is neither width nor diameter. **Base circumference** means a loop at the attachment end of the selected structure; it is incomplete without a body region and section definition.
- **Cross-section / ellipticity:** a slice through the model and how oval that slice is. Equal circumferences can have different widths and depths. `circumference / π` gives diameter only for a circle.
- **Taper:** change in section size from one end to another. **Fullness:** where the visible shape bulges. **Curvature:** how a centerline or contour bends. **Orientation:** how the whole region is pointed; turning a straight segment does not make it curved.
- **Volume:** enclosed three-dimensional space (mL or L). It requires a closed surface and explicit boundary. A regional envelope volume is not muscle mass, fat mass or internal-organ volume. `1 cm³ = 1 mL`.
- **Surface area:** area of the outer surface (cm²), not circumference or volume. A normal map can change apparent detail without changing geometric area or silhouette.
- **Asymmetry:** independent left/right differences. **Pose:** current joint arrangement. **Corrective deformation:** extra shaping that preserves plausible contours during bending or combined edits.
- **Albedo / base color:** surface color without baked lighting. **Pigmentation:** regional appearance differences. **Undertone:** an artist-facing color adjustment, not a direct biological measurement. **Tan:** a separate appearance layer for exposure-related changes and tan lines.
- **Roughness / specular:** how broad and strong surface reflections appear. **Normal map:** small apparent surface-direction changes. **Displacement:** actual surface movement. **Subsurface scattering (SSS):** light traveling beneath skin before exiting. These are rendering controls, not tape measurements.

The terminology and need to define distinct dimensions are supported by [DINED's anthropometry database](https://www.dined.nl/en/database/tool) and [NIST's shape and size overview](https://www.nist.gov/publications/shape-and-size-analysis-and-standards). The exact app definitions below are engineering specifications; they are not all standardized clinical protocols.

## 4. Measurement and control inventory

Organize by region and acquisition difficulty. Provide an “I don't know” option for every optional field. No requirement to complete the entire inventory.

### A. Overall body and proportions

- Standing height, weight, sitting height, arm span, torso length, inseam and left/right limb segment lengths.
- Define upper arm, forearm, thigh and lower-leg endpoints individually; trouser inseam is not interchangeable with a bone or joint segment length. Tibial/lower-leg contour remains a separate optional shape feature.
- Height establishes scale; segment lengths establish proportions. Weight is a weak shape prior, not a complete distribution model. Composition-device readings retain their source and uncertainty; bone mass and body water must not become independent silhouette sliders.
- Introduce region volume and surface area as derived model estimates only after validated segmentation.

### B. Torso, shoulders, pelvis and buttocks

- Neck girth; shoulder landmark breadth; outer shoulder breadth; shoulder slope; chest girth, width and depth; underbust; waist girth plus optional width/depth; abdominal projection; high-hip girth; maximum hip/buttock girth; pelvic landmark breadth; outer hip width; buttock height and posterior projection.
- Curves: ribcage-to-waist transition, abdomen contour, upper/lower/lateral buttock fullness, hip dips, folds and bilateral differences. Use visual controls when the user cannot reliably measure them.
- Where relevant, add breast/chest tissue projection, base footprint, spacing, vertical position and independent sides; underbust and chest girth do not uniquely define breast shape. These are future asset capabilities, not claims of existing morph support. Keep adult private presentation rules for optional detailed anatomy.
- Do not conflate bony pelvic breadth with outer soft-tissue hip width, or a whole-hip loop with a “left hip circumference.” Legacy ambiguous fields keep their original values and unknown method until the owner clarifies them.

### C. Arms, legs, hands and feet

- Left/right relaxed upper-arm, forearm, wrist, thigh, calf and ankle girths; maximum-section location; segment lengths; hand length/palm breadth; foot length/breadth; optional finger proportions and arch contour.
- Shape: elbow/knee prominence, calf belly height, forearm taper, knuckle form, ankle/heel transition, toe proportions. Support joint and tendon landmarks rather than smooth tubes.
- Add relaxed/flexed state metadata for arm girths; do not compare them as the same measurement. Prefer helper-assisted breadth measurements over invented precision from a flexible tape.

### D. Head, face and identity

- Head width/depth/height and girth; face height with explicit endpoints; cheekbone and jaw breadth; chin projection; nose bridge, width and projection; pupil-to-pupil distance versus inner-eye-corner distance; ear height/width/projection; mouth width and lip contour.
- Visual identity: eyelid shape and thickness, brow shape, eye socket depth, cheeks, hairline, hair density/direction, facial hair, lip/ear material, freckles, scars and small asymmetries.
- Avoid requiring users to self-measure dozens of facial distances. A guided multi-view visual editor is the default; optional calibrated images/scan fitting is a later route. Do not promise identity recovery from one image.

### E. Adult private external anatomy

Retain the detailed [existing anatomy plan](real-human-3d/16-private-anatomy.md): independent resting/erect endpoints, visible versus bone-pressed length records, base/middle/distal sections, width/depth or girth mode, taper, curvature, glans/foreskin, external scrotal envelope, optional independent testicular records, buttock contour and regional materials.

Clarify base circumference with a neutral schematic: root at the attachment end; highlighted closed tape loop at the specified shaft section immediately beyond the attachment transition; middle and distal loops shown separately. The chosen plane must be perpendicular to the local centerline. This is an app geometry definition, not a claim that an unspecified legacy value followed a clinical protocol. A root fold or abrupt flare can make this section ambiguous: allow a section marker to be positioned and store its location.

Scrotal width does not measure a testicle, a shaft loop does not include the scrotum, and a whole-hip loop is not isolated buttock volume. Keep clinical testicular volume records separate from geometric preview volume. Preserve the current adult eligibility and private storage/capture behavior.

### F. Skin tone, tanning and surface

- Global continuous base color plus regional overrides: face, ears, neck, torso, limbs, hands/feet, lips, nails, and the existing private regions. Bilateral linking is optional; inheritance and override status must be visible.
- Independent tan intensity, coverage mask, boundary placement, edge softness and left/right variation. A darker local region is not automatically a tan. Do not derive color, anatomy or shape from ethnicity labels.
- Add albedo detail, roughness variation, normals, pores, fine wrinkles, hair follicles and optional veins. Scale detail in physical units. No universal “vein visibility = body-fat percentage” rule.
- Compare under locked neutral lighting/exposure, with a second lighting preset for robustness. A casual photo includes illumination and camera processing; it is an appearance reference, not a calibrated pigment reading.
- Keep Fitzpatrick phototype as optional sun-response information, independent of a continuous color editor. [DermNet describes phototype in terms of sun response](https://dermnetnz.org/topics/skin-phototype). This source supports the distinction, not a new medical pigmentation model.

## 5. Every field needs a visual measurement contract

Each exposed control must answer **what it is, where it is, how to obtain it, what it changes, and how certain the preview is**.

1. On field focus or “Show me,” highlight the relevant model region and show a fitted close-up. Keep the last camera view restorable; on small screens place the illustration immediately beside/above the active input.
2. Show a closed tape loop for girth, paired arrows for width/depth, endpoints for length, an angle arc for orientation/curvature, and a translucent closed envelope for volume. Use a dashed hidden part of the loop so the full path is evident. Label front/back and left/right; side means the subject's side.
3. Show neutral, front/side/back or local cross-section views appropriate to the measurement. Animation is optional and must respect reduced-motion preferences. The diagram and text must stand on their own.
4. Explain the anatomical words in familiar language. Example: “Iliac crest = the top edge of your hip bone.” Link to the exact chosen measurement protocol, not a generic anatomy page.
5. Give tool, pose/state, tape placement, breathing instructions where protocol requires them, units, common mistakes, and whether a helper is advisable. Do not recommend wrapping a tape around a region when the field actually needs caliper breadth or a scan.
6. Show an exaggerated **illustrative** before/after effect on a generic preview. Do not silently treat that demonstration as the owner's saved measurement. If the model cannot apply the field, display “Recorded only — preview support pending,” or hide the control from shape editing.
7. Keep the numeric field empty until entered. Offer “Skip,” “Use a visual adjustment,” and “Record a measurement” as distinct routes. Show measured / visual estimate / scan-derived / inferred preview / model-derived provenance beside values.
8. Input mode exposes dependencies: use section girth + ovalness OR width + depth; derive remaining values from the resulting mesh. Conflicting locks produce an actionable explanation, with no silent replacement of measurements.
9. Keyboard focus must activate the same diagram; provide a textual equivalent, visible labels and non-color cues. Don't make hover or a rotating model the only way to understand the field.
10. Changing units preserves full-precision canonical values; rounding is display-only. Unknown, zero and not supported are distinct states. Sensitive field focus must not emit measurements into telemetry or public screenshots.

Example field copy:

> **Circumference at the base — shaft, resting**
> The complete distance around the shaft near its attachment to the body. The highlighted loop shows the exact section. Use a soft tape around this loop, snug without compressing the skin. Measure and save this state separately. This changes the root section thickness; it does not set length or scrotal size. If the section is unclear, adjust its marker or leave it unrecorded.

For waist, choose a named protocol. NHANES uses the iliac-crest level; WHO STEPS uses the midpoint between the lowest palpable rib and iliac crest. These cannot be silently pooled. Preserve legacy waist entries with `protocol: unknown`, and require the body-fat estimator to explicitly request its own formula-compatible sites. [CDC manual](https://wwwn.cdc.gov/nchs/data/nhanes/public/2021/manuals/2021-Anthropometry-Procedures-Manual-508.pdf), [WHO waist consultation](https://iris.who.int/bitstream/10665/44583/1/9789241501491_eng.pdf).

The companion HTML demonstrates the visual contract with selectable guides, width/depth versus girth, a generic local-section diagram, and a separate pigment/tan illustration. It does not collect or save personal information and is not a calibrated 3D renderer.

## 6. Geometry and rendering strategy

### Shape foundation

Retain the current MakeHuman asset pipeline as the first candidate, subject to a capability audit. Inspect topology, actual landmarks, section loops, UVs, bilateral regions, eyes/mouth/hands/feet and corrective shapes on both LODs. Do not assume missing shape freedom can be fixed with sliders.

Use an authored anatomical shape basis: skeleton/proportions, regional soft tissue, local contours, bilateral asymmetry, then pose correctives. Measurements constrain this basis. Every new degree of freedom requires a tested deformation and a named visual guide. Where a desired contour is outside the asset basis, commission/refine geometry rather than adding a cosmetic number field.

SMPL-X is relevant research because it combines body, articulated hands and facial expression in one model. It is not a turnkey photorealistic skin asset or proof that measurements recover a person uniquely. Review actual model/body licensing before adopting any replacement; no replacement or new license commitment is authorized by this research plan. [SMPL-X project and linked licenses](https://smpl-x.is.tue.mpg.de/).

### Measurement fitting

Replace independent normalized-slider assumptions with a constrained fitting stage where calibration warrants it:

```text
source records + method/state + uncertainty
  -> resolve compatible active constraints and explicit locks
  -> fit supported shape parameters in neutral pose
  -> apply pose and correctives
  -> measure final mesh in the requested pose/state
  -> show residuals and provenance; keep original records unchanged
```

An engineering objective can combine weighted measurement residuals, optional calibrated silhouette residuals, shape smoothness and intersection penalties. Weights come from repeatability/measurement uncertainty, not an invented “confidence %.” Use a local deterministic bounded solver before introducing a trained inference system. An impossible combination stays a draft with a conflict message. Visual edits can ask to unlock a constraint; they must not rewrite source measurements.

Cross-sections use region-aware plane intersections and stitched closed loops, not an arbitrary vertex row. Resolve multiple loops explicitly. Measure after relevant deformations and world scaling, with a versioned model-to-cm transform. Validate area/volume only on watertight, consistently oriented, non-self-intersecting regions with documented caps; reject invalid estimates instead of displaying a plausible number. Torso and regional caps must be shared so derived volumes don't overlap.

### Skin and identity foundation

Author separated albedo, normal, roughness and regional masks; use high-frequency normal detail for pores and geometry for silhouette-changing features. Add believable eyelid/eye wetline contact, cornea/iris layers, lips, mouth depth, nails, ears and hair. Test material appearance over a representative range of skin colors with identical lighting. Avoid glow or fixed baked shadows being used as substitutes for subsurface light transport.

NVIDIA's digital-human workflow treats skin, eyes, mouth and hair separately and includes subsurface scattering and surface maps. Borrow those principles, not RTX-specific settings for the browser. Prototype a measured, performance-bounded skin-scattering approximation against the current material; only ship if controlled images improve. [NVIDIA workflow](https://docs.omniverse.nvidia.com/workflows/latest/rtx_rt-dh-setup.html). MakeHuman also documents separate skin detail and PBR material controls. [MakeHuman enhanced skin](https://static.makehumancommunity.org/mpfb/docs/materials/skinv1.html).

Color textures and user colors need correct sRGB input conversion; calculations occur in linear space, while masks/normal/roughness maps are non-color data. Keep color management explicit and avoid multiplying an already colored albedo by an unrelated full skin swatch. [Three.js color management](https://threejs.org/manual/pages/color-management.html).

### Movement

Use a neutral fitting pose, then evaluate relaxed standing, seated, arm raise, elbow/knee bend and a shallow squat. Add shoulder/armpit, elbow, groin, buttock/thigh and knee correctives. Preserve volume where the deformation model intends it; breathing and small idle motion are presentation controls and should stop during measurement comparison. Still-image realism and motion realism need separate review.

## 7. Data contract and implementation boundaries

Add a public measurement-definition registry beside `bodyMetricContract.js`; reference it from `physiqueProfile.js` and the workbench. Private definitions belong with `anatomyCustomization.js` and remain on the private storage path.

```text
MeasurementDefinition
  id, version, plainLabel, technicalAliases, region, quantity, canonicalUnit
  protocolId, landmarks, sectionDefinition, side, pose, anatomicalState
  tool, instructions, commonMistakes, sourceLinks
  guideId, preferredViews, cameraTarget, textEquivalent
  affectsParameters, capabilityId, inputModes, dependencies
  availability: calibrated | approximate | recordedOnly | unsupported

MeasurementRecord
  definitionId + version, value|null, canonicalUnit
  side, state, protocolId, sectionLocation, measuredAt
  provenance: tape | helper | scan | visualEstimate | importedUnknown
  uncertainty|null, originalValue, originalUnit

PreviewResult (derived, never authoritative input)
  assetVersion, calibrationVersion, pose, measuredMeshValue
  residual, supportedRange, fitStatus, inferredFields
```

Use a shared contract for validation at the editor and API boundary. Structural validation rejects malformed/nonfinite data; asset support is a separate capability check. Do not discard an unusual valid record because a render range is narrower. Audit current sanitizer/range behavior before migrating. Preserve unknown legacy definitions and original values, including inch records; don't relabel them as newly standardized measurements. Keep current/goal separate from resting/erect and from scene presentation.

Proposed work locations:

- `src/lib/bodyMeasurementDefinitions.js`: public terminology, protocols, guide metadata and dependencies.
- `src/components/physique/MeasurementGuide.jsx`: keyboard-accessible illustrated help, textual instructions and capability status for the workbench.
- `src/components/physique/AnatomyMeasurementGuide.jsx`: region/state-specific private guidance using the same visual grammar.
- `src/components/morphEngine/measurementExtraction.js`: unit-aware sections, endpoints and validated derived geometry.
- `src/components/morphEngine/measurementFitter.js`: bounded fitting, explicit locks and residual reports.
- Asset metadata: versioned landmarks, regional boundaries, supported dimensions, calibrated parameter combinations and LOD correspondence.

These are proposed modules, not files already implemented by this plan. Reuse the existing store, API, renderer and private eligibility controls; no additional service is needed for the initial stages.

## 8. Delivery order and gates

### P0 — Trustworthy inputs and an honest baseline

Inventory all existing fields against actual asset support; mark calibrated, approximate, recorded-only or unsupported. Capture fixed-camera neutral-light baseline images, actual mesh dimensions and frame timings on agreed desktop/mobile devices. Build visual help for existing essential and private fields first. Replace vague circumference labels and explain protocols. Gate: each exposed field has a diagram, method, units, effect and capability status; unknown values remain unknown.

### P1 — Shape accuracy and full-body contour

Implement mesh extraction, supported constrained fitting, shoulder/torso/limb proportions and independent breadth/depth/contour channels. Calibrate combined edits and asymmetry. Gate: known synthetic geometry measurements are correct; mesh fits meet declared tolerances and hold selected locks; unsupported combinations produce an explanation. Do not require every planned metric to advance.

### P2 — Recognizable human detail and skin

Improve head/face, eyes, hands/feet, material layers, regional pigmentation and tan masks. Add before/after neutral and alternate light review. Gate: no mask seams, double tint, floating eyelids or repeated pore patterns at intended viewing distances; regional overrides affect only intended regions; blinded reviewers consistently prefer the new render for human realism. Personal likeness is reviewed separately when owner references are available.

### P3 — Adult anatomy capabilities

Apply the existing anatomy plan's section-based shape, independent endpoint states, scrotal envelope, buttock projection/contour and private region materials. Keep unsupported saved fields marked recorded-only until wired and calibrated. Gate: each enabled control changes the specified mesh/material region and obeys its locks; no intersections across tested combinations; state/goal isolation and privacy behavior remain intact.

### P4 — Pose, optional capture and performance

Add pose correctives; then pilot optional calibrated multi-view photos or scans for personal likeness. Explain scale, camera, clothing, occlusion and lighting limitations. Capture is optional and needs its own consent, retention and deletion design before implementation; no photo service is added now. Gate: deformation review passes, optional fitting reports uncertainty and unseen regions, and agreed device performance budgets hold.

## 9. Validation: replace “100%” with evidence

The following are **proposed engineering acceptance targets**, not research-established human accuracy guarantees. Freeze them after P0 repeatability and device measurements; publish results by region, supported range, LOD and pose.

- Extraction correctness: known circle/ellipse/box fixtures validate length, perimeter, area and closed volume; invalid/open meshes have no volume result. Account for mesh approximation error explicitly.
- Controlled synthetic fitting: target length/breadth/depth residual ≤ max(0.5 cm, 1% of input); girth ≤ max(1 cm, 1%); closed-region volume ≤ 3% against known digital fixtures. This tests the model/solver, not real-world scan accuracy. For compact private anatomy retain the existing anatomy plan's proposed target of max(1 mm, 2% of the requested render value) within declared methods and supported combinations, subject to calibration evidence. Full-body tolerances cannot be reused blindly.
- Real-world repeatability: use repeated measurements/scan captures with fixed protocols; report median and 95th-percentile absolute error and systematic bias by metric. Set achievable field tolerances from that evidence. A single successful avatar is insufficient.
- Likeness: match calibrated front/side/back silhouettes and landmarks where references exist. Report the comparison method and missing regions; visual-only inputs do not justify mm accuracy claims.
- Human appearance: compare fixed renders at intended full-body and close-up distances, under at least two lights; separately rate skin, face/eyes, hands/feet, contours and motion. Do not turn these ratings into a universal realism percentage.
- Usability: test at least five first-time users initially. Proposed gate: at least 80% can locate each tested section and choose the right tool/path without verbal help; record time, confusion and skipped fields. This is a formative design gate, not a population claim.
- Performance: provisional targets are p95 frame time ≤ 33 ms on the selected mid-tier mobile device and ≤ 16.7 ms on the selected desktop, at documented resolution/LOD. State cold-load size/time and editing latency. Revise device-specific targets from P0 evidence rather than claiming universal support.
- Regression: values round-trip across cm/in display, null stays null, imported method stays unknown, bilateral linking is reversible, saved-only fields are disclosed, visual adjustment cannot overwrite locked records, and private settings do not appear in ordinary logs or captures.

[ISO 20685-1 describes evaluating dimensions extracted from 3D scans](https://www.iso.org/standard/63260.html). Its public scope supports protocol-based evaluation; this plan does not claim compliance or substitute its proposed thresholds for the full standard.

## 10. Immediate next implementation

Build the shared measurement registry and visual help for **height, waist with an explicit protocol, hip girth, shoulder breadth versus outer width, chest depth, and base/middle/distal anatomy sections**. Add capability labels beside current anatomy fields. Then implement extraction/calibration for those fields before broadening input collection. This directly addresses the owner's confusion while creating a reliable foundation for a more realistic model.

Research sources were accessed 2026-10-20. Source-backed facts are linked near the relevant claims; module names, delivery sequencing, UI behavior and numerical acceptance targets are project recommendations.

## Implemented workspace improvements

The avatar workspace now calculates key measurement coverage from valid source records and shows live renderer/model checks separately. Human likeness remains **Not assessed**: neither complete inputs nor passing technical checks establish perceptual realism. Selected-part summaries use recorded values rather than preset personal assessments. Landmark labels use evaluated model-region frames and never present input coverage as a scan result.

Saved viewer preferences cover comfortable/compact spacing, inspector width, diagram instruction detail, and interface effects. The workspace inherits the app theme and palette; finishing effects and exposure use shared settings contracts. Effect requests obey runtime quality and reduced-motion limits, and disabled edge shading is no longer applied unconditionally. Layout and rendering saves merge with the latest physique targets to preserve unrelated records. Part selection preserves custom lighting, brings the model into view, and retains per-part zoom, rotation, pan, and mouse/touch drop support.

Private measurements now drive a section-based runtime surface on the bundled assets. Resting/erect endpoints, base/middle/distal girth, width/depth input mode, curvature, taper, glans/coverage controls, independent sac dimensions, posterior contour and regional pigment/tan/detail all affect the preview. Optional internal ellipsoid guides visualize recorded dimensions or volume without treating them as clinical anatomy. Source values outside suggested ranges remain editable and persist unchanged. Numerical drawing guards preserve a finite surface for zero or extreme entries. Current and goal records are independent; explicitly cleared measurements stay cleared.

Garments now use an owned geometry shell with body rig/morphs, per-bone coverage, geometric fit/ease, weave, seams, waistbands and hem trim. Underwear offers briefs/trunks/boxer briefs; gym offers tank/training/compression variants; casual offers sweatshirt/tee with joggers. Formal/swim previews and separate fabric/trim colors are also exposed. Outfit preferences persist separately and never restore Anatomical mode.

The section surface is a procedural approximation, not a calibrated fit to a person. Body-follow morphs and pose can change achieved dimensions. Posterior volume remains an approximate envelope target. Garments do not simulate fabric drape. Full-body fitting calibration, production topology/attachment review, authored clothing, and perceptual likeness evaluation remain later phases.

## Attachment, state and presentation fixes (2026-10-20)

DEBUG REPORT

| Item | Verified result |
| --- | --- |
| Symptom | Private anatomy appeared separated from the pelvis, especially in the erect state; increasing sac hang could detach its upper tissue. |
| Root cause | Hidden shaft rings retained the resting direction after rotation. A fixture measured a root vertex 4.78 cm in front of the body surface. Hang translated the whole sac; the reproduction moved its attachment 9.4 cm. Legacy resting dimensions also leaked into an unrecorded erect endpoint. |
| Fix | Runtime `section-surface-v3` embeds hidden root rings using pelvic triangle intersections, anchors upper sac tissue, keeps endpoint records independent, and exposes elevation, bend direction and foreskin retraction. Coverage changes the distal envelope, pigment and glans roughness without changing measured middle sections. Shape sliders now have explicit accessible names. |
| Presentation | View preferences persist custom solid/gradient backgrounds, stage visibility and neutral/cinematic lighting through the existing physique-target API. Neutral lighting uses white lights and disables atmospheric tint; background changes do not change body measurements. |
| Regression evidence | 58 focused tests passed across nine files. Chrome checks covered endpoint/appearance persistence, front/side attachment views in both states, saved custom backgrounds and clothing variants. Targeted lint passed. Production build passed with the existing large-chunk warning. |
| Wider-suite concerns | A run with two workers passed 725 tests but retained failures in unchanged launcher/finance expectations; two UI suites could not launch the missing bundled Playwright Chromium. The focused browser workflows used installed Chrome. |
| Status | DONE_WITH_CONCERNS: verified procedural rendering fixes, not a claim of clinical accuracy or complete personal likeness. |

Remaining asset work: the pelvic junction uses overlapping surfaces rather than welded topology. The foreskin is a closed outer envelope; an inner surface, opening and detailed frenulum require authored topology. Tissue mechanics, intermediate erection physiology, scan-based calibration and pose-wide attachment validation remain separate asset/validation work. Current and goal records, numeric advisory warnings, adult reveal and capture redaction remain in place.

## Assessed asset promotion (2026-10-20)

Male profiles now load `humanoid-adult-v2.glb` (high quality) or `humanoid-adult-v2-lite.glb` (balanced/performance). These are derivatives of the assessed MakeHuman CC0 assets, generated by `npm run humanoid:upgrade`. Explicit legacy/custom asset preferences and covered female/neutral fallback behavior are preserved.

The asset upgrade binds 961 hidden root and upper-sac vertices to pelvic triangles and normalized body skin weights, with body-follow deltas for all 58 body morph channels. Body/face vertex data, skeleton nodes and bind matrices, image bytes, materials, UVs, visible measurement rings and both private size deltas are preserved. Runtime section controls, resting/erect state records, current/goal independence, wardrobe preferences, custom backgrounds and adult/capture safeguards continue through the same stores and APIs.

Verification: 97 cached source files matched pinned manifests. Archived licence texts matched upstream git blobs. All four bundled GLBs passed validation. Ninety-two focused tests and six provenance tests passed. Chrome workflows verified loading the upgraded model, endpoint persistence across reload, front/side attachment views, clothing variants and saved custom backgrounds. Production build and targeted lint passed. Expanded attachment checks covered mass, abdomen, pelvis, hips, glutes, torso/leg length and an abdomen corrective in both endpoint states.

This is a binding upgrade of the assessed procedural model. It retains the authored-topology limitations listed above; it does not establish individual likeness or pose-wide clinical accuracy.

## Interactive plan page (revision 04)

`v4Plan_3DModel.html` presents this plan one Physique tab at a time (Blueprint, Measurements, 3D Mirror, Targets, History, then Roadmap). It runs entirely in the browser, including from `file://`, with no network request.

- **Model:** `plan-assets/human-preview.js` is generated from `public/assets/models/humanoid-base.glb` (CC0 MakeHuman assets) by `npm run plan:model`, which needs `sharp` installed only for that step (`npm install --no-save sharp`). It keeps the body surface and a 2048 px skin map, 22 shape morphs (17 body, 5 face), a joint-group map, and the eye part (with a per-vertex flag that tells the opaque eyeball from its glass shell) plus the brow and lash guide meshes. The external-anatomy mesh, the photo hair cards and the eye photo texture are not copied; the browser draws hair, brows, lashes and irises itself.
- **Viewer:** `plan-assets/src/` is bundled with the app's pinned `three` into `plan-assets/human-stage.js` by `npm run plan:viewer`.
- **Fitting:** `plan-assets/src/fit.mjs` is a small prototype of the P1 measure-then-fit loop: eight tape sites (neck, shoulders, chest, waist, hips, upper arm, thigh, calf) are measured on the morphed mesh and the shape controls are solved until each loop matches the entry, reporting `fitted` or `limit`. Landmark heights are placed by proportion on this one generic body; they are not detected on anyone.
- **Face, eyes and hair (3D Mirror tab):** one studio, generated from tables so each choice has a single definition.
  - *Skin* (`skin.mjs`): the photo colour map is divided by its own mean so any chosen tone lands on the colour picked; ten tone steps, undertone, freckles, flush, shine and pores; light wraps past the shadow edge (widest for red), thin parts glow when backlit; lips take colour, gloss and a seam from a region mask (`face.mjs`).
  - *Eyes* (`eyes.mjs`, `eyelayout.mjs`): each eye is a sphere fitted to the asset's eyeball vertices, with a procedural iris (fibres, collarette, crypts, limbal edge, round pupil) and a separate clear cornea layer drawn as light only (catchlights placed like a portrait photographer's lights). Eyes look at the camera within a natural range.
  - *Hair, brows, lashes* (`hairgrow.mjs`, `hair.mjs`, `hairstyles.mjs`): strands grown on the skin from a hairline function, a style's length map and a flow field, bound to skin triangles so they follow shape changes; drawn as camera-facing ribbons with Kajiya–Kay shading plus two shifted highlights. Lashes grow along the lid edge found where the eyeball meets the skin.
  - *Face sizes* (`faceparams.mjs`): fourteen readings (thirteen in millimetres, eye tilt in degrees) taken between landmarks bound to skin triangles; each slider drives a generated sparse morph made of landmark-anchored bumps. Typing a value runs a short secant solve against the drawn shape and reports when the model cannot reach it.
  - Population norms (ANSUR II, Farkas, interpupillary-distance surveys) bound the sliders; they are not scored or presented as ideals. The page's Roadmap tab lists each source and what the preview does with it.
- **Honesty labels used on the page:** *Fitted*, *Model limit reached*, *Roughly shown* (weight, body fat, skin, eyes, brows, lashes and hair) and *Fitted* for the face sizes and *Saved only* (shoulder width, chest depth, seat projection, lower-leg length), matching the availability states in section 7.
- **Checks:** `npm run test:plan` covers the cross-section maths, fit tolerance on the real asset, that the embedded preview matches the GLB it was built from, the eye layout, landmarks on the skin, generated face channels (small, local, symmetric), mm readings and the solver, hairline region, seeded hair growth, strands following the skin, brows and the lid edge, and the colour tables. Regenerate both assets whenever the GLB changes.
