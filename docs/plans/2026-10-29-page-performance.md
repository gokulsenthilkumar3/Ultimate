# Ultimate page performance audit — 29 October 2026

Latest follow-up: [collection and companion-host results for all 65 default pages](2026-10-29-collection-performance.md). The [earlier populated-data audit](2026-10-29-populated-page-performance.md) covers bounded Notes rendering and locale/currency formatter reuse. The historical comparisons below retain their original empty-data scope.

Status: **DONE_WITH_CONCERNS**. Verified shared loading and transfer fixes are implemented. Every default portal page renders in the isolated browser benchmark; real service latency, populated-account scale and the full 3D renderer remain outside these measurements. The complete existing test suite is not green.

## Scope and method

Measured all 65 default destinations: 61 production feature routes and four public pages, with three fresh browser contexts per route before and after the changes (390 primary measurements). Chrome 156.0.8078.48; 1440 × 900 viewport; reduced motion; analytics denied; service workers blocked; external requests blocked.

Authenticated routes use the existing fictional owner test fixture. The workspace response has a fixed 150 ms delay; optional services are explicitly unavailable. Public pages use an anonymous fixture. The actual production build and routing run in the browser; production auth, stores and API code contain no fixture imports or bypasses.

The baseline used a local gzip static fixture. The final run uses the production Express `registerFrontend` handler, including its negotiated build-time compression. Baseline collection observed 350 ms after the first heading; the final harness additionally waits for its loading skeleton to disappear. Decoded resource sizes are the reliable comparison; local paint timings are exploratory, with no claim of isolated CPU conditions or real-user Web Vitals.

These are default-page observations, not coverage of all 201 tab/view destinations, six review states, mobile devices, populated customer records, or live companion applications. Equity, Forex, Family and Apps Suite observations cover their portal host and unavailable-service presentation. The Physique default is its lightweight workspace, not a WebGL/GPU performance sign-off.

## Findings and fixes

| Confirmed cause | Implemented fix | Evidence |
| --- | --- | --- |
| Every protected page waited for `/api/state` before requesting its module. | Preload only the selected module while the authenticated workspace request runs. Rendering and effects retain the existing data-ready gate. | The baseline budget check fails on this waterfall; final imports overlap the workspace request. |
| The shell imported finance schemas and validation to calculate the current date. | Extracted the timezone-aware date helper; finance retains its compatible `financeToday` export. | Shared startup JavaScript decreases by 78,088 bytes; timezone and date-boundary tests pass. |
| Every finance route eagerly loaded editors, ledger, budgets, subscriptions and CSV setup together. Insights also had a second module-loading step. | Lazy finance tabs and preload the selected finance/Insights destination. | All seven finance routes and four Insights routes render in the final browser run. |
| Ledger selection and opening an editor repeated filtering, sorting and totals over the full dataset. | Memoized ledger derivation and finance period/budget calculations. | A 10,000-record regression test retains ten mounted rows and performs one sort across selection/editor actions; changing sort still recomputes. |
| The production static handler sent code and CSS without transfer compression. | Build Brotli/gzip sidecars after Vite finalizes its files; negotiate them for hashed JS/CSS only. | 157 asset pairs decompress byte-for-byte to the final build. HTTP tests cover encoding preference, HEAD, range and fallback; API/auth paths keep their behavior. |

The compressed-output check caught Vite rewriting preload references after `generateBundle`. Compression now reads final files during `writeBundle`; its regression test supplies stale intermediate code and confirms the sidecars use the completed output.

Source: [route preloading](../../growthtrack-ultimate/src/App.jsx), [import cache and retry](../../growthtrack-ultimate/src/app/lazyPage.js), [finance](../../growthtrack-ultimate/src/components/Finance.tsx), [ledger](../../growthtrack-ultimate/src/components/finance/TransactionsTab.tsx), [Insights](../../growthtrack-ultimate/src/components/InsightsHub.jsx), [compression build](../../growthtrack-ultimate/build/staticCompressionPlugin.js), [static serving](../../growthtrack-ultimate/server/frontend.js).

## Additional verified fixes

The follow-up remeasured all 65 default pages, with three browser samples per page, using the same production static handler and fictional fixture as the preceding pass. The primary tables below now show the current build against the original baseline.

| Remaining cost | Fix and verification |
| --- | --- |
| 3D-only chamber CSS was loaded on every page. | Load it through the owning renderers while retaining its original legacy cascade layer. Shared CSS decreases from 361.2 to 314.1 KB. Computed styles and geometry match at 390, 960, 1280 and 1920 px in light, dark and AMOLED themes. This is twelve synthetic CSS parity comparisons, not a GPU or visual approval. |
| The screenshot library was bundled into the default dashboard. | Import html2canvas only for an explicit export. Dashboards decreases from 1186.0 to 988.1 KB of decoded JavaScript. Duplicate submissions, failed-export retry and navigation during capture are tested. |
| Every store update serialized the persisted preferences and portfolio cache. | Reuse an acknowledged snapshot while its immutable persisted fields and version are unchanged. In a 10,000-holding regression, 25 unrelated updates produce zero serializations instead of 25; a real preference change still persists all holdings. Reads, removal, version changes and failed writes remain covered. |

This follow-up adds 0.7 KB of shared JavaScript for the storage cache. The cumulative shared-JS reduction remains approximately 15%. Selected-page paint medians vary; smaller byte counts do not imply every local timing became faster.

## Shared startup results

| Measurement | Before | Final |
| --- | ---: | ---: |
| All eager JavaScript, decoded | 524.4 KB | 446.3 KB (-14.9%) |
| Shared CSS, decoded | 361.2 KB | 314.1 KB (-13.0%) |
| Current shared JS/CSS body, uncompressed | — | 760.4 KB |
| Current shared JS/CSS body, gzip | — | 195.8 KB (-74.2% versus the current uncompressed body) |
| Current shared JS/CSS body, Brotli | — | 198.4 KB |
| Median of the per-page LCP medians | 644 ms | 668 ms |
| Selected route imports started before workspace data completed | 0/60 | 60/60 |

Compression body sizes exclude fonts, HTML, API responses and HTTP headers. Brotli quality 4 keeps builds quick; this particular build is slightly smaller with gzip. The static host negotiates the representation accepted by the client. Other hosts/CDNs require their own encoding configuration. No deployment was performed.

## Page-by-page browser results

All rows rendered without a page exception or error-boundary fallback in all three samples. Times are medians in milliseconds. JS is decoded decimal KB; transfer is the final browser resource transfer total, including headers and fixture API responses. FCP, TTFB, CLS, startup long-task blocking, load timing, request timing and resource inventories remain in the local JSON artifacts.

### Finance

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /finance/overview | 668 | 584 | 587.7 | 550.6 | 386.3 | 31 |
| /finance/transactions | 644 | 668 | 587.7 | 553.5 | 387.0 | 31 |
| /finance/analytics | 940 | 680 | 965.2 | 917.5 | 504.1 | 41 |
| /finance/trends | 964 | 708 | 972.9 | 925.2 | 470.1 | 41 |
| /finance/budgeting | 656 | 668 | 587.7 | 546.5 | 419.4 | 30 |
| /finance/subscriptions | 700 | 636 | 587.7 | 548.1 | 348.1 | 28 |
| /finance/portfolio | 932 | 728 | 881.2 | 803.3 | 468.7 | 43 |
| /finance/sip | 1008 | 896 | 892.6 | 814.6 | 461.4 | 31 |
| /finance/shopping | 684 | 760 | 606.9 | 607.3 | 394.2 | 31 |
| /finance/sync | 724 | 656 | 587.7 | 553.4 | 349.0 | 26 |
| /finance/finsync | 624 | 720 | 535.5 | 457.5 | 314.9 | 22 |
| /finance/oxfin | 572 | 656 | 535.5 | 457.5 | 314.9 | 22 |
| /finance/equity | 664 | 648 | 531.3 | 453.2 | 293.4 | 22 |

### Insights

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /insights/overview | 608 | 800 | 532.9 | 454.8 | 312.1 | 21 |
| /insights/actions | 572 | 792 | 531.4 | 453.4 | 313.5 | 23 |
| /insights/current | 620 | 756 | 538.9 | 460.9 | 318.7 | 29 |
| /insights/analytics | 944 | 664 | 954.4 | 949.9 | 472.3 | 42 |
| /insights/dashboards | 948 | 564 | 1191.5 | 988.1 | 461.0 | 45 |
| /insights/progress | 612 | 592 | 565.5 | 560.8 | 321.7 | 27 |
| /insights/forecast | 936 | 620 | 933.2 | 928.6 | 465.9 | 41 |
| /insights/forex | 612 | 588 | 531.3 | 453.2 | 293.4 | 22 |

### Wellness

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /wellness/overview | 648 | 744 | 532.0 | 453.9 | 312.1 | 21 |
| /wellness/sleep | 928 | 636 | 931.1 | 853.1 | 443.4 | 38 |
| /wellness/lifestyle | 656 | 668 | 542.1 | 464.1 | 317.1 | 25 |
| /wellness/mind | 912 | 840 | 897.6 | 819.6 | 429.6 | 35 |
| /wellness/medical | 824 | 616 | 900.5 | 822.5 | 431.8 | 36 |
| /wellness/health | 564 | 688 | 542.1 | 464.0 | 318.3 | 29 |
| /wellness/habits | 688 | 636 | 548.4 | 470.4 | 320.2 | 29 |
| /wellness/physique | 632 | 724 | 614.3 | 536.4 | 348.2 | 30 |
| /wellness/assessment | 540 | 528 | 533.7 | 455.7 | 290.2 | 25 |
| /wellness/training | 752 | 684 | 941.7 | 942.3 | 472.1 | 48 |
| /wellness/strength | 856 | 688 | 914.8 | 836.8 | 437.5 | 37 |
| /wellness/nutrition | 944 | 812 | 922.9 | 844.9 | 438.3 | 35 |
| /wellness/hydration | 808 | 672 | 906.2 | 828.2 | 410.4 | 36 |
| /wellness/sync | 492 | 580 | 524.4 | 446.3 | 284.1 | 18 |

### Workspace

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /workspace/overview | 612 | 764 | 531.8 | 453.7 | 311.8 | 21 |
| /workspace/calendar | 604 | 800 | 577.4 | 499.5 | 333.9 | 31 |
| /workspace/files | 588 | 788 | 551.5 | 473.5 | 323.3 | 31 |
| /workspace/notes | 928 | 776 | 722.8 | 717.9 | 396.3 | 31 |
| /workspace/tasks | 640 | 792 | 571.3 | 493.3 | 327.0 | 34 |
| /workspace/projects | 624 | 676 | 565.2 | 487.1 | 322.1 | 27 |
| /workspace/timesheet | 868 | 756 | 908.5 | 909.1 | 497.0 | 46 |
| /workspace/skills | 608 | 604 | 549.1 | 471.1 | 319.0 | 26 |
| /workspace/goals | 868 | 600 | 896.9 | 818.9 | 430.9 | 38 |

### Life

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /life/overview | 624 | 620 | 529.7 | 451.7 | 310.7 | 20 |
| /life/social | 656 | 640 | 542.8 | 464.8 | 319.9 | 30 |
| /life/entertainment | 636 | 604 | 553.2 | 475.2 | 322.9 | 32 |
| /life/places | 488 | 552 | 533.3 | 455.3 | 314.1 | 23 |
| /life/family | 588 | 536 | 531.3 | 453.2 | 293.4 | 22 |

### Hub and customer administration

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /hub/overview | 636 | 676 | 530.5 | 452.5 | 310.7 | 20 |
| /customers | 580 | 572 | 535.5 | 457.5 | 315.3 | 23 |
| /hub/apps | 768 | 732 | 546.8 | 468.8 | 326.3 | 30 |
| /hub/companion | 656 | 708 | 531.3 | 453.2 | 313.7 | 22 |
| /hub/agents | 668 | 620 | 741.3 | 736.5 | 403.9 | 33 |
| /hub/databases | 708 | 588 | 551.1 | 473.1 | 321.6 | 31 |
| /hub/settings | 624 | 680 | 654.0 | 576.0 | 388.7 | 35 |
| /hub/notifications | 528 | 592 | 530.3 | 452.3 | 311.8 | 21 |
| /hub/help | 552 | 644 | 528.8 | 450.8 | 311.9 | 22 |
| /hub/logs | 244 | 312 | 702.6 | 624.7 | 371.5 | 38 |
| /hub/about | 572 | 628 | 545.3 | 467.4 | 319.3 | 30 |
| /hub/plans | 508 | 604 | 526.5 | 448.5 | 311.0 | 22 |

### Public pages

| Route | LCP before | LCP final | JS before KB | JS final KB | Final transfer KB | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /login | 324 | 304 | 524.4 | 446.3 | 281.8 | 13 |
| /welcome | 672 | 712 | 529.8 | 451.7 | 283.7 | 14 |
| /privacy | 608 | 688 | 529.7 | 451.6 | 284.1 | 14 |
| /terms | 644 | 668 | 529.0 | 450.9 | 283.8 | 14 |

## Budgets and remaining costs

All 65/65 pages are below the 1.8 s synthetic FCP budget; 65/65 are below the 2.5 s synthetic LCP budget. These thresholds are local lab checks, not a field Core Web Vitals assessment.

The default dashboard also has a 1 MB decoded-JavaScript guard and must not request its export chunk before an export. The project startup guards are <450,000 decoded JS bytes and <320,000 decoded CSS bytes. They freeze the improved startup rather than declaring the application optimal. The stricter audit targets of <500 KB total decoded JS, <100 KB CSS, <2 MB transfer and <50 requests are met by 37/65, 0/65, 65/65 and 65/65 pages respectively.

The shared stylesheet is now 314.1 KB decoded, and chart-heavy pages still load larger chart dependencies. Compression addresses transfer cost; it does not remove CSS parsing, chart execution or GPU work. The unused chamber rules now load with their renderers. Further legacy CSS retirement and profiling realistic populated accounts/devices remain separate verification work. The aggregate `/api/state` endpoint still returns the existing full account snapshot; no database latency or migration claim is made.

## Verification

| Check | Result |
| --- | --- |
| Production and isolated design builds | Pass |
| TypeScript | Pass |
| Changed JavaScript lint | Pass, zero errors/warnings |
| Targeted loading, finance, date, auth, persistence, Insights, export and renderer CSS tests | 117 pass across eleven files |
| Supported isolated design test configuration (earlier run; demo sources unchanged by the follow-up) | 989 pass across six files |
| Static serving and compression tests | 3 pass; the compression-serving regression failed before the fix |
| Built-asset integrity | 157 Brotli/gzip pairs match the final files |
| Browser audit and budgets | 65 pages, three samples per page; pass |
| Gateway | 6 pass |
| Design contract, generated application docs, impact and handoff drift | Pass |
| Complete existing Vitest suite, earlier run bounded to two workers | 2475 pass, 16 fail, 14 skipped; nine files fail; the current follow-up reruns the 117 affected checks and all 65 default pages |
| Existing 3D plan preview checks | 15 pass, 1 fails because the local GLB hash differs from its generated preview |
| Existing layout suites rerun with installed Chrome | 4 pass, 8 fail, 2 skipped; responsive tests expect older geometry, while the editorial hook still requires the absent bundled browser |

The broad-suite failures include browser suites without the bundled Chromium runtime, demo tests exceeding the broad runner’s five-second timeout, incompatible local anatomy assets and long-running 3D tests. One lazy finance assertion exceeded its former one-second wait in that run; it now waits for the asynchronous tab and passes in the current 117-test targeted run. The supported demo configuration subsequently passes all 989 tests. The broad suite is not reported as green, and local model assets were not regenerated to suppress these failures.

Regression sources: [preload reuse and failure recovery](../../growthtrack-ultimate/src/app/lazyPage.test.jsx), [timezone compatibility](../../growthtrack-ultimate/src/utils/calendarDate.test.ts), [10,000-row ledger and finance workflows](../../growthtrack-ultimate/src/components/finance/FinanceMigration.test.tsx), [HTTP serving](../../growthtrack-ultimate/tests/unit/server-backend/frontend.test.mjs), [storage serialization](../../growthtrack-ultimate/src/store/preferenceStorage.test.js), [dashboard export](../../growthtrack-ultimate/src/components/Dashboards.export.test.jsx), [renderer CSS parity](../../growthtrack-ultimate/src/components/physique/chamber-styles.test.js), and [final-file compression](../../growthtrack-ultimate/tests/unit/server-backend/static-compression.test.mjs).

## Reproduce

From the repository root:

```powershell
npm run build:ultimate
$env:PLAYWRIGHT_CHANNEL = "chrome" # omit when the bundled Playwright Chromium is installed
npm --prefix growthtrack-ultimate run performance:pages -- --label=current --runs=3 --screenshots
npm --prefix growthtrack-ultimate run performance:check -- --report=../.gstack/benchmark-reports/current.json --baseline=../.gstack/benchmark-reports/baseline.json
node --test growthtrack-ultimate/tests/unit/server-backend/frontend.test.mjs growthtrack-ultimate/tests/unit/server-backend/static-compression.test.mjs
```

Use `--pages=overview,transactions,login` for a focused run, or `--label=baseline` explicitly before a future change. Baseline mode retains a timestamped copy. Generated measurements and screenshots live under ignored `.gstack/benchmark-reports/`; test logs live under ignored `.tmp/`. This checked-in report preserves the primary page comparisons.

Operational learnings: Vite’s final preload rewrite happens after the early bundle hook; compress finalized disk files, and compare decoded bytes using `Buffer.equals` so a large mismatch fails promptly instead of attempting to format a huge array diff. Zustand `partialize` still serializes its retained data on unrelated updates; skip acknowledged, unchanged immutable preference snapshots before JSON encoding. Deferred styles must keep their original cascade layer; verify computed styles across themes and widths when moving an import.

## Agent and dependency follow-up

The [agent guardrail pass](2026-10-29-agent-guardrails.md) adds bounded generation,
review-plan integrity/expiry, conversation cleanup and lower rendering work. Five
dependency security fixes are locked; the runtime audit reports zero findings.
The updated validator increased route payloads, so optional Growthcast provider
code now loads only when its AI action is requested. Dashboard startup JS is
905,403 bytes, below the existing 1 MB budget; eager JS/CSS remain within their
450,000/320,000-byte bounds at 446,300/314,084 bytes.

All 65 default pages pass again with three samples per route in the ignored
`agent-secure-final` report and one final sample per route after plan cleanup in
`agent-cleanup-final`. The former passes comparison against `followup.json`;
the latter passes absolute budgets, finalized compression checks and route
preload ordering. These remain isolated owner/service fixtures, not live backend
or provider load measurements. The agent report records the additional test
results, retries and verification limits.
