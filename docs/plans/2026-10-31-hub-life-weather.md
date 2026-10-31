# Hub and Life presentation, hidden scrollbars and Current weather recovery

Implemented in the production source for the local Ultimate portal. This extends the motion refinement and Insights work from the same day.

## Current weather

The former request combined `current_weather=true` with a custom `current` selection. A public-coordinate provider probe reproduced HTTP 200 with only the legacy `current_weather` object; the page read `current` instead. There was also a configuration mismatch: the component only read nested `currentSources`, while the authenticated bootstrap exposes top-level `weatherUrl` and `newsSources` settings.

`domains/insights/currentWeather.js` builds one modern response contract, preserves configured proxy parameters, fixes temperature/wind units and normalizes legacy responses when necessary. Visibility, precipitation probability and UV use the matching provider-local hour. Missing values stay unavailable; real zeroes remain visible. The page accepts both configuration shapes, respects explicitly blank sources and otherwise uses the public Open-Meteo endpoint after opt-in location. No location permission is requested on entry, no coordinates are saved by this page and no database/configuration migration is required.

Refresh failure keeps the last reading visible and offers an inline retry. The query key includes the provider and coordinates. The corrected public-coordinate probe returned the expected modern `current` object and hourly details. Provider documentation: <https://open-meteo.com/en/docs>.

## Hub and Life

All registry features in the Hub and Life areas pass through their own lazy presentation boundaries. Hub uses precise panels, tool launch tiles and service-state rows. Life uses paper edges, library sleeves and illustrated destination postcards, including Family Connect. Headers receive decorative artwork through a shared presentation context; product queries and mutations remain with their owners.

The 2D SVG compositions include a tool board, launcher, conversation, database, identity card, inbox, book, journal, film reel, folded map and family branches. Path drawing, assembled shapes, tool launches, ledger reveals, postcard settling and library/pin entrances replace repeated whole-page fades. Artwork has no provider-state or record-count semantics. The generic controller extracted from Insights is shared under `components/motion/pageMotion.ts`; the Insights domain retains its explicit adapter and existing contract.

Entrances are bounded to 40 candidate targets and eight visible admissions per burst, with the existing global motion budget. Ancestor and child entrances avoid stacking in Hub/Life. Effects stop on pause, reduced motion, Lite, background dialogs, scrolling, field interaction, pre-emption and cleanup. The initial scheduled scan supports nested lazy arrivals and StrictMode. Working forms are not keyed or replaced to animate them. The older non-Kinetic native entrance behavior remains available.

## Scrolling

Portal scrollbars are hidden on both axes without changing overflow or intercepting native input. Workspace shortcuts, shared tabs and data tables show subtle edge shadows only where horizontal content remains offscreen. The cue observer handles resized/arriving content, RTL and overscroll, never changes scroll offsets, batches measurements and disposes listeners/observers on cleanup. Named table regions and tab keyboard behavior remain intact.

## Verification

- 148 targeted tests across 15 suites passed. This includes 57 Hub/Life route cases, 26 Insights route cases, weather normalization and UI recovery, scroll-edge lifecycle, keyboard tabs, form/focus preservation, pause/Lite/dialog cancellation, existing editorial truthfulness and native flows.
- Route checks mock the page owners. They establish presentation ownership and native Companion redirects, not full functionality of each view. Existing metadata-only view/parity limitations remain documented in the workflow guide.
- Ultimate production build and TypeScript passed. All five Kinetic bundle gates passed: initial JavaScript 174,941 B gzip below 180,000 B; critical CSS 41,247 B below 45,000 B; font, route and lazy-heavy-dependency checks passed.
- The isolated design build passed and its six test suites passed all 1,005 cases. Targeted JS/JSX lint completed without errors or warnings.
- Gateway/proxy checks passed (6); design adapters verified (5); generated application READMEs checked (23).
- The requested Current, Hub overview and Life directory URLs returned HTTP 200. This is readiness evidence only.
- CSS/route inventory, UI impact, control inventory and review handoff were regenerated. They inventory 71 source stylesheets and explicitly retain pending browser verification. Synthetic scale checks cover bounded Node models rather than browser or production load.
- `test:plan` retains its pre-existing humanoid preview hash mismatch (15/16 pass). No model or historical preview asset was changed.

The supported computer-use connection exposes no browser and reports an unavailable native pipe. No screenshots, observed browser animation timing or visual page approval are claimed. The isolated fictional demo, authentication, production sessions, owner permissions and data workflows remain separate. No deployment or migration was performed.
