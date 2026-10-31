# Finance, Wellness, Workspace and optional companion

Implemented in production source on 31 October 2026 under the user's existing UI authorisation. No deployment, data migration or permission changes.

## Implemented

- Finance: recorded monthly balance, income/expense/investment summary, clearer period controls, budgets, signed activity, renewals and spending calendar. Budget links retain the selected month. Arithmetic, currency formatting and mutations remain with Finance.
- Wellness: one useful daily action, real dated records, today's habit check-offs, calm decorative artwork and twelve owner shortcuts. Daily check-in availability and callbacks remain unchanged.
- Workspace: task focus, bounded three-task queue, Tasks/Projects/Notes cards, saved-project board and dated activity. Saved-project links open My Projects. The Projects owner synchronises source/layout navigation with its registered URL views, preserving other search parameters and independent manual layouts.
- `ModulePresentation` wraps all Finance, Wellness and Workspace routes. It supplies decorative header art and domain-specific ledger, story and queue entrances through the existing shared motion budget. It does not fetch records, change forms or replace owner components. Mobile Finance omits header-only decoration to keep the period and records closer to the top.
- Main navigation uses **Finance** and **Hub**, including old configured labels, header context and mobile Hub module access. Internal IDs, saved order, routes and available modules are retained.
- The floating companion opens existing Agents and Action Center destinations. It does not contact a model or select records. Header paw control and Display preferences persist its visibility on this device. It hides behind other dialogs, respects pause/reduced motion/quality/visibility controls and stays above the mobile dock. An optional-feature error boundary isolates its failures from the workspace.
- The personal illustrated companion requested later in this session is documented in [the artwork notes](../design/2026-10-31-personal-companion.md). Login keeps its existing artwork.

## Verification

- Production build and TypeScript check pass; all five compressed Kinetic budgets pass. The final build has 176,932 gzip bytes of eager JavaScript (180,000 budget), with critical CSS 41,654 (45,000 budget). Personal artwork is route/companion-loaded, not an eager shell dependency. The older raw JavaScript gate remains over budget at 531,116 bytes against 450,000; it was already failing before this work, and its threshold was not raised.
- Focused route, navigation, owner-data, persistence, scrolling and motion suites pass. Design preview build and 1,005 tests pass. Gateway tests (6), design adapters (5) and generated application READMEs (23) pass.
- Chrome rendered all three overviews at 1280px/light/empty and 390px/light/populated, with tab controls, mouse-wheel movement, release to page scrolling and pause/resume checks. These six overview screenshots were inspected; Finance's mobile decorative header was subsequently compacted.
- An isolated Chrome fixture rendered all 33 other area routes at 390px/dark/populated: 12 Finance, 13 Wellness and 8 Workspace. No uncaught page errors, page horizontal overflow or pending startup requests. All scrolling and pause/resume checks passed. One initial OxFin RTL control timeout passed on an identical isolated retry; both reports remain available. Initial-route coverage is not every internal panel or visual approval.
- The browser companion flow passes actual owner links, Escape/focus restoration, destination focus, hide/show across reloads, Settings stacking, Finance/Hub labels and mobile dock clearance. No model, record-mutation or external requests occurred in that flow.

Reports and screenshots are ignored local artifacts in `.gstack/benchmark-reports/area-*`. Services and records were fictional, loopback-only fixtures with optional services deliberately unavailable. Concurrent functional runs have diagnostic timings, not performance claims about the owner's account. The inherited 3D preview-model hash mismatch still fails one `test:plan` check; no model was regenerated.

The final quiet, unprofiled three-run sample at 1280px (`area-final-performance-20261031`) recorded median route-ready times of 570ms Finance, 624ms Wellness, 774ms Workspace and 576ms Welcome, including the fixture's 150ms state delay where applicable. All samples have no page errors or page-width overflow. These are local startup observations; the single-sample before run cannot establish a reliable timing improvement. Generated source inventories, UI impact/handoff, application docs, scale model and bounded local retrieval index were refreshed and checked.
