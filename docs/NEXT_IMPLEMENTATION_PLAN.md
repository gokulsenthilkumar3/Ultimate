# GrowthTrack Ultimate: next implementation plan

Superseded for UI and integration direction by the [28 October desktop portal
and customer-admin plan](plans/2026-10-28-admin-redesign.md). Keep this document as
historical backlog context; FinSync and OxFin remain separate customer products.

- Date: 22 October 2026
- Status: planned
- Scope: Ultimate and its companion integration workflows, excluding the 3D model
- Planning branch: `GokulSenthilkumar/non-3d-next-implementation-plan`

The next delivery cycle should make existing workflows reliable, finish shared record and offline foundations, and then complete integrations and platform acceptance. This document defines the implementation sequence, dependencies and acceptance evidence. Merging this plan does not mark any implementation task complete or authorize a production migration or release.

**Scope and source of truth**

Included: finance, workspace, wellness records, insights, life, Hub, authentication/device controls, sync, backups, shared UI, companion migration and release engineering. Physique measurement/target/history records remain in scope. Geometry, rigging, rendering, materials, appearance and 3D asset work are excluded.

Use these maintained contracts with the actual code:

- [Master product specification](../growthtrack-ultimate/docs/MASTER_PRODUCT_SPEC.md)
- [Implementation status](../growthtrack-ultimate/docs/IMPLEMENTATION_STATUS.md)
- [World-class blueprint](WORLD_CLASS_BLUEPRINT.md)
- [Transformation blueprint](GROWTHTRACK_TRANSFORMATION_BLUEPRINT.md)
- [Notes reference slice](../growthtrack-ultimate/docs/NOTES_VERTICAL_SLICE.md) and [Notes API](../growthtrack-ultimate/docs/NOTES_API_V1.md)
- [Sync Engine](../growthtrack-ultimate/docs/SYNC_ENGINE.md), [deployment](../growthtrack-ultimate/docs/DEPLOYMENT.md), and [local workspace](UNIFIED_LOCAL_WORKSPACE.md)

The preceding audit indexed 126 non-3D project Markdown files in the local workspace. Some companion sources and recent Notes changes were local/uncommitted. Recheck those capabilities against the implementation branch before relying on them. The plan is self-contained and does not require the local audit artifacts to exist in a clean checkout.

All work items below begin as **planned**. Assign an implementation owner and PR before moving an item to **in progress**. Use **verified** and **released** only under the master specification's evidence contract; a passing web build does not establish native parity.

**Baseline to reproduce at implementation start**

These observations came from the 22 October local audit, not a fresh full CI run on this documentation branch:

| Observation | Evidence / implication |
| --- | --- |
| TypeScript passed; gateway tests passed 6/6. | Preserve these checks while fixing the remaining gates. |
| App Hub / Finance focused tests passed 14/16. | The failures concern an obsolete App Hub heading and the Finance heading ownership contract. Verify the complete page before changing assertions. |
| Design adapter drift check failed at the first FinSync adapter. | Regenerate and check all five targets; later targets were not certified by the failed run. |
| ESLint ignored `Finance.tsx`. | Current file patterns cover JS/JSX but do not lint TS/TSX. |
| Effective Vitest config had no coverage thresholds. | The thresholds in `vite.config.js` are not inherited by the separate active `vitest.config.ts`. |
| Training and Strength use different record paths. | Strength reads/writes metrics; Training uses sessions/sets. Strength also substitutes missing inputs with default weights/reps. |
| Task recurrence is selectable; the completion action only marks the task done. | Implement and test recurring occurrences end to end. |
| Calendar/holdings row APIs exist; the latest rollout note says migration was rehearsed but not applied. | Inspect installation capabilities before planning a controlled rollout. Do not infer the live flag from defaults. |
| Finance money fields remain floating point; `/api/state` loads broad histories. | Exact monetary storage and paginated domain access remain foundational work. |
| Apps Suite embeds separate companion UIs. | Embedding is the current integration mode; canonical workflow/data migration remains future work. |
| OxFin imports a missing `@/lib/billParser`. | Reproduce its standalone build and resolve the missing implementation or disable the unsupported endpoint explicitly. |

Preserve existing foundations: owner authentication/CSRF, canonical routing, Notes revisions/receipts/history/restore and draft recovery, CSV preview/deduplication, file bytes and encrypted new uploads, atomic workout completion, persistent notifications, Quick Capture and the four Sync Engine connectors. Verify the availability of recent local Notes duplication work before building on it.

**Delivery rules**

1. Deliver one coherent behavior per implementation PR. Each PR names its work-item ID, source records, affected routes and acceptance evidence.
2. Tests use isolated fixtures and disposable storage. Never use the owner's database or live provider account as an automated fixture.
3. Schema changes are additive first, with backup/fresh-restore proof, preview, deterministic mapping, parity and a rollback manifest. Keep compatibility paths until clients pass parity.
4. Separate code verification from installation rollout. Obtain any still-required authorization for owner-data migration, provider activation or release after preparing the reviewable evidence.
5. Update the relevant route/view status and implementation evidence in the same PR. Keep dates and failures visible; do not replace current results with older passing counts.
6. Apply shared accessibility, error/retry, source/freshness and ownership requirements during every phase. Final acceptance consolidates that evidence rather than postponing all UI quality work.
7. Preserve unrelated local changes and source applications. No cleanup, history rewrite, automatic owner-data reset or companion retirement is part of this plan.

**Phase 0 — establish trustworthy quality gates**

Owner area: engineering foundation. Dependency: none. Exit: checks exercise the intended source and report real failures.

| ID | Implementation | Acceptance evidence |
| --- | --- | --- |
| QG-01 | Resolve App Hub/Finance heading-contract drift. Inspect the routed shell and preserve meaningful launch/navigation/ledger assertions. | Both focused suites pass; each routed page has one useful primary heading; no workflow assertion is removed merely to obtain a pass. |
| QG-02 | Regenerate all companion design adapters and add drift checking to workspace CI. | `design:check` passes for all five targets; generated diff contains only intended token changes; missing source trees are reported as prerequisites. |
| QG-03 | Add TypeScript-aware ESLint configuration and inventory newly exposed findings. | Representative `.ts` and `.tsx` files are linted; new/changed source has zero errors; any existing debt is explicitly tracked rather than globally suppressed. |
| QG-04 | Consolidate Vitest setup and coverage configuration in the active config. Retain existing test discovery and add meaningful domain/service thresholds from a measured baseline. | Effective config exposes thresholds; a deliberately failing disposable threshold check exits nonzero; coverage results include the intended code. |
| QG-05 | Extend workflow path filters/jobs to root gateway/design changes and required companion checks. | A docs-only change has an appropriate lightweight check; gateway/token changes trigger their checks; required application jobs still run for application changes. |
| DOC-01 | Reconcile current status, ports, embedding, existing connectors and stale agent/store guidance. Date or archive historical plans without deleting unique requirements. | Maintained docs agree with source; old plans clearly identify their historical scope; links resolve in a clean checkout. |

Primary files: `growthtrack-ultimate/vitest.config.ts`, `vite.config.js`, `eslint.config.js`, the two failing test files, `scripts/sync-design-system.mjs`, `.github/workflows/`, and maintained documentation.

**Phase 1 — correct existing behavior and protect rollout**

Owner areas: Wellness, Workspace and operations. Dependency: relevant Phase 0 checks. Complete the backup work before any installation migration.

| ID | Implementation | Acceptance evidence |
| --- | --- | --- |
| SAFE-01 | Define a coordinated recovery set for SQLite, private file bytes, matching keys and configuration; add scheduled backup/retention and a restore rehearsal. | Restore to a fresh location; verify records, attachments, checksums and ownership. Demonstrate wrong/missing-key failure. A database-only backup is not called a complete recovery set. |
| WELL-01 | Route Strength and Training through canonical sessions/sets. Preview and map legacy strength metrics without double counting. Remove fabricated missing-value defaults and explain derived estimates. | A completed workout appears in Strength after reload; missing/zero inputs remain distinct; legacy totals reconcile; failure, duplicate retry and cross-owner fixtures pass. |
| TASK-01 | Implement recurrence series/occurrence identity, next-due calculation, completion/reopen/skip policy and reminders. Preserve existing subtasks. | Daily, weekdays, weekly, month-end/leap-year and DST fixtures; completing/retrying one occurrence creates at most one next occurrence; editing a series has explicit scope. |
| ROW-01 | Validate the existing calendar/holdings migration, inspect installation capabilities, then prepare and execute an authorized rollout separately from code changes. | Backup and rehearsal parity; stale-tab versus sync conflict; receipts/tombstones/restore; mirrored events remain read-only; profile saves cannot overwrite newer rows. |
| COMP-01 | Repair OxFin's bill parser/import contract or expose an explicit unsupported state, then build the companion. | Build resolves imports; parsing fixtures cover supported input, invalid input and error handling; no false successful parse. |

Primary files: `StrengthMetrics.jsx`, `Training.jsx`, `src/store/workoutActions.ts`, `src/store/slices/taskSlice.ts`, task UI, record/migration services, backup scripts and OxFin's bill parsing route.

For row-storage rollback, preserve and reconcile writes made after cutover. Turning off the flag only exposes retained legacy snapshots and is not a complete rollback procedure.

**Phase 2 — canonical records, exact money and scalable reads**

Owner areas: Finance and backend foundation. Dependency: QG-03/QG-04 and SAFE-01; extend the already validated Notes/record patterns.

- [ ] **DATA-01: money and account contract.** Record an ADR for amount representation, ISO currency, fractional investment quantities, rounding, transfers and balances. Use integer minor units for money; define safe API serialization and numeric bounds. Review legacy currency attribution rather than silently assigning a currency from current display preferences.
- [ ] **DATA-02: additive ledger migration.** Introduce accounts and exact amounts, preview conversion, reconcile per-owner/per-currency totals, preserve source values and support old clients until parity. A transfer affects two accounts without becoming income/expense twice. Negative/refund and duplicate-import cases are explicit.
- [ ] **DATA-03: paginated domain APIs.** Add versioned list/search/filter contracts and a small bootstrap. Migrate Notes UI first, then transactions, tasks, metrics, logs and database previews. Preserve cursors, filters and source totals across pages; avoid client-only pagination over an entire history.
- [ ] **DATA-04: normalize JSON collections.** Prioritize skills/plans/manual projects and independently edited wellness histories. Define record ownership, revision, tombstone, change feed and per-domain validation. Keep the original representation through reconciliation.
- [ ] **DATA-05: deployment ADRs.** Select local versus shared-server operation, PostgreSQL cutover criteria, object storage and worker lifecycle. Record native contract generation, family grants and encryption/key decisions before dependent implementation. Current SQLite fixes can ship independently of PostgreSQL adoption.

Exit evidence: exact ledger balances survive migration/import/export; cross-owner reads/writes fail; concurrent writers receive conflicts; cursor fixtures cover insert/delete during browsing; large-history loading is measured; clean upgrade and rollback rehearsals retain source records.

**Phase 3 — finish Notes as the offline reference slice**

Owner area: Workspace. Dependencies: SAFE-01, DATA-03 and the offline/key decisions from DATA-05. Native implementation also depends on the selected platform contract.

| ID | Implementation | Acceptance evidence |
| --- | --- | --- |
| OFF-01 | Encrypted owner/device-scoped record cache and persistent mutation outbox, separate from editor drafts. Store stable mutation IDs, expected revisions and acknowledged progress. | Previously authorized offline startup is supported under a documented unlock policy; process termination/reload retains pending work; first-time online sign-in requirements remain explicit. |
| OFF-02 | Reconnect replay, pagination/change cursors, conflicts and device/account lifecycle. | Lost acknowledgements replay once; both conflicting bodies survive; remote deletion is retained; account switch/logout cannot replay another owner's queue; unreadable ciphertext is recoverable without silent discard. |
| NOTE-01 | Complete paginated/searchable All/Pinned/Tags/Editor workflows; folders, templates and owned file-version attachments. | Create/edit/find/move/duplicate/import/export/history/restore flows work after reload; failed saves retain drafts; attachments enforce owner permissions. |
| NOTE-02 | Add server knowledge-link indexing, rename behavior and graph with an accessible list equivalent. | Stable links survive rename; ambiguity/unresolved links are explicit; backlinks/search cover records outside the currently loaded page; deleted/private journal records do not leak. |
| NOTE-03 | Desktop and native editor/storage/file adapters against the same contract. | Signed-in web/desktop flows and real iOS/Android offline/conflict scenarios pass before the module is marked verified. |

Web/desktop milestones may be delivered before native parity, but Notes remains **in progress** until the master specification's full platform contract is satisfied. Extend this same storage/queue pattern to the following modules rather than creating separate sync protocols.

**Phase 4 — complete each module's promised views**

Owner: the owning domain for each row. Dependencies: relevant Phase 2 records and Phase 3 offline contracts. Create one view card per registered view before implementation.

| ID / module | Remaining deliverables | Completion check |
| --- | --- | --- |
| MOD-01 Files | Folders, versions, attachments, permissioned sharing, upload cancellation/retry and legacy-file handling. | Bytes and metadata agree after failure/reload; every download checks permission; encrypted and legacy plaintext states are accurately labelled. |
| MOD-02 Tasks / Calendar | Dependencies and complete task views; multiple calendar sources, recurrence exceptions, timezone handling, invitations and reminders. | URL-backed views and browser history work; series edits affect the requested scope; repeated operations remain idempotent. |
| MOD-03 Projects / Skills / Goals | Owned projects/milestones, evidence-backed learning plans and source-linked goal progress/archive behavior. | A source task/workout/transaction changes linked progress once; manual annotations and milestones persist independently. |
| MOD-04 Timesheet | Billable/approval workflows and complete reporting/export. | Timer recovery, manual edits, timezone boundaries and exported totals reconcile. |
| MOD-05 Finance | Splits, transfers, rules, attachments, reversible import runs, budget rollover/history and subscription renewal/price history. | Accounts and period totals reconcile; imports are previewable, deduplicated, auditable and reversible. |
| MOD-06 Portfolio / SIP / Shopping | Transaction-based holdings/P&L, corporate actions, dated FX/valuation history, saved scenarios and purchase/receipt linkage. | Position and money totals reconcile; estimates disclose assumptions; purchased items cannot create duplicate expenses on retry. |
| MOD-07 Wellness | Schedule-aware habits/routines, sleep history/targets, private journal conflicts, versioned assessments, medical timeline/files, nutrition recipes/target provenance and hydration reminders. | Loading/empty/error/offline states, units, sources and histories are correct; derived values use canonical records and do not invent missing measurements. |
| MOD-08 Physique records | Measurement/target/history and progress-media workflows, ownership and native parity. | Works without WebGL; original measurements remain intact. No model/rendering changes belong to this item. |
| MOD-09 Life | Manual/connected social distinction, media progress and import state, location retention/export/deletion and consent-aware summaries. | Revocation and deletion affect the intended records; no screen claims a connection merely because a URL was saved. |
| MOD-10 Hub | Data/service health, import history, scoped logs/recovery, help, build-derived capabilities and configured billing/entitlements. | Health reflects actual dependencies; diagnostics exclude secrets; entitlement and billing states match the backend. |

Every view card includes its primary task, owned entities, API, relevant CRUD/import/export, search/navigation, empty/error/offline/conflict behavior, accessibility and platform evidence. Existing subtasks, basic budgets, simple calendar recurrence and working import flows should be extended rather than reimplemented.

**Phase 5 — source-linked Today, connectors and companion migration**

Owner areas: Insights, integrations, Finance and Life. Dependencies: canonical domain records, consent/permission contracts and reliable ingestion/retry.

- [ ] **INS-01: Today and actions.** Build “What changed,” “What needs you” and trend read models with record deep links. Complete Upcoming/Snoozed/Dismissed views, occurrence-based reminder identity, restore and timezone behavior. Add saved dashboard layouts and explainable forecast/scenario views with sample limits, source date and uncertainty.
- [ ] **CON-01: server-managed sources.** Move GitHub, weather, geocoding and news fetching behind bounded server adapters with consent, caching, provenance and owner-scoped secrets. Remove browser-held provider tokens from migrated paths. Add sourced FX rates.
- [ ] **CON-02: calendar/files.** Implement Google/Microsoft two-way calendar and Drive/OneDrive/Dropbox authorization, refresh, incremental sync, reconnect and revoke. Preserve manual/ICS workflows through provider outages.
- [ ] **CON-03: health and banking.** Complete secure HealthKit/Health Connect pairing, permissions, ingestion and deduplication. Make the bank/Open Finance provider decision separately; implement consent, account mapping and reconciliation only for the chosen provider.
- [ ] **CON-04: social/media and background delivery.** Add selected social/Trakt imports, channel-specific notification permissions and delivery state. Use a worker for deployments requiring updates while the desktop app is closed.
- [ ] **AI-01: grounded assistance.** Add citations to authorized source records and opt-in durable chat history with retention/export/deletion. If action execution is selected, implement an explicit review/confirmation contract and authorization checks; current chat must remain read-only until that is verified.
- [ ] **MIG-01: companion inventory.** Confirm each source tree/version is available in a clean checkout. Map FinSync accounts/transactions; OxFin wallets/cards/bills; Forex result contracts; NiftyLens markets/watchlists/options/alerts; Family Connect grants/memberships/memories/files. Decide whether the older Expense Tracker Mobile is retained or merged, preserving recurring-bill/installment/export requirements.
- [ ] **MIG-02: reversible companion imports.** Deliver one source at a time with read-only preview, deterministic IDs, duplicate/conflict review, backup, rollback manifest, owner mapping and reconciliation of counts/balances/files. Preserve standalone runtimes until feature and data parity pass.

Connector exit evidence: real consented-provider verification when activation is authorized, plus isolated outage/expiry/revocation/retry/duplicate fixtures. A setup screen or embedded application is not a completed connector or canonical data merge. Forex results must carry source/time/model version and uncertainty; speculative model-performance gains from historical plans are not acceptance evidence.

**Phase 6 — accessibility, performance and production distribution**

Owner areas: design/quality and release engineering. Dependencies: completed workflows for the intended release scope; native and operational decisions from DATA-05.

- [ ] **UX-01:** finish semantic-token/shared-component adoption, actionable copy, URL/deep-link behavior and retirement of unused legacy CSS; enforce rules against new raw presentation values with justified dynamic exceptions.
- [ ] **UX-02:** verify authenticated screens in light/dark, narrow/tablet/desktop, 200% zoom, keyboard, screen-reader, forced-colors and reduced-motion modes. Include chart alternatives, populated/empty/error/offline states and focus restoration.
- [ ] **PERF-01:** measure production-profile startup and ordinary-route JS/CSS, query volume, long-history rendering and memory. Set budgets from recorded baselines and verify improvements on representative low-end devices. Keep 3D budgets outside this plan.
- [ ] **SEC-01:** complete device/session inventory and revocation, sensitive-data export/deletion/retention, key lifecycle and device-loss recovery. Verify cross-owner denial and safe diagnostics.
- [ ] **REL-01:** validate the current encrypted-upload container image, HTTPS topology, persistent volumes, worker outages and complete restore/upgrade/rollback drills. Publish the supported deployment modes and runbooks.
- [ ] **REL-02:** complete Windows first-run/import/update/rollback and signed distribution; deliver native workflows with real iOS/Android device evidence. Unsigned health-companion builds do not establish whole-product support.
- [ ] **REL-03:** retain build hashes/provenance, dependency/secret/license checks, reports and release capability status. Activate production only after the intended release scope satisfies its gates.

Exit: required views have recorded functional, accessibility, platform and performance evidence; releases have signed/distributed artifacts and a successful deployment/restore rehearsal. Unfinished capabilities stay explicitly planned or in progress.

**Initial implementation PR sequence**

| Order | Suggested PR scope | Dependency |
| --- | --- | --- |
| 1 | QG-01: restore App Hub/Finance contract tests. | Reproduce audited failures on the implementation branch. |
| 2 | QG-02/QG-05: refresh adapters and wire workspace drift checks. | All configured companion targets present. |
| 3 | QG-03/QG-04: TS lint and effective coverage configuration. | Measure the real baseline; keep unrelated source fixes in follow-up PRs if needed. |
| 4 | SAFE-01: complete backup set and restore proof. | Isolated fixtures and chosen key-storage policy. |
| 5 | WELL-01: canonical workout-derived Strength, with legacy mapping. | Relevant quality gates and fixture reconciliation. |
| 6 | TASK-01: retry-safe recurring occurrences and reminders. | Recurrence/date policy recorded. |
| 7 | ROW-01: calendar/holdings compatibility verification and rollout packet. | SAFE-01; separate authorized installation step. |
| 8 | DATA-01/DATA-02: exact money/account ADR and additive migration, split into contract and migration PRs. | SAFE-01 and reviewed financial parity fixtures. |
| 9 | DATA-03: Notes pagination, then one domain per follow-up. | Stable versioned list/search contracts. |
| 10 | OFF-01/OFF-02: durable Notes cache/outbox and recovery. | Offline/key ADR and paginated/change-feed behavior. |

DOC-01 and COMP-01 can ship as independent focused changes. Later module, connector and release work is selected from the dependency tables above; it is not bundled into the initial quality PRs. No calendar delivery estimates are assigned before ownership and scope are agreed.

**Validation and evidence record**

For this documentation-only change: validate Markdown structure, relative links, whitespace and the staged diff. Application tests are not a substitute for reviewing the plan and need not be rerun solely for this file.

For subsequent implementation, select the checks required by the affected behavior. Commands below are existing entry points, not a claim that all currently pass:

```powershell
# Workspace routing and generated design adapters
npm.cmd run test:gateway
npm.cmd run design:check

# Ultimate application checks
npm.cmd --prefix growthtrack-ultimate run typecheck
npm.cmd --prefix growthtrack-ultimate run lint
npm.cmd --prefix growthtrack-ultimate run test:run
npm.cmd --prefix growthtrack-ultimate run build

# From growthtrack-ultimate, using isolated backend fixtures
node tests/unit/server-backend/run.mjs
npm.cmd run test:e2e
```

Targeted suites should reproduce the changed behavior before broader required gates. Migration evidence includes backup, restore, old/new parity and failure rollback. Provider evidence distinguishes fixtures from live authorized checks. Native and production checks run on suitable build hosts/devices; no simulated success is recorded when those environments are unavailable.

Maintain this record with each delivered work item:

| Work-item ID | Status | Owner / PR | Verified commit | Checks and evidence | Limitations / next action |
| --- | --- | --- | --- | --- | --- |
| Plan baseline | planned | Planning PR | Set by PR commit | Documentation checks only | Implementation work has not started in this PR. |

**Explicitly deferred product choices**

Broker/payment execution, trading/backtesting, advanced Forex model research, genealogy/DNA, public family sharing, new monetization/referral programs and fundraising/marketing tasks require separate scope decisions. Preserve their source requirements, but do not turn them into blockers for completing the existing private tracker.
