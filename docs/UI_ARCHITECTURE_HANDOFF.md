# GrowthTrack: complete architecture and UI review handoff

Prepared 28 October 2026. This is a portable handoff for an independent UI reviewer or redesign agent. Read the status labels before treating any diagram as deployed architecture.

## 1. Purpose and current work

We are designing one desktop administration/workspace portal in **GrowthTrack Ultimate**. GrowthTrack, personal finance/work/insights, Equity, Family Connect and Forex belong in native portal modules. **FinSync and OxFin remain separate customer products; Ultimate is their customer-administration home.** Their customer-facing apps are not merged into Ultimate's personal finance module.

The current deliverable is an isolated, interactive design demo. It has 65 pages, 205 page/tab destinations, 13 lazy route families and both light/dark and comfortable/compact modes. The source inventory accounts for 79 stylesheets. The [supplied proposal](design/2026-10-28-ui-redesign-proposal.md) is implemented in this isolated demo with [documented adjustments and limits](plans/2026-10-28-proposal-implementation.md). The user has approved the demo direction and authorised real-app implementation. The approved theme, sidebar/header, shared primitives and customer-admin presentation are now in production source; see the [production UI integration](plans/2026-10-28-production-ui.md). Real customer adapters and complete native companion migrations remain outstanding. Rendered scope verification is still pending.

Status labels used in this document:

- **Working demo:** a local interaction with fictional data; does not imply a production API or permission boundary.
- **Layout proposal:** proposed content and visual structure; some tabs share a layout or lack their specialised workflow.
- **Existing runtime:** source already in the applications; not newly shipped by the demo.
- **Planned integration:** future work requiring adapters, tests and the relevant approval.
- **Needs browser review:** actual pixels, focus and browser behaviour have not been signed off.

The main jobs now are to verify the production UI in a browser, resolve remaining semantic/workflow gaps and migrate domain integrations in small reversible steps. Optional agents and code retrieval support development; they are not core product dependencies.

## 2. Product architecture and ownership

### Configured current development topology

This is the existing launcher/proxy arrangement, **not a live health report**. Ports below are source defaults and can be overridden by environment configuration. The design preview is a separate entry.

```mermaid
flowchart TB
  Launcher[Workspace launcher] --> UltimateUI[Ultimate Vite UI on 5000]
  Launcher --> Gateway[API gateway on 5300]
  Launcher --> Companions[Independent companion processes]
  Browser[Browser at /Ultimate/] --> UltimateUI
  UltimateUI --> Products[Existing product launch and UI proxy paths]
  Products --> FinSyncUI[FinSync Next web on 5101]
  Products --> OxFinUI[OxFin Next web on 5102]
  Products --> FamilyUI[Family frontend on 5104]
  Products --> EquityUI[Equity Next web on 5105]
  Products --> ForexUI[Forex Streamlit UI on 8501]
  UltimateUI -->|Workspace API proxy| Gateway
  UltimateUI -->|Direct auth and standalone API| UltimateAPI[Ultimate Express API on 3001]
  Gateway --> UltimateAPI
  Gateway --> FinSyncUI
  Gateway --> OxFinUI
  Gateway --> FamilyAPI[Family API on 3104]
  Gateway --> EquityUI
  Gateway --> ForexAPI[Forex API on 8000]
  Gateway -. optional .-> Agent[Local assistant service on 11434]
  UltimateAPI --> UltimateStore[Existing Ultimate data]
  Reviewer[UI reviewer] --> Demo[Isolated design preview on 5410]
  Demo --> Fixtures[Fictional fixtures and browser-local state only]
```

Source references: `scripts/workspace.mjs`, `scripts/gateway.mjs`, `scripts/workspace-proxy.mjs`, `growthtrack-ultimate/vite.config.js` and `src/config/products.js`. In standalone Ultimate mode, the normal API/auth proxy defaults to Ultimate's API; the workspace launcher opts into product routing. Gateway API defaults distinguish Family's API at 3104 and Forex's API at 8000 from their UI ports; older narrative port lists should not override source configuration. An optional developer database console is separate from the review demo.

### Target native portal composition

This is the **target composition**. Native integrations and customer-admin adapters shown below are planned; the current isolated demo does not call these APIs.

```mermaid
flowchart TB
  Person[Workspace owner or authorised administrator] --> Host[Desktop browser or optional Electron host]
  Host --> Portal[GrowthTrack Ultimate portal]
  Portal --> Shared[Shared shell, tokens, navigation and UI controls]
  Portal --> Native[Native domain modules]
  Native --> Growth[GrowthTrack and Physique]
  Native --> Finance[Personal finance, work and insights]
  Native --> Equity[Equity and NiftyLens views]
  Native --> Family[Family Connect views]
  Native --> Forex[Forex research views]
  Growth --> UltimateAPI[Existing Ultimate API and product-owned storage]
  Finance --> UltimateAPI
  Equity --> EquityAPI[Equity data and provider adapters]
  Family --> FamilyAPI[Family API, permissions and document storage]
  Forex --> ForexAPI[Python inference and evaluation services]
  Portal --> Admin[FinSync and OxFin customer administration]
  Admin --> BFF[Planned authenticated admin backend]
  BFF --> Roles[Product and tenant permissions]
  BFF --> Audit[Redacted admin audit events]
  BFF --> FSAdapter[FinSync restricted admin adapter]
  BFF --> OXAdapter[OxFin restricted admin adapter]
  FSAdapter --> FSData[FinSync identity and customer data]
  OXAdapter --> OXData[OxFin identity and customer data]
  FSCustomer[Separate FinSync customer web and mobile] --> FSData
  OXCustomer[Separate OxFin customer web] --> OXData
```

The existing local gateway/launcher composes current application runtimes; it is not proof that the native portal migrations above are complete. Preserve product data ownership. Portal navigation does not grant database access, and a customer-app login handoff is not an administrator credential.

| Product / application | Features and responsibility | Current UI status | Remaining work |
| --- | --- | --- | --- |
| Ultimate portal | Shell, search, settings, personal finance, work, growth, insights and life; review controls remain demo-only | Approved shared design integrated into the authenticated app; isolated review demo retained | Rendered regression review, remaining domain layout parity and native integrations |
| GrowthTrack / Physique | Routines, sleep, nutrition, hydration, training, wellbeing, measurements and avatar workspace | Sample growth screens; interactive Current/Goal schematic editor; existing separate 3D runtime | Specialised page workflows, real persistence and approved renderer integration |
| Equity / NiftyLens | Instruments, watchlists, indices, charts, options/chain and market research | Sample native portal layouts; existing separate Equity frontend | Adapt existing providers, preserve saved state and migrate UI after approval |
| Family Connect | Members/tree, memories, events, timeline, family documents and permissions | Interactive sample member/event views and family-scoped vault; existing separate family frontend/API | Native UI parity, authorised documents/uploads and family access controls |
| Forex | Currency pairs, model comparison, forecast context, analytics and volatility | Illustrative research demo; Python services remain separate | Native React views, provider timestamps, honest uncertainty/evaluation and unavailable states |
| FinSync customer product | Customer finance, budgets, spending, account connections and planning; web/mobile packages | Separate existing product; customer app is not redesigned by the portal demo | Its own UI review; production fixes; restricted admin adapter for Ultimate |
| FinSync administration | Directory, account status, profile, support and activity | Dedicated production UI and authenticated setup boundary; fictional mutations remain demo-only | Restricted product/tenant adapters, roles, bounded listing, audit and reviewed mutations |
| OxFin customer product | Customer identity, wallet/cards, payment/investment-related product areas and intelligence concepts | Separate existing web product and reference services; readiness varies by package | Its own UI review; verify real capabilities and identity; restricted admin adapter |
| OxFin administration | Directory, account status, profile, support and activity | Dedicated production UI and authenticated setup boundary; fictional mutations remain demo-only | Independent OxFin adapter, verified identity, permissions, audit and reviewed mutations |

Product features above describe ownership and intended surfaces, not a claim that every backend capability is production-ready. Appendix B lists every documented application/reference package and its recorded readiness.

### Admin request flow

```mermaid
sequenceDiagram
  participant UI as Ultimate admin UI
  participant BFF as Planned admin backend
  participant Policy as Permissions and scope
  participant Product as FinSync or OxFin adapter
  participant Audit as Audit sink
  UI->>BFF: List or open customer using Ultimate session
  BFF->>Policy: Verify role, product and tenant scope
  Policy-->>BFF: Allow or deny
  alt Allowed
    BFF->>Product: Bounded, product-scoped request
    Product-->>BFF: Minimal allowed customer fields
    BFF->>Audit: Actor, product, record and result metadata
    BFF-->>UI: Data, empty result or explicit unavailable state
  else Denied
    BFF-->>UI: Access denied without customer data
  end
```

Initial production capability should be read-only listing and summaries. Notes/entitlement changes follow with validation, stale-version checks, idempotency where needed, CSRF/origin protection and audit. Suggested API prefix: `/api/admin/products/:product/customers`. Real adapters must never substitute fictional demo records on failure.

The demo uses `/customers`, `/customers/finsync` and `/customers/oxfin`. Production now has `/customers`; existing `/finance/finsync` and `/finance/oxfin` paths show admin content, with `/customers/:product` redirects. Preserve these compatibility paths until a separately tested namespace change. Neither route convention changes the server-side permission requirement.

## 3. UI architecture: current source and intended organisation

### Current isolated preview

```text
growthtrack-ultimate/
  admin-demo.html
  vite.admin-demo.config.js        separate entry; no API proxy or real auth
  src/admin-demo/
    main.jsx                       fonts and entry styles
    AdminDemo.jsx                  shell, route, shared session state, review/save wiring
    catalog.js                     all pages, views and review scopes
    screenRegistry.js              thirteen lazy route families
    screens.jsx                    loading readiness and route error boundary
    components.jsx                 buttons, tables, charts, dialog and shared primitives
    dialogs/                       customer details, entry fields, review catalog
    models/                        domain records, scope, table/review and semantic state
    hooks/                         reference-counted scroll locking
    screens/                       24 presentation components, including shared views
    Scope.jsx / PreviewState.jsx   scope/provenance and six distinct design states
    WorkspaceNavigation.jsx        domain grouping within the shared rail
    portal.css                     shared layout and primitives
    styles/tokens.css              canonical accessible themes and density values
    styles/proposal.css            scope, adaptive frames and proposed domain layouts
    styles/workspaces.css          review and table additions
    styles/physique.css             lazy Physique domain styles
```

Source of truth: `src/config/featureRegistry.ts` for existing feature identity, `src/admin-demo/catalog.js` for demo routes and view contracts, and `screenRegistry.js` for route ownership. Other agents must inspect the current working tree as well as committed HEAD; the redesign may contain uncommitted/staged files.

### Target production structure

This is the incremental target. Customer-admin presentation already lives in its domain and the production shell consumes shared primitives; other domain moves remain staged:

```text
src/
  app/                            router, session providers, shell and navigation
  components/ui/                  accessible reusable controls and layout primitives
  styles/                         semantic tokens, themes and shared primitives
  domains/
    growth/                       growth views and their view models
    physique/                     editor UI, semantic model, viewer/worker adapters
    personal-finance/             ledger, budgets, subscriptions, planning
    workspace/                    tasks, notes, files, calendar, goals, focus
    insights/                     trends, comparison and research presentation
    equity/                       market views and Equity API client
    forex/                        research views and Python service client
    family/                       members, events, memories and file permissions
    customer-admin/
      shared/                     presentation and typed admin response contracts
      finsync/                    product-specific UI policy and client
      oxfin/                      product-specific UI policy and client
server/
  admin/                          authorised routes, product adapters and audit
```

Dependencies point from domain UI toward shared primitives/contracts and its own API/view models. Avoid sibling-domain implementation imports or a single mutable store containing every product's customer records. A shared UI component must not import private backend access. Introduce no new service solely to split files. Wrap existing runtime modules incrementally rather than renaming/replacing the 3D engine or product stores in one change.

### Shared screen contract

Every screen should have a clear title, purpose, primary action when appropriate, scope/context, content region and recovery path. Reuse the shell, buttons, tables, filters, dialogs, empty/loading/error/denied/unavailable states and semantic status styles. Keep domain-specific controls in the domain. Scope table scrolling locally; preserve meaningful page widths and browser zoom.

Current design direction is agreed: **light workspace, dark forest sidebar, matching dark mode, desktop first**. Inter is bundled locally. The demo consumes `styles/tokens.css`; production's source is `src/design/tokens.ts`, with generated `styles/design-tokens.css`. Do not invent independent palettes per module. Every demo page has DEMO/SETUP/PREVIEW scope and data panels carry provenance; no demo route is LIVE. Production uses its real domain data and explicit setup/read-only boundaries. The sidebar is 224 px, the top bar is 64 px, the drawer breakpoint is below 960 px, and main content has a readable maximum width. These are current implementation values to review, not immutable pixel requirements.

Styles must follow ownership: common tokens/primitives centrally; domain styles beside their domain. Audit all files in `css-migration-inventory.json`; regenerate generated adapters with `design:sync` instead of editing them manually. Replace redundant production CSS after approved pages move over, rather than adding another permanent override stack.

## 4. State, user interactions and persistence

```mermaid
flowchart LR
  Action[User navigation, filter or form action] --> Shell[Route and shared interaction state]
  Shell --> Domain[Domain view model]
  Domain --> View[Lazy screen and shared UI]
  View --> Feedback[Visible result or recoverable error]
  Domain --> Session[Session-only fictional records and drafts]
  Shell --> Reviews[Versioned browser-local reviews]
  Domain --> Save[Explicit Physique sample save]
  Save --> Local[Validated browser-local snapshot]
  Reviews --> Export[Full review JSON export]
  Local --> Download[Labelled sample profile JSON]
```

| State | Current behaviour | Required review cases |
| --- | --- | --- |
| Route, page/view and overlay | Hash navigation; shared shell; catalog may preserve the selected preview state | Back/Forward, direct URL, unknown view, deep link, close overlay on navigation, focus destination |
| Theme and density | Browser-local preference; review keys distinguish both | Reload, switch while viewing data, compact long labels, no cross-mode approval reuse |
| Customers, notes and plan edits | Fictional session-only customer records | Product isolation, search/filter, duplicate validation, close/reopen, visible result, no invitation/API claim |
| Transactions, budgets, subscriptions and shopping | Typed sample entries feed native tables and summaries | Amount precision, dates, direction/status, totals, archive/upcoming filters, sorting and empty recovery |
| Family events and documents | Shared sample events feed family/calendar; vault is family-scoped | Date agreement, member count, unlinked members, file scope, long names, unavailable private files |
| Focus timer and history | Shell-owned deadline, unique session identity and shared sample/session history; separate timer, table and analytics artifacts | Leave/return, delayed ticks, pause/resume/reset, exactly-once completion off-page and matching daily/project totals |
| Notes and tasks | Selected drafts/completion retained in shared session state; global search includes current drafts and stable task records | Tab change, navigate away/back, completed filters, duplicate titles, local edits and search |
| Action triage | Session snooze for 24 hours, dismiss/restore and completion shared with tasks | Segment meaning, snooze expiry, restore, completion from another view |
| Notifications and logs | Read state/preferences retained in session; activity/auth/sync have distinct sample schemas | Unread/all, mark-read/unread/all, header count and no invented login/sync events |
| Physique drafts | Independent Current/Goal values, bounded sliders, 150 ms outline debounce | Rapid edits, context switch, tab/route persistence, saved history versus dirty draft |
| Physique saved profile | Explicit validated local snapshot; JSON download has a demo format | Reload, failed storage, corrupt data, download and clear distinction from GLB |
| Design reviews | Revision v5, compact local storage, full readable export | Exact scope, old/corrupt records, quota failure, frozen feedback viewport, whitespace-only feedback |

Preview empty/loading/error/denied/unavailable modes are selectable design states. They are not evidence of real network failures or successful API retries. Production UI needs independent permission-denied, offline, unavailable provider, stale-data, validation, conflict and partial-failure handling.

## 5. Physique / 3D flow from the supplied reference

The intended production flow is below. The **identity worker is a target integration**; the inspected `parametricIdentity.js` currently evaluates identity synchronously on the CPU. The garment worker queue and semantic/save contracts already exist.

```mermaid
flowchart TB
  Editor[React editor sliders and context selection] --> Semantic[Current and Goal semantic state]
  Semantic --> Debounce[Coalesce edits and assign a parameter revision]
  Debounce -. planned worker boundary .-> Identity[Identity bake worker adapter]
  Identity --> Body[Owned baked geometry and version metadata]
  Body --> Queue[Existing single-flight garment queue]
  Queue --> Solver[Existing garment worker and collision solve]
  Body --> Viewer[Three.js scene and lighting]
  Solver --> Fit[Latest valid fitted garment]
  Fit --> Viewer
  Viewer --> Mesh[Live mesh and materials]
  Semantic --> Save[Existing scoped semantic save queue]
  Save --> API[Authenticated local API]
  API --> Store[Existing product-owned profile storage]
  API --> Assets[Authorised GLBs and texture assets]
  Semantic --> ExportGate[Export exact matching document and mesh revisions]
  Fit --> ExportGate
  ExportGate --> Package[Portable GLB package with metadata and notices]
```

Keep camera/lighting changes separate from identity recomputation. Jobs/results should carry person/editor/context identity, parameter revision and asset/topology version. Only the newest valid result can apply. Transfer owned buffers, keep live editing bases intact, cancel/dispose obsolete work, and reject export on stale geometry, failed fit or a closed editor. Saving semantic state may be independent of baking; geometry export must wait for the exact matching fit.

The **current demo** has an SVG schematic, not this rendering pipeline. Its controls, zoom, orientation, comparison, save and history flows can be reviewed now. GLB export is unavailable and sample JSON is labelled. Do not turn the diagram into an assertion that workers, cloth fitting, WebGL context recovery or runtime memory have been validated by this demo.

Inspect these existing source boundaries before implementing the target:

- `src/lib/avatarDocument.js`: semantic schema, asset compatibility and separate contexts.
- `src/hooks/useParametricAvatar.js`: per-person serialised save/flush and owner-scope checks.
- `src/components/morphEngine/parametricIdentity.js`: current CPU identity evaluation.
- `src/components/morphEngine/garmentFitQueue.js` and `garmentFit.worker.js`: newest-revision queue and worker.
- `src/components/morphEngine/posedGarmentContact.js`: owned posed geometry for worker payloads.
- `src/components/morphEngine/avatarPackage.js`: portable package boundary.

Paths in this list are relative to `growthtrack-ultimate/`.

## 6. What has been delivered, and what is still outstanding

Delivered in the local work:

- Isolated portal proposal covering the existing feature catalog plus all-customers and public pages; shared styling and lazy domain families.
- Fictional product-scoped customer master/detail; filtered finance totals and precise holdings; family/calendar/vault consistency; notes/tasks/focus persistence; separate timer/session/analytics artifacts; action triage, read-state notifications and distinct sample logs; skill-specific views; honest analytical contracts; accessible overlays; Physique controls and explicit local snapshots.
- Canonical accessible theme/density tokens, domain navigation, per-screen scope and per-panel provenance; six preview states; density-aware v5 review catalog, exact-scope progress, feedback/export and compact storage.
- Universal generated application READMEs and blank-secret environment examples. Secrets belong in ignored local environments or a deployment secret manager; public frontend variables are browser-visible.
- Historical v2/continuation/v3/v4 3D plans relocated under `growthtrack-ultimate/docs/3d-plans/`, with runtime assets kept separate.
- Optional local lexical code retrieval and an embedding plan. Generated `.code-index/` and the local `.codeindexignore` file itself are ignored and excluded from distribution. Historical `Claude/` material is not a mandatory product dependency.
- Route/CSS inventories, ownership/build boundaries, static change-impact analysis and synthetic model scale checks.

Outstanding:

- Browser inspection of every required page/view/scope and any follow-up design decisions. The user approved the demo direction and real-app implementation, but no pixel-perfect or full accessibility certification is claimed.
- Specialised workflows for layout-only tabs, real provider/device/file integrations, backend-derived analytics and policy/legal review.
- Remaining domain CSS consolidation and native Equity/Family/Forex migration; the shared production shell/style integration is implemented.
- Real FinSync/OxFin admin adapters, server-enforced permissions/audit and reviewed mutations.
- Production 3D adapter integration, identity-worker boundary, real-device/context-loss/memory verification and exact-fit export.
- Separate visual reviews of the FinSync/OxFin customer apps and mobile distribution.
- Optional embeddings only after retrieval/privacy evaluation. No source was uploaded to an embedding provider.

### Known coverage gaps the reviewer must check explicitly

These are implementation boundaries found in source, not claimed browser observations:

- Many secondary tabs reuse a layout family. A rendered route and a changed title do not establish that the tab's specialised function exists.
- Timesheet now separates timer, session table and daily/project analytics. Verify their shared local history, exactly-once completion and rendered layouts; real persistence is not connected.
- Action Center now has working local snooze/dismiss/restore segments; notifications have read-state transitions; logs have distinct activity/auth/sync sample schemas. Browser review and real service integration remain open.
- Strength `1rm`, nutrition `calculator`, assessment `questionnaire` and several analytical views now show explicit input/output contracts rather than simulated results. Their specialised production workflows remain incomplete. Dashboard arrangement supports local ordering, not server-saved dashboards.
- Skills uses its own library/groups/practice coverage/history; Progress has named artifact contracts. Some other growth fallback views still need domain-specific workflows; repeated routine content is not domain parity.
- File providers, financial CSV/history/accounts, connected apps and device integrations are setup/layout proposals, not connected services.
- Saved places are a schematic; no real map provider or precise location is attached. Public policy/billing screens are concepts, not published policies or checkout.
- Some local growth interactions use component state; verify navigation persistence rather than assuming every interaction is shell-owned.
- FinSync/OxFin customer-app pages are outside the 201 portal destinations. Review them separately; the admin portal is not their customer UI redesign.

## 7. Work packages and subtasks

IDs below are handoff work packages, not agents already spawned or assignments to named people. Review and implementation are separate tasks. Existing application owners retain their data/runtime responsibility.

| ID | Subtask | Owner area | Depends on | Acceptance / current state |
| --- | --- | --- | --- | --- |
| D01 | Maintain product/route/CSS inventory and independent build map | Portal platform | Source catalog | Delivered; regenerate/check on changes |
| D02 | Maintain fictional review demo, scoped feedback and safe sample state | Portal platform | D01 | Delivered; preserve isolation and scope |
| D03 | Maintain universal READMEs, env examples, plan relocation and ignore policy | Developer tooling | D01 | Delivered; docs/config/index checks remain passing |
| D04 | Implement supplied redesign proposal in the isolated review demo | Portal platform / domain owners | D02, supplied brief | Delivered supporting implementation; see reconciliation report; browser/user gates remain open |
| R01 | Capture rendered baseline and classify every required scope | Portal platform / reviewer | D02, connected browser | Screenshots, console observations, tested/untested ledger |
| R02 | Review shell, tokens, typography, density, navigation and overlays | Portal platform / reviewer | R01 | Desktop widths, zoom, focus, contrast and responsive fallback evidence |
| R03 | Review FinSync/OxFin admin directories, profiles, notes and statuses | Customer administration | R02 | Product scope, clear actions, tables, validation and failure states |
| R04 | Review ledger, budgets, subscriptions, portfolio, SIP and shopping | Personal finance | R02 | Amount/date/totals consistency, correct filters and distinct view intent |
| R05 | Review Equity and Forex research layouts | Markets / Insights | R02 | Legible numeric tables/charts, selected context, timestamps and honest sample uncertainty |
| R06 | Review family tree, events, memories, vault and life views | Family and life | R02 | Member/event consistency, document scope, long content and privacy-aware presentation |
| R07 | Review growth, health, routines, training and wellbeing views | Growth | R02 | Correct domain language, distinct specialised tabs and safe fictional data |
| R08 | Review work, calendar, files, notes, tasks, projects, goals and time | Workspace | R02 | Keyboard actions, state persistence, dates, timer, sorting and empty recovery |
| R09 | Review Current/Goal editor and 3D workspace controls | Physique | R02 | Draft/save/history boundaries, rapid edits, storage failure and honest export state |
| R10 | Review insights, settings, notifications, help, public and plan pages | Portal platform / Insights | R02 | No unrelated actions or invented backend/legal/billing capability |
| R11 | Review separate FinSync/OxFin customer apps and mobile fallback | Product owners | Their builds and configured preview access | Separate evidence; no portal approval reused for customer apps |
| R12 | Resolve cross-page patterns and present redesign proposals | Reviewer / designer | R03–R11 | Prioritised findings, reusable patterns, proposed page frames and tradeoffs |
| R13 | Record the user's design decisions and rendered coverage | User / reviewer | R12 | Demo direction and real implementation approved; unvisited rendered variants remain pending |
| I01 | Apply approved shell, tokens and shared primitives to the real app | Portal platform | User approval received | Implemented in source with existing auth/stores retained; 200 targeted production checks; rendered verification pending |
| I02 | Implement FinSync/OxFin read-only admin contracts and roles | Customer administration / backend | Approved contract, I01 | Auth, product/tenant isolation, bounded pagination, minimal fields and audit |
| I03 | Add support-note/entitlement mutations | Customer administration / backend | I02 | Validation, conflicts, retry/idempotency, audit and no false success |
| I04 | Migrate Equity views and remove iframe launcher after parity | Equity | I01, approved Equity pages | Providers/saved state preserved, tested redirects and isolated build |
| I05 | Migrate Family views and document permissions | Family | I01, approved Family pages | Family access, files/events parity, no data movement without a separate migration |
| I06 | Migrate Forex presentation while retaining Python services | Forex / Insights | I01, approved Forex pages | Timestamp/horizon/evaluation/uncertainty and unavailable model states |
| I07 | Replace layout-only Growth/Workspace/Insights workflows with domain UI | Respective owners | I01, relevant R13 | Correct inputs/results, real query states and integration regressions |
| I08 | Connect approved Physique UI to semantic save/viewer/worker adapters | Physique | R09, I01 | Revision/cancellation contract, owner scope, context loss and matching-fit export |
| I09 | Consolidate obsolete production CSS incrementally | Portal platform / domain owners | Each approved/migrated page | Every stylesheet disposition tracked; generated adapters stay consistent |
| I10 | Resolve documented production blockers before real customer writes | FinSync/OxFin owners / backend | Before I03 rollout | FinSync browser-held encryption replacement and verified OxFin identity; separate data/key migration approval |
| V01 | Run affected builds, contract checks and browser regression review | Each owner / QA | Relevant implementation | Evidence for changed consumers; no claim that one demo build certifies all apps |
| V02 | Release gradually with health checks and rollback | Release owner | V01, explicit deployment authorisation | Approved release, data preservation, failures observable and rollback verified |
| T01 | Evaluate parser-backed retrieval and optional local embeddings | Developer tooling | D03, evaluation set | Better bounded retrieval measured; no secret paths or silent source upload |

Do not treat the full plan as permission to deploy, change real customer accounts, rotate keys or delete/migrate data. The user has assigned real-app UI implementation; the [production report](plans/2026-10-28-production-ui.md) records its exact scope. Further work remains within explicitly assigned scope.

## 8. Review workflow for another agent

1. Read this document and `UI_REVIEW_AGENT_PROMPT.md`; use `ui-review-manifest.json` for exact destinations, owner batches, entry files and status descriptions.
2. Inspect `AGENTS.md`, current working-tree changes, the catalog and the relevant source. Do not reset or discard unrelated work.
3. For the authenticated production UI, use `npm run dev:ultimate` and `http://127.0.0.1:5000/Ultimate/` with the existing configured backend/session; never bypass sign-in. For the isolated fixture review, use `npm run dev:design`; open `http://127.0.0.1:5410/admin-demo.html`. The preview needs no product credentials. If reviewing from another host, forward the preview port or use an explicitly supplied reachable preview/screenshots; that host's localhost is not this machine. If dependencies are missing, follow the selected application's README rather than inventing setup.
4. Review shell/shared primitives first, then the owner batches below. Use fictional records only. Browse every destination; test dynamic cases according to its feature brief and source.
5. Inspect 1024×768, 1280×800, 1440×900 and 1920×1080 desktop targets, then 390×844. Cover light/dark, comfortable/compact and populated/empty/loading/error/denied/unavailable modes. Add zoom, long text, keyboard, denied storage and unavailable-service scenarios.
6. Record exact scope for every observation. A representative shared-state check can support a shared component finding, but cannot become blanket approval of unvisited pages. Use `not-tested` wherever evidence is missing.
7. Capture before/after screenshots only from an actual rendered browser, record console failures, and describe reproducible steps. Source-only review must be labelled source-only.
8. Return findings and redesign proposals for approval before editing live product pages. If explicitly assigned implementation, fix the shared cause first, keep domain ownership, update the design revision when layouts change and reverify affected consumers.
9. Use the demo's All pages & review catalog to request changes. Only mark a view approved with the user's authority for that scope; a reviewer recommendation is not the user's approval. Export the full review JSON.
10. Update the coverage ledger and remaining gaps. Passing tests, generated matrices and existing approved variants do not establish that untested pixels or workflows are correct.

### Review scope and scale

205 destinations × 2 themes × 2 densities × 6 design states = **4,920 base variants**. Across five specified viewports this is **24,600 planned scope combinations**. This is a review-planning count, not a claim that 24,600 screens have been inspected.

The latest recorded local verification has 989 passing demo checks, including 820 route/view/theme/density renders. The production UI integration has 200 targeted passing checks plus its own successful build and clean changed-file lint. The preserved separate avatar baseline has 22 passing save/document/garment-queue tests; its implementation is unchanged. Synthetic model checks use 10,000 supplied records and 24,600 review records. Build/token/docs/config/index/impact checks are recorded in the verification document. These are prior results; rerun checks relevant to new code changes. JSDOM and Node timing measurements do not verify browser layout, GPU behaviour, network reliability or production concurrency.

Current table bounds are 25 rows by default and 100 maximum selectable. The full synthetic review history was 7,835,521 bytes of UTF-8 JSON versus 2,176,543 bytes in the compact envelope. Browser quotas and long notes can still fail; inspect the persistent export warning. Real APIs need their own server pagination.

### Required review output

Provide a short assessment, then findings and a coverage ledger. Every finding must contain:

```json
{
  "id": "UI-001",
  "severity": "P1",
  "pageId": "physique",
  "view": "3d",
  "theme": "light",
  "density": "comfortable",
  "state": "populated",
  "viewport": { "width": 1440, "height": 900 },
  "reviewType": "browser",
  "summary": "Describe an observed issue; this object is a schema example",
  "steps": ["List exact reproducible steps"],
  "observed": "Actual result",
  "expected": "Required behaviour and reason",
  "evidence": ["Relative screenshot or trace path"],
  "sourceCandidates": ["growthtrack-ultimate/src/admin-demo/screens/PhysiqueScreen.jsx"],
  "affectedPages": ["physique"],
  "recommendation": "Concrete shared or domain correction",
  "verification": "How the correction will be checked"
}
```

Use P0 for a critical break/data exposure, P1 for a blocked core workflow or inaccessible essential content, P2 for material inconsistency/usability errors, and P3 for visual polish. Do not fill findings with fictional failures. For coverage, record `not-tested`, `reviewed-no-finding`, `changes-requested` or `blocked`, with the exact scope and evidence. Keep reviewer coverage separate from the demo's user approval format.

Return proposed changes grouped into shared shell/primitives and domain-specific work, plus affected routes, acceptance criteria, regression checks and dependencies. Include a short list of design choices needing the user's taste decision. Do not use a score alone as the acceptance gate.

### Owner batches

| Batch | Ownership area | Pages / destinations | Page IDs |
| --- | --- | --- | --- |
| B01 | Customer administration | 3 / 9 | `finsync`, `oxfin`, `customers` |
| B02 | Personal finance and markets | 11 / 32 | `finance`, `transactions`, `financeAnalytics`, `financeTrends`, `budgeting`, `subscriptions`, `portfolio`, `sip`, `shopping`, `financeSync`, `equity` |
| B03 | Growth and Physique | 14 / 51 | `wellness`, `sleep`, `lifestyle`, `mind`, `medical`, `health`, `habits`, `physique`, `assessment`, `training`, `strength`, `nutrition`, `hydration`, `healthSync` |
| B04 | Workspace | 9 / 32 | `workspace`, `calendar`, `documents`, `notes`, `tasks`, `projects`, `timesheet`, `skills`, `goals` |
| B05 | Insights | 8 / 24 | `overview`, `actions`, `current`, `analytics`, `dashboards`, `progress`, `forecast`, `forex` |
| B06 | Family and life | 5 / 17 | `life`, `social`, `entertainment`, `maps`, `family` |
| B07 | Portal platform | 15 / 40 | `hub`, `apps`, `companion`, `ai`, `databases`, `profile`, `notifications`, `help`, `logs`, `about`, `pricing`, `welcome`, `login`, `privacy`, `terms` |

## 9. Independent builds, developer tooling and environment

From the workspace root:

```powershell
npm run dev:design
npm run build:design
npm run test:design
npm run impact:ui:check
npm run scale:ui
npm run docs:check
npm run config:check
npm run design:check
node scripts/design-inventory.mjs --check
node --test tests/code-context.test.mjs
```

Individual builds are `build:ultimate`, `build:finsync`, `build:oxfin`, `build:equity`, `build:family:web` and `build:family:api`. Forex keeps its Python/service packaging; mobile keeps its own Expo/native commands. A build can require that application's configured environment. These are entry points, not an assertion that all existing builds pass.

The latest known baseline also records two existing FinSync `User.multiFactor` type errors and one 3D preview fingerprint mismatch; see the verification document. Do not hide baseline failures, alter models to silence them or broaden a UI review into an unrelated data migration.

For bounded source reading, use exact `rg` paths/symbols or `npm run context:index` followed by `npm run context:search -- "question or symbol"`. Read the cited source before changing it. The local index is optional; embeddings are planned and need evaluation. Ignore generated code indexes, the local ignore override itself, environments, databases, copied agent tools and private assets. Do not send source or credentials to an external provider just because this handoff is shared.

```mermaid
flowchart LR
  Source[Allowed code and developer documentation] --> Filter[Exclude secrets, data, caches and copied agents]
  Filter --> Lexical[Existing ignored local lexical index]
  Filter -. planned .-> Parse[Syntax-aware chunks and source hashes]
  Parse -. optional local model .-> Vectors[Ignored local vector index]
  Query[Agent code question] --> Rank[Rank and deduplicate candidates]
  Lexical --> Rank
  Vectors -. planned .-> Rank
  Rank --> Budget[Check freshness and enforce excerpt budget]
  Budget --> Agent[Agent reads cited source before reviewing or editing]
```

Universal READMEs come from `docs/applications.json` through `scripts/application-docs.mjs`. This handoff/manifest is regenerated by `scripts/ui-handoff.mjs`; edit the handoff template and feature briefs there, not a generated appendix alone.

## Appendix A. Complete portal page and tab inventory

All destinations below exist in the design catalog. Their presence is not proof of a complete specialised workflow. The preview-level note makes the current limits explicit. Each route link is a demo hash route; source entry/style ownership is in the machine-readable manifest.

| Page / ID | Demo route | Tabs | Feature intent | Preview level and current coverage |
| --- | --- | --- | --- | --- |
| Personal finance / `finance` | [`/finance/overview`](http://127.0.0.1:5410/admin-demo.html#/finance/overview) | `default` | Personal ledger overview, totals and recent transactions. | **working-demo**: Shared sample ledger and calculated totals; no financial account API. |
| Transactions / `transactions` | [`/finance/transactions`](http://127.0.0.1:5410/admin-demo.html#/finance/transactions?view=all) | `all`, `income`, `expenses` | Record, search and distinguish income and expenses. | **working-demo**: Typed local amounts/dates/categories feed filtered tables and summaries. |
| Analytics / `financeAnalytics` | [`/finance/analytics`](http://127.0.0.1:5410/admin-demo.html#/finance/analytics?view=categories) | `categories`, `income`, `comparisons` | Category spending, income analysis and comparisons. | **partial-layout**: Sample ledger summaries work; specialised comparison layouts need review. |
| Trends / `financeTrends` | [`/finance/trends`](http://127.0.0.1:5410/admin-demo.html#/finance/trends?view=monthly) | `monthly`, `recurring` | Monthly spending context and recurring costs. | **partial-layout**: Shared ledger and active subscription views; no live trend provider. |
| Budgeting / `budgeting` | [`/finance/budgeting`](http://127.0.0.1:5410/admin-demo.html#/finance/budgeting?view=current) | `current`, `history` | Category limits, current spending and historical budgets. | **working-demo**: Current category totals and a distinct historical sample; local category creation. |
| Subscriptions / `subscriptions` | [`/finance/subscriptions`](http://127.0.0.1:5410/admin-demo.html#/finance/subscriptions?view=active) | `active`, `upcoming`, `archived` | Active, upcoming and archived plans with recurring totals. | **working-demo**: Status/date filters and local creation; no billing integration. |
| Portfolio / `portfolio` | [`/finance/portfolio`](http://127.0.0.1:5410/admin-demo.html#/finance/portfolio?view=holdings) | `holdings`, `allocation`, `history` | Holdings, sector allocation and portfolio value history. | **working-demo**: Distinct sample holdings/allocation/history views; prices and returns are fictional. |
| SIP Calculator / `sip` | [`/finance/sip`](http://127.0.0.1:5410/admin-demo.html#/finance/sip?view=inputs) | `inputs`, `projection`, `comparison` | Illustrative recurring-contribution projection and rate comparison. | **working-demo**: Interactive assumptions and distinct tables; not investment advice or guaranteed returns. |
| Shopping / `shopping` | [`/finance/shopping`](http://127.0.0.1:5410/admin-demo.html#/finance/shopping?view=lists) | `lists`, `planned`, `purchased` | Planned/purchased items, amounts, categories and totals. | **working-demo**: Typed local item creation and status-specific totals; no checkout. |
| Sync / `financeSync` | [`/finance/sync`](http://127.0.0.1:5410/admin-demo.html#/finance/sync?view=accounts) | `accounts`, `csv`, `history` | Account connections, CSV import and import history. | **setup-layout**: Setup proposal; no account connection or CSV persistence is implemented by the demo. |
| FinSync customers / `finsync` | [`/customers/finsync`](http://127.0.0.1:5410/admin-demo.html#/customers/finsync?view=customers) | `customers`, `activity`, `support` | Administer FinSync customers, profiles, activity and support. | **working-demo**: Product-scoped fictional directory, sample plans and local notes; real admin adapter planned. |
| OxFin customers / `oxfin` | [`/customers/oxfin`](http://127.0.0.1:5410/admin-demo.html#/customers/oxfin?view=customers) | `customers`, `activity`, `support` | Administer OxFin customers, profiles, activity and support. | **working-demo**: Product-scoped fictional directory, sample plans and local notes; real admin adapter planned. |
| Equity / `equity` | [`/finance/equity`](http://127.0.0.1:5410/admin-demo.html#/finance/equity?view=charts) | `charts`, `movers`, `connection`, `indices`, `options`, `chain` | Instruments, market charts, indices and option-chain research. | **partial-layout**: Selectable sample market context and distinct tables; no live feed or orders. |
| Workspace overview / `overview` | [`/insights/overview`](http://127.0.0.1:5410/admin-demo.html#/insights/overview?view=today) | `today`, `priorities`, `summary` | Workspace summary, priorities, quick entry and navigation. | **partial-layout**: Navigation and quick-add work; summary/priority tabs need distinct intent review. |
| Action Center / `actions` | [`/insights/actions`](http://127.0.0.1:5410/admin-demo.html#/insights/actions?view=today) | `today`, `upcoming`, `snoozed`, `dismissed` | Triage today, upcoming, snoozed and dismissed work. | **working-demo**: Distinct segments with local 24-hour snooze, dismiss, restore and shared task completion; session-only. |
| Current / `current` | [`/insights/current`](http://127.0.0.1:5410/admin-demo.html#/insights/current?view=weather) | `weather`, `news`, `local` | Weather, news and local context. | **setup-layout**: Provider-specific not-connected states; no fabricated live weather, news or location. |
| Analytics / `analytics` | [`/insights/analytics`](http://127.0.0.1:5410/admin-demo.html#/insights/analytics?view=trends) | `trends`, `correlations`, `comparisons` | Cross-workspace trends, correlations and comparisons. | **layout-proposal**: Named input/output contracts replace generic computed-looking charts; no measured analysis. |
| Dashboards / `dashboards` | [`/insights/dashboards`](http://127.0.0.1:5410/admin-demo.html#/insights/dashboards?view=saved) | `saved`, `arrange` | Saved dashboards and arrangement workflow. | **partial-layout**: Local widget ordering is shared between Saved/Arrange views; widget sources remain sample or not connected. |
| Progress / `progress` | [`/insights/progress`](http://127.0.0.1:5410/admin-demo.html#/insights/progress?view=timeline) | `timeline`, `comparisons`, `milestones` | Timeline, comparisons and milestones. | **layout-proposal**: Named artifact contracts identify required inputs and intended outputs; no measured personal progress. |
| Forecast / `forecast` | [`/insights/forecast`](http://127.0.0.1:5410/admin-demo.html#/insights/forecast?view=trends) | `trends`, `scenarios` | Trend/scenario research presentation. | **layout-proposal**: Explicit scenario/model contracts; no connected model or personal outcome prediction. |
| Forex / `forex` | [`/insights/forex`](http://127.0.0.1:5410/admin-demo.html#/insights/forex?view=models) | `models`, `forecast`, `analytics`, `volatility` | Model comparison, pair forecasts, analytics and volatility. | **partial-layout**: Selectable sample pairs/periods and model notes; Python inference/training remains separate. |
| GrowthTrack overview / `wellness` | [`/wellness/overview`](http://127.0.0.1:5410/admin-demo.html#/wellness/overview) | `default` | Growth overview, activity, routines and weekly rhythm. | **partial-layout**: Sample summary and routine details; not a connected health platform. |
| Sleep / `sleep` | [`/wellness/sleep`](http://127.0.0.1:5410/admin-demo.html#/wellness/sleep?view=log) | `log`, `trends`, `history` | Sleep log, trends and history. | **partial-layout**: Sample records and charts; real logging/provider persistence is outside the demo. |
| Lifestyle / `lifestyle` | [`/wellness/lifestyle`](http://127.0.0.1:5410/admin-demo.html#/wellness/lifestyle?view=routines) | `routines`, `preferences`, `history` | Routines, preferences and history. | **layout-proposal**: Shared growth layout; distinct preferences/history workflows need review. |
| Mind & Wellness / `mind` | [`/wellness/mind`](http://127.0.0.1:5410/admin-demo.html#/wellness/mind?view=checkin) | `checkin`, `trends`, `journal`, `breathe` | Check-ins, journal, trends and breathing exercise. | **partial-layout**: Breathing interaction and sample check-ins; journal/trends are not a complete backend workflow. |
| Medical / `medical` | [`/wellness/medical`](http://127.0.0.1:5410/admin-demo.html#/wellness/medical?view=vitals) | `vitals`, `medications`, `records`, `timeline` | Vitals, medication context, records and timeline. | **layout-proposal**: Fictional record layout; no clinical integration, diagnosis or private documents. |
| Health+ / `health` | [`/wellness/health`](http://127.0.0.1:5410/admin-demo.html#/wellness/health?view=senses) | `senses`, `lifestyle`, `specialized`, `recovery` | Senses, lifestyle, specialised and recovery context. | **layout-proposal**: Shared growth family; domain-specific screens/data need definition. |
| Habits / `habits` | [`/wellness/habits`](http://127.0.0.1:5410/admin-demo.html#/wellness/habits?view=today) | `today`, `matrix`, `history` | Today matrix and habit history. | **partial-layout**: Clickable sample matrix; history and navigation persistence require review. |
| Physique / `physique` | [`/wellness/physique`](http://127.0.0.1:5410/admin-demo.html#/wellness/physique?view=blueprint) | `blueprint`, `measurements`, `targets`, `history`, `3d` | Blueprint, measurements, Goal targets, saved history and model workspace. | **working-demo**: Independent Current/Goal drafts, bounded sliders, debounced SVG schematic and explicit local saves; renderer/GLB unavailable. |
| Assessment / `assessment` | [`/wellness/assessment`](http://127.0.0.1:5410/admin-demo.html#/wellness/assessment?view=questionnaire) | `questionnaire`, `results`, `history` | Questionnaire, assessment results and history. | **layout-proposal**: Sample history; no complete questionnaire/scoring workflow in this preview. |
| Training / `training` | [`/wellness/training`](http://127.0.0.1:5410/admin-demo.html#/wellness/training?view=schedule) | `schedule`, `logger`, `prs`, `overload`, `volume`, `sessions` | Schedule, session logger, personal records, overload and volume. | **partial-layout**: Sample sessions and trend layouts; specialised logger/record workflows need review. |
| Strength / `strength` | [`/wellness/strength`](http://127.0.0.1:5410/admin-demo.html#/wellness/strength?view=log) | `log`, `progression`, `1rm`, `fatigue`, `volume` | Strength log, progression, 1RM, fatigue and volume. | **partial-layout**: Sample records/charts; the 1RM tab is not a complete input/result calculator. |
| Nutrition / `nutrition` | [`/wellness/nutrition`](http://127.0.0.1:5410/admin-demo.html#/wellness/nutrition?view=daily) | `daily`, `history`, `targets`, `calculator` | Daily food, history, targets and calculator. | **partial-layout**: Sample food/target context; specialised calculator and persistent logging remain incomplete. |
| Hydration / `hydration` | [`/wellness/hydration`](http://127.0.0.1:5410/admin-demo.html#/wellness/hydration?view=today) | `today`, `history`, `targets` | Water today, history and targets. | **partial-layout**: Local 250 ml increment interaction; history/target consistency and persistence need review. |
| Health Sync / `healthSync` | [`/wellness/sync`](http://127.0.0.1:5410/admin-demo.html#/wellness/sync?view=devices) | `devices`, `imports`, `history` | Device connections, consented imports and import history. | **setup-layout**: Explicit setup state; no live device/import connection. |
| Work overview / `workspace` | [`/workspace/overview`](http://127.0.0.1:5410/admin-demo.html#/workspace/overview) | `default` | Work overview and access to tasks, projects, calendar and files. | **working-demo**: Navigation and shared local task interactions. |
| Calendar / `calendar` | [`/workspace/calendar`](http://127.0.0.1:5410/admin-demo.html#/workspace/calendar?view=month) | `month`, `week`, `agenda`, `connections` | Month, week, agenda and calendar connections. | **working-demo**: Valid UTC date keys and shared local/family events; provider connection is setup-only. |
| My Files / `documents` | [`/workspace/files`](http://127.0.0.1:5410/admin-demo.html#/workspace/files?view=vault) | `vault`, `providers`, `recent` | Vault, providers and recent files. | **partial-layout**: Sample metadata/detail views; Providers is explicit setup, with no upload or private file access. |
| Notes / `notes` | [`/workspace/notes`](http://127.0.0.1:5410/admin-demo.html#/workspace/notes?view=all) | `all`, `pinned`, `tags`, `editor` | All, pinned/tagged notes and editor. | **working-demo**: Selection and shared-session note drafts; no server-side note storage. |
| Tasks / `tasks` | [`/workspace/tasks`](http://127.0.0.1:5410/admin-demo.html#/workspace/tasks?view=today) | `today`, `upcoming`, `all`, `completed`, `list`, `board` | Today/upcoming/all/completed, list and board workflows. | **working-demo**: Local creation/completion and status views; verify every presentation and date filter. |
| Projects / `projects` | [`/workspace/projects`](http://127.0.0.1:5410/admin-demo.html#/workspace/projects?view=github) | `github`, `mine`, `grid`, `list` | Connected GitHub work, personal projects, grid and list. | **partial-layout**: Local progress cards and creation; GitHub setup is not a connected repository. |
| Timesheet / `timesheet` | [`/workspace/timesheet`](http://127.0.0.1:5410/admin-demo.html#/workspace/timesheet?view=timer) | `timer`, `sessions`, `analytics` | Focus timer, session history and analytics. | **working-demo**: Distinct timer, session table and daily/project analytics from one sample/session history; completion deduplicates even off-page. |
| Skills / `skills` | [`/workspace/skills`](http://127.0.0.1:5410/admin-demo.html#/workspace/skills?view=tree) | `tree`, `list`, `radar`, `history` | Skill tree, list, radar and history. | **partial-layout**: Skill-specific library, groups, sample practice coverage and history; coverage is not a measured competency score. |
| Goals / `goals` | [`/workspace/goals`](http://127.0.0.1:5410/admin-demo.html#/workspace/goals?view=active) | `active`, `completed`, `archived` | Active, completed and archived goals. | **working-demo**: Local goal/progress samples and meaningful status filtering. |
| Life overview / `life` | [`/life/overview`](http://127.0.0.1:5410/admin-demo.html#/life/overview) | `default` | Family and life overview with module navigation. | **working-demo**: Navigation into family, places and library proposals. |
| Social / `social` | [`/life/social`](http://127.0.0.1:5410/admin-demo.html#/life/social?view=profiles) | `profiles`, `analytics`, `connections` | Social profiles, analytics and connections. | **layout-proposal**: Sample collection; no connected social account or measured analytics. |
| Entertainment / `entertainment` | [`/life/entertainment`](http://127.0.0.1:5410/admin-demo.html#/life/entertainment?view=library) | `library`, `stats`, `sync` | Library, statistics and synchronisation. | **layout-proposal**: Sample book/film/music collection; statistics/sync workflows need definition. |
| Maps & Places / `maps` | [`/life/places`](http://127.0.0.1:5410/admin-demo.html#/life/places?view=map) | `map`, `list`, `timeline`, `privacy` | Saved places, map/list/timeline and privacy. | **schematic-layout**: Schematic fictional map; no map provider, precise location or distinct real timeline. |
| Family Connect / `family` | [`/life/family`](http://127.0.0.1:5410/admin-demo.html#/life/family?view=tree) | `tree`, `people`, `memories`, `vault`, `timeline`, `access` | Tree/members, memories, family vault and timeline/events. | **working-demo**: Local unlinked members, shared events and scoped sample files; memories are sample collections and no uploads occur. |
| Administration overview / `hub` | [`/hub/overview`](http://127.0.0.1:5410/admin-demo.html#/hub/overview) | `default` | Administration overview and access to portal modules. | **partial-layout**: Native-module/admin launch cards; not live product orchestration. |
| Workspace modules / `apps` | [`/hub/apps`](http://127.0.0.1:5410/admin-demo.html#/hub/apps?view=modules) | `modules`, `favorites`, `external` | Modules, favourites and external applications. | **layout-proposal**: Module cards; tab-specific favourites/external behaviour needs review. |
| Connected products / `companion` | [`/hub/companion`](http://127.0.0.1:5410/admin-demo.html#/hub/companion?view=all) | `all`, `finsync`, `oxfin`, `equity`, `forex`, `family` | Connected product discovery and product-specific contexts. | **layout-proposal**: Module/admin launch cards; product-specific views are not equivalent to embedded customer apps. |
| Optional assistants / `ai` | [`/hub/agents`](http://127.0.0.1:5410/admin-demo.html#/hub/agents?view=chat) | `chat`, `history`, `context`, `settings` | Optional assistant chat, history, context and configuration. | **setup-layout**: Optional tools/setup proposal; no assistant provider is required or connected. |
| Databases / `databases` | [`/hub/databases`](http://127.0.0.1:5410/admin-demo.html#/hub/databases?view=custom) | `custom`, `application`, `imports` | Custom/application data-source connections and imports. | **setup-layout**: Setup proposal; no private database query or import service in the demo. |
| Profile & Settings / `profile` | [`/hub/settings`](http://127.0.0.1:5410/admin-demo.html#/hub/settings?view=personal) | `personal`, `physical`, `security`, `appearance`, `integrations` | Personal/physical profile, security, appearance and integrations. | **partial-layout**: Theme and density preferences work locally; security/integration/profile data are conceptual samples. |
| Notifications / `notifications` | [`/hub/notifications`](http://127.0.0.1:5410/admin-demo.html#/hub/notifications?view=unread) | `unread`, `all`, `preferences` | Unread/all notifications and preferences. | **working-demo**: Session mark-read/unread/all actions, preference controls and an unread-aware header indicator. |
| Helpdesk / `help` | [`/hub/help`](http://127.0.0.1:5410/admin-demo.html#/hub/help?view=guides) | `guides`, `troubleshooting`, `diagnostics` | Guides, troubleshooting and diagnostics. | **layout-proposal**: Guide/navigation layout; no complete diagnostics or support backend. |
| Logs / `logs` | [`/hub/logs`](http://127.0.0.1:5410/admin-demo.html#/hub/logs?view=activity) | `activity`, `authentication`, `sync` | Activity, authentication and sync audit context. | **working-demo**: Distinct read-only sample event schemas; authentication creates no session and sync attempts are not fabricated. |
| About / `about` | [`/hub/about`](http://127.0.0.1:5410/admin-demo.html#/hub/about?view=version) | `version`, `capabilities`, `licenses` | Version, capabilities and licences. | **layout-proposal**: Informational/guide family; verify content matches the chosen tab and actual shipped capabilities. |
| Plans / `pricing` | [`/hub/plans`](http://127.0.0.1:5410/admin-demo.html#/hub/plans?view=capabilities) | `capabilities`, `billing` | Capabilities and billing concepts. | **layout-proposal**: Concept plans only; no settled pricing, billing or checkout is connected. |
| All customers / `customers` | [`/customers`](http://127.0.0.1:5410/admin-demo.html#/customers?view=customers) | `customers`, `activity`, `support` | Unified FinSync/OxFin customer administration. | **working-demo**: Fictional directory, local customer/profile/plan/note workflows with product scoping. |
| Welcome / `welcome` | [`/welcome`](http://127.0.0.1:5410/admin-demo.html#/welcome) | `default` | Public introduction and entry to the sample workspace. | **public-layout**: Interactive navigation and illustrative workspace preview. |
| Sign in / `login` | [`/login`](http://127.0.0.1:5410/admin-demo.html#/login) | `default` | Sign-in page composition and post-sign-in layout. | **public-layout**: Read-only sample account and preview result; no password collection or real session. |
| Privacy / `privacy` | [`/privacy`](http://127.0.0.1:5410/admin-demo.html#/privacy) | `default` | Privacy-policy typography and reading layout. | **public-layout**: Policy structure proposal only; not an approved/published legal policy. |
| Terms / `terms` | [`/terms`](http://127.0.0.1:5410/admin-demo.html#/terms) | `default` | Terms typography and reading layout. | **public-layout**: Policy structure proposal only; no legal agreement is collected. |

## Appendix B. Complete application/reference package catalog

Recorded product/package status from `docs/applications.json`. Reference services with incomplete manifests are not newly deployable microservices. Use the linked README for installation/configuration and limitations.

| Application/reference package | Location / README | Purpose | Recorded status |
| --- | --- | --- | --- |
| GrowthTrack workspace | [Workspace root](../README.md) | A desktop workspace for personal growth, work, family, equity and Forex research, with a dedicated customer-admin area for the separate FinSync and OxFin products. | NiftyLens, Family Connect and Forex have native Ultimate UI modules. The fictional review demo stays isolated; read-only customer-admin adapters require explicit product configuration and approved readers. |
| GrowthTrack Ultimate | [growthtrack-ultimate](../growthtrack-ultimate/README.md) | The desktop portal for personal growth, work, insights and family/market modules, and the future customer-admin home for FinSync and OxFin. | Authenticated desktop portal with native NiftyLens, Family Connect and Forex pages, shared motion/loading states and a separate fictional review demo. FinSync/OxFin customer adapters still require configuration. |
| FinSync | [FinSync](../FinSync/README.md) | A separate customer finance application for budgets, spending, account connections and financial planning, with web and mobile source packages. | Customer application under development. Its customer administration belongs in GrowthTrack Ultimate; the customer app is not merged into Ultimate. |
| FinSync Web | [FinSync/apps/web](../FinSync/apps/web/README.md) | The customer-facing FinSync web interface for sign-in, onboarding, spending, budgets and account settings. | Independent customer app. Future administrator pages are owned by Ultimate. |
| FinSync Mobile | [FinSync/apps/mobile](../FinSync/apps/mobile/README.md) | The Expo mobile application source for the FinSync customer product. | Mobile source retained. Desktop portal redesign is the current priority; this is not a completed mobile feature audit. |
| OxFin | [FinSync/OxFin](../FinSync/OxFin/README.md) | A separate customer product for wallets, cards, bills and investment-related workflows. | Under development. Ultimate is the target for OxFin customer administration; existing service prototypes are not a production admin backend. |
| OxFin Web | [FinSync/OxFin/ox-fin-web](../FinSync/OxFin/ox-fin-web/README.md) | The independent OxFin customer interface for wallets, cards, bills and investment workflows. | Customer application under development. Shared customer-admin adapters are planned in Ultimate. |
| OxFin local infrastructure | [FinSync/OxFin/ox-fin-backend](../FinSync/OxFin/ox-fin-backend/README.md) | Local PostgreSQL and Redis definitions and SQL initialisation for OxFin. | Development infrastructure. Initialisation scripts run only for new database volumes. |
| Equity | [Equity](../Equity/README.md) | Market-research product area. NiftyLens is the canonical application. | Native market watch in Ultimate; independent Next.js source and market pipeline retained. Quote availability depends on the configured provider. |
| Equity / NiftyLens | [Equity/NiftyLens](../Equity/NiftyLens/README.md) | Equity instruments, market charts, watchlists and market-data API source. | Native market watch in Ultimate; independent Next.js source and market pipeline retained. Quote availability depends on the configured provider. |
| Family Connect | [Family Connect](../Family%20Connect/README.md) | Family trees, member profiles, memories, shared events and documents. | Native Ultimate family views use the existing Family API, account connection, permissions and PostgreSQL records. Standalone builds remain available. |
| Family Connect application | [Family Connect/familyconnect](../Family%20Connect/familyconnect/README.md) | Family membership, relationship trees, memories, calendar events and document workflows. | Native Ultimate family views use the existing Family API, account connection, permissions and PostgreSQL records. Standalone builds remain available. |
| Family Connect Frontend | [Family Connect/familyconnect/frontend](../Family%20Connect/familyconnect/frontend/README.md) | Family-tree, memory, profile, event and document interfaces. | Independent legacy UI retained for compatibility. Ultimate now owns native family views; private media uses authenticated downloads in both interfaces. |
| Family Connect Backend | [Family Connect/familyconnect/backend](../Family%20Connect/familyconnect/backend/README.md) | Family authentication, trees, relationships, events, documents and notification APIs. | Existing Family API powers native Ultimate views. Live tree roles guard member edits, relationships, events and private document access. No schema migration is part of native UI consolidation. |
| Forex research and inference | [Forex](../Forex/README.md) | Currency-data preparation, model research, saved-model inference and a Streamlit research dashboard. | Native Forex Studio in Ultimate uses cached, bounded Python history endpoints and existing saved artifacts. The independent Streamlit dashboard remains available. |
| Forex historical reference | [Forex/Forex-Ensemble-Prediction](../Forex/Forex-Ensemble-Prediction/README.md) | An earlier copy of Forex research and model code retained for reference. | Historical copy; use the parent Forex/ application for setup and changes. |
| Expense Tracker Mobile reference | [FinSync/Expense Tracker - Mobile/expense-tracker-mobile](../FinSync/Expense%20Tracker%20-%20Mobile/expense-tracker-mobile/README.md) | An earlier Expo expense-tracking application, retained separately from the canonical FinSync mobile package. | Reference application. Desktop portal work does not imply its features are merged or mobile-tested. |
| OxFin gateway prototype | [FinSync/OxFin/services/api-gateway](../FinSync/OxFin/services/api-gateway/README.md) | Reference request routing and JWT checks for experimental OxFin services. | Incomplete dependency manifest; not part of the default workspace launcher and not a production admin gateway. |
| OxFin identity prototype | [FinSync/OxFin/services/identity-service](../FinSync/OxFin/services/identity-service/README.md) | Reference token, registration and consent handlers. | Prototype only: login does not verify passwords. It must not authorise real customers or administrators. |
| OxFin wallet prototype | [FinSync/OxFin/services/wallet-service](../FinSync/OxFin/services/wallet-service/README.md) | Reference wallet workflow handlers. | Incomplete dependency manifest; not a production wallet or admin backend. |
| OxFin payment prototype | [FinSync/OxFin/services/payments-service](../FinSync/OxFin/services/payments-service/README.md) | Reference payment-provider workflow handlers. | Incomplete dependency manifest; no live payment integration is enabled by the UI work. |
| OxFin bills prototype | [FinSync/OxFin/services/bills-service](../FinSync/OxFin/services/bills-service/README.md) | Reference bill-management handlers. | Incomplete dependency manifest; retained as reference source. |
| OxFin OX prototype | [FinSync/OxFin/services/ox-service](../FinSync/OxFin/services/ox-service/README.md) | Reference OX-related workflow handlers. | Incomplete dependency manifest; retained as reference source. |

## Supporting evidence and plans

- [Supplied UI proposal](design/2026-10-28-ui-redesign-proposal.md)
- [Proposal implementation, adjustments and verification](plans/2026-10-28-proposal-implementation.md)
- [Approved real-app UI implementation and remaining integration](plans/2026-10-28-production-ui.md)
- [Independent application builds and ownership](BUILD_BOUNDARIES.md)
- [Desktop portal and customer-admin plan](plans/2026-10-28-admin-redesign.md)
- [UI audit and corrected issues](plans/2026-10-28-ui-audit.md)
- [Current UI impact analysis](plans/2026-10-28-ui-system-impact.md)
- [Machine-readable static impact map](plans/ui-impact-analysis.json)
- [Verification results and baseline failures](plans/2026-10-28-verification.md)
- [Code retrieval and optional embedding plan](plans/2026-10-28-code-retrieval.md)
- [All stylesheet dispositions](plans/css-migration-inventory.json)
- [Existing feature/route migration inventory](plans/ui-route-inventory.json)

<!-- Generated by scripts/ui-handoff.mjs. Edit docs/templates/ui-architecture-handoff.md and the feature briefs, then regenerate. -->
