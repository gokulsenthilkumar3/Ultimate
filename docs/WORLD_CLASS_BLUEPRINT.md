# GrowthTrack Ultimate — world-class redesign blueprint

Status: analysis and target design, 2026-10-18. Items marked **Shipped** were implemented and tested in this change; everything else is a plan. It extends — and does not replace — the [transformation blueprint](GROWTHTRACK_TRANSFORMATION_BLUEPRINT.md) and the route inventory in [MASTER_PRODUCT_SPEC.md](../growthtrack-ultimate/docs/MASTER_PRODUCT_SPEC.md).

## 1. Summary

GrowthTrack already has strong foundations: owner-scoped data, honest "setup required" states, idempotent writes, a versioned Notes API, and good test discipline. What stops it feeling world class is not missing screens. It is three structural problems:

1. **Typing is the only way in.** Nearly every number — prices, events, weight, sleep, spending — is typed by hand into a form. The app should *receive* data, not ask for it.
2. **The visual system has fragmented.** Five overlapping style layers, hundreds of hard-coded colours and thousands of inline style objects make each screen look slightly different and make change expensive.
3. **Records are stored as whole JSON documents.** Portfolio, calendar, skills and plans are single JSON blobs per user, so the last writer wins and nothing can sync incrementally.

The north star is one loop, applied to every domain:

> **Capture once → sync automatically → review exceptions → see insight → act.**

This change ships the first two pieces of that loop: a server-side **Sync Engine** with live connectors, and **Quick Capture** — natural-language entry from the command bar.

## 2. Diagnosis (measured in this repository)

| Area | Evidence | Effect on users |
| --- | --- | --- |
| Manual entry | Portfolio prices, calendar events, weight, sleep, mood, water and expenses are all form-only. Bank, health, calendar and cloud providers are `setup-required`. | Data goes stale the day it is entered; people stop updating it. |
| Style system | 31 CSS files and 12,457 lines; 330 distinct hex colours; 3,056 `style={{…}}` objects in components; parallel `ui-system-v2`, `v3`, `ios27`, `premium`, `editorial-*` and `theme-v4` layers. | Inconsistent spacing, contrast and motion between modules; dark mode and density fixes must be repeated per screen. |
| Component size | `ProfileEditor` 1,462 lines, `Tasks` 1,268, `HumanoidViewer` 1,528, `Training` 878, `Projects` 840. | Slow to change safely; behaviour and layout are entangled. |
| Server shape | `server.js` is 1,073 lines mixing auth, billing, logs, singletons and collection routes; only some domains live in `server/domains/`. | Hard to version, test or move to a worker. |
| Storage model | `portfolio`, `calendarEvents`, `skills`, `trainingPlan` and others are JSON strings on `User`; clients `POST` the whole document back. | Last write wins; no per-record history, conflict review or incremental sync. |
| Third-party calls from the browser | Weather, reverse geocoding, Hacker News and GitHub (including a token) are fetched directly from the client. | Exposes location/tokens to the browser, no caching, no provenance, no background refresh. |
| Navigation breadth | 60 registered module routes across six areas. | Powerful, but nothing tells the owner what matters *today*. |

## 3. Target architecture

```text
 Clients: Web · Electron · iOS/Android companions
   │  ⌘K Quick Capture · module views · Today home
   ▼
 Application layer (per domain: commands, queries, typed ports)
   │
   ├── Ingestion spine ── Sync Engine ── connectors (pull) ── provider APIs
   │                        │  sealed credentials · scheduler · run log
   │                        └─ provenance on every record (source, observed date, fetchedAt)
   │
   ├── Domain records (rows, not blobs) with revision · tombstone · change feed
   │
   └── Read models (Insights, Today, net worth, wellness score) derived from records
```

Principles:

- **Every value has provenance.** A record says where it came from (`manual`, `quick-capture`, `mfapi.in`, `ics`…), when it was observed, and when it was fetched. Derived numbers are only shown when their inputs are dated. *Shipped for portfolio quotes and synced events.*
- **Connectors pull; domains own.** A connector only returns observations. The owning domain applies them inside a transaction that re-reads current state, so a sync never overwrites an edit made during the fetch. *Shipped.*
- **Secrets never reach the browser.** Provider keys and private feed URLs are sealed server-side with AES-256-GCM, bound to owner and provider, and never returned by any API. *Shipped.*
- **Server-side fetching is SSRF-safe.** Only public HTTPS hosts; every DNS answer is checked at connect time; redirects are re-validated; size and time limits apply. *Shipped.*
- **Rows, not blobs.** Migrate JSON singletons one at a time to row-per-record tables with integer revisions, following the Notes v1 slice. Order: calendar events → holdings → skills → plans.
- **Thin `server.js`.** Move the remaining inline routes into `server/domains/<domain>.js` with `register…Routes` functions, as finance, files, notes and sync already do.

## 4. Experience redesign

### Primary flow: the command bar is the front door

`⌘K` already searches modules and records. It now also **captures**: typing a sentence shows a preview row that saves with Enter. *Shipped.*

| You type | Saved as |
| --- | --- |
| `spent 450 on lunch via upi` | Expense · Food · UPI · today |
| `paid ₹1,250 electricity bill yesterday` | Expense · Utilities · yesterday |
| `salary 85000` | Income · Salary |
| `drank 2 glasses of water` | Hydration · 500 ml |
| `slept 7h 30m` | Sleep · 7.5 h (warns if it replaces that day's entry) |
| `weight 72.4` / `weighed 160 lbs` | Body weight in kg |
| `mood good` | Check-in · 4/5 |
| `todo renew passport friday !` | Task · high priority · due Friday |

The parser is deliberately conservative: anything ambiguous stays an ordinary search. Next steps: voice input on mobile, capture from Android notifications through the companion, and a learned category map from the owner's own past edits.

### Today home (planned)

Replace the module grid as the landing view with three source-linked cards: **What changed** (sync results, new events, price moves), **What needs you** (due tasks, renewals, failed syncs, unreviewed imports) and **How you're trending** (sleep, spend vs budget, net worth). Each card links to the record that produced it.

### One visual language (planned, in order)

1. Make `src/design/tokens.ts` the only colour, spacing, radius and motion source; generate CSS variables from it, as `design-tokens.css` already is.
2. Add a lint rule that blocks new `style={{…}}` objects and raw hex colours in components; migrate modules route by route.
3. Retire layers in order: `ui-system-v2` → `ios27` → `premium` → `theme-v4` → `index.css` legacy rules, deleting each when no route uses it.
4. Split the largest components into view + hooks + primitives (`ProfileEditor` first: each settings tab becomes its own file).

### Making it feel futuristic without becoming noisy

- **Live status everywhere:** a "Live" badge, last-sync time and source on any synced value (Sync Center cards *shipped*; inline badges planned).
- **Ambient freshness:** subtle pulse on values that changed since the last visit; respect `prefers-reduced-motion`.
- **Explainable suggestions:** "Suggested because…" on every predicted action, always with a manual path.
- **Spatial depth used sparingly:** keep the 3D twin and glass surfaces for Physique and the home hero; data screens stay flat, dense and fast.

## 5. Business flows, end to end

| Flow | Automatic source | Manual fallback | Cross-domain effect |
| --- | --- | --- | --- |
| Daily spending | Bank statement CSV today; Account Aggregator later | Quick Capture *(shipped)* | Budget progress → alerts → savings-goal impact |
| Subscriptions | Renewal dates on records | Form | Upcoming-renewal action → reviewed expense on renewal day |
| Shopping | List items | Form | "Purchased" → expense (exists) |
| Investments | NAV, crypto and stock quotes *(shipped)* | Dated manual price | Net worth → SIP projection → goal tracking |
| Calendar | Subscribed iCal feeds *(shipped)* | Events form, ICS file import | Today agenda → timesheet suggestions → focus blocks |
| Tasks | Quick Capture *(shipped)* | Form | Due reminders → Today card |
| Body and sleep | HealthKit / Health Connect companions | Quick Capture *(shipped)* | Wellness score → training load |
| Workouts | Companion workout import | Workout logger | Strength PRs → physique targets |
| Projects | GitHub (move server-side) | Manual projects | Activity → skills evidence |

## 6. Automation matrix

| Data | Before | Now | Next connector | What it needs from you |
| --- | --- | --- | --- | --- |
| Mutual fund NAV | Manual | **Live** via mfapi.in (AMFI), every 6 h | CAMS/KFintech CAS import for units | Nothing — set the AMFI scheme code as the symbol |
| Crypto prices | Manual | **Live** via CoinGecko, hourly | Read-only exchange APIs for balances | Nothing for prices |
| Stocks and ETFs | Manual | **Live** via Alpha Vantage, every 12 h | Broker APIs (Kite Connect, Upstox) for holdings | Free Alpha Vantage key + `APP_ENCRYPTION_KEY` |
| Calendar events | ICS file import | **Live** iCal subscription, hourly, read-only | Google / Microsoft Graph OAuth for two-way edits | Secret iCal URL + `APP_ENCRYPTION_KEY` |
| Expenses, income, water, sleep, weight, mood, tasks | Forms | **One-line capture** | Android notification/SMS parsing in companion | Nothing |
| Bank transactions | CSV import | CSV import | RBI Account Aggregator (Setu/Finvu) | FIU onboarding — a business decision |
| Steps, sleep, heart rate | Setup required | Setup required | HealthKit / Health Connect companions | Signed device builds |
| Weather, news, GitHub | Browser fetch | Browser fetch | Server connectors with cache and provenance | Optional GitHub token |
| Exchange rates | None | None | Frankfurter (ECB) connector | Nothing |

## 7. API

Implemented in this change (details in [SYNC_ENGINE.md](../growthtrack-ultimate/docs/SYNC_ENGINE.md)):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/sync/connectors` | List sources with status, last run and non-secret settings |
| PUT | `/api/v1/sync/connections/:key` | Connect or reconfigure; runs a first sync unless `runNow: false` |
| POST | `/api/v1/sync/connections/:key/run` | Sync one source now |
| POST | `/api/v1/sync/run` | Sync every connected source for `portfolio` or `calendar` |
| DELETE | `/api/v1/sync/connections/:key` | Disconnect; `?removeData=true` also removes mirrored events |

Next, following the same conventions (owner scope, stable error codes, `Cache-Control: private, no-store`): `/api/v1/finance/transactions` with cursor pagination and idempotency keys; `/api/v1/calendar/events` as rows; `/api/v1/today` read model; `/api/v1/reference/fx`.

## 8. Roadmap

| Phase | Deliverables | Exit criteria |
| --- | --- | --- |
| Now (shipped) | Sync Engine, four connectors, scheduler, Sync Center, Quick Capture, live portfolio prices, subscribed calendars | 8 backend + 7 parser tests; portfolio tests updated; live provider smoke check |
| Next 2 weeks | Frankfurter FX and server-side GitHub/weather connectors; inline "Live" badges; Today home; token/style lint rule | No browser-side third-party fetch remains; Today renders from read models |
| 2–6 weeks | Calendar events and holdings as rows with revisions; per-record sync replaces whole-document `POST`; split `ProfileEditor`, `Tasks`; retire two legacy CSS layers | No last-write-wins on synced domains; CSS line count down by a third |
| 6–12 weeks | Health companions ingestion; Account Aggregator decision; Google/Microsoft OAuth two-way calendar; notification-based capture on Android | Real-device evidence per the master spec's gates |

## 9. Known limitations of what shipped

- Until `GROWTHTRACK_RECORD_ROWS=1` is enabled after the reviewed migration, calendar events and holdings remain whole JSON documents, and a stale tab can overwrite fresh prices or events until the next sync. With rows enabled (implemented 2026-10-18; see SYNC_ENGINE.md) each record carries a revision and stale writes receive a conflict instead.
- One iCal subscription per owner. Detailed repeat rules (for example `BYDAY=TU,TH`), single-occurrence changes and Windows time zone names are skipped and listed rather than approximated.
- Background sync runs only while the server process runs. Desktop installs sync while the app is open.
- Sources that store a secret (stock key, calendar URL) require `APP_ENCRYPTION_KEY`; without it the Sync Center shows "Server key needed" instead of storing the secret in plain text.
