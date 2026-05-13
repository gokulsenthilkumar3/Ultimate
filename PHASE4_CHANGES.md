# Phase 4 — Complete Implementation Plan

All changes tracked here before individual file commits.

## Phase 4A — Server Endpoints Added
- POST /api/hydration/log (timestamped hydration)
- POST /api/finance/import/csv (CSV bulk import)
- GET/POST /api/nutrition_logs (per-meal logging)
- DELETE /api/nutrition_logs/:id
- GET /api/audit_log (CRUD audit trail)
- POST /api/audit_log (log CRUD action)
- GET/POST/DELETE /api/documents (full CRUD)
- GET/POST/DELETE /api/progress_photos
- GET/POST/DELETE /api/skill_entries

## Phase 4B — Health Stack
- HydrationTracker: 24h rolling window, hourly breakdown chart
- SleepDashboard: UX redesign, stage breakdown, trend
- HealthExtras: 3rd Recovery section, full inline CRUD

## Phase 4C — Nutrition + Strength
- Nutrition: dynamic meal log, macros from DB
- StrengthMetrics: UX overhaul, trend sparklines
- Assessment: fix old data return from assessment_qa

## Phase 4D — Habits + Goals + Progress
- HabitsMatrix: full streak grid, DB-backed toggle
- GoalsDashboard: dynamic create from DB
- Progress: DB-backed entries, photo upload flow

## Phase 4E — Skills + Logs + Notes
- Skills: category types, level system, DB entries
- Logs: global audit trail viewer
- Notes: Notion-like block editor

## Phase 4F — Documents, Shopping, Entertainment, Calendar
- Documents: Google Drive/OneDrive sync UI
- Shopping: quantity, cart sync deeplinks
- Entertainment: OTT platform sync UI
- Calendar: click-to-create events, multi-source

## Phase 4G — AI Hub, DB Explorer, Dashboards
- AiDashboard: memory, full app context injection
- Databases: full table CRUD, guided INSERT form
- Dashboards: live charts from all DB tables
