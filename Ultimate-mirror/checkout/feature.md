You are a senior full-stack 3D web engineer working on a React + Three.js / React-Three-Fiber
fitness dashboard called "GrowthTrack Ultimate". Your task is to build the complete
"Photorealistic 360° Parametric Human Engine" — a web-based Digital Twin system that lets
the user either:

  (A) Input their exact body measurements → and the 3D model automatically morphs to become
      a precise clone of their real body.
  (B) Manually customize the model using Blender-style sliders and toggles.

The full system has 5 phases described below. Build them in order.
All code goes inside the existing `growthtrack-ultimate` React project.
The main 3D component lives at `src/components/Body3D.jsx`.
User health data is imported from `src/data/userData.js`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — HEMISPHERICAL SPRITE VIEWER (Immediate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build a `Sprite3DViewer.jsx` React component that simulates photorealistic 360° rotation
using a pre-rendered image sequence array — no heavy WebGL needed for Phase 1.

Image array structure (109 WebP files per model):

- Row 0  (eye-level,   0°): current_0_frame_001.webp  → current_0_frame_036.webp
- Row 1  (high-angle, 45°): current_45_frame_001.webp → current_45_frame_036.webp
- Row 2  (low-angle, -45°): current_n45_frame_001.webp→ current_n45_frame_036.webp
- Row 3  (top-down,  90°):  current_top_frame_001.webp (single loop frame)
- Same naming with "desired_" prefix for Goal Body frames.

Interaction requirements:

- Horizontal mouse/touch drag → scrubs through 36 horizontal frames (left = counter-clockwise)
- Vertical mouse drag → switches rows (up = high-angle, down = low-angle)
- Mouse scroll → zoom in/out with CSS transform scale + smooth cubic-bezier easing
- Double-click → activates "8K Magnifying Glass" loupe overlay using the high-res version of the same frame
- Full touch support via pointermove events

Performance requirements:

- Use a Web Worker (sprite-preloader.worker.js) to silently preload all 109 images after
    the page reaches interactive state
- Priority load order: eye-level row first, then high-angle, then low-angle
- Cache all loaded Image objects in Map<string, HTMLImageElement> keyed by filename
- Render via canvas.getContext('2d').drawImage() — no DOM image elements, zero reflow
- Show skeleton shimmer placeholder during load, fade it out when first row is ready

Dual model feature:

- A toggle button switches between "Current Body" and "Goal Body" image sequences
- A split-screen comparison mode renders both models side-by-side in synced canvases
    (dragging one rotates both simultaneously)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — BLENDER-STYLE PARAMETRIC ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace the sprite viewer with a live Three.js/React-Three-Fiber parametric engine
once the GLB assets are ready (Task 2.1).

A) BODY METRICS AUTO-CLONE (Input measurements → model morphs to real body):

Build a `MetricsInputPanel.jsx` component:

- Two-column layout: left = sliders with live number inputs, right = live 3D viewport
- Input fields: Height (cm), Weight (kg), Body Fat %, Shoulder Width, Chest Circumference,
    Waist Circumference, Hip Circumference, Arm Length, Leg Length, Neck, Wrist diameter
- Each metric maps to specific morphTargetInfluences[] via a lookup dictionary:
      morphValue = clamp((userValue - minValue) / (maxValue - minValue), 0, 1)
- Composite mapping for complex metrics: e.g., Body Fat % affects waist morph + ab definition
    morph inversely — low BF% → waist shrinks AND ab definition morph increases simultaneously
- 3D model must update within 50ms of any slider change using requestAnimationFrame debouncing
- "Save Snapshot" button stores the current metric set with a date label (in-memory array)
- "Load Snapshot" dropdown lets user switch between saved body states instantly
- A "Measurement Guide" button shows a side panel with animated SVG diagrams showing
    HOW to self-measure each body part with a tape measure

B) MANUAL BLENDER-STYLE CUSTOMIZER:

Build a `CharacterCustomizer.jsx` panel:

  Left sidebar with collapsible category groups. Each group has sliders:

  UPPER BODY:
    Shoulder Width, Shoulder Cap Roundness, Chest Width, Chest Depth (pec thickness),
    Arm Muscle Mass, Bicep Peak, Forearm Thickness, Trap Height

  CORE:
    Waist Width, Abdominal Definition (0=smooth → 100=shredded six-pack),
    Love Handle Volume, Lower Back Arch

  LOWER BODY:
    Hip Width, Glute Projection, Quad Mass, Hamstring Fullness,
    Calf Thickness, Ankle Width

  FACE & HEAD:
    Face Width, Jaw Sharpness, Cheekbone Prominence, Eye Socket Depth, Nose Bridge Width

  SKIN & APPEARANCE:
    Skin Tone (warm/cool hue slider on the material albedo),
    Vascular Definition (vein normal-map opacity 0→1),
    Body Hair Density (hair particle system density uniform)

  Slider UX rules:
    - Hovering a slider highlights the corresponding body region with a subtle yellow rim light
    - Double-clicking a slider label locks it (padlock icon) — excluded from Randomize
    - Each slider has a per-slider reset button (↺ icon) to snap back to default value
    - "Randomize Body" button (dice icon) applies smooth animated randomization to all
      unlocked morphs using staggered tweens (Motion library spring())
    - "Sync to Metrics" button reads userData.js measurements and auto-sets all sliders

  Bottom toolbar:
    Undo (Ctrl+Z), Redo (Ctrl+Y), Save Preset, Load Preset, Reset All

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — ZYGOTE-GRADE ANATOMICAL PEEL SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build an anatomical layering system inspired by ZygoteBody — progressive reveal of
body layers from skin to organs via a single depth slider.

4 separate GLB meshes loaded into one Three.js Group:

  1. Skin mesh    — photorealistic PBR skin shader (outermost)
  2. Muscle mesh  — red-toned semi-translucent, named muscle groups
  3. Skeleton mesh — off-white bone material (metalness=0, roughness=0.8)
  4. Organ mesh   — color-coded: heart=red, liver=brown, kidneys=purple, lungs=pink

BiomarkerDepthSlider (0–100 range) controls layer opacity cross-fades:
  0–30:  Only skin visible (opacity 1.0), muscle opacity = 0
  30–60: Skin fades 1.0→0.0, Muscle fades 0.0→1.0
  60–80: Muscle fades out, Skeleton fades in
  80–100: Skeleton fades out, Organs become fully visible at 1.0
Use THREE.MeshStandardMaterial.opacity with transparent:true and smooth
linear interpolation inside useFrame() hook.

Clickable organ Raycaster system:

- Enable THREE.Raycaster on all organ mesh children
- When organ is clicked, check userData.healthMetrics for relevant biomarkers
- If the organ has a flagged health issue (e.g., liver: ALT > threshold, or caffeine abuse flag),
    attach a THREE.PointLight with red color to that organ mesh — it glows red in the scene
- Clicking a glowing organ slides in a right-side panel with the specific health action plan
    from userData.js for that organ
- Hovering any named muscle group shows a tooltip: muscle name, current training volume,
    % progress toward hypertrophy goal from userData.js workout data

Body Composition Heatmap overlay toggle:

- "Show Body Composition" button applies a vertex-color heatmap to the skin mesh
- Fat-dominant zones painted orange, muscle-dominant zones painted blue
- Based on body zone data from userData.js (DEXA scan or manual BF% estimates)
- Fade-in animation via a custom GLSL uniform `uRevealProgress` (0→1 over 1.2 seconds)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — HIGH-END BITMOJI / PERSONAL DIGITAL TWIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A) FACE CLONE VIA PHOTO UPLOAD:

- Drag-and-drop photo upload zone with circular crop guide
- Instructions overlay: "Face centered, neutral expression, even lighting, no glasses"
- On upload, call Ready Player Me REST API (or MediaPipe FaceMesh as free fallback)
    to generate a personalized .glb head mesh
- Replace the generic head mesh in scene using SkeletonUtils — match to neck attachment
    bone of the Mixamo rig
- "Face Edit" mode with fine-tuning sliders: Jaw Width, Forehead Height, Eye Spacing,
    Nose Length, Lip Fullness, Ear Protrusion

B) BIO-FEEDBACK FACE SHADER:

Build `FaceHealthShader` as a THREE.ShaderMaterial with these uniforms:
  uSleepDebt   (float 0–1): sleep < 5h for 3+ consecutive days → blend in dark circle
                             ambient occlusion map under eye sockets
  uHydration   (float 0–1): low hydration → increase roughness, reduce subsurface scattering
  uStressLevel (float 0–1): high cortisol → red tint emissive on forehead and cheek zones
  uFatigue     (float 0–1): reduces texture contrast (washes out face colors slightly)

All uniforms animate smoothly over 2s:
  gsap.to(material.uniforms.uSleepDebt, { value: newVal, duration: 2 })
Triggered automatically whenever userData.js health data updates.

Also: if bodyFat drops from 18% → 12%, a shader uniform on the BODY mesh
(uAbDefinition float 0–1) actively increases normal-map intensity on the abdominal
mesh vertices, making six-pack definition appear without needing a new asset.

C) HAIR SYSTEM:

- 6 hair style GLB options: Short Buzz, Medium Fade, Long Textured, Bald, Curly Top, Slick Back
- Each hair mesh has rigged hair bones for physics using Three.js SkeletonHelper
- Hair color palette: 12 color swatches that modify material color uniform in real-time
- Beard density slider (0=clean → 100=full beard) using morph targets on a separate beard mesh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — WARDROBE SYSTEM + GHOST COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A) WARDROBE MANAGER:

Build a WardrobeManager class:

  class WardrobeManager {
    constructor(scene, skeleton)
    loadGarment(garmentId)     // fetch .glb, attach to skeleton via SkeletonUtils.clone(),
                               // bind bones by name matching
    removeGarment(garmentId)   // dispose mesh geometry/materials, remove from scene
    setOutfitPreset(name)      // load a curated outfit combination
    scaleToMorphs(morphInfluences) // re-apply skinning weights when body morphs change
                               // so clothing stretches correctly with body shape
  }

Outfit categories and presets:
  Tops:        Tank Top, Compression Shirt, Formal Dress Shirt, Hoodie
  Bottoms:     Athletic Shorts, Joggers, Dress Pants, Swim Trunks
  Shoes:       Sneakers, Dress Shoes, Barefoot
  Accessories: Watch (→ LeftWristBone), Cap (→ HeadBone), Sunglasses (→ FaceBone)

Mode presets:
  "Anatomy Mode"    → removes all clothing, compression shorts only — full muscle visibility
  "Gym Mode"        → tank top + shorts + sneakers
  "Goal Body Mode"  → formal suit that auto-scales to Desired morph target values,
                      showing how a tailored suit fits the goal physique
  "Lifestyle Mode"  → high-end streetwear on current body

Outfit switching:

- Horizontal scrolling "closet rail" with outfit card thumbnails
- Clicking a card applies outfit with 0.3s opacity fade transition
- Color variants shown as small circles below each card — clicking changes material albedo
- "Try on Goal Body" toggle temporarily loads Desired morphs to show how clothes fit the target

B) DUAL VIEWPORT GHOST COMPARISON:

- Current body: rendered normally with full PBR shading
- Desired body: rendered as translucent ghost using:
      opacity: 0.25, transparent: true, depthWrite: false
      emissive: new THREE.Color(0.1, 0.2, 0.8), emissiveIntensity: 0.3
    Rendered in a separate Three.js pass to avoid z-fighting

Delta visualization using custom GLSL vertex shader:
  vec3 delta = desiredMorphPosition - currentPosition;
  float gain = max(0.0, dot(delta, normal));  // where desired > current → green glow
  float loss = max(0.0, dot(-delta, normal)); // where current > desired → orange glow
  Mix vec3(0.2, 0.8, 0.3) and vec3(0.9, 0.4, 0.1) per vertex based on gain/loss.

Comparison UI controls:

- Top slider: "Current Only" ↔ "Ghost Overlay" ↔ "Desired Only" transitions
- "X-Ray Split" mode: draggable vertical divider — Current on left, Desired on right,
    same camera, same rotation
- Auto-calculated delta stats panel: "+4.2cm shoulder width", "-12cm waist",
    "+8kg lean mass" with animated number counters (NumberFlow library)
- Screenshot button: canvas.toDataURL() capture with branded overlay (user name + date)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFORMANCE & MOBILE (Apply across all phases)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOD system — detect GPU and serve appropriate quality:
  High   (desktop GPU: Apple M, RTX, RX series): Full morph mesh + PBR + real-time shadows
  Medium (mid mobile: Adreno 6xx, Mali-G7x):     Baked AO textures, 50% polygon reduction
  Low    (weak GPU: Adreno 5xx, Intel HD):        Static 3-view sprites only, no WebGL

GPU detection:
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  // classify by string keywords → assign LOD level

Mobile gesture controls:

- 1 finger drag     → rotate model
- 2 finger pinch    → zoom
- 2 finger twist    → tilt camera vertically
- Double-tap        → reset camera to front view
- Long press body part → open contextual menu for that zone

Progressive asset loading order:
  body mesh → skin texture → normal map → specular map → clothing → hair → accessories
Each layer fades in with a bottom-to-top clip plane wipe animation using a GLSL uniform.
Show circular progress indicator: "Loading skin texture... 67%"

Quality settings panel (gear icon):
  Shadow Quality (Off / Low / High)
  Texture Resolution (512 / 1K / 2K / 4K)
  Anti-aliasing (Off / FXAA / MSAA 4x)
  Particle Effects (Off / On)
  Animation Quality (Reduced / Full)
Settings persist in a JS object for the session duration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Framework:     React (existing project)
  3D Engine:     Three.js + React-Three-Fiber (@react-three/fiber) + @react-three/drei
  Animation:     GSAP for shader uniform tweens, Motion (framer-motion) for UI
  State:         React useState / useReducer for morph state, zustand for global 3D state
  Assets:        All meshes as .glb files, textures as .webp (4K max)
  No localStorage — use in-memory JS objects for all saved states (sandbox constraint)
  All 3D logic isolated in hooks: useMorphTargets(), useWardrobeManager(), useSpriteViewer()
  Deliver each Phase as a self-contained PR-ready set of components.
  Start with Phase 1 (Sprite3DViewer) immediately — it gives photorealism
  with zero GLB dependency. Then build Phase 2 concurrently with asset preparation.

  You are upgrading an existing React + Three.js / React-Three-Fiber fitness dashboard
called "GrowthTrack Ultimate". The file to replace is:

  dashboard-app/src/components/Body3D.jsx

I will give you the current implementation. Your job is to surgically upgrade it
from using primitive THREE.js geometry (BoxGeometry, SphereGeometry, CylinderGeometry)
to a PHOTOREALISTIC "mirror-like" 3D human model — meaning the model should look
like the user is literally looking at themselves in a mirror: real skin, real
proportions, real light response, no cartoon or geometric look.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT ALREADY EXISTS (DO NOT BREAK THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keep all of these working exactly as they are:

  1. The peelShader (Zygote anatomical depth system, uDepth uniform, organ fade-in)
  2. The ORGANS array + buildOrgans() + Raycaster click → action plan panel
  3. The morph sliders: chest, shoulders, waist, arms (they just need to map to a real GLB)
  4. The Parametric Editor panel UI (right sidebar overlay, all 4 sliders + anatomyDepth)
  5. The "YOU NOW" / "YOUR GOAL" dual model layout with left/right positioning
  6. The autoRotate / Front / Side / Back view controls
  7. The Sprite3DViewer tab ("High-End Render" mode) — keep it untouched
  8. The onSelectPart callback and selected part action plan panel below the viewer
  9. The Apparel simulation ON/OFF toggle
  10. The data imports: STATUS, BODY_PARTS from userData.js — all userData references preserved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIMARY GOAL: REPLACE GEOMETRY WITH A REAL GLB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — GLB Asset Strategy (Mirror-Realistic)

Use @react-three/drei's useGLTF() hook to load two .glb files:
  /models/human_current.glb   (current body — lean, 182cm, 63kg build)
  /models/human_goal.glb      (goal body — athletic, 182cm, 82kg build)

These must be sourced from MakeHuman (free) or the Mixamo base mesh or
ReadyPlayerMe API. The mesh must:

- Be a full-body humanoid (head, torso, arms, legs, hands, feet)
- Use a standard Mixamo/Humanoid skeleton rig (named bones: Hips, Spine,
    Chest, UpperArm_L/R, ForeArm_L/R, Thigh_L/R, Leg_L/R, etc.)
- Have morph targets (blend shapes) exported, minimum set:
    "chest_wide", "shoulders_wide", "waist_wide", "arms_thick",
    "belly_out", "glutes_wide", "quads_thick", "calves_thick"
- Have UV-mapped skin texture coordinates

Until the real .glb files are available, use a fallback: load the free
"Soldier" model from Three.js examples as a placeholder:
  <https://threejs.org/examples/models/gltf/Soldier.glb>
(This keeps the code running. Replace the path when real assets are ready.)

STEP 2 — Photorealistic Skin Shader (The "Mirror" Effect)

Replace the existing createPeelMaterial() with a new function
createSkinMaterial() that uses THREE.MeshPhysicalMaterial (not ShaderMaterial
for the base skin) with these settings to simulate real skin:

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(userData.skinTone || '#C68642'), // from userData
    roughness: 0.72,          // skin is not perfectly smooth
    metalness: 0.0,           // skin is not metallic
    transmission: 0.0,
    thickness: 0.8,           // subsurface scattering thickness
    attenuationColor: new THREE.Color('#ff9966'),  // warm subsurface tone
    attenuationDistance: 0.3,
    clearcoat: 0.05,          // slight sheen (sweat/oil on skin)
    clearcoatRoughness: 0.9,
    sheen: 0.15,              // skin has soft sheen at glancing angles
    sheenColor: new THREE.Color('#ffddcc'),
    envMapIntensity: 0.8,     // reflects environment subtly
    side: THREE.FrontSide,
  });

The anatomical peel system (uDepth) must STILL work. Implement it like this:

- When anatomyDepth = 100 (full skin): render the GLB mesh with skinMat
- As anatomyDepth decreases: lerp the skinMat.opacity from 1 → 0 over 0–50 range
    AND lerp a separate muscleMat opacity from 0 → 1 (a red, semi-transparent variant)
- At anatomyDepth < 20: swap to the organs group (existing ORGANS array is fine)
- Implement the opacity lerp inside useFrame() using THREE.MathUtils.lerp()

STEP 3 — Photorealistic Lighting Rig (Mirror-Like Illumination)

Replace the existing lights in SystemScene with a studio-quality rig:

  {/*Key light — simulates window/soft-box from upper left*/}
  <directionalLight
    position={[-3, 4, 3]}
    intensity={1.8}
    color="#fff5e8"
    castShadow
    shadow-mapSize={[2048, 2048]}
    shadow-camera-far={20}
  />

  {/*Fill light — soft from right, slightly cool*/}
  <directionalLight position={[4, 2, 2]} intensity={0.6} color="#d6e8ff" />

  {/*Rim/back light — creates separation from background, gives depth*/}
  <directionalLight position={[0, 3, -5]} intensity={0.9} color="#88aaff" />

  {/*Ground bounce — warm upward fill simulating floor reflection*/}
  <pointLight position={[0, -0.5, 0.5]} intensity={0.4} color="#ffcc88" distance={4} />

  {/*Ambient — very low, prevents full black shadows*/}
  <ambientLight intensity={0.15} color="#1a1a2e" />

  {/*Environment for PBR reflections (critical for MeshPhysicalMaterial)*/}
  import { Environment } from '@react-three/drei';
  <Environment preset="studio" background={false} />

STEP 4 — Body Metrics → Real Morph Targets

In the Parametric Editor panel, add a "BODY METRICS" section ABOVE the existing
morph sliders with these inputs:

  Height (cm) — range 150–210, default 182
  Weight (kg) — range 45–130, default 63
  Body Fat %  — range 5–40, default 22

When these change, auto-compute and set all morph slider values:
  chest      = lerp(0.85, 1.3, (weight - 45) / 85)
  shoulders  = lerp(0.9, 1.4, (height - 150) / 60)
  waist      = lerp(0.7, 1.5, (bodyFat - 5) / 35)
  arms       = lerp(0.85, 1.3, (weight - 45) / 85)

Update the existing setMorphs() call with these computed values.
Show a "📐 Sync from Metrics" button that triggers this calculation.
The user can ALSO still manually drag the morph sliders to override.

STEP 5 — GLB Morph Target Binding

When the GLB loads via useGLTF(), bind the React morph state to the mesh:

  useEffect(() => {
    if (!gltfRef.current) return;
    gltfRef.current.traverse((node) => {
      if (node.isMesh && node.morphTargetDictionary) {
        const dict = node.morphTargetDictionary;
        const inf = node.morphTargetInfluences;
        if (dict['chest_wide'] !== undefined)     inf[dict['chest_wide']]     = morphs.chest - 1;
        if (dict['shoulders_wide'] !== undefined) inf[dict['shoulders_wide']] = morphs.shoulders - 1;
        if (dict['waist_wide'] !== undefined)     inf[dict['waist_wide']]     = morphs.waist - 1;
        if (dict['arms_thick'] !== undefined)     inf[dict['arms_thick']]     = morphs.arms - 1;
      }
    });
  }, [morphs]);

The mapping morphValue = sliderValue - 1 converts from range 0.7–1.5 to -0.3–+0.5
morph influence range.

STEP 6 — Background: Dark Mirror Environment

Update the Canvas background to feel like a premium mirror/studio:

  <Canvas
    camera={{ position: [0, 0.9, 3.8], fov: 40 }}
    shadows
    gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
  >
    <color attach="background" args={['#050810']} />
    <fog attach="fog" args={['#050810', 6, 14]} />

Add a subtle reflective floor plane directly under the model:
  <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
    <planeGeometry args={[6, 6]} />
    <MeshReflectorMaterial   {/*from @react-three/drei*/}
      blur={[200, 100]}
      resolution={512}
      mixBlur={0.9}
      mixStrength={0.4}
      roughness={1}
      depthScale={1.2}
      minDepthThreshold={0.4}
      maxDepthThreshold={1.4}
      color="#050810"
      metalness={0.5}
    />
  </mesh>

STEP 7 — Hair System (New Feature, Additive)

Add a simple hair mesh toggle to the Parametric Editor panel below the Apparel
toggle. The hair is a separate .glb loaded from /models/hair_short.glb.
Toggle it on/off using the same pattern as the apparel toggle — set mesh.visible.
Provide 3 presets: Short, Medium, Bald (just swap mesh.visible of 3 hair group nodes).
Add to the morphs state: { ...existing, hair: 'short' }

STEP 8 — Preserve All Existing Functionality

After the upgrade, verify:
  ✅ Clicking any body region still calls onSelectPart(userData) and shows the
     action plan panel below — hook this to the GLB mesh userData by traversing
     the GLB scene and matching bone/mesh names to BODY_PARTS keys
  ✅ The ORGANS array still renders as spheres using createPeelMaterial()
     with isOrgan=true, positioned correctly relative to the torso
  ✅ Zygote peel depth slider (0–100) still cross-fades layers
  ✅ 360° auto-rotate, Front/Side/Back buttons still snap rotation
  ✅ "High-End Render" tab still renders <Sprite3DViewer />
  ✅ The colour legend and status badges at the bottom are unchanged
  ✅ All userData.js imports (STATUS, BODY_PARTS) are unchanged

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGES TO INSTALL (run in dashboard-app/):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm install @react-three/drei@latest
(Environment, MeshReflectorMaterial, useGLTF, OrbitControls, useProgress
 are all from @react-three/drei — no other new packages needed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Produce the full, complete updated Body3D.jsx file.
Do not omit or abbreviate any section.
The file must be a drop-in replacement — same export name, same props interface.
Include a comment block at the top listing which GLB files need to be added
to dashboard-app/public/models/ and where to source them for free.
