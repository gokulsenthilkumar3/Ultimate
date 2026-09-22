# GrowthTrack Full-System Audit

Date: 2026-09-21
Method: gstack health workflow, repository inspection, build/test execution, dependency audit, and unauthenticated browser review.

## Remediation update — 2026-09-22

The initial P0 blocker set has been repaired and verified:

- TypeScript: 157 errors reduced to zero.
- ESLint: 127 errors reduced to zero; remaining React migration findings are warnings and stay visible.
- Coverage: the missing provider is installed; 47 files and 282 tests pass with coverage thresholds.
- Dependencies: npm audit reports zero known vulnerabilities after non-breaking upgrades and patched transitive overrides.
- Electron: Node integration disabled, context isolation and sandbox enabled, allowlisted preload bridge added, and external navigation blocked/opened safely.
- Finance: mock bank sync is now a non-mutating setup-required response.
- CI/release gate: typecheck, full lint, Prisma validation, production audit, coverage, build, Electron isolation, connector honesty, and GLB checks are authoritative gates.
- Ownership: log reads/counts are scoped to the authenticated user; database paths are no longer returned.
- Configuration/custom tables: setting mutation is allowlisted and bulk table replacement is transactional.

The architecture, schema normalization, full connector platform, complete legacy-CSS removal, authenticated screen-by-screen Inspo review, and artistic GLB realism work remain larger follow-up programs. They are not represented as completed by the green engineering gate.

## Executive verdict

GrowthTrack is not release-ready. The production bundle builds and 282 unit/component tests pass, but the repository has 157 TypeScript errors, 127 lint errors, a broken CI coverage command, 22 high-severity dependency advisories, unsafe Electron renderer settings, incomplete database constraints, and an internal quality gate that reports `RELEASE READY` without checking the failing gates.

The visual redesign is partially implemented. The login screen is coherent, but the application still carries 3,578 inline-style declarations, 1,020 `!important` declarations, 19 CSS files with overlapping systems, and 138 native `title` attributes. Authenticated screen-by-screen visual certification remains incomplete.

## Release blockers (P0)

| Area | Issue | Evidence | Required outcome |
|---|---|---|---|
| CI | The CI test command cannot start because `@vitest/coverage-v8` is missing. | `npm run test:run` exits before running tests. | Add the matching coverage provider, enforce thresholds, and prove CI from a clean install. |
| Type safety | The application has 157 TypeScript errors. | Concentrated in Finance, HumanoidViewer, Timesheet, shared component contracts, and chart callbacks. | Zero type errors and an explicit `typecheck` CI job. |
| Lint | ESLint reports 151 findings: 127 errors and 24 warnings. | Includes hook-order violations, render-time refs, undefined identifiers, mutation/purity issues, and configuration globals. | Zero source errors; explicitly exclude generated material. |
| Security | Electron enables Node integration and disables context isolation. | `desktop.js` uses `nodeIntegration: true` and `contextIsolation: false`. | Isolated renderer, preload bridge, allowlisted IPC, navigation/window guards, and sandbox where compatible. |
| Dependencies | Dependency scan reports 34 advisories, including 22 high severity. | Directly affected packages include Vite and LHCI; React Router and Prisma toolchains are affected transitively. | Upgrade safely, remove or replace stale LHCI dependencies, regenerate lockfile, and re-audit to zero accepted high/critical runtime risk. |
| Release gate | The internal quality gate produces a false green. | It checks a small renderer lint subset, tests, build, and GLB structure, but omits full lint, typecheck, CI coverage setup, E2E, Electron security, migrations, and dependency audit. | One authoritative gate that fails on every mandatory release criterion. |
| Product honesty | Bank sync creates random mock transactions in the user's real ledger. | `/api/finance/sync/bank` inserts 10–15 generated rows and calls the operation successful. | Remove the mutation; expose a non-writing demo preview or a genuinely configured connector. |
| Deployment | GitHub Pages deploys only static frontend files while core product behavior depends on Express, SQLite, auth cookies, and local services. | The sole workflow publishes `dist` only. | Label Pages as a demo shell or stop deploying it as the product; establish a desktop release pipeline and supported web topology. |

## High-priority issues (P1)

### System and architecture

- `server.js` is a 1,032-line application containing authentication integration, billing, logs, profile mapping, state bootstrap, finance import/sync, database inspection, and most routes. Split it into versioned domain routers, services, schemas, and repositories.
- API behavior is inconsistent: collection endpoints return unbounded arrays, logs fetch up to 500 records per table and paginate in memory, location history caps at 500 without cursor metadata, and database previews use a separate shape.
- The app advertises `/api/v1` architecture in plans but production routes remain predominantly unversioned.
- Runtime health only says the process is online. It does not verify database writability, migration state, disk space, Ollama availability, asset integrity, or backup recency.
- GPU acceleration is disabled globally in Electron, directly conflicting with the high-quality 3D objective. Replace blanket disabling with measured fallback tiers and crash recovery.
- Error handling is fragmented between console output, file logging, API responses, and UI toasts. Define stable error codes, request IDs, safe user messages, and recovery actions.

### Database and persistence

- Financial amounts and balances use floating-point storage. Use integer minor units plus ISO currency for transactions, budgets, subscriptions, portfolio values, and net worth.
- Many dates are strings rather than normalized timestamps/date columns, making sorting, timezone behavior, validation, and indexed ranges unreliable.
- Growing domain data remains embedded in JSON strings, including training plans, wellness data, calendar events, projects, portfolio data, custom-table rows, and health profile content. Normalize histories and independently queried records.
- String fields such as status, category, provider, source, and type lack database-level constrained values. Validate with shared schemas and migrate critical fields to controlled enums/check constraints where practical.
- The generic CRUD controller strips ownership fields but performs little domain validation. Add per-domain Zod schemas, bounded fields, date/number normalization, and transaction-level invariants.
- CSV finance import commits immediately, skips preview/mapping/duplicate detection, accepts weak type/date/category data, and has no rollback batch record.
- Bulk custom-table replacement deletes omitted tables before all incoming rows are safely validated and persisted. Make writes transactional and retain recoverable revisions.
- Backup copies the live SQLite file directly and has no integrity verification, encryption, retention, restore rehearsal, or WAL-safe snapshot procedure.
- Desktop migration creates a backup, but rollback is manual and migration status parsing depends on human-readable CLI output.
- Sensitive health, location, profile, and body data are not field-encrypted. Connector credential models exist, but encryption/key lifecycle and renderer isolation require a dedicated security test.
- Log summary and diagnostics count all users rather than the authenticated owner. In the current single-user model this is hidden, but it breaks the ownership contract needed for Clerk/multi-user support.
- Database tooling returns global app settings and provider records beside personal data without a separate administrative capability model.

### Backend and API

- Login/API rate-limit maps are in-memory, unbounded, and reset on restart. Add pruning and define desktop versus server deployment behavior.
- Password hashing uses bcrypt despite the stated Argon2id requirement. Migrate hashes on successful login with a versioned password policy.
- Session rotation is absent after login/profile-sensitive changes; session inventory and user-driven revocation are not exposed.
- CSP is extremely restrictive but incomplete for actual optional services and images; validate it against production Sentry, Stripe, local model, worker, and asset needs rather than weakening it reactively.
- Profile image validation checks only the data-URL prefix and payload size, not decoded MIME integrity or dimensions. Decode, inspect, re-encode, and cap pixels.
- Handoff nonces live only in process memory and the default secret is random per restart, invalidating pending handoffs. Persist short-lived nonce state and require a configured secret when integrations are enabled.
- Configuration mutation accepts arbitrary valid-looking keys. Add an allowlist and capability checks for system-wide settings.
- Generic state bootstrap loads nearly every domain at once. Replace it with a small daily bootstrap and lazy paginated domain queries.
- Finance export ignores active UI filters and produces no explicit export audit metadata beyond generic middleware behavior.
- Real connector lifecycle is missing: setup, scope disclosure, status, token encryption, refresh, sync cursor, idempotency, reconciliation, disconnect, and revocation.
- API integration and ownership tests are far thinner than route breadth; there are no demonstrated adversarial tests for cross-user IDs across every CRUD route.

### Frontend and state

- Finance component extraction is incomplete: new TypeScript tabs have untyped prop bags and do not satisfy shared `EmptyState`, `Switch`, `Button`, `Select`, or Recharts contracts.
- `HumanoidViewer` references undefined `VIEW_MODES`, which can become a runtime failure despite the Vite build succeeding.
- Timesheet state is inferred as `null`/`never` throughout; timer lifecycle and persistence are not type-safe.
- Lint identifies a React hook inside a callback in Databases, undefined `convertMeasurement` in Training, and undefined `useStore` in the comparison export path.
- Several 3D components read refs during render or mutate hook-derived values, creating React 19 correctness risks.
- The app lacks a single validated server-state strategy. Zustand, local storage, API bootstrap state, component state, and drafts overlap without clear conflict or stale-data policy.
- Large vendor chunks remain: roughly 1.21 MB Three, 1.22 MB general vendor, 452 KB charts, and 297 KB CSS before transfer compression. Route-level lazy loading is incomplete.
- Loading and failure boundaries exist but are not contractually present on every canonical route.
- Native `title` attributes remain common, so many tooltips are inaccessible on touch and inconsistent for keyboard users.

### Tests and quality engineering

- Passing tests do not cover compilation: 282 tests pass while 157 type errors remain.
- Coverage is configured only for `src/utils/**`, has no thresholds, and cannot currently run.
- Playwright specs exist, but CI never executes them. No authenticated fixture strategy or seeded isolated database is defined.
- No browser matrix exists beyond Chromium/mobile Chromium; Electron itself is not exercised.
- No migration upgrade/rollback/restore tests, corrupted-database tests, WAL backup tests, or large-dataset query tests are enforced.
- No contract suite proves parity between Zustand actions, API payloads, Prisma records, exports, and analytics summaries.
- Structural GLB tests pass, but realism, calibrated circumference tolerance, matching-view screenshots, material continuity, deformation, and LOD geometry reduction are separate unpassed gates.
- Visual regression evidence is not tied to a deterministic fixture, design-reference ID, viewport, theme, motion preference, and approval state.

### CI/CD and operations

- Add independent jobs for install integrity, typecheck, lint, unit/coverage, Prisma validation, migration test, API integration, Playwright, desktop smoke, GLB validation, dependency/security scan, license scan, and build artifacts.
- Cache policy and Node version must match the desktop release toolchain; current workflow tests only Ubuntu and cannot certify Windows Electron packaging.
- Add Windows desktop build/signing smoke tests, generated artifact hashes, SBOM, provenance, and rollback documentation.
- Add secret scanning and oversized/private-asset checks before push and in CI.
- Do not deploy after merely building a static bundle. Gate release channels separately: local desktop, optional hosted frontend, and any future hosted API.
- Persist test reports, coverage, screenshots, bundle analysis, and 3D validation reports as CI artifacts.
- Introduce a canary/health check only after there is a real supported deployment target.

### UI/UX and accessibility

- The V2/V3 redesign remains layered on top of legacy styling rather than replacing it: 3,578 inline style declarations, 1,020 `!important` declarations, and 19 CSS files prevent predictable theming.
- Authenticated modules have not completed the required Inspo gate of before/reference/target/after captures at matching desktop, tablet, and mobile dimensions.
- The login screen has a clear hierarchy, but its “Show password” checkbox alignment and icon/text spacing need refinement, and recovery/session guidance is absent from the visible flow.
- Establish one canonical shell, one token generator, one icon registry, and six page templates before continuing per-page polish.
- Finance must retain the compact KPI row, calendar activity view, ledger workflow, and honest import/sync states; it must not use oversized dashboard cards or simulated connected states.
- Wellness and medical screens need calmer density and source/readiness states; decorative effects must never compete with medical values.
- Avatar Studio must distinguish legacy asset, fallback, candidate, and approved asset. UI polish cannot promote an anatomically or materially unverified GLB.
- Search, filters, sorting, column controls, pagination, import preview, empty results, loading, partial data, offline, and errors need shared behavior across all record workspaces.
- At 200% zoom and mobile widths, every fixed rail, footer, overlay, viewport HUD, and bottom sheet needs explicit obstruction testing.
- High contrast, reduced motion, keyboard traversal, screen-reader labeling, touch tooltips, focus return, and chart table alternatives need both automated and manual acceptance.

## Medium-priority issues (P2)

- Standardize naming between Overview, Current, Dashboard, Analytics, Progress, and Forecast around one user mental model.
- Add source, freshness, confidence, sample size, and methodology to analytics rather than relying on visual authority.
- Replace technical diagnostics in normal screens with plain recovery actions; retain full detail in a diagnostics panel.
- Centralize currencies, units, locale formatting, date boundaries, and timezone semantics.
- Add cursor pagination and virtualization only where dataset size warrants them; do not virtualize small daily lists.
- Add data retention/export/delete/reset controls for health, location, conversations, navigation personalization, and avatar assets.
- Make unsupported models, connectors, clothing, anatomy guides, and notification channels visibly setup-required or planned instead of interactive.
- Finish the Inspo reference matrix for every route and connect each screenshot to a migration status record.

## Verified positives

- Production Vite build completes.
- All 47 current Vitest files pass: 282 tests.
- Prisma schema validation succeeds and seven migrations are present.
- Authentication uses hashed session tokens, HTTP-only same-site cookies, CSRF validation on mutations, login throttling, ownership checks on the generic CRUD controllers, and security headers.
- Most persisted collection queries are scoped by authenticated `userId`.
- Strict authored and lite GLB structural validators pass their current checks.
- The login UI has a coherent neutral visual direction and readable primary action.

## Required repair sequence

1. **Truthful gates:** repair CI coverage setup; add typecheck; make the quality gate call the same commands as CI; block on high/critical runtime vulnerabilities and desktop security checks.
2. **Security and data safety:** isolate Electron, remove mock bank mutation, harden imports, implement transactional backups/restores, fix money/date storage, and add ownership/adversarial API tests.
3. **Correctness:** eliminate TypeScript and lint failures by fixing contracts and hook violations, not suppressing rules.
4. **Architecture:** split the server by domain, add shared request schemas and paginated contracts, then reduce the all-data bootstrap.
5. **Reference-led UI migration:** use Inspo screen by screen, replace legacy CSS rather than layering over it, and approve each module at matching viewports.
6. **Performance and 3D certification:** route-split large dependencies, benchmark Electron/WebGL, and keep GLB realism/calibration as a separate evidence-based release gate.
7. **Release engineering:** test Windows desktop packaging, migrations, restore, E2E, accessibility, visual regression, asset integrity, and rollback before promotion.

## Acceptance gates

- Zero TypeScript errors and zero source lint errors.
- Unit coverage command runs from a clean install and enforces agreed thresholds.
- All authenticated canonical routes pass desktop/tablet/mobile E2E smoke tests with no unexpected console errors.
- No active control performs simulated mutation or claims a connector is live when it is not.
- Electron renderer has no direct Node access and uses an allowlisted preload API.
- No unresolved high/critical runtime dependency risk; accepted dev-only exceptions are documented with expiry.
- Finance uses exact monetary representation and imports are previewable, deduplicated, auditable, and reversible.
- Backup, migration, rollback, restore, and offline restart are tested on a copy of realistic data.
- Every migrated route has reference-backed before/target/after evidence and accessibility review.
- The authoritative quality gate, CI, and release UI all report the same release status.

## Audit limitations

The live browser reached the local login page successfully, but authenticated screens were not entered because credentials must not be requested or handled during automated QA. Therefore, authenticated visual findings in this report are based on source structure, existing captures, and current component/style inventories; they still require signed-in screen-by-screen browser verification.
