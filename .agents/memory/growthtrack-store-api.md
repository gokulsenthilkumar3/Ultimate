---
name: GrowthTrack store API
description: Key store field names, actions, partialize slice, and gotchas for growthtrack-ultimate/src/store/useStore.ts
---

# GrowthTrack Zustand Store API

**Why:** The store has non-obvious field names and a limited partialize slice; wrong field names cause silent empty arrays at runtime.

## Key field names (state)
- `calendar_events` (NOT `calendarEvents`) — bulk-replaced via `updateCalendarEvents(array)`
- `metric_logs` — always guard with `|| []`; fetched from `/metric_logs` API
- `databases` — local-only custom tables; added to `partialize` so it persists across reloads
- `habitLogsByHabit` — keyed by habit ID, not a flat array
- `sleep_logs`, `moodLogs`, `vitalsLogs` — separate arrays
- `tasks` — from DB via `apiSync('/tasks')`, or `user.tasks.pending/completed` fallback

## Persist slice (localStorage)
Added `databases` to `partialize` in store version 4. Other persisted: `theme`, `palette`, `pinnedTabs`, `finance`, `entertainment`, `timesheet`, `shopping`, `onboardingComplete`, `lastCheckIn`, `checkInAlertDismissedDate`.

## Calendar events pattern
```js
const events = useStore(s => s.calendar_events) || [];
const _updateAll = useStore(s => s.updateCalendarEvents);
const addEvent = (ev) => _updateAll([...events, ev]);
const deleteEvent = (id) => _updateAll(events.filter(e => e.id !== id));
const updateEvent = (id, upd) => _updateAll(events.map(e => e.id === id ? { ...e, ...upd } : e));
```

## How to apply
- Always use `|| []` on all store arrays consumed in components
- Never look for `askGemini` or AI helpers on the Zustand store — they live in `src/lib/firebase.js`
