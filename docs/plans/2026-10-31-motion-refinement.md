# Motion refinement across Ultimate

31 October 2026. The user requested a stronger, less repetitive animation treatment. This changes Ultimate's local production source within the existing Kinetic presentation. The selectable Playful compatibility style remains available. No deployment or rendered page approval is established by this work.

## What changes

- **Landing and login:** a scoped GSAP timeline gives the headline, supporting copy, character wrappers, paper and hand-drawn underline separate entrance beats. The headline remains painted throughout. The animation yields immediately to pointer/focus input, pause, reduced motion, viewport exit and unmount. Lower landing sections receive one viewport encounter, without hidden resting styles or replay on every scroll.
- **Character identity:** Blip makes a small comet gesture, Mochi stretches and settles, Ziggy moves in a small zigzag, and Nova tilts with curiosity. Each has its own gesture/rest rhythm and blink phase. Password focus turns them away at different angles and closes their eyes; no credential contents are read. Existing bounded scene states and admission remain authoritative.
- **Workspace navigation:** the stable page wrapper replaces the outgoing-page wait and duplicate whole-page animation. The header opens first; metric cards settle individually; other sections follow. At most eight targets animate, and the session's first paint remains untouched. Native tab changes animate only the panel over 260ms and follow tab order and RTL direction. Existing forms and headers stay mounted.
- **Shared controls:** tab indicators now animate explicit measured position and size targets. Sidebar/dock/Settings selections use the same tuned spring. Dialog and quick Settings entrances use a soft spring; errors, notifications and action confirmations enter from their respective screen locations. Arrow, bell, theme, field-focus and successful check effects respond to the action they describe.
- **Surface attention:** one shared Tier 2 light follows a fine pointer or keyboard focus across summary cards, native cards, app tiles, destination cards and public crew cards. It adds a masked rim and subtle light pool without tilting forms, text, charts or record geometry. It uses at most one pending frame, ignores touch and forced colours, clears on scroll/resize/pause/pre-emption/unmount, and refuses targets behind the active dialog.
- **Fictional Snip scene:** the three notes scatter along different trajectories with a short stagger, followed by a spring win stamp and finite ring. Replay, keyboard focus, announced outcomes and page-local state retain their existing contracts.

## Ownership and cancellation

`motionLanguage.ts` owns shared easing/spring values. `kinetic-motion.css` remains the existing effect owner; no additional global override stylesheet, new dependency or network asset is introduced. GSAP is lazy and scoped to the public hero/magnetic wrapper. Parallax uses one bounded frame per scroll burst instead of importing ScrollTrigger.

`PageTransition` and the shared modal keep a stable element type across Kinetic/Playful changes, preventing those switches from replacing focused draft fields. Section, panel and viewport animations release their budget reservations on completion, cancellation and priority pre-emption. Resuming Kinetic does not replay a route already encountered; Playful retains its existing entrance compatibility behavior.

Production sessions, stores, permissions, data adapters, mutation handlers, number values and the technical 3D workspace keep their existing owners. The isolated admin demo and separate FinSync/OxFin customer products receive no motion implementation imports or fictional-data crossover.

## Verification and limits

The focused production checks cover draft/focus retention, style switching with an open modal, native panel direction, cancellation on pause/pre-emption, surface admission/touch exclusion/scroll cleanup, hero input interruption, visible resting content, one-shot viewport encounters and observer disposal. Existing public, navigation, toast, shared UI, overview and app-entry/sign-out tests are also run. The separate fictional design demo remains checked by its own build and test command.

| Check | Result |
| --- | --- |
| Targeted production component/interaction checks, 16 suites across focused runs | 81 passed, including 11 new motion checks |
| Isolated design demo | 1,005 passed |
| Ultimate production build and design-preview build | Passed |
| Ultimate TypeScript | Passed |
| Kinetic bundle gates | All five passed: 173,854 B gzip initial JS / 180,000 B limit; 41,426 B critical CSS / 45,000 B limit; font, route-chunk and lazy-heavy-dependency gates passed |
| Gateway/proxy contracts | Six passed |
| Canonical design adapters | Five verified after canonical generation normalized checkout line endings; no semantic companion CSS changes |
| Generated application READMEs | 23 checked |
| UI inventory, impact and review-handoff regeneration/checks | Passed; generated counts are source coverage only |
| Synthetic UI scale | Passed; bounded Node model operations, not browser/load measurements |
| Targeted JS/JSX lint | Zero errors; the existing mixed-export Fast Refresh warning remains in `useToast.jsx` |
| Local public landing | HTTP 200; this is readiness only |

The surface-light clipping check sets both scroll axes explicitly because this jsdom version reports `visible` axes for an `overflow: auto` shorthand. It verifies the portal's clip inset against a measured scroll boundary; it is not evidence of browser rendering.

The supported computer-use inventory returned no browsers and an unavailable native pipe. Opening the local landing through `iab` returned `Browser is not available: iab`. Consequently this pass has no before/after screenshots, observed animation timing, rendered layout approval or measured frame-rate/interaction-latency claims. Source and bundle checks do not establish those results. The prior Kinetic document's browser measurements are historical, not measurements of this revision.

The workspace plan/model check retains its previously documented humanoid preview hash mismatch (15/16 checks pass). No model, historical preview, database, account or deployment was changed to clear that unrelated failure.
