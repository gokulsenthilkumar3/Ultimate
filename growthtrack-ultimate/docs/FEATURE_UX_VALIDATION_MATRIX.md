# GrowthTrack Feature UX Validation Matrix

This is the release checklist for every user-facing module. A tab is complete only when all columns pass on desktop and mobile.

## Implementation status — 2026-09-19

Completed foundation work:

- Action Center is available as the actionable Insights layer.
- Insights and Analytics routes use semantic deep-linkable tabs.
- Audit Logs uses shared search and pagination controls and no longer emits an empty query suffix.
- The canonical module registry exposes identifiers, paths, descriptions, aliases, availability, icons, and keywords.
- Shared PageHeader, SearchField, Pagination, StatusBadge, DataReadiness, and ChartFrame primitives are available.
- Local Ollama access is behind a discoverable provider interface; model names are not hard-coded.
- Authentication is behind a provider interface; local authentication remains the default and Clerk remains disabled.
- Humanoid GLBs load locally without a remote Draco decoder dependency.
- Repository exclusions cover private exports, backups, local AI weights, credentials, and 3D working files.
- Automated release gate: 9/9 passing. Unit suite: 237/237 passing. Production build: passing.

Open quality debt:

- Full repository lint baseline is 129 errors and 22 warnings. Older application code still contains unused code, effect-driven state, render-time mutation, hook dependency, test-global, and Fast Refresh boundary violations.
- The production build warns about the general vendor and Three.js chunks. The 3D chunk remains inside the current enforced budget, but finer route/vendor splitting is still required.
- A passing structural GLB gate does not certify human realism. Authored topology, rigging, materials, inclusive appearance review, stress poses, and calibrated measurement sign-off remain asset-pipeline work.

| Area | Tabs | Functional contract | UX and visual contract | Automated gate |
|---|---|---|---|---|
| Insights | Action Center, Overview, Current, Analytics, Dashboard, Progress, Forecast | Hash/deep links, live store data, deterministic calculations, honest confidence and missing-data states | One page header, semantic nested tabs, readable chart alternatives, consistent typography and actions | Unit calculations, tab keyboard tests, deep-link E2E, empty/data/error screenshots |
| Wellness | Command, Sleep, Lifestyle, Mind, Medical, Health+, Habits, Physique, Assessment, Training, Strength, Nutrition, Hydration | Every write persists, delete targets the correct record, derived values use canonical helpers | Sensitive data is clearly labelled, forms have units and validation, summaries link to source data | CRUD integration tests, validation tests, mobile forms, reduced-motion/forced-colors |
| Workspace | Workspace, Tasks, Projects, Timesheet, Skills, Goals | Search/filter/sort agree, mutations persist, timers survive safe navigation | Search has label/clear state, long lists paginate or virtualize, destructive actions confirm | Search/filter tests, CRUD E2E, pagination boundary tests |
| Finance | Overview, Analytics, Trends, Budgeting, Subscriptions, Portfolio, SIP, Shopping, Sync | Currency math is finite and locale-aware; imports deduplicate; budgets and totals reconcile | Financial estimates disclose assumptions; charts have text summaries; empty states lead to data entry | Calculation fixtures, import tests, reconciliation tests, responsive snapshots |
| Life | Life Command, Social, Entertainment, Maps | External data failures degrade safely; links and filters work | External/offline status is explicit; search and list controls remain keyboard usable | Network-failure tests, search tests, mobile layout |
| Hub | Apps, Agents, Databases, Profile, Notifications, Helpdesk, Logs, About, Plans | Admin actions honor ownership; logs/exports reflect persisted data | Technical failures use actionable copy; tables paginate; settings have labels and save state | Auth/ownership integration, export tests, pagination and modal keyboard tests |

## Shared visual acceptance

- Headers use the shared page hierarchy: eyebrow, one `h1`, optional short description, then actions.
- Body text remains at least 14px on desktop; controls and metadata never rely on color alone.
- Icons come from the shared Lucide set and carry `aria-hidden` unless they are the only accessible label.
- Theme colors come from semantic tokens (`--text-*`, `--bg-*`, `--accent`, `--danger`); feature code must not introduce a new brand palette.
- Search inputs use `type="search"`, a visible or screen-reader label, clear behavior, result count, and an explicit no-results state.
- Lists above 25–50 records paginate or virtualize; pagination announces the range, total, current page, and disabled boundaries.
- Every async surface has loading, empty, error, retry, and offline behavior.
- Footer and fixed navigation never obscure the final interactive row at supported viewport sizes.

## Release gates

1. Production build and unit suite must pass.
2. Changed files must have zero lint errors.
3. Desktop and Pixel-class mobile navigation smoke tests must pass.
4. No console errors may occur while opening each primary and nested tab.
5. GLB validation, morph coverage, visual fixture, and fallback-mode tests must pass before promoting a new model.
