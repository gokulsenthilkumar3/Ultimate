# GrowthTrack / Tracker: remaining work excluding the 3D model

Audit date: 22 October 2026. Scope: the Ultimate application, shared workspace infrastructure, and companion product plans. Body measurement records remain in scope; model geometry, rendering, rigging, appearance and 3D asset work are excluded.

This is a documentation and source audit with targeted local checks, not a full authenticated product QA run. No owner database, private records, credentials or live provider accounts were inspected. No application logic, migrations or running services were changed.

The review indexed **126 non-3D project Markdown files**: 62 core documents, 61 companion documents and three historical UI/copy inventories. The large companion manuals and historical inventories were scanned for scope, requirements, unfinished work and contradictions; they were not individually runtime-certified. Another 55 model documents and 71 bundled Prisma tooling references were classified separately. See the [source index](NON_3D_DOCUMENT_INDEX_2026-10-22.md). The mixed Portfolio/3D plan was included for its finance requirements.

**Overall assessment**

The application has substantial working foundations. The main remaining work is completing the existing workflows and making their records safe across reloads, failures and multiple devices. The master inventory's original 54 routes contain 20 “Planned” and 34 “In progress” labels, with none marked “Verified” or “Released.” Six companion routes bring the current registry to 60. These are documentation labels, not a measured completion percentage: several “Planned” entries already have useful code.

Use [MASTER_PRODUCT_SPEC.md](../growthtrack-ultimate/docs/MASTER_PRODUCT_SPEC.md), the latest dated increments in [IMPLEMENTATION_STATUS.md](../growthtrack-ultimate/docs/IMPLEMENTATION_STATUS.md), and actual source together. Historical checkboxes alone are unreliable.

**1. Fix these concrete issues first**

| Priority | Finding and evidence | Required completion |
| --- | --- | --- |
| 1 | Two focused tests fail now: App Hub expects the old “Your workspace, one launchpad.” heading; Finance expects no `h1`, while the component explicitly owns its heading. [App Hub test](../growthtrack-ultimate/src/tests/appHub.test.jsx), [Finance test](../growthtrack-ultimate/src/components/finance/FinanceMigration.test.tsx), [Finance component](../growthtrack-ultimate/src/components/Finance.tsx). | Reconcile tests with the current page-heading contract; verify one useful page heading in the complete shell. Preserve the workflow assertions rather than merely deleting failing checks. |
| 1 | `npm run design:check` fails on stale `FinSync/apps/web/app/growthtrack-design.css`. The script stops at the first stale target, so this check does not establish the other adapters' state. [Generator](../scripts/sync-design-system.mjs). | Regenerate all five adapters from canonical tokens, review the diff, rerun drift checking, and include it in workspace CI. |
| 1 | ESLint skips TypeScript: running it on `src/components/Finance.tsx` reports “File ignored because no matching configuration was supplied.” [Configuration](../growthtrack-ultimate/eslint.config.js). | Add TS/TSX parsing and appropriate rules, then establish the actual baseline. A zero-error JS lint result is not whole-source lint coverage. |
| 1 | Effective Vitest configuration has **no coverage thresholds**. Thresholds exist in `vite.config.js`, while Vitest loads the separate `vitest.config.ts`. This was confirmed by loading the installed Vitest configuration. [Vite config](../growthtrack-ultimate/vite.config.js), [Vitest config](../growthtrack-ultimate/vitest.config.ts). | Consolidate test configuration and enforce thresholds in the config actually used by `test:run`; include meaningful domain/service coverage. `--coverage` enables collection but does not supply the missing thresholds. |
| 1 | Training reads workout sessions/sets, while Strength reads and writes `metric_logs`. Strength's fatigue calculation substitutes 50 kg, eight reps and three sets for missing/zero values, then labels a relative score as “% fatigued.” [Training](../growthtrack-ultimate/src/components/Training.jsx), [StrengthMetrics](../growthtrack-ultimate/src/components/StrengthMetrics.jsx), [workout actions](../growthtrack-ultimate/src/store/workoutActions.ts). | Use one canonical workout record path for both screens. Preserve legacy strength entries during migration. Remove invented input defaults, distinguish missing data, and label estimates and their method accurately. |
| 1 | Tasks exposes daily/weekly/monthly/etc. repeat options, but the completion action only marks the same record done. The inspected task paths contain no next-occurrence creation. [Task form](../growthtrack-ultimate/src/components/Tasks.tsx), [task slice](../growthtrack-ultimate/src/store/slices/taskSlice.ts). | Implement occurrence generation/completion rules, timezone and month-end behavior, and retry-safe reminders; or make unsupported repeat behavior explicit until implemented. Subtask editing already exists. |
| 1 | Calendar/holdings revisioned row APIs exist, but configuration defaults them off and the latest rollout record says the migration was rehearsed, **not applied**. Legacy whole-document writes can still overwrite another tab's edits or sync results. Live deployment flags were not queried. [Status](../growthtrack-ultimate/docs/IMPLEMENTATION_STATUS.md), [sync contract](../growthtrack-ultimate/docs/SYNC_ENGINE.md), [configuration](../growthtrack-ultimate/server/config.js). | Verify each installation's actual state, review backup/parity/rollback evidence, and finish the controlled rollout. Follow with multi-tab edit-versus-sync checks. This is largely rollout work, not a new API implementation. |
| 1 | Transaction amounts, budget limits and subscription costs still use `Float`; the transaction model lacks a canonical account/currency ledger. [Schema](../growthtrack-ultimate/prisma/schema.prisma). | Introduce integer minor-unit money plus currency, account linkage and reconciled migration fixtures before building more financial automation. Support fractional investment quantities separately from money. |
| 1 | Startup still fetches almost all domain histories through `/api/state`; logs fetch bounded batches and then paginate in memory. [Server](../growthtrack-ultimate/server.js). | Replace full-history startup with a small bootstrap and domain queries. Add server pagination/search and honest continuation metadata; wire Notes' existing paginated API into its list UI. |
| 1, companion | OxFin's bill parse route imports `@/lib/billParser`, but no matching source file was found. This corroborates the old build-blocker note; a full OxFin build was not rerun. [Route](../FinSync/OxFin/ox-fin-web/src/app/api/bills/parse/route.ts), [older verification](UX_UPGRADE_VERIFICATION.md). | Implement/restore the parser and its contract or explicitly disable the unsupported route, then verify the companion build. |

**2. Complete the shared data foundation**

- [ ] Durable, encrypted, owner/device-scoped record cache and mutation outbox. The current in-memory write queue and encrypted Notes drafts are useful, but do not provide full offline startup or queued cross-device writes.
- [ ] Offline startup/unlock policy, reconnect replay, stable mutation IDs, visible pending/failed/conflicting states, and account-switch/logout isolation.
- [ ] Extend integer revisions, receipts, tombstones and change feeds beyond Notes and the opt-in calendar/holdings implementation. Preserve both versions of sensitive concurrent edits.
- [ ] Normalize independently edited records still embedded in user JSON: skills, plans, manual projects, appropriate wellness histories and larger custom datasets. Migrate incrementally with original-column/content parity and rollback manifests.
- [ ] Versioned typed API contracts, stable error codes, domain validation and per-record permissions. Split remaining inline server routes into domain services as they are migrated.
- [ ] Decide and document the target database/deployment model. SQLite works for the current local/container topology; PostgreSQL, shared object storage and a separate worker are still target work, not prerequisites for every local fix.
- [ ] A complete scheduled recovery set: database **and** uploaded bytes **and** separately retained encryption keys/configuration. The verified database backup does not include uploaded bytes or keys; SQLite, logs and backup files are not encrypted by vault-upload encryption.
- [ ] Device/session inventory, revocation, export/deletion and retention controls; encryption-key backup, rotation and device-loss behavior.

Sources: [master specification](../growthtrack-ultimate/docs/MASTER_PRODUCT_SPEC.md), [transformation blueprint](GROWTHTRACK_TRANSFORMATION_BLUEPRINT.md), [deployment](../growthtrack-ultimate/docs/DEPLOYMENT.md), [Notes contract](../growthtrack-ultimate/docs/NOTES_API_V1.md).

**3. Finish the existing module workflows**

These are remaining target requirements, not claims that the screens are empty. Existing CRUD, subtasks, simple recurrence, budget alerts and basic dashboards should be extended, not rebuilt.

| Area | What remains to complete or implement |
| --- | --- |
| Notes | Paginated/searchable UI reads; folders and templates; attachment references to owned file versions; server link index and accessible graph; durable offline cache/outbox; native editor/storage adapters. Existing Markdown, links/backlinks/outline, history/restore, conflict retention, encrypted drafts and duplicate-note retry already work in the documented slice. |
| Files | Folders, file versions, attachment relationships, permissioned sharing, cancellation/retry behavior and verified cloud providers. Maintain truthful handling of older metadata-only records and plaintext legacy uploads. |
| Tasks | Working repeated occurrences, dependencies, complete route-backed Today/Upcoming/All/Completed/List/Board behavior, and one clear query/mutation path. Subtasks and failure-aware writes already exist. |
| Calendar | Complete row-storage rollout; multiple calendar subscriptions; advanced recurrence and occurrence exceptions; timezone edge cases, invitations and reliable reminders; eventual two-way provider editing. Simple recurring events, ICS import/export and one subscribed feed are already implemented. |
| Projects and Skills | Owned project/milestone records instead of account blobs; evidence-backed skills and learning plans; canonical task/time/goal links; server-managed GitHub authorization and pagination. |
| Goals and Timesheet | Source-linked milestone progress, explicit archive/completion behavior, billable/approval workflows and complete reports/exports. Goal subtasks, recorded sessions and recoverable timer foundations already exist. |
| Finance ledger | Canonical accounts, reconciled balances, splits, transfers, rules, attachments, versioned/paginated transactions and auditable reversible import runs. Existing CSV preview, duplicate review, transactional commit and filtered export should be retained. |
| Budgets and subscriptions | Rollover and reliable historical plans; renewal/price-change history; canonical links from commitments to ledger entries. Existing category/month budgets, warnings and manual cancellation recording are not missing features. |
| Portfolio, SIP and shopping | Transaction-based holdings/P&L, corporate actions and reconciled valuation history; currency conversion with dated sources; saved SIP scenarios/assumptions; durable purchase/receipt-to-ledger linkage. Live quote ingestion and shopping-to-expense conversion already have implementations. |
| Sleep, habits and lifestyle | Schedule-aware adherence and streak rules, normalized routine/history records, targets and source/freshness information. Complete all log/history/trend views and platform parity. |
| Mind, medical and assessments | Private journal concurrency/recovery; versioned assessments and longitudinal results; medical file/timeline linkage, units/source attribution and appropriate explanatory copy. Existing persisted mood/journal/vitals/medication records remain the foundation. |
| Training and Strength | Canonical programs, sessions and sets shared by both modules; truthful derived PR/volume/progression summaries; completed-session editing and failure recovery; native parity. Fix the separate data paths first. |
| Nutrition and hydration | Recipes/food lookup where selected, target provenance, durable reminders and native parity. Hydration already uses canonical metric events; do not introduce a second intake store. |
| Physique records only | Complete measurement/target/history workflows, progress-media ownership and accessibility, and native parity. Model/rendering work is excluded from this audit. |
| Insights and Today | A source-linked Today view: changes, required actions and trends; occurrence-based actionable reminders; saved dashboards/layouts; drill-down, sample size, freshness and uncertainty for analytics/forecasts. Basic Overview and Action Center implementations already exist. |
| Action Center specifically | Registered Upcoming/Snoozed/Dismissed views need distinct usable behavior. Current source renders the filtered active list and persists snooze/dismiss IDs, but does not expose the full registered view workflow. Dismissal IDs are broad categories, so define how a later occurrence becomes actionable again. |
| Life | Consent-aware overview; real social connections or clearly manual-only records; Trakt import with authorization/deduplication; location retention/export/deletion and native background-location behavior. |
| Hub | Actual service/data health, usable import history, scoped logs and recovery, task-based help, build-derived version/capability data, complete preferences and entitlement/billing workflows where billing is enabled. |
| Agents | Source citations and provenance; opt-in durable conversation history with retention/deletion; reviewed action execution if retained in scope. Current streamed chat deliberately has no tool/write execution. |
| Notifications | Native/background delivery and any opted-in email channels; channel-specific permissions, delivery state and revocation. Source-linked in-app reminders and read/dismiss/preferences persistence already exist. |

The full view contract also requires useful loading/empty/error/offline/conflict states, relevant import/export, owner isolation and keyboard/screen-reader access. Route registration does not establish those behaviors.

**4. Integrations and companion products**

Four Sync Engine connectors already exist: AMFI NAV through mfapi.in, CoinGecko prices, Alpha Vantage quotes and read-only iCalendar subscriptions. Quick Capture already covers expenses, income, water, sleep, weight, mood and tasks. Their presence must be reflected in older documents that say all data entry is manual.

Remaining integration work:

- [ ] Move GitHub, weather, reverse geocoding and news calls behind server adapters with cache, provenance and consent. Current Projects code sends GitHub requests with a browser-held token; Current still fetches third parties directly.
- [ ] Add sourced FX rates and currency conversion; optional broker holdings/CAS imports after canonical ledger and account mapping exist.
- [ ] Implement Google/Microsoft two-way calendar and Drive/OneDrive/Dropbox file authorization, refresh, revoke and incremental sync.
- [ ] Complete secure health-companion pairing, ingestion, deduplication, revocation and real-device validation. Health Sync currently remains setup-required.
- [ ] Make the bank/Open Finance provider decision and implement real consent/import/reconciliation if selected. CSV remains usable; no bank connector should be reported as live from a saved credential alone.
- [ ] Implement social and Trakt connectors only with real authorization and honest freshness/failure states.
- [ ] Move background jobs to an always-running worker for deployments that need updates while the desktop app/server is closed.

Current **Apps Suite embeds standalone companion UIs**: [UnifiedWorkspace.jsx](../growthtrack-ultimate/src/components/UnifiedWorkspace.jsx) contains an iframe. Their databases and native frameworks remain separate, as [UNIFIED_LOCAL_WORKSPACE.md](UNIFIED_LOCAL_WORKSPACE.md) explains. This is useful integration, but it is not the native workflow/data merge required by the master plan. Older implementation/source-audit text saying there are no iframes is stale.

| Companion | Remaining integration into Ultimate |
| --- | --- |
| FinSync | Map accounts, transactions, budgets, attachments and identity into the canonical finance domain; deduplicate/reconcile balances. Revalidate its standalone auth/setup claims and actual provider behavior. |
| OxFin | Fix the missing bill parser; map wallets/cards/bills/investments without creating duplicate account balances. Keep payment execution boundaries explicit and separate from tracking/import. |
| Forex | Define the internal forecast-worker/API contract with pair, input date, source, model/artifact version and uncertainty; verify feature parity and reproducible fixtures. The duplicate nested source tree needs an explicit retention decision. |
| Equity/NiftyLens | Implement/verify sourced charts, watchlists, options, alerts and portfolio analytics against its PRD; integrate canonical holdings rather than a second portfolio. The source inventory is much narrower than the complete PRD. |
| Family Connect | Map family spaces, memberships/invitations, relationships, memories, shared events and private files to record-level grants. Verify conflicts and file-byte/owner parity before importing shared records. |
| Older Expense Tracker Mobile | Decide whether it is retained or merged into the canonical mobile product. Its plans include fixed/variable recurring bills, loans/chit-fund installments, local reminders, PDF/CSV/XLSX export and offline backup/restore. Those requirements are not fully mapped in Ultimate's companion register. |

For every migration: source/entity inventory → read-only import preview → verified backup → deterministic IDs/deduplication → reversible import → counts/balances/file parity → owner/platform tests. Keep source applications and data until parity is established.

Source-plan extras should be separately prioritized, not silently made release blockers: FinSync's SMS/email parsing and AI budget planning; NiftyLens's screener/backtesting; Family Connect's public trees, collaboration, genealogy/DNA, video stories and multilingual expansion; Forex's proposed scenario, drift, uncertainty, ensemble and attention-model work. Proposed gains in old Forex plans are not verified implementation evidence. The old growth/fundraising sprint is a separate commercial plan.

**5. Finish UI consistency and release verification**

- [ ] Migrate remaining raw controls, inline colors/glass and module-specific feedback to the shared components and semantic tokens. Retire legacy CSS only when its consumers have passed checks; several legacy layers are still imported.
- [ ] Add an enforceable rule for new raw colors/inline presentation, with legitimate dynamic values handled deliberately.
- [ ] Break up large components during their workflow migrations: ProfileEditor, Tasks, Projects and Training; consolidate state ownership and repeated persistence patterns.
- [ ] Verify every registered view actually changes the task/content it promises. Wire URL state, browser back/forward and record deep links consistently.
- [ ] Complete authenticated light/dark, narrow/tablet/desktop, 200% zoom, keyboard, screen-reader, forced-colors and reduced-motion checks, including chart alternatives and long-list states. Historical static inventories and mocked route smoke tests are insufficient for full acceptance.
- [ ] Measure ordinary-route startup payload, data loading, memory and Core Web Vitals under a production build with realistic history sizes. Separate model-related budgets from this non-3D effort.
- [ ] Finish Windows installer/first-run/import/signing/update/rollback evidence. Current platform workflow provides container and health-companion builds, not a complete signed desktop/mobile release.
- [ ] Build the remaining iOS/Android application workflows and prove them on real devices. Health companion scaffolding and unsigned simulator builds are not whole-product parity.
- [ ] Verify the current encrypted-upload container image, HTTPS deployment, coordinated restore drill, upgrade/rollback and connector outages. The status document still contains an unfinished smoke-verification note; this audit did not rerun Docker or inspect remote CI.
- [ ] Add CI coverage for root gateway/design changes and required companion builds. Current main workflow path filters primarily cover Ultimate.
- [ ] Add release artifact checksums/provenance and appropriate dependency/secret/license checks; finish the production activation and support/recovery runbooks.

**6. Repair the documentation so this backlog remains usable**

1. Choose one maintained backlog with owner, dependency, implementation state, verification evidence and last-checked date per work item. Keep historical audit findings as history, not competing live task lists.
2. Update the master spec's baseline statements: Notes was locally migrated later; quotes and calendar subscriptions now exist; several basic workflows exceed their old inventory descriptions.
3. Correct `IMPLEMENTATION_STATUS.md` and `COMPANION_SOURCE_AUDIT.md` where they claim companion UIs are no longer embedded. Document current embedding separately from the target native merge.
4. Correct workspace port/setup contradictions: `WORKSPACE.md` still lists gateway 3000 in sections while the current workspace guide uses 5300. Distinguish standalone configuration defaults from launcher overrides.
5. Archive or clearly date `SPRINT.md`, `task.md`, root release notes and early audits. They mix Supabase/Firebase/local auth, old directory names, historical “production ready” claims and UI-only completion checkmarks.
6. Update agent memory and store migration guidance: old memory still recommends removed Firebase/Gemini imports, whole-calendar replacement and permissive historical Vite configuration. Those should not guide new implementation.
7. Mark fixed old audit items accurately: the historical 157 TS errors, unsafe Electron renderer and synthetic bank-sync writes are not the current baseline. Conversely, current tests/style gates are not all green.
8. Reconcile companion PRDs with code before checking them off. Preserve the legacy mobile requirements and unique Forex material before any source cleanup.
9. Link each screenshot/test result to the route/view, date, platform and fixture it actually proves. Old counts of UI elements or passing tests are not current acceptance results.

**Already implemented — avoid rebuilding these**

- Owner authentication, CSRF/session boundaries, Electron isolation and basic owner-scoped persistence.
- Six-area routing and responsive shell; public skip links and shared form/modal primitives.
- Notes revisions, immutable mutation receipts, history/restore, tombstones/feed, Markdown import/export, links/backlinks/outline, encrypted draft recovery and independent duplicate-note retry.
- Finance CSV preview/deduplication/transactional commit, transaction filters/export and basic budget/subscription workflows.
- Real file-byte upload/download and encrypted new vault uploads; verified SQLite snapshot/fresh-restore helpers.
- Recoverable training draft and atomic/idempotent workout completion; persistent timesheet sessions/timer.
- Source-linked persistent in-app notifications; manual Social records explicitly distinct from live authorization.
- Four Sync Engine connectors, Sync Center and Quick Capture.
- Container deployment scaffolding and CI jobs; health-companion source/build configuration. These are foundations with remaining operational/platform gates.

**Verification performed during this audit**

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` in Ultimate | Passed. |
| `node node_modules/vitest/vitest.mjs run src/tests/appHub.test.jsx src/components/finance/FinanceMigration.test.tsx --maxWorkers=2 --reporter=dot` | 14 passed, 2 failed. Failures described above. |
| `npm.cmd run test:gateway` at workspace root | 6 passed. |
| `npm.cmd run design:check` at workspace root | Failed on stale FinSync adapter. |
| `node node_modules/eslint/bin/eslint.js src/components/Finance.tsx` | File ignored; confirms TS lint configuration gap. |
| Load installed Vitest config through `createVitest({watch:false})` | Uses `tests/setup.ts`; `coverage.thresholds` absent. |

Full unit coverage, full lint, production builds, all companion builds, live browser flows, Docker, signed packages and devices were not rerun. Prior dated passing results remain historical evidence only. Tests used fixtures; no owner records were changed. Local focused-test output is retained under `.tmp/non3d-audit-tests.log`.

**Recommended execution order**

1. Repair the failing tests/design drift and make TS lint/coverage gates real; fix Strength's record split and task recurrence behavior.
2. Finish calendar/holdings row rollout and exact-money ledger migration; establish complete backups and paginated domain reads.
3. Finish Notes as the reference slice, especially durable offline behavior; apply the same pattern to Files, Tasks, Calendar and wellness logs.
4. Deliver the source-linked Today experience and prioritized real connectors, then companion workflow/data imports with reconciliation.
5. Complete route-level accessibility/performance evidence, native parity and signed/recoverable production distribution.
