# GrowthTrack Ultimate — Full Improvement & Fix Audit
*Generated: 2026-05-03 | Branch: Improvements-2605.2*

---

## 🔴 CRITICAL — Bugs / Data Loss Risks

| # | File | Issue | Impact |
|---|------|--------|--------|
| C1 | `useStore.js` | `isLoading` and `serverStatus` are in the **persist** block — they'll be stale on reload (`isLoading: true` saved to localStorage) | App may show loading state permanently |
| C2 | `useStore.js` | `migrate()` references `USER` constant that no longer exists → crashes on first load from old localStorage | New users / cleared cache get a JS error |
| C3 | `Finance.jsx` | Subscriptions are **hardcoded** `useState` array — changes are lost on refresh | Data persistence broken |
| C4 | `Progress.jsx` | `TransformationPredictor` receives `logs` but old component may expect `useLocalStorage` format | Crash risk if logs are empty |
| C5 | `server/index.js` | `/api/user_profile` uses `id=1` singleton but `/api/tasks` is a multi-row table — no user isolation | All users share same data (single-tenant assumption never documented) |
| C6 | `Tasks.jsx` | `selectReopenTask` / `selectUpdateTask` imported but these only exist if `useStore.js` export was updated — needs version check | Runtime crash if store version mismatch |
| C7 | `Physique.jsx` | Calls `setActiveTab` which is not defined in that component scope | Runtime crash when clicking zones |
| C8 | `store/useStore.js` | Finance `addTransaction` uses `apiSync('/finance', ...)` but the server's `finance` table uses `id TEXT` while `Date.now().toString()` generates a numeric string — OK in SQLite but inconsistent | Silent failures on duplicate inserts |

---

## 🟠 HIGH — Functional Gaps / Broken Features

| # | Component | Issue |
|---|-----------|-------|
| H1 | `Current.jsx` | Completely local state only — no store, no DB. News is **hardcoded**. Should fetch from a news API (e.g., NewsAPI.org) |
| H2 | `Documents.jsx` | Has hardcoded document entries (`id: 1, 2, 3…`). No CRUD, no upload |
| H3 | `Notes.jsx` | No store connection — notes lost on refresh. No DB table for notes |
| H4 | `GoalsDashboard.jsx` | Local state only — goals reset on every page reload |
| H5 | `SleepDashboard.jsx` | Local state only — sleep logs not persisted |
| H6 | `Lifestyle.jsx` | Habit tracker runs on local state — streaks reset on reload |
| H7 | `Training.jsx` | Exercise logs are local state — no DB persistence |
| H8 | `Analytics.jsx` | Hardcoded chart data — not reading from `metric_logs` or real sessions |
| H9 | `MindWellness.jsx` | No store — mood/journal entries lost |
| H10 | `Projects.jsx` | Project list is local state only — no persistence |
| H11 | `Portfolio.jsx` | Local state — not reading from any store or API |
| H12 | `Maps.jsx` | 33 lines — placeholder only, no map integration |
| H13 | `server/index.js` | `PUT /api/tasks/:id` only updates `done`, `completedAt`, `lastDone` — title/priority/tag edits via `updateTask()` are silently ignored by server |
| H14 | `server/index.js` | No `PUT /api/timesheet/:id` — can't edit session name/duration after saving |
| H15 | `useStore.js` | `fetchInitialData` fetches `/finance` but the singleton table route would conflict — needs the new dedicated `/api/finance` route verified |
| H16 | `Finance.jsx` | Budget tab exists in UI but `addBudget` / `deleteBudget` actions not connected to the Finance component yet |
| H17 | `Databases.jsx` | SQL compiler allows any query including `DROP TABLE` — no query sanitization or whitelist |
| H18 | `About.jsx` | Shows server logs but fetches from hardcoded `localhost:3001` — no environment variable |

---

## 🟡 MEDIUM — UX / Missing Features

| # | Area | Issue |
|---|------|-------|
| M1 | **Global** | No keyboard shortcuts (e.g., `Ctrl+K` command palette, `N` for new item) |
| M2 | **Global** | No confirmation dialog for destructive actions (delete task, delete transaction, clear logs) — currently just silently deletes |
| M3 | **Tasks** | No drag-and-drop between Kanban columns — cards can't be manually repositioned |
| M4 | **Tasks** | No subtasks / checklists within a task card |
| M5 | **Tasks** | No bulk actions (select all, delete selected, mark all done) |
| M6 | **Finance** | Budget vs. Actual comparison chart not implemented — UI shows budgets but no visual alert when over budget |
| M7 | **Finance** | CSV import for bank statements is placeholder — no actual file parsing logic |
| M8 | **Finance** | No monthly trend chart showing income vs expenses over 6–12 months |
| M9 | **Timesheet** | No weekly/daily breakdown chart of time spent per task category |
| M10 | **Timesheet** | No ability to edit task name or duration after a session is saved |
| M11 | **Overview** | Weather data is hardcoded (`24°C`, `62%`, etc.) — should use OpenWeather API |
| M12 | **Overview** | Sunrise/Sunset times are hardcoded — should use geolocation + astronomy API |
| M13 | **Overview** | Water tracker resets on page reload (component local state, not persisted) |
| M14 | **Skills** | Saving skills calls fetch directly — doesn't use `apiSync` utility, bypasses error handling |
| M15 | **Health+** | Senses detail view (eyes power, hearing etc.) mentioned in requirements but not fully implemented |
| M16 | **Progress** | Charts use mock velocity data — not derived from actual `metric_logs` entries |
| M17 | **Nutrition** | Meal log entries are local state — not persisted |
| M18 | **Sleep** | Sleep graph doesn't read from `metric_logs.sleep` field |
| M19 | **Shopping** | No quantity field on shopping items |
| M20 | **Shopping** | No price total / budget view |
| M21 | **Calendar** | No sync with real calendar (Google Calendar API) |
| M22 | **Navigation** | Tab order reordering (drag-and-drop) mentioned in requirements but not implemented |
| M23 | **AppLauncher** | Pinned tabs state doesn't persist correctly across sessions (persisted in Zustand but `pinnedTabs` array order resets) |

---

## 🔵 LOW — Design / Polish

| # | Area | Issue |
|---|------|-------|
| L1 | **Global** | `glass-card:hover` applies `transform: translateY(-2px)` to ALL cards including containers — causes layout shifts on some pages |
| L2 | **Global** | Dark mode has a flash on first load before theme is applied (FOUC) |
| L3 | **Global** | `btn-primary` border-radius is overridden twice (index.css + premium.css) — one `!important` overrides the other inconsistently |
| L4 | **Navigation** | Nav bar mask gradient (fade edges) cuts off tab labels too aggressively on mobile |
| L5 | **Overview** | Hero section text too large on mobile (<480px) — 3rem heading overflows |
| L6 | **Header** | Server status pill (top-right) overlaps with OS window controls on some browsers |
| L7 | **Finance** | Month picker input color doesn't match theme on light mode |
| L8 | **Tasks** | Kanban columns have fixed `flex: 1 0 320px` — on large screens they don't expand to fill space |
| L9 | **Timesheet** | SVG ring animation flickers on first render (stroke-dashoffset jumps) |
| L10 | **Databases** | SQL output table has no max-height — very large query results overflow the page |
| L11 | **Skills** | Range slider thumb styling broken on Firefox (only Chrome/Safari webkit is styled) |
| L12 | **light mode** | Multiple components with hardcoded `rgba(255,255,255,0.04)` backgrounds look invisible in light mode |
| L13 | **Global** | `@keyframes pulse` referenced in App.jsx server status dot but not defined in CSS |
| L14 | **Progress** | `TransformationPredictor` module has no loading state — shows empty on first render |

---

## ⚙️ Infrastructure / Architecture

| # | Area | Issue |
|---|------|-------|
| I1 | **Server** | No input validation middleware (e.g., `express-validator`) — all `req.body` fields trusted directly |
| I2 | **Server** | No rate limiting — SQL compiler endpoint (`/api/query`) can be abused |
| I3 | **Server** | `tracker.db` committed to git — binary file, grows with each commit, should be in `.gitignore` |
| I4 | **Server** | No environment variable for `PORT` — hardcoded `3001` |
| I5 | **Server** | No health endpoint `/api/health` — `checkServerHealth()` pings `/api/logs` which returns all audit data |
| I6 | **Frontend** | `API_BASE` is hardcoded `http://localhost:3001/api` — no `.env` variable |
| I7 | **Frontend** | No service worker / offline mode — app completely breaks without server |
| I8 | **Build** | No `vite.config.js` proxy configured — CORS will fail in production deployment |
| I9 | **Store** | Zustand `version: 3` but migration logic references deleted `USER` constant — will throw on version bump |
| I10 | **Store** | `persist` middleware persists ALL state including arrays — localStorage can hit 5MB quota with enough metric_logs |

---

## 📊 Summary by Priority

| Priority | Count | Estimated Effort |
|----------|-------|-----------------|
| 🔴 Critical (C1–C8) | 8 | 1–2 hours |
| 🟠 High (H1–H18) | 18 | 4–6 hours |
| 🟡 Medium (M1–M23) | 23 | 6–10 hours |
| 🔵 Low (L1–L14) | 14 | 2–3 hours |
| ⚙️ Infrastructure (I1–I10) | 10 | 2–4 hours |
| **Total** | **73** | **~15–25 hours** |

---

## 🎯 Recommended Fix Order

**Phase 1 — Stability (Do First)**
1. Fix `C2` (migrate crash), `C7` (Physique setActiveTab crash), `C1` (persist stale state)
2. Fix `H13` (server PUT tasks ignoring title edits)  
3. Add `/api/health` endpoint → fix `I5`
4. Add `@keyframes pulse` to CSS → fix `L13`

**Phase 2 — Data Persistence**
5. Wire `Notes`, `GoalsDashboard`, `SleepDashboard`, `Lifestyle` to store + DB
6. Connect Budget UI to `addBudget` / `deleteBudget` actions
7. Fix `Analytics` to read from real `metric_logs`

**Phase 3 — Features**
8. Real weather API (OpenWeather) for Overview widgets
9. Drag-and-drop Kanban (react-dnd or dnd-kit)
10. Budget vs. Actual charts in Finance
11. Notes persistence (add `notes` table to server)

**Phase 4 — Polish & Security**
12. Server input validation middleware
13. Protect SQL compiler endpoint
14. Remove `tracker.db` from git history
15. Light mode contrast fixes
16. Mobile responsive fixes
