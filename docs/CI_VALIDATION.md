# GitHub validation

Pull requests run architecture/import contracts, generated documentation/design checks, isolated demo build/tests, Ultimate static checks, four unit-test shards, migrated disposable backend tests, and Chromium/Firefox/WebKit fixture workflows. Browser workflows include WCAG A/AA scans, keyboard search/focus recovery, and timeout, disconnected-network and HTTP failure recovery for Tasks, Notes, Goals and Shopping. The simulated timeout is a network abort, not a measurement of the HTTP client's timer.

Separate API-client unit tests exercise the actual timeout/abort timer, bounded read retries, cancelled navigation and prevention of automatic mutation replay after a lost connection.

Independent build jobs cover FinSync customer web, OxFin customer web, Equity, Family web and Family API. Each installs its own locked dependencies and audits runtime dependencies. They do not deploy, migrate databases or receive production credentials. Existing build or dependency failures remain blocking; configuring a job is not evidence that its product builds successfully. Shared contract changes trigger the whole companion matrix conservatively.

A separate disposable PostgreSQL 17 service runs the existing SQL integrity, ownership/RLS, money precision and migration-repair/rollback tests using an explicit loopback database ending in `_test`. Its credentials are fictional and confined to the job. These tests would otherwise skip without `SCHEMA_TEST_DATABASE_URL`; no production migration is authorized or performed.

Security analysis runs CodeQL, dependency review, and a pinned Gitleaks CLI scan of checked-out commit history with fully redacted findings. No production credentials are needed. CodeQL/dependency review availability depends on repository settings and GitHub entitlement. Enable GitHub secret push protection and required checks in repository settings separately; workflow files cannot enforce those settings.

Performance checks now run for application changes, not just edits to the load script. They retain production-build size/compression checks and populated-page budgets. A separate synthetic Chromium profile uses 4G network emulation and 4× CPU throttling for Overview, Notes, Goals and Shopping, with keyboard search interactions. Its initial budgets are LCP below 15 seconds, CLS below 0.25, total blocking below 3 seconds, and recorded input events below 1 second. Input samples are not a field INP percentile. Each route must render and its interactions must succeed.

The authenticated API workload mounts real notes routes and session middleware against migrated temporary SQLite databases. It checks anonymous/invalid-session denial, owner separation, CSRF enforcement, session revocation, and successful reads alternating two owners. The pull-request profile uses 240 requests and eight workers; p95 must stay below two seconds with zero failures. Sessions and records are synthetic; this does not measure login throughput or deployed capacity.

Weekly and manual endurance jobs run a ten-minute browser fixture with repeated search interactions and resource sampling, plus at least 20,000 authenticated reads with sixteen workers and at least sixty seconds of activity. The browser gate requires complete samples, heap below 256 MiB, heap growth below 64 MiB, DOM growth below 3,000 nodes and listener growth below 500 after warmup. These broad bounds catch sustained regressions; they do not prove absence of leaks. Reports and failed browser evidence are retained for fourteen days. Endurance does not run on pull requests.

## Local commands

```powershell
node --test tests/resilience-budgets.test.mjs
npm --prefix growthtrack-ultimate run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/loading-resilience.spec.ts --project=chromium
node --test growthtrack-ultimate/tests/unit/server-backend/api-load.test.mjs
```

For slow-network measurements, first build Ultimate, then run from its directory:

```powershell
node scripts/page-performance.mjs --label=ci-slow --fixture=populated --pages=overview,notes,goals,shopping --runs=1 --network=4g --cpu-throttle=4 --interact
node scripts/check-resilience-performance.mjs --report=ci-slow --slow
```

Do not rebuild the same output while a benchmark is reading it. Use isolated fixtures only. Browser/component checks do not replace the user's page approval, real-user monitoring or separately authorized staging capacity tests.

## Implementation verification, 4 November 2026

Local verification passed 151 isolated backend tests, the 20,000-request API endurance profile (16 workers, zero failures, p95 about 252 ms), 26 Chromium accessibility/loading/shell workflows, seven API-client unit tests, and eighteen toast/companion component tests. Ultimate, Family web/API and Equity builds passed. Runtime dependency auditing passed the high-severity gate with four moderate findings. These results describe local runs, not GitHub run status.

The newly exposed failures remain visible: FinSync's build rejects `User.multiFactor` in `packages/utils/firebase-auth.ts`; OxFin cannot resolve `@/lib/billParser` (the local run also could not fetch Google Fonts). The slow-network benchmark recorded Shopping LCP around 26.3 seconds and blocking around 16.4 seconds; Overview, Notes and Goals also exceeded the three-second blocking budget. These are measurements on this machine, not a stable cross-machine baseline. The gate rejects these results. Performance optimization and the existing companion build failures are separate remediation work, not bypassed checks.

The full ten-minute browser endurance profile, hosted CodeQL/secret scanning, fresh Linux companion installs and Firefox/WebKit additions have not been verified locally. Workflow files must be pushed before GitHub can execute them; required-check and push-protection settings remain repository administration steps.

## Pre-PR verification, 5 November 2026

The FinSync build now passes after the auth API correction and local dependency repair. The companion matrix also enforces the new profile encryption/storage, product-directory authorization and PostgreSQL TLS contracts. A dedicated demo Auth/Firestore emulator job runs the Firestore rules and client transport regressions; it never connects to a production project. Ultimate's shared feature inventory is packaged as JavaScript for both Docker and Electron; isolated import tests verify that the disabled decision adapters need no TypeScript loader. The optional adapter kit is checked for generated-file drift and bounded transport behavior.

Hosted status must be read from the PR checks. These local results do not certify every hosted lane or replace the earlier dated benchmark observations.
