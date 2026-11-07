# Welcome refinement: a seed glider and a growing garden

This continues the user's request to compare Bruno Simon and apply the useful principles differently in GrowthTrack. Changes are in the web UI for review; no desktop packaging, installation or public release is authorized by this iteration.

## Comparison and concrete changes

Reviewed the published experience and controls at [Bruno Simon's current portfolio](https://bruno-simon.com/) on 7 November. It uses a car, exploratory discoveries and playful physics to reveal portfolio content. This comparison concerns published interaction patterns, not measured visual/performance equivalence or a complete browser audit of the reference.

| Principle | GrowthTrack's distinct application |
| --- | --- |
| A memorable way to move through content | Pebble is now a hovering seed vessel with a leaf sail; the ceramic rover and wheels were removed |
| A world with recognizable destinations | Work, Wellbeing and Life remain original garden districts, now connected by stepping stones rather than a circular driving track |
| Exploration changes the scene | A shared plant unfolds one colored leaf per actual district discovery, alongside the existing lantern rewards |
| Navigation accommodates different visitors | The guided route starts in the visitor's selected district, wraps through all three, and yields to manual piloting |
| Recovery and accessible alternatives | Return Pebble home, keyboard/held-touch controls, static navigation, reduced motion and WebGL fallback remain available |

The floating island has a contrasting tapered underside, lower water and nearby stones. The static SVG poster also depicts the leaf-sailed vessel and stepping routes. The separate Kite agent is unchanged. No reference-site source code, models, music or textures were copied, and no new runtime package or asset download was added.

## Scroll/pause navigation correction

The mobile recheck exposed a race: a destination chosen below the canvas could be assigned while the intersection state was still active, then erased by the scene's offscreen pause during the scroll back. The component now retains a desired destination through temporary pauses until renderer-acknowledged arrival or manual cancellation. Arrival also acknowledges targets outside a named district without inventing a discovery. A regression test simulates the active → paused → active sequence and ensures a completed target is not replayed.

## Verification and limits

- Seventeen focused component/model/public-page tests passed, including selected-district routing and retained-target regression coverage.
- Five Chromium scenarios passed for rendering/context loss, reduced-motion mobile composition, keyboard navigation, held touch and guided discovery. After the mobile heading and navigation fixes, the touch and guided cases passed again.
- The completed seed-glider scene stayed below the existing 30,000-triangle / 90-draw-call bounds. Browser fixtures verified no record-writing API calls during the public tour.
- Screenshot review caught and corrected the mobile title overlapping a landmark label. Screenshots remain ignored under `.code-index/brand/`.
- TypeScript and an isolated web build were run. Preview output uses ignored `playwright-report/welcome-isles-dist`, not the desktop-served `growthtrack-ultimate/dist`.

Local Lighthouse samples before the final retained-target fix produced performance 77/84 on desktop and 71/69 on mobile; accessibility 100, best practices 96 and SEO 100 on both profiles. The signed-out synthetic fixture logs an expected 401. The samples show substantial startup script/layout time and mobile blocking; they do not establish a causal regression or improvement against the prior day's 99/88 sample. Raw reports are in `.code-index/performance/seed-glider-welcome/` and `seed-glider-welcome-final/`. These are local simulated lab data, not CrUX/WebPageTest/GTmetrix/Pingdom field results. A final-source report, if generated, belongs in `seed-glider-welcome-verified/`.

The final-source isolated compile and TypeScript check passed. The completed verified audit in `.code-index/performance/seed-glider-welcome-verified/` measured desktop/mobile performance **78/66**, accessibility **100/100**, best practices **96/96**, SEO **100/100**, LCP **1205/3779ms**, TBT **409/1082ms**, and CLS **0/0**. Mobile startup blocking remains a limitation; functional and accessibility checks do not establish that startup performance is optimized. No desktop build was overwritten.
