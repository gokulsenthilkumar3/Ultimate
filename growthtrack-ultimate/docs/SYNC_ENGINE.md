# Sync Engine

Status: in progress (2026-10-18). Pulls data from public providers so owners stop retyping prices and events. Code: `server/domains/sync/`. Tests: `tests/unit/server-backend/sync.test.mjs`. UI: `src/components/sync/SyncCenter.jsx`.

## Connectors

Intervals, per-run limits, timeouts, the calendar window and provider base URLs below are defaults; each is configurable (see [CONFIGURATION.md](CONFIGURATION.md)).

| Key | Target | Provider | Interval | Secret | Matching rule |
| --- | --- | --- | --- | --- | --- |
| `mfapi` | portfolio | mfapi.in (AMFI NAV) | 6 h | none | `type: "Mutual Fund"` and a 3–7 digit AMFI scheme code in `symbol` or `schemeCode` |
| `coingecko` | portfolio | CoinGecko simple price | 1 h | none | `type: "Crypto"`; known symbol (BTC, ETH, SOL…) or explicit `coingeckoId` |
| `alphavantage` | portfolio | Alpha Vantage `GLOBAL_QUOTE` | 12 h | API key | `type: "Stock"` or `"ETF"`; exchange-suffixed symbol such as `RELIANCE.BSE`; five per run |
| `ics` | calendar | Any iCalendar feed | 1 h | feed URL | Every supported `VEVENT` within the last 30 and next 400 days, plus simple repeating events |

Fixed-provider connectors are pinned to their documented API host. The calendar connector accepts any public `https://` or `webcal://` address.

## Endpoints

All require authentication and the normal CSRF header for writes. Responses use `Cache-Control: private, no-store` and the `{ code, error }` error shape from `server/domains/errors.js`.

- `GET /api/v1/sync/connectors` → `{ connectors: [{ key, label, description, provider, docsUrl, domain, target, autoSyncMinutes, fields, status, requiresEncryptionKey, connection }] }`. `status` is `available`, `connected`, `paused`, `needs-key` or `error`. `connection` carries `autoSync`, non-secret `config`, `hasSecret`, `lastSyncAt` and `lastRun`; it never contains a secret.
- `PUT /api/v1/sync/connections/:key` with `{ config, autoSync?, timeZone?, runNow? }` → `{ connection, run? }`. Leaving a secret field blank keeps the stored secret. The first sync runs immediately unless `runNow` is `false`; its failure does not undo the connection.
- `POST /api/v1/sync/connections/:key/run` → `{ connector, status, at, summary, issues, data }`. `status` is `success`, `partial` (some items need attention) or `failed`. `data` contains the updated `portfolio` or `calendar_events` so the client can update its store. Concurrent runs for the same owner and source return `409 SYNC_IN_PROGRESS`.
- `POST /api/v1/sync/run` with `{ target: "portfolio" | "calendar" }` → `{ results: [...] }` for every connected source of that target.
- `DELETE /api/v1/sync/connections/:key?removeData=true|false` → `{ disconnected, removed, data? }`. Removing data only applies to mirrored calendar events; recorded prices stay in history.

## Data written

- **Holdings:** `currentPrice`, `priceDate`, `quote { price, date, currency, source, reference, fetchedAt }` and a bounded `priceHistory` of `{ date, price, currency, provenance }`. A quote in a different currency from the holding is reported, not applied. History is trimmed (120 → 0 entries) only when needed to stay under the 512 KB portfolio limit. The client treats a quote as dated only while `currentPrice` still equals `quote.price`, so a later manual edit takes precedence.
- **Events:** mirrored events carry deterministic IDs (hash of owner, connector and UID), `syncProvider`, `syncLabel` and `readOnly: true`. Each sync replaces only that connector's events; owner-created events are untouched. The Calendar shows them without edit or delete controls.

## Row storage (record rows)

With `GROWTHTRACK_RECORD_ROWS=1` (after the reviewed migration) calendar events and holdings live in `calendar_events` and `portfolio_holdings`, keyed by owner and record id, each with an integer `revision` and a `deletedAt` tombstone. Receipts (`record_mutations`) make retried writes idempotent; `record_changes` is a per-owner feed.

- `GET|POST /api/v1/calendar/events`, `PUT|DELETE /api/v1/calendar/events/:id`, `GET /api/v1/calendar/events/changes?cursor=` and the same under `/api/v1/finance/holdings`. Writes send `{ mutationId, expectedRevision, record }`; a stale revision returns `409 VERSION_CONFLICT` with `current`. Re-creating a deleted id (Undo) revives it with a new revision. Mirrored events return `409 READ_ONLY_RECORD` to owner edits.
- The Sync Engine merges quotes onto the latest holding row and bumps its revision only when the price or date changed, so a tab holding the older revision gets a conflict instead of overwriting the sync. Mirrored events are upserted per UID and tombstoned when they leave the feed; owner rows are never touched.
- `/api/state` serves the rows and `recordRows: true`; the web client then writes one record at a time. Whole-document writes to `/api/calendar_events` and `/api/portfolio` return `409 LEGACY_WRITE_RETIRED`, and `/api/user` ignores its stale copies of both documents.
- Rollout: `npm run migrate:records` backs up, migrates a copy and verifies per-owner parity; `-- --apply` repeats it on the database only if the data is unchanged since the rehearsal. The legacy JSON columns are kept as a rollback copy; turning the flag off returns to them but does not include edits made while rows were active.

## Storage and security

- Connections use the existing `integration_credentials` table (no migration). Settings, auto-sync preference and last run are sealed into `clientIdCiphertext`; the secret into `accessTokenCiphertext`. Both use AES-256-GCM with `APP_ENCRYPTION_KEY` and additional data bound to owner, provider and field. Without a key, secret-free settings are stored with an explicit `plain1:` marker and secret-bearing connectors report `needs-key`.
- `safeFetch.js` allows only HTTPS on port 443, rejects credentials in URLs and local/internal names, validates every resolved address inside the socket lookup (blocking private, loopback, link-local, CGNAT, multicast and documentation ranges, including IPv4-mapped IPv6), re-validates each redirect, and caps time and response size.
- Each run writes an audit event (`category: sync`, `table_name: sync`, `item_id: <connector>`) with counts only.

## Scheduler

`startSyncScheduler` checks every 5 minutes (first pass 30 s after start) and runs each enabled connection whose interval has elapsed. `lastSyncAt` records attempts, so a failing provider is retried on its interval rather than continuously. Set `GROWTHTRACK_SYNC_SCHEDULER=off` to disable background runs; manual sync still works.

## Adding a connector

Add an object to `CONNECTORS` in `connectors.js` with `key`, `target` (`portfolio` or `calendar`), labels, `autoSyncMinutes`, `fields`, `normalize(input, previousSecret)` returning `{ config, secret }`, and either `quotes({ holdings, config, secret, fetchJson })` returning `{ quotes: Map<holdingId, quote>, unmatched }` or `events({ secret, config, fetchText, idFor, now, timeZone })`. Set `requiresSecret: true` when `secret` is non-null. Pin fixed hosts with `allowHosts`. Add fixture-based tests; do not call live providers in the suite.
