# Playable welcome world — 6 November 2026

The user asked for a welcome-page improvement inspired by [Bruno Simon's portfolio](https://bruno-simon.com/). Its [published controls and source](https://github.com/brunosimon/folio-2025) informed the interaction direction: exploration, a controllable vehicle, destinations and playful details. GrowthTrack's world, rover, models, movement code, layout and copy are original repository work; no Bruno Simon code, models, textures, branding or audio were copied.

## Delivered behavior

The welcome hero now gives a full-width explorable island to **Pebble**, a small ceramic rover. Three neighborhoods introduce existing GrowthTrack workflows: Focus Studio (Tasks), Quiet Garden (Habits) and Life Observatory (Entertainment). The links use the canonical feature registry and normal authentication. This public tour does not load personal records or claim that example activities have been completed.

Users can click a path to travel, explicitly focus the world and drive with WASD/arrow keys, use held touch direction buttons, rotate the camera, zoom, switch golden-hour lighting, emit a bounded spark ring and reset the rover. Escape or loss of focus releases driving keys. A focused world owns its key events; there are no page-global driving shortcuts. Touch gestures outside the direction pad preserve vertical page scrolling.

On small/coarse-pointer screens, the original static world appears first with an explicit **Enter 3D world** button when motion/device quality allow it. This keeps shader compilation and the 3D module out of the initial mobile load. Desktop enters the rendered scene during browser idle time. Reduced-motion visitors retain the static tour without needing to enter 3D.

Destination buttons preview a neighborhood immediately and, when 3D movement is available, bring the world into view and drive to its approach point. Offscreen travel waits for the scene to become active. A place counts as discovered only when the simulated rover enters its proximity radius; repeated visits are deduplicated. Discovery counts are per-visit tour state, not real task completion or saved account progress. Static/reduced-motion visitors can preview every neighborhood and follow its normal application link without driving.

Kite remains the separate folded-wing agent from the earlier redesign. The welcome rover does not replace agent models, consent, notes, timers, reviewed actions or native companion controls.

## Implementation and loading

- `src/pages/WelcomeCompanion.jsx` owns tour controls, preview cards and local discovery feedback; `WelcomeWorldPoster.jsx` supplies immediate original static artwork.
- `src/pages/welcomeWorldModel.js` contains deterministic, bounded kinematic steering, braking, view-relative inputs, destination approach points, circular building collisions and island bounds. Frame integration is capped and subdivided; no new physics engine is installed.
- `src/components/motion/scenes/livingAtlas.js` builds the island, three landmarks, instanced vegetation and rover procedurally. Labels use fixed public text and projected positions. Meshes, label nodes and pointer listeners are released with the scene.
- The existing scene runtime still caps rendered resolution/DPR and frame rate. Visibility, motion preferences, low quality tiers, forced colors and lost/unavailable WebGL preserve static navigation. Pausing clears held keys/targets. Render teardown is covered by existing focused lifecycle tests.
- `LandingPage.jsx` and `welcome-companion.css` give the world the full hero width and place information cards below the playfield on small screens. Driving targets are at least 44 pixels. Owner sign-in and the rest of the welcome page remain reachable.

## Verification

The fresh Chromium lifestyle run passed **10 browser tests**. This includes the existing streaming, location, timer, note and detached-companion guards, plus scene separation, renderer pause/context-loss fallback, reduced-motion layout, rover movement and all three destination discoveries. A 390-pixel test used Chrome touch-event emulation to hold a steering control and then visit a neighborhood from below the playfield; it passed without horizontal overflow. Desktop coverage asserts a world width above 900 pixels, avoiding the previous half-width hero layout.

Type checking and **21 focused tests** passed, including diagonal speed normalization, long-frame clamping, island/building bounds, automatic arrival, braking, preview without invented visits, per-place discovery deduplication, scoped keyboard control, deferred rendering and resource disposal. These are scoped tests, not whole-app visual approval or physical-device touch certification.

Generated design, README, evidence, repository and UI handoff/impact checks passed. Historical unavailable evidence stays explicitly unavailable. Graphify's AST update and formatted outputs are refreshed after source changes; generated review-matrix counts do not imply browser coverage.

After adding mobile entry deferral, the reduced-motion and held-touch/visit browser checks were rerun and both passed. Local Lighthouse 13.6.0 used the production build, synthetic responses, blocked external traffic and simulated throttling. The first richer-world run scored desktop performance 93 (LCP 986 ms, TBT 189 ms, CLS 0) and mobile 67 (LCP 3,975 ms, TBT 799 ms, CLS 0), with accessibility 100 on both. After mobile entry deferral, the mobile run scored **76**, with LCP **3,465 ms**, TBT **593 ms**, CLS **0** and accessibility **100**. These are single lab samples, not a reliable trend or field CrUX evidence; mobile blocking time remains a limitation. The desktop score predates the mobile deferral change. Welcome best-practices 96 reflects the fixture's intentional signed-out `/api/auth/me` 401, not a renderer exception. Reports live in ignored `.code-index/performance/welcome-rover/` and `welcome-rover-mobile-final/`.

## Delivery scope

Version 2.0.5 is the local desktop build for this welcome improvement. Public GitHub distribution remains the previously published release until a separate release is approved. The certificate/signing prerequisite from the publisher setup is unchanged. No database migration, identity bypass or automatic external integration was introduced.

The final installer is `growthtrack-release-20261106070533/GrowthTrack-Ultimate-2.0.5-x64-Setup.exe`, superseding the earlier local same-version package. It was installed per-user successfully (exit 0), and the executable reports 2.0.5.0 with publisher metadata Gokul Senthilkumar. All **1,009 installed UI/runtime files** matched the final source build, fingerprint `38ac41543b117f878d504abb4cc1c7e1e34d3926f44432d959baa4afff94d249`. Fresh-account/embedded SQLite checks passed in an isolated profile; a separate isolated shared-server desktop check verified the actual rover-control region and companion open/close/authentication guards. The installed existing profile remained connected to Microsoft SQL Server. The API was restarted on 2.0.5 with built-UI serving retained, and the app and browser welcome preview were reopened. No source commit, push, merge or public binary release was performed.
