# ⚡ ULTIMATE — GrowthTrack Digital Twin Engine v2.0

> **Branch:** `restructure` — [Live Demo](https://gokulsenthilkumar3.github.io/Ultimate/) | [Release Notes](./RELEASE_NOTES.md) | [Features](./feature.md)

A next-generation personal dashboard combining fitness tracking, body visualization, finance, entertainment, tasks, and wellness — all in one React + Vite application with a fully dynamic data layer.

---

## 🚀 What's New in v2.0 (Restructure)

| Change | Details |
|--------|---------|
| **Folder Consolidation** | `growthtrack-ultimate/` renamed to `ultimate/`; `dashboard-app/` fully merged in |
| **Dynamic Data** | Replaced hardcoded `userData.js` with Zustand `userStore.js` — editable via UI, saved to localStorage, API-sync ready |
| **Info/About Page** | New `Info.jsx` tab showing current branch, version, deploy env, API health, version history |
| **New Components** | `EditableMetric.jsx`, `BodyPartOverlay.jsx`, upgraded `Body3D.jsx`, `metricsWorker.js` |
| **Deploy Workflow** | CI now builds from `ultimate/`, triggers on `main` + `restructure` branches |
| **Documentation** | All MD files consolidated in `feature.md`; `RELEASE_NOTES.md` added |

---

## 📁 Project Structure

```
Ultimate/
├── ultimate/                    # 🎯 Main application (v2.0)
│   ├── src/
│   │   ├── components/          # 24+ React components
│   │   │   ├── Info.jsx         # 🆕 About/Info page
│   │   │   ├── Body3D.jsx       # 3D body viewer (upgraded)
│   │   │   ├── EditableMetric.jsx
│   │   │   ├── BodyPartOverlay.jsx
│   │   │   └── [18 more tabs...]
│   │   ├── store/
│   │   │   ├── userStore.js     # 🔄 Dynamic Zustand store (replaces userData.js)
│   │   │   └── useStore.js      # Dashboard-app store
│   │   ├── workers/
│   │   │   ├── metricsWorker.js
│   │   │   └── sprite-preloader.worker.js
│   │   ├── data/
│   │   │   └── userData.js      # Legacy seed reference (deprecated)
│   │   ├── hooks/useLocalStorage.js
│   │   ├── App.jsx          # Root app with all tabs
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json       # v2.0.0
│   └── vite.config.js     # base: '/Ultimate/'
├── .github/workflows/
│   └── deploy.yml         # Builds from ultimate/, triggers on main+restructure
├── README.md
├── RELEASE_NOTES.md
└── feature.md             # All feature docs consolidated
```

---

## 📊 Dashboard Tabs

| Tab | Status | Description |
|-----|--------|-------------|
| Overview | ✅ Live | BMI, body fat%, muscle mass, health score |
| 3D Model (LIVE) | ✅ Live | Canvas-based 3D humanoid viewer |
| Blueprint | ✅ Live | Body measurements & physique map |
| Assessment | ✅ Live | Body composition assessment |
| Training | ✅ Live | Workout program & schedule |
| Nutrition | ✅ Live | Macro tracker & meal plan |
| Sleep | ✅ Live | Sleep debt, bedtime patterns |
| Lifestyle | ✅ Live | Daily habits tracker |
| Progress | ✅ Live | Weight, BF%, muscle over time |
| Goals | ✅ Live | Goal milestone & habit streaks |
| Skills | ✅ Live | Skill matrix & learning roadmap |
| Health+ | ✅ Live | Supplements, vitals, doctor visits |
| Shopping | ✅ Live | Wishlist, budget, purchase history |
| Tasks | ✅ Live | Daily tasks with priorities & due dates |
| Finance | ✅ Live | Portfolio, SIP, Zerodha, expenses |
| Entertainment | ✅ Live | Watchlist, OTT tracker, series log |
| About | ✅ Live | Branch, version, API health, release info |

---

## 🔄 Dynamic Data Architecture

```
UI Components
     ↓ useUserStore() hook
Zustand Store (userStore.js)
     ↓ persist middleware
localStorage   ↔   REST API (VITE_API_BASE)
                        ↓
               Database (PostgreSQL / Supabase)
```

- **No hardcoded data** — all fields editable via UI
- **localStorage persistence** — works offline, zero setup
- **API-ready** — set `VITE_API_BASE` to sync with a backend
- **Full CRUD** — `updateField()`, `updateSection()`, `addToArray()`, `removeFromArray()`

---

## 🛠️ Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| Vite | 5 | Build tool + dev server |
| Zustand | 5 | Global state + persistence |
| Recharts | 2.12 | Charts & analytics |
| CSS Variables | — | Theming (dark/light + palettes) |

---

## ⚙️ Environment Variables

```env
# .env (optional)
VITE_API_BASE=https://your-api.com/api   # Backend REST API base URL
VITE_BRANCH=restructure                   # Injected automatically by CI
```

---

## 📦 Getting Started

```bash
# Clone
git clone https://github.com/gokulsenthilkumar3/Ultimate.git
cd Ultimate/ultimate

# Install
npm install

# Dev server
npm run dev

# Build for production
npm run build
```

---

## 📍 Roadmap

| Version | Target | Description |
|---------|--------|-------------|
| v2.1 | Q2 2026 | REST API backend (Node/Express + PostgreSQL/Supabase) |
| v2.2 | Q3 2026 | AI coach (Claude API) — personalized workout & diet |
| v2.3 | Q3 2026 | Photoreal 360° Parametric Engine (Three.js / R3F) |
| v3.0 | Q4 2026 | Mobile app (React Native / Expo) |

---

*Built with ❤️ by [gokulsenthilkumar3](https://github.com/gokulsenthilkumar3) — April 2026*

<!-- Improvements2504.2 deployment trigger -->
