# Avatar measurement editor: purpose and grouping

The editor supports three tasks: record current measurements, set optional targets, and compare them. Current and Goal each show one set of inputs; Compare shows both. This reduces accidental edits to the wrong record and removes duplicate entry fields from routine check-ins.

## Information hierarchy

| Group | Purpose | Needed for routine use? |
| --- | --- | --- |
| Essentials | Height, weight, waist and optional measured body fat | Suggested starting point; no field is mandatory |
| Body composition | Overall size and measured composition records | Optional additional tracking; the avatar does not infer measurements |
| Upper body / Lower body | Circumferences and dimensions by body region | Optional size tracking and approximate preview refinement |
| Proportions and face | Lengths and facial dimensions | Advanced visual fitting, not routine check-ins |
| Left / right symmetry | Separate records for each side | Optional; some preview controls average both sides |
| Posture and alignment | Angles and alignment records | Optional; preview effects depend on rig support |
| Facial shape | Relative visual adjustments | Appearance customization, not routine tracking |

All 77 catalog entries remain accessible. Search covers the whole catalog even when a smaller group is selected. Clearing search restores the selected group. The complete list and search results use body-group headings.

## What belongs in each card

- Name, unit, and Recorded/Optional status.
- Current input, Goal input, or both according to the active task.
- Progress only when a recorded baseline, current value and target support a valid calculation. Empty goal-progress messages are omitted.
- A collapsed About this measurement section explains the location and whether it changes the model, is approximate, or is stored only. Its guide action opens the existing illustrated instructions.

Do not present estimated or inherited values as entered measurements. Preserve unit parsing, validation, draft behavior, persistence, and account/person isolation. Existing catalog entries remain available because saved records and advanced workflows may depend on them; availability does not make them essential for every user.

## Page responsibilities

- 3D Mirror: inspect the preview and make focused edits.
- Measurements: enter a larger set of measurements in the dedicated workspace.
- Targets: manage desired values.
- History: review saved check-ins.
- Appearance and model tools: optional customization, separate from measurement entry.

Keep technical model-fit details and diagnostics collapsed. Include precise model limitations in the measurement explanation rather than repeating them above every input.

## Verification

Presentation tests cover the essentials subset, complete-catalog retention, global search, descriptions for every group, and Current/Goal/Compare visibility. The production build must pass. Browser checks should cover the selected context, group selection, search clearing, guidance disclosure, and narrow layouts without changing personal measurements.
