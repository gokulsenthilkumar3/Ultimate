# GrowthTrack Ultimate master product specification

Status: in progress (inventory baseline, 2026-10-04). This is the execution inventory for the approved product target. `src/config/featureRegistry.ts` remains the source of truth for routes; a registered route or view is not evidence of a finished workflow. Current-state claims below are limited to the checked-in code and `IMPLEMENTATION_STATUS.md` dated 2026-09-29. No owner data or companion application has been migrated.

## Status and completion contract

Use exactly **planned**, **in progress**, **verified**, or **released** for each module and, before closing it, each view. “In progress” means checked-in work exists toward the target, not that the whole view works. “Verified” requires the evidence in the view contract below on every supported platform. “Released” additionally requires signed/distributed builds and production operational gates. The route registry, this inventory, and test evidence must be updated in the same change when status advances.

Every view must have: one primary user task; read and relevant create/update/delete actions; useful search/navigation; import/export where relevant; source and sync status; loading, empty, error, offline, and conflict states; keyboard and screen-reader access; and authenticated web, Windows desktop, iOS, and Android acceptance evidence. A view can document a genuinely inapplicable action, but cannot pass through a placeholder or a route smoke test alone. Shared test fixtures must cover owner isolation, retry after ambiguous writes, duplicate imports, concurrent edits, deletion, and restoration. Provider-backed views must show setup required until a real, consented provider is verified.

## Route and view audit

The **current** column is a conservative code-evidence summary. “Registry only” means no view-level completion claim was established in this audit; it does not mean the screen is blank. The **gap** column is the minimum module-specific work beyond the common view contract. All listed view names are registry IDs and their descriptions state the primary task.

| Route / owner | View tasks | Current | Gap to target | Status |
| --- | --- | --- | --- | --- |
| `/finance/overview` / Finance | Overview: reconcile position and next actions | Registry; finance collections exist | Canonical balances and source-linked actions | Planned |
| `/finance/transactions` / Finance | all: ledger and reconcile; income: review inflows; expenses: review outflows | CRUD, filters, CSV preview/commit in implementation status | Account ledger, splits, transfers, rules, attachments, integer money | In progress |
| `/finance/analytics` / Finance | categories: category breakdown; income: income analysis; comparisons: compare periods | Registry; finance reporting code exists | Explainable drill-down and provenance | In progress |
| `/finance/trends` / Finance | monthly: period trends; recurring: repeat pattern review | Registry | Source-linked trend calculations | Planned |
| `/finance/budgeting` / Finance | current: manage plan; history: compare past plans | Budget records exist | Period/category plans, rollover, alerts | In progress |
| `/finance/subscriptions` / Finance | active: manage renewals; upcoming: prepare renewals; archived: review cancelled items | Subscription records exist | Renewal and price history, cancellation tracking | In progress |
| `/finance/portfolio` / Finance | holdings: maintain positions; allocation: inspect exposure; history: review performance | Manual-price snapshots in implementation status | Canonical transactions, corporate actions, valuation provenance | In progress |
| `/finance/sip` / Finance | inputs: set assumptions; projection: inspect result; comparison: compare saved cases | Registry | Saved scenarios and disclosed assumptions | Planned |
| `/finance/shopping` / Finance | lists: manage lists; planned: estimate purchases; purchased: reconcile receipts | CRUD, estimates, CSV preview, expense conversion | Canonical ledger linkage and cross-platform completion | In progress |
| `/finance/sync` / Finance | accounts: manage consent; csv: preview/import; history: recover runs | CSV import exists; live bank adapter absent | Connector ledger, dedupe, revocation and recovery | In progress |
| `/insights/overview` / Insights | today: see state; priorities: choose next action; summary: review domains | Registry | Permission-aware, source-linked command center | Planned |
| `/insights/actions` / Insights | today: act now; upcoming: plan; snoozed: resume; dismissed: audit | Registry | Persistent queue and source-linked reminder controls | Planned |
| `/insights/current` / Insights | weather: check context; news: read sources; local: view nearby context | Registry | Consented live sources and timestamps | Planned |
| `/insights/analytics` / Insights | trends: inspect change; correlations: examine relation; comparisons: compare domains | Registry | Provenance, sample limits and safe inference | Planned |
| `/insights/dashboards` / Insights | saved: open dashboards; arrange: configure cards | Registry | Saved layouts and permission-aware cards | Planned |
| `/insights/progress` / Insights | timeline: review history; comparisons: compare periods; milestones: inspect achievements | Registry | Source-linked events and drill-down | Planned |
| `/insights/forecast` / Insights | trends: inspect projection; scenarios: compare saved assumptions | Nonfabricated forecast work in status | Explainability, uncertainty, saved cases | In progress |
| `/wellness/overview` / Wellness | Overview: review health and next actions | Registry | Source-linked command center | Planned |
| `/wellness/sleep` / Wellness | log: record sleep; trends: inspect patterns; history: review entries | SleepLog model exists | Diary, goals, native parity and provenance | In progress |
| `/wellness/lifestyle` / Wellness | routines: manage practices; preferences: configure; history: review adherence | Registry; account JSON exists | Normalized routines and adherence history | Planned |
| `/wellness/mind` / Wellness | checkin: record state; trends: inspect; journal: write privately; breathe: follow exercise | Check-in/journal persistence work in status | Private journal conflict handling and view-level parity | In progress |
| `/wellness/medical` / Wellness | vitals: record measures; medications: manage; records: file history; timeline: review | Vitals and medication models exist | Source, safety wording, files and timeline | In progress |
| `/wellness/health` / Wellness | senses: assess; lifestyle: assess; specialized: assess; recovery: track | Registry; account JSON exists | Versioned structured assessments | Planned |
| `/wellness/habits` / Wellness | today: complete schedule; matrix: inspect adherence; history: review | Habit model exists | Schedules, streak rules, review | In progress |
| `/wellness/physique` / Wellness | blueprint: plan; measurements: calibrate; targets: set; history: compare; 3d: inspect twin | Substantial 3D/body work exists | Optional 3D linkage, progress media and native parity | In progress |
| `/wellness/assessment` / Wellness | questionnaire: answer; results: interpret; history: compare | Account JSON exists | Versioned instruments and longitudinal results | Planned |
| `/wellness/training` / Wellness | schedule: plan; logger: record; prs: review bests; overload: progress; volume: analyze; sessions: inspect | Recoverable draft and idempotent completion in status | Program/session model, derived analysis, native parity | In progress |
| `/wellness/strength` / Wellness | log: inspect lifts; progression: review; 1rm: estimate; fatigue: assess; volume: inspect | Training data exists | Derive from one canonical training record set | Planned |
| `/wellness/nutrition` / Wellness | daily: log food; history: review; targets: set; calculator: estimate | NutritionLog model exists | Recipes, target provenance and native parity | In progress |
| `/wellness/hydration` / Wellness | today: log intake; history: inspect; targets: configure | Failure/retry state in status | Event log, reminders and native parity | In progress |
| `/wellness/sync` / Wellness | devices: manage access; imports: review; history: audit | Setup required; no synthetic health writes | HealthKit/Health Connect consent, ingestion, dedupe, revoke | Planned |
| `/workspace/overview` / Workspace | Overview: review next work and recent activity | Source-linked overview exists | Complete cross-module task/action states | In progress |
| `/workspace/calendar` / Workspace | month: plan; week: plan; agenda: act; connections: manage sources | Calendar/ICS foundation in status | Recurrence, invitations, reminders, native parity | In progress |
| `/workspace/files` / Workspace | vault: organize files; providers: manage access; recent: reopen | Owner-scoped bytes and safe previews in status | Folders, versions, sharing, provider verification | In progress |
| `/workspace/notes` / Workspace | all: find notes; pinned: prioritize; tags: browse; editor: write | Route-backed views, acknowledged CRUD, retained conflicts, reviewed Markdown import/export, encrypted browser draft recovery; see `NOTES_VERTICAL_SLICE.md` | Idempotent creation, folders, knowledge links, revisions/tombstones, full offline/sync, native clients | In progress |
| `/workspace/tasks` / Workspace | today: act; upcoming: plan; all: find; completed: review; list: organize; board: move | Task persistence work in status | Recurrence, dependencies, subtasks, views | In progress |
| `/workspace/projects` / Workspace | github: inspect repositories; mine: manage projects; grid: browse; list: browse | Manual project annotations in account JSON | Owned project records, milestones and repo consent | In progress |
| `/workspace/timesheet` / Workspace | timer: track; sessions: edit; analytics: report | Persistent sessions and recoverable timer in status | Approval/billable exports and native parity | In progress |
| `/workspace/skills` / Workspace | tree: map; list: manage; radar: compare; history: review | Account JSON exists | Evidence-backed skills and plans | Planned |
| `/workspace/goals` / Workspace | active: check in; completed: review; archived: retain | Goal model exists | Milestones and source-linked progress | In progress |
| `/life/overview` / Life | Overview: review personal life | Registry | Source-linked, consent-aware summary | Planned |
| `/life/social` / Life | profiles: maintain owned figures; analytics: inspect; connections: manage consent | Manual profiles explicitly non-live in status | Real consented adapters or honest manual-only UX | In progress |
| `/life/entertainment` / Life | library: track media; stats: review; sync: manage source | Entertainment model exists | Progress and optional verified connectors | In progress |
| `/life/places` / Life | map: explore; list: manage; timeline: review; privacy: control retention | Location opt-in/list/map fallback in status | Retention, deletion, native location adapter | In progress |
| `/hub/overview` / Hub | Overview: see system state | Registry | Actual service and data health | Planned |
| `/hub/apps` / Hub | modules: launch Ultimate; favorites: personalize; external: open outside apps | Registry and navigation exist | Integrated companion launchers and saved preferences | In progress |
| `/hub/agents` / Hub | chat: ask; history: review; context: select; settings: control | Consented streamed chat; writes disabled | Citations, durable history if opted in, reviewed actions | In progress |
| `/hub/databases` / Hub | custom: manage datasets; application: inspect own records; imports: audit | Owner-facing browser exists | Safe paging, import history and permissions | In progress |
| `/hub/settings` / Hub | personal: edit identity; physical: edit measures; security: manage devices; appearance: customize; integrations: manage providers | Owner profile and appearance persist | Device/revocation, export/delete, verified connectors | In progress |
| `/hub/notifications` / Hub | unread: triage; all: review; preferences: configure | Persistent read/dismiss/preferences in status | Source-linked channels and native delivery | In progress |
| `/hub/help` / Hub | guides: learn tasks; troubleshooting: recover; diagnostics: inspect | Registry | Task-based guides and safe diagnostics | Planned |
| `/hub/logs` / Hub | activity: audit; authentication: review; sync: recover | Audit metadata exists | Scoped auth/sync views and recovery | In progress |
| `/hub/about` / Hub | version: inspect release; capabilities: see support; licenses: review | Registry | Build-derived accurate metadata | Planned |
| `/hub/plans` / Hub | capabilities: inspect entitlement; billing: manage plan | Account tier/Stripe fields exist | Accurate entitlement and billing workflows | In progress |

### Companion integration routes and remaining native workflows

Six discovery routes have since been registered: `/finance/finsync`, `/finance/oxfin`, `/finance/equity`, `/insights/forex`, `/life/family`, and `/hub/companion`. They now show Ultimate-owned related destinations and the explicit migration gap. Their views are navigation IDs only; no companion data parity has been verified. The original 54 routes in the audit remain the baseline, making 60 registered module routes in the current working tree.

| Proposed owner / routes | Primary tasks | Status |
| --- | --- | --- |
| Finance `/finance/wallet`, `/finance/cards`, `/finance/bills`, `/finance/investments` (OxFin) | Manage wallets, cards, bills and investments against canonical accounts and transactions | Planned |
| Finance `/finance/currencies`, `/finance/forex` | Watch currencies; inspect forecast evidence; compare scenarios | Planned |
| Finance `/finance/markets`, `/finance/charts`, `/finance/options`, `/finance/market-alerts` (NiftyLens) | Inspect sourced markets, indicators and option chains; manage alerts | Planned |
| Life `/life/family`, `/life/relationships`, `/life/family-calendar`, `/life/memories`, `/life/family-documents` | Invite members and manage record-level shared content | Planned |

The proposed deeper routes above still need validation against each companion's actual feature inventory before navigation is added. FinSync maps into the existing ledger, budgeting, portfolio, and sync routes. Do not add duplicate account balances or silently point a launcher to a standalone runtime. An iframe or signed handoff to the old app does not count as a merge.

## Data and API ownership

| Domain | Owns canonical records | Cross-domain consumers | First contract/migration work |
| --- | --- | --- | --- |
| Identity/Hub | User, sessions, devices, invitations, grants, audit | All areas | Owner and record authorization; device lifecycle |
| Finance | Account, transaction, split, transfer, budget, subscription, holding, valuation, import run | Insights, Shopping, Goals | Preserve SQLite fixtures; map money to integer minor units; PostgreSQL backfill and reconciliation |
| Workspace | Note, note revision/link, file/version, task, project, event, timesheet | Insights, Agents, Family | Versioned Notes API and file references |
| Wellness | Sleep, mood/journal, vitals, medications, habits, training, nutrition, hydration, assessment | Insights, Agents with consent | Normalize JSON singletons one collection at a time |
| Life | Place/location, media, social profile, family space/membership/shared record | Insights | Retention and explicit record grants |
| Insights | Saved dashboard/scenario, action, derived snapshot with provenance | Reads authorized domain data | Read models only; no competing source records |

Target API shape: `/api/v1/<domain>` with generated schemas, stable error codes, owner-scoped pagination, and idempotency keys. The existing `/api/*` endpoints remain until clients and fixtures pass parity. A synchronized record needs an owning domain, stable ID, integer revision, change log entry, tombstone, and server cursor. Sensitive concurrent edits (Notes body, file versions, family records) must enter a review state with both versions preserved. No current timestamp check is treated as a complete sync protocol.

## Companion migration register

The sibling sources are present at `../FinSync`, `../FinSync/OxFin`, `../Forex`, `../Equity/NiftyLens`, and `../Family Connect/familyconnect`. See `COMPANION_SOURCE_AUDIT.md` for the observed source structure and native merge map; it is not a data parity audit. For each product: enumerate routes and entities; record source version and ownership; map each workflow to a canonical Ultimate record/route; build a read-only preview with counts and duplicate/conflict examples; take a verified backup; import with deterministic IDs and a rollback manifest; reconcile source and target totals/attachments; run owner and platform tests; and only then retire its runtime. Preserve the originals through verification. Forex's Python computation may remain an internal worker with model/version/source/uncertainty in every result.

## Delivery dependencies and gates

1. **Preserve and measure:** capture schema and sanitized migration fixtures from each owner data shape, record counts and checksums, backup/restore exercise, and baseline endpoint behavior. Never run tests against `dev.db` or owner storage.
2. **Foundation:** identity/grants/devices, typed `/api/v1` contracts, PostgreSQL and object storage, revision/change/tombstone sync, encrypted offline queues, worker, deployment config, shared design tokens and navigation. Keep compatibility adapters until parity tests pass.
3. **Notes reference slice:** execute `NOTES_VERTICAL_SLICE.md` end to end. The same evidence template then applies to Files, Tasks, Calendar, Finance ledger and wellness logs before derived dashboards and forecasts.
4. **Companions:** map and import FinSync/OxFin, Forex, NiftyLens, Family Connect through previewable, reversible jobs. Reconcile shared ledgers and permissions before removing separate runtimes.
5. **Distribution:** signed desktop and mobile builds, hosted web, private server/cloud/on-prem container configurations, upgrade and rollback rehearsals, restore drill, offline/device-loss/connector-outage tests.

For a module to move to **verified**, attach contract and migration tests, domain tests, authenticated end-to-end flows, accessibility evidence, desktop packaging, iOS/Android builds and device checks, plus performance evidence. For **released**, additionally attach deployment smoke test and successful backup restore. The existing route smoke tests and generic build alone do not advance product status.

## GrowthTrack build-agent workflow

Version product context and decisions under `docs/`; keep one module card per owned domain with entities, routes, API permissions, cross-domain links, failure states and test fixtures. The task planner selects one route/view, reads its real component/API/schema/tests and the inventory above, writes the page specification, implements one complete vertical slice, runs the relevant gates, and updates status with evidence. Agent memory stores only approved architectural decisions and source links, never private owner records. Tool permissions are read-only by default for data and external services. Human review gates apply to schema/data migrations, sensitive-data access, permission widening, external connector activation and release. Each evaluation fixture must include a failed write, offline retry and cross-owner denial where relevant. A passing generic build is insufficient.

## Open architecture decisions

Record ADRs before implementing: native client framework and shared-contract generation; PostgreSQL cutover and SQLite desktop import; sync merge policy and encryption/key lifecycle; object storage and deployment modes; family grant model; connector scopes and data retention. These are design work items, not claims that the target stack already exists.
