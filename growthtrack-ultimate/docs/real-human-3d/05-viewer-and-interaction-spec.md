# 05 · The Physique 3D viewer: camera, floor, quality, space, pose, export, presentation

This is the specification for everything you asked the viewer to do. Each section says **what the user gets**, the rule
that makes it true, the module that implements the logic (all in [`code/`](code/), pure and tested), where it plugs into the existing app, and the gate that proves it. Code blocks labelled
*sketch* show intended integration and have not been run; the pure modules they call have.

## 0 · The viewer in one picture

| You asked for | The viewer will |
| --- | --- |
| 360° around the body, not up and down | **Turntable** mode: the camera circles the figure at a fixed height. Vertical drag does nothing. |
| Also see from above, rotate every way | **Orbit** mode: free rotation from straight above to the floor; **Top** snaps to plan view. |
| The model itself must not rotate | The model has **no** rotation or position input. Only the camera moves (tested: camera state has four fields and none is the model). |
| The floor fixed | The floor is a hard limit: the camera cannot go below it at any zoom, drag speed or focus target (property-tested over 12,000 random moves). |
| The model "hanging" somewhere, viewable from above, below, all round | **Floating** scene: no floor, no pedestal, the camera can go anywhere including below the feet. |
| Space background, but different | Five procedural sky presets (Orbit, Nebula, Deep field, Aurora, Void studio), no image download, also used for lighting. |
| Drag a hand, walk, perform actions | **Pose** mode: handles on hands, feet, head, hips; drag to move the limb with IK. A motion tray plays Walk, Run, Wave and more. |
| Zoom in and out without breaking pixels | Per-region closest distance from the texture density; micro-detail layer; see [04 §8](04-skin-hair-eyes.md). |
| Quality: high / balanced / automatic, each with its own behaviour | Three tiers that change DPR, antialiasing, shadows, hair, skin shading, post effects and texture level; Automatic adapts with hysteresis. |
| Auto-rotate that works | Real turntable, 12°/s by default, paused while you touch it and resumed after 3 s. |
| Screenshots and sharing that work | High-resolution still (1× to 4×, transparent option), native share with the file attached, copy to clipboard, download; private anatomy never included. |
| Presentation mode that is decent | Real fullscreen, hidden chrome, turntable or guided tour, wake lock, restores your settings on exit. |

## 1 · Principles

1. **The model is fixed; the camera moves.** Rotating the view never rotates the figure. Lights are either fixed to the room
   or follow the camera (a setting, default "follows camera" for Turntable and Presentation, "room" for Orbit and
   Floating); in both the figure itself does not move.
2. **Constraints are modes, not special cases.** Each mode is a set of limits on one small state object.
3. **Every promise has a test.** Pure logic is unit-tested; what needs a browser is covered by one Playwright probe.
4. **Quality is a bundle, not a label.** Changing tier changes real settings, measured by the probe.
5. **Nothing private escapes.** All captures go through the redaction rule in [03](03-anatomy-spec.md).

## 2 · Camera: four modes, one state, a hard floor

`code/viewer-camera.mjs` is a pure state machine (target, azimuth, polar, distance). Three rules are tested there:

| Mode | Horizontal drag | Vertical drag | Polar range | Floor |
| --- | --- | --- | --- | --- |
| **TURNTABLE** | Circles the figure, any number of turns | Ignored (a fixed, slightly-above-eye angle) | Fixed | Yes |
| **ORBIT** | Circles | Tilts, up to straight above | 1° to the floor limit | Yes |
| **TOP** | Circles (spins the plan view) | Ignored | Straight down | Yes |
| **HANGING** (Floating scene) | Circles | Tilts, from straight above to straight below | 1° to 179° | None |

Details that are tested (10 tests in `viewer-camera.check.mjs`):

- **A drag across the full viewport height turns the camera one full circle**, so the feel is the same on every screen.
- **Floor limit:** `floorPolarLimit()` computes, from the target height and distance, the largest polar angle at which the
  camera is still above the floor plus a 6 cm margin. 4,000 random drags, zooms and focus changes in each of three modes
  never put the camera below it.
- **Zoom is exponential** (each wheel notch multiplies the distance), clamped between a per-region minimum and a maximum.
- **Auto-rotate** advances the azimuth by `degPerSec × dt` (frame-rate independent: 60 frames at 60 fps equals 30 at 30 fps),
  and a stalled frame is clamped to 0.1 s so a tab switch cannot throw the view.
- **View snaps** take the shortest way round (`shortestTurn`); BOTTOM is only reachable when the figure hangs, and on a floor
  it clamps to a level view of the soles.

**Controls.**

| Input | Mouse | Touch | Keyboard |
| --- | --- | --- | --- |
| Rotate | Left-drag | One-finger drag | Arrow keys (15° per press) |
| Zoom | Wheel (toward the cursor) | Pinch | `+` / `−` |
| Pan | Right-drag or Shift-drag | Two-finger drag | Shift + arrows |
| Fit the figure | Double-click | Double-tap | `Home` |
| Focus a region | Click a body-part chip, or a region of the figure (Pose mode off) | Tap a chip | `1`…`7` |
| Snap to a view | ViewCube face or the Views menu | ViewCube face | `F` front, `B` back, `T` top |

A **ViewCube** (top-right of the canvas) names the current view, snaps on click and orbits on drag. Camera changes are also
announced to assistive technology ("Viewing from the back, 20 degrees above").

**Floating vs Studio floor.** A scene setting, not a camera setting. *Studio* has the fixed floor and a pedestal ring with
contact shadows. *Floating* removes both, uses the space sky, and lets HANGING mode go below the feet. The floor never moves
with the camera; its height is the lowest sole in the pose.

*Sketch: driving the existing `CameraRig.jsx` (keeps drei's `OrbitControls` for damping and touch handling; sets its limits
each frame from the tested module):*

```js
// inside CameraRig's useFrame, after the transition block
const mode = use3DStore.getState().cameraMode;                  // 'TURNTABLE' | 'ORBIT' | 'TOP' | 'HANGING'
const s = { target: controls.target.toArray(), azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(),
            distance: camera.position.distanceTo(controls.target) };
const o = { mode, floorY: scene === 'FLOATING' ? null : floorY, minDistance: regionMinDistance(focus, size, camera.fov, dpr) };
controls.minDistance = o.minDistance;
controls.minPolarAngle = mode === 'TURNTABLE' ? turntablePolar : 0.02;
controls.maxPolarAngle = mode === 'TURNTABLE' ? turntablePolar
  : o.floorY === null ? Math.PI - 0.02 : floorPolarLimit(s, { floorY: o.floorY, floorMargin: 0.06 });
```

*Replaces:* `minPolarAngle 5°` / `maxPolarAngle 115°` (which allowed a camera at −1.52 m), the fixed `0.35×` minimum distance, and the
±9° sway. *Gate:* Playwright drags up 2,000 px in each mode and asserts `camera.y ≥ floor` (unit-tested equivalent already passes).

## 3 · Zoom without breaking pixels

The cause was measured ([01](01-findings.md)): the head is stretched 1.4× and a hand 2.9× at the closest zoom. The fix is data
([04 §8](04-skin-hair-eyes.md): 4K head tile at 94 texels/cm, hand 50, micro-detail 256) plus three viewer behaviours:

1. **Per-region closest distance** from `closestDistance()`: head 0.18 m, hand 0.34 m, nail 0.06 m on a 900 px, 2× display
   (versus 0.73, 1.63 m today). It re-computes when the canvas size or pixel ratio changes.
2. **Dynamic near and far planes** (near = 5% of the camera distance, clamped to 1 cm; far = 40× distance) so close views do not clip
   the skin and depth precision holds.
3. **Zoom to the cursor** so users can point at a mole or a nail and go there, instead of zooming to the centre and panning.

*Sketch:*

```js
useFrame(() => {
  const d = camera.position.distanceTo(controls.target);
  camera.near = Math.max(0.01, d * 0.05); camera.far = d * 40; camera.updateProjectionMatrix();
});
```

*Gate G3:* for each region, the probe flies to its closest distance and the measured screen-pixels-per-texel
(`magnification()`) must be ≤ 2.0 for the base tile and ≤ 1.25 for the micro tile, with a stored screenshot for review.

## 4 · Quality: three tiers and an automatic governor

Today the tiers differ only in shadow-map size and post effects, and the label stays "Automatic (LOW)". The measured cause:
`antialias` is chosen when the WebGL context is created (`gl={{ antialias: … }}`) and cannot change afterward.

**Tiers** (`code/quality-governor.mjs`; *starting values*, benchmarked in step S4):

| Setting | LOW (Performance) | BALANCED | HIGH |
| --- | --- | --- | --- |
| Pixel ratio cap | 1 | 1.5 | 2 |
| Antialiasing | SMAA pass | MSAA ×4 (composer) | MSAA ×8 (composer) |
| Shadow map | none (contact shadow only) | 1024 | 2048 |
| Hair | Cards | 20,000 strands | 60,000 strands |
| Skin shading | Wrap lighting | Pre-integrated + micro-normal | Separable SSS |
| Anisotropic filtering | 2× | 4× | 16× |
| Texture tiles | Half size | Head and hands full, body and feet half | Full |
| Post effects | None | Tone map, light bloom | Tone map, bloom, ambient occlusion, depth of field |
| Texture memory | 36 MiB | 92 MiB | 142 MiB (computed in [03](03-anatomy-spec.md)) |

**Antialiasing without recreating the canvas.** Create the context with `antialias: false` and always render through the
`EffectComposer` (a pass-through at LOW), whose `multisampling` and SMAA pass are changed at runtime. This removes the
"cannot change after mount" problem. (Risk: the always-on composer costs a little on weak GPUs; step S4 measures it, and the
fallback is to remount only the `<Canvas>` on an AA change, which is a one-off, not a per-tier cost.)

**The governor** (tested, 7 tests): a 120-frame rolling window of frame times.

- Ignore frames over 250 ms (tab switch, load) and the 45 frames after any tier change (shaders warming up).
- **Step down** one tier when the window's p95 is over budget × 1.15 (budget 16.7 ms on desktop, 33 ms on phones).
- **Step up** one tier only after 3 calm windows in a row (p95 under budget × 0.6) and 10 s since the last change.
- **Anti-flap:** if a step up fails within 30 s, that tier is blocked for 2 minutes.
- A tier the user chose is **never** overridden. The control reads "Automatic (High)", the current tier, and shows a short
  note when it changes ("Switched to Balanced for smoother motion").

The initial tier comes from the GPU class the app already detects once (`detectAndSetGpuTier`).

*Applying a tier at runtime (no remount):* `setDpr` (R3F), composer `multisampling`, shadow map by remounting the light
component, hair by `geometry.setDrawRange` over a pre-ordered strand set (so any prefix is an even subset), skin quality by a
shader uniform, texture level by swapping the half-size tile files.

*Sketch:*

```js
function QualityGovernor() {
  const setDpr = useThree(s => s.setDpr); const stateRef = useRef(createGovernor(use3DStore.getState().qualitySelected, initialTier));
  useFrame((_, delta) => {
    const r = observe(stateRef.current, delta * 1000, performance.now()); stateRef.current = r.state;
    if (r.change) { use3DStore.getState().setQualityTier(r.change.to, r.change.reason); setDpr(Math.min(devicePixelRatio, TIERS[r.change.to].dprCap)); }
  });
  return null;
}
```

*Gate G2:* the probe sets each tier and asserts the real effective settings (pixel ratio, composer samples, shadow map size,
strand draw count) differ in the documented direction.

## 5 · Auto-rotate that actually rotates

- **Behaviour:** `autoRotate()` adds `12°/s` to the azimuth (one turn in 30 s; adjustable 4 to 30°/s in the quality
  menu) in TURNTABLE, ORBIT and HANGING. In a focused region it orbits that region.
- **Never fights the user:** starting a drag stops it; it resumes after 3 s with no input; with reduced motion on, it is off
  by default (and a single "Play" in the toolbar still works, because the user then asked for it).
- **Visible state:** the toolbar button shows playing or paused; the probe samples the azimuth over time and asserts it moves.

Replaces the `±9°` `Math.sin` sway that only runs in the FRONT preset with no focus.

## 6 · Pose and motion: drag a hand, walk

**Interpretation.** "If I'm dragging the hand, it should drag and drop, and perform actions like walking" is read as: (a) you
can grab a hand, foot, the head or the hips and move it, the body following naturally; (b) you can start a motion (walk, run,
wave); (c) the two combine, so while the figure walks, a hand you hold overrides that arm's swing.

**Pose mode.** A toolbar toggle ("Pose") shows glowing handles at the wrists, ankles, head and hips (at least 44 px hit targets
on touch). In Pose mode a drag on a handle moves that effector; a drag anywhere else still orbits. Cursor: *grab* / *grabbing*.

| Handle | Solver | Notes |
| --- | --- | --- |
| Hand | Two-bone IK from the shoulder; elbow bends toward a pole point behind and below | Elbow flex limit about 2.5 rad; if the target is out of reach the arm straightens toward it |
| Foot | Two-bone IK from the hip; knee bends forward | Knee limit about 2.4 rad; a foot stays planted (foot lock) until the leg would overstretch |
| Head | FABRIK along neck and spine | Root pinned at the hips |
| Hips | Moves the body; planted feet stay put by leg IK | Past full leg extension, the foot steps |

2026-10-22 runtime delivery: the Pose inspector saves independent Current/Goal local joint rotations and provides keyboard sliders for exact wrist/ankle two-bone reach. Targets normalize to the actual limb length in its rig frame, clamp to configured bend/reach bounds and report actual endpoint error. Read-only coloured markers disappear for protected export. Measurement/anatomy and comparison/timeline views suppress saved posing. Pointer dragging, the FABRIK head/hip path and walking foot lock in the specification below remain open. The View inspector also saves named actual camera orbit/pan/zoom records relative to model height. See [architecture, persistence and limitations](10-pose-camera-architecture.md).

The effector target lives on a **camera-facing plane through the grab point**, so a drag follows the pointer exactly. IK weight
blends in over 120 ms and out over 200 ms. On release: **Hold** (default; the pose stays) or **Spring back** (setting).
`code/ik.mjs` (7 tests): exact two-bone solution, bone lengths preserved over 2,000 random targets, elbow bends toward the pole,
flexion limit enforced, FABRIK reaches or straightens, foot-lock rule. It is checked on the **real arm of the shipped GLB**
(shoulder, elbow and wrist positions from the audit).

**Motion tray.** Idle, Walk, Run, Wave, Flex, Squat, Jump, T-pose (the existing `animationPresets.js` names), now reachable
from the UI (the `AnimationPanel` is currently imported nowhere). The walk is generated, not stored:

- Stride from the figure's own proportions: a typical step length is about 0.41 × height, cadence about 110 to 120 steps a
  minute; pelvis bob and sway, counter-swinging arms, heel strike to toe-off via the toe joints, foot-lock IK so feet never
  skate.
- **Walk in place** (default): the floor or the stars move past; the figure does not travel, so the model stays where the
  camera expects it. "Walk across" is optional.
- Layers: base motion → IK override from a held handle → idle (blink, breath, saccade, `idle-motion.mjs`).

**Posing never changes the numbers.** Body-metric comparisons, snapshots and the timeline always use the neutral measurement
pose; a posed capture is opt-in. Pose presets (relaxed, A-pose, arms raised, athletic stance) can be saved and restored.

*Sketch (pointer handler, R3F):*

```js
function onPointerMove(e) {
  if (!grab.current) return;
  const hit = e.ray.intersectPlane(grab.current.plane, tmp);              // plane facing the camera through the grab point
  const { mid, end } = solveTwoBone({ root: shoulderWorld, l1, l2, target: hit.toArray(), pole: poleWorld, maxFlexRad: 2.5 });
  aimBone(upperArm, shoulderWorld, mid); aimBone(foreArm, mid, end);    // keep twist, aim the bone's axis at the next joint
}
```

*Dependency:* finger, toe, jaw and twist joints are part of GLB v3 ([07](07-asset-pipeline-and-glb-spec.md)); the arm and leg
IK works on the shipped 20-joint rig, so Pose mode can ship first.

## 7 · Space backgrounds (and why they are procedural)

**Implemented static slice, 2026-10-21:** View → Model background → Space sky offers all five presets below. The runtime bakes a local sky shader into a cube map (LOW 128, MED 256, HIGH 512 pixels per face) and adds a subdued version to the studio environment capture. Selection is saved independently of body measurements, camera and floor. All tiers currently stay still; animated aurora, twinkle and reference-device timing remain planned. [Evidence and scope](IMPLEMENTATION_PROGRESS.md).

A single sky-sphere shader, no image download (0 bytes), also rendered once into a small cube map for image-based lighting
so reflections in eyes and skin match the scene. Presets:

| Preset | Look |
| --- | --- |
| **Orbit** | Black sky, dense stars, a thin bright Earth limb below the horizon, a sun glint |
| **Nebula** | Domain-warped coloured gas in two hues, stars in front |
| **Deep field** | Many faint stars and a few faint galaxies, nearly black |
| **Aurora** | A night sky with slow green-violet curtains above a dark horizon |
| **Void studio** | Pure dark gradient with a very slight star haze (the calm default for presentations) |

Stars: hashed cell noise with a magnitude distribution (many dim, few bright), temperature-based colour, optional slow
twinkle (HIGH only, off by default for comfort). The sky is fixed in the world, so as the camera orbits the stars turn with
it. **Lighting stays neutral:** the figure is lit by a key, fill and rim set; the sky contributes image-based light at low
intensity so skin is not tinted green by an aurora. LOW uses the baked cube map and no animation. An optional NASA star-map
texture (public domain imagery) can replace the procedural stars later.

*Replaces:* the solid colours in `cinematicProfiles.js` (`#08080a`, `#0d0a10`, `#010208`). The Studio presets remain.

## 8 · Screenshots and sharing

**Still capture.** The default route resizes the real renderer to the requested size and renders one frame through the same
pipeline as the screen, so the picture looks exactly like the viewer (tone mapping included). The obvious alternative, a
separate render target, is **not** used for the default: three.js applies tone mapping and the output colour conversion only when
drawing to the screen, so a render-target still comes out flatter than what the user sees unless an extra pass is added.

*Sketch:*

```js
async function captureStill({ scale = 2, transparent = false }) {
  const size = exportSize(canvas.clientWidth, canvas.clientHeight, { scale, maxTexture: gl.capabilities.maxTextureSize, maxPixels: canvasPixelLimit() });
  showCaptureShield();                                   // an <img> of the current frame, so resizing the canvas is invisible
  setCaptureRedacted(true); await nextFrames(2);         // private anatomy hidden before the first pixel
  const restore = resizeRenderer(gl, composer, size);    // setPixelRatio(1); setSize(w, h, false); composer.setSize(w, h)
  try { return transparent ? await renderMatte(gl, composer, scene, camera) : await renderToPng(gl, composer, scene, camera); }
  finally { restore(); setCaptureRedacted(false); hideCaptureShield(); }
}
```

- **Transparent PNG without an alpha canvas:** the viewer's context has no alpha channel (`alpha: false`), so a transparent
  still is made by a **two-pass matte**: render once on a black backdrop and once on a white one with the post effects off,
  then `alpha = 1 − (white − black)`, `colour = black ÷ alpha`. Hair is drawn with a dithered discard (opaque pixels), so the
  matte has no partial-alpha surprises.
- **Size limits:** `exportSize()` (tested) keeps the aspect ratio and clamps to 8,192 px and 33 megapixels or the GPU's texture
  limit; the browser's canvas limit is probed at run time (iOS Safari allows about 16.7 megapixels) and the request is
  halved until a canvas of that size can be allocated.

**Share.** `chooseShareMethod()` (tested) picks the best route: **native share with the image file attached** (Web Share Level 2,
only when `navigator.canShare({ files })` is true) → **copy the image to the clipboard** → **download**. The image is rendered
first and cached, so the Share click calls `navigator.share` immediately (browsers require a fresh user gesture, and a long
render between the click and the call can lose it). "Post to X" stays a text link (X's intent URL cannot carry an image) and
is labelled so. The existing `html2canvas` card in `SocialShareModal.jsx` remains for the branded card.

**The sheet:** preview, size (Standard 1×, High 2×, Print 4×), background (Scene, Transparent, Studio), watermark on or off, and
the buttons Share, Copy, Download. The title always says "private anatomy hidden" when it applies.

**Privacy:** `mustRedact()` (tested) forces the cover on for every screenshot, share and presentation snapshot, whether or not
the anatomy is currently visible, and the filename is `<name>-<date>.png` with no profile data. PNGs carry no EXIF.

*Gate G5:* the probe exports at 2×, asserts the image is 2× the canvas, the file is below 25 MB, and (with anatomy unlocked in
a test profile) that the redacted pixels match the covered reference; the probe also asserts that `navigator.share` receives a
`files` array when stubbed to support it.

## 9 · Presentation mode

Today: a lighting preset. Plan: a real mode with a clear entry and exit.

| Aspect | Behaviour |
| --- | --- |
| Entry | Toolbar "Present" or `P`; enters real fullscreen on the viewer (Fullscreen API with `navigationUI: 'hide'`); on iPhone, where the API is unavailable for non-video, a fixed full-viewport layout (`100dvh`) is used instead |
| Chrome | All controls hide after 2.5 s without pointer movement and return on movement; a small "Exit" pill stays on touch |
| Motion | Turntable at 10°/s, or **Tour**: Full body → head → torso → hands → feet, 4 s each, using the region camera hints |
| Look | Void studio or Orbit sky, key/fill/rim lighting, eyes look at the camera, subtle idle motion, depth of field on HIGH |
| Screen | Screen Wake Lock requested and re-acquired on visibility change; released on exit |
| Keys | `Space` pause, `←` `→` previous/next view, `F` fullscreen, `Esc` exit |
| Exit | Restores every setting that presentation changed (camera mode, scene, quality, UI) |
| Reduced motion | No auto-rotate; the tour waits for input |

*Sketch:*

```js
async function enterPresentation(el) {
  snapshotSettings();                                                       // so exit can restore them
  try { await el.requestFullscreen({ navigationUI: 'hide' }); } catch { setImmersiveFallback(true); }
  try { wake.current = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
  setCameraMode('TURNTABLE'); setScene('VOID'); setAutoRotate(true, 10);
}
```

*Gate G6:* the probe clicks Present, asserts `document.fullscreenElement` (or the immersive fallback class), that chrome hides
after idle and returns on movement, and that exit restores the previous settings.

## 10 · How each piece reaches the code

| Piece | Module (tested) | App files that change | Step |
| --- | --- | --- | --- |
| Camera modes, floor, auto-rotate, snaps | `viewer-camera.mjs` | `CameraRig.jsx`, `use3DStore.js` (`cameraMode`), `ChamberFloor.jsx` (Floating scene removes it), toolbar in `HumanoidViewer.tsx` | V1 |
| ViewCube and keyboard control | — | New `ViewCube.jsx` | V1 |
| Quality governor and tiers | `quality-governor.mjs` | `ChamberCanvas.jsx` (`LOD_CONFIG` replaced by `TIERS`), `PostProcessingStack.jsx` (always-on composer) | V2 |
| Zoom limits per region | `texel-density.mjs` | `CameraRig.jsx`, `cameraFraming.js` | V3 (needs the new tiles) |
| Space sky | — (shader) | New `SpaceSky.jsx`, `SceneEnvironment.jsx`, `cinematicProfiles.js` | V4 |
| Still capture and share | `share-export.mjs` | `HumanoidViewer.tsx` `captureScreenshot`, `SocialShareModal.jsx` | V5 |
| Presentation | — | `HumanoidViewer.tsx`, new `usePresentation.js` | V5 |
| Pose mode and motion tray | `ik.mjs`, `idle-motion.mjs` | `PostureRig.jsx`, `BodyPartInteraction.jsx`, mount the motion tray (replaces the unmounted `AnimationPanel.jsx`) | V6 |

Steps V1 to V6 and their gates are in the [roadmap](08-roadmap.md); V1, V2, V5 and the arm/leg part of V6 need no new asset
and can ship before the new model exists.
