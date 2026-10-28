# Desktop redesign verification

Date: 28 October 2026. Tested with Node.js 24.12.0.

## Passing checks

| Check | Result |
| --- | --- |
| `npm run build:design` | Production preview build succeeds; local fonts bundled |
| `npm run build:ultimate` | Real application production build passes; existing lazy domains retained; 3D vendor size warning remains |
| Ultimate `npm run typecheck` | TypeScript check passes |
| Targeted production UI checks | 200 pass across navigation/focus, routes, preferences, shared controls, production tokens, customer boundary, auth/API client contracts and finance state |
| Targeted production UI/readiness lint | Zero errors and zero warnings; server syntax also passes |
| `npm run test:design` | 989 checks pass: 804 page/tab renders in both themes/densities, customer/review workflows, UI regressions, 27 supplied-proposal workflows and 45 semantic colour/boundary checks; see the UI audit |
| Preview HTTP request | `http://127.0.0.1:5410/admin-demo.html` returns 200 |
| `node --test tests/code-context.test.mjs` | 7 tests pass: source exclusions, redaction, bounded chunks, exact symbols, fresh-checkout defaults, local overrides, and Git ignore/tracking checks |
| `npm run test:gateway` | 6 tests pass: routing, readiness and proxy contracts |
| `npm run design:check` | All 5 existing product token adapters remain consistent |
| `npm run docs:check` | 23 application READMEs match the universal catalog |
| `npm run config:check` | 8 environment examples match their blank-secret templates |
| `node scripts/design-inventory.mjs --check` | 61 production feature routes and 54 source stylesheets accounted for |
| `npm run impact:ui:check` | Conservative static reach verified for 65 demo pages, 201 destinations and seven ownership areas |
| `npm run scale:ui` | Synthetic 10,000-record table and 24,120-record review checks pass; observed Node model timings stored locally, without browser or production-load claims |
| Existing avatar contract subset | 22 tests pass for garment queue, parametric save boundaries and semantic documents |
| Family backend `npm run build` | TypeScript compilation succeeds |
| Equity `npm run typecheck` | TypeScript check succeeds |
| Family secret configuration check | Missing JWT secret is rejected; explicitly supplied test-only value is read |
| `git diff --check` | No whitespace errors |

The design catalog has 65 pages and 201 page/tab destinations, including the 61 production features and four public layouts. These are design layouts and sample workflows, not 201 completed live integrations. Component rendering and colour-token checks do not inspect actual browser alignment, clipping, native focus behaviour or the full rendered accessibility tree.

The demo build, full 989-check suite, contrast checks, synthetic scale and generated documentation/configuration/impact checks were run for the supplied proposal. Separate product builds and the 22-test avatar subset are preserved baseline results from earlier work on this date; those implementations were not changed by this continuation. The six gateway/proxy checks were rerun and pass.

## Existing failures, preserved

- `npm run test:plan`: 15 of 16 checks pass. The preview's embedded source fingerprint differs from the current ignored local `humanoid-base.glb`. The relocated `human-preview.js` is byte-equivalent to the checked-in baseline after newline normalisation. Neither the preview geometry nor the runtime model was regenerated; the failure predates relocation.
- FinSync `npm run type-check`: two errors at `packages/utils/firebase-auth.ts:92`, where the existing source accesses `User.multiFactor`. That source is unchanged from the checked-in baseline. The first sandboxed run also could not write TypeScript's incremental cache; an approved rerun outside the sandbox confirmed the same two source errors without the cache-write error.

## Visual approval and implementation still outstanding

The available computer-use connection returned no browsers or apps. No screenshots were captured and no browser visual QA is claimed. Desktop layouts at 1024, 1280, 1440 and 1920 pixels, both themes, and a 390-pixel responsive fallback still need browser review. Use the demo's page catalog and approval/feedback controls; export the review to retain it.

The approved shell, theme, shared primitives, public styling and customer-admin presentation are now integrated into production source. The [production report](2026-10-28-production-ui.md) records exact scope. Existing domain workflows and Equity/Family/Forex integration remain connected; their complete native migrations are pending. FinSync/OxFin admin API adapters, real product roles, source-specific audit checks, native companion migrations and the production-wide CSS consolidation are planned after design approval. The legacy FinSync public-key encryption path remains a production blocker and is documented explicitly in the architecture plan.

No deployment, database schema migration, customer-account mutation, local secret-file edit, key rotation or source upload to an embedding service was performed.

## Modularity and ignore follow-up

The demo now has twenty-four screen component files with thirteen lazily loaded route families, plus shared controls and dedicated customer, review and entry-field modules. The Physique screen and its stylesheet load with their domain. The latest main JavaScript entry is about 275 kB (87.2 kB gzip); main CSS is about 62.3 kB (12.8 kB gzip), with 3.9 kB of lazy Physique CSS (1.1 kB gzip). These are bundle sizes, not measured page-load times. The latest [UI audit](2026-10-28-ui-audit.md) includes the supplied-proposal pass and 989 passing checks. Review revision v5 includes density and all six preview states, and invalidates earlier approvals. The [proposal implementation report](2026-10-28-proposal-implementation.md) records adopted workflows, accessible colour variants and adaptive layout decisions. The [impact analysis](2026-10-28-ui-system-impact.md) records route reach, ownership, review/storage scale and 3D integration boundaries.

`.codeindexignore` is no longer tracked and is ignored by Git; its local copy is retained. Generated `.code-index/` directories are also ignored. Checked-in defaults in `scripts/code-index-policy.mjs` allow source retrieval in fresh checkouts without the optional file. The applicable desktop/container packaging rules also exclude both local retrieval paths.

Root scripts now expose separate Ultimate, FinSync, OxFin, Equity, Family frontend and Family backend build commands. These aliases and the ownership map are documented in [build boundaries](../BUILD_BOUNDARIES.md). The successful demo build does not imply that all existing product builds have passed.
