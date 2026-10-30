# Native Ultimate modules — implementation and QA

30 October 2026 · branch `feat/playful-2d-motion` · local implementation, no deployment or database migration.

## Delivered

| Module | Native Ultimate route | Implemented flows |
| --- | --- | --- |
| NiftyLens | `/Ultimate/finance/equity` | Market watch, symbol search, sorting, 25-row pages, movers, source status, quote and supplied range details |
| Family Connect | `/Ultimate/life/family` | Existing-account connection or explicit registration, tree creation/selection, bounded relationship diagram, full-directory search, profiles and edits, relationships, memories, private files, milestones and role management |
| Forex Studio | `/Ultimate/insights/forex` | Saved models, single/compare/all currencies (groups of six), recent/history windows, observed/model charts, observed-return volatility, paged plotted rows and CSV export |

These are production React routes inside the Ultimate shell. The suite and old companion entry URLs lead to these routes without loading companion frames. FinSync/OxFin customer applications remain independent. The normal root `npm run dev` now starts Ultimate, the gateway, database console, Family API and Forex API; `dev:all` retains the standalone UIs.

Character scenes, spring entrances (including asynchronous data arrival), press/hover feedback and small pointer parallax share the global motion preference. Entrances are capped at eight sections per view. Pause, app/OS reduced motion, hidden documents and offscreen scene handling stop the relevant effects. Tables do not animate or mount their entire datasets.

## Data and permission boundaries

- Family authentication remains with the existing Family service. Its JWT stays in memory, is cleared on Ultimate session changes, and is never placed in URLs or stored as a fake Ultimate token. A Family 401 does not sign Ultimate out. Queries are scoped to both accounts and the tree; revoked reads hide cached private rows.
- Family server guards check current membership/roles for private files, events, relationships and member edits. Related members must belong to the selected tree. Profile edits cannot change record identity/ownership. Private uploads/downloads use authorized requests in the native and retained standalone interfaces. Existing files remain in their current locations.
- NiftyLens uses an authenticated Ultimate BFF and the configured public price cache, with no service-role credential or fake market data. No provider is configured in this checkout: the verified result is the explicit connection/setup state. Dedicated index/options providers remain unconfigured concepts.
- Forex reuses saved artifacts and the local historical dataset. Generic model column labels are resolved through the persisted training scaler order and fitted currency categories; incompatible contracts fail explicitly. Stacking receives ordered base predictions. The native dashboard calls no external AI, trains nothing, and presents no synthetic uncertainty or held-out accuracy claim.

## Verification

| Check | Result |
| --- | --- |
| Ultimate production build and typecheck | Pass |
| Native-domain ESLint | Pass, zero warnings |
| Focused production UI/navigation/public/customer suites | 60 tests pass; after model/helper separation, all 11 native flow/motion tests also pass |
| Finance migration and customer-admin suites | 21 tests pass (run-specific counts, not an aggregate of unique tests) |
| Market adapter, API boundary and legacy URL tests | 7 tests pass |
| Family API build and permission/ownership tests | Build passes; 3 tests pass |
| Retained Family frontend build | Pass; its existing large React Flow chunk warning does not apply to native family views |
| Forex projection, chronology, bounds, feature contract and stacking tests | 7 tests pass |
| Standalone NiftyLens build | Pass with its development writer stopped; dev UI restarted afterward. Running build/dev against the same `.next` directory initially caused a missing-page manifest race. |
| Isolated fictional demo build/tests | Build passes; all 1,005 tests pass. Review-storage assertion now follows the current scope instead of hard-coding 201 views. |
| Gateway | 6 tests pass |
| Design adapters, generated application docs, UI impact/handoff drift | Pass |
| Retrieval index | Regenerated locally; ignored and credential/data exclusions retained |
| Historical 3D plan preview | 15 pass, 1 existing GLB hash mismatch; unrelated model/preview assets were not regenerated |
| Rendered browser/device review | Pending: Computer Use reports that its native pipe is unavailable. Component/model counts are not rendered approval. |

Read-only running-service probes confirmed the three native page URLs return 200 and the three legacy entries redirect to their native destinations. Ultimate native-data endpoints and unauthenticated Family private-resource/file endpoints return 401. Ultimate, Family, Forex, the gateway, database console and all three configured database sources respond. No real Family registration, invitation, upload or record mutation was performed by QA.

The configured Forex dataset contains 30 currencies and ends on 23 July 2026. All three loaded models returned finite bounded outputs in the running API. The first shared historical feature calculation took about 16.6 seconds; selecting another model then took roughly 0.17–0.46 seconds and a warm history request about 8–17 ms locally. These are local API timings, not browser performance or model accuracy measurements.

Production lazy chunks, excluding shared framework/motion dependencies: NiftyLens 7.45 kB (2.91 kB gzip), Family 29.58 kB (9.26 kB gzip), Forex 10.51 kB (3.98 kB gzip). Shared native UI is 8.76 kB (3.59 kB gzip) plus 12.39 kB CSS (2.86 kB gzip). Native graphs/charts do not import Next.js, Streamlit, React Flow, Recharts or WebGL.

## Local entry points

- Ultimate: `http://127.0.0.1:5000/Ultimate/`
- Core API explorer: `http://127.0.0.1:3001/api/docs`
- Database console: `http://127.0.0.1:5556/`
- Gateway health: `http://127.0.0.1:5300/health`
- Forex API: `http://127.0.0.1:8000/docs`

Owner sign-in remains required. Family additionally connects an existing authorized Family account inside its native page. No commit, push or deployment is implied by these local checks; rendered approval remains with the user.
