# Notes reference vertical slice

Owner: Workspace. Route: `/workspace/notes`; registered views: `all`, `pinned`, `tags`, `editor`. Status: **in progress**. This is the first module that must satisfy the complete view contract in `MASTER_PRODUCT_SPEC.md` before serving as the pattern for later modules.

## Verified baseline and risks

`src/components/Notes.jsx` currently offers create/edit/delete, full-text client filtering, tags, pin/star, Markdown editing/preview and copy. `src/store/recordActions.ts` writes to the existing `/api/notes` collection and updates client state after acknowledgement. `prisma/schema.prisma` has an owner-scoped `Note` with title/content plus JSON `data` and timestamps. The generic controller checks owner and optional `expectedUpdatedAt` for conflicts. `src/store/journalActions.ts` also stores Mind journal entries in Notes with `source: mind-journal`; migration must keep those private and separate from the Workspace Notes list. Existing `e2e/notes.spec.js` uses an older navigation flow and is not sufficient evidence of the current authenticated route or sync behavior.

The baseline component displayed an autosave claim before acknowledgement and called update actions without handling rejection. The first hardening change now reports unsaved/saving/saved/failed states, keeps failed edits open, surfaces failed mutations, waits for create acknowledgement, uses UUIDs for new notes, and excludes `mind-journal` entries from Workspace Notes search and facets. This is local reliability work, not a revision-based sync or offline conflict solution.

## View specifications

| View | Primary task | Required behavior | Acceptance evidence |
| --- | --- | --- | --- |
| `all` | Find and open an owned note | Paginated search over title/body/tags and folder; create, rename, move, duplicate, soft delete; visible loading/empty/error/offline and sync state | Authenticated create/search/reload, owner isolation, keyboard navigation, offline cached list |
| `pinned` | Revisit priority notes | Pin/unpin with stable ordering and count; same note ID and content as `all` | Pin/unpin survives reload and cross-device sync; no duplicate record |
| `tags` | Browse and organize tags | Add/remove/rename tags, counts and filters; tag edits do not discard concurrent body edits | Search/filter and conflict fixture; screen-reader labels |
| `editor` | Write and review a note | Markdown source/preview, outline, `[[links]]` and backlinks, attachments, templates, revision history, export/import, explicit save/conflict recovery | Draft survives reload/offline; ambiguous-write retry is idempotent; two-device body conflict preserves both versions; import round trip |

Graph view is an additional Notes view to register only after its link index and accessible nonvisual equivalent are implemented. It must not be advertised as complete merely because a graph can render.

## Records and contracts

- `Note`: stable UUID, owner, vault/folder, title, Markdown body, pin/star, created/updated timestamps, revision, deletedAt and sync state. Journal records retain a distinct private type or migrate to the Mind domain with a verified reversible mapping.
- `NoteRevision`: note ID, revision, body/title snapshot or change, actor/device, timestamp. Keep both sides of a rejected concurrent body edit; never replace a stored revision with the losing draft.
- `NoteLink`: source note, target note or unresolved title, position. Backlinks and graph derive from this index; rename must preserve stable links.
- `NoteAttachment`: reference a Workspace File version with owner permission checked on every read.
- `/api/v1/workspace/notes`: typed paginated list/search; create with idempotency key; conditional update/delete against integer revision; revisions/diff/restore; import preview/commit/export. Stable `VERSION_CONFLICT` response includes current revision and a safe comparison token. Sync emits notes/revisions/tombstones through cursors.
- Offline queue: encrypted owner/device-scoped drafts, unique mutation ID, retry and status `pending | synced | failed | conflicting`; logout and account switch must prevent cross-owner replay.

## Execution order and gates

1. Build sanitized migration fixtures from current `Note` rows, including JSON metadata, duplicate titles, attachments, deleted/updated cases and `mind-journal` records. Snapshot counts and content hashes; verify restore. Do not mutate owner storage in tests.
2. Add schema and contract behind the existing API, backfill with stable IDs and revisions, and prove old/new read parity. Keep rollback mapping and old endpoint until consumers are migrated.
3. Implement the four views and keyboard/mobile navigation against the new contract. Make save state reflect server acknowledgement and expose retry/conflict review. Add Markdown links, outline, attachments, revisions and import/export progressively while maintaining a complete core create/edit/find/offline workflow.
4. Implement native iOS/Android storage, editor and file adapters against the same contract; test offline queue, account switching and conflict resolution on devices. Desktop must use the same API contract and secure local cache.
5. Run owner isolation, idempotency, concurrent edit, tombstone, import parity, screen-reader, authenticated route, desktop packaging and native build tests. Record evidence per view in the master inventory. Advance Notes to **verified** only when all four views and platform gates pass.

## Implementation increment (2026-10-05)

The web client now implements route-backed All/Pinned/Tags/Editor selection, a keyboard-reachable note list, reviewed Markdown import and current-draft export. Failed saves retain the editor text and block switching to another note or creating a replacement. Body saves retain the timestamp of the version actually opened, including when a background refresh brings in a newer record; conflicts pause autosave.

Unfinished edits are encrypted with AES-GCM in the existing owner-scoped IndexedDB draft store. Each owner has a nonextractable browser CryptoKey; owner and note IDs are authenticated with the ciphertext. Writes and acknowledged cleanup are serialized. Reload offers an explicit comparison/recovery dialog, keeps unreadable ciphertext, and can save a separate recovered copy while preserving the original. Opening recovery never submits it automatically. Draft/file ports live under `src/domains/workspace/application`; browser adapters are selected by `src/app/NotesRoute.jsx`. Record persistence still uses the legacy store and API.

This is browser draft recovery after sign-in and initial record loading, **not offline cold-start or cross-device sync**. The browser profile can use its stored key; this does not protect against a compromised profile or same-origin script. Stable idempotent create/import retries, normalized revisions/tombstones, cursor sync, paginated search, folders, links/backlinks/outline, attachments, version history, native adapters and device tests remain required. No owner schema/data migration was performed. Notes remains **in progress**.

Evidence: 67 focused unit/component/store tests including public pages pass; TypeScript typecheck and production build pass. Browser fixtures intercept every API call and do not use owner storage; `tests/e2e/notes-slice.spec.ts` covers import/reload/export, route focus, 320px conflict preservation, encrypted reload recovery with paused submission, and public keyboard skip links in Chromium, Firefox and WebKit. All 15 scenarios passed across the final Notes run and focused public-page rerun; commands and scope are recorded in `IMPLEMENTATION_STATUS.md`.
