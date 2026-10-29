# Populated-data page performance — 29 October 2026

Latest follow-up: [bounded Goals/Shopping rendering, companion readiness and a fresh 65-page audit](2026-10-29-collection-performance.md). The measurements below preserve the earlier baseline and remaining risks as recorded at that time.

Status: **DONE_WITH_CONCERNS**. All 65 default destinations render without a page exception or error boundary in all three final samples. Two populated-data bottlenecks are fixed. Live backend latency, independent companion applications, GPU workloads and cold browser pre-request delays remain outside the verified improvements.

This extends the [earlier empty-data audit](2026-10-29-page-performance.md), preserving the [agent guardrails](2026-10-29-agent-guardrails.md) and existing uncommitted work.

## Measured causes and fixes

| Cause | Fix | Observed evidence |
| --- | --- | --- |
| Portfolio repeatedly constructed the same locale/currency formatter, with similar work in finance, goals, subscriptions and other pages. | A 64-entry LRU of number formatter configurations, without retaining record values or profile objects. Locale, currency, option ordering, invalid inputs, rounding and cache eviction are tested. | Portfolio: 1,202 constructor calls → 1. Goals: 480 → 1. Finance overview: 202 → 1. Subscriptions: 150 → 1. A 1,000-row mixed formatting regression makes three constructors instead of 3,000 with identical output. |
| Notes mounted every loaded note even though its list was a small scrolling viewport. | Render 25 notes per page. Search and tags still operate over the full loaded collection; page changes retain the open editor/draft, and deleting records clamps the page. | 300 notes: 10,327 main-region DOM elements → 983. Journal entries remain excluded. Unit and browser checks cover paging, search outside the first page, draft retention and record removal. |
| A global network-idle wait never completed on service-host pages that intentionally poll health. | Track actual startup requests separately from recurring health probes. | Equity, Forex, Family and Companion settle correctly with their unavailable-service presentation. The preliminary timeout was a measurement defect, not a product rendering failure. |
| The existing Notes browser test expected retired fixed palette colors. | Assert against the approved semantic text/action tokens, retaining keyboard, import, persistence and export assertions. | The targeted browser workflow passes without changing product colors. |

Sources: [formatters](../../growthtrack-ultimate/src/utils/userFormatters.js), [Notes](../../growthtrack-ultimate/src/components/Notes.jsx), [fixture](../../growthtrack-ultimate/scripts/performance-fixture.mjs), [browser collection](../../growthtrack-ultimate/scripts/page-performance.mjs), [performance guards](../../growthtrack-ultimate/scripts/check-page-performance.mjs).

## Scope and method

Production Vite build served through the production Express static handler; 156.0.8078.48; 1440 × 900 viewport; fixed 150 ms workspace-response delay; fresh browser context per sample. Analytics are denied, service workers blocked and external requests aborted. All records are fictional and owner-scoped; the real application server, owner database and provider keys are not opened. The workspace snapshot is 1,656,534 decoded bytes.

One baseline sample per route records the deterministic constructor/DOM counts before these fixes. The final run has three samples per route (195 measurements) and reports medians. Timing improvements are **not** inferred from the one-versus-three sample comparison. Raw samples, including first-start delays, remain in the ignored JSON reports.

The fixture seeds the following collections. Other domains remain empty or setup-required; this is not a claim that every page's backend or every tab has been load-tested. Public pages render outside the measured main region, so their DOM counts are N/A.

| Collection | Records |
| --- | ---: |
| tasks | 2000 |
| finance | 3000 |
| shopping | 200 |
| entertainment | 150 |
| timesheet | 1000 |
| sleep_logs | 365 |
| nutrition_logs | 720 |
| notes | 300 |
| goals | 120 |
| documents | 150 |
| habits | 30 |
| subscriptions | 25 |
| metric_logs | 365 |
| portfolio | 200 |
| calendar | 500 |
| projects | 60 |
| skills | 80 |
| habitLogs | 2700 |

## Final budgets and verification

- 65/65 routes render; zero captured page exceptions/error boundaries across the 195 final samples.
- Maximum per-page median FCP: 752 ms; maximum per-page median LCP: 1056 ms. Project budgets remain FCP < 1,800 ms and LCP < 2,500 ms.
- Shared eager JavaScript: 446,703 bytes (<450,000); shared CSS: 314,084 bytes (<320,000). The default dashboard remains below 1 MB of decoded JavaScript.
- 157 Brotli/gzip asset pairs match the finalized build; static-serving tests cover the existing serving behavior.
- 28 targeted unit/component tests pass, including 22 Notes persistence/workflow cases and six formatting cases. Production build, typecheck, changed-code lint and three HTTP/compression tests pass.
- Eight Notes browser cases pass across the initial run (seven cases) and the corrected semantic-palette case rerun (one case). The new large-library case uses 201 notes, keyboard paging and a 390 px viewport. The earlier combined run is not reported as an entirely green run.
- UI impact/handoff checks, design adapters and generated application README checks pass. Inventory counts do not constitute browser coverage or human visual approval.
- CI now runs the deterministic startup/compressed-asset check after the production build. Browser guards reject an oversized Notes DOM, excessive portfolio formatter construction and mismatched fixture scenarios/counts/instrumentation.

## Page-by-page results

All timing columns are final medians in milliseconds. Blocking is observed startup long-task time above 50 ms, not a field responsiveness or INP measurement. Constructor/DOM comparisons use the baseline observation and final median.

| Route | First heading ms | FCP ms | LCP ms | Blocking ms | Main DOM before → after | Number formatters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /finance/overview | 656 | 312 | 744 | 33 | 203 → 203 | 202 → 1 |
| /finance/transactions | 641 | 308 | 724 | 12 | 301 → 301 | 28 → 1 |
| /finance/analytics | 740 | 276 | 792 | 96 | 226 → 226 | 37 → 1 |
| /finance/trends | 917 | 304 | 956 | 228 | 485 → 485 | 135 → 1 |
| /finance/budgeting | 648 | 300 | 708 | 14 | 79 → 79 | 3 → 1 |
| /finance/subscriptions | 696 | 324 | 788 | 41 | 293 → 293 | 150 → 1 |
| /finance/portfolio | 738 | 276 | 940 | 85 | 4654 → 4654 | 1202 → 1 |
| /finance/sip | 763 | 328 | 808 | 210 | 327 → 327 | 152 → 1 |
| /finance/shopping | 752 | 340 | 988 | 180 | 5078 → 5078 | 4 → 1 |
| /finance/sync | 657 | 324 | 740 | 48 | 135 → 135 | 0 → 0 |
| /finance/finsync | 621 | 332 | 680 | 33 | 48 → 48 | 0 → 0 |
| /finance/oxfin | 586 | 304 | 652 | 23 | 48 → 48 | 0 → 0 |
| /finance/equity | 655 | 340 | 768 | 52 | 28 → 28 | 0 → 0 |
| /insights/overview | 634 | 316 | 800 | 119 | 82 → 82 | 12 → 1 |
| /insights/actions | 552 | 272 | 644 | 15 | 111 → 111 | 0 → 0 |
| /insights/current | 617 | 304 | 744 | 55 | 62 → 62 | 0 → 0 |
| /insights/analytics | 629 | 328 | 768 | 63 | 67 → 67 | 0 → 0 |
| /insights/dashboards | 798 | 356 | 860 | 131 | 242 → 242 | 2 → 1 |
| /insights/progress | 619 | 344 | 656 | 35 | 25 → 25 | 0 → 0 |
| /insights/forecast | 856 | 352 | 920 | 160 | 22 → 22 | 2 → 1 |
| /insights/forex | 640 | 304 | 736 | 28 | 28 → 28 | 0 → 0 |
| /wellness/overview | 667 | 352 | 884 | 168 | 95 → 95 | 10 → 2 |
| /wellness/sleep | 741 | 356 | 792 | 172 | 274 → 274 | 6 → 1 |
| /wellness/lifestyle | 629 | 328 | 812 | 113 | 827 → 827 | 0 → 0 |
| /wellness/mind | 707 | 404 | 964 | 140 | 121 → 121 | 0 → 0 |
| /wellness/medical | 598 | 276 | 708 | 56 | 73 → 73 | 0 → 0 |
| /wellness/health | 589 | 292 | 656 | 20 | 82 → 82 | 0 → 0 |
| /wellness/habits | 698 | 328 | 992 | 123 | 1401 → 1401 | 0 → 0 |
| /wellness/physique | 623 | 288 | 736 | 55 | 176 → 176 | 0 → 0 |
| /wellness/assessment | 637 | 340 | 660 | 36 | 39 → 39 | 0 → 0 |
| /wellness/training | 677 | 284 | 768 | 9 | 91 → 91 | 6 → 1 |
| /wellness/strength | 537 | 252 | 600 | 17 | 32 → 32 | 0 → 0 |
| /wellness/nutrition | 723 | 268 | 796 | 196 | 551 → 551 | 62 → 2 |
| /wellness/hydration | 609 | 312 | 640 | 36 | 5 → 5 | 0 → 0 |
| /wellness/sync | 578 | 348 | 600 | 32 | 16 → 16 | 0 → 0 |
| /workspace/overview | 689 | 364 | 864 | 154 | 73 → 73 | 10 → 1 |
| /workspace/calendar | 810 | 380 | 844 | 109 | 1182 → 1182 | 0 → 0 |
| /workspace/files | 614 | 308 | 1056 | 47 | 102 → 102 | 0 → 0 |
| /workspace/notes | 681 | 340 | 804 | 73 | 10327 → 983 | 0 → 0 |
| /workspace/tasks | 705 | 320 | 804 | 52 | 474 → 474 | 0 → 0 |
| /workspace/projects | 701 | 368 | 768 | 45 | 66 → 66 | 0 → 0 |
| /workspace/timesheet | 713 | 380 | 812 | 48 | 68 → 68 | 8 → 1 |
| /workspace/skills | 648 | 360 | 360 | 41 | 38 → 38 | 4 → 1 |
| /workspace/goals | 727 | 340 | 1008 | 218 | 5802 → 5802 | 480 → 1 |
| /life/overview | 561 | 296 | 684 | 57 | 49 → 49 | 6 → 1 |
| /life/social | 652 | 348 | 784 | 54 | 110 → 110 | 0 → 0 |
| /life/entertainment | 634 | 316 | 716 | 28 | 140 → 140 | 0 → 0 |
| /life/places | 670 | 376 | 712 | 34 | 21 → 21 | 0 → 0 |
| /life/family | 575 | 312 | 680 | 46 | 29 → 29 | 0 → 0 |
| /hub/overview | 613 | 320 | 752 | 96 | 71 → 71 | 0 → 0 |
| /customers | 638 | 364 | 696 | 51 | 52 → 52 | 0 → 0 |
| /hub/apps | 668 | 336 | 788 | 83 | 1328 → 1328 | 0 → 0 |
| /hub/companion | 602 | 340 | 788 | 77 | 72 → 72 | 0 → 0 |
| /hub/agents | 659 | 340 | 676 | 38 | 92 → 92 | 0 → 0 |
| /hub/databases | 580 | 308 | 644 | 17 | 39 → 39 | 0 → 0 |
| /hub/settings | 592 | 304 | 696 | 26 | 160 → 160 | 0 → 0 |
| /hub/notifications | 565 | 276 | 608 | 20 | 53 → 53 | 0 → 0 |
| /hub/help | 664 | 332 | 756 | 38 | 63 → 63 | 0 → 0 |
| /hub/logs | 626 | 316 | 1040 | 26 | 145 → 145 | 0 → 0 |
| /hub/about | 616 | 328 | 772 | 44 | 85 → 85 | 0 → 0 |
| /hub/plans | 710 | 388 | 756 | 68 | 15 → 15 | 0 → 0 |
| /login | 227 | 376 | 376 | 75 | N/A | 0 → 0 |
| /welcome | 529 | 752 | 752 | 120 | N/A | 0 → 0 |
| /privacy | 570 | 688 | 688 | 62 | N/A | 0 → 0 |
| /terms | 547 | 696 | 696 | 78 | N/A | 0 → 0 |

## Slow resources and practical limits

These are local resource observations, including the synthetic state response. Resource durations include scheduling and fixed fixture delay; they do not establish backend latency.

| Resource | Decoded bytes | Observed duration ms |
| --- | ---: | ---: |
| inter-latin-600-normal-LgqL8muc.woff2 | 24452 | 2891 |
| inter-latin-500-normal-Cerq10X2.woff2 | 24272 | 2890 |
| inter-latin-400-normal-C38fXH4l.woff2 | 23664 | 2889 |
| state | 1656534 | 559 |
| useHashTab-di03S2Ib.js | 1121 | 449 |
| Symbols-BeOzw1rh.js | 4411 | 443 |
| ActiveShapeUtils-CehfPUsb.js | 6163 | 426 |
| PieChart-HL9T0Tj9.js | 13194 | 424 |

The 1.66 MB workspace response dominates transfer for a populated account. Its server/database work is simulated, so this pass makes no server-load or data-fetch optimization claim. The large goal/shopping lists still mount thousands of elements and need separate higher-scale interaction testing; passing initial-paint budgets does not certify arbitrary collection sizes. The shared decoded CSS also remains larger than the generic 100 KB guideline, while staying inside the existing project budget. This pass preserves the approved styling instead of performing a broad CSS rewrite.

A first-browser sample showed a delay before the HTTP request started. A retained trace records fetchStart 0.8 ms, requestStart 1,095 ms, responseStart 1,107.5 ms and responseEnd 1,109.4 ms; initialization instrumentation took about 0.1 ms. The delay precedes both server handling and application JavaScript. It is not explained by formatter construction, and its cause within the browser/measurement environment has not been isolated. Medians do not erase this cold-start concern. Both instrumented and uninstrumented three-sample diagnostic reports are retained.

Equity/Forex/Family/Companion results cover portal hosts with optional services unavailable. Customer-admin backends, actual native apps, the full 3D renderer, all 201 registered view destinations and production authentication/provider latency are not certified by these measurements. No deployment, migration or real-record mutation occurred. The earlier broad-suite limitations remain documented in the original report; they were not hidden by this targeted verification.

## Reproduce

From the growthtrack-ultimate directory:

```powershell
npm run build
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run performance:pages -- --label=populated-current --fixture=populated --runs=3
npm run performance:check -- --report=../.gstack/benchmark-reports/populated-current.json
npm exec -- vitest run src/tests/userFormatters.test.js src/tests/userFormatters.performance.test.js src/components/Notes.persistence.test.jsx --maxWorkers=2
```

Use an equally sampled populated report as --baseline for future timing comparisons. Old reports without a fixture marker are treated as empty-data reports; mixing scenarios, counts or instrumentation is rejected. --no-format-counters disables constructor instrumentation for diagnostic runs. Reports and samples live under ignored .gstack/benchmark-reports/.

Operational learnings: network-idle is unsuitable for pages with continuous health polling; wait on startup work instead. Formatter caches should use bounded configuration keys and preserve native validation of invalid options. Paginating only rendered Notes retains the complete loaded collection for search, links and persistence. Keep raw navigation timing to distinguish browser pre-request delays from server or application work.
