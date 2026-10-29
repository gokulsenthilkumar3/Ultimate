# Collection performance follow-up — 29 October 2026

Status: **DONE_WITH_CONCERNS**. All 65 default destinations render in the final three-sample run. Goals and Shopping now bound mounted cards, preserve paging workflows and clear private drafts when the owner changes. Companion frames wait for confirmed availability. Real backend latency, independent companion applications, GPU workloads and every interactive tab are outside this evidence.

This follows the [populated-data audit](2026-10-29-populated-page-performance.md) and [startup audit](2026-10-29-page-performance.md). The existing [agent transport and action guardrails](2026-10-29-agent-guardrails.md) are preserved.

## Measured changes

| Page | Main-region elements | Median LCP | Startup blocking |
| --- | ---: | ---: | ---: |
| goals | 5,802 → 1,247 (78.5% fewer) | 1,008 → 820 ms | 218 → 59 ms |
| shopping | 5,078 → 708 (86.1% fewer) | 988 → 816 ms | 180 → 86 ms |

Both pages previously rendered every filtered record. They now mount 25 cards per page using [useCollectionPage](../../growthtrack-ultimate/src/hooks/useCollectionPage.js) and the existing [Pagination](../../growthtrack-ultimate/src/components/ui/Pagination.jsx) primitive. Filtering, search and totals still use the full canonical collection. Filter changes reset paging; deletion clamps it immediately; adding a row cannot revive an obsolete page. Keyboard paging focuses the result region.

[Goals](../../growthtrack-ultimate/src/components/GoalsDashboard.jsx) retains edit, progress, note and sub-task drafts across page changes. Open plan reveals the focus goal even when filters or a different page hide it. A failed edit keeps its draft; pending edits lock their fields and reject duplicate submissions. Deletion waits for acknowledgement, and Undo is bound to the original owner/session/snapshot so it cannot copy a prior account's goal into a new session.

[Shopping](../../growthtrack-ultimate/src/components/Shopping.jsx) retains edit, unit-price and expense drafts while paging. Its store places acknowledged updates at the front, so a successful edit, price log or expense link reveals the item's new filtered/priority position. The regression covers a move from page three to page two; it does not assume that every saved item belongs on page one. Failed writes retain their drafts.

Both page workspaces remount on owner changes, including when record IDs are reused. No auth, permissions, data migrations, owner records or provider calls are bypassed. Fictional fixture imports remain confined to test/measurement code.

[Companion hosts](../../growthtrack-ultimate/src/components/UnifiedWorkspace.jsx) previously admitted their iframe before service health was known. With the isolated service unavailable, that requested a fallback Ultimate document inside the frame. The host now shows a readiness/unknown/offline state and admits only a boolean online acknowledgement. Unknown status offers a direct product link. Partial or failed background probes retain an existing confirmed frame, avoiding disruption to its work. Browser checks cover pending status, failure, retry and eventual admission of a fictional companion, with zero child-frame workspace bootstraps. The production collector counts initial state requests and child document navigations so this regression cannot be hidden in main-frame resource totals.

## Method and scope

Before: populated-stable (2026-10-29T15:32:13.589Z). After: collections-verified (2026-10-29T17:48:25.204Z). Both use Chrome 156.0.8078.48, 3 fresh contexts per default route, 1440 × 900 viewport, reduced motion, a fixed 150 ms state-response delay, identical fictional record counts and formatter instrumentation. The production Vite build is served through the production Express static handler with build-time compression. Analytics are denied, service workers blocked and external requests aborted. The real application server and owner database are never started.

The snapshot contains 1,656,534 decoded bytes, including 120 goals, 200 shopping items, 300 notes, 2,000 tasks, 3,000 transactions and 200 portfolio holdings; the other seeded counts are preserved in the previous report and raw JSON. Optional external services remain unavailable. Rendering their setup/unavailable states does not test their independent applications or service performance.

There are 195 final samples. Each table entry is a per-page median, not field telemetry or an INP measurement. Blocking means observed startup long-task time above 50 ms. First-heading readiness does not establish completion of nested requests/charts. Raw navigation/resource timings and outliers are retained in ignored .gstack/benchmark-reports/collections-verified.json; the previous baseline is untouched. The initial single-sample collection smoke run is not used for timing comparisons.

The earlier full sweep is retained as collections-final.json (2026-10-29T17:16:31.165Z). It captured one Finance Trends render beyond the 8-second deadline, one unfinished Equity startup request beyond 12 seconds and a Health+ median LCP of 2,868 ms. No page exceptions were captured. The three flagged routes subsequently passed three unprofiled samples each in collections-flagged-check.json (2026-10-29T17:17:55.439Z). Three Health+ CPU profiles did not reproduce the earlier long blocking task: the longest profile was 3.59 seconds with about 3.16 seconds attributed to idle time. Profiling is diagnostic, is marked explicitly and cannot be used for budget comparisons. The exact cause of the earlier execution stalls is not established; they are not claimed as a fixed backend or Health+ algorithm issue. The final full retest follows the companion readiness fix and retains its own raw samples.

This covers the 61 registered feature defaults plus four public pages. The generated design inventory's 201 page/view destinations and viewport matrices are not inferred browser coverage. Most production query-view labels currently share the default component; testing those URLs alone would not prove their interactive tab behavior.

## Budgets and verification

- 65/65 default routes render without a captured page exception or error boundary. Maximum per-page median FCP 688 ms; LCP 1,160 ms.
- Project startup budgets: 446,796 decoded JavaScript bytes (<450,000); 314,084 decoded CSS bytes (<320,000). All 157 Brotli/gzip asset pairs decompress to the final originals. The default dashboard remains under its 1 MB decoded JavaScript budget and export code stays deferred.
- Browser guards require Notes <2,500 DOM elements and Goals/Shopping <2,000 for this populated scenario. Every protected sample must make one workspace state request; public samples make none. Unavailable companion hosts must make zero child document navigations. Comparison guards require identical fixture/counts/browser/instrumentation/sampling/route coverage and reject >10% JavaScript/CSS growth. Paint budgets remain FCP <1,800 ms and LCP <2,500 ms.
- 49 distinct targeted unit/component cases pass across the main 42-case run and focused reruns/additions: Goals 7, Shopping 6, companion readiness 4, shared UI 4, Notes 22, formatters 6. The final seven Goals cases, six Shopping cases and four companion cases pass after their respective follow-up fixes. Three HTTP/compression tests and six gateway/proxy tests pass. Build, typecheck and changed-code lint pass.
- Three Chrome workflows pass across the combined run's two collection cases and the corrected companion-case rerun. They check keyboard paging, expanded/edit/price draft retention, failed Goals save, search beyond the first page, a successful Shopping edit, 390 px horizontal bounds and frame admission. The combined run initially failed an incorrect assertion of one development-mode bootstrap; StrictMode repeats the main bootstrap, so that check now targets child-frame bootstraps, with a separate single-request guard on production measurements. The initial motion-enabled Goals run timed out on action stability; final runs use the same reduced-motion policy as the benchmark. This is not full motion, visual or cross-browser approval.
- UI inventory/impact/handoff regenerated; drift, five design adapters and 23 generated application READMEs checked. No deployment or migration performed.
- The plan-preview checks pass 15/16 cases. The remaining check reports a stale embedded preview hash for humanoid-base.glb. Those model/preview assets have no changes in this work; the local asset inconsistency remains a separate concern. The full unrelated application test suite is not claimed green.

The following generic guides are stricter than the project's staged payload budgets and identify remaining weight rather than claiming a universal passing grade. Byte columns count browser-reported decoded/transfer values; the fictional state response is included in transfer measurements.

| Generic guide | Limit | Pages below limit | Outcome |
| --- | ---: | ---: | --- |
| FCP | <1,800 | 65/65 | Within guide |
| LCP | <2,500 | 65/65 | Within guide |
| Decoded JavaScript | <500,000 | 37/65 | Remaining concern |
| Decoded CSS | <100,000 | 0/65 | Remaining concern |
| Transferred resources | <2,000,000 | 36/65 | Remaining concern |
| Resource requests | <50 | 64/65 | Remaining concern |

## Page-by-page comparison

All time values are milliseconds. N/A main-region counts are public pages, which render outside the measured protected main region. Timing variation on unchanged pages is retained; DOM reductions are deterministic evidence of the collection fix. Generic-guide grade: A = all available guide metrics below budget, B = at least two-thirds, C = at least half, D = fewer than half. Missing metrics are excluded. This grade highlights the stricter payload guides above; it is separate from the project's staged startup budgets.

| Default route | Final FCP | LCP before → after | Blocking before → after | Main DOM before → after | Final JS KB | Guide grade | Render |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| /finance/overview | 448 | 744 → 948 | 33 → 77 | 203 → 203 | 572.8 | C | Rendered |
| /finance/transactions | 360 | 724 → 836 | 12 → 71 | 301 → 301 | 575.7 | C | Rendered |
| /finance/analytics | 328 | 792 → 888 | 96 → 152 | 226 → 226 | 939.7 | C | Rendered |
| /finance/trends | 368 | 956 → 1,040 | 228 → 228 | 485 → 485 | 947.4 | C | Rendered |
| /finance/budgeting | 332 | 708 → 692 | 14 → 23 | 79 → 79 | 568.7 | C | Rendered |
| /finance/subscriptions | 348 | 788 → 784 | 41 → 39 | 293 → 293 | 570.3 | C | Rendered |
| /finance/portfolio | 392 | 940 → 980 | 85 → 182 | 4,654 → 4,654 | 803.8 | C | Rendered |
| /finance/sip | 368 | 808 → 808 | 210 → 214 | 327 → 327 | 815.1 | C | Rendered |
| /finance/shopping | 388 | 988 → 816 | 180 → 86 | 5,078 → 708 | 631.7 | C | Rendered |
| /finance/sync | 332 | 740 → 1,160 | 48 → 48 | 135 → 135 | 575.7 | C | Rendered |
| /finance/finsync | 348 | 680 → 704 | 33 → 38 | 48 → 48 | 458.0 | B | Rendered |
| /finance/oxfin | 396 | 652 → 720 | 23 → 48 | 48 → 48 | 458.0 | B | Rendered |
| /finance/equity | 372 | 768 → 940 | 52 → 85 | 28 → 34 | 454.3 | B | Rendered |
| /insights/overview | 332 | 800 → 916 | 119 → 133 | 82 → 82 | 455.3 | B | Rendered |
| /insights/actions | 376 | 644 → 752 | 15 → 54 | 111 → 111 | 453.9 | B | Rendered |
| /insights/current | 264 | 744 → 692 | 55 → 47 | 62 → 62 | 461.4 | B | Rendered |
| /insights/analytics | 348 | 768 → 1,076 | 63 → 48 | 67 → 67 | 867.7 | C | Rendered |
| /insights/dashboards | 292 | 860 → 1,084 | 131 → 94 | 242 → 242 | 905.9 | C | Rendered |
| /insights/progress | 364 | 656 → 696 | 35 → 42 | 25 → 25 | 478.6 | B | Rendered |
| /insights/forecast | 372 | 920 → 588 | 160 → 159 | 22 → 22 | 846.4 | C | Rendered |
| /insights/forex | 212 | 736 → 560 | 28 → 0 | 28 → 34 | 454.3 | B | Rendered |
| /wellness/overview | 276 | 884 → 676 | 168 → 65 | 95 → 95 | 454.5 | B | Rendered |
| /wellness/sleep | 256 | 792 → 780 | 172 → 60 | 274 → 274 | 853.6 | C | Rendered |
| /wellness/lifestyle | 320 | 812 → 788 | 113 → 89 | 827 → 827 | 464.6 | B | Rendered |
| /wellness/mind | 272 | 964 → 756 | 140 → 81 | 121 → 121 | 820.1 | C | Rendered |
| /wellness/medical | 276 | 708 → 712 | 56 → 44 | 73 → 73 | 823.0 | C | Rendered |
| /wellness/health | 344 | 656 → 776 | 20 → 55 | 82 → 82 | 464.5 | B | Rendered |
| /wellness/habits | 340 | 992 → 1,040 | 123 → 127 | 1,401 → 1,401 | 471.0 | C | Rendered |
| /wellness/physique | 364 | 736 → 868 | 55 → 75 | 176 → 176 | 537.0 | C | Rendered |
| /wellness/assessment | 328 | 660 → 660 | 36 → 30 | 39 → 39 | 456.2 | B | Rendered |
| /wellness/training | 336 | 768 → 768 | 9 → 38 | 91 → 91 | 964.5 | C | Rendered |
| /wellness/strength | 324 | 600 → 688 | 17 → 33 | 32 → 32 | 837.3 | C | Rendered |
| /wellness/nutrition | 360 | 796 → 892 | 196 → 234 | 551 → 551 | 845.5 | C | Rendered |
| /wellness/hydration | 372 | 640 → 692 | 36 → 56 | 5 → 5 | 828.7 | C | Rendered |
| /wellness/sync | 336 | 600 → 636 | 32 → 30 | 16 → 16 | 446.8 | B | Rendered |
| /workspace/overview | 332 | 864 → 788 | 154 → 105 | 73 → 73 | 454.2 | B | Rendered |
| /workspace/calendar | 360 | 844 → 800 | 109 → 80 | 1,182 → 1,182 | 500.0 | B | Rendered |
| /workspace/files | 296 | 1,056 → 1,060 | 47 → 55 | 102 → 102 | 474.0 | B | Rendered |
| /workspace/notes | 308 | 804 → 808 | 73 → 57 | 983 → 983 | 740.8 | C | Rendered |
| /workspace/tasks | 260 | 804 → 652 | 52 → 1 | 474 → 474 | 493.9 | B | Rendered |
| /workspace/projects | 264 | 768 → 584 | 45 → 4 | 66 → 66 | 487.7 | B | Rendered |
| /workspace/timesheet | 288 | 812 → 704 | 48 → 11 | 68 → 68 | 931.3 | C | Rendered |
| /workspace/skills | 304 | 360 → 304 | 41 → 19 | 38 → 38 | 471.7 | B | Rendered |
| /workspace/goals | 284 | 1,008 → 820 | 218 → 59 | 5,802 → 1,247 | 822.4 | C | Rendered |
| /life/overview | 280 | 684 → 712 | 57 → 61 | 49 → 49 | 452.2 | B | Rendered |
| /life/social | 288 | 784 → 672 | 54 → 11 | 110 → 110 | 465.3 | B | Rendered |
| /life/entertainment | 276 | 716 → 644 | 28 → 11 | 140 → 140 | 475.7 | B | Rendered |
| /life/places | 328 | 712 → 628 | 34 → 6 | 21 → 21 | 455.8 | B | Rendered |
| /life/family | 276 | 680 → 644 | 46 → 5 | 29 → 35 | 454.3 | B | Rendered |
| /hub/overview | 268 | 752 → 684 | 96 → 106 | 71 → 71 | 453.0 | B | Rendered |
| /customers | 272 | 696 → 624 | 51 → 32 | 52 → 52 | 458.0 | B | Rendered |
| /hub/apps | 312 | 788 → 792 | 83 → 73 | 1,328 → 1,328 | 469.9 | B | Rendered |
| /hub/companion | 296 | 788 → 804 | 77 → 64 | 72 → 72 | 454.3 | B | Rendered |
| /hub/agents | 332 | 676 → 696 | 38 → 44 | 92 → 92 | 762.4 | C | Rendered |
| /hub/databases | 328 | 644 → 664 | 17 → 47 | 39 → 39 | 473.6 | B | Rendered |
| /hub/settings | 292 | 696 → 692 | 26 → 34 | 160 → 160 | 576.6 | C | Rendered |
| /hub/notifications | 280 | 608 → 632 | 20 → 6 | 53 → 53 | 452.8 | B | Rendered |
| /hub/help | 312 | 756 → 680 | 38 → 20 | 63 → 63 | 451.3 | B | Rendered |
| /hub/logs | 304 | 1,040 → 972 | 26 → 27 | 145 → 145 | 625.4 | C | Rendered |
| /hub/about | 320 | 772 → 856 | 44 → 18 | 85 → 85 | 468.1 | B | Rendered |
| /hub/plans | 284 | 756 → 592 | 68 → 20 | 15 → 15 | 449.0 | B | Rendered |
| /login | 320 | 376 → 320 | 75 → 39 | N/A | 446.8 | B | Rendered |
| /welcome | 688 | 752 → 688 | 120 → 80 | N/A | 452.3 | B | Rendered |
| /privacy | 592 | 688 → 592 | 62 → 35 | N/A | 452.1 | B | Rendered |
| /terms | 644 | 696 → 644 | 78 → 57 | N/A | 451.4 | B | Rendered |

## Slowest observed resources

Per-resource median elapsed time across its recorded requests; decoded sizes are separate from transfer sizes. Includes the intentionally delayed fictional state response. Resource names come from the finalized build, without owner data or environment values.

| Resource | Decoded KB | Median ms | Observations |
| --- | ---: | ---: | ---: |
| state | 1656.5 | 234 | 183 |
| FixedSizeList-B6-4oNlR.js | 0.9 | 132 | 6 |
| useCollectionPage-9NWjnSSm.js | 0.4 | 96 | 6 |
| graphicalItemSelectors-C0iA8xke.js | 0.2 | 90 | 36 |
| YAxis-B2GKrkEX.js | 10.6 | 82 | 42 |
| ErrorBarContext-CW5QOKK7.js | 0.7 | 81 | 39 |
| LineChart-Cwjeexlr.js | 10.0 | 79 | 18 |
| Pagination-CrRWEr4q.js | 1.0 | 79 | 9 |
| getRadiusAndStrokeWidthFromDot-CT8nil7j.js | 5.1 | 78 | 36 |
| inter-latin-600-normal-LgqL8muc.woff2 | 24.5 | 77 | 195 |

## Remaining limits

- Some fresh browser launches pause before navigation requestStart; this is retained in raw samples. Earlier diagnostics isolated the delay before application execution, not its exact browser/environment cause. It is not reported as a fixed server issue or silently discarded.
- The shared CSS is still above the generic 100 KB guide, and many chart-heavy routes exceed 500 KB decoded JavaScript. Root budgets have limited headroom. The approved shared theme and independent product boundaries remain intact.
- The populated snapshot is intentionally large and canonical aggregate calculations still see all loaded records. This pass bounds mounted collection cards; it does not add server pagination or certify real network, database, simultaneous-user or provider performance.
- Portfolio still mounts 4,654 elements for 200 holdings. Its formatter churn was fixed in the previous pass; this pass does not claim a bound on every table, chart or nested sub-task/log collection. Larger scenarios and field measurements remain follow-up work.
