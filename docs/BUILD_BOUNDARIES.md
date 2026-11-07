# Application ownership and independent builds

Prefer domain-owned UI modules and independently buildable applications. Share design primitives and explicit API contracts where reuse is useful. A portal route does not transfer ownership of the underlying product's customer database or runtime.

## Build one application at a time

Run these commands from the repository root, after installing and configuring the selected application's dependencies. These are individual build entry points, not a claim that all existing builds currently pass.

| Build target | Root command | Output / responsibility |
| --- | --- | --- |
| Review demo | `npm run build:design` | `growthtrack-ultimate/dist-admin-demo/`; fictional data only |
| Ultimate portal | `npm run build:ultimate` | `growthtrack-ultimate/dist/`; portal UI |
| FinSync customer web | `npm run build:finsync` | `FinSync/apps/web/.next/`; separate customer product |
| OxFin customer web | `npm run build:oxfin` | `FinSync/OxFin/ox-fin-web/.next/`; separate customer product |
| Equity web, during migration | `npm run build:equity` | `Equity/NiftyLens/.next/`; existing market frontend |
| Family web, during migration | `npm run build:family:web` | `Family Connect/familyconnect/frontend/dist/`; existing family frontend |
| Family API | `npm run build:family:api` | `Family Connect/familyconnect/backend/dist/`; existing family backend |

The existing `npm run build` remains the Ultimate build. No aggregate build starts every product or external service. FinSync uses its parent npm workspace for dependency installation; that does not make OxFin or Ultimate a prerequisite for its frontend build. Next.js builds can require their selected application's environment and configured services; no usable secrets belong in these commands or artifacts.

Forex retains its Python environment, inference API and training artifacts. Its model training is not part of a frontend build. Its existing Dockerfiles provide a separate packaging path when required. Mobile apps retain their own Expo projects and development commands; native distribution is a separate workstream from the current desktop UI review. Experimental OxFin services with incomplete manifests are reference packages, not newly deployable services.

## UI modules

The demo's previously combined screen file is split into `growthtrack-ultimate/src/admin-demo/screens/`:

- Overview, customer administration, markets, family, growth, finance, work, life, insights, system and public pages have explicit route ownership in `screenRegistry.js`.
- Those thirteen route families load on demand, including dedicated calendar and Physique screens. Physique also owns a lazy stylesheet. File and setup views are shared presentation modules. The subsequent [UI audit](plans/2026-10-28-ui-audit.md) fixes verified interaction, accessibility and responsive issues within those modules.
- Reusable controls, tables, dialogs and chart primitives stay shared in `components.jsx`; application rules, data permissions and service connections belong to their owning domains.
- FinSync and OxFin reuse customer-admin presentation while product identity and scoping remain explicit. Their customer-facing applications retain separate builds.

The [approved production rollout](plans/2026-10-28-production-ui.md) applies the shared design in Ultimate and adds a dedicated customer-admin domain. The [native modules implementation](plans/2026-10-30-native-modules.md) now loads NiftyLens, Family Connect and Forex from `src/domains/{equity,family,forex}`. Their frames, motion, paged tables and lightweight SVG charts share `src/domains/native`; none imports fictional demo data. Market-provider configuration, Family identity/roles/files and Python models remain with their owners. Restricted read-only FinSync/OxFin customer adapters now exist; explicit product credentials, authorized readers and runtime verification are still required. Keep page-specific rules with their domain and common tokens/primitives in the shared UI layer. Enforce dependencies toward shared contracts and primitives; avoid sibling-domain implementation imports and circular dependencies.

## Runtime and release ownership

| Owner | Portal responsibility | Separate runtime responsibility |
| --- | --- | --- |
| Ultimate | Shell, owner session, work/growth views, admin BFF, desktop host | Existing Ultimate API and persistence |
| Equity | Native market watch, movers, quote details and source status | Public price-cache adapter, pipeline and provider configuration |
| Family | Native tree, people, memories, events, vault and access views using the Ultimate session | Signed Ultimate identity bridge, live tree permissions, private files and persistence; standalone auth only without the bridge |
| Forex | Native model, recent/history, comparison and volatility views | Cached Python inference, saved artifacts and historical dataset; training is separate |
| FinSync | FinSync customer-admin views | Customer web/mobile, product identity, finance data |
| OxFin | OxFin customer-admin views | Customer web, product identity, wallet/payment/investment APIs |

Give each owner an independent build/check job and versioned API contract. Run the shared token/contract checks when shared code changes, and build only the affected consumers. Keep readiness and unavailable states explicit so an offline optional product does not disable unrelated portal pages. Gate production UI migration on the user's visual approval and real customer access on the authenticated adapter work in the redesign plan.

## Local indexing is developer tooling

The checked-in exclusion policy is `scripts/code-index-policy.mjs`. `.codeindexignore` is an optional, ignored local extension, and `.code-index/` contains ignored generated data. The indexer works in a fresh checkout without either file. Both are excluded from Git and the applicable desktop/container packaging rules; do not ship them with an application or make a live product depend on them.

The local architecture graph uses that same source policy. Run `npm run context:graph`, then `npm run context:graph:query -- <repository-relative-file>` for direct neighbours or `npm run context:graph:impact -- <repository-relative-file>` for bounded indirect consumers. Run `npm run context:graph:coverage` to inspect unsupported references and parse diagnostics before relying on an impact result. See the [retrieval plan](plans/2026-10-28-code-retrieval.md) for supported import forms and limits. These commands do not establish runtime or build independence.

Verification: `node --test tests/code-context.test.mjs`, `npm run build:design`, `npm run test:design`. These checks verify the refactor and local exclusion policy; they do not publish a release or certify every legacy application build.

The current [UI impact analysis](plans/2026-10-28-ui-system-impact.md) maps conservative route-family reach and owner areas. Run `npm run impact:ui:check` for drift and `npm run scale:ui` for the bounded synthetic table/review checks. The latter measures Node model operations, not rendering or production concurrency.
