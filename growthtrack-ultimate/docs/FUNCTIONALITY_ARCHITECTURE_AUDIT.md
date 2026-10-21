# GrowthTrack functionality, architecture, and optimization audit

## System flow

`React module -> Zustand action -> ApiClient -> authenticated Express API -> Prisma -> local SQLite -> CRUD audit -> Logs/Databases/Insights`

All durable user records follow this path. React Query is used for remote, refreshable sources such as weather; Zustand coordinates authenticated application state; SQLite is the record of truth. Browser storage is limited to UI cache/preferences and does not replace the database.

## Functionality inventory

### Today

- **Overview:** data-driven summary of tasks, habits, goals, metrics, environment, and check-in state.
- **Current:** browser location, reverse geocoding, configured weather codes/source, configured news source, and time-aware current status.

### Body and fitness

- **Physique / 3D Mirror:** measurements, targets, comparison/history, procedural humanoid fallback, and body visualization.
- **Assessment:** database-configured assessment questions and persisted assessment rounds.
- **Training:** workout schedule, live logging, exercises, sessions, personal records, volume, and progressive-overload views.
- **Strength:** strength metrics and progression views.
- **Nutrition:** strategy, meals/logs, calorie/macro calculations, and persisted nutrition records.
- **Hydration:** rolling 24-hour view and hydration events stored in the canonical `metric_logs` table.

### Wellness

- **Sleep:** persisted sleep logs, trend/debt/score views, database-configured tips, and ID-correct deletion.
- **Lifestyle:** habit/routine tracking and analytics.
- **Mind & Wellness:** mood check-ins, journal, trends, and breathing tools.
- **Medical:** medical profile, medications, vitals, and health records.
- **Health+:** Health Score, senses, lifestyle, specialized vitality, and recovery records stored in `health_profiles`.
- **Habits:** habit CRUD, daily completion, streaks, and matrix views.

### Insights

- **Analytics:** metric trends and summaries.
- **Dashboards:** consolidated status dashboards.
- **Progress:** check-in history and user-friendly metric logger.
- **Goals:** goal CRUD and target tracking.
- **Forecast:** local trajectory/momentum model.
- **Agent insight:** local Ollama analysis using the same application state and database-backed Agent configuration.

### Workspace

- **Workspace hub:** Calendar, Documents, and Notes are nested rather than duplicated in navigation.
- **Tasks:** create, edit, complete, restore, delete, subtasks, filters, and persisted PATCH support.
- **Projects:** GitHub/manual project organization and project views.
- **Timesheet:** timer/manual entries, charts, CSV export, and corrected SQLite endpoint connection.
- **Skills:** skill tree/list/radar and persisted skill data.

### Money

- **Finance:** transactions, budgets, subscriptions, analytics, CSV import/export, and local CRUD.
- **Shopping:** shopping item CRUD and purchase state.
- **SIP calculator:** investment projection calculator.
- **Portfolio:** normalized investment holdings, allocation/performance views,
  validated add/edit/delete flows, and authenticated persistence through the
  user singleton API.

### Life

- **Social:** social profiles and analytics stored in `social_profiles`, not an undefined user-profile endpoint.
- **Entertainment:** media library, progress, statistics, and optional Trakt data retrieval.
- **Maps:** browser geolocation, automatic capture while open, manual sync, local timeline, and Google Timeline handoff.

### System

- **Agent:** Ollama-only local assistant with configurable endpoint/model/timeout.
- **Databases:** live counts and previews for application tables, editable app settings, and persistent custom tables.
- **Profile:** owner identity, physical baseline, appearance, integrations, security settings, and local avatar upload.
- **Logs:** CRUD, authentication, session, request-error, and system audit views.
- **Apps:** database-backed app catalog and launcher.
- **Help/About:** help content, environment status, release information, and diagnostics.

## Interconnection improvements completed

- Added canonical local tables for health profiles, locations, custom tables, configuration, metrics, owner profile, and audit history.
- Profile physical baseline and Progress use `metric_logs`; Hydration also uses `metric_logs`, avoiding parallel measurements.
- Health+ and Settings Health Score use `health_profiles`.
- Social UI now uses `social_profiles`.
- Timesheet now uses the real `timesheet` API/table.
- Task PUT and PATCH share one secured update handler.
- Assessment questions and sleep guidance are editable `app_settings`, not failing API calls or runtime component records.
- Weather/news, navigation, app catalog, providers, Maps, Ollama, and presentation content come from `app_settings`.
- Successful mutations create one CRUD audit; failed requests create a request warning. Routine reads no longer flood Logs.
- Logs and Databases expose the same persisted activity/table state used by modules.
- Overview, Current, Progress, Insights, 3D, and Agent consume shared state rather than isolated copies.

## Object-oriented and maintainability design

- `ApiClient` encapsulates base URL, credentials, CSRF, parsing, timeout, safe-read retries, and standard errors.
- `ApiError` provides one typed error contract for authentication, validation, timeout, and server failures.
- Server domain adapters translate specialized UI actions—Hydration and Finance import/export—into canonical models.
- React remains composition-based. UI inheritance is intentionally avoided because hooks and component composition are safer than class hierarchies for rendering.
- Prisma models own persistence contracts; Zustand slices own domain state transitions; this is separation of concerns rather than one large component/controller.

Future domain services should be introduced when a module gains multiple external providers—for example `MapSyncService`, `DocumentProviderService`, or `BankImportService`—with provider adapters behind a common interface. They should not be created as unused abstractions.

## Performance improvements completed

- Route-level lazy loading for application modules.
- 3D model loading only when Physique/3D is requested.
- GET/HEAD retry with exponential delay and request timeout; mutations are never automatically repeated.
- Session `lastSeenAt` writes throttled to five-minute heartbeats.
- Successful read requests no longer create database audit rows.
- Database previews are limited; location history responses are bounded.
- Expensive chart/3D vendor code remains split from ordinary module code.
- Dead Firebase/Supabase synchronization code and the Supabase package were removed.
- Animation additions use transform/opacity so they do not trigger layout on every frame.

## Security improvements completed

- bcrypt password hashing, login throttling, opaque hashed sessions, HTTP-only SameSite cookies, and CSRF validation.
- Explicit local/production origin allowlist and credentialed CORS.
- CSP, frame denial, MIME sniffing prevention, strict referrer policy, and restricted camera/microphone/geolocation policy.
- Protected database fields cannot be changed through generic collection mutations.
- Every update/delete is ownership-scoped to the authenticated user.
- Custom table identifiers are checked for ownership and payloads are bounded.
- Avatar upload accepts only PNG/JPEG/WebP data and enforces a size ceiling; SVG is rejected.
- Latitude/longitude, capture time, source length, configuration keys/categories, and JSON payload sizes are validated.
- Internal database errors are logged on the server without returning implementation details to the browser.
- Integration credential records are not included in database previews or general state responses.

## Animation and UX system

- Consistent page entrance animation and card/dialog disclosure feedback.
- Button press feedback and pointer-only card lift to avoid touch-device hover problems.
- One dropdown-arrow treatment in dark and light themes.
- Responsive modal height/overflow and mobile bottom-sheet behavior.
- User-level **Reduce motion** setting stored in SQLite and applied globally.
- Operating-system `prefers-reduced-motion` remains supported.

Animations should communicate state changes, not run continuously without purpose. Charts should animate only on first reveal or data change; long lists and background tabs should not animate. Three.js animation should pause when the tab is hidden.

## Remaining work

### Priority 0 — verification and correctness

- Sign in and run authenticated end-to-end checks for every module, CRUD action, dialog, light theme, mobile width, and keyboard flow.
- Keep the current automated baseline green: 158 unit/component tests pass,
  including the 1,000-task stress case and portfolio/3D safety guards.
- Add integration tests for authentication, CSRF, PATCH ownership, CRUD audit creation, CSV import, avatar limits, and custom-table ownership.
- Add automated accessibility checks and visible focus/keyboard tests.

### Priority 1 — scalability and reliability

- Split `/api/state` into versioned domain snapshots and load secondary modules on demand; the current all-domain bootstrap will grow with user history.
- Add cursor pagination to logs, metrics, finance, notes, tasks, and database previews.
- Store avatars as local files with database metadata instead of large base64 strings when multiple/high-resolution images are required.
- Normalize custom-table rows if large datasets or SQL querying are required; JSON rows are appropriate only for small personal tables.
- Add scheduled SQLite backup, restore, integrity check, and migration verification.
- Move audit writes to a bounded queue if mutation volume grows.
- Add compression and immutable hashed-asset hosting in the production server.
- Split the large Three.js and chart vendor bundles further and suspend render loops when off-screen.

### Priority 2 — real external integrations

- Upgrade the structurally valid humanoid GLB with a human-grade authored pass:
  proper deformation review, morph coverage, orientation, and PBR textures.
- Implement OAuth/provider adapters for Google Drive, OneDrive, Dropbox, Calendar, GitHub, Trakt, and other catalog apps.
- Implement a native HealthKit/Health Connect companion for Apple/Android health sync; a browser cannot directly access these stores.
- Implement a supported bank/Open Finance provider. CSV import/export works locally; simulated bank sync is intentionally not presented as real.
- Google does not expose a general API to import private Timeline history. True background location capture requires a native mobile application and explicit background permission.
- Add provider token encryption using an OS keychain or external key-management key before storing live integration credentials.

### Priority 3 — product enhancement

- Add configurable dashboard widgets, drag/drop layout, saved views, and cross-module deep links.
- Add event-driven insight recalculation after metric, habit, goal, sleep, and task mutations.
- Add undo history for custom tables and high-value destructive actions.
- Add offline mutation queue/conflict resolution only if multi-device use becomes a requirement.
- Add data retention/privacy controls, selective export, and account-data deletion workflow.
- Add animation budgets and performance telemetry for low-end devices.

## Current release assessment

The local core is interconnected, production-buildable, and covered by 158
passing tests. Persistence, authentication boundaries, CRUD auditing, module
routing, configuration, and motion preferences now share one architecture.
External services that require provider authorization, native device APIs, or
the human-grade 3D asset pass remain explicit follow-up work rather than
simulated functionality.
