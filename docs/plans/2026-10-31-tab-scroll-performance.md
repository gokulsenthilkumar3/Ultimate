# Horizontal subtabs and startup loading

Follow-up to the Hub/Life presentation work. The owner clarified that the difficult scrolling was horizontal, in rows of subtabs. The portal's hidden vertical scrollbar behavior is unchanged.

## Scroll behavior and UI

The earlier horizontal rows supplied edge shadows but no mouse-wheel translation or explicit way to advance a long row. `components/ui/OverflowRail.jsx` now provides previous/next buttons only when content overflows. It retains native touch and horizontal trackpad scrolling, supports an ordinary mouse wheel over the row, keeps a newly selected/focused item visible and preserves each owner's links, handlers, IDs and panel relationships. Buttons expose their purpose and disabled state, use 44px targets, honor RTL and use immediate scrolling when decorative motion is paused or reduced.

Wheel handling is restricted to these navigation rows; data tables retain their native scrolling. At either end, the wheel releases back to the page. The implementation uses a two-pixel tolerance because CSS scroll extents can be fractional while `scrollWidth` and `clientWidth` are rounded. Browser tests caught a one-pixel discrepancy that otherwise swallowed wheel events without moving the row.

Workspace page shortcuts and the shared Tabs primitive use the new rail. The remaining legacy view rows in Social, Entertainment, Projects, Portfolio, Shopping, Mind, Timesheet, Notifications and Logs use shared tab presentation. Companion product navigation and app-group filters retain their own semantics within the rail. Account sections use a vertical sticky menu on wide screens and a controlled horizontal row below 850px. The avatar editor retains its own selection/keyboard logic within the shared overflow presentation; scene assets and model logic are unchanged.

An early responsive check caught a relative-position offset on the account rail that overlapped the next card. Generic rail positioning no longer overrides the owner's sticky/static layout. Mobile shortcuts also give their space to the destinations rather than repeating the area label already present in the breadcrumb.

Inherited direction changes on the shell/html are observed even when no resize occurs. The effective direction also invalidates the selected-tab indicator, preserving the focused DOM node. Source review caught this case, and inherited-direction switching subsequently passed both unit checks and isolated Chrome checks on Analytics and Profile.

Measurements and edge-state updates are batched. DOM attributes and React state change only when an edge changes. The selected-tab indicator keeps its ResizeObserver across equivalent tab-array renders, avoiding repeated setup during timer ticks and query updates. Existing forms are not remounted to animate or scroll their navigation.

## Loading

`App.jsx` preloads the selected page, its area presentation and required legacy stylesheet concurrently during the existing authenticated bootstrap. Page rendering, queries and mutations still wait for the authenticated workspace state. The unconditional background prefetch of Overview, Actions and Tasks is removed.

`app/useRoutePreload.js` instead warms a likely next route after 160ms of deliberate link hover or immediately on keyboard focus. Passing across a link, leaving it, touch input, external links, downloads, constrained connections, Save Data and Lite do not initiate speculative requests. Failed imports can retry; the hint set is bounded and timers clean up on unmount/preference changes. The critical selected route is always loaded independently of these speculative limits. After the snapshot updates the shell, a cancellable zero-delay task marks the selected page ready. This separates the shell update from the page commit while keeping the authenticated state gate; session changes and cleanup cancel the pending readiness task.

Log-category counts are computed in one memoized pass rather than filtering the full log array once per category on every render.

## Verification and scope

- Targeted production checks: 184 tests across 18 suites passed, including session/sign-out regressions. A subsequent focused run passed 32 checks, including two additional live-direction regression cases. This is 186 distinct checks over the focused runs.
- The isolated fictional design build passed; its 1,005 tests passed. Gateway contracts passed (6), design adapters verified (5), application READMEs checked (23).
- The isolated Chrome harness exercised 19 distinct pages at 390px width: 36 navigation rows, including 34 overflowing rows. Previous/next controls, real mouse-wheel movement, release to page scrolling and pause/resume checks passed. Some source-equivalent rows were covered in the shared primitive tests rather than by visiting every registered view.
- Screenshots were inspected for baseline Analytics and the phone-sized Social, Family and Profile issues; corrected Social/Profile layouts were inspected again. Browser interaction coverage does not establish visual approval for every page or access to the owner's real records.
- Production build and TypeScript passed. All five current Kinetic resource gates passed: initial JavaScript 176,347 B gzip (180,000 B limit), critical CSS 41,654 B (45,000 B limit), font, route and lazy-heavy-dependency gates.
- `test:plan` retains the existing humanoid preview hash mismatch (15/16 pass). No model asset was regenerated.

The older `performance:check` decoded startup-JS ceiling of 450,000 B was already exceeded by the before build (525,613 B), and the final build is 529,344 B. It remains a separate failing target, not a new passing claim and not a budget that was increased to clear this work. Current Kinetic compressed-resource gates are recorded separately. Existing Mind breathing/journal/chart lint warnings and the Projects hot-refresh export warning remain; no lint error is introduced by this work.

## Local browser comparison

Before: `.gstack/benchmark-reports/scroll-before-20261031.json`; final reviewed source: `.gstack/benchmark-reports/scroll-reviewed-20261031.json`. These ignored local artifacts use the same fictional empty fixture, 150ms state delay, Chrome version, 1440px viewport, motion preference, instrumentation and three fresh-context samples per page. Screenshot collection is enabled in both. The final comparison ran after the other browser/test work finished. Values below are per-page medians. JavaScript is decoded route resource size, including modules loaded during the settling window; it is different from the compressed initial-entry gate.

| Page | First heading before / after (ms) | JavaScript before / after (decimal KB) | Requests before / after | Blocking before / after (ms) |
| --- | ---: | ---: | ---: | ---: |
| Analytics | 872 → 617 | 1128.1 → 1067.9 | 68 → 52 | 72 → 22 |
| Tasks | 738 → 824 | 695.4 → 675.8 | 49 → 42 | 34 → 90 |
| Life | 594 → 692 | 717.8 → 650.7 | 52 → 32 | 15 → 83 |
| Entertainment | 858 → 839 | 738.8 → 677.8 | 61 → 48 | 78 → 63 |
| Hub | 849 → 755 | 720.2 → 653.1 | 53 → 33 | 14 → 116 |
| Apps | 852 → 669 | 733.0 → 666.3 | 60 → 41 | 35 → 121 |
| Agents | 830 → 823 | 1028.1 → 962.3 | 64 → 45 | 48 → 59 |
| Profile | 940 → 783 | 843.5 → 776.3 | 67 → 49 | 26 → 107 |

Across these eight routes, decoded JavaScript fell 7.19%; the mean of the per-page first-heading medians changed from 816.6ms to 750.3ms (8.1% lower). These are local synthetic observations, not real-user, backend or full-page completion measurements. Timings varied across repeated runs, and main-thread blocking was higher on most routes in this final sample. This work does not claim a CPU-blocking improvement or an INP/FPS sign-off. The zero-delay commit split produced a 9ms Hub blocking median in an earlier focused probe, but the full-route samples remained mixed. All artifacts are retained; the table uses the final reviewed source rather than selecting the fastest run. Initial entry size grows about 0.7% decoded / 0.8% gzip for the navigation behavior while route startup loads less unrelated code.

All browser work uses the existing loopback-only fictional performance fixture with external requests blocked. The native live-browser bridge remains unavailable, so no real-account browser verification is claimed. Demo fixtures are not imported by production components; session, permission, record and mutation ownership is preserved. No deployment or data migration is part of this work.
