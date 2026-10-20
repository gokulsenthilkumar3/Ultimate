# Adult anatomy customization: research and implementation plan

> 2026-10-20 continuation: see [Human realism and visual measurement plan](HUMAN_REALISM_AND_MEASUREMENT_PLAN.md) and the [interactive plan, tab by tab](../../v4Plan_3DModel.html) (earlier [measurement guide](../../v3Plan_HumanRealism.html)). Some controls described below now exist in the working tree but remain recorded-only; the continuation contains the current audit, full-body scope, skin tone/tanning clarification and illustrated field requirements. The original research is retained below.

Researched 2026-10-19 for `/Ultimate/wellness/physique?view=3d`.
Status: proposed implementation; this document does not mean the controls exist yet.
Scope: adult male external anatomy, buttocks, and regional skin appearance in the existing Ultimate viewer.

## 1. Design decision

Build a measurement-driven editor with separate resting and erect profiles, independent scrotal shaping, bilateral buttock shaping, and regional skin materials. Keep measurements, visual shape adjustments, and presentation state distinct. Continuous controls should describe variation without ranking bodies or presenting internet shape names as medical classifications.

This plan supersedes the population-range clamping and unspecified/default measurement recommendations in section 4 of `ANATOMY_ASSET_PLAN.md`. Population reference statistics are context, not universal limits, personal targets, or measurements of the owner. Existing recorded values must survive migration unchanged. Unspecified measurements remain unspecified even when a generic preview is displayed.

## 2. Research findings and their implications

### Penis: state and measurement method matter

Veale et al. pooled clinician-measured studies and reported mean resting length 9.16 cm, erect length 13.12 cm, resting circumference 9.31 cm, and erect circumference 11.66 cm. The erect samples were substantially smaller than the resting samples. The review specified measurement landmarks and included participants aged 17 and above; its eligibility criteria are not the application's adult eligibility policy. These are reference estimates from selected studies, not a complete description of every adult body. [Veale et al., 2015, DOI 10.1111/bju.13010](https://www.drjromero-otero.com/wp-content/uploads/2018/08/Veale_et_al-2015-BJU_International.pdf)

A multi-observer study of 201 adults found considerable differences between stretched-flaccid and pharmacologically induced erect measurements, including observer variation. Record state, landmarks, and method; do not calculate someone's erect dimensions by multiplying their resting dimensions. Stretched length is an optional separate measurement, not an alternative label for erect length. [Habous et al., 2015](https://pubmed.ncbi.nlm.nih.gov/26440678/)

The 2018 grower/shower study used an absolute length-change threshold in a clinical ED cohort. A 2026 retrospective Doppler study used percentage growth and an intermediate group, and explicitly called for prospective validation. Product inference: allow independently entered endpoints and show their numerical difference when methods match; avoid mandatory grower/shower categories or diagnostic claims. [Yafi et al., 2018](https://pubmed.ncbi.nlm.nih.gov/30068977/), [García-Gómez et al., 2026](https://pubmed.ncbi.nlm.nih.gov/42299499/)

Curvature is a geometric feature the editor can represent. The app must not infer Peyronie's disease from a curve control: that condition involves scar tissue and clinical assessment, not just an angle. [NIDDK: Penile curvature](https://www.niddk.nih.gov/health-information/urologic-diseases/penile-curvature-peyronies-disease)

### Scrotum: external sac and internal testes are different structures

Left/right size and height differences should be representable; NHS guidance notes that one testicle can be slightly larger or hang lower. Use independent sides with an optional link, without enforcing a particular lower side. [NHS: How to check your testicles](https://www.nhs.uk/tests-and-treatments/how-to-check-your-testicles/)

Testicular volume depends on measurement method and formula. One study comparing ultrasound, orchidometry, and water displacement examined 40 testes from older prostate-cancer patients; it compared coefficients 0.52 and 0.71. This supports recording method, not using that cohort as a universal size standard. A geometric ellipsoid uses `pi/6 * length * width * depth`; the empirical Lambert ultrasound estimate uses `0.71 * length * width * depth`. These estimates are not interchangeable, and neither describes the external scrotal envelope. [Sakamoto et al., 2007](https://pubmed.ncbi.nlm.nih.gov/17270639/)

Provide relaxed/contracted scrotal presentation as a manual visual control. Do not claim a temperature slider accurately predicts an individual's physiology; the reviewed evidence does not establish such a personal mapping.

### Buttocks: one circumference cannot specify a 3D shape

Whole-body scanning research distinguishes circumference, surface area, volume, and predicted body composition, and reports systematic effects from landmark positioning. A hip-girth study also found posture changes the measurement. Fix the app's pose and landmark definitions before calibrating dimensions. [Ng et al., 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5466169/), [Gill and Parker, 2017](https://pubmed.ncbi.nlm.nih.gov/27764997/)

Engineering inference: equal hip circumferences can coexist with different widths, rear projections, and left/right fullness. Therefore keep pelvic breadth, hip circumference, posterior projection, and local contour separate. A model's posterior envelope volume is not a measurement of gluteal muscle or fat. Surgical aesthetic cohorts do not establish an ideal shape for this viewer.

### Skin: regional pigment is not the same thing as UV tan

Fitzpatrick phototype describes response to sunlight; it is not a complete regional color specification. Use a global base appearance with independently editable local pigmentation and an optional tan layer. Do not assume all darker genital, groin, or buttock skin represents UV exposure. [DermNet: Fitzpatrick skin phototype](https://dermnetnz.org/topics/skin-phototype)

A year-long reflectance study found body hair and season could affect melanin estimates differently at the inner arm and buttock. Do not infer precise pigment values from a casual photo, hair density, or another body region. Regional colors in this feature are user-selected appearance settings, not a medical pigmentation assessment. [van der Mei et al., 2002](https://pubmed.ncbi.nlm.nih.gov/12208036/)

## 3. Current implementation and gaps

| Existing component | Present behavior | Required change |
| --- | --- | --- |
| `src/lib/bodyMetricContract.js` | Resting length 3–16 cm and girth 5–14 cm input ranges | Versioned, state-aware measurements; separate stored values from calibrated render limits |
| `src/components/morphEngine/anatomyCalibration.js` | Two resting morphs calibrated to visible mesh centerline and mid-shaft perimeter | State/landmark metadata, cross-section measurements, curvature-aware calibration |
| `src/components/HumanoidViewer.tsx` | Two private measurement rows, current/goal columns | Focused anatomy editor with state, region, input mode, units, and linked dimensions |
| `src/components/morphEngine/metricsToBlendshapes.js` | `glutes` circumference feeds `glute_volume` | Distinguish measured girth, contour sliders, and computed volume |
| `scripts/build-makehuman-glb.py` | Procedural resting shaft and scrotal envelope | Dedicated shape channels, endpoint poses, independent bilateral scrotal shaping and corrective geometry |
| `src/components/body3d/physicalSkinMaterial.js`, `anatomySurface.js` | Global tone plus procedural local shading | Region masks, inherited/overridden colors, separate tan and surface-detail layers |
| `src/store/useStore.ts` | `/physique_targets` singleton; persisted under `user.physiqueTargets` | Validate and migrate nested v2 data using the existing API and stores |

The current model has no independent erect profile, testicular dimension controls, measured buttock volume, or per-region color editor. The present procedural geometry remains a fidelity limitation even after additional sliders.

## 4. Proposed controls

### Penis

| Group | Controls | Meaning |
| --- | --- | --- |
| State | Resting / erect; optional intermediate preview | Independently saved endpoints; interpolation is a visual transition, not a prediction of physiological state |
| Measurements | Length; base, middle and distal circumference; local width and depth | cm/in display, canonical cm storage; cross-sections perpendicular to the local centerline |
| Length method | Visible skin-junction to tip; bone-pressed dorsal measurement; optional stretched record | Preserve method; centerline arc length and straight endpoint distance get separate labels |
| Shape | Base-to-tip taper, cross-section ellipticity, glans length/width/flare, curvature direction and amount | Continuous geometry controls; shape changes must respect selected measurement locks |
| Orientation | Root pitch, lateral direction, relaxed hang | Move pose without silently changing measured length |
| Foreskin | Coverage and retraction; appearance of circumcision boundary | Visual geometry/material parameters; coverage can differ between endpoint states |
| Derived values | Surface area, external modeled volume, state difference | Labeled estimates with a documented root boundary; no automatic health scores |

Optional neutral starting presets can describe uniform, tapered, or distal-flare geometry. They remain editable and must not imply a medically exhaustive list of penis types. Selecting a preset changes only the disclosed shape fields; it does not replace recorded measurements or automatically set color.

Do not treat a bone-pressed clinical measurement as identical to the current visible mesh centerline. If the model cannot map a method faithfully, preserve the record and identify the preview as an approximation. Do not fill an absent erect endpoint with a population mean or an inferred multiplier.

### Scrotum and testes

| Region | Controls | Derived/linked behavior |
| --- | --- | --- |
| External scrotal sac | Overall height, width, depth, hang distance, neck width, left/right fullness | Defined external envelope volume and selected section circumference; independent from penile girth |
| Left and right sides | Vertical offset, lateral separation, rotation, asymmetry | Link sides by choice; unlink without losing either value |
| Each testicle, advanced | Length, width, depth, or volume with aspect-ratio locks | Generic internal shape guides fit the outer sac; clinical records retain their own method and are never relabeled as mesh volume |
| Skin surface | Fold strength, fold scale, median raphe prominence, roughness | Surface detail scales with the region; it must not change the measured envelope dimensions |
| Presentation | Relaxed to contracted | Separate visual state from saved dimensions; fit envelope and contents without visible intersections |

No requirement to enter internal testicular measurements to customize the outer sac. Internal shape guides can remain generic and hidden. Never infer internal dimensions from an external scrotal photo or an outer width slider.

### Buttocks

| Group | Controls | Constraint |
| --- | --- | --- |
| Overall dimensions | Hip circumference, pelvic breadth, buttock width, height and posterior projection | Fixed neutral standing pose and named landmarks |
| Distribution | Upper/lower fullness, lateral fullness, hip-dip depth, left/right asymmetry | Preserve chosen total volume or girth when the user enables the corresponding lock |
| Contour | Gluteal cleft depth, lower fold, vertical position, thigh/waist transition | Corrective shapes maintain continuity with pelvis and thighs |
| Definition | Softer/firmer visual contour and surface detail | Appearance only; no claim to measure muscle/fat composition |
| Volume | Combined and left/right posterior envelope volume, optional volume editing | Compute from a closed region with a documented anterior cap and shared boundary; label as model estimate in mL/L |

Offer front, side, back, and three-quarter views plus a measurement overlay. A numeric volume field only becomes available after the region is closed and the measurement algorithm is validated. Until then the existing morph must be called fullness rather than volume.

### Regional skin and tan

Supported selectable regions: torso/pelvis, groin, shaft, glans, foreskin/circumcision boundary, scrotum, perineum, inner thighs, left buttock and right buttock. Each inherits the global appearance until explicitly overridden.

- Pigment: color picker, lightness, warmth/undertone, saturation, and blend strength. Allow lighter as well as darker local regions.
- Tan: separate optional intensity, coverage, boundary position, and edge softness; support tan lines without forcing a global darkening.
- Surface: roughness, fine folds, follicle/hair density, and subtle detail variation independently from pigment.
- Editing: select on model or in a region list; highlight the selected region; copy settings to another region, link bilateral regions, undo, and reset only that region.
- Review: stable neutral lighting and exposure while comparing colors; lighting changes never alter the saved pigment settings.

Use shared UV-space masks with normalized feathered weights so adjacent regions blend continuously across both assets. Color inputs/textures follow the renderer's sRGB-to-linear workflow; data masks, roughness, and normals are non-color data. Prevent repeated tint multiplication from obscuring local overrides. These are engineering decisions supported by the renderer's color-management requirements. [Three.js color management](https://threejs.org/manual/pages/color-management.html)

## 5. Measurement dependency rules

Length, width, depth, circumference, and volume are related; they cannot all be arbitrary independent dimensions of the same locked shape.

1. Choose the active input mode per section: **circumference + ellipticity** or **width + depth**. Derive the remaining section dimensions from the actual mesh. Do not use `width = circumference / pi` unless a circular cross-section is explicitly selected.
2. Volume is initially derived. In volume-edit mode, solve dimensions with explicit locks such as length + cross-section ratio or width + height. Show which unlocked values will change. When constraints conflict, retain the draft and explain which lock must be released; never silently overwrite measurements.
3. Compute length, section perimeter, surface area, and volume after deformation in consistent model units. Fix region boundaries in an asset contract. For a closed, consistently wound mesh use signed tetrahedral volume; `1 cm³ = 1 mL`. Do not apply a clinical ultrasound coefficient to a mesh-volume calculation.
4. Distinguish recorded measurement, manual visual estimate, derived mesh estimate, and generic preview. Preserve unknown values as `null`. A generic preview is not saved as a measurement.
5. Record state, method, side, section/landmarks, date, and units. Optional context can include posture or measurement conditions. Only compare measurements with compatible definitions.
6. Validate finite numbers and structurally valid input separately from asset capability. Calibrated render bounds belong to a versioned asset manifest; population averages do not define acceptable human limits. Preserve out-of-render-range records and show that the preview is limited.
7. A resting/erect difference is calculated only from explicitly supplied compatible endpoints. Current/goal comparison is a separate axis from anatomical state. Goal shapes are visual targets, not claims that a change is achievable.

No final universal slider limits are asserted by this research. Establish per-asset tested ranges during calibration, including combinations, before enabling a field. The current resting-only ranges must not be reused as erect limits.

## 6. Data and API design

Add a versioned `anatomyV2` object inside the existing physique-target payload. Reuse Ultimate's current API port and database; this feature needs no additional service or database migration between stores.

Proposed structure:

```text
anatomyV2
  schemaVersion: 2
  current / goal
    penis
      resting / erect
        measurements: values + methods + provenance
        shape: taper, sections, glans, curve, foreskin
      stretchedRecord: optional, separately labeled
    scrotum
      envelope: dimensions + shape
      left / right: optional testis dimensions + measurement method
    buttocks
      measurements: girth, breadth, projection, landmarks
      shape: bilateral distribution and contour
    skinRegions: inheritance, overrides, tan, surface
  presentation: endpoint selection, interpolation, contraction, camera
  assetCalibrationVersion
```

Persist numeric inputs in cm, areas in cm², and volumes in mL, with an explicit display-unit preference. Keep measured values and visual adjustments in separate subobjects. Do not store derived mesh results as authoritative source measurements.

Migration maps `anatomyLengthCm` and `anatomyGirthCm` to resting records, preserves retired inch fields and original values, and marks old measurement methods unspecified. Unknown erect/scrotal fields remain null. Do not copy a resting record into the erect record. Keep current and goal values separate. Reads remain backward compatible; writes merge nested state without erasing unrelated physique settings. Server validation must use the same schema as the editor. Audit existing goal serialization before moving private goal fields into the nested structure.

Keep the existing adult eligibility, matching-asset check, covered session default, and capture redaction behavior. New private fields must follow the existing private path rather than the general metric log. Avoid logging values in analytics, errors, fixtures, or public exports; use generic adult fixtures for review images.

## 7. Geometry and rendering work

1. Define a named asset contract for all landmarks, section loops, closed volume regions, units, UV masks, available shape channels, and supported parameter combinations. Calibrate full and lite assets independently.
2. Author resting and erect endpoint geometry, independent shaft/glans/foreskin variation, and separate scrotal channels. Use curves/local frames and corrective shapes rather than scaling one connected primitive in three axes. Foreskin coverage/retraction needs topology designed for it.
3. Add bilateral buttock channels and preserve pelvic/thigh attachment across body mass, hip width, pose, and local edits. Include neighboring tissue in smooth falloff and corrective regions.
4. Refit the scrotal envelope around its optional internal guides; use attachment and clearance constraints against the penis, pelvis, and thighs. Test combinations rather than only each slider in isolation.
5. Preserve skin weights, body morphs, existing pose behavior, and per-comparison geometry ownership. Update normals/tangents after actual shape changes, cache results, and dispose obsolete buffers.
6. Add region materials through the existing skin pipeline. Match albedo, detail scale, seams, and lighting across body and anatomy instead of giving each part a disconnected material appearance.
7. Export both LODs, run provenance checks, and retain the current licensed base sources. Additional art must have documented distribution rights. A procedural pass can improve variation; authored topology and sculpt review are still required before claiming high anatomical fidelity.

glTF morph targets are weighted vertex deltas applied before skinning. They do not themselves enforce anatomical dimensions or prevent collisions. The app's solver, corrective shapes, and measured validation must provide those guarantees. [Khronos glTF 2.0: Morph targets](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#_morph_targets)

## 8. UI flow

In the existing Anatomy panel: choose **Penis / Scrotum / Buttocks / Skin**, then **Measurements / Shape / Surface** for the selected region. Keep current/goal selection distinct from resting/erect state. The selected model region and measurement landmarks should respond immediately without changing the camera unexpectedly.

Show the most useful controls first: length/girth, sac dimensions/hang, buttock width/projection/fullness, and regional color. Put cross-section shape, bilateral differences, method metadata, and volume locks under Advanced. Numeric inputs and sliders stay synchronized; keyboard entry, unit labels, reset-per-field, undo/redo, and visible save/error status are required. Editing a color or shape must not reset measurements. Canceling a draft restores the last committed edit.

## 9. Delivery order and completion criteria

| Phase | Deliverable | Completion check |
| --- | --- | --- |
| 1 | v2 schema, measurement definitions, migration and editor skeleton | Legacy values round-trip; nulls remain null; nested edits preserve other settings; current/goal and resting/erect never overwrite each other |
| 2 | Penis endpoints, section-based dimensions, curvature and foreskin | Each exposed measurement matches the deformed mesh; pose changes preserve measurement locks; unsupported endpoint stays clearly unspecified |
| 3 | Independent scrotum, bilateral variation and fit constraints | Sac does not inherit penile girth; side linking is reversible; contracted/relaxed previews keep valid geometry |
| 4 | Buttock dimensions, bilateral distribution, closed volume regions | Projection and breadth vary independently; locked volume/girth behaves predictably; derived volume has documented boundaries |
| 5 | Region selection, pigment, tan and surface layers | Overrides survive reload; changing one region has no remote tint side effect; seams remain blended on both LODs |
| 6 | Cross-feature integration and visual review | Full/lite assets, comparison figures, body extremes, neutral views, persistence, covering/capture behavior and performance all pass |

Geometry calibration target: exposed linear dimensions and circumferences within the larger of 1 mm or 2% of the requested render value, for the declared measurement method and supported combinations. This is an engineering acceptance target, not clinical accuracy. Establish a separate volume tolerance using known closed primitives and tessellation convergence before publishing volume readings. Retain the existing 0.5 mm attachment-separation target where applicable.

Test minimum/mid/maximum supported values, asymmetric pairs, state transitions, combined body morphs, repeated edits, reload/migration, and unit conversion. Check non-finite coordinates, inverted faces, attachment gaps, unintended intersections, and shader errors. Review neutral front/side/back/three-quarter renders across multiple global tones and regional contrasts. Record load time, drag latency, memory and frame-time baselines on named desktop/mobile devices before expanding geometry or material budgets; do not invent an unmeasured FPS guarantee.

Run focused schema/solver/calibration/material tests, existing physique browser coverage, typecheck, build, GLB validation, and release asset provenance checks after implementation. No application tests were run for this research-only document change.

## 10. Limits of this research

The reviewed literature does not establish an exhaustive taxonomy of shapes, a universal healthy size range for every parameter, a person's erect dimensions from their resting dimensions, or a personal regional skin palette. Many studies use selected clinical cohorts and different measurement methods. The proposed control set and solver are engineering/design conclusions informed by those limits. The feature should represent user-entered adult variation without presenting a visual preview as a clinical measurement or diagnosis.

## 11. Implementation progress

The first UI/data pass adds a versioned private `anatomyV2` object, Current/Goal profiles, resting and erect measurement records, measurement method selectors, separate scrotal-envelope and left/right testicular records, buttock measurement/contour fields, and independent regional skin/tan settings. Legacy resting length/circumference and glute circumference seed the corresponding editor fields without changing the recorded values. Saved resting length, mid-shaft circumference, and hip circumference continue to drive the existing asset morphs.

The other v2 shape and regional-material fields currently save as profile customization data and do not alter the shipped mesh. The asset still has no erect-state geometry, independent testicular forms, scrotal dimensional channels, distributed buttock contour channels, or UV region masks for local color. They require the geometry/material implementation and calibration phases above before the preview may claim to display them. This is explicit in the editor.
