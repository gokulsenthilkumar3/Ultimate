# Changelog

All notable changes to **Ultimate — GrowthTrack Digital Twin Engine** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — TerraUltimateonJul7-2026 branch

### Added
- `scripts/` folder for one-off migration utilities
- `docs/` folder consolidating all project documentation
- `CHANGELOG.md` for formal version tracking
- Error Boundary guidance added to `docs/ARCHITECTURE.md`
- Zustand store versioning guidance added

### Fixed
- `.gitignore` now excludes `.vite/`, `playwright-report/`, `test-results/`, `Claude.md`

### Removed
- `b5d6aee_*` orphaned backup components from `growthtrack-ultimate/` root
- Redundant `pin.js` debug file
- Phase-specific MD files moved to `docs/archive/`

---

## [2.0.0] — April 2026 (restructure branch)

### Added
- `Info.jsx` — About/Info page showing branch, version, API health
- `EditableMetric.jsx` — Inline editable metric component
- `BodyPartOverlay.jsx` — Body part overlay for 3D viewer
- `metricsWorker.js` — Web worker for heavy metric calculations
- `sprite-preloader.worker.js` — Asset preloading worker
- Zustand `userStore.js` with `persist` middleware (localStorage + API-ready)
- Full CRUD: `updateField()`, `updateSection()`, `addToArray()`, `removeFromArray()`
- CI/CD deploys from `growthtrack-ultimate/`, triggers on `main` + `restructure`

### Changed
- `dashboard-app/` fully merged into `growthtrack-ultimate/`
- Hardcoded `userData.js` replaced with dynamic Zustand store
- `Body3D.jsx` upgraded to canvas-based 3D humanoid viewer
- All docs consolidated into `feature.md` + `RELEASE_NOTES.md`

### Removed
- Legacy `dashboard-app/` folder
- Hardcoded static `userData.js` as primary data source

---

## [1.0.0] — Initial Release

- Initial GrowthTrack personal dashboard
- Basic tabs: Overview, Training, Nutrition, Sleep, Finance, Entertainment
- Static data layer via `userData.js`
