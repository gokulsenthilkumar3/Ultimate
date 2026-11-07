# Growth Isles welcome: comparison and implementation

The user requested a comparison with Bruno Simon and a distinct application of the ideas to the welcome UI. This continues the web-first review scope; desktop packaging and installation are not part of this change.

## Reference and design decisions

Reviewed the current public controls and experience description at [Bruno Simon's portfolio](https://bruno-simon.com/) on 6 November 2026. The published page describes driving as navigation, keyboard/touch controls, recovery/reset options, quality controls and discovery rewards. This was an interaction comparison, not a measured performance comparison or a claim of complete browser coverage of Bruno's world.

| Reference principle | GrowthTrack implementation |
| --- | --- |
| Explore a world to discover destinations | An original garden island connects Work, Wellbeing and Life through existing protected app destinations |
| Clear controls and recovery | Free driving, click-to-travel, held touch controls, route map, help and Reset rover |
| Discovery rewards | Actual in-world visits raise district-colored seed lanterns; previews never count as visits |
| Offer direction to first-time visitors | A guided route visits all three places and completes on renderer-acknowledged arrivals |
| Keep the world expressive | Existing water ripples and golden hour, new lantern growth and gentle optional camera following |

The outcome is **Light up your little world**, a short garden journey. The procedural art, palette, landmarks, dialogue and implementation are GrowthTrack's own. No reference-site code, models, textures, music or visual identity were copied. The separate Kite agent remains unchanged.

## Behavior and boundaries

`WelcomeCompanion.jsx` owns session-local tour state and navigation. The scene emits discovery/arrival events; acknowledgements advance the guide, including replay after all places were already discovered. Manual steering or selecting a map destination cancels the guided route. Pausing global motion cancels the route; an offscreen suspension can resume its pending destination. Reset returns the rover home while preserving acknowledged lights for this mounted page. No account, note, task or private record is created.

`livingAtlas.js` raises a seed lantern at each acknowledged destination and softly follows the rover when enabled. It uses the existing procedural geometry and bounded kinematic model, with no physics package or new asset downloads. Existing scene frame-rate/pixel budgets, hidden/offscreen pauses, disposal and static poster fallback remain in effect. Reduced-motion visitors can navigate through the place cards without running the journey. Mobile visitors explicitly opt in to 3D.

Browser review: desktop/free driving, 390px held-touch navigation, static reduced-motion composition, context loss/agent workflow preservation and the guided-journey/replay/cancellation scenario were exercised with the owner-isolated Playwright fixtures. The completed three-lantern scene stayed below 30,000 triangles and 90 draw calls. Fifteen focused component/model/public-page tests passed, and TypeScript passed. The first test invocation used the wrong workspace configuration; the corrected Ultimate run is the reported result. An initial browser run identified a CSS-generated checkmark in the camera-follow control's accessible name; an explicit label corrected it and the journey scenario passed on rerun.

The web compile uses ignored `playwright-report/welcome-isles-dist`, not the desktop-served `growthtrack-ultimate/dist`. Lighthouse supports `--dist=../playwright-report/welcome-isles-dist` for an isolated synthetic audit. The initial build under `.code-index/` compiled successfully, but Express blocked its dot-prefixed ancestor during the first audit; that failed audit is not performance evidence. Local screenshots and lab reports remain ignored; component tests and generated route counts are not user visual approval or external field-performance evidence.

Successful isolated Lighthouse samples (6 November):

| Profile | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop | 99 | 100 | 96 | 100 | 904 ms | 68 ms | 0 |
| Mobile | 88 | 100 | 96 | 100 | 3384 ms | 207 ms | 0 |

Reports are in `.code-index/performance/growth-isles/`. Both best-practices reports contain the synthetic signed-out request's expected 401 console entry. Mobile LCP still exceeds 2.5 seconds under this simulated profile. These single samples are not causal before/after evidence, real-user CrUX data, or scores for Bruno's site. No WebPageTest, GTmetrix or Pingdom result was produced.
