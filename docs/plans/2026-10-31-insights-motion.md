# Insights page effects and motion

31 October 2026. The user requested a stronger treatment for all pages under `/Ultimate/insights/`. This adds a dedicated presentation owner for the eight Insights features while preserving their data, calculations, filters, stores and service boundaries. It extends the [shared motion refinement](2026-10-31-motion-refinement.md).

## Page treatment

| Page | Implemented treatment |
| --- | --- |
| Overview | Focus/crosshair signature, opening headline-number card, settled summary cards and a connected recent-activity trail. |
| Action Center | Stacked priority signature, unfolding action tickets, explicit priority edges and movement of surviving cards after acknowledged removal. Removed controls are not retained for an exit effect. |
| Current | Day-arc signature positioned from the page's browser-local day progression, a readable day-progress track, arriving weather metrics and numbered news stories. Location stays opt-in; unavailable source actions are disabled and news setup stays explicit. |
| Analytics | Plot signature, keyboard-native shared tabs, staged chart frames and one-time observed-line drawing. Dashed series keep their dash pattern. Existing correlation, task-cohort, streak and goal calculations are unchanged. |
| Dashboards | Tile-assembly signature, responsive chart/metric grids and viewport-admitted line reveals. Export settles active effects synchronously, and new arrivals stay still during capture. Existing duplicate/stale-export checks remain in place. |
| Progress | Trail signature, six labelled read-only summary cards and a dated-record marker. Counts remain saved-record counts; no invented momentum or confidence score is added. |
| Forecast | Observed/estimated signature, distinct forecast cards, the existing Cards/Timeline switch and chart reveals that retain the projected line's dashed identity. Targets, dates, missing observations and unavailable ETAs remain authoritative. |
| Forex | Exchange signature in the native header, assembling model tiles, metric entrances and observed/model plot treatment. Query keys, model selection, research windows, currency limits, sampling, units, CSV export and service ownership remain with Forex. |

The new vector signatures are decorative, hidden from assistive technology and independent of record values, except the Current day arc, which follows its existing local day progression. They are not measured charts or provider status indicators.

## Lifecycle and ownership

`domains/insights/InsightsMotion.tsx` wraps only registry features whose area is `insights`. Its lazy stylesheet owns the domain's surfaces. The previous Action Center, progress-summary and Current-context rules move out of global primitive styles into this owner. The shared SVG primitive is `components/motion/SignalArt.tsx`; native modules accept optional header artwork through an explicit presentation prop. No sibling domain data logic is imported.

The subsequent [Hub, Life and weather update](2026-10-31-hub-life-weather.md) extracts the generic bounded controller to `components/motion/pageMotion.ts`, retaining this domain's explicit `useInsightsMotion` adapter. It also corrects Current's weather request/configuration contracts and recovery UI.

The previous generic section entrance could run on the nested Suspense/loading placeholder before Analytics, Dashboards or Forecast arrived. The new controller observes bounded element arrivals, explicit view flags and viewport encounters. It ignores numeric text interpolation and transient chart tooltip/active-marker mutations. The initial scan is deferred one frame, so React StrictMode's rehearsal cleanup cannot consume the real entrance.

At most 40 targets are considered per scan and eight visible targets enter per burst. Observed chart-line reveals are additionally bounded to six at Tier 2 or two at Tier 1. Effects use the existing admission budget, cancel on pause/reduced motion/Lite, background dialogs, scroll, resize, field interaction, priority pre-emption and unmount, and leave no hidden resting content. View changes do not add a remount key to working forms. Existing generic/native entrances yield to the Insights owner.

## Verification scope

New checks exercise late page/query arrivals, ignored numeric interpolation, observed/projected stroke identity, acknowledged list reflow, export settling, focus preservation, admission limits, offscreen exclusion, pause/Lite, cleanup and the surviving StrictMode entrance. App routing checks cover all eight features and their 24 registered view URLs, the `/insights/` alias and exclusion of another area. **Those route checks use mocked page owners; they establish frame selection, not full per-view functionality or rendered coverage.** Existing owner tests separately cover real component calculations, persistence and exports with fictional fixtures.

| Check | Result |
| --- | --- |
| Targeted production checks, 15 suites across focused runs | 104 passed, including 26 route cases, 10 lifecycle/effect cases and three Current presentation/privacy cases |
| Isolated design demo | 1,005 passed |
| Ultimate and isolated design-preview builds | Passed |
| Ultimate TypeScript | Passed |
| Kinetic bundle gates | All five passed: initial JS 174,006 B gzip below 180,000 B; critical CSS 41,021 B below 45,000 B; font, route-chunk and lazy-heavy-dependency gates passed |
| Gateway/proxy contracts | Six passed |
| Design adapters and application READMEs | Five adapters verified; 23 READMEs checked |
| CSS inventory, UI impact, handoff and control inventory | Regenerated and checked; 67 source stylesheets inventoried, including previously unlisted existing styles |
| Synthetic scale | Bounded Node model checks passed; not browser/load measurements |
| Targeted JS/JSX lint | No errors; the existing Action Center minute-clock dependency warning remains |
| Requested local Insights entry | HTTP 200; readiness only |

One native NiftyLens large-snapshot test reached its existing five-second limit during a concurrent run with the build/demo checks. The unchanged nine-case native flow suite passed when rerun alone. The historical 3D plan check still has the previously documented humanoid preview hash mismatch (15/16 pass); no model or preview asset was changed.

The supported computer-use inventory has no browser and reports an unavailable native pipe. Opening the requested local Insights URL returned `Browser is not available: iab`. No screenshots, observed animation timing, browser FPS claim or visual page approval is asserted. Registered views retain the pre-existing implementation/parity limits documented in the UI workflow guide; this change does not invent distinct working panels for metadata-only views.

The isolated admin demo keeps its own fixtures and presentation. No deployment, private environment change, schema migration or historical 3D asset regeneration is part of this work.
