# Phase 4 — Master Task Tracker (81 Pending Tasks)

> Last updated: 2026-05-10
> Status: 0 / 81 complete

---

## 4A — Server + Schema (19 tasks)

### New API Endpoints
- [ ] `POST /api/hydration/log` — timestamped 24h hydration logging
- [ ] `GET /api/nutrition_logs` — fetch per-meal nutrition logs
- [ ] `POST /api/nutrition_logs` — add nutrition log entry
- [ ] `DELETE /api/nutrition_logs/:id` — remove nutrition log entry
- [ ] `GET /api/audit_log` — fetch CRUD audit trail
- [ ] `POST /api/audit_log` — write CRUD audit entry
- [ ] `GET /api/progress_photos` — fetch progress photo records
- [ ] `POST /api/progress_photos` — upload progress photo record
- [ ] `DELETE /api/progress_photos/:id` — delete progress photo
- [ ] `GET /api/goal_progress_logs` — fetch goal progress entries
- [ ] `POST /api/goal_progress_logs` — log goal progress
- [ ] `POST /api/finance/import/csv` — bulk import finance entries from CSV
- [ ] `PUT /api/finance/:id` — update a finance entry
- [ ] `PUT /api/budgets/:id` — update a budget entry
- [ ] **SECURITY** `SELECT`-only guard on `/api/query` — block non-SELECT statements

### Schema Migrations
- [ ] New table: `nutrition_logs` (meal, macros, timestamp)
- [ ] New table: `audit_log` (module, action, user, timestamp)
- [ ] New table: `progress_photos` (url, date, notes)
- [ ] New table: `goal_progress_logs` (goal_id, value, date)
- [ ] Schema: `finance.method` field, add `investment` to `finance.type`, change `finance.date` → `DATE`
- [ ] Schema: `shopping.quantity`, add `urgent` priority level, `tasks.description`, `tasks.parent_task_id`
- [ ] Schema: `documents.size` → `BIGINT`, `goals.deadline` → `DATE`, `skills` normalized rows
- [ ] Export filename with date suffix (e.g. `export_2026-05-10.csv`)

> ⚠️ **Do 4A first** — most other sub-phases depend on these tables and routes.

---

## 4B — Health Stack UI (12 tasks)

### Bug Fixes
- [ ] **BUG-01** HDRI fix → change to `Environment preset="studio"` in humanoid viewer
- [ ] **BUG-07** Remove `activeTab` from Zustand persist to fix stale tab state
- [ ] **BUG-09** Overview: user name shows "Operator" — replace with real user name from DB
- [ ] **BUG-11** Overview: health score should be computed from real metrics, not hardcoded

### Feature Work
- [ ] Overview: add weather skeleton/widget
- [ ] HydrationTracker: implement true 24h rolling window + hourly breakdown chart
- [ ] SleepDashboard: add time pickers for sleep/wake, fetch tips from DB
- [ ] HealthExtras: add 3rd "Recovery & Stress" section with inline CRUD
- [ ] Blueprint/Physique: implement Save/Cancel flow + unit toggle (cm ↔ in)

---

## 4C — Nutrition + Strength + Assessment (7 tasks)

- [ ] Nutrition: dynamic `nutrition_logs` per-meal logging
- [ ] Nutrition: macro calculator (protein/carbs/fat targets)
- [ ] Nutrition: ring chart for macro breakdown
- [ ] StrengthMetrics: visual PR (personal record) cards
- [ ] StrengthMetrics: trend sparklines per exercise
- [ ] StrengthMetrics: custom exercise entry support
- [ ] Assessment: new QA form UI + fix old data return from `assessment_qa`

---

## 4D — Habits + Goals + Progress (10 tasks)

- [ ] HabitsMatrix: free emoji input per habit
- [ ] HabitsMatrix: category groups (health, work, personal, etc.)
- [ ] HabitsMatrix: dynamic streak calculation from `habit_logs`
- [ ] GoalsDashboard: "Log Progress" button → writes to `goal_progress_logs`
- [ ] GoalsDashboard: category dropdown for goal filtering
- [ ] GoalsDashboard: `DATE` deadline field with date picker
- [ ] Progress: photo upload flow → Supabase Storage
- [ ] Progress: delta comparison vs 30 days ago
- [ ] Progress: all entries DB-backed (remove local state)
- [ ] Progress: progress photo gallery view

---

## 4E — Skills + Logs + Notes (9 tasks)

- [ ] Skills: normalized rows in DB (one row per skill entry)
- [ ] Skills: 10 real category types (e.g. technical, language, fitness, creative…)
- [ ] Skills: `last_practiced` warning (highlight stale skills)
- [ ] Logs: global audit trail viewer component
- [ ] Logs: filter by module (e.g. tasks, finance, health)
- [ ] Logs: filter by action (CREATE, UPDATE, DELETE)
- [ ] Logs: filter by date range
- [ ] Notes: markdown editor (block-style / Notion-like)
- [ ] Notes: tags, color picker, search highlight, pin toggle, word count display

---

## 4F — Documents + Shopping + Entertainment + Calendar (12 tasks)

### Documents
- [ ] Real file upload to Supabase Storage
- [ ] Google Drive sync UI (link/unlink)
- [ ] OneDrive sync UI (link/unlink)

### Shopping
- [ ] `quantity` field per shopping item
- [ ] Priority sort (urgent items first)
- [ ] "Clear Purchased" bulk action
- [ ] Cart deeplinks (e.g. open in Flipkart/Amazon)

### Entertainment
- [ ] Rating slider (0–10) per entry
- [ ] `progress_episode` / `total_episodes` tracking
- [ ] OTT platform sync UI (Zee5, Netflix, etc.)

### Calendar
- [ ] Click-to-create event on date cell
- [ ] Task due date markers on calendar grid
- [ ] Normalized calendar event rows in DB

---

## 4G — AI Hub + DB Explorer + Dashboards + Misc (12 tasks)

### AI Hub
- [ ] User context injection into AI prompt (name, active goals, habits, health score)
- [ ] Chat history stored in DB (`ai_chat_history` table — *add to 4A schema*)
- [ ] AI responses stay in-app (no external redirects)

### DB Explorer
- [ ] Guided INSERT form (select table → fill fields → submit)
- [ ] Dynamic table list fetched from Supabase schema
- [ ] Export with date-stamped filename

### Dashboards
- [ ] Live charts wired to all major DB tables (finance, habits, goals, health)

### Misc
- [ ] Social Media: URL validation before saving
- [ ] Portfolio: dynamic URL field (editable, not hardcoded)
- [ ] Projects: manual entry form (title, stack, status, URL)
- [ ] Projects: edit/delete existing project entries

---

## Progress Tracker

| Sub-phase | Total | Done | Remaining |
|-----------|-------|------|-----------|
| 4A — Server + Schema | 19 | 0 | 19 |
| 4B — Health Stack UI | 12 | 0 | 12 |
| 4C — Nutrition + Strength | 7 | 0 | 7 |
| 4D — Habits + Goals + Progress | 10 | 0 | 10 |
| 4E — Skills + Logs + Notes | 9 | 0 | 9 |
| 4F — Docs + Shopping + Entertainment + Calendar | 12 | 0 | 12 |
| 4G — AI Hub + DB Explorer + Dashboards + Misc | 12 | 0 | 12 |
| **Total** | **81** | **0** | **81** |
