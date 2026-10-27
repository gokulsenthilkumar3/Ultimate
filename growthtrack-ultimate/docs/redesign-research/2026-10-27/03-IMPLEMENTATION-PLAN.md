# Implementation plan — approved

Approved by the user on 27 October 2026: “Proceed with the plan.” Implementation follows the phased sequence below. See [implementation progress](05-IMPLEMENTATION-PROGRESS.md) for current evidence and outstanding work.

## Recommended order

### G0: Approve the research and implementation scope

- **Depends on:** This review package.
- **Work:** Approve the comparison-first 3D wireframe, the refined editorial direction and the route-by-route backlog. Confirm any exclusions explicitly.
- **Completion evidence:** Written approval in chat. The earlier preference answers are direction only, not implementation approval.
- **Likely files:** `docs/redesign-research/2026-10-27/`.
- **Risk/constraint:** No application or data change.

### P0: Lock shared contracts and representative layouts

- **Depends on:** G0 approval.
- **Work:** Reconcile design docs; confirm semantic tokens, header, toolbar, form, state and record-detail patterns. Create comparison, record-list and command-page reference layouts. Record baselines with isolated fixtures.
- **Completion evidence:** Approved reference screens at 1280×720, 1366×768 and 1920×1080; dark/light and keyboard review; route and state contracts enumerated.
- **Likely files:** `src/design/tokens.ts`, `src/components/ui/`, `src/styles/editorial-shell.css`, `src/styles/editorial-components.css`, `src/styles/desktop-responsive.css`, `docs/SCREEN_DESIGN_REFERENCE.md`, `docs/DESIGN_SYSTEM.md`.
- **Risk/constraint:** Avoid replacing the stylesheet stack wholesale; migrate one component family at a time.

### P1: Deliver the body-tracking and comparison workspace first

- **Depends on:** P0 contracts.
- **Work:** Remove duplicate introductions in 3D mode, compact the person selector, keep one Current/Goal/Compare switch, put the model and contextual measurement inspector in the first viewport, add explicit no-goal/no-history guidance.
- **Completion evidence:** First usable viewer and active mode visible without scrolling at 1280×720; fit/front/side/back and keyboard editing work; save state stays in view; Current/Goal separation and check-in behavior survive reload.
- **Likely files:** `src/components/Physique.jsx`, `src/components/ScrollShowcase.jsx`, `src/components/HumanoidViewer.tsx`, `src/components/physique/AvatarPeopleWorkspace.jsx`, `src/styles/physique-workspace.css`, `src/styles/avatar-workspace.css`.
- **Risk/constraint:** Keep renderer inputs, measurement conversions, protected capture rules and store schemas stable. Change the shell before changing engine behavior.

### P2: Complete the Physique record views and secondary studio

- **Depends on:** P1.
- **Work:** Refine Blueprint, Essentials/regions, Targets and History; reorganize Face/Hair/Skin/Anatomy/Clothing/Pose/View as secondary studio tools. Add one explicit export flow identifying the current capabilities of each format.
- **Completion evidence:** All five Physique views and eight inspector sections have desktop/mobile evidence; the parametric editor retains its independent Current/Goal document and import review; unsupported asset controls explain availability.
- **Likely files:** `src/components/physique/`, `src/hooks/useAvatarRecord.js`, `src/hooks/useParametricAvatar.js`, `src/styles/parametric-studio.css`.
- **Risk/constraint:** Appearance work must never mutate tracker measurements. No new asset family or source-channel expansion is implied by the redesign.

### P3: Roll out daily record pages

- **Depends on:** P0; begin after the approved 3D slice.
- **Work:** Migrate Nutrition, Hydration, Sleep, Mind, Habits, Tasks, Notes, Calendar and Timesheet using the shared patterns; preserve domain-specific behavior.
- **Completion evidence:** Primary daily task is reachable in the first viewport; populated, empty, filtered-empty, loading, error and save-failure states are verified with fixtures. Existing drafts/revisions/timers remain intact.
- **Likely files:** `src/components/Nutrition.jsx`, `src/components/HydrationTracker.jsx`, `src/components/SleepDashboard.jsx`, `src/components/MindWellness.jsx`, `src/components/HabitsMatrix.jsx`, `src/components/Tasks.tsx`, `src/app/NotesRoute.jsx`, `src/components/Calendar.jsx`, `src/components/Timesheet.tsx`.
- **Risk/constraint:** Existing functional gaps remain separate work items; do not silently change financial, recurrence or clinical logic.

### P4: Migrate Finance and the remaining domain pages

- **Depends on:** P3 pattern verification.
- **Work:** Implement every remaining native route in the page matrix, grouped by shared template. Preserve financial assumptions, units, source dates and unavailable data distinctions.
- **Completion evidence:** All 60 canonical routes are accounted for; the 191 registered secondary-view entries each have a route/state check or an explicit unsupported-view finding, with no silent deletion.
- **Likely files:** `src/components/Finance.tsx`, `src/components/Portfolio.jsx`, `src/components/InsightsHub.jsx`, `src/components/Medical.jsx`, `src/components/Training.jsx`, `src/components/StrengthMetrics.jsx`, `src/components/Documents.jsx`, `src/components/ProfileEditor.jsx`, `src/components/AppLauncher.jsx`, `src/components/UnifiedWorkspace.jsx`.
- **Risk/constraint:** Land by coherent page family rather than a repository-wide visual replacement.

### P5: Companion and public-screen finishing

- **Depends on:** P0 patterns and authenticated companion test fixtures.
- **Work:** Refine the five host frames; review each listed inner companion route with an isolated identity before styling it; align shared adapters and public/login/legal layouts without removing product-specific workflows.
- **Completion evidence:** Inner route inventory is independently checked, including handoff expiry, offline/retry and nested scrolling. Public login errors, privacy/terms reading and return navigation work at laptop and zoomed widths.
- **Likely files:** `src/components/UnifiedWorkspace.jsx`, `src/pages/`, `FinSync/apps/web/`, `FinSync/OxFin/ox-fin-web/`, `Family Connect/familyconnect/frontend/`, `Equity/NiftyLens/`, `Forex/app/`.
- **Risk/constraint:** Source inventory is not authenticated browser acceptance. No companion data migration, native parity or integration completion claim.

### P6: Acceptance and handoff

- **Depends on:** Relevant page phases complete.
- **Work:** Run the viewport/state/keyboard matrix, before/after review, focused functional suites, changed-file lint, production build and protected 3D export/capture checks. Report exceptions explicitly.
- **Completion evidence:** Evidence includes route/view, fixture state, viewport, theme, screenshot and check result. Rollback is by page family; no deployment is implied by plan approval.
- **Likely files:** `tests/e2e/`, `src/components/ui/*.test.jsx`, `docs/redesign-research/`.
- **Risk/constraint:** A viewport audit is not physical laptop certification or independent usability testing.

## Architecture and implementation boundaries

1. Build on shared primitives and semantic tokens; resolve the conflicting design docs around the user’s chosen editorial direction. Do not add another global override stylesheet as the redesign strategy.
2. Separate the 3D workspace frame from renderer/asset logic. First change hierarchy and controls while retaining tested engine inputs and state contracts. Split the large viewer component only along existing ownership boundaries and with focused regression evidence.
3. Keep one person/context identity visible. Person switching must flush or recover pending edits according to the existing record hooks. Changing camera or selection must not create body measurements.
4. Keep body-profile, target/history and artistic parametric documents separate. Preserve export capability limitations and protected content rules.
5. Retain routes, aliases and query views. Do not merge Lifestyle/Habits, Apps/Apps Suite or companions by deleting destinations; use purposeful pages and links first.
6. Implement by coherent page family with before/after fixtures and rollback points. Existing unrelated staged work is not part of these implementation commits.
7. Backend logic fixes, schema changes, integration completion, production deployment and new 3D assets are separate scope decisions. Any required defect found during redesign gets a concrete issue and evidence; do not hide it with a UI change.

## Acceptance matrix

- **Laptop baseline:** 1280×720 and 1366×768; one clear primary action visible, readable controls and no ordinary page overflow.
- **Desktop:** 1440×900 and 1920×1080; confirm sidebar transitions, useful line lengths and no unnecessary stretching.
- **Scaled/narrow:** 1024×640, 768×1024 and 390×844, plus 200%/400% browser zoom/reflow checks. Viewport resizing alone is not a complete browser zoom test.
- **Themes:** light, dark, high contrast/forced colors and reduced motion.
- **Input:** mouse, laptop trackpad and keyboard; visible focus, logical tab order, Escape and focus return. Keep the product’s 44px control target; WCAG AA’s minimum is a different threshold.
- **Data:** empty, realistic populated, long strings, many rows, missing optional sources, filtered-empty, load failure, retry, save failure, offline/stale where supported and session changes. Use isolated data.
- **3D:** loading/unsupported GPU, context loss/recovery, Current/Goal isolation, compare styles, absent goal/history, person-switch pending save, units, view controls, inspector, pose neutrality, protected capture and export scope. Geometry validity and human realism remain separate checks.
- **Page functionality:** preserve domain assertions for CRUD, Notes revisions, imports, finance arithmetic, timers, workout completion and notifications. Existing checks are selected by touched behavior rather than copied from the current implementation.
- **Artifacts:** each before/after screenshot names route, view, fixture state, theme, viewport and tested build; review all exceptions before marking the page complete.

## Effort and sequencing

This is a multi-phase app redesign, not one styling patch. A reliable calendar estimate requires implementing and timing the P0/P1 reference slice. At that gate, estimate remaining families from actual work, independently accounting for companion authentication and any authored-asset work. No invented delivery date or human-realism completion percentage is assigned.

## Scope requiring separate approval

New geometry/sculpting, new rigs or licensed asset purchases; changes to medical/financial calculations; deletion or migration of existing records; new external integrations; publishing/deployment; and replacement of the current technology stack. These are not prerequisites for the proposed interface redesign.

## Approval requested

Approve the page backlog, comparison-first 3D hierarchy and phased sequence as the implementation scope. Recommended first implementation: **P0 then P1**, followed by the remaining pages in the approved order. Approval in chat can authorize that sequence; a visual preference answer or local interaction with the review board does not count as implementation approval.
