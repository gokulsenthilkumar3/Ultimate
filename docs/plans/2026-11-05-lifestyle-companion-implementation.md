# Lifestyle and desktop companion implementation

Status: local implementation and bounded validation completed, 5 November 2026; the remaining integrations and release work below are open. This is a source-backed delivery record, not evidence that every requested provider is connected. No deployment, provider authorization or database migration was performed.

## Delivered source

- Welcome uses an original four-pose illustrated companion derived from the owner's three supplied photographs. Login has no personal portrait. Water ripples share the existing motion controls and reduced-motion policy. See the asset provenance document beside this plan.
- Current and Places share one abort-aware device geolocation helper. It checks secure context and policy, accepts valid zero coordinates, makes one accurate retry for unavailable/timeout failures, and never substitutes an IP estimate. Current does not write a timeline; Places saves only after its separate explicit action. Actual Windows location permission still depends on device/browser settings.
- Projects uses authenticated server endpoints for private repository reads and contribution counts. Credentials are sealed with owner-bound AES-GCM and never returned to the browser. Reading private repositories does not enable management. Mutations require a separate management choice; deletion also requires the repository's exact name. GitHub permissions and organization approval still limit accessible records. No account was connected on the owner's behalf.
- Shared connection guides distinguish existing actions from planned adapters. Navigation moves daily workspace and life tasks earlier while preserving custom orders. Language practice uses the user's recorded skills. Entertainment counts completed films, episodes, watching items, backlog and YouTube; duration metrics disclose missing coverage.
- Parametric assets fetch concurrently and the production server/build serve lossless Brotli/gzip for an exact public-asset allowlist. Original models, checksums, fitting logic and tests remain in place.
- The portfolio source has a separate `/downloads/` page. It lists only public stable release assets from selected repositories, with size, version and available GitHub digest. Missing installers and unavailable API responses have different states. Nothing was published.

## FocusCat and Hangly feature study

The two supplied installers were inspected as archives and metadata, without executing or installing them. FocusCat 3.0.0 contains a Tauri executable and an MIT license; its binary identifies [the FocusCat product page](https://gokulbuilds.com/focuscat/). Hangly 2.3.1 contains .NET 9, WinUI/Skia and Velopack dependencies. [Hangly's current product statistics](https://www.sharancreatedthis.in/products/hangly/stats) describe its charm/rope collection. Their original branding, art and binary code were not incorporated.

Ultimate now implements original equivalents for:

- A deadline-based focus timer with pause/resume, device recovery, owner separation and cross-window synchronization. Closing the panel does not cancel it. Completion notifications require an explicit browser permission action.
- Quick notes saved through the existing versioned, idempotent Notes API; text clears only after acknowledgement. Structured reminders use the existing Calendar API. Calendar reminders do not imply a guaranteed background OS alarm.
- Explicit local commands for timers and notes, plus supported device status. CPU/memory/disk summaries are available through a restricted Electron bridge; browser-only environments disclose unavailable metrics. There is no hidden model call or global typing/pointer monitoring.
- Three original charms and five rope behaviors. A bounded damped pendulum sleeps at rest, pauses when hidden and respects reduced motion. It uses SVG and transforms, without loading the 3D engine.
- A separate lightweight `companion.html` desktop entry, accessible through the native pin action. Its window is sandboxed, isolated, always on top and limited to the application origin. Notes and reminders require the existing session. Cross-window sign-out clears private actions.

Not yet equivalent to the reference products: system-wide website blocking, start-at-login, unrestricted desktop dragging/multi-monitor persistence, click-through hit-testing, a large licensed charm library, voice/AI chat and guaranteed background reminder delivery. These need separate implementation and native Windows validation. The bridge guard is unit tested; a packaged Windows pin/unpin smoke test remains necessary before release.

## Provider and data implementation sequence

Keep domain-owned adapters and a bounded shared connection registry. A card or platform name is not a working connection. Each adapter needs `status`, supported operations, last successful sync, cursor and actionable error state. Use owner/provider-specific encrypted credentials, minimum scopes, revocation and audit records. Never send personal records to advisory model routing implicitly.

| Area | Working local behavior | Next implementation and constraints |
| --- | --- | --- |
| GitHub | Server-mediated repositories/contributions; explicit management controls | User supplies an authorized token; verify organization SSO/fine-grained repository access against the live account. |
| Calendar | Existing records and ICS workflows | Google incremental sync tokens and Microsoft delta cursors; Zoho/Motion adapters only after OAuth/API setup. Device ICS is import/export, not bidirectional account sync. |
| Notes | Versioned workspace Notes API and explicit companion capture | Notion/OneNote adapters must sync only explicitly shared pages/notebooks; track external IDs, revisions and conflicts. No claim of access to every cloud notes app. |
| Learning | Manual recorded skills and practice | Duolingo/Airlearn progress remains manual until a supported authorized interface is verified. Select UI from the saved learning topic, without inventing XP. |
| Social | Connection guide and local records | YouTube owner-channel analytics, Meta professional-account insights and approved LinkedIn scopes each need independent consent and API eligibility. |
| Entertainment | Local library, episodes, backlog, durations and YouTube category | Netflix viewing CSV adapter with a preview/deduplication step. Export rows do not establish runtime or completion. Prime/JioHotstar/Crunchyroll/SonyLIV/ZEE5 remain manual until supported access exists. No session-cookie scraping. |
| YouTube | Separate local viewing records | Creator analytics belongs to Social. Viewing history belongs to Entertainment, with export/manual imports; YouTube Data API does not expose watch history. Deduplicate shared video IDs without conflating views and creator audience counts. |
| Places | Explicit device fix and opt-in timeline save | Google Timeline requires a user-provided device export and a dedicated importer. No general cloud Timeline read API is assumed. |
| Finance/SMS | Existing finance workflows remain intact | Inventory bank formats before expanding import. Add CSV/XLSX through one normalized transaction contract, then optional provider APIs. SMS import needs explicit device permission/export, bounded parsing, confidence and duplicate review. |

Suggested API surface per adapter: status, connect/disconnect, preview import, commit selected rows and request sync. Keep provider calls server-side and reuse domain services; do not create a separate endpoint for each screen. Normalize money to currency plus minor units, retain original timestamps/timezone/provenance, and validate spreadsheet formulas as data. Files need size/row limits, content validation and isolated parsing; exports must prevent spreadsheet formula injection. A preview must expose rejected/ambiguous rows before committing anything.

For synchronization, store provider ID + owner + remote record ID, idempotency key, cursor and tombstones. Verify webhook signatures and replay windows; enqueue bounded jobs with backoff, rate-limit handling and dead-letter status. Renew provider subscriptions before expiry. Test duplicate deliveries, cursor invalidation, token revocation, conflicts and account switching. Do not present an in-memory job as durable delivery.

### Encryption work still required

The new GitHub credential route uses the existing server sealer. This does **not** establish field encryption for all notes or financial records. Notes, revisions and mutation receipts currently contain record contents; generic IndexedDB drafts are also not an encrypted vault. UI password masking is not encryption, and TLS protects transport rather than stored records.

Before claiming encrypted storage, design a versioned envelope with owner/record/field AAD, key identifiers and authenticated encryption. Keep deployment keys outside the database and frontend; define rotation and backup recovery. Cover revisions, mutation receipts, imported originals, exports, logs, caches and device drafts. Search/indexing and server aggregation need an explicit approach because encrypted fields cannot retain ordinary plaintext queries. Create a read-compatible migration with dry-run counts, verified backup and rollback; obtain deployment/migration approval separately. No such migration is applied by this work.

Location/SMS correlations must be a separate opt-in analysis: a merchant location or message time is not evidence of the owner's exact location. Preserve source, uncertainty, timezone and matching window; display tentative matches and allow rejection/deletion. Do not track other people or infer continuous travel from sparse fixes.

### Primary provider references

[Google Calendar incremental synchronization](https://developers.google.com/workspace/calendar/api/guides/sync), [Microsoft calendar delta](https://learn.microsoft.com/en-us/graph/api/calendar-delta?view=graph-rest-1.0), [Zoho Calendar API](https://www.zoho.com/calendar/help/api/introduction.html), [Motion API authentication](https://docs.usemotion.com/docs/motion-rest-api/auth), [Notion integration access](https://www.notion.com/help/create-integrations-with-the-notion-api), [Netflix viewing export](https://help.netflix.com/en/node/101917), [YouTube playlist API limitations](https://developers.google.com/youtube/v3/docs/playlistItems/list), [YouTube Analytics](https://developers.google.com/youtube/analytics), [Google Maps Timeline](https://support.google.com/maps/answer/6258979).

## Validation and measurements

Four local Chrome end-to-end cases pass: device location with explicit persistence, focus/note acknowledgement/charm controls, standalone sign-out without model requests, and portrait-free login/four Welcome poses. Geolocation is a browser test override, not proof of the owner's Windows permission settings. Twenty focused unit tests and eight focused backend tests pass. Production build and TypeScript checks pass. Evidence/repository/UI checks are tracked separately; generated UI matrix counts are not rendered coverage.

Final additions: two parametric editor browser cases pass, including desktop shape saves, rig validation, editable package/GLB export and re-import, plus mobile per-person state and width bounds. Their older fixture was corrected to return the saved record ID required by the application; acknowledgement enforcement in production was preserved. Four floating-companion unit tests pass after tools were deferred until opening the panel. The native window guard/configuration tests also pass (two cases); they do not replace a packaged Windows smoke test.

Mobile browser checks at 390 px pass for Current, Projects, Entertainment and Welcome, including horizontal tab controls and all four atlas poses. Deferring companion tools reduced measured initial decoded JavaScript by approximately 113 KB: Current 709→596 KB, Projects 736→626 KB, Entertainment 727→618 KB. This is resource accounting, not a statistically controlled latency comparison. The final three-page smoke run reported ready times 901/973/1269 ms respectively on loopback. Reports are `.code-index/lifestyle-performance/lifestyle-mobile-verified.json` and `lifestyle-deferred-tools.json`.

Lighthouse 13.6.0 sampled desktop and mobile profiles for Welcome, Current, Projects and Entertainment. Accessibility is 100 on all four after fixing Entertainment's labels and filter contrast. Timing runs varied significantly under this shared machine; mobile scores remain below target and no all-green performance claim is made. The first complete run reported desktop performance 94–100 and mobile 61–76; the later complete pre-defer run was worse (desktop 85–97, mobile 40–59). These reports are retained separately, not averaged or cherry-picked. Local API fixtures deliberately report optional providers unavailable. Further mobile optimization and a quiet-machine repeated benchmark remain open.

The post-defer focused Lighthouse run (`lighthouse-deferred-tools/`) reports mobile Current 53 and Projects 50, with accessibility 100 on both. Simulated LCP is 21.9/21.2 seconds, so the mobile performance work remains open despite smaller initial JavaScript. For Current, observed loopback LCP is 1.877 seconds; this is a different metric and must not replace the throttled result. The trace identifies shared UI script execution and scroll-rail layout work as further investigation targets. No field-performance or production-load conclusion follows from these lab fixtures.

Portfolio TypeScript and browser checks pass. `/downloads/` returned HTTP 200 at 1440 and 390 px, had no horizontal overflow, and linked to the curated public release pages without inventing available installers. Screenshots/results remain under `.code-index/portfolio-verification/`. The local preview was stopped after verification. Root evidence, agents (186 tests), repository, generated application README, UI impact and UI handoff checks pass; the evidence register still truthfully records 26 unavailable historical artifacts.

Controlled three-run comparison at 80 ms latency, 1 MB/s download and 2× CPU slowdown: median asset fetch+parse fell from 20,702 ms identity to 14,770 ms negotiated compression (29%). Transferred assets fell from 19,856,153 to 14,242,761 bytes, while decoded bytes and model hashes stayed unchanged. This is not a first-frame/GPU metric. Raw reports are ignored local artifacts under `.code-index/parametric-delivery-comparison.json` and `.code-index/lifestyle-performance/`.

Lighthouse and browser measurements are local synthetic lab checks. Hosted WebPageTest, GTmetrix and Pingdom cannot access this loopback-only application; CrUX requires eligible real-user public-origin data. Do not rename local measurements as those services or invent field results. A public deployment or separately approved private test agent is required for their external checks.

Graphify output remains generated from code relationships. No manual product arrows are added to make disconnected products appear connected. Its native visualization is `graphify-out/graph.html`; wiki navigation is `graphify-out/wiki/index.md`, and structured memory is `graphify-out/graph.json`. Use `npm run graphify:update` for the AST refresh, visualization/wiki export and Prettier formatting together. Formatting validates that parsed graph values are unchanged. The native CLI's direct update can otherwise rewrite JSON on one line. The native HTML aggregates communities for this graph's size and requires its existing external visualization dependency.
