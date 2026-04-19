# Mega Feature Initiative: Photorealistic 360° Parametric Human Engine

## 1. Executive Summary
The goal of this "Mega Feature" is to replace the dashboard's basic geometric 3D representation with a heavily customizable, photorealistic human digital twin. This feature will act as a specialized, web-based "Blender for Human Physiology," allowing the user to seamlessly compare their precise current physical status against their desired "Greek God" goals.

The engine will support two primary modes of operation:
*   **The Hemispherical Sprite Engine (Phase 1):** Loading pre-rendered photorealistic arrays based on the user's current data.
*   **The Parametric WebGL Engine (Phase 2):** Real-time, slide-adjustable 3D meshes supporting anatomical scaling.

---

## 2. Phase 1: The Hemispherical Image-Sequence Architecture

To achieve absolute photorealism (8K/4K Unreal Engine or Octane Render quality) without melting user GPUs, we will utilize a Hemispherical Spin array sequence. 

### Render Asset Strategy
Instead of rendering a 1GB raw 3D mesh in the browser, the backend/rendering pipeline will generate highly optimized 4K image sequences:
*   **Row 1 (Eye level - 0°):** 36 images (10° increments)
*   **Row 2 (High angle - 45°):** 36 images
*   **Row 3 (Low angle - -45°):** 36 images
*   **Row 4 (Top-down - ±90°):** 1 placeholder / loop
*   *Total per model:* ~109 images.

**Implementation Rules:**
*   Resolution is capped at 4K (3840×2160) using modern WebP compression. 8K is restricted to a "Magnifying Glass" zoom mode to prevent 1GB+ network payloads.
*   Sequences must follow standard strict naming (`current_0_frame_001.webp`, `desired_45_frame_036.webp`).
*   A custom React canvas-scraper will tie the user's mouse drag events directly to the array index, simulating authentic 360° object rotation instantly. 

---

## 3. Phase 2: The "Blender-Style" Parametric Engine

To fulfill the vision of "customizing data inputs like Blender," relying purely on pre-rendered image arrays becomes impossible due to combinatorial explosion. We transitioned the dashboard to a live Parametric Engine.

### Mega-Features & Customization Points:
*   **Dynamic Morph Targets (Blend Shapes):** Sliders for Chest Width, Girth, Shoulder Cap, Waist Vacuum, and Arm Sweep.
*   **Cosmetic Toggles:** UI controls to swap hair styles, and toggle apparel (no dress vs athletic wear).
*   **Dual Viewport Ghosting:** The ability to overlay the "Desired" mesh directly over the "Current" mesh to expose the exact volumetric delta.

---

## 4. Phase 3: Zygote-Grade Anatomical Layering (The Missing Link)

A review of top-tier medical visualizers like **ZygoteBody** revealed the missing dimensional aspect of this Mega Feature. It's not just about spinning a photorealistic skin-suit; it's about seeing *inside*.

To perfectly achieve the statement, *"see the status of myself and desired,"* the engine requires deep cross-sectional layering.

### The Anatomical Peel System
*   **Vertical Depth Slider:** A master UI slider that progressively fades the outer photorealistic skin map to 0% opacity, revealing the deeply textured **Muscular System**, followed by the **Skeletal Framework**, and lastly the **Internal Organs** (Liver, Heart, Kidneys).
*   **Internal Health Mapping:** When the user has high cortisol or liver stress (caffeine abuse), clicking the literal 3D liver in the Organ Layer highlights it glowing red and pulls up the specific `userData.js` medical action plan.
*   **Part-Specific Drill-Down:** Instead of just zooming the whole body, you can isolate specific muscle groups (e.g., highlighting just the Latissimus Dorsi or the PC Muscle) to track localized growth.

---

## 5. Phase 4: The "High-End Bitmoji" Avatar Architecture

The ultimate personal connection to the dashboard is recognizing the model as *yourself*. We move beyond generic "Greek God" statues into a **High-Fidelity Personal Digital Twin (A High-End Bitmoji)**.

### The Avatar Generation & Asset Pipeline
To create an avatar that is hyper-personalized but computationally light enough for the web:
*   **Facial Mapping Integration:** Utilizing a platform like **Ready Player Me (Pro/High-Fidelity)**, **MetaHuman Lite**, or **KeenTools FaceBuilder**, the user uploads a portrait photo. The engine generates a custom `.glb` head mesh with exact facial likeness, skin tone, and mapped topology.
*   **The Global Skeleton Rig (Mixamo/Standard Humanoid):** Both the "Current" and "Desired" bodies share the exact same skeletal rig. This ensures that when you swap outfits or apply animations (like posing), it works flawlessly on both the 63kg model and the 82kg model.

### The Dynamic Wardrobe System (The "Dress" Logic)
A true high-end Bitmoji requires a modular closet system native to the 3D application:
*   **Modular Mesh Attachment:** Apparel (shirts, shorts, sneakers) are separate `.glb` meshes rigged to the same skeleton. They are attached dynamically via Three.js `Scene.add()` to specific bone nodes (e.g., binding a watch to the `LeftWristBone`).
*   **Dynamic Wardrobe Toggles:** UI buttons (like the implemented "Apparel Simulation") allow hot-swapping arrays of outfits:
    *   *Anatomy/Analysis Mode:* "No Dress" (undergarments only) to expose pure physiological changes and muscle metrics.
    *   *Lifestyle Mode:* High-end athletic wear or formal wear to visualize how the "Desired Physique" alters clothing fit (e.g., wider shoulders filling out a tailored suit).

### Bio-Feedback Avatar Sync
The true power of the High-End Bitmoji in this app is that it is fundamentally linked to `userData.js`:
*   If sleep drops below 5 hours for three days, the facial materials system automatically blends in "dark circle" ambient occlusion maps under the user's eyes.
*   If body-fat drops from 18% to 12%, a shader actively increases normal-map intensity on the abdominal mesh to reveal six-pack definition without needing an entirely new asset.

---

## 6. Implementation Task List & Roadmap

### Stage 1: Asset Preparation & Sprite Viewer (Immediate Next Steps)
- [ ] **Task 1.1:** Generate the 109-frame photorealistic turnaround sequence for the **Current Status** (Skinny-fat, 182cm, 63kg).
- [ ] **Task 1.2:** Generate the 109-frame photorealistic turnaround sequence for the **Desired Status** (Greek God, 182cm, 82kg).
- [ ] **Task 1.3:** Build a React `Sprite3DViewer` component to replace the current static image. This component preloads the images and uses mouse-delta `(e.clientX)` to scrub through the 36 array frames horizontally, and `(e.clientY)` to switch rows.
- [ ] **Task 1.4:** Implement Web Worker pre-loading so the sequence loads silently in the background while the user reads the dashboard.

### Stage 2: 3D Asset Tooling
- [ ] **Task 2.1:** Utilize an external modeling framework (MakeHuman, CC4, or ReadyPlayerMe) to generate base `.glb` human meshes with extensive morph targets.
- [ ] **Task 2.2:** Bake photorealistic normal and displacement maps onto the low-poly models to simulate Unreal Engine tier lighting in standard Three.js/React-Three-Fiber.

### Stage 3: The Parametric Dashboard Interface (Completed)
- [x] **Task 3.1:** Create the "Character Creator" UI inside the `Body3D.jsx` tab. Build ranges and sliders linked to React State.
- [x] **Task 3.2:** Bind the React Sliders directly to WebGL geometries to visually morph the character model laterally and vertically matching user data.
- [x] **Task 3.3:** Add UI switches for Hair Style and Apparel visibility.

### Stage 4: Anatomical Translucency Engine (Zygote Scope)
- [ ] **Task 4.1:** Source and align four interlocking `.glb` files into the three.js group: Skin Mesh, Muscle Mesh, Skeleton Mesh, Organ Mesh.
- [ ] **Task 4.2:** Build a `BiomarkerDepthSlider` component. Wiring the slider output (0-100) to map opacity cross-fades. (e.g., 0-33 targets Skin opacity `1 -> 0`, 33-66 targets Muscle opacity `1 -> 0`).
- [ ] **Task 4.3:** Enable `Raycaster` intersections specifically on the internal organ meshes so clicking them opens the Assessment Action Plan for that specific medical flag.

### Stage 5: The High-End Bitmoji Implementation
- [ ] **Task 5.1:** Integrate a Facial SDK (e.g., Ready Player Me REST API) to securely upload a user selfie and pull down the hyper-personalized `.glb` facial mesh containing the user's likeness.
- [ ] **Task 5.2:** Architect the `WardrobeManager` class in Three.js, establishing a database of apparel meshes that dynamically scale according to the active `morphTargetInfluences`.
- [ ] **Task 5.3:** Build the Bio-Feedback Shader system, linking `userData.js` health metrics explicitly to facial texture blending (fatigue indicators) and body normal mapping (muscle definition).

---
*Note: Executing Stage 1 immediately provides the visual photorealism desired, while Stage 2 and 3 build the software foundation required for live parametric "Blender-like" adjustments.*
