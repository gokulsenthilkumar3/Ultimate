# GrowthTrack Ultimate: System Architecture & Documentation

## Overview
GrowthTrack Ultimate is a comprehensive, client-side React dashboard designed to systematically track and optimize user health, physique, fitness, and lifestyle. This application unifies multiple isolated data sources (formerly raw text logs and individual component files) into a single, cohesive, highly animated, and data-persistent "Glassmorphism" interface.

## Historical File Consolidation
The current architecture was formed by consolidating the following deprecated legacy files:

1. **`claude.txt` & `deepseek.txt`**: Served as the foundational raw data repositories containing 11 rounds of comprehensive health assessments, body measurements, dietary guidelines, and physical enlargement (PE) training routines. All health flags, sleep deprivation notes, and measurement goals were parsed from these logs.
2. **`pe-dashboard.jsx`**: An early prototype focusing strictly on the PE routines and manual exercises. 
3. **`growthtrack-dashboard.jsx` & `growthtrack-pro.jsx`**: Preliminary, disjointed React component files that attempted to map out health metrics. 

**Note:** The above files have been successfully integrated into a unified state within the new application structure and subsequently removed from the disk to enforce a single source of truth.

## Current Software Dashboard UI & Architecture
The modern application resides entirely within the `growthtrack-ultimate` directory (a Vite + React architecture) using the following features and technical standards:

### 1. Technology Stack
*   **Framework:** React 18 (Vite build system)
*   **Styling:** Custom implementation of "Glassmorphism" using Vanilla CSS (`index.css`) with heavy utilization of CSS variables. Avoids standard utility frameworks to maintain a strictly bespoke, premium look.
*   **Data Visualization:** Recharts for progressive chart rendering (Line and Radar charts).
*   **3D Rendering:** Three.js (`react-three-fiber`) for the interactive human anatomy model.
*   **State & Persistence:** Custom React Hooks leveraging the browser's `localStorage` API to permanently save user configurations, themes, and historical metric logs across sessions.

### 2. Core Modules & Dashboards
The dashboard is split into distinct, hyper-focused "Tabs" to prevent information overload, utilizing punchy bullet points, action items, and metric indicators over lengthy paragraphs.

*   **🏠 Overview:** The main hub displaying the Overall Health Score, a spider-web Radar Chart of body systems, and Critical Alerts (e.g., severe sleep deprivation warnings).
*   **📋 Assessment & 🩸 Medical:** Actionable, prioritized checklists of health deficits. Tracks clinical blood panels (Total/Free Testosterone, LFTs) and necessary physician consultations.
*   **🧍 3D Body Representation:** An interactive, manipulable 3D representation modeled specifically after the user's current 182cm/63kg proportions. Includes organ X-ray modes and direct mapping of pain/health flags to physical body parts.
*   **🏛️ Physique & 🏋️ Training:** Compares current measurements to "Greek God" golden ratio ideals. Outlines the specific Push/Pull/Legs training split necessary to achieve these ratios.
*   **📏 PE Library & 📈 Progress Logs:** A structured, step-by-step execution plan for manual exercises, coupled with a data table and Line Chart visualizer to track fractional inches gained over a 24-week timeline.
*   **🌱 Lifestyle & 🧠 Mental:** A core optimization engine addressing the foundational triggers of poor progress (caffeine abuse, high cortisol, brain fog, 5-6 hour sleep cycles). Features actionable mind habits and daily routine checklists instead of heavy text blocks.

### 3. UI/UX Design System
The interface operates on a premium, highly responsive design matrix:
*   **Theming Engine:** Supports dynamic toggling between Dark/Light modes alongside 5 customized color palettes (Gold, Ocean, Violet, Rose, Mint).
*   **Micro-Animations:** Employs stagger-entrance animations on cards, pulse-glows on actionable alerts, and seamless layout transitions.
*   **Data Presentation:** Complex medical data is distilled into "Goal/Current/Action" sub-arrays alongside colored `CRITICAL` or `WARNING` priority badges. Navigation bars seamlessly wrap into centered arrays to eliminate vertical or horizontal scrolling strain.

---

# GrowthTrack Ultimate: Phases 4 & 5 Roadmap

## Phase 4: Personal Digital Twin & Bio-Feedback
**Goal**: Transition from a generic model to a personalized avatar with real-time biological feedback visualization.

### 4.1 Bio-Feedback Face Shader
- **Logic**: Add a `uStress` uniform to the skin material.
- **Visual**: Higher stress values shift the face/neck vertex colors toward a flushed red with subtle pulse animation.
- **Mapping**: Bind this to the "Stress Level" or "Heart Rate" metric in `userData.js`.

### 4.2 Bitmoji / Facial Likeness
- **Architecture**: Create a `FaceTextureLoader` that overlays the user's face texture onto the `head` bone of the GLB.

## Phase 5: Wardrobe Manager (V-Taper Apparel)
**Goal**: High-fidelity clothing simulation that respects parametric body morphs.

### 5.1 Bone-Bound Clothing
- **System**: Toggle `visible` state on specific GLB meshes (Gym, Formal, Casual).
- **Morph Sync**: Ensure clothing meshes share the same `morphTargetInfluences` as the body mesh to prevent clipping.

### 5.2 Dynamic Delta Visualization
- **Logic**: Implement a "Growth Delta" shader (Green for gain, Red for loss) comparing Current vs Goal volumes.
