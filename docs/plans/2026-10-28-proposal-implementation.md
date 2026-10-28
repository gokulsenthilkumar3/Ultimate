# Supplied UI proposal: review-demo implementation

28 October 2026. The user authorised **“Implement the review demo.”** This records the implementation of the [supplied proposal](../design/2026-10-28-ui-redesign-proposal.md) in `growthtrack-ultimate/src/admin-demo`. It is ready for rendered review; no page has gained visual approval through this implementation.

Start with `npm run dev:design`, then open [the review demo](http://127.0.0.1:5410/admin-demo.html). Use **All pages & review** for the complete catalog. The [architecture handoff](../UI_ARCHITECTURE_HANDOFF.md), [review prompt](../UI_REVIEW_AGENT_PROMPT.md) and [manifest](../ui-review-manifest.json) describe every destination and its ownership.

## Implemented in the isolated demo

| Area | Result | Useful review cases |
| --- | --- | --- |
| Shared design system | Canonical light/dark tokens, forest sidebar, local Inter, density variables, readable type, input boundaries, sticky locally scrolling tables and reduced-motion tokens | Themes, compact multiline rows, 200% zoom, long values, keyboard focus and forced colours |
| Shell | Overview plus seven domain areas, active-area child navigation, scope badge, context actions, account preferences and global page/customer/task/note search | Direct routes, Back/Forward, current note drafts, duplicate task titles, desktop/mobile drawer transitions |
| Scope and provenance | DEMO, SETUP and PREVIEW page badges, per-panel provenance, six selectable design states | Populated, empty, loading, error, denied and unavailable; no screen is labelled LIVE |
| Customer administration | Product/status/plan filters, matching count, inline customer preview, full profile dialog and unique accessible detail-tab IDs | FinSync/OxFin isolation, selection disappearing after filters, inline plus dialog, close/focus restoration, long names |
| Finance | One filtered result set drives ledger rows and totals; date/category/direction/search controls, invalid-range recovery, two-decimal accounting amounts and computed holding values | Search plus filters, no-income savings rate, cents, negative values, pagination and totals after source changes |
| Timesheet | Separate timer, session table and daily/project analytics from shared sample/session history | Finish, pause/resume/reset, navigation while running, deadline completion off-page, exactly-once session recording |
| Actions and tasks | Today/Upcoming/Snoozed/Dismissed segments, local 24-hour snooze, dismiss/restore and shared completion using stable IDs | Snooze expiry, completing from another view, repeated task titles, navigation persistence |
| Notifications and logs | Read/unread/all actions, session preferences, unread indicator; distinct read-only activity/authentication/sync schemas | Mark all read, return to unread, preferences, no fictional authentication or sync success |
| Insights and growth concepts | Named input/output contracts replace misleading computed-looking charts and calculator placeholders; Current has provider-specific setup states | Distinguish intended artifact from completed analysis; inspect missing-input/provider recovery |
| Dashboards and skills | Local Earlier/Later widget ordering across Saved/Arrange; skill-specific library, groups, radar practice coverage and history | Reordering, separate artifacts, sample practice coverage labelled as such |
| Family and files | Family-scope provenance on vault metadata; file Providers is explicit setup | Family ownership, unavailable private files, no implied upload/provider connection |
| Public and account | Slim public brand header without product navigation, readable policy measure, sample login without password collection, account theme/density controls | Public direct links, dark mode, no-session sign-out explanation |

The existing Physique schematic retains independent Current/Goal drafts, bounded sliders, a 150 ms outline debounce, explicit local save and the last saved snapshot. GLB export remains unavailable. The supplied 3D worker diagram is a production integration target; this demo does not instantiate that pipeline.

## Adjustments to the proposal

The palette is preserved with accessible foreground/action variants. Calculated contrast ratios below use opaque token pairs; rendered states still need browser inspection.

| Pair | Proposed ratio | Implemented variant | Implemented ratio |
| --- | --- | --- | --- |
| Accent on white | 4.33:1 | `#1C8055` | 4.92:1 |
| Success on white | 4.14:1 | `#187547` | 5.72:1 |
| Warning on white | 3.64:1 | `#8C5B24` | 5.77:1 |
| Tertiary text on light inset | 2.74:1 | `#607165` on `#EEF2EE` | 4.59:1 |
| Tertiary text on dark inset | 3.57:1 | `#8EAAA0` on `#1A2A22` | 6.01:1 |

`#1F8A5B` remains a light-theme brand token. Dark primary buttons use a dark foreground on the brighter accent. Input outlines have a separate contrast-tested token instead of relying on subtle divider borders.

The proposed fixed 360px master + 640px detail + 24px gap + 224px rail + 48px gutters needs 1296px before adding another navigation pane. The implemented customer frame uses a flexible directory with a 300–360px preview and stacks below 1296px. Existing canonical routes are preserved; filter-only destinations are styled as segments. The 224px rail groups children inside the active area and uses the existing drawer below 960px. The optional 64px collapsed rail and a permanent second navigation pane remain design choices for review.

Density uses minimum row heights of 48/36px. Multiline content and interactive targets can increase height. No row is clipped to meet an exact token size. Shared values live in `styles/tokens.css`; layout/primitives in `portal.css`; proposal-specific frames in `styles/proposal.css`; review/table additions in `styles/workspaces.css`; Physique styles load with the domain.

Clearly labelled local plan/note edits and completion feedback remain usable sample interactions. Real entitlement/support writes still require their separate admin adapters and permissions. An unconnected provider is labelled unconnected rather than “Requires admin permission,” which would misstate the cause. Authentication logs create no session; sync logs claim no provider attempt.

Unimplemented calculators, questionnaires and analytical views show intended inputs and outputs. They do not report sample results as measured findings. A universal “n ≥ 30” rule was not adopted as proof of valid correlation: production analysis needs an appropriate method, assumptions, coverage and uncertainty. Public pages use the proposal's optional slim brand header. Physique history does not invent a version list beyond the saved snapshot actually retained.

## Verification and remaining work

The complete design suite passes **989 checks**: 804 route/theme/density renders, 10 existing workflows, 43 regressions, 39 record checks, 21 review/scale/Physique checks, 45 contrast checks and 27 proposal workflow checks. The isolated production build passes. These are component/model checks, not browser pixel verification.

The inventory covers 65 pages, 201 destinations, 13 lazy route families, 24 screen component files and 53 stylesheets across the repository. Static shared-table reach is conservatively 54 pages / 177 destinations. Six preview states produce 4,824 base scope combinations and 24,120 across the five target viewports. Review revision **v5** invalidates earlier design approvals.

Synthetic checks cover 10,000 table records with 25 default mounted rows and 24,120 restored review records. UTF-8 review JSON is 7,835,521 bytes in full form and 2,176,543 bytes compact. Browser storage quotas, long feedback, real server pagination and production concurrency need their own verification.

R01–R13 in the architecture handoff remain open: capture actual rendered evidence, inspect all affected scopes and record the user's page decisions. No connected browser was available for this run, so no screenshot or pixel review is claimed. Focus, overflow, zoom, long content, reduced motion, forced colours and both densities need rendered checks at 1024×768, 1280×800, 1440×900, 1920×1080 and 390×844.

I01–I10 remain production work packages. Native Equity/Family/Forex integration, real FinSync/OxFin administration, full specialised domain workflows, production CSS retirement and renderer/worker integration have not shipped through the demo. Separate FinSync/OxFin customer-app reviews remain necessary. No production data, credentials, environment files, model assets or deployment were changed by this continuation.
