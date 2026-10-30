# Kinetic UI 5: implementation and acceptance record

Date: 30 October 2026. Scope: Ultimate production source. Brief: [GrowthTrack Kinetic UI 5](<../GrowthTrack Kinetic UI 5.md>). Current presentation: `kinetic-workspace-v4`; tokens `5.0.0`; selectable fallback: `character-workspace-v3` / Playful.

The user authorised implementing the supplied brief, then specifically requested refinement of the quick Settings account page and `/insights/overview`. The complete, copyable explanation is [UI_WORKFLOW_AND_STYLE_GUIDE.md](../UI_WORKFLOW_AND_STYLE_GUIDE.md); individual source controls are indexed in [UI_CONTROL_INVENTORY.md](../UI_CONTROL_INVENTORY.md).

This records local implementation, not deployment, a data migration, full nested-view parity, or the user's visual approval. Existing owner sessions, product permissions, stores, drafts and mutation contracts remain the data authority. The isolated admin demo continues to own its fictional fixtures.

## Presentation and the two requested pages

- The default is Kinetic. Profile & Settings → Display offers **Kinetic / Playful** and a device-local **Lite motion** switch. Existing account theme, accent, density and accessibility settings remain effective.
- Palette: ink `#10231C`, cream `#FFF8E7`, coral `#FF5A3C`, mint `#2EE6A8`, yellow `#FFD23F`, lilac `#A78BFA`. Light/dark/AMOLED, seven accent choices and BCL/GBB remain supported.
- Coral fills use ink text; small coral copy uses `#B3341F`. The brief's white-on-`#3B82F6` pairing fails normal-text AA. Light links use `#1D4ED8`, focus `#2563EB`; dark-mode link/focus use `#93C5FD`.
- One preloaded, self-hosted Inter Variable Latin WOFF2 covers normal weights 100–900, with `swap` and a size-adjusted local fallback. No external font request is introduced. Its licence accompanies the asset.
- Shared content caps at 1440px; generous desktop padding reduces at narrow breakpoints. Cards use 16–24px radii, outlined edges and small hard shadows. Controls have 44px minimum targets and clear keyboard focus.
- **Overview:** the real due/overdue count sits beside the next useful action, then three smaller cards show open tasks, active goals and saved measurements. Latest dated activity and links remain below. Empty records stay empty; there is no invented score. At narrow widths the main cards stack.
- **Overview refinement (30 October 2026, second pass):**
  - The headline figure now uses the kinetic `AnimatedNumber.tsx`. A legacy `ui/AnimatedNumber.jsx` shadowed it, because extensionless imports resolve `.jsx` before `.tsx`. That file ignored `format`, so the figure showed `1600` beside `1,600`, and it set React state every frame with no tier, reduced-motion or cleanup handling. The legacy file is removed (its only importer, `StatCard`, receives pre-formatted strings), and `AnimatedNumber` reads the newest `format` through a ref so a parent re-render cannot restart the count.
  - The figure is sized to its card from the formatted character count (container query, capped at the brief's 120px) and sits in a labelled `group`. Blip moved to the card's free top-right corner.
  - The in-card Pause button was removed in Kinetic: it overlapped the art and duplicated the header control. Playful keeps it.
  - Copy is reduced in Kinetic: no page subtitle, and no repeat of the headline count in "On the record". With no habits, the page says "No habits tracked yet" instead of "0 of 0".
  - Activity rows carry a type icon. The activity and link cards size to their own content, so an empty activity card no longer stretches to the link list. The empty state shows Nova beside its message. "Jump back in" is two columns.
  - At 540px and below, the three figures become label-and-number rows. At 480px and below, activity rows stay left-aligned.
  - Regression tests cover the grouped figure, its accessible group name, the absent in-card control, the Playful fallback and the no-habits message. The grouped-figure test was confirmed to fail against the legacy component.
- **Quick Settings:** a 208px section rail, larger heading, actual account identity, four outlined destination cards with coloured icon tiles, a small Nova companion and a quiet billing availability panel. Profile / Referrals / Audit / System, restart setup, billing destination, close/Escape/focus restoration and profile deep links keep their existing handlers. Mobile uses a locally scrollable section strip and stacked cards.
- Kinetic removes legacy frosted-card blur and implicit whole-card hover transforms. The search dialog uses flat surfaces and existing navigation SVGs rather than first-opening a colour emoji font.
- The mobile drawer is raised above the floating dock while open, keeping Settings and Sign out reachable. Its existing focus and cancellation behaviour is preserved.

The larger headline-number treatment is applied to meaningful existing numeric summaries, including Overview and native module metrics. Form-only, legal, unavailable-data and provider-setup pages do not receive invented headline numbers. Existing domain explanatory content is retained where removing it could hide a workflow or required context.

## Workspace-wide refinement (30 October 2026, third pass)

Method: every registered page plus Welcome, Login, Privacy and Terms (65 pages) rendered at 1440 and 390 against the fictional loopback fixture, with an in-browser probe for overflow, ungrouped numbers, undersized or unpadded controls, duplicate motion controls, clipped text and page errors. Before and after runs are comparable; neither had page errors or horizontal overflow.

Root cause of the most visible defect: `ultimate-ui.css` is imported only through `playful-legacy.css`, which loads only when Kinetic is off. Under Kinetic the shared legacy `btn-*` classes kept their pill shape but lost their layout (`display: block`, no padding, no gap), so labels touched the edge of every pill on Habits, Goals, Skills, Strength, Assessment, Shopping, Portfolio, Files and others. Legacy helpers such as `.form-stack`, `.flex-row` and `.dual-grid` had no layout either, so Nutrition's fields touched. `kinetic-layout.css` now supplies these primitives, as the brief asks, instead of a new override sheet. Buttons are scoped normally; helpers and domain segmented controls use `:where()` so a page's own rule still wins.

| Measure (1440, populated fixture) | Before | After |
| --- | --- | --- |
| Boxed buttons with under 8px side padding | about 150 across 20+ pages | 3 |
| Bare inputs with no padding or radius | 7 | 1 |
| Pages with a second, in-page Pause button | 10 | 2 (Welcome and Login keep theirs, as the brief specifies) |
| Pages with an ungrouped count in their own UI | Tasks, Actions, Transactions, Nutrition | 0 (remaining hits are fixture record names) |

- **Counts** follow the owner's number format on Tasks, Action Center, Transactions and the Nutrition history and log.
- **`StatTile`** replaces four copies of the same inline tile on Habits, Goals, Skills and Shopping. Kinetic renders the figure at the brief's secondary-metric scale (40-56px, tabular, ink) and keeps the data colour as an accent bar, because several figures were pale hues on cream. Playful keeps each page's original inline scale.
- **Page titles:** Tasks Command was 28.8px under an inline style; Kinetic's 32-40px title rule now applies.
- **App Hub and About** were the two pages over the layer budget; see Performance, measured.
- **Empty states** show Nova in Kinetic (`EmptyState`, shared by every page that uses it); success, error and neutral `PageState` already used Mochi, Ziggy and Nova.
- **Section reveal** (`useSectionReveal.ts`, mounted in `PageTransition`): the page's top-level sections rise with a 40ms stagger over 320ms, at most eight, with a masked 420ms entry on the first section at Tier 2 only. It animates children, never the region Framer or the page entrance owns, asks the shared motion budget for a slot, and is skipped for Lite, reduced motion, a hidden tab and the first paint of a session, so it cannot delay LCP.
- **Micro-animations** added from the catalogue, all one-shot and tied to a user action: field-error shake (350ms), checkbox and radio pop (300ms), menu reveal (200ms), sort-glyph flip (200ms), secondary and ghost button lift with border brighten (160ms), icon-button rotate, table-row hover fill and activity-row lift (140ms).

### Performance, measured

All runs use the repository's browser harness against the fictional fixture at 4x CPU throttle, serving a production build; the baseline is the build of the commit before this work, run the same way. They are local, headless, single-machine numbers, not field data.

| Measure | Baseline | Now |
| --- | --- | --- |
| Pages measured without a failure | 65 | 65 |
| LCP, median across pages (one run each) | 1500 ms | 1452 ms |
| Main-thread blocking, median (one run each) | 454 ms | 407 ms |
| CLS, median / worst page | 0.0003 / 0.0213 | 0.0003 / 0.0213 |
| Pages over 2.5 s LCP or 0.05 CLS | 0 | 0 |
| Initial JS, gzip (limit 180,000 B) | 173,122 B | 173,588 B |
| Critical CSS, gzip (limit 45,000 B) | 38,056 B | 40,279 B |
| Pages at or over the 30-layer gate | 2 (`/hub/apps` 61, `/hub/about` 33) | 0 (16 and 14) |

- Six pages looked slower in the single-run comparison (up to +470 ms LCP). Three repeat runs of each on an idle machine showed the current build equal or faster on all six (for example Hydration 1632 to 1452 ms LCP, Companion 1732 to 1492 ms); the single-run gap was noise from tests running at the same time. Run-to-run spread on this setup is roughly 100-200 ms, so differences smaller than that are not claims.
- The 30-layer failure was in the baseline too. App Hub ran a per-card entrance at card index x 35 ms, so 45 cards were composited and hidden together and the last stayed invisible for 1.6 s; only the first dozen now animate, 40 ms apart, and Tier 0 skips it. About used backdrop blur and per-element entrance delays on every card; it is rebuilt on tokens in `about.css`.
- The cost of this pass is about 0.5 KB of gzip JS and 2.2 KB of gzip critical CSS. Not measured here: 120 Hz hardware, a 30-minute memory soak, field INP and a 4G-throttled cold load; the earlier open gates on cold 4G + 4x CPU load still apply.

Not done, and why:
- **Hero figure on every page.** The brief wants a 72-120px primary metric on each workspace page. Overview, the native modules and the lead tile of the Habits (done today), Goals (active) and Shopping (pending) strips now have one; at the audit, 61 of 65 pages had none. The remainder need a page owner to choose which real value leads; none were invented.
- **44px targets.** 1014 of 3055 measured interactive elements are under 40px, mostly repeated record controls (Portfolio rows, the Habits matrix, Goals). Enlarging dense matrices would change their layout, so only unpadded buttons and chips were fixed.
- **Pagination number pop and row-removal exit.** Eight existing tests match the exact `Page N of M` text, and an exit animation needs per-list presence handling. Neither was changed.
- **Three.js** stays confined to Physique, per the brief. No new 3D was added.
- Legacy domain content still contains emoji (Mind, Habits, Nutrition, Current).

## Motion ownership

| Concern | Source and implementation |
| --- | --- |
| Shared policy | `src/components/motion/KineticProvider.tsx`, `motionBudget.ts`, `KineticContext.ts`; one priority admission queue, local aggregate telemetry, hidden/reduced/pause gating. |
| Quality | `src/hooks/useQualityTier.ts`; hardware and battery hints, saved/OS reduced motion and Lite preference, FPS downgrade and sustained-performance upgrade. |
| Route presence | `PageTransition.tsx`; 220ms fade/rise/scale; key by module only. Exiting content is inert and hidden from assistive technology. View/filter changes do not introduce a remount. |
| Navigation | `SelectionHighlight.tsx`, `Tabs.jsx`; layout projection with spring 500/34/.8, instant for Lite/reduced motion. Keyboard/RTL/disabled behaviour remains native to controls. |
| Glow Crew | `GlowCrew.tsx`, `CharacterScene.jsx`; Blip, Mochi, Ziggy, Nova via one SVG symbol sheet and `<use>`. Each sprite has ≤20 paths, ≤5 groups, no animated filters. Siren/Snip/Sunny aliases remain. |
| Character states | Idle, greet, listen, snip, celebrate, oops, sleep. Finite reactions return to idle. Password focus controls the privacy pose without reading password values. Delayed skeleton sleep starts after 2s. |
| Public choreography | `useLandingMotion.ts`; dynamic GSAP/ScrollTrigger only on welcome/login. Two hero wrappers, 1.1s plus 100ms stagger; landing-only Tier 2 parallax bounded to ±16px. Scope reverts on exit/pause/unmount. |
| Magnetic action | `MagneticButton.tsx`; landing only, fine pointer, GSAP owns the wrapper's ±4px drift while CSS owns the child button's hover/press. |
| Micros | `kinetic-motion.css`; transform/opacity feedback, 180ms hover / 120ms press. Shared dialogs/Settings enter in 240ms; toasts in 320ms; numbers interpolate for 600ms. |
| Confetti | One lazy canvas at a time; 6 or 12 pieces, 700ms burst, DPR ≤2; no Lite/reduced-motion particles. Burst timers and RAF are disposed. |
| Native modules | `ModuleUI.jsx`; one bounded WAAPI entry of the owning frame. GSAP pointer drift, mutation observers and repeated per-query-row entrances were removed. |
| Physique | Existing lazy R3F demand renderer, resource/context-loss handling and visibility policy; central tier limits DPR to 1/1.5/2 and disables real-time shadows on Tiers 0/1. Manual pause governs optional model animation. |

The provider admits at most 3/6/12 decorative tracks for Tiers 0/1/2. Priority feedback can pre-empt idle tracks. Admission counts are conservative reservations, not a claim that a DOM element equals one GPU layer. Scenes wait for viewport admission, with a 40px margin. Hidden documents stop decoration. Tier 0 crews are static; solo lightweight feedback/blink can use remaining capacity. OS/saved reduced motion stops decoration entirely.

The existing focus-dialog stack also identifies the top overlay. Background scenes pause while a dialog/drawer covers them; only a scene inside the top dialog can keep animating. This avoids painting background SVG loops while search, Settings or a confirmation is in use, without disabling functional dialog controls.

FPS sampling uses a two-second active/visible window and eight-second rest. Below 50fps reduces quality one tier; upgrade requires at least 60 seconds of stable samples at or above 57fps under the hardware ceiling. Long-task totals and maxima stay in memory; they are not transmitted. Physical 120Hz hardware and sustained real-user 60fps are separate acceptance measurements.

Framer uses `LazyMotion` with dynamically loaded **domMax**, because the requested `layoutId` projection needs layout features that `domAnimation` alone omits. Its stable feature promise begins loading when motion is first needed; toggling Lite does not remount forms. GSAP and Framer never own the same transform on the same element. Three.js remains confined to the technical Physique workload; the optional public orb was omitted in favour of the SVG crew.

## Loading and large data

- Existing route-level lazy imports remain. Hover/focus and idle prefetch load code only, after verified authentication where applicable; they do not fetch records or bypass permission checks. Lite skips speculative prefetch.
- Public pages can paint while the existing session verification runs. Protected routes stay on a loading state until verification, and private page effects still wait for the verified session and initial-data gate. Login remains disabled while verification is pending.
- Legacy workspace/public compatibility CSS loads at its owning route or explicit Playful fallback. Entertainment and Physique compatibility styles also have route boundaries. The token pipeline retains the old 4.2 illustration values.
- `DataTable.tsx` windows more than 50 rows using measured variable heights, overscan, total row metadata and hidden spacers. A focused row stays mounted so scrolling does not discard its draft. Local sorting uses `startTransition`; server sort/page and selection contracts remain intact. Native tables use this shared surface.
- Existing Tasks/Logs/Notes fixed-size lists retain their existing virtualization. The Tasks matrix and other domain-owned layouts are not automatically converted into new server-driven workflows.
- `VisibleResponsiveContainer.tsx` reserves chart geometry and waits for viewport admission. The migrated Recharts series disable animation; chart data, tooltips and legends remain domain-owned. Once admitted, charts stay mounted to preserve state.
- Existing customer-admin pagination, Notes cursor APIs and bounded record APIs remain. This presentation work does **not** claim that every legacy collection consumer or task matrix now has server pagination. Moving legacy full-state consumers to paginated queries remains domain work; merely windowing DOM rows does not reduce their response payload.
- Existing immutable hashed assets, compression and service-worker record restrictions are preserved. This does not add a customer-data cache, model asset migration, database migration or deployment step.

Vite follows the existing lazy graph instead of broad manual vendor groups: grouping shared React helpers with Three/charts previously pulled heavy work into the eager graph. `scripts/kineticGraphPlugin.js` emits the actual chunk import/module graph. `scripts/kinetic-budgets.mjs` checks its eager closure, including merged modules, rather than trusting chunk names.

## Verification commands and evidence definitions

Run from `growthtrack-ultimate`:

```powershell
npm run typecheck
npm run build
npm run check:kinetic-budgets
npm run test:kinetic
npm run performance:kinetic -- --label=kinetic-controls
node scripts/page-performance.mjs --browser=chrome --runs=1 --label=kinetic-route-sweep
node scripts/page-performance.mjs --browser=chrome --pages=overview,login,welcome --width=390 --lite --interact --label=kinetic-mobile
node scripts/page-performance.mjs --browser=chrome --pages=profile --view=appearance --motion=no-preference --interact --label=kinetic-display
node scripts/page-performance.mjs --browser=chrome --pages=welcome,login,overview --network=4g --cpu-throttle=4 --lite --settle-ms=1800 --label=kinetic-4g
npm run performance:kinetic:soak
```

The browser harness serves a production build through the real Express static handler on loopback, supplies only fictional owner/API responses, blocks external traffic and disables service workers. It never connects to the owner's backend. Reports/screenshots are ignored local artifacts in `.gstack/benchmark-reports/`. `--dist` can freeze a copied build for a long soak. Available options include width, theme, presentation, OS motion, Lite, populated fixture, screenshots, interactions, 4G/CPU throttle, layer diagnostics and a 30-minute soak.

The static JS budget is the sum of gzip bytes in the initial HTML's static import closure, below 180,000 bytes. Critical CSS is that closure's CSS, below 45,000 gzip bytes; route-only CSS is reported by the browser separately. The 90,000-byte route gate covers direct App lazy-entry chunks, **not every transitive technical 3D vendor chunk**. Font count is checked across built font assets. GSAP, Three/R3F, postprocessing and Recharts must be absent from eager modules.

Browser decoded JS/CSS bytes are not gzip bytes. Heading readiness is not completion of every nested tab. Event Timing samples are not a field INP percentile. Layer counts are a local headless diagnostic. JS heap/DOM/listener samples do not establish total tab or GPU working-set memory. Synthetic table timings are not production load tests.

## Acceptance status

The local build and route evidence is updated below after the final checks. No source, generated matrix count or component test substitutes for the user's page approval.

- Implemented: Kinetic styling and Glow Crew, preference/fallback controls, central adaptive motion, route/highlight/dialog/toast/number feedback, viewport/budget gating, shared table windowing, chart admission, fonts, lazy heavy dependencies, Overview and Settings refinement.
- Browser sweep: 65 registered/public entry pages rendered with the empty fictional owner; no page errors or horizontal document overflow. This is entry coverage, not every nested view or live owner data.
- Critical desktop interaction checks: snip/replay, fictional check/reset, password privacy/reveal, command palette/Escape, sign-out cancellation, Settings Audit/System/Profile and its Display destination, pause/resume passed. Observed landing/account flows stayed below 30 layers after legacy blur and SVG overlap were removed.
- Static budget audit: passed; final byte totals are recorded with the final validation below.
- **Open performance gates:** the measured cold 4G + 4× CPU run exceeded 2.5s on critical routes, and the first search interaction exceeded the 200ms target. These are reported as failures against the brief, not relabelled as passes because functionality worked. Adaptive motion cannot remove all startup JavaScript or network delay.
- **Overview rendered check (headless Chromium, fictional loopback fixture, not the owner's backend):** populated and empty states at 1440 light; populated at 1440 dark and AMOLED, 1280, 1024, 1920 (light and dark) and 390. No page errors were reported. A Tier 2 sample showed the count-up passing through grouped values and ending on the exact figure. 1280 and 1920 were checked for overlap and overflow only. Reduced-motion, forced-colors, zoom, keyboard traversal and the Playful fallback were not re-reviewed in a browser, and none of this is the user's page approval.
- **Not certified:** 30-minute total-tab working set below 250MB, WebGL/GPU resource behaviour for a long Physique session, sustained 60/120fps on physical target devices, field INP, every nested page state, and the complete 1024/1280/1440/1920 × appearance × fallback visual approval matrix. The reproducible commands remain available; no deployment sign-off is inferred.
- The required historical 3D plan check reports **15/16 passing**: its embedded preview hash differs from the existing `humanoid-base.glb`. Neither that GLB nor its preview was changed by this UI work. Regenerating historical model geometry is left outside the presentation change; the failed assertion is retained.

## Regeneration

From the workspace root, regenerate/check `design:sync`, `design:check`, `impact:ui`, `handoff:ui`, the control inventory and generated application READMEs. Run the documented design/gateway/plan checks, `scale:ui`, and refresh the ignored retrieval index after edits. The supplied proposal is retained unchanged; this record states the implemented behaviour and its remaining acceptance work.
