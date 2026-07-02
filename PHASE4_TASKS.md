# Phase 4 — Master Task Tracker (81 Pending Tasks)

> Last updated: 2026-07-02
> Status: 76 / 81 complete — **Phase 5 additions included**

---

## 4A — Server + Schema (19 tasks)

### New API Endpoints
- [x] `POST /api/hydration/log` — timestamped 24h hydration logging
- [x] `GET /api/nutrition_logs` — fetch per-meal nutrition logs
- [x] `POST /api/nutrition_logs` — add nutrition log entry
- [x] `DELETE /api/nutrition_logs/:id` — remove nutrition log entry
- [x] `GET /api/audit_log` — fetch CRUD audit trail
- [x] `POST /api/audit_log` — write CRUD audit entry
- [x] `GET /api/progress_photos` — fetch progress photo records
- [x] `POST /api/progress_photos` — upload progress photo record
- [x] `DELETE /api/progress_photos/:id` — delete progress photo
- [x] `GET /api/goal_progress_logs` — fetch goal progress entries
- [x] `POST /api/goal_progress_logs` — log goal progress
- [x] `POST /api/finance/import/csv` — bulk import finance entries from CSV
- [x] `PUT /api/finance/:id` — update a finance entry
- [x] `PUT /api/budgets/:id` — update a budget entry
- [x] **SECURITY** `SELECT`-only guard on `/api/query` — block non-SELECT statements

### Schema Migrations
- [x] New table: `nutrition_logs` (meal, macros, timestamp)
- [x] New table: `audit_log` (module, action, user, timestamp)
- [x] New table: `progress_photos` (url, date, notes)
- [x] New table: `goal_progress_logs` (goal_id, value, date)
- [x] Schema: `finance.method` field, add `investment` to `finance.type`, change `finance.date` → `DATE`
- [x] Schema: `shopping.quantity`, add `urgent` priority level, `tasks.description`, `tasks.parent_task_id`
- [x] Schema: `documents.size` → `BIGINT`, `goals.deadline` → `DATE`, `skills` normalized rows
- [ ] Export filename with date suffix (e.g. `export_2026-05-10.csv`)

> ⚠️ **Do 4A first** — most other sub-phases depend on these tables and routes.

---

## 4B — Health Stack UI (12 tasks)

### Bug Fixes
- [x] **BUG-01** HDRI fix → change to `Environment preset="studio"` in humanoid viewer ✅ already done
- [x] **BUG-07** Remove `activeTab` from Zustand persist to fix stale tab state ✅ already not persisted
- [x] **BUG-09** Overview: user name shows "Operator" → now uses `user.name || user.username || '—'`
- [x] **BUG-11** Overview: health score computed dynamically from real metric_logs ✅ already dynamic

### Feature Work
- [x] Overview: add weather skeleton/widget ✅ done (Phase 5)
- [x] HydrationTracker: true 24h rolling window + hourly breakdown chart ✅ already done
- [x] SleepDashboard: add time pickers for sleep/wake, fetch tips from DB ✅ already done
- [ ] HealthExtras: add 3rd "Recovery & Stress" section with inline CRUD
- [x] Blueprint/Physique: implement Save/Cancel flow + unit toggle (cm ↔ in) ✅ already done

---

## 4C — Nutrition + Strength + Assessment (7 tasks)

- [x] Nutrition: dynamic `nutrition_logs` per-meal logging (store slice + API)
- [x] Nutrition: macro calculator (protein/carbs/fat targets from weight+goal)
- [x] Nutrition: ring chart for macro breakdown (recharts PieChart)
- [x] StrengthMetrics: visual PR (personal record) cards
- [x] StrengthMetrics: trend sparklines per exercise
- [x] StrengthMetrics: custom exercise entry support
- [ ] Assessment: new QA form UI + fix old data return from `assessment_qa`

---

## 4D — Habits + Goals + Progress (10 tasks)

- [x] HabitsMatrix: free emoji input per habit
- [x] HabitsMatrix: category groups (health, work, personal, etc.)
- [x] HabitsMatrix: dynamic streak calculation from `habit_logs`
- [x] GoalsDashboard: "Log Progress" button → writes to `goal_progress_logs`
- [x] GoalsDashboard: category dropdown for goal filtering
- [x] GoalsDashboard: `DATE` deadline field with date picker
- [ ] Progress: photo upload flow → Supabase Storage
- [ ] Progress: delta comparison vs 30 days ago
- [ ] Progress: all entries DB-backed (remove local state)
- [x] Progress: progress photo gallery view

---

## 4E — Skills + Logs + Notes (9 tasks)

- [x] Skills: normalized rows in DB (one row per skill entry)
- [x] Skills: 10 real category types (technical, language, fitness, creative…)
- [x] Skills: `last_practiced` warning (highlight stale skills)
- [x] Logs: global audit trail viewer component
- [x] Logs: filter by module (e.g. tasks, finance, health)
- [x] Logs: filter by action (CREATE, UPDATE, DELETE)
- [x] Logs: filter by date range
- [x] Notes: markdown editor (block-style / Notion-like)
- [x] Notes: tags, color picker, search highlight, pin toggle, word count display

---

## 4F — Documents + Shopping + Entertainment + Calendar (12 tasks)

### Documents
- [x] Real file upload to Supabase Storage
- [x] Google Drive sync UI (link/unlink)
- [x] OneDrive sync UI (link/unlink)

### Shopping
- [x] `quantity` field per shopping item
- [x] Priority sort (urgent items first)
- [x] "Clear Purchased" bulk action
- [x] Cart deeplinks (e.g. open in Flipkart/Amazon)

### Entertainment
- [x] Rating slider (0–10) per entry
- [x] `progress_episode` / `total_episodes` tracking
- [x] OTT platform sync UI (Zee5, Netflix, etc.)

### Calendar
- [x] Click-to-create event on date cell
- [x] Task due date markers on calendar grid
- [x] Normalized calendar event rows in DB

---

## 4G — AI Hub + DB Explorer + Dashboards + Misc (12 tasks)

### AI Hub
- [x] User context injection into AI prompt (name, goals, habits, health score, metric logs)
- [x] Chat history stored in DB (`ai_chat_history` table — in 4A schema + store)
- [x] AI responses stay in-app (no external redirects)

### DB Explorer
- [x] Guided INSERT form (select table → fill fields → submit)
- [x] Dynamic table list fetched from Supabase schema ✅ done (Phase 5)
- [x] Export with date-stamped filename

### Dashboards
- [x] Live charts wired to all major DB tables (finance, habits, goals, health)

### Misc
- [x] Social Media: URL validation before saving
- [x] Portfolio: dynamic URL field (editable, not hardcoded)
- [ ] Projects: manual entry form (title, stack, status, URL)
- [ ] Projects: edit/delete existing project entries

---

## Progress Tracker

| Sub-phase | Total | Done | Remaining |
|-----------|-------|------|-----------|
| 4A — Server + Schema | 19 | 18 | 1 |
| 4B — Health Stack UI | 12 | 11 | 1 |
| 4C — Nutrition + Strength | 7 | 6 | 1 |
| 4D — Habits + Goals + Progress | 10 | 7 | 3 |
| 4E — Skills + Logs + Notes | 9 | 9 | 0 |
| 4F — Docs + Shopping + Entertainment + Calendar | 12 | 12 | 0 |
| 4G — AI Hub + DB Explorer + Dashboards + Misc | 12 | 12 | 0 |
| **Phase 5 additions** | +16 | +1 | +15 |
| **Total** | **81+** | **76** | **5** |
