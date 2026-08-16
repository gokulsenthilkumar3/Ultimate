# GrowthTrack Ultimate

GrowthTrack Ultimate is a minimal, high-density personal operations application that combines fitness tracking, a parametric 3D humanoid twin, finance, habits, tasks, and wellness into a single unified dashboard.

## 🚀 Core Features

- **Personal Operations Hub**: Track daily habits, sleep, nutrition, tasks, projects, and personal finances.
- **Parametric 3D Humanoid Twin**: View a live, interactive 3D model that reflects your body metrics, morph targets, and overall health status.
- **Dynamic Data Layer**: Uses Zustand with local storage persistence and a modular architecture for offline-ready, API-scalable state management.
- **High-Density UI**: A focused, dark-themed dashboard that stays fast and intuitive.

## 🧬 GLB Health & Blender Pipeline

The humanoid 3D twin relies on a `.glb` asset (`public/assets/models/humanoid-base.glb`). The asset is validated at runtime. If the model needs rebuilding or you're importing a new one, use the following validation pipeline:

- `npm run glb:health` — Checks the overall health and validation state of the `.glb` asset.
- `npm run glb:priority-fixes` — Outputs the current priority checklist for Blender.
- `npm run validate:glb` — Deep validates the model structure against application requirements.

> **Note:** For the exact Blender rebuild checklist, see [docs/BLENDER_PRIORITY_FIXES.md](./growthtrack-ultimate/docs/BLENDER_PRIORITY_FIXES.md).

## 🛠️ Quick Start

```bash
cd growthtrack-ultimate
npm install
npm run dev
```

## 🏗️ Architecture Stack

- **Frontend**: React 19, Vite, Tailwind/Vanilla CSS
- **3D Engine**: Three.js, React Three Fiber, React Three Drei
- **State**: Zustand (with persist middleware)
- **Data Vis**: Recharts

---
*GrowthTrack Ultimate — Your digital life, visualized.*
