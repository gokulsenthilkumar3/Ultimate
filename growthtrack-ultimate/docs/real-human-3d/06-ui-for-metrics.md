# 06 · Metrics and controls people can actually use

You asked for the metrics to be user-friendly, whether in a text box or a progress bar. The short answer is that **they are
different tools for different jobs**: a number box is for what you *know*, a slider for what you *prefer*, a progress bar for
how far you have *come*, and a range gauge for where a number *sits*. This document says which is used where, in each
tab of the avatar editor, and ships the logic that makes them forgiving
([`code/metric-entry.mjs`](code/metric-entry.mjs), tested).

## 1 · What the editor is today

The avatar editor (`HumanoidViewer.tsx`) has seven tabs: **Measure, Face, Hair, Skin, Anatomy, Clothing, View**.

| Observed | Problem |
| --- | --- |
| Measure uses two range sliders per metric ("Current", "Goal") with a coloured progress bar (green from 75%, gold from 40%) | A slider is a poor way to enter 98.5 cm: it cannot be typed, and its resolution is a pixel. The bar's meaning is only in its colour. |
| Focusing a metric shows where to measure it (`setGuideMetric`) | Good, and kept. |
| Eight facial shape metrics have the unit "ratio" (0 to 1): brow depth, nose bridge width, nose tip size, ear prominence, jaw width, chin projection, lip fullness, eye size | "0.37 of a ratio" means nothing to a person. |
| Skin is six Fitzpatrick swatches plus a colour picker; hair is a colour picker and style; eye colour is a colour picker | A free colour picker lets people choose colours skin cannot be. Tone and tan are one thing. |
| View holds switches for presentation, auto-rotate and protection | They do not do what their labels say ([01](01-findings.md)). |

## 2 · Which control for which data

| The user knows… | Use | Why |
| --- | --- | --- |
| A **measured number** (height, waist, chest, weight, body fat) | **Number field with a unit**, plus a stepper and a slider that mirror it | People have a tape or a scale reading; the number is the truth, the slider is a coarse nudge |
| **How a part should look** (nose size, jaw width, lip fullness) | **Slider with word labels and a mm readout** | Appearance is relative; words are how people think about it |
| **A choice from a few** (skin type, hair style, eye colour, camera mode) | **Segmented control or swatches** | One tap; no invalid states |
| **A switch** (tan lines, auto-rotate, protect captures) | **Toggle with a one-line description** | |
| **How far along a goal they are** | **Progress bar with a text equivalent** | The bar is for glancing; the words ("40% there · 6 cm to go") are for knowing |
| **Whether a number is typical** | **Range gauge** (a band with a marker), not a score | Shows "where you are" without judging |
| Nothing (unknown) | **"Estimate it for me"** | Fills the field with a plausible value marked *estimated* so the model is complete without false precision |

## 3 · The measurement field: one number, three ways

```
 Waist                                   ⓘ where to measure
 ┌──────────────────────────┐
 │ 82.0                   cm▾│  [−]  ───●────────  [+]        ← number (authoritative), stepper, slider (all in sync)
 └──────────────────────────┘
 ░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                                  ← range gauge: usual range 65–110 cm, marker at 82
 Measured · 3 days ago                                           ← provenance: measured, estimated, from photo
```

- **The number box is authoritative.** Typing updates the 3D model after a 250 ms pause. The slider and the stepper mirror it.
- **Forgiving input** (`parseLength`, `parseMass`, tested): `98.5`, `98,5`, `985 mm`, `1.75 m`, `39 in`, `5'10`, `5 ft 10 in`,
  `163 lb`, `11 st 9`, with the unit toggle for bare numbers. Storage stays centimetres and kilograms.
- **Feedback that never blocks the plausible** (`rangeStatus`): outside the app's hard range (for example waist 40 to 250 cm)
  the value is refused with the range stated; outside the *usual* range (65 to 110 cm) it asks "Above the usual range. Is that
  right?" and keeps the value. The icon and the words carry the message, not the colour alone.
- **Keyboard:** arrows step by 0.5 cm (0.1 kg, 0.1%), `Shift` ten times that, `PageUp`/`PageDown` five times; mobile shows the
  decimal keypad (`inputmode="decimal"`).
- **Live context:** focusing a field flies the camera to its region and shows the tape loop where the measurement is taken
  (the plan page's tape loops; the app's `bodyRegions.js` camera hints), and shows the existing where-to-measure help.
- **Essentials first:** the Measure tab opens with five fields (height, weight, waist, chest, hips); everything else sits under
  "More measurements", grouped as today (composition, upper body, lower body, proportions, symmetry, posture).
- **Left and right** are shown side by side so asymmetry is visible, with the difference as a number ("L 33.0 · R 32.4 · 0.6 cm").
- **Estimate it for me:** shows a plausible value from height, weight and sex with the label *Estimated*, drawn in a dashed
  style so it is never mistaken for a measurement. Any estimate is replaced the moment the user types.

## 4 · Progress: bar, marker and words

A goal bar has three marks, not one fill: **start** (baseline, a tick), **now** (a filled marker) and **goal** (a flag). Fill
length is `progressToward().percent`, identical to the app's `calculateGoalProgress` (tested against it, for goals that go up and
down), and the words beside it come from the same function.

```
 Waist     start 92 ──────●──────────────⚑ 82 goal           40% there · 6 cm to go
```

- **Never colour alone:** each state has an icon and words ("on track", "moving away from the goal", "goal reached").
- **Direction-aware:** a goal below the start (waist, body fat) fills as the value falls; moving the wrong way shows
  "moving away from the goal" instead of an empty bar.
- **Accessible:** `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext` set to the
  label ("40 percent. 6 centimetres to go").
- **One overall summary** at the top of Measure ("3 of 7 goals reached, average 52%") using the existing `progressSummary`.

## 5 · Tab by tab

### Measure
Essentials, "More measurements", goal column, range gauge, tape loop highlight, estimate button, unit toggle (cm/in, kg/lb).

### Face
Replace the eight "ratio" sliders with **word-labelled sliders showing millimetres**:

| Control | Shows | Words at the ends |
| --- | --- | --- |
| Nose width / length, ear length / width, eye spacing, face width / height | The existing centimetre metrics (typical ranges from `MORPH_RANGES`) | Narrower · Average · Wider |
| Brow depth, nose bridge, nose tip, ear prominence, jaw width, chin projection, lip fullness, eye size | A mm or % readout from the face-parameter solver built for the plan page, so a change reads as "nose tip 2 mm larger" | Smaller · Average · Larger |
| Eye colour | Seven natural swatches (Dark brown, Brown, Hazel, Amber, Green, Blue, Grey) plus "Custom" | |
| Iris size, pupil size | Sliders with mm readouts | |

A small **face map** highlights the part being edited. Each part has a reset ("Back to average").

### Hair
- **Style:** a grid of eight thumbnails (bald, buzz, crop, medium, long, quiff, curly, afro).
- **Colour:** eight natural shades as swatches (black to platinum), then **Custom**, then **Grey** as a percentage slider
  ("12% grey"), **Density** and **Curl** sliders.
- **Brows and lashes:** thickness and arch, lash length.
- **Facial hair:** none, stubble (days), moustache, beard; shows only when the face tab asks for it.
- **Body hair:** one slider ("None … Heavy") with a region preview (chest, arms, legs).

### Skin: tone, tan and complexion are separate groups

This is where the separation from [04](04-skin-hair-eyes.md) becomes visible to the person.

| Group | Controls | Help text (one line each) |
| --- | --- | --- |
| **Skin tone** | Six type swatches (I to VI), a fine-tune slider "Lighter … Deeper", and an undertone slider "Cooler … Warmer" | "Your natural colour, as it is on skin the sun never reaches. It does not change with the seasons." |
| **Sun tan** | A slider 0 to 100%, and a toggle "Show tan lines" | "A tan only darkens skin that sees the sun. Your skin tone stays the same." Tan lines follow the clothing preset. |
| **Complexion** | Redness (rosy … pale), freckles, moles (count), visible veins, oiliness, age | "Small things that make a face yours." |

A **live strip** under the groups shows three swatches: *unexposed skin*, *exposed skin*, *flushed* so the effect of each group
is visible as a number-free preview. The free colour picker is removed from the main view (it stays in an "Advanced" disclosure
that snaps to the nearest valid skin tone and warns when a colour is outside the range skin can take).

### Anatomy
Layer depth control as today (skin, muscle, skeleton, organs), plus the underlay toggles. The adult-gated external anatomy card
is unchanged ([03](03-anatomy-spec.md)).

### Clothing
Preset thumbnails (Gym, Casual, Formal, Swimwear, Underwear, Body composition), the tan-lines toggle, and per-garment colour
for the presets that have it. The adult-gated preset appears only when eligible, as today.

### View
| Control | Type | Notes |
| --- | --- | --- |
| **Camera** | Segmented: Turntable · Orbit · Top · Floating | Describes itself on hover: "Turntable: circle the body at one height" |
| **Scene** | Thumbnails: Studio, Orbit, Nebula, Deep field, Aurora, Void studio | |
| **Lighting** | Segmented: Follows camera · Fixed to the room | |
| **Auto-rotate** | Toggle + speed slider (4 to 30°/s) | The button shows playing or paused |
| **Quality** | Segmented: Automatic · High · Balanced · Performance | Live label: "Automatic (High)"; a note when it changes |
| **Presentation** | Button "Present" | Real fullscreen ([05 §9](05-viewer-and-interaction-spec.md)) |
| **Pose** | Toggle "Pose (drag limbs)" and a motion tray | |
| **Protect screenshots and sharing** | Toggle, on by default | The wording stays; the redaction cannot be turned off for shares |

## 6 · Accessibility and mobile

- Every field has a visible label; hints are linked with `aria-describedby`; errors are text, not colour.
- Targets are at least 44 × 44 px; steppers and swatches have enough space for a thumb.
- The editor is a bottom sheet on phones with the 3D view above it, the focused field's region framed.
- All tabs are keyboard-reachable (the existing arrow, Home and End behaviour on the tab list is kept); the right-to-left
  handling already in the tab list is kept.
- Reduced motion: no animated bar fills, no auto-play of tours.

## 7 · Usability checks that can fail

| # | Task (a person who has not seen the app) | Pass |
| --- | --- | --- |
| U1 | Enter a height of 5 ft 10 in | Done in under 15 s, no error, stored as 177.8 cm |
| U2 | Find where to measure the waist | Reaches the guide in one action (focus the field) |
| U3 | Make the person look sun-tanned without changing the skin tone | Uses Sun tan; skin tone group unchanged |
| U4 | Say how far the waist goal is from reached | Reads "x% there · y cm to go" without hovering |
| U5 | Paste "98,5" in a field | Accepted as 98.5 |
| U6 | Enter 400 cm for a height | Told the allowed range; the model does not change |

Parsing, range and progress behaviour (U1, U5, U6, U4) are covered by `metric-entry.check.mjs` (9 tests). The rest need a
five-person session in step U of the [roadmap](08-roadmap.md).
