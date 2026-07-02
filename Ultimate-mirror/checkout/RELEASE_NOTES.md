# RELEASE NOTES — Ultimate Dashboard

> **Repository:** gokulsenthilkumar3/Ultimate
> **Branch:** restructure
> **Last Updated:** April 2026

---

## Branch Overview

| Branch | Status | Description |
|--------|--------|-------------|
| `main` | ✅ Stable | Production-ready baseline |
| `restructure` | 🚀 Active | Full restructure: dynamic data, Info page, folder merge |
| `improvement7` | 🔀 Merged | Entertainment, Finance, Shopping, Tasks tabs |
| `improvement8` | 🔀 Merged | BodyPartOverlay, EditableMetric, useStore |
| `feature/photoreal-360` | 📋 Planned | Photorealistic 360° Parametric Human Engine |

---

## v2.0.0 — Restructure Release *(April 2026)*

### Summary
Major architectural overhaul. All source code consolidated under `ultimate/` (renamed from `growthtrack-ultimate`), `dashboard-app` merged in. Data layer replaced with fully dynamic Zustand store. New Info/About page added.

### What's New
- **Folder Consolidation:** `growthtrack-ultimate/` renamed to `ultimate/`; all `dashboard-app/` components, store, workers merged under one roof
- **Dynamic Data Architecture:** Replaced hardcoded `userData.js` with `userStore.js` — Zustand + localStorage persistence, API-sync ready
- **Info Page (`Info.jsx`):** In-app About page showing current branch, version, deploy environment, API health, branch status table
- **New Components from dashboard-app:** `EditableMetric.jsx`, `BodyPartOverlay.jsx`, `BodyPartOverlay.css`, upgraded `Body3D.jsx`
- **New Store:** `useStore.js` from dashboard-app merged into `ultimate/src/store/`
- **New Worker:** `metricsWorker.js` added to `ultimate/src/workers/`
- **Documentation:** All `.md` files consolidated into `feature.md`; new `RELEASE_NOTES.md` added
- **Deploy Workflow:** Updated to build from `ultimate/` instead of `growthtrack-ultimate/`
- **README:** Fully rephrased with updated stack, dynamic data flow diagram, feature table, env vars

### Breaking Changes
- `userData.js` is deprecated — data now lives in Zustand store with localStorage
- Import path changed from `growthtrack-ultimate/src/...` to `ultimate/src/...`
- Deploy workflow now points to `ultimate/` directory

---

## v1.8.0 — Improvement 8 *(March 2026)*

### What's New
- **BodyPartOverlay component** — clickable SVG overlay on humanoid model for muscle-group targeting
- **EditableMetric component** — inline-editable metric cards across dashboard
- **useStore.js (dashboard-app)** — lightweight Zustand store for dashboard-app prototype
- **metricsWorker.js** — Web Worker for off-thread metric computation

---

## v1.7.0 — Improvement 7 *(February 2026)*

### What's New
- **Entertainment tab** — Watchlist, ongoing series, OTT tracker with genre tagging
- **Finance tab** — Portfolio overview, SIP tracker, Zerodha holdings, expense categories
- **Shopping tab** — Wishlist, product research queue, purchase history, budget tracker
- **Tasks tab** — Daily task manager with priorities, due dates, completion tracking
- **Health+ (HealthExtras) tab** — Supplements, doctor visits, vitals log
- Navigation pill updated with all new tabs

---

## v1.6.0 — Improvement 6 *(January 2026)*

### What's New
- **Analytics tab** — Performance radar chart, score breakdown, trend analysis
- **Skills tab** — Skill matrix with proficiency bars and learning roadmap
- **GoalsDashboard** — Milestone timeline, habit streak tracker
- **StrengthMetrics** — Lift PRs, progressive overload tracking
- **HydrationTracker** — Daily water intake log with reminder system
- **MindWellness** — Mood journal, meditation streak, stress score

---

## v1.5.0 — Sprite 3D Viewer *(December 2025)*

### What's New
- **Sprite3DViewer.jsx** — Hemispherical 360° body viewer using pre-rendered WebP sprite sequences
- **Web Worker preloading** — `sprite-preloader.worker.js` silently preloads 109 images after page load
- **Dual Model mode** — Toggle between Current Body and Goal Body; split-screen comparison mode
- **Canvas rendering** — Zero DOM image elements, smooth 60fps scrub
- **8K Magnifying Glass loupe** — Double-click activates high-res zoom overlay

---

## v1.0.0 — Initial Launch *(November 2025)*

### What's New
- **Overview dashboard** — BMI, body fat %, muscle mass cards
- **Assessment tab** — Body composition assessment tool
- **Physique Blueprint** — Measurement input with visual body map
- **Training tab** — Workout plan display
- **Nutrition tab** — Macro tracker
- **SleepDashboard** — Sleep debt calculator, bedtime/wake chart
- **Lifestyle tab** — Daily habits log
- **Progress tab** — Weight, BF%, muscle mass over time chart
- **Medical tab** — Medical history, allergies, medications
- **HumanoidViewer** — First-gen 3D humanoid canvas
- **Header + Navigation** — Floating pill nav with dark/light theme
- **localStorage persistence** via `useLocalStorage` hook

---

## Roadmap

| Version | Target | Features |
|---------|--------|----------|
| v2.1.0 | Q2 2026 | REST API backend (Node/Express), DB integration (PostgreSQL/Supabase), full CRUD via API |
| v2.2.0 | Q3 2026 | AI coach integration (Claude API), personalized workout/diet recommendations |
| v2.3.0 | Q3 2026 | Photoreal 360° Parametric Human Engine — Three.js/R3F GLB morph targets |
| v3.0.0 | Q4 2026 | Mobile app (React Native / Expo), offline sync, push notifications |

---

*Generated automatically during restructure — April 2026*
