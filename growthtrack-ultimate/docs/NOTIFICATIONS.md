# Persistent in-app notifications

Backend integration replaces the CRUD-log route in `server.js`. No Prisma/schema
migration is required. The named/default router factory is:

```js
import createNotificationsRouter, { NOTIFICATION_SETTINGS_PREFIX } from './server/notifications/router.js';
app.use('/api/notifications', authMiddleware, createNotificationsRouter({ prisma }));
```

The old CRUD-log `GET /api/notifications` handler has been removed; audit history
belongs at Hub → Logs. Existing session, CSRF, origin and rate-limit middleware remain. The router also
requires `req.user.id`. `createNotificationHandlers({ prisma, now })` exposes
injectable `list`, `preferences`, `actions`, and `updatePreferences`; `now` is a
function returning a Date, defaulting to the server clock. No ambient Prisma
client is constructed. Reads never create/update settings or audit records.

## Required settings isolation at integration

The existing `AppSetting` model stores one JSON row per authenticated owner:
`private:notifications:v1:<encoded-user-id>`, category `user-notifications`,
`createdBy`/`updatedBy` set to that user ID. The router derives the key from the
session and verifies ownership. Clients cannot choose keys/owners. The existing
`/api/config/:key` whitelist already rejects this namespace.

The backend now uses `publicSettingsWhere()` for configuration, bootstrap, and
the read-only database browser. It selects a strict allowlist; notification
acknowledgement state and other private AppSetting rows are excluded. Owner
exports must include only that owner's matching key if added later.

No migration is required. JSON contains schemaVersion, revision, preferences,
and ID→timestamp maps for read/dismiss acknowledgements. It never stores source
titles, amounts, journal text or model output. Do not log request bodies, setting
values, reminder contents or raw database errors. The handlers emit no logs.

Updates require `expectedRevision`. Existing rows use atomic `updateMany` with
the owner, namespace/category, and exact previous JSON value as conditions.
Creation uses the unique setting key; a concurrent create becomes 409. No
read-merge-unconditional-upsert is used. A stale revision or lost compare-and-swap
returns 409 with no overwrite. Read/dismiss maps each allow up to 5,000 entries;
exceeding this limit rejects the update rather than silently forgetting history.

## HTTP contract

All responses are `Cache-Control: no-store`. Mutations allow up to 64 KiB.

| Method | Path | Payload/result |
|---|---|---|
| GET | `/api/notifications` | Full feed below, including dismissed reminders |
| GET | `/api/notifications/preferences` | `{ ownerId, revision, preferences }` |
| POST | `/api/notifications/actions` | `{ expectedRevision, action, ids }`; full acknowledged feed |
| PUT | `/api/notifications/preferences` | `{ expectedRevision, preferences: { enabled?, categories?: { tasks?, goals?, habits?, calendar?, subscriptions? } } }`; full feed |

Actions: `read`, `unread`, `dismiss`, `restore`; 1–500 opaque notification IDs.
Unknown fields, invalid IDs and invalid actions return 400. IDs must still refer
to real records/occurrences owned by the session user (404 if no longer present).
Errors: `{ code, error }`, including 401/400/404/409/413/503. DB errors are redacted.

Feed: `{ ownerId, revision, preferences, timeZone, generatedAt, notifications,
unreadCount }`. Each reminder has `{ id, category, type, title, reason, body,
dueDate, dueTime, source: { module, id, label }, href, link, read, dismissed,
readAt, dismissedAt }`. IDs hash source/category and recorded due date/time;
changing a deadline creates a new occurrence rather than inheriting a dismissal.
Profile timezone controls today's date; absent/invalid timezone explicitly uses
UTC. No browser timezone is inferred. Date-only due dates stay calendar dates.

## Real reminder sources

- Tasks: incomplete records with `due_date`, overdue/today/within seven days.
- Goals: active records with canonical `targetDate` or stored JSON deadline;
  completed/cancelled/archived or already-achieved targets are excluded.
- Habits: recorded daily frequency or seven target days/week, with no completion
  logged today. Partial-week targets without explicit scheduled days do not imply
  a missed day. The UI calls these check-ins, not fabricated missed habits.
- Calendar: stored dated events, including daily/weekly/monthly/yearly occurrences
  in the next seven days. Month/year recurrences remain anchored to the original
  calendar date; no overflow-date invention. Invalid timed schedules are skipped.
- Subscriptions: active records with explicit `next_date`/`nextDate`; financial
  renewals start disabled. Payment/cancellation status is never inferred.

Every reminder links to its canonical source module with record ID (and calendar
occurrence date). No CRUD/audit log, unrecorded health threshold, synthetic event
or arbitrary progress percentage becomes a notification. Source data read
failures remain errors instead of becoming an empty/caught-up feed.

## Existing client wiring

`App` continues passing `useNotifications()` as `notificationState` to
`NotificationCenter`. The hook now uses TanStack Query for server feed/mutations,
with owner+session-scoped keys, cancellation, polling/window-focus refresh, and
cache removal on session changes. It never derives an alternative local feed or
imports browser read/dismiss IDs. No localStorage persistence is used.

The UI provides Unread/All/Dismissed, source filters, restore/unread actions and
acknowledged category preferences. Mutations are serialized per session; only a
validated newer server revision changes the cache. Failures remain visible,
ambiguous writes are reconciled through a fresh read, and mutations never replay
automatically. Loading/error states never claim an empty account. Success feedback
waits for acknowledgement. Source links do not silently mark reminders read.

In-app preferences are distinct from the existing profile notification toggle
and do not enable email, SMS, push or background delivery. Auth/profile/draft
changes remain with main. Tests use injected in-memory Prisma doubles and mocked
API responses; they never import the application server or connect to `dev.db`.
