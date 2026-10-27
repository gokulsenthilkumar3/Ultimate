# Create your own head: the simple matrix

Design revision: 2026-10-24. **Research and product specification; the full matrix is not implemented.** This is the current entry point for the whole head above the neck. The [architecture](head-system-architecture.md) explains how one implementation serves different people; the [audit](audit-and-realism.md) records corrections and evidence limits. The later authorised [implementation continuation](implementation-progress.md) records the executable slices separately.

The intended experience is: **choose a part, make it look like yours, optionally enter a measurement, and check it from the relevant angles.** Nobody must learn anatomy or fill in every field to start. The detailed matrices are the team's specification, not a spreadsheet that the person must complete.

## What is included

The head means the face, forehead, crown, sides and back of the skull/scalp, ears, eyes and lids, nose and nostril openings, lips, visible mouth interior and teeth, all head hair, skin and individual marks. The underside of the chin and the transition into the neck are included so the head connects correctly. Long hair and beard can extend below that boundary. Neck circumference, shoulders and the rest of the body remain separate controls.

Internal skull, muscles and fat can support deformation; hidden brain, blood vessels, middle/inner ear and sinuses are not required inputs for a visible likeness. Visible cavities must have appropriate depth and occlusion. Educational internal anatomy would be a separate layer, not a requirement for creating a face.

The schema must accept different ages, asymmetry, missing or altered features, prostheses and custom geometry. Existing adult assets do **not** establish working child, older-adult or every facial-difference coverage. Features outside an asset's range need a different asset or a local shape edit; they must never be described as an invalid person.

## The flow people see

1. **Start:** choose “Adjust a starting head” or “Use my reference.” Reference images are optional. Save to the selected person and Current/Goal slot. Starting heads are editable examples, without ancestry or sex restrictions on features.
2. **Match the overall shape:** front and side previews show head width, height, depth, cheeks, jaw and chin. Use labelled pictures and small adjustments. “Keep this for now” moves on.
3. **Match the features:** tap Eyes, Nose, Mouth, Ears, Hair or Skin. Show a few relevant controls at once. Each card offers “Looks right,” “Adjust,” and “Skip.” Reveal finer options with “More detail.”
4. **Add a number only if known:** choose “I have a measurement.” The card shows two highlighted points or a highlighted path, the unit, the required view and how the value was obtained. There is always “I don't know.”
5. **Check around the head:** front, both quarter turns, both sides, back, top and underneath; freely rotate between them. Choose “Edit this area” from any view. Check expressions separately.
6. **Save:** show what was changed and any unrepresented choices. Saving a draft is allowed with unknown fields. “Checked 5 of 9 views” describes review progress; it is never “56% accurate.”

Changing a photo, light or camera must not automatically alter the saved head. References begin as local, session-only images, consistent with the existing editor. Persistent reference storage, scan import and automatic reconstruction are future capabilities that must be identified separately when implemented.

## The everyday matrix

All entries below are optional. “Smaller/larger” means compared with the current preview. A middle slider position means the starting shape, not a population average. Each visual option has a labelled thumbnail and an adjustable range; it is not a fixed face category.

| Tap this | First choices shown | More detail when wanted | Most useful views |
| --- | --- | --- | --- |
| Whole head | Wider/narrower; taller/shorter; deeper/flatter | Crown, back-of-head curve, left/right shape, size relative to body | Front, sides, top, back |
| Forehead | Height; forward/backward slope | Brow ridge, centre shape, temples | Front, sides, top |
| Cheeks | Cheekbone width; cheek fullness | Forward projection, hollows, under-eye shape, dimples, lower-cheek fullness | Front, both quarter turns |
| Jaw and chin | Jaw width; chin width and projection | Corner shape, chin height/cleft, left/right differences, under-chin contour | Front, sides, underneath |
| Eyes | Spacing; visible opening; iris colour | Each eye's position, upper/lower lid shape, folds, crease, hooding, corner angle, globe fit | Front, both quarter turns, blink |
| Brows and lashes | Brow shape/fullness; lash length/fullness | Brow position, gaps, direction, upper/lower lashes, separate colours and sides | Front, sides, blink |
| Nose | Width; bridge profile; tip shape | Root, length, tip projection/turn, wings, nostrils and centre underside | Front, both sides, underneath |
| Lips and mouth | Mouth width; upper/lower lip shape | Lip projection, Cupid's bow, groove above lips, corners, natural resting gap | Front, sides, smile/open mouth |
| Teeth and inside mouth | Visible teeth, gaps and colour | Each tooth, missing/restored teeth, arch shape, gums, tongue, palate and cavity | Smile, mouth open, both quarter turns |
| Ears | Size; how far they stick out; lobes | Ear folds, angle, position, attachment, separate sides, altered/missing parts | Both sides, front, back |
| Scalp hair | No hair or style; length; fibre shape; colour | Hairline, crown whorl, parting, temple/nape edges, thinning patches, grey/dyed sections | Front, sides, back, top |
| Beard and mustache | None or style; length; fullness; colour | Separate mustache, cheek/chin/jaw/sideburn regions, gaps and connections | Front, sides, underneath |
| Skin | Colour and undertone; surface detail | Local colour, shine, fine hair, pores, lines, folds, under-eye detail | Front, quarter turns, varied light |
| Marks and additions | Add a mark or accessory where you tap | Freckles, moles, birthmarks, scars, tattoos, makeup, piercings, glasses or prosthesis | The marked area and adjacent views |

“My left / My right” always means the person's own sides. Mirroring a preview never swaps saved anatomy. “Edit together” is available, but existing differences are preserved until the person explicitly chooses to copy one side to the other.

## A measurement card that needs no anatomy lesson

Example **design**, with an invented value to demonstrate behaviour:

```text
Nose width                                      Optional
[Front preview: a dot on each outer nose wing]

Make it narrower  [−] ─────●───── [+]  Make it wider
I have a measurement ▾
  Across the two outside edges shown: [36] [mm ▾]
  This is a straight distance, not a tape over the nose.
  Where did it come from? [Measured] [Scan] [Estimate]
  Your entry: 36 mm · Current model: unavailable until calibrated

[I don't know] [Undo] [Reset this part]
```

No one is asked to put a tool against the eye or inside the nose/mouth. Such dimensions use an existing measurement, an appropriate calibrated capture, or visual matching. A photograph without scale is a visual reference; a ruler somewhere in the photograph does not calibrate all facial depths. Camera distance changes apparent feature proportions. [NIST's explanation of perspective distortion](https://www.nist.gov/glossary-term/39671)

Every numerical card must distinguish **your entry**, **the model's measured result**, and **the difference**, with the measurement method. A typed value is a target, not proof the mesh achieved it. An uncalibrated model displays “Visual adjustment” instead of a made-up millimetre result.

For “Eye spacing,” the card first offers “Between pupil centres” and “Between inner eye corners,” each illustrated. They are different quantities. Likewise, nose root-to-base height, root-to-tip length and tip projection must not share one ambiguous “nose length” field. The [specialist matrices](#detailed-matrices-for-the-team) define these distinctions.

## A starter worksheet

This can be filled in without numbers. Blank means unknown, not zero. Use it as a quick interview or a future guided editor layout. It is **not an import format already supported by the app**.

| Item | Your entry |
| --- | --- |
| Start from | Existing draft / starting head / my optional references |
| Overall head | Keep / adjust width / height / depth / back / top |
| Forehead, cheeks, jaw, chin | Keep / select the area to adjust |
| Eyes and lids | Keep / spacing / shape / colour / separate sides |
| Brows and lashes | Keep / shape / fullness / colour |
| Nose | Keep / width / bridge / tip / nostrils |
| Mouth and teeth | Keep / lips / smile / teeth / inside mouth |
| Ears | Keep / size / angle / folds / separate sides |
| Scalp hair | None / choose style; length; texture; colour |
| Beard and mustache | None / beard / mustache / both; edit separately |
| Skin and marks | Colour; optional mark locations and appearance |
| Measurements I already know | Label + value + unit + method; otherwise blank |
| Views I checked | Front / left quarter / right quarter / left / right / back / top / underneath / free rotation |
| What still does not match | Select a region; add a note or optional reference |

The number of controls is not a measure of quality. Several different heads can share the same small set of distances. Fine likeness also depends on local surface shape, texture, hair, expression and the camera. This is an engineering limitation of the proposed representation: a short form can provide a useful starting likeness, while complete matching needs additional observations and sufficient asset detail.

## Plain wording and accessible operation

Use “How far the chin comes forward” before the technical alias “chin projection”; “crease above the eye” before “supratarsal crease”; “ear sticks out” before “auricular protrusion.” Search accepts both. Never label a head “normal,” “ideal,” “ethnic,” “masculine enough,” or “100% realistic.” Reset means “Back to my starting value,” not “Back to average.”

Keep labels and short instructions visible; give related inputs a group name, and show optional status and correctable errors beside the field. Long editing flows are split into manageable steps. These choices follow [W3C's forms guidance](https://www.w3.org/WAI/tutorials/forms/) and [instruction guidance](https://www.w3.org/WAI/tutorials/forms/instructions/).

Provide keyboard controls, buttons as alternatives to dragging, a text list as an alternative to tapping a 3D part, named colours, zoomable diagrams and reduced motion. Sliders announce meaningful words and units, and must be tested with touch assistive technology. [W3C slider guidance](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)

## Detailed matrices for the team

| Specification | Responsibility |
| --- | --- |
| [Head shape, nose and ears](head-shape-nose-ears-matrix.md) | Whole-head geometry, explicit measurement methods, back/top/underneath, face silhouette and asymmetry |
| [Eyes, mouth and teeth](eyes-mouth-matrix.md) | Eye/lid structures, lips, dental variability, visible oral anatomy and motion/contact |
| [Hair, skin and details](hair-skin-details-matrix.md) | Scalp/facial hair, separate grooms, pigment/materials, marks and modifications |
| [Universal head architecture](head-system-architecture.md) | Shared definitions, per-person values, measurement fitting, capabilities, compatibility and acceptance |
| [Audit and acceptance contract](audit-and-realism.md) | What was checked, corrected, retained as history and still unproven |

The matrices cover the requested visible regions and provide an extension path. They do not establish that every possible human form is captured, that all measurements uniquely identify a face, or that current assets can reproduce everyone. Those claims require implementation and individual reference-based validation.
