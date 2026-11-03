# Ultimate UI persistence blind spots

Status: implemented and verified in isolated browser/component/backend checks.
No product database, authentication bypass, deployment or user approval state was
changed. Existing workspace changes were preserved.

## Corrections

| Area | Blind spot | Result |
| --- | --- | --- |
| Skills | Creation, practice and deletion announced success before awaiting persistence; creation/XP drafts cleared on rejection | Writes wait for acknowledgement, retain failed drafts, show inline errors and prevent duplicate submission; Undo remains bound to the original account |
| Goals | Creation/subtasks could discard failed drafts; focus/completion failures were not handled consistently | A shared mutation guard reports failures and preserves drafts; completion feedback follows acknowledgement |
| Goal progress | UI posted `goal_id` to a generic collection accepting `goalId`, then attempted a separate goal update; history ignored the selected-goal filter | The progress controller supports both names, filters owner/goal, and updates the log and goal in one transaction; stable submission ids make lost-response retries safe |
| Goal history | Failed loads looked like empty history | Failure and Retry are explicit; a rejected load is not cached as an empty list |
| Health+ | Every recovery keystroke wrote remotely with optimistic local state and no failure feedback | Recovery edits are local drafts with an explicit Save, pending/unsaved/saved states, rejection feedback and retained drafts |
| Health+ detail | Click-only sensory cards, untrapped custom overlay, and missing exercise labels could break keyboard/detail use | Enter/Space open the shared focus-trapped dialog; Escape closes and restores focus; optional exercise labels are safe |
| Skills responsive form | A two-column description span and unwrapped practice controls could overflow narrow cards | The description spans the available row and practice controls wrap; the XP field has an accessible name |
| Store acknowledgements | Singleton/health writes could publish local changes from an empty response | Missing record acknowledgement rejects the write |
| Mind test coverage | A stale test searched for a button although Breathe is an accessible tab | The selector now tests the actual tab; browser checks verify direct URL, keyboard activation, query preservation and Back |

The shared mutation guard suppresses late UI success/error changes after an
account switch or unmount. Skills/goal drafts reset with the account before paint.
Goal edit save feedback also checks the originating session.

## Rendered coverage

All browser requests were intercepted by the existing owner-isolated fixture.
The preview runs Vite only and never opens the owner's backend/database. Windows
checks use the installed Edge Chromium because the Playwright-managed Chromium
headless binary is absent; no browser download was needed.

| Route | Actually checked | State |
| --- | --- | --- |
| `/workspace/skills` | Rejected creation retains draft and has no false success; form/practice controls at 390×844 dark/comfortable, 1024×768 light/compact, and 1440×900 light/comfortable; horizontal overflow bounded | changes-requested, fixes verified |
| `/workspace/goals` | Rejected subtask retains draft; failed history/retry; one atomic progress request with no follow-up goal PUT and no uncaught JS exception | changes-requested, fixes verified |
| `/wellness/health` | Editing makes no remote writes until Save; rejected save retains draft; Enter/Tab/Escape dialog focus and absent exercise labels | changes-requested, fixes verified |
| `/wellness/mind` | Journal direct URL, Breathe tab keyboard activation, preserved extra query parameter, browser Back | reviewed-no-finding |

This is nine browser cases across four routes, not full-portal visual coverage.
Other route/view combinations, Firefox/WebKit, 200% zoom, forced colours and
production sessions were not tested in this pass. No design approval was recorded.

## Evidence and checks

Before/after screenshots are local generated artifacts under
`growthtrack-ultimate/artifacts/ui-blind-spots/`. Before images document the goal
subtask and Health+ cases. Skills' original early-success behavior was identified
from source and covered by component regressions; its rendered screenshots show
the corrected state. Full-page images can place fixed/sticky shell controls at
the current scroll offset; they are not used as pixel-diff sign-off.

- Nine Edge Chromium browser cases pass.
- Eight component/store files, 80 tests, pass. These cover failed/delayed writes,
  duplicate submissions, account changes, retained drafts, history retry, atomic
  progress publication, existing pagination and appearance persistence.
- All 136 backend tests pass, including real SQLite transactions for progress
  replay, ownership, stale versions, date validation and rollback on child failure.
- Gateway, shared-design consistency, generated README, UI impact and handoff
  drift checks pass. Generated matrix counts remain planning counts.
- The isolated design preview builds and its 1,005 component checks pass; this
  remains automated evidence rather than approval of unreviewed browser scopes.

The final ship rerun passes all nine browser cases using a separately managed
Vite-only preview. An earlier run with Playwright-managed startup had two Goals
expansion failures and stalled during Windows preview teardown. The expansion
failure's cause is not established; the successful rerun does not establish that
the harness is free of timing problems. No browser failure was hidden by retries.

```powershell
cd growthtrack-ultimate
node node_modules/@playwright/test/cli.js test --config playwright.persistence-review.config.ts
node node_modules/vitest/vitest.mjs run src/components/Skills.persistence.test.jsx src/components/GoalsDashboard.persistence.test.jsx src/components/HealthExtras.persistence.test.jsx src/components/MindWellness.persistence.test.jsx
cd ..
node growthtrack-ultimate/tests/unit/server-backend/run.mjs
npm run impact:ui:check
npm run handoff:ui:check
```
