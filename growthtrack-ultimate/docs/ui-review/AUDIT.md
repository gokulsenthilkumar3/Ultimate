# GrowthTrack interface review — 12 September 2026

1. GrowthTrack is a substantial React 19 / Vite application with health, finance, productivity and 3D modules.
2. Shared controls exist, but most screens still contain bespoke controls and inline styles.
3. Multiple CSS layers make the current visual contract difficult to maintain.
4. Light and dark themes exist; the baseline login scan found contrast failures in both.
5. Many visible labels are present but not programmatically associated with inputs.
6. The existing custom birthday picker has avoidable date and keyboard risks.
7. Dialog focus and destructive-action behavior are inconsistent.
8. API and tab error messages can reveal implementation details instead of recovery steps.
9. Source inventory covers 196 production frontend files and 1156 static instances.
10. Maturity is intermediate: functioning product architecture, incomplete interface consistency and verification.

## Scope and completion

This is a shipped foundation migration and a comprehensive **static frontend inventory**, not an exhaustive verified redesign of every screen. The supplied GitHub URL was a placeholder; the root package.json identifies growthtrack-ultimate as the active app. Release copies, mirrors, node_modules, 3D asset contents and sibling projects were excluded. Every inventoried instance is listed in inventory-before.md and inventory-after.md. A source instance inside a loop is counted once. Dynamic DOM, server-origin copy, canvas interactions, every CSS declaration, all error branches, charts and all authenticated screens have **not** been individually exercised. No WCAG conformance or full-product completion is claimed.

## Highest-impact audit: Buttons, Inputs, Dropdowns, DatePickers, Errors

Locations below use saved pre-change files where available. Before-source snapshots make those line numbers reproducible. Code snippets show the fix pattern; actual implementation is in src and per-file patches.

| Element | File:Line | Issue | Severity | Recommended Fix | Code Snippet |
|---|---|---|---|---|---|
| Buttons | src/styles/design-system.css:2 | Small variant below the requested 44px target. | High | Use a 44px minimum at all sizes. (Fixed) | `min-height: 44px` |
| Buttons | src/styles/design-system.css:4 | White labels on the accent fail contrast in the baseline login scan (3.64:1). | High | Use the tested semantic action/on-action pair. (Fixed) | `background: var(--gt-action)` |
| Buttons | src/components/ui/Button.jsx:5 | No forwarded ref, task-specific loading label, or success/error indicator. | Medium | Forward refs and expose loadingLabel/status. (Fixed) | `<Button loading loadingLabel="Saving…" />` |
| Inputs | src/components/ui/TextField.jsx:8 | Caller descriptions can replace validation associations; aria-invalid can be overridden. | High | Merge description IDs and retain invalid state when error exists. (Fixed) | `[externalDescription, hintId, errorId]` |
| Inputs | src/components/ProfileEditor.jsx:55 | Repeated profile Field labels are disconnected from their controls. | High | Generate a stable ID and link htmlFor to both control variants. (Fixed) | `const id = useId()` |
| Inputs | src/components/Tasks.tsx:758 | Task title, description, priority, category, date and parent labels are disconnected. | High | Link all six visible labels to their controls. (Fixed) | `htmlFor="task-title"` |
| Dropdowns | src/components/ui/SelectField.jsx:6 | Validation descriptions can be overwritten; invalid select has no dedicated border state. | High | Preserve descriptions and apply invalid styling to select. (Fixed) | `select[aria-invalid="true"]` |
| DatePicker | src/components/ui/StunningDatePicker.jsx:50 | Scrolling can create invalid month/day combinations; custom grid has 28px targets and no full keyboard model. | High | Use a labelled native date input retaining the date-only string API. (Fixed) | `<TextField type="date" />` |
| DatePicker | src/components/ProfileEditor.jsx:867 | Date of birth has no upper bound or autofill hint. | Medium | Limit selection to the local current date and enable birthday autofill. (Fixed) | `autoComplete="bday" max={today}` |
| DatePicker | src/components/Calendar.jsx:305 | Inline edit title/date/recurrence have no labels. | High | Wrap each in a visible label. (Fixed) | `<label>Event date<input type="date" /></label>` |
| Errors | src/lib/apiClient.js:51 | API errors expose arbitrary backend text or numeric request failure. | High | Map status to stable actionable copy; retain payload for diagnostics. (Fixed) | `requestErrorMessage(response.status, path)` |
| Errors | src/lib/apiClient.js:55 | Timeout has no next step; native network errors reach UI; cancellation and timeout conflated. | High | Differentiate cancellation, timeout and connection failures. (Fixed) | `uiMessages.connection` |
| Errors | src/components/TabErrorBoundary.jsx:37 | Render errors expose technical details in the normal UI. | High | Show an actionable recovery message and retry control. (Fixed) | `<p>Try loading this page again…</p>` |
| Errors | src/pages/LoginPage.jsx:22 | Generic fallback plus arbitrary error.message. | High | Display curated API errors or sign-in guidance. (Fixed) | `uiMessages.signIn` |
| Toggles | src/pages/LoginPage.jsx:33 | No way to inspect a mistyped password. | Medium | Add a keyboard-operable toggle with pressed state. (Fixed) | `aria-pressed={showPassword}` |
| Sliders | src/components/ProfileEditor.jsx:96 | Repeated RangeField controls have disconnected labels. | High | Associate visible label with range ID. (Fixed) | `htmlFor={'profile-range-${field}'}` |
| Upload | src/components/Documents.jsx:78 | Progress is simulated; modal closes without awaiting persistence; bytes are never uploaded. | Critical | Await metadata persistence, remove fake percentage, describe file-record behavior. (Fixed) | `await onUpload(record)` |
| Upload | src/components/Documents.jsx:53 | Blocking alert provides no inline retry context. | Medium | Keep selected context and show an inline actionable error. (Fixed) | `<p role="alert">Choose a file smaller than 50 MB…</p>` |
| Upload | src/components/Documents.jsx:111 | Dropzone is pointer-only. | High | Provide keyboard activation and a clear accessible name. (Fixed) | `role="button" tabIndex={0}` |
| Modals | src/components/ui/Modal.jsx:10 | Fixed title ID collides when dialogs coexist. | High | Generate a unique title ID. (Fixed) | `const titleId = useId()` |
| Modals | src/hooks/useDialogFocus.js:12 | Nested dialogs each handle Escape and can release another dialog’s scroll lock. | High | Track active dialogs; only top dialog handles keys; restore overflow after last closes. (Fixed) | `if (openDialogs.at(-1) !== token) return` |
| Modals | src/components/ui/ConfirmDialog.jsx:20 | Destructive confirm receives initial focus; no focus trap. | High | Compose shared Modal; focus Cancel first. (Fixed) | `data-dialog-autofocus` |
| Modals | src/components/SettingsModal.jsx:122 | Settings dialog lacks shared keyboard focus management. | High | Attach shared dialog hook. (Fixed) | `useDialogFocus(true, onClose)` |
| Tables / search | src/components/Documents.jsx:342 | Search and clear control lack accessible names. | High | Name the search and clear button; enlarge clear target. (Fixed) | `aria-label="Clear document search"` |
| Feedback | src/hooks/useToast.jsx:75 | All messages interrupt readers and errors/action messages disappear on a timer. | Medium | Use status for routine updates; retain errors/actions until dismissal. (Fixed) | `role={type === "error" ? "alert" : "status"}` |
| Feedback | src/components/ui/LoadingSkeleton.jsx:5 | Loading skeleton has no status name. | Medium | Expose loading status to assistive technology. (Fixed) | `role="status" aria-label="Loading your workspace"` |
| Layout | src/components/ConsentBanner.jsx:9 | Fixed banner covers the mobile sign-in CTA in visual review. | High | Measure banner height and reserve login space; use a nonmodal aside. (Fixed) | `--consent-height` |
| Typography / color | src/pages/LoginPage.jsx:29 | Private owner access text measures 3.8:1 in baseline scan; weak page hierarchy. | High | Use semantic muted text and add a page heading. (Fixed) | `<h1>Your space to grow.</h1>` |
| Themes | src/design/tokens.ts:3 | Token file is dark-only and unused by CSS. | Medium | Generate themed CSS variables from the token source. (Fixed) | `node scripts/build-design-tokens.mjs` |
| Motion | src/styles/design-system.css:35 | New fields need reduced-motion and forced-colors coverage. | Medium | Disable field transitions under reduced motion; retain system borders in forced colors. (Fixed) | `@media (forced-colors: active)` |
| Navigation / offline | src/App.jsx:359 | Workspace has global loading/error wrappers but no prominent offline recovery in main content. | Medium | Display connection status alongside current screen. (Fixed) | `serverStatus === "offline"` |
| Upload integrations | src/components/Documents.jsx:181 | Provider connection success is simulated by a timeout. | High | Replace with real connector authorization before claiming linked status. (Open: backend integration) | `await provider.authorize()` |
| Navigation | src/styles/experience.css:12 | Some desktop navigation targets remain below the requested 44px size. | Medium | Review density and enlarge targets across navigation. (Open: broader migration) | `min-height: 44px` |
| Forms | src/components/ProfileEditor.jsx:907 | Additional custom security/social fields still need individual label and error audits. | High | Migrate remaining fields to TextField and SelectField. (Open: broader migration) | `<TextField label="Current password" />` |

## Design tokens and first refactored component

Source: src/design/tokens.ts. Generated theme variables: src/styles/design-tokens.css. Regenerate with node scripts/build-design-tokens.mjs. Button is the first shared migration: ref forwarding, primary/secondary/ghost/tertiary/danger variants, sm/md/lg sizing, optional icons, busy semantics, loadingLabel and status. All sizes have a 44px minimum. Native disabled prevents repeated activation. Button status icons supplement text; callers must use meaningful success/error labels and live feedback for asynchronous outcomes.

## Category coverage

| Category | Baseline static instances | Verification |
|---|---|---|
| A Buttons | 492 | Source inventory + selected findings; full runtime review outstanding |
| B Fields | 222 | Source inventory + selected findings; full runtime review outstanding |
| C Selects | 56 | Source inventory + selected findings; full runtime review outstanding |
| D Dates | 7 | Source inventory + selected findings; full runtime review outstanding |
| E Choices | See findings / cross-cutting | Source inventory + selected findings; full runtime review outstanding |
| F Range | 16 | Source inventory + selected findings; full runtime review outstanding |
| G Upload | 6 | Source inventory + selected findings; full runtime review outstanding |
| H Overlays | 47 | Source inventory + selected findings; full runtime review outstanding |
| I Collections | 43 | Source inventory + selected findings; full runtime review outstanding |
| J Navigation | 32 | Source inventory + selected findings; full runtime review outstanding |
| K Feedback | 54 | Source inventory + selected findings; full runtime review outstanding |
| L Errors | See findings / cross-cutting | Source inventory + selected findings; full runtime review outstanding |
| M Typography | See findings / cross-cutting | Source inventory + selected findings; full runtime review outstanding |
| N Layout | See findings / cross-cutting | Source inventory + selected findings; full runtime review outstanding |
| O Color | See findings / cross-cutting | Login: axe before/after |
| P Motion | See findings / cross-cutting | Source inventory + selected findings; full runtime review outstanding |
| Q Accessibility | See findings / cross-cutting | Source inventory + selected findings; full runtime review outstanding |

## Before → after

Screenshots: login-before-dark-390.png, login-after-dark-390.png and matching light/1440 variants in this directory. This is the actual login page with API authentication responses mocked to 401, not a live-account test. The privacy banner remains in the screenshots. Date control: [DD] [MM] [YYYY] + custom 28px calendar → [labelled native date input, 44px minimum]. Confirmation: initial focus on destructive Confirm → initial focus on Cancel, keyboard trap and return focus. File flow: random Uploading percentage → pending Save file record followed by real persistence outcome.

## Accessibility evidence

axe-login-before.json and axe-login-after.json contain raw results. Baseline: color-contrast rule failed at 390 and 1440 widths, in light and dark. After: zero violations in those four login states. This is **not a 100/100 accessibility score**: incomplete axe checks remain for human review. Authenticated modules, open native date picker UI, screen readers, zoom, forced-colors and touch devices need separate runtime checks. Lighthouse was not run; no Lighthouse scores are invented.

## UX score (reviewer estimate, not a measured product benchmark)

These provisional 0–100 scores cover the inspected slice only. Rubric: semantics 25, state clarity 25, visual consistency 25, input/recovery ergonomics 25. Uninspected categories are unscored rather than assigned fictitious values.

| Category | Before | After | Basis |
|---|---:|---:|---|
| Shared buttons | 55 | 80 | Target, contrast, ref/loading/status contract |
| Shared fields | 55 | 80 | Linked descriptions and semantic state colors |
| Shared selects | 60 | 80 | Native keyboard behavior retained; error descriptions fixed |
| Birthday picker | 35 | 80 | Native date semantics and constraints |
| Reviewed errors | 35 | 75 | Actionable curated copy; remaining screen copy outstanding |
| Shared dialogs | 40 | 75 | Focus and nesting regressions tested; inert background not verified |
| Login visual hierarchy | 55 | 85 | Both themes tested; real heading and mobile overlap correction |
| Toast feedback | 50 | 70 | Priority and persistence corrected; pause-on-hover not implemented |
| Upload/file-record flow | 20 | 60 | Honest metadata behavior, persistence retry; real upload absent |
| Navigation, tables, choices, general layout, motion, full a11y | — | — | Insufficient complete runtime evidence |

## Migration and rollback

1. Land tokens + generated CSS + shared Button/fields together. Low behavioral risk; compare all palette choices because shared controls use a fixed accessible action blue.
2. Land native birthday control + profile label associations. Medium risk: custom month/year browsing is deliberately replaced by native browser UI. Date-only strings remain unchanged; no database migration.
3. Land dialog hook + Modal + ConfirmDialog together. Medium risk: nested overlays outside this hook may still handle Escape independently. Test each destructive flow before release.
4. Land API error mapping + login + tab errors. Medium risk: backend field-specific text is now replaced by generic validation guidance; stable field error codes should be the next migration.
5. Land task/calendar/document label changes and file-record state correction. Document flow explicitly remains metadata-only; provider linking still needs real integration.
6. Migrate remaining screens using the inventory and run axe plus keyboard tests for loading/empty/error/offline/success states at 390, 768 and 1440 widths.

Rollback only the reviewed file patches in reverse dependency order against the captured baseline. Do not reset the repository or touch local data. Preserve unrelated working edits. Git history access failed with permission denied reading tree f8bca1461413526af8a172044b969153f0dc08c6; patches compare captured working files, not HEAD, and are not verified as merge-ready against a remote branch. New files are documented in COMPONENTS.md. No PR or release was created.

## Fixed checklist

- [x] Buttons: Small variant below the requested 44px target.
- [x] Buttons: White labels on the accent fail contrast in the baseline login scan (3.64:1).
- [x] Buttons: No forwarded ref, task-specific loading label, or success/error indicator.
- [x] Inputs: Caller descriptions can replace validation associations; aria-invalid can be overridden.
- [x] Inputs: Repeated profile Field labels are disconnected from their controls.
- [x] Inputs: Task title, description, priority, category, date and parent labels are disconnected.
- [x] Dropdowns: Validation descriptions can be overwritten; invalid select has no dedicated border state.
- [x] DatePicker: Scrolling can create invalid month/day combinations; custom grid has 28px targets and no full keyboard model.
- [x] DatePicker: Date of birth has no upper bound or autofill hint.
- [x] DatePicker: Inline edit title/date/recurrence have no labels.
- [x] Errors: API errors expose arbitrary backend text or numeric request failure.
- [x] Errors: Timeout has no next step; native network errors reach UI; cancellation and timeout conflated.
- [x] Errors: Render errors expose technical details in the normal UI.
- [x] Errors: Generic fallback plus arbitrary error.message.
- [x] Toggles: No way to inspect a mistyped password.
- [x] Sliders: Repeated RangeField controls have disconnected labels.
- [x] Upload: Progress is simulated; modal closes without awaiting persistence; bytes are never uploaded.
- [x] Upload: Blocking alert provides no inline retry context.
- [x] Upload: Dropzone is pointer-only.
- [x] Modals: Fixed title ID collides when dialogs coexist.
- [x] Modals: Nested dialogs each handle Escape and can release another dialog’s scroll lock.
- [x] Modals: Destructive confirm receives initial focus; no focus trap.
- [x] Modals: Settings dialog lacks shared keyboard focus management.
- [x] Tables / search: Search and clear control lack accessible names.
- [x] Feedback: All messages interrupt readers and errors/action messages disappear on a timer.
- [x] Feedback: Loading skeleton has no status name.
- [x] Layout: Fixed banner covers the mobile sign-in CTA in visual review.
- [x] Typography / color: Private owner access text measures 3.8:1 in baseline scan; weak page hierarchy.
- [x] Themes: Token file is dark-only and unused by CSS.
- [x] Motion: New fields need reduced-motion and forced-colors coverage.
- [x] Navigation / offline: Workspace has global loading/error wrappers but no prominent offline recovery in main content.

## Outstanding checklist

- [ ] Exercise all 1148 after-inventory instances and all runtime states individually.
- [ ] Classify and rewrite every frontend/server error, empty and loading message; COPY.md retains all captured candidates with explicit status.
- [ ] Migrate all native/bespoke buttons, fields, selects, tables, cards, tabs and tooltips to the shared contract.
- [ ] Verify all palettes, contrasts, chart legends, reduced-motion animations and high-contrast mode.
- [ ] Verify date ranges, timezones, recurrence, upload cancellation and real provider authorization end to end.
- [ ] Test authenticated screens with representative data, keyboard-only navigation, screen readers and Lighthouse.
- [ ] Add per-screen empty/error/offline recovery beyond the existing global wrappers.
- [ ] Complete reusable Table, Card, Tabs, Nav and Tooltip documentation and behavior tests.
