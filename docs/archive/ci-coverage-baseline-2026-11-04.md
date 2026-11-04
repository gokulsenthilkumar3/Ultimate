# CI coverage and local reproduction

> Historical CI baseline. Use [CI validation](../CI_VALIDATION.md) for the current workflow configuration, local results and remaining verification limits. The original baseline below is retained for provenance.

PR #21 contains the database console and logging work. The CI hardening is a separate change based on its merged `main`; local `.evergreen` scratch reports and backup copies are not application source or PR inputs.

| Gate | Trigger | What it verifies |
| --- | --- | --- |
| GrowthTrack CI | Ultimate changes on PR/push | Existing build, lint, types, four unit shards, backend security regressions, three browser engines, agent consent/resource checks and compressed startup asset budgets |
| Workspace contracts | Every PR/push to main | Graph parser/freshness/exclusion tests, resolved import ownership, gateway/proxy contracts, disposable SQLite schema repairs and generated application READMEs |
| Security analysis | Every PR/push to main; weekly/manual | CodeQL JavaScript/TypeScript, Python and Actions analysis; dependency review rejects newly introduced high/critical advisories on PRs |
| Loading resilience | Ultimate browser matrix | Deferred initial data retains busy/loading state; a disconnected request shows an error and explicit retry recovers |
| Isolated performance and load | Weekly/manual; PRs modifying its workflow or load script | Three samples each for populated Notes, Goals and Shopping with 500ms synthetic data delay; existing synthetic paint/resource/DOM budgets; 200 console reads with eight workers, source isolation, pagination bounds and rejected mutation |
| Platform builds | Existing platform workflow | Docker smoke, Android checks and iOS simulator build/Swift tests |
| Runtime configuration | Existing relevant-path workflow | Logger/launcher and FinSync Tailwind configuration regressions |

The new security workflow uses normal `pull_request`, not privileged execution of fork code. Tokens have read-only contents permission; only CodeQL jobs receive security-event upload permission. Repository secret scanning and push protection were already enabled when this change was prepared; no local credential scanner is added.

## Architecture graph

Install Ultimate's locked dependencies, then run `npm run architecture:check` from the root. It rebuilds the ignored local graph, prints bounded coverage diagnostics and rejects resolved production imports into fictional demo source or server/tooling, and sibling-domain implementation imports. Shared `domains/native` primitives, explicit `contracts/` and each domain's own implementation are allowed. Tests and isolated demo importers are outside these production ownership rules.

This continues the existing graph tooling; it does not introduce a second index. The graph resolves static relative JS/TS imports, re-exports, literal dynamic imports and `require`. Aliases, external packages, computed imports, files excluded by indexing policy and non-JS/TS dependencies remain outside this enforcement. Reported gaps are not evidence of build independence, and the check does not certify absence of cycles.

```powershell
node --test tests/code-context.test.mjs tests/code-graph.test.mjs tests/architecture-boundaries.test.mjs tests/gateway.test.mjs tests/workspace-proxy.test.mjs tests/database-schema.test.mjs tests/schema-repair-cli.test.mjs
npm run architecture:check
npm run docs:check
```

The root schema tests explicitly skip two PostgreSQL scenarios without a disposable test database. This workflow does not supply one, so those scenarios remain uncovered here. Generated environment templates and design adapters already drift on the merged baseline; this PR does not add failing gates for them or silently regenerate unrelated product files.

## Browser and load reproduction

From `growthtrack-ultimate`, after dependency and browser installation:

```powershell
npx playwright test --config=playwright.foundation.config.ts loading-resilience.spec.ts
node scripts/load-smoke.mjs
npm run build
node scripts/page-performance.mjs --label=ci-populated --fixture=populated --pages=notes,goals,shopping --runs=3 --state-delay=500
node scripts/check-page-performance.mjs --report=../.gstack/benchmark-reports/ci-populated.json
```

The load script creates two temporary SQLite databases, starts a random loopback port and cleans up its own fixtures. It accepts no target URL, reads no local environment or configured database, and cannot target a deployed system. HTTP calls have a ten-second timeout and the workflow has a thirty-minute ceiling. A failed worker fails the job after the bounded workers settle. Latency percentiles are observations, not throughput/SLA thresholds; only correctness and boundedness are asserted by the console smoke.

The scheduled workflow uploads ignored `.gstack/benchmark-reports` JSON/Markdown artifacts for fourteen days. Existing browser paint budgets are synthetic laboratory thresholds. No historical timing comparison is claimed without a matched baseline. These checks do not measure production capacity, PostgreSQL contention, authenticated API load, all companion products or real-user Web Vitals, and they are not visual approval. Changes to performance scripts should be exercised manually when their PR does not match the workflow's narrow verification paths.
