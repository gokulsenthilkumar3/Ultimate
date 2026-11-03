# Overview and shared controls: impact review

Follow-up: [navigation usability and rendering impact](2026-11-03-navigation-ui-impact.md) records the next implementation pass. Clarification: `impact:ui` traces preview RecordsTable dependencies; its page/view counts below are preview estimates, not production DataTable coverage. The follow-up report lists production consumers separately.

CI follow-up: the initial PR run failed before application tests because Playwright 1.59.1 was incompatible with GitHub's Ubuntu 26.04 `ubuntu-latest` image, Android setup requested the removed SDK `tools` package, and the container context omitted build/proxy modules. Those failures are addressed in the follow-up commit and cross-layer matrix: browser/platform jobs use Ubuntu 24.04, Android compiles against API 36, and the container retains `staticCompressionPlugin.js` plus an in-context workspace proxy module.

## Latest incremental verification

Preserved the existing Overview and shared-control edits. Added Escape-to-clear to SearchField: focus stays in the input, a populated search consumes Escape before it reaches a containing surface, and an empty search lets Escape propagate. Consumer handlers can prevent the default behavior; read-only fields and IME composition are respected.

DataTable now caches its current-row selection count against rows, rowKey and the selected-key Set. Virtual-scroll renders with unchanged inputs reuse that count instead of scanning the full row collection. An immutable empty-selection default avoids rebuilding the Set for tables without selected keys. Changed inputs still require O(N) work; no measured speedup is claimed.

Fresh verification: production build and 19 tests across EditorialOverviews, DataTable.virtual and foundation passed. UI impact regeneration/drift check, design adapter verification, generated README verification and whitespace checks passed. The conservative inventory reports 65 pages and 205 destinations, with potential table impact across 54 pages and 181 views. These counts are not rendered coverage.

Primary interaction risk: a populated search inside a dismissible surface now needs one Escape to clear and another to dismiss. Shared search consumers inherit this behavior. Browser layout/theme review remains pending; no deployment or data migration was performed. Earlier verification entries below describe the accumulated work, not additional tests run in this pass.

Workspace follow-up: all 6 gateway tests passed. Plan-preview checks passed 15 of 16 tests; the remaining test reports that the embedded historical preview's humanoid-base.glb hash differs from the current asset. This change does not modify those model assets or generators. Synthetic UI scale checks completed (10,000 records and 24,600 review records), and the local retrieval index was refreshed. Synthetic timings exclude browser rendering and are not a before/after benchmark of these changes.

## Changes

Overview now provides direct summary links and descriptive, responsive workspace cards. Shortcut definitions live in one constant instead of repeated markup. Fixed incorrectly encoded arrow characters from the earlier edit.

Task normalization, pending-task sorting, due-task filtering and recent-activity derivation are memoized against their source collections. Unrelated renders reuse these results; collection changes recompute them. Due-task filtering also depends on the current date. First-render complexity is unchanged; no measured runtime speedup is claimed.

The accumulated shared-control changes restore input focus after clearing search, suppress the duplicate browser clear icon, show a selected-record count and clear-selection action, and highlight table rows containing keyboard focus.

## Affected surfaces and risks

| Surface | Impact | Review focus |
| --- | --- | --- |
| Insights Overview | Summary links, ten shortcut cards, cached derived records | Long labels, narrow widths, dark theme, source updates |
| DataTable consumers | Selection toolbar appears only with a selection callback and selected keys | Clearing includes all selected keys, including keys outside the current rows |
| SearchField consumers | Clear action returns focus to input | Custom clear callbacks and keyboard flow |
| Shared native ModuleUI, customer administration, Logs, FloatingPillDock and FilterBar | Direct consumers of changed shared controls | Verify each applicable interaction in rendered pages |

Routes, source stores, authentication, permissions and API contracts are unchanged. No demo fixtures, migration or deployment are included. Memoization relies on immutable collection updates, consistent with React store usage. Shared CSS changes are scoped to the relevant component classes.

## Verification

- Production Vite build passed.
- 17 existing tests passed across Overview, virtual tables and shared component suites.
- UI impact map regenerated and drift check passed.
- Design adapters and 23 generated application READMEs verified.
- Diff whitespace check passed.

The generated impact inventory is conservative, not evidence of browser coverage. Browser layout, theme and keyboard review remain pending. No production-load or before/after timing measurements were performed.

## Selection follow-up

Shared DataTable now memoizes selected keys as a Set. Membership checks avoid repeated linear array scans; deselecting the current page also uses a Set while preserving off-page selections. Set construction costs O(S), and scanning N current rows costs O(N), instead of O(N*S) membership work. These are algorithmic bounds, not measured timings.

Clearing selection restores focus to the scrollable table, or its named group when no rows are visible. The wrapper uses group semantics to avoid duplicating the table's named region. All DataTable consumers inherit this behavior; routes and callback contracts stay unchanged.

The updated four-suite run passes 20 tests, including new regression coverage for cross-page deselection, clear-selection focus, empty filtered results and search-clear focus. UI impact regeneration and drift checking pass. Browser verification remains pending.
