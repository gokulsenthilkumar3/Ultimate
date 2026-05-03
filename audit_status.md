# GrowthTrack Audit Status
> Claude.md § completion tracker — updated 2026-05-03

## ✅ Done (This + Prior Sessions)

| § | Item | Notes |
|---|---|---|
| 1.1 | Delete `dashboard-app/` | Removed, README updated |
| 1.2 | Retire `userData.js` | API/Zustand is primary; file kept as seed only |
| 1.3 | Document `server/` folder | Backend running on port 3001 |
| 2.1 | Onboarding wizard | `OnboardingWizard.jsx` wired in `App.jsx` |
| 2.2 | Health score ring in header | `HealthScoreRing.jsx` mounted in `Header.jsx` |
| 2.3 | Command palette (Ctrl+K) | `CommandPalette.jsx` at root level |
| 2.5 | Streak contribution grid | `ContributionGrid.jsx` in `Lifestyle.jsx` |
| 2.6 | Dark / AMOLED / Light theme | 3-way cycle in `Header.jsx` + `index.css` |
| 2.7 | Animated number transitions | `AnimatedNumber.jsx`, used in `Overview.jsx` |
| 2.9 | Toast / snackbar system | Custom `useToast` hook throughout |
| 2.10 | Tab empty states | `EmptyState.jsx` in Tasks, Training, Entertainment, GoalsDashboard |
| 3.2 | Daily check-in modal | `DailyCheckIn.jsx` wired, fires once per day |
| 3.9 | SIP calculator | `SIPCalculator.jsx` built — **needs Finance.jsx integration** |
| 5.7 | Error boundaries | `ErrorBoundary.jsx` exists |

---

## 🔴 P0 — Critical / High Impact

| § | Item | Effort | Notes |
|---|---|---|---|
| 1.4 | Group 17 tabs into 5 categories (sidebar grouping) | Low | Flat nav still exists |
| 1.5 | Move About → Settings modal | Low | Gear icon + `SettingsModal.jsx` |
| 5.1 | Code-split `App.jsx` with `React.lazy` | Low | All imports are static right now |

---

## 🟠 P1 — High Value, Do Next

| § | Item | Effort | Notes |
|---|---|---|---|
| 2.4 | Inline click-to-edit metric cards | Medium | Double-click to edit in Overview/Blueprint |
| 2.8 | PWA manifest + service worker | Low | `public/manifest.json` + `vite-plugin-pwa` |
| 2.11 | Mobile bottom navigation bar | Low | `BottomNavBar.jsx` at 768px breakpoint |
| 3.1 | AI Coach tab (Claude API) | Medium | New tab, stream responses, inject Zustand context |
| 3.3 | Smart goal progress projections | Low | Linear regression on goal data, dashed trend line |
| 3.5 | Workout timer / active session mode | Medium | `WorkoutSession.jsx` full-screen overlay |
| 3.9 | **Wire SIPCalculator into Finance.jsx** | Low | Already built, just needs mounting |
| 6.2 | Replace BoxGeometry with Soldier.glb | Low | Drop-in swap in `Body3D.jsx` |
| 6.3 | GPU tier detection before canvas | Low | `detect-gpu` npm package |

---

## 🟡 P2 — Medium Value

| § | Item | Effort | Notes |
|---|---|---|---|
| 3.4 | Export PDF / branded image | Medium | `html2canvas` + `jsPDF` |
| 3.6 | Nutrition barcode scanner | Medium | `BarcodeDetector` API + Open Food Facts |
| 3.7 | Unified calendar view | High | Already has `Calendar.jsx` — needs cross-module merge |
| 3.8 | Push notification reminders | Medium | ServiceWorker + PushManager |
| 3.10 | Skills tab: link resources + XP levels | Low | Add `resources[]` array to skills |
| 4.4 | Open Food Facts search in Nutrition | Low | Add search field with debounced API |
| 4.6 | TMDB API for Entertainment | Low | Poster grid, streaming providers |
| 4.7 | ExerciseDB GIFs in Training | Low | Show form GIFs in WorkoutSession |
| 6.5 | `MeshReflectorMaterial` floor | Low | 3 lines in `Body3D.jsx` |
| 6.6 | Studio lighting rig (4-light) | Low | Replace flat lighting in `Body3D.jsx` |

---

## 🔵 P3 — Architecture / Later

| § | Item | Effort |
|---|---|---|
| 4.1 | Supabase backend (replace localStorage persist) | High |
| 4.2 | Google Fit / Health Connect | High |
| 4.3 | Zerodha Kite Connect API | High |
| 4.5 | Whoop / Garmin webhooks | High |
| 5.1 | React.lazy code-splitting | Low |
| 5.2 | TypeScript migration (incremental) | High |
| 5.3 | Vitest unit tests | Medium |
| 5.4 | Typed API config module | Low |
| 5.5 | ESLint + Prettier + Husky | Low |
| 5.6 | Split Zustand into domain slices | Medium |
| 6.4 | Ready Player Me face avatar | Medium |
| 6.7 | Leva debug panel | Low |
| 6.8 | Anatomical peel opacity lerp | Medium |
| 4.8 | Sentry error monitoring | Low |

---

## ⚡ Immediate Next Actions (suggested order)

1. **Wire `SIPCalculator` into `Finance.jsx`** — already built, 5 min
2. **`React.lazy` code-split `App.jsx`** — biggest perf win, low effort
3. **PWA manifest** — `public/manifest.json` + icons, free quality signal
4. **Mobile bottom nav bar** — `BottomNavBar.jsx` with 5 group icons
5. **AI Coach tab** — biggest differentiator, inject Zustand context into Claude API
