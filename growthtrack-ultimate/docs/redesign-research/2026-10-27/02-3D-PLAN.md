# 3D Physique redesign plan

Status: proposed, awaiting implementation approval. The confirmed leading job is
body tracking and Current-versus-Goal comparison. The confirmed visual direction
is refinement of the existing calm editorial app.

## The first-screen problem

The [current entry capture](screenshots/physique-3d.png) at 1366×768 shows the page
title, five-view navigation, another 3D introduction, a full-width person card and
an editor switch before the model appears. The earlier responsive fixes prevent
horizontal clipping, but do not solve this vertical hierarchy.

The proposed first screen has one compact title, one person/context row, one
Current/Goal/Compare control group, the model, and a contextual measurement panel.
It retains the normal navigation rail and a route back to the other Physique views.

## Information architecture

- **Physique overview:** last dated check-in, essential measurements, goal summary
  and a direct comparison action. Keep the existing Blueprint URL.
- **Measurements:** Essentials first; a region selector and search reveal the
  full existing measurement inventory. Guidance follows the selected field.
- **3D Mirror / Body comparison:** the principal visual workspace. Current, Goal
  and Compare are the primary modes. History is a clear secondary entry, with a
  timeline only when real snapshots exist.
- **Targets:** dated targets, current value, desired value and milestones. Link
  the relevant target into Compare without inventing an outcome.
- **History:** dated check-ins, metric trends and a readable table. Opening a
  snapshot is a preview, not a mutation of the current body.
- **Appearance studio:** a secondary workspace for Face, Hair, Skin, Anatomy,
  Clothing, Pose and View. Keep access to both existing editing engines, clearly
  named, and retain their independent records and supported capabilities.

No route, measurement field, saved person or existing specialist tool is removed
by this hierarchy. Its purpose is progressive disclosure, not a feature cut.

## Laptop wireframe

The [interactive review board](index.html) includes a layout illustration. It is
a wireframe with synthetic values and diagram silhouettes; it is not the redesigned
application, a new renderer, or an approved visual specification.

At 1280×720, the illustrative width budget is:

- Navigation rail: 76 CSS px, retaining the earlier laptop behavior.
- Page horizontal padding: approximately 20px on each side.
- Usable work area: approximately 1164px.
- Contextual inspector: approximately 320px; gap: 16px.
- Remaining model region: approximately 828px, enough for two aligned views in
  Compare. Exact values are validated with the real renderer during implementation.

The vertical target is a canvas starting no lower than approximately 220px, with
at least 360px of useful height at 1280×720 and the whole neutral body framed.
Keep the active mode, person and save state visible. Fit the scene to the available
region; do not reduce label text or pointer targets to squeeze more chrome in.

At larger widths, grow the scene rather than the reading width of forms. A
resizable inspector can use the existing preference only within accessible bounds.
At narrower content widths, use an explicit Model/Measurements switch or a
dismissible inspector drawer so the canvas does not become a narrow sliver. On
mobile, use a single primary surface with a clear way to return to the inspector.
All measurement fields remain usable without WebGL.

## Principal workflows and acceptance

### 1. Open and orient

Open 3D Mirror; see the selected person, Current/Goal/Compare and a useful full-body
view immediately. Front, Side, Back, Fit body, Zoom and navigation help are visible
or discoverable from one View menu. A trackpad or keyboard can perform the same
essential actions as pointer gestures. Do not require a numpad, middle mouse
button or drag-only action.

Acceptance: 1280×720, 1366×768 and 1920×1080 initial captures show the model and active
mode without scrolling. Loading/error/context-loss states occupy the same region
and offer a usable fallback rather than leaving an unexplained black rectangle.

### 2. Compare Current and Goal

Use a single comparison switch. Compare uses the same camera, scale, lighting,
neutral pose and clothing context for both bodies. Label each body and identify
which current record and goal are shown. Put a short delta list beside the scene;
do not use an unexplained overall similarity or transformation percentage.

Acceptance: changing the goal cannot change Current. The selected mode persists
according to the existing workspace contract; source values and units remain
visible. If no goal exists, explain this and offer Set a goal. A disabled mode’s
reason must not rely solely on a mouse-hover tooltip.

### 3. Record a check-in

Open a focused Essentials form from Record check-in. Show unit, date and selected
person. Permit region-specific fields on request and retain the existing localized
entry parser and field help. Distinguish saving profile values from adding a dated
history snapshot; use precise action labels and confirmation feedback.

Acceptance: Enter/Escape and validation behave correctly; a failed save preserves
the draft. Retry does not create duplicate snapshots. Unsaved values and history
entries cannot be mistaken for each other. Changing person obeys the existing flush
or recovery behavior and cannot leak edits to another record.

### 4. Edit or understand a measurement

The inspector opens Essentials with a short list, region selection and search.
Selecting a measurement reveals its unit, definition, current/goal values and
optional body-region focus. The selected body region is also reachable through a
named list. Keep observed measurements, formula estimates and artistic shape
parameters visibly distinct.

Acceptance: every existing measurement remains reachable; selecting/camera focus
does not write data. Editing a metric updates the intended context only. The guide
does not claim calibrated scanning accuracy or clinical validity.

### 5. Review history

Open a dated check-in list with a chosen metric and range. A 3D snapshot preview
clearly identifies its date and has Exit preview. Missing history leads to a first
check-in action. Do not imply that interpolation is an observed historical body.

Acceptance: scrubbing and leaving history cannot alter live Current or Goal;
restoration, if offered, is a separate explicit action with its own tests. Chart
and table show the same selected records and units.

### 6. Use saved people

Move the person selector into the compact workspace header. Create/edit actions
open focused dialogs. Keep the active person visible in all editor and export
contexts. Retain the existing self record and the independent saved-person records.

Acceptance: pending edits are flushed or recovered before switching; failure leaves
the old person selected with a usable retry. Empty new-person measurements remain
empty. Current/Goal, appearance and poses remain scoped to the correct person.

### 7. Open Appearance studio

Keep appearance secondary to body comparison. Use named sections rather than eight
equally weighted always-visible category buttons in the default tracking view.
Retain Face, Hair, Skin, Anatomy, Clothing, Pose and View with the existing
capability-based unavailable states.

- **Face:** group regions, keep Current/Goal context clear, use visible before/after
  feedback and explain unsupported channels next to the affected control.
- **Hair:** show the usable catalog first; clearly label asset-required options.
- **Skin:** distinguish visual appearance settings from health/measurement records.
- **Anatomy:** keep the existing access and covering behavior; explain illustrative
  versus supported rendered surfaces without exposing a technical checklist by default.
- **Clothing:** show compatible garments and current fitting state; explain an
  invalid or outdated fit before export.
- **Pose:** keep saved poses separate from a neutral measurement/comparison pose;
  provide button/field alternatives to joint dragging.
- **View:** group camera, lighting, quality, background and presentation settings;
  move technical diagnostics into a clear optional detail area.

Acceptance: changing an appearance setting never becomes a recorded body
measurement. Existing head-feature support rules, pose validation and protected
capture behavior remain authoritative. No fidelity claim is inferred from a
successful control update.

### 8. Use the parametric editor

Rename its entry in user language while keeping a short explanation of artistic
editing versus body tracking. Retain Simple controls by default, search and region
selection; Advanced source channels remain available on request. Keep the person,
Current/Goal and save state visible. Preserve package restore review.

Acceptance: artistic parameters remain in the existing parametric document; tracker
body/history values do not change. Current/Goal are independent after save/reload.
Supported inputs and the actual rig/garment fitting result determine export readiness.

### 9. Capture, export and presentation

Put export choices in one focused flow: image capture, compact GLB, shape-editing
GLB and editable package, according to each engine’s existing capabilities. Identify
the selected person/context, visual content and format limitations before download.
Retain a readily visible Exit and Escape behavior in presentation mode.

Acceptance: no format is advertised as preserving unsupported rig, morph, material
or editability data. Existing reimport and protected capture checks pass. Export
failure retains the editing context and permits a meaningful retry.

## Rendering and asset quality are a separate workstream

This interface redesign reuses the existing renderer and assets first. A better
layout does not establish human likeness, calibration, garment contact, complete
anatomy fidelity or physical-device performance. The existing asset documents
contain historical milestones and explicitly open acceptance gates.

If additional asset improvement is requested, first produce a separate reference
and validation matrix covering front/side/back/face, skin/clay, body-shape extremes,
deformation, clothing, pose, lighting and target hardware. Obtain art/likeness
approval and identify licensing/source requirements before authoring or purchasing
replacement assets. Geometry, rigging and texture changes are not silently included
in this plan’s UI implementation approval.

## Research references

Visible navigation and contextual properties draw on [Blender navigation](https://docs.blender.org/manual/en/latest/editors/3dview/navigate/introduction.html)
and its [sidebar model](https://docs.blender.org/manual/en/latest/editors/3dview/sidebar.html).
The proposed adaptation simplifies these professional editing patterns for body
tracking; it does not replicate Blender’s interface. Reflow and focus testing follow
the distinctions explained by [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
and [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
See the [reference register](04-REFERENCE-SOURCES.md) for evidence methods and limits.
