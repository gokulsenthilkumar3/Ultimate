# Original welcome world and agent — 6 November 2026

The user requested completely different welcome and agent 3D animations, built from scratch. The production welcome hero now uses **Living Atlas**, an architectural world of ceramic islands, a rising path, small landmarks and animated water rings. **Kite**, an original folded-wing character with a visor, antenna, articulated wings and focus light, replaces the portrait sprite in the workspace launcher, companion panel and detached desktop companion. The models share rendering policy, not geometry, materials or choreography. Neither new scene loads the owner's photographs or portrait atlas. Earlier artwork and historical model/build sources are preserved.

## Implementation

- `src/pages/WelcomeCompanion.jsx` owns Gather / Find flow / Grow, their captions and keyboard-accessible selection. `src/components/motion/scenes/livingAtlas.js` authors its 3D geometry and movement.
- `src/components/motion/AgentKite.jsx` provides the distinct agent and its original inline static drawing. `scenes/kiteAgent.js` authors the folded body and rest/wave/focus/cheer choreography. Poses are decoration, not microphone, model-readiness or task-completion signals.
- `ProceduralStage.jsx` defers importing each 3D scene. The compact workspace agent starts its 3D work on hover/focus, when opened, on a selected non-rest pose or during a running focus timer. Its inline drawing is present immediately. The welcome world loads during browser idle time after the initial content is painted.
- `scenes/sceneRuntime.js` caps resolution and device-pixel ratio, targets at most 30 rendered frames/second (24 for compact scenes), stops scheduling when paused/hidden/offscreen/obscured, and disposes geometries, materials and the renderer/context on teardown. There are no downloaded GLTF models, external textures, environment maps, shadows, postprocessing or fluid simulation. Water rings are deliberately lightweight geometry.
- Motion admission follows the existing Kinetic budget, device tier and user settings. Reduced motion, low-tier hardware, forced colors and unavailable/lost WebGL retain static art and functional controls. An already loaded scene freezes when animation is paused. Context loss removes the canvas and shows the static drawing.
- Focus sessions, notes, navigation, consent, authentication and Action Center review remain with their existing owners. No model/API request is made merely to display either character. The login page remains portrait-free.

## Fresh verification

The Chromium lifestyle suite passed **8 browser tests**, including both streaming import viewports, device location, timer persistence, acknowledged quick notes, detached-window sign-out behavior and the new scenes. New rendered checks cover WebGL creation, scene separation, Gather/Flow/Grow selection, pause/resume, actual renderer teardown after a context-loss event, agent poses, focus restoration and a 390-pixel reduced-motion layout without horizontal page overflow. The measured Kite render had **2,476 triangles and 10 draw calls**. The Atlas test asserts fewer than 15,000 triangles and 60 draw calls; these are per-scene bounds, not whole-app GPU measurements.

**19 focused component/runtime tests** passed. They include deferred creation, cancellation before mount completion, pause without destroying the current frame, static fallback after renderer failure, hidden-document scheduling, and exactly-once disposal of geometry/material/context resources. Type check and the 186 agent tests also passed. Generated design adapters, README checks, repository/evidence checks and UI handoff/impact checks passed; unavailable historical evidence remains explicitly unavailable. Graphify's AST graph, HTML/report and wiki were refreshed and graph JSON formatted. Its historical analysis-sidecar warning remains separate from the refreshed graph.

These checks cover the specified flows and viewports; generated review-matrix totals do not establish full-app visual approval. The user can review the new welcome scene at `http://127.0.0.1:5000/Ultimate/welcome` and Kite through the companion button on authenticated workspace pages.

## Local Lighthouse measurements

Lighthouse 13.6.0 audited the production build on loopback with synthetic populated-owner API responses, blocked external traffic and simulated desktop/mobile throttling. It is a lab measurement, not field CrUX, WebPageTest, GTmetrix or Pingdom evidence. No private session, personal records, public tunnel or paid test service was used.

| Page | Profile | Performance | Accessibility | LCP | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Welcome | Desktop | 97 | 100 | 899 ms | 117 ms | 0 |
| Welcome | Mobile | 80 | 100 | 3,710 ms | 399 ms | 0 |
| Tasks (agent launcher) | Desktop | 77 | 100 | 4,428 ms | 1 ms | 0.067 |
| Tasks (agent launcher) | Mobile | 73 | 100 | 16,697 ms | 139 ms | 0.0035 |

The first welcome run scored 99 desktop / 85 mobile and identified insufficient contrast on the new control numbers. Their opacity was removed, and the final run reached accessibility 100 on both profiles. Welcome best-practices was 96 because the synthetic signed-out context intentionally returns 401 for `/api/auth/me`; the actual scene browser test recorded no page errors. SEO was 100 on both audited pages/profiles.

A fresh comparison against the prior verified **2.0.3 packaged dist** used the same fixture and harness. Tasks scored 79 desktop / 71 mobile, with LCP 3,717 / 16,996 ms. The final new build scored 77 / 73, with LCP 4,428 / 16,697 ms. Single runs cannot establish a reliable trend or causal improvement. The large mobile Tasks LCP predates this change and remains an open application-loading limitation; the new art does not solve it. Final reports are ignored local artifacts under `.code-index/performance/original-scenes-final/`, with the comparison under `before-original-scenes/`.

## Desktop delivery

The final local 2.0.4 installer is `growthtrack-release-20261106053123/GrowthTrack-Ultimate-2.0.4-x64-Setup.exe`. Its 1,006 packaged UI/runtime files matched the workspace, with source fingerprint `04328f186eb825880a9cbdff931ec2b29bf0be5fdd0ed4c4fe22093febe5182a`. The earlier same-version build is superseded locally; only the final timestamped folder should be used. Publisher metadata remains Gokul Senthilkumar and signing still requires an identity-validated certificate. No new public release or source push/merge is implied by the local build.

The final unpacked build passed actual fresh-account setup, login, embedded SQLite startup and the existing CSV/HMAC import smoke flow in an isolated profile. The shared-server desktop test initially found HTTP 404 for `/Ultimate/welcome`: the previous API launch had omitted frontend-serving configuration. The ignored local `.env` now persists `SERVE_FRONTEND=true` and `FRONTEND_BASE_PATH=/Ultimate/`; other environment values were preserved without printing secrets. After restarting the source API, the welcome page and build-info endpoint returned 200 with the final 2.0.4 fingerprint, SQL Server remained CONNECTED, and an isolated shared-server desktop test passed welcome rendering plus companion open/close and unauthenticated-action guards. No database migration or private record change was needed.

The final per-user installer completed with exit 0. The installed executable reports version 2.0.4.0 and publisher Gokul Senthilkumar; its 1,006 installed UI/runtime files matched the final archive. The installed existing profile passed the SQL Server health check, and the app was reopened. The welcome and Agents URLs were also opened in the default browser for the user's visual review. The current public GitHub installer remains the previously published 2.0.2 release.
