# Redesign implementation progress

Approved by the user on 27 October 2026: “Proceed with the plan.”

The existing staged asset and application work remains the baseline. Implementation
changes are kept in the working tree without committing unrelated changes. A local
source snapshot is retained under `.tmp/redesign-baseline-20261027` for comparison.

## Phase status

- G0: approved in chat.
- P0: implemented — shared editorial headers, laptop spacing and design contracts.
- P1: implemented and verified — comparison leads the 3D page; the model, inspector and camera controls fit the tested laptop and desktop sizes.
- P2: implemented and verified — Essentials, measurement search, secondary studio/export tools and history. Per-person state, failed saves, live timeline editing and parametric export/restore regressions pass.
- P3: implemented — daily nutrition logging, optional target calculator and shared record-page hierarchy.
- P4: implemented — Finance disclosures, App Hub search/catalog and native headers. All 60 routes and 191 query views reviewed; see the coverage limitation below.
- P5: implemented — compact companion frames, responsive FinSync/OxFin/Family layouts, stable Family collection selectors and synchronized design adapters. All 164 companion route/viewport fixture states pass at four sizes.
- P6: automated acceptance complete — laptop, narrow/reflow, keyboard, 3D and companion fixture evidence is recorded. Manual zoom, physical-device and external sign-in limits are listed below.

## Evidence recorded so far

- Production builds: Ultimate and Family Connect pass. Ultimate type checking passes.
- Five generated companion adapters match semantic token version 3.0.0.
- Focused Finance, measurement-entry and responsive unit checks: 60 pass. Family collection snapshot regression: 2 pass.
- The 60-route heading audit passes with one visible heading, no page errors and no ordinary horizontal overflow.
- All 251 native route/view states render in the isolated empty fixture after a targeted retry of a navigation timeout.
- Nutrition, filtered transaction export, failed check-in and draft/save workflows have dedicated fixture checks.
- The app, API, gateway, Database Studio and all five companion UI entry URLs respond successfully.
- The 60-route laptop sweeps pass at 1280×720, 1366×768 and 1920×1080. Narrow/reflow checks cover seven representative routes at 1024, 768, 390 and 320 CSS pixels, including forced-color focus.
- Capture and state protection: 19 unit tests pass. Task persistence: 4 tests pass.
- All 25 distinct browser cases pass across full and targeted runs: 8 redesign, 5 laptop, 8 Physique UI and 4 appearance/parametric/people cases. Earlier failures remain historical evidence; final targeted runs verify each correction.
- Appearance preferences, per-person state and save retry, live edits leaving frozen history, parametric export/restore, and actual filtered CSV contents pass. The final manifest records source and model asset fingerprints in [resume acceptance](implementation/resume-acceptance.json).

## Running services

| Service | URL |
| --- | --- |
| Ultimate | <http://localhost:5000/Ultimate/> |
| Core API health | <http://localhost:3001/api/health> |
| Database Studio | <http://localhost:5556/> |
| Gateway health | <http://127.0.0.1:5300/api/gateway/health> |
| FinSync | <http://localhost:5000/Ultimate/products/finsync/> |
| OxFin | <http://localhost:5000/Ultimate/products/oxfin/> |
| Family Connect | <http://localhost:5000/Ultimate/products/family/> |
| Equity | <http://localhost:5000/Ultimate/products/equity/> |
| Forex | <http://localhost:5000/Ultimate/products/forex/> |

All nine entry URLs returned HTTP 200 at the final check. Family and Forex API
health checks also pass. These checks establish service availability rather than
completion of third-party account setup or external integrations.

## Findings resolved during resumed acceptance

- App Hub's intrinsic grid columns expanded the page at 390px. A bounded grid track, shrinkable children and a wrapping toolbar keep search and filters inside the page.
- Tasks' header and sorting controls overflowed at 320px. The groups now wrap; view buttons have accessible names, selected states and 44px targets.
- The 3D Physique tab grid squeezed labels together on phones. Tabs now retain readable widths inside their existing scrollable strip.
- Vite watched Playwright's generated HTML snapshots, repeatedly reloading the app and interrupting model downloads. Test outputs are excluded from watching and dependency scanning starts at the application entry point.
- Forex's virtual environment referenced a missing system Python. A project-local Python 3.12.2 runtime restores the existing packages. The old configuration is backed up in `.tmp/resume-forex-pyvenv-original.cfg`; the runtime is under `.tmp/python312-runtime`.

## Coverage limitations and separate findings

The query-view inventory contains 191 entries. In the empty fixture, 156 render
the same visible content as their default route. This is a recorded limitation,
not a claim that those entries are independently implemented or functionally
verified. The per-view evidence is in `implementation/native-view-acceptance.json`.

The user authorized isolated companion UI fixtures and separate reporting of real
sign-in verification. FinSync and OxFin fixture servers use explicit test-only
identity aliases; Family requests are intercepted in a fresh browser context.
Owner records, production sign-in and external integrations are not exercised.

FinSync standalone type checking reports the existing `User.multiFactor` usage
in its authentication helper. OxFin reports existing API/Next.js compatibility,
missing bill parser and MFA button-prop errors. These files are outside the
layout implementation; the findings remain visible rather than being described
as a green standalone release check.

The narrow checks measure CSS reflow rather than native 200%/400% browser zoom.
An interactive browser was not connected for a separate zoom check. Physical
display dimensions and laptop trackpad behavior are not certified by these tests.
The optional Ollama agent engine is not running; the core and companion service
health endpoints respond. The Ultimate production build retains its existing
large 3D bundle warning.

## Validation

Checks and screenshots are recorded as each slice is verified. Research fixtures
and screenshots remain historical evidence; they are not relabeled as implementation
acceptance. No owner database, deployment or schema migration is part of this work.
