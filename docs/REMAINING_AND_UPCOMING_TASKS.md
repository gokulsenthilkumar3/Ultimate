# GrowthTrack workspace: remaining and upcoming tasks

Date: 7 November 2026. Scope: the whole workspace (Ultimate, FinSync, OxFin, Equity/NiftyLens, Forex, Family Connect, shared tooling, CI and documentation). This is a source and tooling review with real local runs and read-only reads of hosted CI. It is not a runtime QA of the product: no owner data, live provider, browser, device, installer or production system was used.

It consolidates the live items from the [engineering plan](Eng%20Plan.md) (E01–E12), the [22 October next implementation plan](NEXT_IMPLEMENTATION_PLAN.md), the [non-3D backlog audit](NON_3D_BACKLOG_AUDIT_2026-10-22.md), [implementation status](../growthtrack-ultimate/docs/IMPLEMENTATION_STATUS.md) and the dated plans in [`docs/plans/`](plans/), **after re-checking each against the code and tooling as of today**. Where an older item is already fixed it is listed under "Closed since the last audit", not repeated as work. It does not replace those documents; it is the single list to work from, with pointers back to them.

## 1. How to read this

| Label | Meaning |
| --- | --- |
| **Verified** | Reproduced or read in the source/tooling on 7 November 2026 (command and result in section 15). |
| **Reported** | Stated by a dated plan or audit and **not** re-verified today. Re-check before starting. |
| **Decision** | Needs the owner's choice, credentials or approval; no amount of coding settles it. |

Priority: **P0** blocks a trustworthy `main` or customer-data safety; **P1** is a correctness or foundation gap; **P2** is delivery/operations; **Upcoming** is planned but not started or waiting on a dependency. Nothing here is scheduled; the order in section 14 is a dependency order, not a calendar.

Limits of this review: hosted CI was read through the GitHub CLI (read-only); the secret-scan job redacts its findings by design, so its content is unknown. Companion apps (FinSync web/mobile, OxFin, Equity, Forex) were not built or run locally; their status comes from CI logs and their own plans. Nothing was fixed in this review except writing this file.

## 2. Snapshot

### 2.1 Repository and applications

Tracked files: Ultimate 2,249 (384 test/spec files), FinSync 330, Forex 234, Family Connect 138, `docs` 98, `scripts` 49, Equity 49, workspace `tests` 21, `.github` 11.

| Application | Role and state | Source |
| --- | --- | --- |
| `growthtrack-ultimate` | Authenticated desktop portal (React/Vite + Express + Prisma, SQLite). Native NiftyLens, Family and Forex modules; approved shared theme/shell and customer-admin presentation are in production source. `src/admin-demo` stays an isolated fictional demo. | [applications.json](applications.json) |
| `FinSync` (web, mobile) | Separate customer product; its admin belongs in Ultimate. Mobile and the older Expense Tracker are reference sources, not merged. | applications.json |
| `FinSync/OxFin` | Separate customer product. `services/*` are prototypes with incomplete manifests; `identity-service` login does not verify passwords and must never authorize real customers. | applications.json |
| `Equity/NiftyLens` | Independent Next.js app and market pipeline. Ultimate shows a native market watch backed by a public price cache; options/index providers are unconfigured. | [product connections](plans/2026-11-05-product-connections.md) |
| `Family Connect` | Express/Prisma/PostgreSQL API plus a legacy React frontend kept for compatibility; the native UI lives in Ultimate. See section 9. | [Family docs](plans/) |
| `Forex` | Python modelling and API; native Forex Studio reads bounded endpoints. `Forex-Ensemble-Prediction/` is a historical copy. | applications.json |

### 2.2 Health measured locally (Ultimate unless stated)

| Check | Result | Label |
| --- | --- | --- |
| `npm run typecheck` | Passes. | Verified |
| `npx eslint .` | **2 errors, 135 warnings** in 65 files. Errors are `no-undef` for `Buffer` in `tests/unit/family-bridge.server.test.js:30` and `process` in `tests/unit/security-policy.test.js:32` (node globals are not configured for those test globs). TypeScript files are not linted at all (config covers `js`/`jsx`). | Verified |
| `npx vitest run` (296 files, 2,980 tests) | **19 failed**, 2,961 passed, in 8 files; a ninth file (`family-bridge.server.test.js`) cannot load in this worktree because the Family backend's dependencies are not installed here. Failing: `PlayfulLanding` (6), `Skills.persistence` (4), `security-policy` (2, ten-second timeouts in real-browser CSP tests), `humanWardrobeBinding` (2), `WorkspaceHub` (2), `sectionNavigation` (1), `PremiumSidebar.foundation` (1), `App.areas` (1). | Verified |
| Root `npm run design:check` | Passes, 5 adapters. (Was failing on 22 October.) | Verified |
| Root `test:gateway` / `test:plan` | 8/8 and 16/16 pass. | Verified |
| `npm run repository:check` | **Fails**: missing relative screenshot links in three files under `growthtrack-ultimate/docs/redesign-research/2026-10-27/`. | Verified |
| Generated READMEs (`application-docs --check`) | 23 checked, pass. | Verified |
| `UI impact` / `UI handoff` drift checks | Verified, with `browserVerification` and `browserVisualSignoff` both still **pending**. | Verified |

### 2.3 Hosted CI on `main` (run for the merge of PR #26, 7 November 2026)

| Workflow | Result | Cause found |
| --- | --- | --- |
| Workspace contracts | **Fail** | (a) `FinSync/OxFin/services/schema.test.mjs`: `Cannot find package 'pg'` (ox-service manifest incomplete). (b) SQLite rehearsal test: `Cannot find package '@libsql/client'` imported from `server/domains/sqliteBackup.js` in a job that does not install Ultimate's dependencies. (c) "File ownership, configuration and documentation structure" step fails (reproduced locally, see above). |
| GrowthTrack platform builds | **Fail** | Container image: `vite build` cannot resolve `./build/uiBuildInfo.js`. The file is tracked, but `growthtrack-ultimate/.dockerignore` re-includes only `build/serviceWorkerPlugin.js` and `build/staticCompressionPlugin.js`. |
| Independent application builds | **Fail** | `npm audit --omit=dev --audit-level=high` fails for Family API (body-parser, compression, multer ×6, qs), FinSync and Equity; Family web fails at locked-dependency install; FinSync fails "Build without production credentials". |
| Security analysis | **Fail** | Redacted secret scan of commit history reports a finding (content hidden). |
| GrowthTrack CI Pipeline | **Fail** | Lint (3 errors); unit/component coverage, all four shards; authenticated browser fixture workflows in chromium, firefox and webkit. |
| Critical npm vulnerability gate | Pass | |

Hosted results describe `main` at the PR #26 merge, not this worktree.

### 2.4 Branch and work in flight

At review time no pull requests were open: PR #25 (Family admission) and PR #26 (Family graph and relationship preferences) were merged. The Family work in this document's section 9 is carried by the pull request from `claude/family-gedcom-interchange`, which merges `main` (including PR #26). The four conflicts (`FamilyTabContent.jsx`, `FamilyTree.jsx`, `MemberPicker.jsx`, `trees.routes.ts`) were resolved keeping both sides. PR #26 had removed the "Ultimate session · name" chip and the role label from the Family context; five Family tests used that text as a readiness cue, and the same text is what fails on `main`'s hosted unit shards. Those assertions are repaired in that pull request, and the stale UI handoff counts (205 to 207 destinations after PR #26) are regenerated there too.

## 3. P0: restore a trustworthy `main`

All items are small and mostly mechanical. None is fixed yet.

| ID | Task | Evidence | Done when |
| --- | --- | --- | --- |
| CI-01 | Make the container build see `build/uiBuildInfo.js` (re-include it in `.dockerignore`, or move the file). Re-run the image build and its health check. | Hosted platform-builds log; `.dockerignore` lines 17–18. | `docker build` of Ultimate succeeds in CI and locally. |
| CI-02 | Fix the two workspace-contract test dependencies. Declare/install `pg` for the OxFin schema test (or run it under its own manifest), and install or declare `@libsql/client` for the SQLite rehearsal job. | Hosted workspace-contracts log. | Both tests run and pass in the job that runs them. |
| CI-03 | Make `repository:check` pass: remove or repoint the missing screenshot links in the three research documents, or record their provenance as unavailable in `docs/evidence/artifacts.toon`. Do not fabricate screenshots. | Local run; hosted architecture step. | `repository:check` exits 0 and the register still says the files are unavailable. |
| CI-04 | Clear the high-severity runtime advisories without forcing downgrades: upgrade the direct dependencies behind body-parser/compression/multer/qs in Family API, then review FinSync and Equity paths; fix Family web's out-of-sync lockfile install. Review each dependency path rather than ignoring advisories. | Hosted independent-builds log. | Each job's `npm audit --omit=dev --audit-level=high` and locked install pass, with affected builds green. |
| CI-05 | Decide how to treat the history secret finding (the open Google API key alert is the known candidate): confirm provider-side revocation, then either rewrite history (a **Decision**), or document an allowlist for that specific finding. | Security-analysis job; [critical alerts plan](plans/2026-11-05-critical-alerts-and-performance.md). | The scan passes without hiding other findings, and the key is revoked provider-side. |
| CI-06 | Clear the lint errors: configure Node globals for `tests/unit/*.js`. Then add TypeScript parsing so TS/TSX is actually linted (see P1-06). | Local and hosted lint. | `npm run lint` reports zero errors. |
| CI-07 | Repair the stale unit tests, or the code they exercise, one group at a time: `Skills.persistence` (its `lib/drafts` mock lacks `readDraft`); navigation tests that still expect Customers first; `PlayfulLanding` (landing was redesigned: motion, poses, `data-animate`, status roles); the Family session and native-flow tests that waited for the "Ultimate session · Story User" chip PR #26 removed (repaired in the Family pull request); `humanWardrobeBinding`. | Local run and hosted shards. | All shards pass; no assertion is deleted just to pass. |
| CI-08 | Resolve the browser-workflow failures: the dock test expects "Customers" as the first link, but the navigation now orders `work, life, wellness, money, insights, customers, system` and migrates the old order, so the tests are stale unless the product intends otherwise (**Decision**); accessibility (axe) violations; "setup required" connection text. | Hosted browser jobs; `src/config/navigation.js:84`. | Chromium, Firefox and WebKit workflows pass. |

## 4. P1: correctness and data safety (verified still open)

| ID | Task | Evidence | Done when |
| --- | --- | --- | --- |
| P1-01 | **Strength and Training use different records, and Strength invents values.** Strength reads `metric_logs`; Training uses sessions/sets. Missing inputs become 50 kg and 8 reps (`StrengthMetrics.jsx:146`) and are shown as real volume. | Source. [Plan WELL-01](NEXT_IMPLEMENTATION_PLAN.md) | A completed workout shows in Strength after reload; missing values stay missing; legacy totals reconcile. |
| P1-02 | **Task recurrence does not create the next occurrence.** The form stores and displays `recurrence`; completing a task only marks it done. Only event reminders handle recurrence. | `Tasks.tsx`, `taskSlice.ts` (no generation), `notifications/reminders.js`. | Daily, weekly, month-end, leap-year and DST fixtures create at most one next occurrence, even on retry. |
| P1-03 | **Money is still floating point.** Integer mirrors (`amountMinor`, `limitMinor`, `costMinor`) exist but are `@ignore`d and unused as the source of truth. | `prisma/schema.prisma` lines 615, 635, 1211. [E04](Eng%20Plan.md) | A reviewed, reversible migration with reconciliation fixtures; range-safe API serialization. |
| P1-04 | **Typed record rows and the versioned Notes API are off by default and not rolled out.** `GROWTHTRACK_RECORD_ROWS` and `GROWTHTRACK_NOTES_V1` default to `0`; the calendar/holdings migration was rehearsed, not applied. | `server/config.js` lines 76–77; [typed records plan](plans/2026-11-03-ultimate-typed-records.md). | Validated rollout packet, backup first, then an authorized rollout. |
| P1-05 | **Startup still loads broad history through `/api/state`**, and several lists paginate in memory. Not re-measured today. | `server.js:605` **(Reported)**. [DATA-03](NEXT_IMPLEMENTATION_PLAN.md) | Small bootstrap plus versioned domain queries with honest cursors. |
| P1-06 | **Quality gates are weaker than they look.** ESLint covers only JS/JSX; the active `vitest.config.ts` has no coverage thresholds (they sit in `vite.config.js`); `tsconfig.json` sets `noImplicitAny: false`, includes only `src`, and the Express server is not type-checked. | `eslint.config.js`, `vitest.config.ts`, `tsconfig.json`. [QG-03, QG-04, E07](Eng%20Plan.md) | TS/TSX linted; thresholds enforced in the effective config; a bounded server config in CI. |
| P1-07 | **Coverage of the old single-file Express routes.** Remaining inline legacy CRUD/state routes still need extraction into domain services. | [audit remediation](plans/2026-11-04-audit-remediation.md) **(Reported)** | Routes extracted with URLs, order and security middleware preserved. |
| P1-08 | **OxFin bill parsing.** The old build blocker (missing `@/lib/billParser`) no longer appears in the route's imports, but OxFin was not built here. | Source. | OxFin builds in CI and parsing fixtures cover valid, invalid and error cases. |

## 5. Customer-data boundaries and security

| ID | Task | State today | Remaining |
| --- | --- | --- | --- |
| E01 | FinSync onboarding encryption | Server-side authenticated profile service with tests exists (`lib/server/profileService.mjs`); no public encryption key is read by the web app. **Verified** in source. | Key provisioning, legacy-ciphertext compatibility and migration dry run, storage-rule review, and an end-to-end run with the Firebase identity. Deployment steps, not code. |
| E02 | Customer-admin adapters | Ultimate has a **read-only**, paginated, audited adapter for FinSync and OxFin that returns 503 until `CUSTOMER_ADMIN_*` URL, token and reader lists are configured. **Verified**. | The product services must expose the matching `/api/admin/customers` endpoints with their own service identities; writes need a separate reviewed contract (field allowlists, versions, idempotency). |
| E03 | OxFin database TLS | `db.ts` now verifies certificates (`rejectUnauthorized: true`, optional `DATABASE_SSL_CA`) and no longer logs SQL text. **Verified**. | Confirm against the intended production database, test an untrusted certificate, keep it independent of payment work. |
| SEC-A | Secret and key hygiene | An exposed local key was rotated locally; the Google API key alert stays open and the history scan fails (CI-05). | Provider-side revocation, a history decision, and a fresh hosted CodeQL scan of the fixed boundaries. |
| SEC-B | Dependency advisories | Hosted audit gates fail (CI-04). | Dependency-path review per application. |
| SEC-C | Owner controls | MFA and scheduled backups are opt-in. Device/session inventory, revocation, sensitive-data export/deletion/retention and key backup/rotation are not built. | [SEC-01](NEXT_IMPLEMENTATION_PLAN.md). |
| SEC-D | Production edge | Caddy/TLS/cache isolation are documented. Live DNS/CDN/WAF, origin firewall, certificates and real service credentials need the production host. | **Decision** (hostname and provider). See [edge security](../growthtrack-ultimate/docs/PRODUCTION_EDGE_SECURITY.md). |
| SEC-E | OxFin prototype services | Incomplete manifests; `identity-service` does not verify passwords. | Keep out of the default launcher; replace or retire before any customer use. |

## 6. Delivery and operations

| ID | Task | Evidence and state |
| --- | --- | --- |
| E05 | Runtime policy. `.nvmrc` is 24.12.0 and CI follows it; the Ultimate Dockerfile and `deploy.yml` use Node 22; `windows-release.yml` uses 24. Record a supported-major matrix or align them; upgrade retained NiftyLens separately. | **Verified** mismatch. |
| E06 | Typed, versioned API contracts. Only Family has a scoped generated OpenAPI contract. Customer-admin and native-module boundaries come next, then existing records; reuse FastAPI's own schema for Python. | Reported plan, partly done for Family. |
| E07 | Incremental server type checking and extracting inline routes (see P1-06, P1-07). | Open. |
| E08 | Purpose-specific Forex dependencies. One `requirements.txt` serves both Dockerfiles; no runtime/training split yet. | **Verified**. |
| E09 | Workflow and recovery evidence: FinSync onboarding authorization, Family live ACL revocation/private documents, OxFin transfer replay and concurrency tests; a complete backup restore (database **and** uploaded bytes **and** keys/config). Database-only archives do not cover all state. | Open ([SAFE-01](NEXT_IMPLEMENTATION_PLAN.md)). |
| E10 | Tracing and safe diagnostics (bounded OpenTelemetry, attribute allowlists). | Not started. |
| E11 | Measured repository and frontend optimization: tracked-file inventory before any cleanup; entry/navigation load measurements; offline scope with session isolation. | Not started. |
| E12 | Provider ingestion and automation (Apple Health, wearables, bank, weekly digest): specify consent, provenance, deduplication, preview, recovery; one provider end to end first. | Not started. Health Sync stays setup-required. |
| REL | Windows: local 2.0.5 installer was built and install-verified from a working tree; signing prerequisites unchanged; public GitHub distribution remains the earlier release; CI builds record exact checkouts. Container image, HTTPS topology, persistent volumes and a restore/upgrade/rollback drill are not verified. iOS/Android workflows and real-device evidence are not done; WebKit automation is not Safari. | Reported ([installer plan](plans/2026-11-06-windows-installer-release.md), [deployment](../growthtrack-ultimate/docs/DEPLOYMENT.md)). |

Deferred until measured (Eng Plan): Ultimate PostgreSQL, durable queues/Redis, wider Turborepo/Nx, Argon2id, Tauri.

## 7. Product workflows by module

**Reported** by the 22 October audit and phase 4 of the next implementation plan; several rows may have moved since. Re-check each module's source before starting, and extend existing behavior rather than rebuilding it.

| Module | Remaining |
| --- | --- |
| Notes (reference slice) | Paginated/searchable UI; folders, templates; owned file-version attachments; server link index and accessible graph; durable offline cache and mutation outbox; native editor/storage. |
| Files | Folders, versions, attachments, permissioned sharing, upload cancel/retry, verified cloud providers; honest legacy plaintext handling. |
| Tasks / Calendar | Dependencies and complete Today/Upcoming/Board views; multiple calendar sources, recurrence exceptions, time zones, invitations, reliable reminders; two-way provider editing. |
| Projects / Skills / Goals | Owned projects and milestones instead of account blobs; evidence-backed skills; source-linked goal progress; server-managed GitHub access. |
| Timesheet | Billable and approval workflows; complete reports and exports. |
| Finance | Canonical accounts, splits, transfers, rules, attachments, reversible import runs, budget rollover, subscription price history. |
| Portfolio / SIP / Shopping | Transaction-based holdings and P&L, corporate actions, dated FX, saved scenarios, receipt-to-ledger links. |
| Wellness | Schedule-aware habits, sleep targets, private journal concurrency, versioned assessments, medical timeline and files, recipes, hydration reminders. |
| Physique records | Measurement, target and history workflows; progress-media ownership. (Model rendering is in section 11.) |
| Insights / Today | Source-linked Today read models, occurrence-based reminders, usable Upcoming/Snoozed/Dismissed, saved layouts, explainable forecasts. |
| Life | Consent-aware overview, real or clearly manual social/media records, location retention/export/deletion. |
| Hub | Real service/data health, import history, scoped logs, build-derived capabilities, billing where enabled. |
| Agents | Citations, opt-in durable history, reviewed action execution if kept in scope (chat is read-only today). |
| Notifications | Native/background delivery, opted-in email, delivery state and revocation. |
| Lifestyle companion | System-wide website blocking, start-at-login, multi-monitor persistence, click-through, charm library, voice chat, guaranteed background reminders ([plan](plans/2026-11-05-lifestyle-companion-implementation.md)). |

Shared foundations behind most rows: exact money and accounts (DATA-01/02), paginated domain APIs (DATA-03), normalized JSON collections (DATA-04), deployment ADRs (DATA-05), encrypted offline cache and outbox (OFF-01/02), complete recovery set (SAFE-01).

## 8. Integrations and companion products

Existing: four Sync Engine connectors (AMFI NAV, CoinGecko, Alpha Vantage, read-only iCalendar), Quick Capture, the customer-admin read adapter.

Remaining integrations (**Reported**): move GitHub, weather, geocoding and news behind server adapters with consent and provenance; sourced FX; Google/Microsoft two-way calendar and Drive/OneDrive/Dropbox; secure HealthKit/Health Connect pairing and ingestion; the bank/Open Finance provider choice (**Decision**); social and Trakt imports; an always-running worker for updates while the desktop app is closed. Provider tabs must stay setup-required until real consent and credentials exist.

| Companion | Remaining |
| --- | --- |
| FinSync | Account/transaction/budget mapping into the finance domain with reconciliation; revalidate its standalone auth claims; its SMS/email parsing and AI planning are extras, not blockers. |
| OxFin | Wallet/card/bill mapping without duplicating balances; keep payment execution separate; replace prototype services. |
| Forex | Forecast worker contract (pair, date, source, model version, uncertainty); reproducible fixtures; decide the duplicate nested source tree. |
| Equity/NiftyLens | Sourced charts, watchlists, options, alerts, portfolio analytics against its PRD; use canonical holdings; options/index providers unconfigured. |
| Family Connect | Section 9. |
| Expense Tracker Mobile | Decide retain or merge; map recurring bills, loans/chit funds, reminders and exports. |

Every migration: inventory, read-only preview, verified backup, deterministic IDs and deduplication, reversible import, parity checks; keep the source application until parity is proven (MIG-01/02).

## 9. Family Connect

**Merged to `main`:** per-account admission control on the bridge (PR #25); relationship preferences and the graph preview (PR #26); earlier Tamil relationships, compact workspace, hardening, service recovery and shared session.

**Built in this worktree, uncommitted:** GEDCOM export and reviewed import; date certainty and "deceased, date unknown"; durable audit trail with an admin reader; retry-safe import; storage-adapter boundary; one additive migration (`20261107120000_family_precision_audit_idempotency`, applied only to a throwaway PostgreSQL); a real-PostgreSQL integration suite. See the [completion plan](plans/2026-11-07-family-completion.md) and [interchange plan](plans/2026-11-07-family-interchange.md).

Remaining, in order:

1. **Land the in-flight work.** Done in the pull request from `claude/family-gedcom-interchange`: committed, `main` merged with the conflicts resolved, the Family backend suite (96 tests, including the PostgreSQL integration run against a disposable database) and the Family/native Ultimate suites re-run. What remains is review, merge and the hosted CI result.
2. **Apply the migration safely** (**Decision** and operator step): back up, rehearse on a restored copy, `prisma migrate deploy`, then stop Family and run `prisma:generate` on Windows. CI's PostgreSQL contract replays every Family migration, so it will exercise this one.
3. **Interchange follow-ups:** calendar (`.ics`) export of birthdays and milestones (needs recurring-birthday and time-zone rules), vCard export, public-holiday overlay (opt-in), browser-side OCR (consent), birthplace geocoding (consent, usage policy), notifications into Ultimate's centre, GEDCOM events/sources/multiple names/GEDCOM 7, background import for very large files.
4. **Roadmap items that need a decision or infrastructure:** per-document permissions and the file-object split (sharing default is a product decision); PostgreSQL row-level security (restricted role and per-request actor context); soft delete; verified member-to-account linking; outbox with consumers and Calendar/Tasks/HR integration; thumbnail/OCR/PDF workers; real-time collaboration and reviewed edits; successor-admin lifecycle and erasure policy; AWS/Azure storage adapters and rollout (interface and shared contract exist; cloud deployment is deferred by the owner).
5. **Known gaps:** relationship dates are exact-only; adoption/foster is a label on a parent link, not a type; the audit trail has no retention job or viewer, and reads are not audited; idempotency keys cover only GEDCOM import (cleanup runs on import commit); the legacy standalone Family frontend has no date-certainty controls and one `TODO` (`TreeCanvas.tsx:119`, fly to node/open detail).
6. **Evidence still missing:** the new forms and labels rendered in a browser and approved by you; document upload/download against real files; a real GEDCOM from Gramps or FamilySearch; production-size data.

## 10. UI, accessibility, performance and release evidence

- **Rendered sign-off is pending.** The UI impact and handoff checks report browser verification and visual sign-off as pending; component and fixture tests are not page approval.
- Finish adoption of semantic tokens and shared components; retire legacy CSS only when its consumers pass ([UX-01](NEXT_IMPLEMENTATION_PLAN.md)). Large components (ProfileEditor, Tasks, Projects, Training) still need splitting.
- Authenticated light/dark, narrow/tablet/desktop, 200% zoom, keyboard, screen-reader, forced-colors and reduced-motion checks, with chart alternatives; hosted axe violations already fail (CI-08).
- Touch targets: 1,014 of 3,055 measured interactive elements were under 40 px (mostly repeated record controls); pagination and row-exit motion were deliberately left unchanged ([Kinetic plan](plans/2026-10-30-kinetic-ui.md)). Legacy domain copy still contains emoji.
- Performance: production-profile startup and ordinary-route budgets, Core Web Vitals, memory with realistic history, cold 4G with CPU throttling, 120 Hz and long-session soak are unmeasured ([PERF-01](NEXT_IMPLEMENTATION_PLAN.md)).

## 11. 3D and avatar work (outside the non-3D audit)

Not audited in depth here. Known today: `humanWardrobeBinding.test.js` fails on the refined core and hero human; one `TODO` in `HumanoidClone.jsx:728` (map intensity to ambition progress); the 3D plans and assets live in [`growthtrack-ultimate/docs/3d-plans`](../growthtrack-ultimate/docs/3d-plans/README.md); asset provenance is checked by `npm run check:assets`. On-demand model packs and retiring an animation library need licence, offline and visual-parity work first.

## 12. Decisions only you can make

1. History secret finding: rewrite history or document an allowlist; confirm provider-side revocation of the Google key (CI-05).
2. Navigation order: is "Customers last" intended (then update tests) or should it lead again (CI-08)?
3. Whether and when to apply the Family migration, and whether to adopt per-document access, row-level security or soft delete (section 9).
4. Cloud provider for Family storage and any hosted deployment; production hostname and provider for the edge (SEC-D).
5. Bank/Open Finance provider, social and Trakt scope, and which health sources to support first.
6. Supported Node majors and whether to move Ultimate's container and deploy workflow to 24 (E05).
7. Ultimate PostgreSQL cutover criteria and object storage and worker model (DATA-05).
8. Retain or merge the Expense Tracker mobile app, and retain or remove the nested Forex copy.
9. Release scope, signing certificate and update channel for desktop and mobile.

## 13. Documentation debt

| Document | Problem |
| --- | --- |
| [implementation status](../growthtrack-ultimate/docs/IMPLEMENTATION_STATUS.md) | Verification section still reports 568 unit tests in 77 files; the suite now has 2,980 tests in 296 files. "Not complete" list partly stale. |
| [next implementation plan](NEXT_IMPLEMENTATION_PLAN.md), [non-3D audit](NON_3D_BACKLOG_AUDIT_2026-10-22.md) | Their baseline tables are 22 October: design drift is fixed, WORKSPACE port text is fixed (now 5300), the OxFin parser import is gone. Mark them historical or update the baselines. |
| [Eng Plan](Eng%20Plan.md) | Section 8 verification counts are dated 4 November; E01–E03 now have code that the plan describes as future. |
| `SPRINT.md`, `task.md`, `feature.md`, `RELEASE_NOTES.md` | Already labelled historical; keep out of live planning. |
| Master spec | Baseline statements predate Notes, quotes and calendar subscriptions. |
| This list | Keep one maintained backlog: owner, dependency, state, evidence and last-checked date per item (as the audit recommended); retire competing lists. |

Closed since the last audit (verified today): design adapter drift; `WORKSPACE.md` port text; OxFin certificate verification and SQL-text logging; the FinSync server-side profile service exists; a read-only customer-admin adapter exists; gateway and plan tests pass; typecheck passes.

## 14. Suggested order

1. **Restore green `main`** (section 3): the Docker ignore rule, the two dependency gaps, screenshot links, lint globals, stale tests, then the audit and secret decisions. Nothing else is trustworthy until CI is.
2. **Land the Family work** (section 9, steps 1–2) on top of the fixed `main`.
3. **Make the gates real** (P1-06): TypeScript linting, coverage thresholds in the active config, a bounded server type-check.
4. **Fix known wrong behavior** (P1-01, P1-02), then exact money and the typed-row rollout behind a verified backup (P1-03, P1-04, SAFE-01).
5. **Finish customer-data readiness** (section 5): deployment steps for E01–E03, dependency advisories, the secret decision.
6. **Foundations:** paginated domain reads, normalized collections, offline cache and outbox, deployment ADRs.
7. **Modules, connectors and companion migrations** one at a time against the dependency tables (sections 7–8).
8. **Release:** signing, native parity with real devices, performance and accessibility evidence, rendered sign-off.

## 15. Evidence log (7 November 2026)

| Command or read | Result |
| --- | --- |
| `npm run typecheck` (Ultimate) | Passed, 46 s. |
| `npx eslint . -f json` (Ultimate) | 2 errors, 135 warnings, 65 files with findings. |
| `npx vitest run` (Ultimate) | 296 files, 2,980 tests: 19 failed, 2,961 passed, 202 s; one file unloadable here for missing Family backend dependencies. |
| `npm run design:check`; `test:gateway`; `test:plan` (root) | Passed; 8/8; 16/16. |
| `npm run repository:check`; `application-docs --check` | Failed on three missing screenshot links; 23 READMEs OK. |
| `npm run impact:ui:check`; `handoff:ui:check` | Verified; browser sign-off pending. |
| `gh pr list`; `gh run list`/`view --log-failed` (read-only) | No open PRs; failures in section 2.3 for `main` at the PR #26 merge. |
| Source reads and searches | `.dockerignore`, `navigation.js`, `StrengthMetrics.jsx`, `Tasks.tsx`, `taskSlice.ts`, `schema.prisma`, `config.js`, `customerAdmin.js`, `db.ts`/`databaseConfig.ts`, workflows, Dockerfiles, plans. |

Not run: Docker locally, Playwright browsers, companion app builds (FinSync, OxFin, Equity, Forex), mobile builds, `npm audit` locally, Lighthouse, installers, any live provider, owner database or production system. The repository-wide TODO/FIXME scan found only four markers in source (listed in sections 9 and 11); a larger count of "setup-required" and mock-fallback paths is intentional and documented (feature catalog, Forex mock news fallback, OxFin gold-price helper pending a reachability trace).
