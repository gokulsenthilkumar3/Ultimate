# GrowthTrack implementation status (baseline 2026-09-29; updated 2026-10-05)

This is an implementation snapshot, not a claim that the whole approved plan is
production-ready. Scope is `growthtrack-ultimate` only. No owner database was
migrated, merged, reset, or used by automated tests. The sibling applications
under `D:/Projects/Tracker` were not changed.

## Notes, architecture and accessibility increment (2026-10-05)

- Implemented real Notes view selection, reviewed Markdown import/export, retained failed/conflicting edits and an explicit comparison/recovery workflow. Encrypted owner-scoped browser drafts survive reload; recovery pauses autosave and offers a separate copy. Local saves are reported independently of server acknowledgements. Notes retains its original read version during background refreshes.
- Introduced portable Notes content/draft/file contracts and browser adapters selected in an application composition root. The existing record store and legacy API remain in use.
- Added public skip links and focus targets, module/view navigation focus, semantic Notes colors and 44px actions. Fixed transparent primary buttons caused by the previous gradient reset. Removed the Notes entrance animation so controls do not move while a user starts interacting.
- Added the [transformation blueprint](../../docs/GROWTHTRACK_TRANSFORMATION_BLUEPRINT.md), grounded in this repository, including architecture choices, accessibility audit, copy examples, README template and documentation lifecycle.
- Verification: 67 focused tests across Notes, Markdown rules, encryption, store persistence and public pages pass; TypeScript and production build pass. Targeted JavaScript ESLint has zero errors and the existing App `user` dependency warning. The build retains a large Three.js chunk warning. The final Notes browser run passed all 12 Notes scenarios; after fixing explicit skip-link keyboard inclusion, a focused rerun passed all 3 public-page scenarios (Chromium, Firefox, WebKit). These fixtures intercept every API call and do not use owner data.

Remaining: full offline sign-in/startup, idempotent create/import retries, integer revisions and versioned sync, Notes knowledge workflows and native clients. Browser encryption uses a key available to the browser profile and does not protect a compromised profile. No production database or deployment was changed. This increment does not establish WCAG AA certification or full platform parity.

## Earlier implemented baseline

- Six-area typed route registry, canonical links/redirects, validated `view`
  parameter, public/login/not-found paths and full login return destination.
- Shared responsive shell, six page templates, reusable record/form primitives,
  theme/palette/density preferences, self-hosted Inter and reduced-motion,
  forced-colors, RTL and safe-area foundations. The mobile More menu reaches all
  six areas; the sidebar can always be reopened.
- Honest initial-load/offline/setup states; session-scoped store resets and
  logout choice to keep or remove local owner drafts. IndexedDB drafts are
  owner-keyed and never automatically submitted.
- Disabled simulated Apple Health writes. Legacy Apple-origin values remain
  intact and labeled unverified. The service worker caches build-versioned
  static assets only, not auth or personal API responses.
- Finance transaction/filter/export workflows, validated CSV preview and
  transactional commit with duplicate review, manual-price portfolio snapshots,
  nonfabricated forecasts, and Shopping acknowledged CRUD, quantity-aware
  estimates, CSV order preview, and confirmed expense conversion.
- Workspace private file upload/download with actual bytes, strict ownership,
  safe previews and explicit legacy metadata-only state; calendar view/ICS
  foundation; Notes/Tasks/Timesheet persistence work, including recoverable
  timestamp-based timers.
- Wellness mind/journal persistence work, recoverable workout draft and rest
  timer, atomic idempotent workout completion, location opt-in/list/map fallback,
  and persistent source-linked notification read/dismiss/preference state.
  Hydration now shows a recoverable load failure instead of an unhandled
  rejection or a false zero total when its history endpoint is unavailable.
  Nutrition charts keep responsive widths with explicit heights so they do not
  render against an unmeasured container.
- Authenticated backend AI streaming with consented context selection and
  model-readiness states; no unconfirmed agent write execution.
- Manual Social profile URLs and figures for GitHub, YouTube, Instagram,
  Facebook, X, and LinkedIn. These are explicitly **not live connections**.
  Bulk manual saves validate all rows, use owner/revision checks and transactions.
- AppSetting public allowlist prevents private notification state appearing in
  configuration, bootstrap or Hub's database browser. Audit metadata omits
  sensitive values.

## Not complete / release prerequisites

- Production OAuth/provider adapters and real incremental sync for calendar,
  Drive/OneDrive/Dropbox, all six social providers, Trakt and Setu AA are not
  live. Connection cards/URLs must remain setup-required until real credentials,
  permissions, budget and provider review are validated. CSV/manual workflows
  remain the usable fallback.
- Companion Swift/Kotlin source scaffolds exist, but signing/builds, secure
  pairing, ingestion, permissions and real-device verification are not complete.
  Health Sync therefore remains setup-required and writes no synthetic data.
- Shared Caddy HTTPS deployment, production SQLite/file volumes, desktop
  import preview for existing local data, token encryption/revocation and
  backup/restore rehearsal are not completed here. Do not use a development
  database as production storage.
- Minor-unit currency schema/backfill and migration verification, fully
  paginated domain reads, complete removal of legacy all-account bootstrap,
  and every page's CRUD/empty/error/detail/tab migration remain future work.
- Branded Chrome/Edge, real Safari and real Android/iOS devices were not
  tested. WebKit automation is not a substitute for Safari verification.
- Normal-route JS and critical CSS size targets, Core Web Vitals, and full
  accessibility audit still require a repeatable production-profile run.

## Verification run

- `npm test`: 568/568 unit tests passed (77 files).
- `node tests/unit/server-backend/run.mjs`: 47/47 isolated backend tests pass;
  the suite includes CSV transaction, file byte/ownership, workout atomicity,
  social revision/rollback, and safety regressions.
- `npm run typecheck`, `npm run build`, and `npm run lint -- --quiet`: pass.
  Full lint reports 95 warnings and zero errors. The built entry files measure
  94.0 KB JavaScript and 57.7 KB CSS gzip, but the complete initial dependency
  graph and runtime performance budget have not been measured.
- `npm run test:e2e`: 75/75 isolated fixture tests passed across Chromium,
  Firefox and WebKit at widths 320, 390, 640, 768, 1024, 1440, 1920 and 2560px.
  The suite includes every canonical module route, detects unhandled page
  errors and chart-sizing warnings, and checks Hydration failure/retry. These
  tests do not exercise owner data or real providers.
- Focused migrated Shopping, Training, Social and social backend files: ESLint
  clean. Repository-wide baseline warnings and untouched legacy modules still
  require cleanup.

See [ROUTES.md](ROUTES.md), [COMPONENTS.md](COMPONENTS.md),
[NOTIFICATIONS.md](NOTIFICATIONS.md), `server/backend-contracts.md`, and
`server/agents/README.md` for current contracts. The approved whole-app plan
remains the feature/acceptance target; this document marks implemented scope.

## Follow-up (2026-10-04)

`MASTER_PRODUCT_SPEC.md` inventories the original 54 registered module routes and their
views against the full product target; `NOTES_VERTICAL_SLICE.md` defines the first
reference slice. Notes now waits for create/save/delete acknowledgement, reports
unsaved/saving/failed states, preserves failed edits in the editor, and excludes
private Mind journal entries from Workspace search and tags. This does not add
revision-based sync, offline conflict recovery, native clients, or schema migration.
Focused Notes and store persistence tests passed (48 tests across 2 files), as did
Notes ESLint and TypeScript typecheck.

## Interface and companion follow-up (2026-10-04)

The current working tree adds six companion discovery routes, bringing the route
registry to 60 modules. The Ultimate Apps Suite now presents native Ultimate
destinations and explicit migration gaps for FinSync, OxFin, Forex, NiftyLens,
and Family Connect; it no longer embeds standalone sites or claims that their
identity/data has merged. Original applications remain available during migration.
The five local API, DB, and health page templates received responsive, focus,
and reduced-motion CSS. DB Studio opens SQLite read-only and renders record
values as text. At 390px, browser checks found no horizontal overflow on all
five templates. This is UI and safety progress, not companion feature/data parity.
