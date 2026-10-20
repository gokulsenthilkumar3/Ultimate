# Versioned Notes contract

Status: implemented and fixture-verified; opt-in installation rollout. The canonical record remains `Note`. The additive migration adds queryable flags, record kind, integer revision and tombstone, with separate `NoteRevision`, `NoteMutation` and `NoteChange` tables. Existing IDs, original columns and timestamps are preserved. The migration distinguishes private Mind journal rows even when metadata contains whitespace or malformed JSON.

## API

All paths require the existing authenticated session and CSRF checks for writes. Request validation comes from `src/domains/workspace/contracts/notes.js`; client acknowledgements are validated too. Unknown write fields are rejected. Ownership and journal kind are server-controlled.

| Method / path under `/api/v1/workspace/notes` | Contract |
| --- | --- |
| GET `/` | `limit` 1–100, `after` ID, `search`, `view`; `{items,nextCursor}` |
| GET `/:id` | Owned active Workspace note |
| POST `/` | Stable `id`, `mutationId`, editable fields; revision 1 |
| PUT `/:id` | `mutationId`, `expectedRevision`, changed editable fields |
| DELETE `/:id` | `mutationId`, `expectedRevision`; returns new tombstone revision |
| GET `/:id/revisions` | `cursor` revision, `limit`; bounded history including deleted notes |
| POST `/:id/restore` | `mutationId`, `expectedRevision`, historical `revision`; appends a new active revision |
| GET `/sync` | `cursor` sequence, `limit`; `{changes,cursor,hasMore}` |

Create/update/delete/restore, their immutable receipt, history snapshot and change entry commit atomically. An identical retry returns its original acknowledgement; reusing a mutation ID for another payload returns `MUTATION_REUSED`. A stale revision returns `VERSION_CONFLICT` and the current owned record for comparison. Failed requests do not consume mutation IDs. The sync feed returns the current record for each event; consumers must retain the highest record revision and apply deletion markers. It does not replay historical body snapshots. Journal rows never enter Workspace list/get/history/sync.

When enabled, `/api/notes` writes use the same canonical rows and history. Legacy timestamp preconditions remain supported. Versioned clients must use the explicit restore operation after deletion. The web Notes route reads server capabilities before choosing its persistence adapter. History/restore controls appear only for a versioned installation.

## Installation and rollback preparation

1. Complete the application/backend tests and stop writes for the installation rollout.
2. Run `npm run migrate:notes`. The default creates a consistent SQLite backup, verifies a fresh restore, applies the migration to another copy and proves original-column parity. Live schema is unchanged.
3. Review the private proof under `backups/`. Backups and rehearsal copies contain private data; these local files are **not encrypted**. Keep them on protected storage or use an encrypted backup destination. Do not publish them.
4. Run `npm run migrate:notes -- --apply` during the write pause. It repeats backup/restore/rehearsal, verifies the live Notes digest against that snapshot, and applies in one transaction. Changed data aborts the operation. Reruns reject an already upgraded schema.
5. Set `GROWTHTRACK_NOTES_V1=1`, regenerate the client if needed and restart the server. Smoke-test create/edit/history/delete/restore and the owner-scoped feed. Startup refuses an enabled installation without the required schema. Keep the verified backup and restore check.

The helper applies this additive migration directly; it is not a blanket `prisma migrate deploy` over the historical `db push` installation. Reconcile Prisma migration history separately before adopting a complete migration-deploy pipeline. Rollback must restore into a fresh location after reviewing new writes; the helper never overwrites the live database. Desktop packaging now builds without `db push`, so building an installer does not mutate owner storage.

SQLite's [`VACUUM INTO`](https://www.sqlite.org/lang_vacuum.html) supplies the consistent standalone snapshot, including committed WAL data. Every snapshot and fresh restore is checked for integrity, foreign-key validity, schema/count parity and checksum; manifest creation happens only after verification.

## Evidence and limits

The backend suite covers independent-client concurrency, mutation replay/reuse, losing-edit preservation, transactional rollback, owner denial, private journal exclusion, pagination, tombstones and restore. Browser scenarios cover ambiguous import acknowledgement and revision restore in Chromium, Firefox and WebKit. Additional fixtures exercise unmigrated storage with the regenerated Prisma client, actual migration byte/ID/timestamp preservation, WAL backup and a fresh restore.

The web client pulls the owned feed every 15 seconds while visible and on reconnect/focus, shares concurrent refreshes, validates whole pages before advancing its cursor, and keeps the highest received revision including tombstones. The cursor remains in memory and route reopening safely replays the feed. Refresh failures are visible with retry. The editor retains its original read revision; a remote refresh cannot replace an unfinished draft.

Markdown `[[links]]`, copied stable ID links, ambiguity resolution, unresolved-note creation, backlinks and an accessible outline now work over loaded owned Workspace records. Code blocks, HTML, escaped brackets and ordinary Markdown link captions do not become knowledge links. Title links can become unresolved after a rename; copied ID links survive. Folders, a server link index/graph, attachments, full offline cold-start, persistent mutation outbox, native Notes clients and PostgreSQL remain in progress.

## Local rollout record

The additive migration was applied to this local installation on 2026-10-05 UTC (2026-10-06 local) after a write pause and verified backup/restore/parity rehearsal. The snapshot contained zero Notes; other owner records were preserved. The private apply report is `backups/growthtrack-2026-10-05T182155037Z-f7ab3fb9-6360-4a51-9d61-889bb75b92ab-notes-rehearsal.json`. The ignored local environment enables `GROWTHTRACK_NOTES_V1=1`. Automated tests use isolated fixtures and do not use this owner database. This local rollout is not a hosted production release.
