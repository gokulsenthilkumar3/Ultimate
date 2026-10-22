# GrowthTrack implementation status (baseline 2026-09-29; updated 2026-10-22)

This is an implementation snapshot, not a claim that the whole approved plan is
production-ready. Scope is Ultimate and its repository build workflows. The
additive local Notes migration was applied after a verified backup/restore and
parity rehearsal; its snapshot contained zero Notes. Owner storage was not
reset or used by automated tests. Companion product data was not merged.

## Model measurements, independent figures and Notes duplication (2026-10-22)

- **Physique → 3D → Measure → Model fit** reports estimated neutral chest/waist/hip contours, entered targets and differences in the selected units. Triangle intersection and closed-contour traversal handle seam duplicates and reject open/ambiguous sections. Reports remain separate for Current/Goal and clear after meaningful input changes. Fixed preview landmarks are not calibrated anatomy; automatic fitting remains open.
- **Cloned rig isolation:** morph-dependent pivot updates previously changed inverse-bind matrices shared with the cached GLB and other figures. This caused misplaced hair/eyes on later loads. Each figure now owns those matrices while its bound surfaces share a consistent inverse pose. Full/lite regressions reproduce the old corruption and verify the repair.
- **Workspace Notes → Duplicate note** copies editable content into an independent record. Failed creation retains the same ID/payload for retry through the versioned API's receipt mechanism. Failed source saves, newer drafts and account switches are preserved. Private journal/ownership/revision metadata is excluded. Notes remains in progress; full offline/outbox and native gates are unchanged.
- **Evidence:** 46 focused tests in six files passed; a further 29 model/rig tests in four files passed (11 overlap). Ten Chromium continuation flows passed together; the model measurement flow passed again after the rig repair. See [the continuation record](real-human-3d/15-model-measurements-and-clone-isolation.md) for methods and reproducible commands.

This continuation changed no GLB assets, database schema or owner records and performed no deployment. Existing local work was retained.

## Anatomy access, anatomy shape and skin colour (2026-10-19, second pass)

- **Anatomical mode was unavailable** for an adult male owner: the model base came only from the body profile's biological sex, which was empty, so it loaded as "neutral" and the gate refused. The account's own sex or gender is now the default body base (the body-profile value still wins), so the gate passes for an eligible adult; date of birth and every other safeguard are unchanged.
- **Anatomy rebuilt** (`make_private_anatomy_mesh`): a curved, slightly flattened shaft whose root sits flush with the pubic skin and continues inside the body (no open edges), a subtle coronal ridge and closed glans, and a two-lobed scrotum (median raphe, left side lower) embedded in the perineum between the thighs. It is bound rigidly to the Hips bone. The morph range now equals the accepted 3–16 cm / 5–14 cm input range, measured along the centreline and at mid-shaft from the GLB (layout in mesh extras), so typical sizes are drawn as entered; unset values draw the Veale mean. In the app it gets pigment vertex colours and a procedural bump map for scrotal folds, and the body shows pubic hair (following the profile's body-hair pattern and colour) only while the anatomy is revealed.
- **Skin colour:** Fitzpatrick tones were display values used as linear light, so every tone kept the texture's own light tone with a green shift (grey, lifeless skin); they are now converted, and the tint range reaches types I–VI. The AgX tone mapper desaturated skin further; the viewer now uses Khronos PBR Neutral.
- **Bruise-like smears** on the cheek, neck and torso came from the albedo occlusion bake: 12 noisy rays reaching ~38 cm and cavity occlusion bleeding out of the ears, nostrils and mouth. The bake now uses 64 rays, ~8 cm reach and two smoothing passes, and burns at most ~9% darkening into colour.
- Promoted: full `faea01f2…`, lite `3fa9ae0a…` (previous files in `.tmp/glb-promotion-backup-adult-20261019`); `ASSET_REVISION` `clean-skin-20261019`.
- Evidence: Blender close-ups at minimum, mean and maximum sizes; signed-in app checks of anatomical mode (front), pubic hair on/off with the wardrobe, and the face; both GLBs validate; `check:assets -- --release`; calibration re-measures exactly 3.000–16.000 cm and 5.000–14.000 cm; backend 105/105; typecheck and lint clean; frontend 687/691 in the full run with the pre-existing app-hub and Finance heading failures and two persistence tests that time out only under full-suite load (they pass alone).
- Still open: the anatomy is project-modelled, not scanned or authored (no foreskin variant, no fine skin detail); pubic hair is shading, not strands; the A-pose and shallow shape keys remain; no female asset or photo fitting.

## Humanoid realism pass (2026-10-19)

- **Asset** (rebuilt from the same pinned CC0 sources plus three approved targets; [ASSET_LICENCE_RESOLUTION.md](ASSET_LICENCE_RESOLUTION.md) §4b): the base is MakeHuman's default adult man (universal young-male macro plus the African, Asian and Caucasian male-young targets at ⅓ each) instead of the androgynous zero-macro mesh. CC0 eyebrows (eyebrow001) and eyelashes (eyelashes01) are added and head-parented like eyes and hair. The anatomy placeholder is anchored to six HM08 pelvis vertices and follows body morphs (rest gap 3.9 mm, previously floating). The albedo AO bake has a floor so cavity vertices no longer leave grey smears at the eye and mouth corners. Promoted: full `9ed4afbb…`, lite `adb36e49…`; previous files in `.tmp/glb-promotion-backup-cc0-20261019`; `ASSET_REVISION` is `adult-male-features-20261019`.
- **Renderer:** skin tone is applied relative to the texture's own tone (the full Fitzpatrick colour on a tan albedo rendered orange); body hair and veins are smooth shading instead of hashed dots. The main cause of speckled skin was the colour-dodge film grain: `NoiseEffect` has no `opacity` option, so it ran at 100% instead of 4–8% whenever Film Grain was on. Hair cards are opaque and alpha-tested, tinted relative to their texture and without clearcoat (they previously rendered near-black with grey glints and sorting holes). A hair-coloured scalp layer now sits under card styles too, with its hairline derived from the rest-pose stature (the old absolute heights no longer matched the head) and a soft fade. Brows and lashes are blended strand masks (alpha testing left dashes).
- **Server status banner:** `/api/health` returned the HTML diagnostics page to `fetch()` (it accepts `*/*`), so the app showed "Server unavailable" on every page. The client now asks for JSON and the server sends HTML only when it is preferred. The server half applies after the API process restarts.
- Anatomy display limits at 175 cm are now 11.1–21.7 cm length and 13.3–19.2 cm circumference (body height 1.7304 units).
- Evidence: checked in the signed-in app at `/wellness/physique?view=3d` (full body and head close-up): adult male, smooth skin, full hair coverage, visible brows, no console errors. Both GLBs validate, `check:assets -- --release` passes, backend 105/105, typecheck passes, lint has 0 errors. Frontend 683/685; the 2 failures are the pre-existing app-hub heading and Finance heading tests, which also fail without these changes (an earlier run added three load timeouts that pass in isolation).
- Still open: short02 is a straight-cut fringe; a faint smear remains on one cheek; shape keys stay shallow; the anatomy placeholder cannot draw typical sizes; there is no female asset or photo-based fitting; the owner-authenticated Playwright visual test was not run.

## Humanoid asset licence: pinned CC0 sources and parity (2026-10-19)

- Added a reproducible CC0 source pipeline (`npm run humanoid:fetch`, `humanoid:compile`; converter defaults now read the compiled CC0 tree) pinned to MakeHuman v1.3.0 commit `1f508f60` and the CC0 system-assets zip, with git-blob and SHA-256 verification. Candidate GLBs (full and lite) match the old-source builds except three body morphs (≤ 0.75 cm at full weight) from upstream target edits; textures are pixel-identical. Details in [ASSET_LICENCE_RESOLUTION.md](ASSET_LICENCE_RESOLUTION.md).
- Promoted the CC0 builds (after the same eye/hair head-parenting post-steps as before): `humanoid-base.glb` sha256 `8c1bc31e…`, lite `cae6d4c6…`; previous files backed up under `.tmp/glb-promotion-backup-20261019`. Provenance is fully verified and `check:assets -- --release` passes; `ASSET_REVISION` bumped to `cc0-sources-20261019` so clients refetch. Evidence: GLB validation and health pass for both files, calibration test re-measures both, 20 renderer/morph test files (110 tests) pass, backend 103/103, Blender renders of the promoted model are pixel-identical at rest. The owner-authenticated Playwright visual test was not run (needs owner credentials).
- Model review (Blender renders, anatomy hidden): recognisably human but reads younger than an adult male; hair shows holes, eyebrows/lashes missing, facial texture smudges. Shape keys are shallow: full `overall_mass` adds ~11 cm waist; a 118 cm waist profile renders at ~98 cm. No photo-based customisation exists.

## Digital twin anatomy safeguards and asset provenance (2026-10-19)

- Anatomical mode is adults-only (saved date of birth, enforced in the renderer and therefore in body export), never shows the shipped male placeholder on a female or neutral base, and requires assets to declare their anatomy. Size inputs are centimetres with published reference ranges and geometry-derived morph mapping; the placeholder's drawable range is disclosed. See [ANATOMY_ASSET_PLAN.md](ANATOMY_ASSET_PLAN.md).
- Added `ASSET-PROVENANCE.json` and `npm run check:assets` (CI). The MakeHuman-derived body, skin, eye and hair components are recorded as licence-unresolved; release mode fails until resolved.
- Evidence: policy, calibration (re-measures both GLBs), visibility, mapping and provenance tests pass; backend suite 103/103; frontend 674/676 with the two failures being the pre-existing Finance heading test and a load timeout that passes in isolation; typecheck and build pass. Not verified in a signed-in browser session.

## Validated backend configuration and hardening (2026-10-18)

- `server/config.js` validates and freezes every backend setting with documented defaults and env overrides ([CONFIGURATION.md](CONFIGURATION.md)); startup lists every invalid value. Companion URLs, origins, CSP frame ancestors, retention, probe timeouts, body limit, rate limit, record limits and all Sync Engine intervals, caps, timeouts and provider hosts now come from it.
- Fixes: final JSON error handler (malformed/oversized bodies no longer return HTML), graceful SIGTERM/SIGINT shutdown, bounded rate-limit/login/handoff maps, production refuses an ephemeral `HANDOFF_SECRET`, the health page reports the real database file and configured links, and the desktop app enables record rows only when its own database has them.
- Evidence: 9 configuration tests and a configured-limit records test; backend suite 98/99 with the remaining file (`social-profiles`) passing 3/3 in isolation (known Windows SQLite cleanup flake); live boot with the owner's `.env` returned JSON for malformed input.

## Calendar and holdings as revisioned rows (2026-10-18)

- Added the additive `20261018120000_record_rows` migration (`calendar_events`, `portfolio_holdings`, `record_mutations`, `record_changes`), a shared revisioned record service and `/api/v1/calendar/events` and `/api/v1/finance/holdings` with receipts, 409 conflicts carrying the current record, tombstones, revive and a change feed. Gated by `GROWTHTRACK_RECORD_ROWS=1` plus a startup schema check; off by default.
- The Sync Engine writes rows when enabled; Calendar and Portfolio write one record at a time with the revision they read and show the newer version on conflict. Whole-document legacy writes are refused after migration, and profile saves no longer carry stale portfolio/calendar copies.
- Evidence: 7/7 record backend tests (migration parity and rollback, owner isolation with shared ids, receipts, tombstones, read-only mirrored events, stale client vs sync), 88/88 backend suite, 644/645 frontend tests (the remaining failure is the pre-existing Finance heading change), typecheck, lint and build. `npm run migrate:records` rehearsed on a verified backup of the local database: 3 owners, 1 event, 0 holdings, parity verified. **Not applied**; the flag remains off.

## Sync Engine and Quick Capture (2026-10-18)

- Added `/api/v1/sync` with four live connectors: AMFI mutual-fund NAV (mfapi.in), CoinGecko crypto prices, Alpha Vantage stock/ETF quotes (owner key) and iCalendar subscriptions. Connections are sealed in `integration_credentials`, outbound requests are SSRF-guarded, and a scheduler refreshes each source on its interval. See [SYNC_ENGINE.md](SYNC_ENGINE.md).
- Portfolio accepts dated, attributed quotes and offers Refresh prices; Calendar mirrors subscribed feeds as read-only events; Settings → Connections hosts the Sync Center.
- ⌘K Quick Capture saves expenses, income, water, sleep, weight, mood and tasks from one sentence after a visible preview.
- Evidence: 8/8 sync backend tests, 7/7 parser tests, 13/13 Portfolio tests; typecheck and production build pass; a live check priced a real NAV and BTC and parsed a public Google Calendar feed (75 events, 0 rejected). Calendar events and holdings remain whole-document JSON, so a stale tab can overwrite a sync until the next run. See [the redesign blueprint](../../docs/WORLD_CLASS_BLUEPRINT.md).

## Notes contracts and deployment foundation (2026-10-06)

- Implemented `/api/v1/workspace/notes` with owner/kind isolation, strict contracts, integer revisions, append-only history, soft deletion, restore, immutable mutation receipts and a bounded cursor feed. Legacy clients remain compatible with unmigrated storage; enabled installations share the same canonical rows/history. Private journals cannot silently change domain through metadata.
- The web client selects the versioned port through capabilities, keeps stable IDs across ambiguous create/import/recovery retries, offers revision history/restore, and avoids duplicate manual writes after acknowledged autosave. Visible clients refresh the feed and preserve the highest revision/tombstone; account switches prevent late publication. Read revisions and unfinished editor text survive remote refreshes.
- Added Markdown knowledge links, stable copied ID links, ambiguity/unresolved-link resolution, backlinks and an accessible outline. Code/HTML/escaped brackets and ordinary Markdown captions remain literal. Knowledge currently derives from loaded owned records; a server link index, folders and graph remain pending.
- Added verified SQLite backup/fresh-restore and migration rehearsal helpers. Applied the additive migration locally and enabled its capability; see [rollout evidence](NOTES_API_V1.md). Backups/rehearsal copies remain plaintext in ignored private storage.
- Docker image now contains the generated Prisma client, server contracts and production frontend. Compose provides persistent storage, Caddy HTTPS, file-mounted secrets, a non-root read-only runtime, explicit fresh initialization and health checking. Packaging no longer runs `db push` against owner storage. See [deployment instructions](DEPLOYMENT.md).
- New vault uploads support authenticated AES-256-GCM storage with an explicit key; existing plaintext files retain compatibility and accurate labels. This does not encrypt SQLite records, logs or backups. Keys must be retained separately from data.
- Added real-container smoke and CI platform build gates, including macOS simulator compilation and Android companion tests/lint/debug builds. Native jobs are configured but have not been executed in this Windows session. They cover existing health companions, not complete native Ultimate workflows.
- Evidence so far: 69/69 isolated backend/migration/storage tests pass; sync/editor/adapter focused tests pass; typecheck and production build pass. Container build passed before the encryption increment; the updated image smoke run and final browser/source runs are still being verified. Locked dependency updates resolve the reported brace-expansion, moment and HTTP cache advisories; the install audit reports zero known vulnerabilities.

Remaining: encrypted device record cache and persistent mutation outbox, offline cold-start/sign-in, paginated UI reads, Notes folders/templates/attachments/graph and native clients; PostgreSQL/object storage/worker cutover; complete companion parity imports; all modules' full view workflows and platform release gates; real providers, signing, devices and production operations. Notes remains **in progress**. Older dated sections below record their evidence at that time.

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
