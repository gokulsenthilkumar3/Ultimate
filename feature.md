Now I have everything I need to craft detailed, comprehensive AI prompts for your 3D model system. Let me write them out:

***

Based on your [Photoreal_360_Mega_Feature.md](https://github.com/gokulsenthilkumar3/Ultimate/blob/main/Photoreal_360_Mega_Feature.md) and the existing dashboard architecture, here are comprehensive AI prompts for each major feature domain:

***

## Prompt 1 — Body Metrics Input & Real Person Clone Generation

```
You are building a "Digital Twin Creation Wizard" for a React + Three.js fitness dashboard.

GOAL: When a user inputs their exact body metrics, a 3D human model morphs in real-time to become an accurate clone of their real body.

INPUT FIELDS TO SUPPORT:
- Height (cm), Weight (kg), Body Fat % (via DEXA or manual estimate)
- Shoulder width (cm), chest circumference, waist circumference, hip circumference
- Arm length, leg length, neck circumference, wrist circumference
- Optional: shoe size, head circumference (for facial scaling reference)

TECHNICAL REQUIREMENTS:
1. Build a `MetricsInputPanel` React component with a two-column form layout — left side has sliders with live numeric inputs, right side shows the 3D viewport updating in real-time as values change.
2. Use Three.js `morphTargetInfluences[]` on the GLB human mesh to drive body shape. Map each metric to a specific morph target weight using a linear interpolation formula: `morphValue = clamp((userValue - minValue) / (maxValue - minValue), 0, 1)`.
3. For measurements that don't directly correspond to a single morph (e.g., body fat %), compute a composite: low BF% → increase chest/ab definition morph, decrease waist morph.
4. Store metric profiles as named snapshots in localStorage so users can save and load different body states ("Current - April 2026", "Goal - December 2026").
5. Implement a "Calculate from photos" shortcut button — show a visual guide overlay that explains how to self-measure using a measuring tape, with animated SVG diagrams highlighting each measurement zone on a silhouette.

OUTPUT: The 3D model must update its proportions within 50ms of any slider change, using `requestAnimationFrame` debouncing to batch updates.
```

***

## Prompt 2 — Interactive Character Customizer (Blender-Style UI)

```
Build a character customization panel for a Three.js/React-Three-Fiber web app that mimics Blender's "Shape Keys" editor in UX style.

PANEL LAYOUT:
- Left sidebar: collapsible category groups — "Body Proportions", "Upper Body", "Core", "Lower Body", "Face & Head", "Skin & Appearance"
- Each category expands to reveal 4–8 sliders with labels, current value display, min/max, and a reset-to-default button per slider
- Right: full 3D viewport with orbit controls (mouse drag to rotate, scroll to zoom)
- Bottom toolbar: Undo (Ctrl+Z), Redo (Ctrl+Y), Save Preset, Load Preset, Reset All

SLIDERS TO IMPLEMENT:
Upper Body: Shoulder Width, Shoulder Cap Roundness, Chest Width, Chest Depth (Pec thickness), Arm Muscle Mass, Bicep Peak, Forearm Thickness, Trap Height
Core: Waist Width, Abdominal Definition (0=smooth, 100=shredded), Love Handle Volume, Lower Back Arch
Lower Body: Hip Width, Glute Projection, Quad Mass, Hamstring Fullness, Calf Thickness, Ankle Width
Face & Head: Face Width, Jaw Sharpness, Cheekbone Prominence, Eye Socket Depth, Nose Bridge Width
Skin & Appearance: Skin Tone (warm/cool/neutral hue slider), Vascular Definition (vein surface map opacity), Body Hair Density

TECHNICAL:
- Each slider directly maps to `mesh.morphTargetInfluences[morphIndex]` via a lookup dictionary
- Sliders use a custom `<MorphSlider>` component with a satisfying drag feel — use `spring()` from Motion library for animated value snapping
- Hovering over a slider highlights the corresponding body region on the 3D model with a subtle yellow rim light shader
- Double-clicking any slider label locks it (padlock icon appears) so it's excluded from "Randomize" operations
- Add a "Randomize Body" button with a dice icon that applies smooth animated randomization to all unlocked morphs simultaneously using staggered tweens
```

***

## Prompt 3 — Photorealistic 360° Sprite Viewer (Phase 1)

```
Implement a `Sprite3DViewer` React component that loads a hemispherical array of 109 WebP images and simulates photorealistic 360° rotation without GPU-heavy WebGL rendering.

IMAGE ARRAY ARCHITECTURE:
- Row 0 (eye-level, 0°): frames current_0_001.webp → current_0_036.webp (every 10°)
- Row 1 (high-angle, 45°): frames current_45_001.webp → current_45_036.webp
- Row 2 (low-angle, -45°): frames current_n45_001.webp → current_n45_036.webp  
- Row 3 (top-down): current_top_001.webp (single frame, loop)
- Follow same naming for "desired_" prefix for goal body frames

INTERACTION:
- Horizontal mouse drag → scrubs through the 36 horizontal frames (left drag = counter-clockwise)
- Vertical mouse drag → switches rows (drag up = go to high-angle row, drag down = low-angle)
- Mouse wheel → zoom in/out using CSS transform scale with smooth cubic-bezier easing
- Double-click → activates "8K Magnifying Glass" mode: renders a circular loupe overlay at 8K resolution for that exact frame using a high-res version of the image
- Touch support: `pointermove` events with pressure sensitivity

PERFORMANCE:
- Use a Web Worker (`sprite-preloader.worker.js`) to sequentially preload all 109 images after the page reaches `interactive` state
- Implement priority loading: load the eye-level row first (most used), then high-angle, then low-angle
- Display a skeleton shimmer placeholder during loading; fade it out when the first row is ready
- Cache all loaded Image objects in a `Map<string, HTMLImageElement>` keyed by filename
- Draw frames using `canvas.getContext('2d').drawImage()` for zero-DOM-reflow rendering

DUAL MODEL DISPLAY:
- Add a toggle to show "Current" vs "Desired" model, or a split-screen comparison mode where both models render side-by-side in separate canvases
- In split-screen, sync the rotation angle of both viewers — dragging one rotates both simultaneously
```

***

## Prompt 4 — Anatomical Peel & Depth Layering System

```
Implement a ZygoteBody-inspired "Anatomical Peel" system in Three.js/React-Three-Fiber that progressively reveals internal body layers through an opacity slider.

LAYER ARCHITECTURE (4 separate GLB meshes in one Three.js Group):
1. Skin mesh (outermost) — photorealistic PBR skin shader
2. Muscle mesh — red-toned, semi-translucent, showing major muscle groups with individual naming
3. Skeleton mesh — off-white bone material with metalness=0, roughness=0.8
4. Organ mesh — color-coded organs: heart=red, liver=brown, kidneys=purple, lungs=pink

DEPTH SLIDER (0 to 100):
- 0-30: Only skin visible (opacity 1.0). Muscle opacity = 0
- 30-60: Skin fades out (1.0 → 0.0), Muscle fades in (0.0 → 1.0)
- 60-80: Muscle fades out, Skeleton fades in
- 80-100: Skeleton fades out, Organs become fully visible
- Use `THREE.MeshStandardMaterial.opacity` with `transparent: true` and smooth linear interpolation via `useFrame()` hook

CLICKABLE ORGAN HOTSPOTS:
- Enable `THREE.Raycaster` for all organ mesh children
- When a specific organ mesh is clicked (e.g., the liver object), check `userData.healthMetrics` for relevant biomarkers
- If liver stress is flagged (e.g., ALT > threshold), apply a `THREE.PointLight` with red color parented to the liver mesh to make it "glow red"
- Clicking a glowing organ opens a side panel (slides in from the right) with the specific health action plan from userData.js
- Hovering over any muscle group shows a tooltip with: muscle name, current training status, and % progress toward hypertrophy goal

BODY COMPOSITION OVERLAY:
- Add a toggle button "Show Body Composition" that applies a shader-based heatmap onto the skin mesh
- Use vertex colors to paint fat-dominant zones in orange and muscle-dominant zones in blue, based on DEXA scan zone data from userData.js
- Animate the heatmap fade-in using a custom GLSL uniform `uRevealProgress`
```

***

## Prompt 5 — Face Clone via Photo Upload (High-End Bitmoji)

```
Build the facial personalization pipeline that lets a user upload a selfie and receive a 3D face mesh that matches their likeness.

PIPELINE:
1. Photo upload UI — a drag-and-drop zone with a circular crop guide and instructions: "Face centered, neutral expression, even lighting, no glasses"
2. On upload, send the photo to Ready Player Me REST API (or MediaPipe FaceMesh as a free alternative) to generate a `.glb` face mesh
3. Replace the generic head mesh in the Three.js scene with the personalized face GLB, matched to the same neck attachment bone of the body skeleton (Mixamo rig standard)
4. Implement a "Face Edit" mode with sliders specifically for manual fine-tuning: Jaw Width, Forehead Height, Eye Spacing, Nose Length, Lip Fullness, Ear Protrusion

BIO-FEEDBACK SHADER SYSTEM:
Build a custom `FaceHealthShader` as a THREE.ShaderMaterial with these uniforms:
- `uSleepDebt` (float 0-1): When sleep < 5h for 3+ days, blends in a dark ambient occlusion texture under the eye sockets
- `uHydration` (float 0-1): Low hydration tightens skin shader (increase roughness, reduce subsurface scattering)
- `uStressLevel` (float 0-1): High cortisol → slight redness on forehead/cheek zones via emissive color tinting
- `uFatigue` (float 0-1): Reduces contrast on the face texture (washes out colors slightly)
All uniforms animate smoothly over 2 seconds using `gsap.to(material.uniforms.uSleepDebt, { value: newValue, duration: 2 })` when userData.js updates

HAIR SYSTEM:
- Provide 6 hair style options as separate `.glb` meshes (Short Buzz, Medium Fade, Long Textured, Bald, Curly Top, Slicked Back)
- Each hair mesh contains rigged hair bones for physics simulation using Three.js `SkeletonHelper`
- Hair color picker: a swatch palette of 12 colors that modifies the hair material's `color` uniform in real-time
- Beard toggle with density slider (0=clean shaven, 100=full beard) using morph targets on a separate beard mesh
```

***

## Prompt 6 — Dynamic Wardrobe & Outfit System

```
Build a `WardrobeManager` class and accompanying UI for dynamically dressing/undressing the 3D character with modular outfit pieces.

WARDROBE ARCHITECTURE:
class WardrobeManager {
  constructor(scene, skeleton) — takes the Three.js scene and the loaded SkeletonHelper rig
  
  loadGarment(garmentId) — fetches a .glb file, attaches it to the skeleton using SkeletonUtils.clone(), binds bones by name matching
  
  removeGarment(garmentId) — disposes the mesh geometry/materials and removes from scene
  
  setOutfitPreset(presetName) — loads a curated combination (e.g., "Gym Outfit", "Formal Suit", "Streetwear")
  
  scaleToMorphs(morphInfluences) — called whenever body morphs change; re-applies mesh skinning weights so clothing stretches correctly with the body
}

OUTFIT CATEGORIES:
- Tops: Tank Top, Compression Shirt, Formal Dress Shirt, Hoodie
- Bottoms: Athletic Shorts, Joggers, Dress Pants, Swim Trunks
- Shoes: Sneakers, Dress Shoes, Barefoot (default)
- Accessories: Watch (binds to LeftWristBone), Cap (binds to HeadBone), Sunglasses (binds to FaceBone)
- Mode Presets: 
  * "Anatomy Mode" → removes all clothing except compression shorts for full muscle visibility
  * "Gym Mode" → tank top + shorts + sneakers
  * "Goal Physique Mode" → formal suit that auto-scales to "Desired" body morph target values (showing how a tailored suit would fit the goal body)

UI PANEL:
- A horizontal scrolling "closet rail" component with outfit card thumbnails
- Clicking an outfit card applies it with a smooth `0.3s ease-out` dissolve transition (opacity fade of old mesh + fade-in of new)
- Color variants for each garment shown as small circles below the card — clicking changes the material albedo color
- A "Try on Desired Body" toggle that temporarily loads Goal Body morphs so the user can see how clothes fit their target physique
```

***

## Prompt 7 — Dual Viewport Ghost Comparison

```
Implement a "Ghost Comparison" mode that overlays the Desired physique mesh over the Current physique mesh to show the exact volumetric delta.

GHOST RENDERING:
- Current body: rendered normally with full PBR shading
- Desired body: rendered as a translucent ghost mesh using a custom wireframe + fill shader
  * Material: THREE.MeshStandardMaterial with opacity=0.25, transparent=true, depthWrite=false
  * Add a subtle blue-tinted emissive glow (emissive: new THREE.Color(0.1, 0.2, 0.8), emissiveIntensity: 0.3) so it's clearly distinguishable
  * Render the ghost in a separate Three.js rendering pass so it always appears on top of the current body without z-fighting

DELTA VISUALIZATION:
- Where Desired body extends beyond Current body (muscle gain zones), render a green volumetric glow on those vertices
- Where Current body extends beyond Desired (fat loss zones), render an orange glow
- Implement this using a custom GLSL vertex shader that computes per-vertex delta by subtracting morph target positions:
  `vec3 delta = desiredMorphPosition - currentPosition; float gain = max(0.0, dot(delta, normal)); float loss = max(0.0, dot(-delta, normal));`
- Mix `vec3(0.2, 0.8, 0.3)` (green) and `vec3(0.9, 0.4, 0.1)` (orange) based on gain/loss values

COMPARISON UI:
- A slider at the top of the viewport that transitions between "Current Only" → "Ghost Overlay" → "Desired Only" modes
- An "X-Ray Split" mode: a vertical dividing line (draggable by the user) shows Current body on the left half and Desired body on the right half within the same camera view
- A stats panel that auto-calculates from morph differences: "+4.2cm shoulder width", "+8kg lean mass projected", "-12cm waist" with animated number counters
- Screenshot button that captures the current viewport state (canvas.toDataURL) and adds a branded overlay with the user's name and date
```

***

## Prompt 8 — Performance, Loading & Mobile UX

```
Optimize the entire 3D human model system for mobile and low-end devices with progressive enhancement.

LOD (Level of Detail) SYSTEM:
- High LOD (desktop, GPU detected): Full morphable mesh + PBR textures + real-time shadows
- Medium LOD (mid-range mobile): Baked ambient occlusion texture instead of real-time shadows, 50% polygon reduction using THREE.SimplifyModifier
- Low LOD (weak GPU): Static pose with 3 sprite images only (front, side, back), no WebGL at all

GPU DETECTION:
const renderer = new THREE.WebGLRenderer();
const gl = renderer.getContext();
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
const gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
// Use string matching to classify: keywords like "Apple M", "RTX", "RX 6" → High LOD
// Keywords like "Mali", "Adreno 5", "Intel HD" → Low/Medium LOD

MOBILE GESTURE CONTROLS:
- Single finger drag: rotate model
- Two-finger pinch: zoom in/out
- Two-finger twist: tilt camera angle (vertical rotation)  
- Double-tap: reset camera to default front view
- Long press on body part: open contextual menu for that body zone

PROGRESSIVE ASSET LOADING:
- Load assets in priority order: body mesh → skin texture → normal map → specular map → clothing → hair → accessories
- Each loaded layer triggers a visual "reveal" — a bottom-to-top wipe animation using a custom GLSL clip plane
- Show a circular progress indicator with loading stage labels ("Loading body mesh... 34%", "Applying skin texture... 67%")
- If the user interacts before loading completes, prioritize loading the viewport-visible assets immediately using a "focus area" interrupt system

QUALITY SETTINGS PANEL:
- A gear icon opens a settings sheet with: Shadow Quality (Off/Low/High), Texture Resolution (512/1024/2K/4K), Anti-aliasing (Off/FXAA/MSAA 4x), Particle Effects (Off/On), Animation Quality (Reduced/Full)
- Settings are saved in a JS object and restore on revisit within the session
```

***

These 8 prompts map directly to your existing roadmap phases in [Photoreal_360_Mega_Feature.md](https://github.com/gokulsenthilkumar3/Ultimate/blob/main/Photoreal_360_Mega_Feature.md), covering Phase 1 through Phase 5 plus optimization. Each prompt is self-contained — you can feed any one directly to Claude/GPT-4 as a standalone coding task within your `dashboard-app` React project. Prompts 3, 4, 7, and 8 correspond to your currently open tasks (Tasks 1.3, 4.1–4.3, and performance), while Prompts 2, 5, and 6 address the wardrobe/bitmoji/blender-style features from Stage 5.