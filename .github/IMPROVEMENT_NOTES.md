# Improvements2504.1 — Change Notes

> Branch created: 25 April 2026
> Base: `main` @ `67a12a9`

---

## 1. `ultimate/src/App.jsx` — TAB_MAP refactor

**Problem:** `renderTab()` was a long `switch` statement with 23 cases. Adding a new tab required editing a `switch` block, the `NAV_ITEMS` array, and the lazy import — three separate places.

**Fix:**
- Replaced `switch` with a `TAB_MAP` object (`{ tabId: (props) => <Component /> }`)
- O(1) lookup: `TAB_MAP[activeTab] ?? TAB_MAP['overview']`
- Adding a new tab now requires only: one `lazy()` import + one line in `TAB_MAP` + one entry in `NAV_ITEMS`

**Also fixed:**
- `palette` / `setPalette` were stored in `useLocalStorage` but never passed to tab components → now included in `tabProps` and forwarded to all tabs
- Applied `data-palette` attribute to `<html>` on palette change (mirrors the `data-theme` pattern)
- All 6 previously "ghost" tabs (`strength`, `hydration`, `mind`, `medical`, `analytics`, `settings`) added to `NAV_ITEMS` so they are reachable from the UI

---

## 2. `ultimate/package.json` — dependencies

- Added `framer-motion ^12.0.0` — required by Phase 2 CharacterCustomizer (staggered spring tweens) and general UI animation
- Added `lint:fix` script for quick auto-fix during development
- Added `type-check` script (tsc --noEmit) for future TypeScript migration readiness
- `lint` script now uses `--max-warnings 0` to enforce zero-warning policy in CI

---

## 3. `.github/workflows/deploy.yml` — CI improvements

| Before | After |
|--------|-------|
| Single `build` job (lint + build mixed) | Separate `lint` job → `build` job (parallel-ready, fail-fast) |
| No dependency caching | `cache: 'npm'` on both jobs (saves ~60–90s per run) |
| `npm install` | `npm ci` (reproducible, faster, correct for CI) |
| No lint step in CI | ESLint runs before build; build is skipped if lint fails |

---

## 4. `ultimate/src/store/userStore.js` — documentation & computed helpers

- Added JSDoc comments to all exported actions and computed getters
- Clarified offline-first fallback behaviour in module-level comment
- `removeFromArray` simplified: now always filters by `.id` (removed ambiguous index-based branch)
- Added `getTDEE()` computed getter: estimates Total Daily Energy Expenditure using Mifflin-St Jeor formula × 1.55 activity factor — useful for the Nutrition tab
- Version bumped to `2.1.0` in `DEFAULT_USER._version`

---

## Roadmap reminders (not in this PR)

- [ ] v2.1: REST API backend (Node/Express + Supabase)
- [ ] v2.2: AI Coach via Claude API
- [ ] v2.3: Photorealistic 360° Parametric Engine (Three.js / R3F)
- [ ] v3.0: React Native mobile app
