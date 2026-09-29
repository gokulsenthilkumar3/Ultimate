# Scoped backend handoff

All API endpoints below require the existing authenticated session. Writes use
the existing `X-CSRF-Token` header. Tests never import `server.js` or use the owner
database. No migrations or commits were run.

## Finance

`POST /api/finance/import/csv/preview` accepts `{ content: string }`. Response:

```json
{
  "previewId": "opaque-id-or-null",
  "expiresAt": "ISO-timestamp-or-null",
  "canCommit": true,
  "summary": { "total": 2, "valid": 2, "invalid": 0, "duplicates": 1, "importable": 1 },
  "rows": [{
    "row": 2,
    "status": "valid",
    "transaction": { "amount": 10, "type": "Expense", "date": "2026-09-20", "category": null, "method": null, "note": null },
    "errors": []
  }]
}
```

Row status is `valid`, `invalid`, or `duplicate`; errors contain `{ field,
message }`. Required CSV columns: `amount,type,date`. Optional: `category,method,
note`. Input type is case-insensitive and normalizes to `Income`, `Expense`, or
`Investment`. Dates must be real `YYYY-MM-DD` dates; amounts positive finite
decimals up to 1 trillion. CSV supports BOM, escaped quotes, commas and quoted
newlines. Limits: 2 MB and 5,000 data rows. Invalid rows block the entire commit.

`POST /api/finance/import/csv/commit` accepts `{ previewId }` and returns
`{ imported, duplicates, total, replayed }`. Previews are owner-scoped and expire
after 15 minutes or a server restart; unavailable previews return 410 with
`code: PREVIEW_EXPIRED`. Duplicate identity includes all six CSV fields. Commit
rechecks existing rows inside a transaction; deterministic owner-scoped IDs
prevent repeat imports, including when an imported row was later edited. Retry
of a completed preview returns its original result with `replayed: true`.

The compatibility `POST /api/finance/import/csv` accepts `{ content }` to validate
and commit atomically, `{ content, mode: "preview" }`, or `{ previewId }` to commit.
Invalid legacy imports return 422 with row errors and no writes.

`GET /api/finance/export` downloads formula-safe CSV. Filters: `from`, `to`,
`type`, `category`, `method`, and `search`. Invalid filters return 400.
`POST /api/finance/sync/bank` returns 501 setup required and `supportedImport: csv`.

## Private files

- `GET /api/files`: `{ files, usage: { files, bytes }, limits: { maxFileBytes,
  maxTotalBytes, maxFiles } }`.
- `POST /api/files`: multipart field `file` and optional `visibility: private`;
  returns the created file record with HTTP 201. Limits: 25 MB/file, 250 MB/owner,
  100 stored files. Empty files and public uploads are rejected.
- `GET /api/files/:id/download`: exact bytes, safe attachment filename,
  `application/octet-stream`, `nosniff`, private/no-store.
- `GET /api/files/:id/preview`: JSON `{ kind: "text", text, truncated }` for
  UTF-8 `.txt`, `.csv`, `.log`, `.md`, `.json`, or verified raster image bytes.
  Text is capped at 128 KB. HTML, SVG, PDF and other formats return 415 and remain
  downloadable. The client renders text as escaped React text and images in
  `<img>` only, with no iframe/HTML rendering.
- `PATCH /api/files/:id`: `{ name, expectedUpdatedAt? }`; name changes only.
- `DELETE /api/files/:id`: optional `{ expectedUpdatedAt }`; returns
  `{ success, count, storageCleanupPending }`. A cleanup failure revokes access
  and explicitly reports pending storage cleanup.
- `/api/documents` retains list/create/update/delete URLs and download/preview
  aliases. Its GET remains an array; uploads require actual multipart bytes.
- `POST /api/files/providers/:provider/connect`: truthful 501 setup required.

File records expose `id`, `name`, `title`, `date`, `createdAt`, `updatedAt`, `type:
Private`, `visibility: private`, `size`, `sizeBytes`, `available`, `metadataOnly`,
`mimeType`, `previewKind`, `downloadUrl`, and `previewUrl`. Storage keys/checksums
are never exposed. Legacy metadata records remain visible with `metadataOnly:
true`, no download URL, and a 410 response if a byte download is requested.

Storage root defaults to `server/private-files`; set `FILE_STORAGE_ROOT` to a
persistent writable directory such as desktop `userData/private-files`.
It must be outside public/dist. Exclude `server/private-files/**` from packaging.
Files are private local bytes; this implementation does not claim encryption.

## Portfolio persistence

`POST/PUT /api/portfolio` and the `portfolio` field of `POST /api/user` use the
same pure `normalizePortfolioPayload`. Explicit zero prices are valid; missing
current prices remain null rather than being replaced by purchase cost. Dated
snapshots/history (arrays or snapshot maps), provenance, observation timestamps
and currency fields are preserved as bounded JSON. Currency codes normalize to
uppercase. The backend adds no observation dates, prices, provenance or history.
Invalid records reject the entire request with 400 instead of being dropped
from a replacement portfolio. Oversize arrays/payloads reject with 413 rather
than truncating. Limits remain 200 holdings / 512 KB, with 1,000 observations per
history collection. No schema change is needed.

## Safety, preferences, capabilities and locations

`POST /api/health/sync/apple` returns 501, `code: CONNECTOR_SETUP_REQUIRED`,
`status: setup_required`, `setupRequired: true`, and performs no reading writes.
Legacy Apple Health readings retain their values and map to `provenance:
unverified` plus `provenanceWarning` in API/client snapshots.

BaseController and MetricLogController updates/deletes accept optional
`expectedUpdatedAt` ISO timestamps and return 409 `VERSION_CONFLICT` on stale
writes. Updates return `{ success, count, updatedAt }`. Atomic conditions also
protect changes occurring between the initial read and update. Submitted
ownership/audit/version fields are protected. Audit details contain known field
names and counts, with values and private actor identity redacted.

`GET /api/capabilities` returns `{ version, billing: { checkoutAvailable, tier },
connections: [{ provider, status, reason }] }`. Version comes from package.json;
tier comes from the authenticated user's database row; checkout uses the same
configured Stripe instance and price as checkout. Unimplemented connections
are `setup-required`, regardless of credential presence. No credential details
or configuration names are exposed. Preference creation explicitly defaults to
`theme: system`; accepted values are `light`, `dark`, and `system`.

`GET /api/locations` retains its owner-scoped array response and 500-row cap.
Database failures return errors, not empty history. `DELETE /api/locations/:id`
checks ownership and returns `{ success, count }`. `DELETE /api/locations`
requires JSON `{ confirm: true }` and deletes only the owner's history. Audits
contain counts and action metadata, never coordinates or captured values.

## Frontend serving

`FRONTEND_BASE_PATH` overrides the `APP_URL` pathname; default is `/Ultimate/`.
Production or `SERVE_FRONTEND=true` mounts dist at that path, redirects `/` to the
base, and provides SPA fallback only within the base. Missing assets return 404.
API/auth handling is preserved. No service-worker, routing, CSS, package or lock
files were changed by this backend work.

## Validation and integration

Dependencies required: `csv-parse` and `multer` (installed by main). No additional
dependencies or schema changes are needed. Run the standalone backend suite:

```text
node tests/unit/server-backend/run.mjs
```

The runner creates isolated temporary SQLite databases and cleans the suite
directory after native Windows handles close. Direct `node --test` runs also
work, but Windows may retain a temporary fixture until process exit.

Main owns service worker, app routing, CSS, package/lock edits and desktop storage
configuration. The completed Agent router is mounted with the default factory:
`app.use('/api/agents', authMiddleware, createAgentsRouter())`. Its directory is
unchanged by this work. See `server/agents/README.md` for its streaming contract.

## Exact changed files

- `server.js`
- `server/collectionPayload.js`
- `server/controllers/BaseController.js`
- `server/controllers/MetricLogController.js`
- `server/eventLogger.js`
- `server/domains/capabilities.js`
- `server/domains/errors.js`
- `server/domains/fileMetadata.js`
- `server/domains/files.js`
- `server/domains/finance.js`
- `server/domains/locations.js`
- `server/domains/mutations.js`
- `server/domains/privateStorage.js`
- `server/domains/providers.js`
- `server/domains/portfolio.js`
- `server/frontend.js`
- `server/private-files/.gitignore`
- `server/backend-contracts.md`
- `src/api/files.js`
- `src/components/Documents.jsx`
- `src/components/FileVaultPreview.jsx`
- `src/tests/interfaceRegression.test.jsx` (only upload retry case, explicitly authorized)
- `tests/unit/server-backend/fixture.mjs`
- `tests/unit/server-backend/run.mjs`
- `tests/unit/server-backend/files.test.mjs`
- `tests/unit/server-backend/finance.test.mjs`
- `tests/unit/server-backend/frontend.test.mjs`
- `tests/unit/server-backend/locations.test.mjs`
- `tests/unit/server-backend/safety.test.mjs`
- `tests/unit/server-backend/agents-mount.test.mjs`
- `tests/unit/server-backend/portfolio.test.mjs`

## Additional integrated contracts

`POST /api/workout_sessions/complete` accepts a stable UUID, user-calendar
`date`, `notes`, non-negative integer `duration_minutes`, calculated `volume`,
and `sets` with stable IDs, exercise names, set numbers, completed flags and
actual reps/weights. The backend validates volume against the completed sets
and creates the parent session and set rows in one transaction. Repeating the
identical submission ID/payload returns the acknowledged session with
`replayed: true`; a different payload or another owner's ID returns 409.
Failed set insertion rolls the entire session back. Audit metadata records
only the identifier and set count, not notes or measurements. The client
freezes an attempted completion in its owner-scoped draft, so retries send
the same duration, notes and sets.

`PUT /api/social-profiles` accepts `{ rows, removed }` for manually entered
profiles. Each row has `provider`, HTTP(S) `profileUrl` (or null), non-negative
whole-number `followers`, `avgLikes`, `avgViews`, and `expectedUpdatedAt` for
existing rows. `removed` entries require provider and revision. The entire
batch validates before writing and commits transactionally with owner/revision
checks; stale writes or removals return 409. A legacy array payload still
upserts without removals for old clients. This endpoint saves manual data;
it does **not** authorize, connect, fetch or verify any provider account.

`GET /api/notifications` and its preferences/actions routes serve persistent,
source-linked reminders, not CRUD audit events; see `docs/NOTIFICATIONS.md`.
The shared configuration, bootstrap and `GET /api/database/tables` endpoints
use `publicSettingsWhere()` so private AppSetting rows cannot leak across
owners through the database browser.
