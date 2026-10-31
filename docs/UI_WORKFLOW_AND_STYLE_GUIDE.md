# GrowthTrack: complete UI workflow and style guide

Source snapshot: 31 October 2026. Design tokens: **5.0.0**, with 4.2 illustration aliases retained. Current production-source presentation: **kinetic-workspace-v4**, enabled by `data-ui-style="kinetic"`. **Playful** remains selectable in Profile & Settings → Display.

This is the central explanation of the current Ultimate UI: the visitor journey, landing, login, home, navigation, registered modules and views, controls, typography, palettes, layout, animation and verification limits. It describes checked-in/local source, not a deployed release or a completed visual review.

For individual buttons, links, fields, form submissions, tab groups, font declarations, colour literals and CSS keyframe names, use the generated [UI control inventory](UI_CONTROL_INVENTORY.md). Each action includes its source location and handler or destination expression. Dynamic record buttons cannot have one fixed runtime count; that inventory links their rendering code rather than inventing a count of visible buttons.

Scope: **Ultimate's current UI**, including its native Family/NiftyLens/Forex pages and customer-admin surfaces. Separate FinSync/OxFin customer apps and retained standalone companion UIs have independent screens; this guide does not claim to audit their complete interfaces. See section 22 for those boundaries.

Reading order: sections 3–8 explain the user journey; 9–15 explain controls and appearance; 19 lists every registered module/view; 20 explains each module's workflow; 21 covers the nested 3D workspace; 23 gives a practical walkthrough. A **module** is a page/destination; a **view** is a module-owned panel; a **filter** changes the records shown. They are not interchangeable counts.

## 1. Existing documentation and what this file adds

Earlier documents cover separate changes:

- [Kinetic UI implementation and acceptance evidence](plans/2026-10-30-kinetic-ui.md): the current theme, Glow Crew, adaptive motion, Settings/Overview refinement, budgets and verification limits. The supplied [Kinetic UI 5 proposal](<GrowthTrack Kinetic UI 5.md>) remains the design brief.
- [Motion refinement](plans/2026-10-31-motion-refinement.md): sequenced hero artwork, distinct crew gestures, layered route entrances, directional panel changes, surface lighting and cancellation checks.
- [Insights page effects](plans/2026-10-31-insights-motion.md): distinct signatures and choreography across the eight Insights pages, including late-loaded panels, observed/projected chart identity and export settling.
- [Finance, Wellness, Workspace and companion](plans/2026-10-31-finance-wellness-workspace.md): real-record overview refinements, shared area motion, Finance/Hub navigation names and device-local floating-agent controls. The [personal artwork notes](design/2026-10-31-personal-companion.md) describe the photo-inspired welcome and companion assets.
- [Playful landing and overview flow](plans/2026-10-30-playful-motion.md): characters, landing playground and initial overview animation.
- [Character workspace](plans/2026-10-30-character-workspace.md): animated logo, login, shared theme and every authenticated module's character treatment.
- [Sign-out, sub-tabs and login refinement](plans/2026-10-30-ultra-ui.md): sign-out decisions, moving tab indicators, contextual navigation and richer controls.
- [Architecture/review handoff](UI_ARCHITECTURE_HANDOFF.md): ownership, isolated preview, review scope and acceptance work.

Those remain implementation records. This guide combines the current experience and adds the full registered route/view inventory, exact shared palette values, font-loading details, animation timings, button families and source references.

## 2. Visual concept and assets

The direction is a warm, bright, illustrated desktop workspace: cream paper, dark green ink, coral, mint, yellow and lilac. Rounded cards, thin outlines, small offset shadows, dashed rules, tilted stickers and expressive flat characters carry the identity. Work records and tables remain readable, ordinary application content.

The characters are original layered SVG artwork:

| Character | Appearance | Meaning |
| --- | --- | --- |
| Blip | Coral comet/fox spark with a yellow tail | Focus and the next useful action. |
| Mochi | Mint rounded blob with small arms | Calm progress, success and empty states. |
| Ziggy | Yellow lightning sprite | Quick actions, warnings and streaks. |
| Nova | Lilac four-point star | Curiosity, information and loading. |

The four characters are a shared SVG `<symbol>` sheet reused by `<use>`, with at most 20 paths and five groups per sprite. Legacy references resolve as **Siren → Blip**, **Snip → Mochi**, **Sunny → Ziggy**. Selecting Playful restores the original bell/scissors/sun artwork. The logo remains the original sun/sprout mark.

The shared logo is an original smiling sun/sprout SVG: mint backing, yellow petals, coral centre, dark ink face and mint leaf. It appears on the landing, login, legal headers, sidebar and narrow-screen header. SVG layers allow eyes, arms, blades and logo petals to animate separately. These are not raster images, a video, a Lottie file or a replacement for the technical Physique model.

The implementation uses React, custom CSS, semantic design tokens, original SVG, Lucide icons, Framer Motion, scoped GSAP and browser animation APIs. Existing domain chart/map/3D libraries retain their own jobs.

| Technology | What it contributes to the UI |
| --- | --- |
| React / React DOM | Components, form state, conditional panels, lazy page loading and suspense fallbacks. Vite builds/serves the frontend. |
| React Router | Public/protected destinations, module links, query-selected views, legacy redirects and safe post-login return. |
| Custom CSS and generated tokens | Typography, palette variables, component/shell rules, responsive layouts, interaction states and CSS keyframes. The shared presentation is not a newly installed commercial template. |
| `@fontsource-variable/inter` | Source of the single self-hosted Inter Variable Latin WOFF2; normal weights 100–900 share one preloaded file. |
| `lucide-react` | Stroke icons for navigation, actions, status, password visibility and other controls. Decorative SVG characters/logo are authored separately. |
| Framer Motion | LazyMotion, measured tab movement, shared selection highlights, dialogs, toasts and numeric interpolation. The layout feature bundle loads when motion is first needed. |
| GSAP | Dynamic imports confined to landing/login hero choreography and the landing magnetic-button wrapper. The hero uses a scoped timeline; decorative parallax uses a bounded browser frame callback. Scoped effects are reverted on pause, viewport exit or unmount. |
| Browser animation APIs | CSS transitions/keyframes, Web Animations API page entrances, requestAnimationFrame scroll updates and viewport/visibility observation. |
| Recharts | Existing finance, wellness and analytical charts. Their chart series, legends and tooltips remain owned by the relevant domain; some native charts/art use custom SVG instead. |
| Three.js / React Three Fiber / Drei / postprocessing | Technical Physique/model rendering, camera, lighting and model effects. These do not render the flat landing characters. |
| Leaflet | The optional Places map canvas; its tile-service choice is a separate user action. |
| Zustand / TanStack Query | Existing account/preferences/application state and remote query/mutation states that determine what the UI displays. They do not replace authentication or product permissions. |

Package declarations are in [package.json](../growthtrack-ultimate/package.json); source imports establish which package is used on a particular surface. A package merely present in that manifest is not evidence that every page uses it.

## 3. Whole journey

```text
Anonymous app root
  -> /welcome: fictional landing
  -> /login: configured owner sign-in
  -> protected destination, or login's current default
  -> shared workspace shell
  -> product area
  -> module shortcut / sidebar module
  -> module-owned view, form, record, chart or settings
  -> sign-out dialog
  -> keep or remove local drafts
  -> acknowledged sign-out and optional local cleanup
  -> login with the actual completion outcome
```

Router paths in this guide are relative to Ultimate. The usual local browser prefix is `/Ultimate/`, for example `http://127.0.0.1:5000/Ultimate/welcome`.

Current entry rules have a small distinction:

- An anonymous `/` opens `/welcome`.
- An authenticated `/` or `/login` opens `/insights/overview`.
- An anonymous protected URL opens login and retains its pathname, query and fragment for safe return.
- Successful login returns to that retained destination. With no retained destination, `safeReturnDestination` currently falls back to `/finance/overview`.
- Public `/welcome`, `/privacy` and `/terms` are available without a session.

Consequently, the signed-in root and a bare successful login do not currently have identical default destinations. This documents the existing routing; it does not silently change it.

## 4. Landing page, from top to bottom

1. **Skip link:** keyboard users can jump to the main hero.
2. **Header:** animated logo/wordmark, fictional-world label, Meet the crew, The little demo and Owner sign in.
3. **Hero:** “Less noise. More you.” in large Inter, coral underline artwork, explanatory copy, a primary demo anchor and a secondary crew anchor.
4. **Snip scene:** paper plan, four Glow Crew characters, doodles, orbit/blob shapes and three fictional distraction notes. Snip the noise hides the notes/thread, changes expressions, reveals a positive label and requests a bounded canvas celebration. Play it again resets the scene. A live caption announces the outcome. The Playful fallback keeps the original three characters and six CSS confetti pieces.
5. **Motion control:** Pause motion / Play motion; reduced-motion preference takes priority.
6. **Mint ribbon:** short focus/space/progress phrases separated by decorative sparks.
7. **Crew:** coral, mint, yellow and lilac cards introduce Blip, Mochi, Ziggy and Nova.
8. **Tiny-day playground:** Focus, Wellness and Life modes each have three fictional tasks. Checkboxes update the current mode's small-win count; switching modes keeps that mode's checks; reset clears only the current mode. Leaving the page discards the examples.
9. **How it works:** find a small next thing, snip away the extra, acknowledge the win.
10. **Closing panel:** lilac sign-in invitation with the configured-owner restriction.
11. **Footer:** logo, fictional-story credit, Privacy and Terms.
12. **Privacy-choice banner when needed:** Keep private or Allow analytics. Optional analytics remain off until allowed. The banner reserves space rather than intentionally covering the page footer.

The hero and playground use component memory. Their illustrated changes do not create accounts, submit tasks, write owner records or connect demo fixtures to the real application.

## 5. Login page, from top to bottom

The desktop layout has an illustrated story on the left and a sign-in card on the right. Narrow layouts reorganise this into a compact story above the form.

- Header: animated logo/wordmark and Back to the little world.
- Story: “Good to have you back,” a coral underline, a framed crew illustration, paper/sticker details and the captions A little focus / Room to grow / More life.
- Character response: all four close their eyes while the password input or its reveal button has focus. This depends on field identity, not the password value. Playful has the original three-character version.
- Live greeting: a normal welcome, a password-focus message, a sign-in loading message, a recoverable error message or a finishing-sign-out message.
- Motion button: the same session-wide decorative-motion control.
- Form card: private-space lock stamp, heading, configured-owner explanation and account-section divider.
- Email: labelled required input, leading mail icon and username autocomplete.
- Password: labelled required input, leading lock icon, current-password autocomplete and an embedded 44px eye button with Show password / Hide password names.
- Errors: announced text and invalid field styling; editing a field clears the previous sign-in error.
- Submit: pill-shaped Sign in; changes to Signing in… and disables duplicate submissions while pending.
- Footer note: contact the workspace manager for access. There is no public account-creation flow.
- Legal footer: Privacy and Terms.

Login uses the existing authentication provider. The new illustration does not replace password validation, sessions or permission checks. While acknowledged sign-out still has local cleanup pending, login shows Finishing sign-out… and blocks a new sign-in. Actual sign-out outcomes appear in a dismissible notice: local drafts left unchanged, local drafts removed, or cleanup failed after sign-out.

## 6. Signed-in shell, from top to bottom

### Utility header

The header is sticky and normally at least 64px high. It contains the area label, module/record search, keyboard shortcut hint, motion control, light/dark switch, offline indicator when applicable, notification button/unread badge and account/settings button. Search opens the command palette; Ctrl+K or Command+K is the advertised shortcut.

The command palette can navigate modules, find supported saved records and open quick-capture/actions. Search results and captures are real application workflows, not fictional landing tasks. The account button opens the existing Settings modal rather than a newly invented account menu.

### Navigation rail and narrow-screen navigation

- Desktop shell mode starts at 960px: a 224px rail is pinned on the inline-start side.
- Collapsed desktop rail: 64px, with a reachable reopen control.
- 640–959px: a modal navigation drawer is opened by the header trigger.
- Below 640px: a bottom quick-navigation dock provides the first four saved-order areas plus Hub; Hub provides searchable module access. The drawer trigger also remains an entry to full navigation.
- Saved area/module order is respected. Drawer and dialog focus are managed; Escape/backdrop close when the relevant operation permits it.

The generic token set also declares 640/1024px breakpoints; the navigation hook's actual pinned-rail threshold is 960px. Other pages use their own responsive cutoffs.

### Main content

1. Skip-to-content target and focusable main region.
2. Breadcrumb: Your space, area, current module.
3. Compact character moment for the current area.
4. Scrollable module-shortcut strip with real router links, selected-page styling and local overflow.
5. Offline or failed-initial-load recovery state when necessary.
6. Page-owned heading, status, toolbar and actions.
7. Page-owned view tabs, records, forms, cards, charts and details.
8. Toast feedback or dialogs only when an action produces them.

Content is capped at 1360px in the shared shell. The outer application avoids horizontal overflow; wide tables, tab strips and shortcut lists scroll locally.

Default chapter characters: Customers/Growth use Blip, Finance/Work use Mochi, Life/Insights/Hub use Ziggy. The home overview uses Blip; native NiftyLens uses Blip, Family uses Mochi and Forex uses Ziggy. Legacy names in their source are intentional aliases. These are decorative choices, not account-status indicators.

### First-run onboarding, check-in and utility settings

After the initial account records load, an incomplete onboarding preference opens the existing three-step wizard: name/biological-sex profile, starting age/height/weight, then primary goal. Next Step validates the current step; Back returns to it. Completion saves the profile before marking onboarding complete. A failed save leaves a recoverable error. This wizard is an authenticated setup surface, not public registration.

The optional daily check-in is a separate five-question dialog: sleep hours, energy, mood, optional morning weight and optional note. Back/Next move between questions; the final save has a pending state and error handling. Completion feedback is distinct from simply closing the dialog. Home and the relevant command surface expose the daily action when the current day's check-in is due; it does not automatically fabricate a daily record.

The header account button opens a utility Settings modal with **Profile, Referrals, Audit and System** sections. Profile links to the full Account, Privacy & security, Connections and Display settings. Audit shows recent account activity; System has service/network information and a Check network action. Reset onboarding is a separate action. The full `/hub/settings` page has its own five sections, listed in section 20.

Sources: [OnboardingWizard.jsx](../growthtrack-ultimate/src/components/OnboardingWizard.jsx), [DailyCheckIn.jsx](../growthtrack-ultimate/src/components/DailyCheckIn.jsx), [SettingsModal.jsx](../growthtrack-ultimate/src/components/SettingsModal.jsx).

## 7. Home / Insights overview

The canonical root home is `/insights/overview`, headed “Your day, in focus.” Its order is:

1. Page identity and formatted as-of date.
2. One large, honest due/overdue task count beside the next useful action; Blip accompanies the number. At narrow widths these cards stack.
3. Actual due/overdue task and checked-habit context.
4. Three quieter saved-record cards: open tasks, active goals and saved measurements.
5. Latest dated activity from completed tasks, measurement records and sleep entries.
6. Links to the owning modules: Action Center, Tasks, Habits, Goals, Training, Body model, Finance, Portfolio, Profile and Agents.

The next-action fallback order is due/overdue task, another pending task, an unchecked habit, an active goal, then an invitation to add a task. Missing records produce an honest empty message. The overview does not turn record counts into an invented health, confidence or growth score.

Finance, Growth, Work, Life and Hub have their own overviews. They share the visual language while their owning components determine the real facts and actions.

## 8. Areas, tabs and sub-tabs

The default area order is **Customers, Finance, Growth, Work, Life, Insights, Hub**. The complete registered module/view table is in section 19.

Three different controls are deliberately used:

| Control | Purpose | Behaviour |
| --- | --- | --- |
| Sidebar/module shortcut link | Open another module/page | Real URL and `aria-current`; supports the deployment base path. |
| Shared view tab | Switch a module-owned panel | `tablist`, `tab`, `aria-selected`, optional `aria-controls` and keyboard selection. |
| Filter/segmented control | Change a filter or local presentation | Button/input semantics appropriate to the actual filter. |

Shared tabs have rounded tracks, numbered decorative chips, cycling mint/lilac/coral/yellow accents, a measured sliding selection surface, bold selected labels and visible focus. Numbers do not become part of their screen-reader names. Resize observers keep the highlight aligned without replacing the focused button. The underline variant hides the numbered-chip/highlight surface and uses a conventional active rule.

Keyboard behaviour: horizontal Left/Right, vertical Up/Down, Home/End, skipped disabled tabs and inherited RTL direction. Automatic activation switches on arrow movement; manual activation moves focus and waits for normal button activation. A caller-supplied keyboard handler retains ownership.

### Source-confirmed examples and current gaps

| Surface | Actual current presentation |
| --- | --- |
| NiftyLens | Market watch (`charts`), Movers (`movers`), Data source (`connection`). Registered `indices`, `options` and `chain` do not have distinct native panels here; unsupported selection falls back to Market watch. |
| Family Connect | Family tree, People, Memories, Private vault, Timeline, Access; a Family account connection is required for its records and permissions. |
| Forex Studio | Models (`models`), Recent & future (`forecast`), Historical (`analytics`), Volatility (`volatility`). |
| Physique | Blueprint, measurements, targets, history and 3D workspace selection; the technical model retains its own detailed controls. |
| Customer administration | Directory, Activity and Support are route links; an unconfigured adapter remains a setup/unavailable state. |
| Finance | Overview, Transactions, Analytics, Trends, Budgeting, Subscriptions and Sync are separate owning-module routes, not one fabricated shared data panel. |
| Notifications | Current component switches Unread/All/Dismissed collections and uses an expandable preferences section. The registry's `preferences` view ID is not proof of a separate panel. |
| Settings | Profile & Settings has its module-owned sections; the utility Settings modal is a separate overlay. They must not be counted as the same tab set. |
| Insights home | Registered `today`, `priorities`, `summary` IDs currently share the Overview component; it does not render three separate tab panels. |
| Portfolio | The current component renders Holdings, Allocation and Performance; the registry instead names `holdings`, `allocation`, `history`. The Performance panel currently explains unavailable historical valuations. |
| Projects and Tasks | Projects uses Repositories / My Projects and grid/list controls; Tasks uses Pending / Completed, All/Overdue/Today/priority/category filters, and list/matrix controls. Their local control IDs are not identical to every registered design-view ID. |

A registered view is an addressable design/routing contract. It is not automatically a fully implemented, separately rendered workflow. This guide lists the IDs comprehensively and identifies representative confirmed gaps instead of claiming full parity from the registry count.

## 9. Buttons and control styling

Shared `Button` variants are primary, secondary, ghost, tertiary and danger/destructive. Shared sizes are small, medium, large and icon. Source sites using these controls and native buttons are listed in the [control inventory](UI_CONTROL_INVENTORY.md).

| Family | Appearance and function |
| --- | --- |
| Primary action | Solid selected accent, readable contrast colour, rounded/pill shape, restrained paper-like offset shadow. |
| Secondary action | Surface fill, outline and normal text; used for cancel, retry and supporting actions. |
| Ghost/tertiary | Transparent/quiet action with a clear focus outline. |
| Danger/destructive | Semantic danger colour; explicit action wording for a destructive choice. |
| Icon control | Recognisable icon plus an accessible name; theme, notifications, close, reveal and motion are examples. |
| Loading button | Spinner and pending label; prevents duplicate submission. |
| Success/error button state | Appropriate check/alert symbol and explicit message; meaning is not just colour. |
| Navigation link | Canonical URL, active-page marker and keyboard focus. |
| View tab | Numbered accent chip and active panel selection. |
| Checkbox | Visible custom/native control, focus ring and checked state; fictional demo checkmarks get a brief pop. |
| Radio choice card | Clickable card, actual radio input, visible selected ring and descriptive text. |
| Table/filter actions | Search, clear, sort, page size, previous/next, filter, open detail and domain-specific create/edit/save/cancel/export actions. |
| Dialog actions | Explicit confirmation/cancel choices, focus trapping, pending-state blocking and announced errors. |

Key public controls are Snip the noise / Play it again; three tiny-day mode buttons; three task checkboxes per mode; Reset this day; Try the tiny demo; Meet the crew; Owner sign in; Privacy; Terms; Keep private / Allow analytics; Show/Hide password; Sign in; and motion controls.

Key global controls are search/command palette, area/module navigation, sidebar collapse/reopen, drawer open/close, Hub/module search, floating-companion paw toggle, theme, notifications, account/settings and Sign out. Domain controls remain owned by the corresponding page; a mapped record button can have different labels and instances for each record. The generated inventory exposes these source expressions and handlers' locations.

The optional floating Sidekick uses an original personal illustration with four local poses. Its paw button and Profile & Settings → Display → Floating companion switch save visibility on this device. The tray opens the existing Agents and Action Center owners; displaying it or choosing a pose does not query a model or inspect records. The welcome page uses the same illustration in a layered CSS3D paper scene, while login keeps the nonpersonal crew artwork. See the [artwork, research and prompt](design/2026-10-31-personal-companion.md).

Standard target tokens are 44px, large 52px and icon 44px. Login inputs are 56px, the login primary action 54px, and its eye button 44px. Some retained utility/header/navigation rules explicitly use 36–40px geometry; this is not a claim that every legacy target already passes a rendered 44px audit.

### Forms, tables, menus and other controls

Forms use labelled inputs, textareas, selects, date/time controls, checkboxes, toggles and page-owned validation. Shared fields connect descriptions/errors to their input; pending mutations disable the relevant submit controls. A source declaration of a field does not establish that every old page has identical validation or form layout.

Tables combine a caption/heading, column labels, aligned numbers and row actions. Search/filter/sort controls change the local or server query; page size and Previous/Next bound the displayed rows where implemented. A row's Preview/Open action can reveal a detail pane, drawer or dialog. Selection, editing, upload/download, CSV/ICS transfer and deletion remain domain-specific actions. Wide tables scroll inside their own container.

Navigation links keep real destinations; external links retain their own service boundaries. Collapsible help/preferences sections use their own expanded state. The companion inventory lists the link destination, change-handler and submit-handler expressions so these less visible controls are covered alongside ordinary buttons.

## 10. Dialogs, sign-out and feedback

The quick Settings dialog uses a 208px section rail and a rounded, outlined account panel. Profile, Referrals, Audit and System keep their existing actions. Profile presents the real identity, four coloured icon cards for Account details / Privacy & security / Connections / Display preferences, then actual billing availability. Nova is decorative. Its spring entrance respects reduced motion; the close button, Escape handling, focus trap and return to the trigger remain available. Narrow widths use a horizontal section strip and stacked cards. Full Profile & Settings → Display includes Kinetic/Playful and Lite motion alongside the existing preferences.

### Shared dialog

The standard modal is up to 600px wide, with a rounded surface, outlined edge, structured header/body/actions, close button and muted dark backdrop with a 5px blur. It has a dialog role, title association, optional description, focus trapping, body scroll locking and trigger-focus restoration. Narrow screens adapt it toward a bottom sheet with local content scrolling. A pending operation can disable close, Escape and backdrop dismissal.

### Sign-out sequence

1. Sign out in navigation inspects the current owner's local drafts.
2. The dialog opens with Sunny, a count/availability description and Keep selected.
3. If drafts exist and inspection succeeded, choose Keep my drafts or Remove local drafts. Remove explicitly says unfinished local entries are permanently discarded.
4. Stay signed in cancels and returns focus to the trigger.
5. Sign out, or Sign out & remove drafts, starts one guarded operation.
6. Controls and dismissal are disabled while pending.
7. If the server does not acknowledge sign-out, keep the dialog/account/drafts and provide retry feedback.
8. After acknowledgement, optionally remove only the captured owner's drafts. Saved server records are not deleted by this option.
9. Login remains disabled until pending local cleanup finishes.
10. Show the actual kept/removed/cleanup-failed outcome and retain the safe previous destination for a later sign-in.

The keep choice resets on reopening. An unavailable draft inspection or zero drafts does not expose a usable remove choice. Saved authentication, service identities and server record ownership are unchanged by this presentation.

### Toasts and states

Toasts are solid readable cards with semantic icons, optional action, dismiss control and pastel stamps: mint success, coral error, yellow warning and lilac information. Errors use `alert`; other feedback uses `status`. The dispatcher retains deduplication and action handling. Default generic confirmation timing is 3.5s, default errors 5s, `crud` confirmations 3s and explicit persistent notifications 0 timeout. Custom callers can supply other durations.

Loading uses skeleton structures and a character companion. Empty, error, offline, unauthorized, denied, unavailable, database-failure, setup and success remain separate states with their own explanation/recovery actions. Artwork does not turn missing provider data or failed saves into a successful result.

## 11. Fonts and typography

**Primary UI and display font: Inter Variable.** [fonts.css](../growthtrack-ultimate/src/styles/fonts.css) loads one self-hosted **Latin WOFF2, normal weights 100–900**, with `font-display: swap`. [index.html](../growthtrack-ultimate/index.html) preloads it. The source font is about 48.3KB; there is no font CDN request. The shared stack starts `Inter, Inter fallback, system-ui`; a local Arial fallback uses `size-adjust: 107%` with ascent/descent overrides. The wordmark is text plus the original SVG mark, not an additional logo font.

Intermediate weights such as 550, 590, 650, 680, 750 and 800 are covered by the variable face. Small italic sticker captions do not establish a separately bundled handwriting/italic font.

| Role | Current shared/example value |
| --- | --- |
| Canonical caption / label / body | 12 / 14 / 14px tokens. |
| Kinetic page title | 32–40px, weight 700, roughly 1.12 line height. |
| Canonical display token | 34px; page-specific hero styles override it. |
| Landing hero | `clamp(64px, 8.1vw, 120px)`, weight 800, -0.075em tracking; narrow rules use 56–78px. |
| Headline number | 72–120px on the overview, weight 800, tabular numerals, -0.04em tracking. Shared secondary stats are 32–56px; individual data pages retain their meaningful metric labels. |
| Landing section heading | 34–58px range, 650 requested weight, 1.1 line height. |
| Login story heading | 44–68px main range, 700 requested weight; narrow rules reduce it. |
| Login card heading | 28–38px range, 650 requested weight. |
| Body rhythm | 1.5714 token ratio / 22px shared leading, 20px compact; longer public copy often 1.7–1.8. |
| Small decorative captions | Often 7–11px with letter spacing; not replacements for form labels or action names. |
| Financial/statistical numbers | Tabular numerals through `font-variant-numeric: tabular-nums` and `tnum`. |
| Technical/code utilities | Monospace/system fallbacks remain in some domain and legacy controls. |

Shared headings use tight negative tracking, ordinary copy uses comfortable line height, and numeric tables align figures. The source inventory separately lists every reachable explicit font-family declaration, including legacy aliases. It is not accurate to call every remaining legacy declaration a newly used brand font.

The inventory also records CSS `font:` shorthand declarations, which combine size/weight/line-height/family in one rule. A `var(...)` reference, `inherit`, or a requested weight is not another installed font. Follow [main.jsx](../growthtrack-ultimate/src/main.jsx) for the actual bundled faces, rather than treating older design documents as the current font-loading manifest.

## 12. All shared palette options

### Current Kinetic palette

| Role | Value |
| --- | --- |
| Ink / paper | `#10231C` / `#FFF8E7` |
| Coral / coral copy | `#FF5A3C` / `#B3341F` |
| Mint / yellow / lilac | `#2EE6A8` / `#FFD23F` / `#A78BFA` |
| Electric blue art / accessible light link / focus | `#3B82F6` / `#1D4ED8` / `#2563EB` |
| Danger / success copy / warning copy | `#C0261B` / `#0F6B42` / `#7A4A00` |

Coral action fills use **ink text**. Small coral-toned text uses the darker companion shade. The proposal's white text on `#3B82F6` does not meet 4.5:1 for ordinary text; the implemented link/focus roles use darker blue. Semantic contrast tests cover canonical light/dark/AMOLED text, input borders and action pairings.

| Role | Light | Dark | AMOLED |
| --- | --- | --- | --- |
| Canvas | `#FFF8E7` | `#111D18` | `#000000` |
| Surface / raised | `#FFFDF6` / `#F3ECD9` | `#1A2C23` / `#273C30` | `#0A120D` / `#17261B` |
| Sunken | `#EFE8D5` | `#0D1712` | `#030604` |
| Text / muted / subtle | `#10231C` / `#46594C` / `#536452` | `#FFF8E7` / `#C9D4BE` / `#B3C5AA` | Same as Dark |
| Border / strong / input | `#C9CFBA` / `#82917A` / `#71836A` | `#425B48` / `#8FA383` / `#91A786` | Same as Dark |
| Sidebar / active | `#E4EAD6` / `#D1DDC1` | `#0B1510` / `#304A32` | `#000000` / `#243C27` |
| Danger / success / warning / info | `#C0261B` / `#0F6B42` / `#7A4A00` / `#6140A4` | `#FF9B89` / `#55F0BE` / `#FFE066` / `#C4B5FD` | Same as Dark |
| Link / focus | `#1D4ED8` / `#2563EB` | `#93C5FD` / `#93C5FD` | Same as Dark |

The public landing keeps its bright local art palette. Saved accent choices and BCL/GBB remain effective; changing the default does not overwrite an owner's saved theme.

### Retained 4.2 Playful character palette

| Role | Hex |
| --- | --- |
| Ink | `#233D36` |
| Paper | `#FFFBED` |
| Coral / Siren | `#FF806B` |
| Mint / Snip | `#85D9B8` |
| Yellow / Sunny | `#F9CE5B` |
| Lilac | `#C7B3E8` |

Bright fills use dark ink. Text may use a darker companion shade: for example the landing's coral text is `#B54835`, rather than putting pale coral body text on cream. The landing defines its own public-page colours; SVG characters/logo keep their authored colours when the surrounding workspace changes theme.

### Retained Playful workspace appearances

| Role | Light | Dark | AMOLED |
| --- | --- | --- | --- |
| Canvas | `#FFFBED` | `#17221E` | `#000000` |
| Surface | `#FFFDF7` | `#202E27` | `#0C120E` |
| Raised | `#F1F0E4` | `#2B3A30` | `#1C291F` |
| Sunken | `#F3F0E5` | `#15211B` | `#050805` |
| Text | `#233D36` | `#F8F4E5` | `#F8F4E5` |
| Muted | `#53665B` | `#C0CBB9` | `#C0CBB9` |
| Subtle | `#607165` | `#A6BAA5` | `#A6BAA5` |
| Border | `#D6DCC9` | `#405043` | `#405043` |
| Strong border | `#A7B49C` | `#64765F` | `#64765F` |
| Input border | `#83937C` | `#85957A` | `#85957A` |
| Sidebar | `#E3EED9` | `#111D16` | `#000000` |
| Sidebar text | `#233D36` | `#F8F4E5` | `#F8F4E5` |
| Sidebar muted | `#53665B` | `#B2C7A8` | `#B2C7A8` |
| Sidebar active | `#CADFBD` | `#33482D` | `#263C23` |
| Sidebar active text | `#233D36` | `#D0EDB7` | `#D0EDB7` |

### Base semantic colours retained by those appearances

| Role | Light | Dark | AMOLED |
| --- | --- | --- | --- |
| Danger | `#C0392B` | `#E06A5E` | `#F6A4A4` |
| Success | `#187547` | `#5BC18B` | `#91E2B1` |
| Warning | `#8C5B24` | `#D9A441` | `#F2CE8E` |
| Information | `#2B6CB0` | `#80B5E3` | `#A2D7F5` |
| Focus | `#1C8055` | `#3BA876` | `#C9EAFA` |

### Seven accent palettes

| Palette | Light action | Dark/AMOLED action |
| --- | --- | --- |
| Coral (new default) | `#FF5A3C`, ink text | `#FF7A5C`, ink text |
| Forest | `#1C8055` | `#3BA876` |
| Gold | `#79500C` | `#F0CA80` |
| Ocean | `#165C84` | `#8DCFF0` |
| Mint | `#19694E` | `#85DDB6` |
| Violet | `#5B4798` | `#C4B6FC` |
| Rose | `#963E57` | `#F5AABE` |

The original six accent rules retain white text on light-mode actions and `#111815` text on dark-mode actions. Coral explicitly uses ink text in every mode. These are selectable accents, distinct from the constant character colours.

Chart series, category badges, weather panels, avatars and technical model materials also contain domain-specific colours. Those literals and alpha overlays are listed in the companion inventory; they are not extra theme-picker options. Values derived from variables, records or third-party rendering are not a finite set of precomputed browser colours.

### Named full colour themes

BCL is a dark midnight/cobalt/lime theme. GBB is a light sage/cream/burgundy theme. Selecting one overrides the broader workspace palette and selects its associated mode; these are more than a button-colour change.

| Role | BCL | GBB |
| --- | --- | --- |
| Main swatches | `#080B12`, `#2E5BFF`, `#CAFF12` | `#DDE2D8`, `#F3EBDD`, `#70243E` |
| Canvas | `#080B12` | `#F3EBDD` |
| Surface | `#101621` | `#FFF9EF` |
| Raised | `#182131` | `#DDE2D8` |
| Sunken | `#0B101A` | `#E8E3D8` |
| Text | `#F1F5FF` | `#29272B` |
| Muted | `#B0BDCF` | `#625F5F` |
| Subtle | `#94A7C1` | `#655E61` |
| Border | `#28354A` | `#D7CFC3` |
| Strong border | `#435674` | `#B0A79D` |
| Input border | `#627A9B` | `#8B7C7E` |
| Danger | `#FF8C9C` | `#9E3646` |
| Success | `#78D59D` | `#356347` |
| Warning | `#F5C77D` | `#86591E` |
| Information | `#8AB4FF` | `#2C5D76` |
| Focus | `#CAFF12` | `#70243E` |
| Sidebar | `#05070C` | `#3E1F2E` |
| Sidebar text | `#E6EDFF` | `#FFF4E8` |
| Sidebar muted | `#A6B6CF` | `#D1C4BE` |
| Sidebar active | `#192C54` | `#61263E` |
| Sidebar active text | `#CAFF12` | `#FFF4E8` |
| Brand | `#2E5BFF` | `#70243E` |
| On brand | `#FFFFFF` | `#FFF9EF` |
| Action | `#5A83FF` | `#70243E` |
| On action | `#080B12` | `#FFF9EF` |
| Highlight | `#CAFF12` | `#70243E` |

CSS token order is base appearance, Ultimate illustration treatment, accent palette and then a selected full named theme. Comfortable/compact density and motion preference are separate settings. The public landing's local colour overrides keep its fictional presentation bright.

## 13. Spacing, shape, depth and layout

- Spacing tokens: **4, 8, 12, 16, 24, 32, 40, 48, 64px**.
- Base corner tokens: 4/8/12/16/20px and a 999px pill.
- Illustrated corner tokens: **6/10/16/20/24px** and a 999px pill.
- Components also have deliberate local values: about 12px tab buttons, 17–18px tab/shortcut/toast tracks, 23–24px illustration/login frames and 26px dialogs.
- Borders are normally 1px; some form/dialog/card edges use 1.5–2px.
- Base fallback shadows include `0 1px 2px rgb(15 33 25 / .06)` and floating `0 24px 64px rgb(15 33 25 / .24)`. Kinetic uses hard 2px control / 4px card offsets and flat surfaces.
- Current Kinetic buttons/tabs use small 2–3px offsets; login, quick Settings and cards use 4px depth. Historical Playful examples include a 7px login offset. These are local component choices.
- Kinetic caps landing and shared content at **1440px**, uses 64–80px desktop padding, and reduces padding at smaller breakpoints. Login retains its own balanced two-column wrap.
- Light mode uses warm flat surfaces. Dark/AMOLED and named themes keep readable surfaces and statuses. There is no single large animated background covering every record page.
- Layer tokens are base 0, sticky 20, popover 80, modal 100 and toast 120. Some retained overlays use their existing named constants, so this is the shared contract rather than a claim that all historical layers were removed.

CSS is layered in the order `tokens`, `legacy`, `components`, responsive foundation and `shell`. [app-styles.css](../growthtrack-ultimate/src/styles/app-styles.css) imports generated design tokens, retained page styles, shared components and the shell; public and domain pages also import local styles. [tokens.ts](../growthtrack-ultimate/src/design/tokens.ts) is the canonical shared value source, and [build-design-tokens.mjs](../growthtrack-ultimate/scripts/build-design-tokens.mjs) generates CSS. Consequently, an older hardcoded colour or font declaration in a reachable file is not necessarily its final rendered value.

## 14. Animation catalogue

The current Kinetic owners and timings are below. Only transform/opacity repeat. Functional status text, focus and record state remain available when motion is stopped.

| Surface | Owner / effect / timing |
| --- | --- |
| Module navigation | `PageTransition.tsx` / `useSectionReveal.ts`: stable wrapper, no outgoing-page wait or whole-page shrink. At most eight section targets, 40ms stagger, 320ms entries; Tier 2 opens the first section over 420ms and settles individual metric cards. First paint is untouched; pause/tier changes cancel pending entries without replay. |
| Insights page choreography | `domains/insights/useInsightsMotion.ts`: owns all eight Insights features, including nested lazy content and query arrivals. Eight visible targets per burst, 320–440ms card entries, 520ms signature assembly and 620ms observed-line drawing. Dashed model/projection paths keep their identity. React StrictMode's rehearsal mount cannot consume the surviving entrance. |
| Sidebar, dock and Settings selection | `SelectionHighlight.tsx`: shared layoutId and position projection; spring stiffness 460, damping 32, mass .65. Instant for Lite/reduced motion. |
| Tabs | `Tabs.jsx`: explicit animated x/y/width/height targets measured from the selected button, same selection spring. Existing keyboard, RTL, focus and disabled-tab semantics stay with the button. |
| Dialog / quick Settings | `Modal.jsx`, `SettingsModal.jsx`: spring stiffness 420, damping 34, mass .85; 20px rise, scale .985 to 1 and 160ms opacity. Closing keeps the existing pending/dismissal/focus rules; shared modal forms stay mounted when style changes. |
| Toast | `useToast.jsx`: spring stiffness 510, damping 34, mass .65 and 160ms opacity. Errors enter from above, notifications from the side, confirmations from below with a small tilt. Lifetime/deduplication/action semantics remain separate. Successful feedback requests a bounded celebration. |
| Hero/stat number | `AnimatedNumber.tsx`: 600ms interpolation, exact final value/formatter; final accessible text is immediately available. No count-up on Lite/reduced motion. |
| Button hover / press | `kinetic-motion.css`: 180ms lift up to 2px; a 420ms arrow pass on public/shared actions and distinct sun/moon/settings/bell gestures. Press 120ms to scale .98. Fine-pointer hover only. No repeated colour/shadow animation. |
| Magnetic public button | `MagneticButton.tsx`: dynamic GSAP quickTo, at most ±4px on a separate wrapper, 180ms easing, fine pointers only. |
| Landing/login hero entry | `useLandingMotion.ts`: dynamic GSAP timeline; headline 720ms without hiding it, copy 560ms with 55ms stagger, paper/actors about 700–720ms with separate assembly beats, underline drawn over 580ms. Yields immediately to focus/pointer input, pause and viewport exit. |
| Landing parallax | Same hook: Tier 2 only, two decorative layers capped at −15px/+18px. One requested frame per scroll burst, no continuous loop or ScrollTrigger import. Reset on pause, viewport exit and unmount. Login has no parallax. |
| Public scroll encounters | `useViewportReveal.ts`: headings, crew cards, playground, steps and closer appear once, 440–520ms, at most 55ms stagger between nearby entries. No hidden resting content; shared budget pre-emption and pause cancel in-flight motion. |
| Native view change | `ModuleUI.jsx` / `usePageEntrance.js`: 260ms directional 12px panel entry, reversed for previous tabs and RTL. Header/tabs/forms stay mounted. Kinetic's initial page entry belongs to the section hook; Forex yields to the Insights owner. Playful retains its 360ms frame entrance. |
| Glow Crew idle / blink | `kinetic-motion.css`: Blip's comet gesture, Mochi's soft stretch, Ziggy's small zigzag and Nova's curious tilt have separate 6.2–8.1s gesture/rest cycles. Eye cycles span 6.7–9.1s with distinct phases. Tier 1 crews omit eye tracks; Tier 0 crews stay static. |
| Greet / listen | Arm wave 600ms twice; password focus closes eyes and each crew member turns away by its own small angle, without reading field values. Greet returns to idle after 1200ms. |
| Snip / celebrate / error | Body reaction 500ms twice / 700ms squash or Nova star cheer / 350ms shake. Finite states return to idle; inline success/error descriptions remain the authoritative signal. |
| Delayed loading | `LoadingSkeleton.jsx`: sleep companion after 2s; one 1.4s transform shimmer for the entire skeleton, rather than a loop on every placeholder. |
| Canvas celebration | `ConfettiHost.tsx` / `ConfettiCanvas.tsx`: one shared canvas at a time, 6 pieces on Tier 1 / 12 on Tier 2, DPR ≤2, 700ms burst, released after 900ms. None on Lite/reduced motion. |
| Demo checks / snipped notes | 320ms check settle and ink draw; three note trajectories with 0/45/85ms delays, 520ms travel and 240ms fade, followed by a spring win stamp and finite ring. Fictional state remains local to the public page. |
| Surface attention | `SurfaceLight.tsx`: one Tier 2 portal follows a fine pointer or centres on keyboard attention. A masked rim and subtle light pool leave card geometry still. At most one pending frame; skip touch/forced colours, clear on scroll/pause/pre-emption/unmount and ignore surfaces behind the active dialog. |
| Charts | `VisibleResponsiveContainer.tsx`: reserve geometry and mount after viewport admission. Recharts value interpolation stays disabled. Insights adds bounded one-time stroke effects to visible observed lines, fades dashed model/projected lines without changing their dash pattern, and settles all effects before dashboard capture. |
| Physique | Existing demand/on-interaction renderer; Kinetic caps DPR at 1/1.5/2 and removes real-time shadows on Tiers 0/1. Pausing decoration also governs its optional animation. |

### Adaptive motion and fallback

`KineticProvider.tsx` owns quality and admission: Tier 0/1/2 allow at most **3/6/12 admitted decorative tracks**. Hardware cores, memory, data-saving, low battery, saved/OS reduced motion and the device-local Lite toggle establish the ceiling. A two-second FPS sample runs only when visible and active, with an eight-second rest; below 50fps downgrades one tier. Upgrade requires a full minute of sustained samples at or above 57fps. Long-task totals/maxima stay in local memory and are not sent to analytics.

Scenes and the logo wait for IntersectionObserver admission with a 40px margin. Hidden documents, public/header Pause motion and saved/OS reduced motion stop decoration. Background scenes also pause behind the top dialog; its own companion can continue. Priority feedback can pre-empt idle tracks. The provider releases observers, RAFs and timers on unmount. Full Framer layout features load only when first needed, through a stable promise that does not remount forms when Lite changes.

Playful restores the original artwork and retained CSS pop/float/blink rules through a lazy compatibility stylesheet. Earlier implementation documents record historical GSAP character/native entrances; those are superseded by the current owners above. Technical 3D remains a separate demand-rendered workload, not a global character background.

## 15. Accessibility and responsive behaviour

- Skip links, named navigation regions, one page-level heading through the standard templates and a focusable main region.
- Labels and autocomplete for login; accessible names for icon-only actions.
- Live descriptions for fictional outcomes and login feedback; alert/status distinctions for real errors and updates.
- Focus outlines are normally 3px with an offset; tab focus remains on the actual tab button.
- Tab keyboard handling supports RTL, disabled items and manual activation.
- Modal/drawer focus trapping, scroll locking and trigger restoration; pending sign-out blocks dismissal deliberately.
- Forced-colour rules preserve borders, selected controls and focus cues.
- Numeric formatting follows the application's profile/date/currency helpers; colour alone is not the only status signal.
- Public landing reorganises around 1000/760/540px; login around 960/520px; shell/navigation and domain layouts have their own documented cutoffs.
- Compact density reduces row/cell spacing (for example 48px to 36px row token, 12px to 8px vertical cell spacing); it is separate from whether motion is enabled.

These describe implemented rules and checked component behaviour. Actual colour rendering, focus appearance, zoom and overflow at every viewport still require browser review.

## 16. Production, demo and incomplete areas

Ultimate owns the desktop shell and native Growth/Work/Insights/Family/market presentations. NiftyLens/Family/Forex services retain their data owners. FinSync and OxFin customer-facing applications remain separate; their customer-administration interfaces belong in Ultimate and require configured restricted adapters.

`src/admin-demo` and `/admin-demo.html` are an isolated fictional review application with their own catalogue, fixtures and review states. The production landing playground is another page-local fictional experience. Neither establishes a real customer API, completed provider connection, billing integration, live prediction model or visual approval.

What is complete for this documentation: the current journey, shared presentation, controls, fonts, palette options, motion catalogue, source-linked control inventory and full registry are covered. What is not established by the implementation records: distinct parity for every registered view, configured live product adapters, a browser-reviewed ledger for all themes/widths, a successful live owner test in this session, or deployment. NiftyLens's extra registered view IDs and the Overview's shared view IDs are concrete examples of remaining view-parity distinctions.

## 17. Source map

All source links below are local repository links.

| Topic | Source |
| --- | --- |
| Entry/font imports | [main.jsx](../growthtrack-ultimate/src/main.jsx) |
| Routing, shell and sign-out handoff | [App.jsx](../growthtrack-ultimate/src/App.jsx) |
| Registered modules/view IDs | [featureRegistry.ts](../growthtrack-ultimate/src/config/featureRegistry.ts) |
| Area labels and module order | [navigation.js](../growthtrack-ultimate/src/config/navigation.js) |
| Landing, demo and hero interaction | [LandingPage.jsx](../growthtrack-ultimate/src/pages/LandingPage.jsx), [SirenSnipScene.jsx](../growthtrack-ultimate/src/pages/SirenSnipScene.jsx) |
| Login and outcome messages | [LoginPage.jsx](../growthtrack-ultimate/src/pages/LoginPage.jsx) |
| Real home overview | [Overview.jsx](../growthtrack-ultimate/src/components/Overview.jsx) |
| Header/sidebar/shortcut links | [Header.jsx](../growthtrack-ultimate/src/components/Header.jsx), [PremiumSidebar.jsx](../growthtrack-ultimate/src/components/PremiumSidebar.jsx), [WorkspaceSubnav.jsx](../growthtrack-ultimate/src/components/WorkspaceSubnav.jsx) |
| Mobile dock | [FloatingPillDock.jsx](../growthtrack-ultimate/src/components/FloatingPillDock.jsx) |
| Logo/characters | [AnimatedLogo.jsx](../growthtrack-ultimate/src/components/motion/AnimatedLogo.jsx), [CharacterArt.jsx](../growthtrack-ultimate/src/components/motion/CharacterArt.jsx), [CharacterScene.jsx](../growthtrack-ultimate/src/components/motion/CharacterScene.jsx) |
| Shared character motion | [playful-motion.css](../growthtrack-ultimate/src/components/motion/playful-motion.css) |
| Motion hooks | [usePlayfulMotion.js](../growthtrack-ultimate/src/hooks/usePlayfulMotion.js), [useSceneMotion.js](../growthtrack-ultimate/src/hooks/useSceneMotion.js), [usePageEntrance.js](../growthtrack-ultimate/src/hooks/usePageEntrance.js) |
| Native module motion/views | [ModuleUI.jsx](../growthtrack-ultimate/src/domains/native/ModuleUI.jsx), [EquityPage.jsx](../growthtrack-ultimate/src/domains/equity/EquityPage.jsx), [FamilyPage.jsx](../growthtrack-ultimate/src/domains/family/FamilyPage.jsx), [ForexPage.jsx](../growthtrack-ultimate/src/domains/forex/ForexPage.jsx) |
| Tokens and generation | [tokens.ts](../growthtrack-ultimate/src/design/tokens.ts), [build-design-tokens.mjs](../growthtrack-ultimate/scripts/build-design-tokens.mjs) |
| CSS import order | [app-styles.css](../growthtrack-ultimate/src/styles/app-styles.css) |
| Shared surfaces, controls and layout | [editorial-components.css](../growthtrack-ultimate/src/styles/editorial-components.css), [editorial-shell.css](../growthtrack-ultimate/src/styles/editorial-shell.css), [responsive-foundation.css](../growthtrack-ultimate/src/styles/responsive-foundation.css) |
| Public layout/styles | [public-pages.css](../growthtrack-ultimate/src/pages/public-pages.css), [playful-landing.css](../growthtrack-ultimate/src/pages/playful-landing.css) |
| Tabs/buttons/dialogs | [Tabs.jsx](../growthtrack-ultimate/src/components/ui/Tabs.jsx), [Button.jsx](../growthtrack-ultimate/src/components/ui/Button.jsx), [Modal.jsx](../growthtrack-ultimate/src/components/ui/Modal.jsx) |
| Sign-out choices | [SignOutDialog.jsx](../growthtrack-ultimate/src/components/SignOutDialog.jsx) |
| Toasts/consent | [useToast.jsx](../growthtrack-ultimate/src/hooks/useToast.jsx), [ConsentBanner.jsx](../growthtrack-ultimate/src/components/ConsentBanner.jsx) |

## 18. Keeping this guide current

The human-written sections explain the journey and implementation. Section 19 and the companion control inventory are generated from production source. After changing modules or controls:

```powershell
node scripts/ui-guide-inventory.mjs
node scripts/ui-guide-inventory.mjs --check
node scripts/application-docs.mjs --check
npm run context:index
```

For appearance changes, update canonical tokens and regenerate through `npm run design:sync`; use `npm run design:check` for drift. UI impact and review handoff remain separate tools: `npm run impact:ui`, `npm run impact:ui:check`, `npm run handoff:ui`, `npm run handoff:ui:check`.

Current Kinetic verification and acceptance limits are recorded in [the implementation evidence](plans/2026-10-30-kinetic-ui.md) and [the 31 October motion refinement](plans/2026-10-31-motion-refinement.md). Historical browser runs use an isolated fictional owner and the production build; they do not establish live owner workflow approval, backend availability, every nested view, or deployment. The motion refinement has component/bundle evidence and requires its own rendered review. Source inventories, generation drift and documentation links are checked separately.

## 19. Complete registered module and view inventory

<!-- BEGIN GENERATED UI ROUTES -->

The registry currently contains **61 module definitions**. This is a source inventory, not rendered coverage. View IDs are listed exactly as registered; see the implementation-status notes above and the page workflows below. A registry value of ready is metadata, not a live-service or visual-test result.

A supported view uses a query such as `/wellness/physique?view=measurements`. Not every page currently binds every registered view to its own distinct panel. Public pages `/welcome`, `/login`, `/privacy` and `/terms`, overlays and nested 3D controls are additional surfaces outside these module definitions.

| Navigation area | Module | Canonical path | Registered view IDs | Template; availability metadata |
| --- | --- | --- | --- | --- |
| Customers | FinSync customers | `/finance/finsync` | `customers`, `activity`, `support` | record; setup-required |
| Customers | OxFin customers | `/finance/oxfin` | `customers`, `activity`, `support` | record; setup-required |
| Customers | All customers | `/customers` | `customers`, `activity`, `support` | record; setup-required |
| Finance | Overview | `/finance/overview` | No registered sub-view | command; ready |
| Finance | Transactions | `/finance/transactions` | `all`, `income`, `expenses` | record; ready |
| Finance | Analytics | `/finance/analytics` | `categories`, `income`, `comparisons` | analytics; ready |
| Finance | Trends | `/finance/trends` | `monthly`, `recurring` | analytics; ready |
| Finance | Budgeting | `/finance/budgeting` | `current`, `history` | record; ready |
| Finance | Subscriptions | `/finance/subscriptions` | `active`, `upcoming`, `archived` | record; ready |
| Finance | Portfolio | `/finance/portfolio` | `holdings`, `allocation`, `history` | record; ready |
| Finance | SIP Calculator | `/finance/sip` | `inputs`, `projection`, `comparison` | analytics; ready |
| Finance | Shopping | `/finance/shopping` | `lists`, `planned`, `purchased` | record; ready |
| Finance | Sync | `/finance/sync` | `accounts`, `csv`, `history` | settings; ready |
| Finance | NiftyLens | `/finance/equity` | `charts`, `movers`, `connection`, `indices`, `options`, `chain` | immersive; ready |
| Finance | Forex Forecast | `/insights/forex` | `models`, `forecast`, `analytics`, `volatility` | immersive; ready |
| Growth | Overview | `/wellness/overview` | No registered sub-view | command; ready |
| Growth | Sleep | `/wellness/sleep` | `log`, `trends`, `history` | record; ready |
| Growth | Lifestyle | `/wellness/lifestyle` | `routines`, `preferences`, `history` | record; ready |
| Growth | Mind & Wellness | `/wellness/mind` | `checkin`, `trends`, `journal`, `breathe` | record; ready |
| Growth | Medical | `/wellness/medical` | `vitals`, `medications`, `records`, `timeline` | record; ready |
| Growth | Health+ | `/wellness/health` | `senses`, `lifestyle`, `specialized`, `recovery` | record; ready |
| Growth | Habits | `/wellness/habits` | `today`, `matrix`, `history` | record; ready |
| Growth | Physique | `/wellness/physique` | `blueprint`, `measurements`, `targets`, `history`, `3d` | record; ready |
| Growth | Assessment | `/wellness/assessment` | `questionnaire`, `results`, `history` | record; ready |
| Growth | Training | `/wellness/training` | `schedule`, `logger`, `prs`, `overload`, `volume`, `sessions` | record; ready |
| Growth | Strength | `/wellness/strength` | `log`, `progression`, `1rm`, `fatigue`, `volume` | analytics; ready |
| Growth | Nutrition | `/wellness/nutrition` | `daily`, `history`, `targets`, `calculator` | record; ready |
| Growth | Hydration | `/wellness/hydration` | `today`, `history`, `targets` | record; ready |
| Growth | Health Sync | `/wellness/sync` | `devices`, `imports`, `history` | settings; setup-required |
| Work | Overview | `/workspace/overview` | No registered sub-view | command; ready |
| Work | Calendar | `/workspace/calendar` | `month`, `week`, `agenda`, `connections` | record; ready |
| Work | My Files | `/workspace/files` | `vault`, `providers`, `recent` | record; ready |
| Work | Notes | `/workspace/notes` | `all`, `pinned`, `tags`, `editor` | record; ready |
| Work | Tasks | `/workspace/tasks` | `today`, `upcoming`, `all`, `completed`, `list`, `board` | record; ready |
| Work | Projects | `/workspace/projects` | `github`, `mine`, `grid`, `list` | record; ready |
| Work | Timesheet | `/workspace/timesheet` | `timer`, `sessions`, `analytics` | record; ready |
| Work | Skills | `/workspace/skills` | `tree`, `list`, `radar`, `history` | record; ready |
| Work | Goals | `/workspace/goals` | `active`, `completed`, `archived` | record; ready |
| Life | Overview | `/life/overview` | No registered sub-view | command; ready |
| Life | Social | `/life/social` | `profiles`, `analytics`, `connections` | analytics; ready |
| Life | Entertainment | `/life/entertainment` | `library`, `stats`, `sync` | record; ready |
| Life | Maps & Places | `/life/places` | `map`, `list`, `timeline`, `privacy` | record; ready |
| Life | Family Connect | `/life/family` | `tree`, `people`, `memories`, `vault`, `timeline`, `access` | immersive; ready |
| Insights | Overview | `/insights/overview` | `today`, `priorities`, `summary` | command; ready |
| Insights | Action Center | `/insights/actions` | `today`, `upcoming`, `snoozed`, `dismissed` | record; ready |
| Insights | Current | `/insights/current` | `weather`, `news`, `local` | command; ready |
| Insights | Analytics | `/insights/analytics` | `trends`, `correlations`, `comparisons` | analytics; ready |
| Insights | Dashboards | `/insights/dashboards` | `saved`, `arrange` | analytics; ready |
| Insights | Progress | `/insights/progress` | `timeline`, `comparisons`, `milestones` | analytics; ready |
| Insights | Forecast | `/insights/forecast` | `trends`, `scenarios` | analytics; ready |
| Hub | Overview | `/hub/overview` | No registered sub-view | command; ready |
| Hub | Apps | `/hub/apps` | `modules`, `favorites`, `external` | record; ready |
| Hub | Apps Suite | `/hub/companion` | `all`, `finsync`, `oxfin`, `equity`, `forex`, `family` | immersive; ready |
| Hub | Agents | `/hub/agents` | `chat`, `history`, `context`, `settings` | record; ready |
| Hub | Databases | `/hub/databases` | `custom`, `application`, `imports` | record; ready |
| Hub | Profile & Settings | `/hub/settings` | `personal`, `physical`, `security`, `appearance`, `integrations` | settings; ready |
| Hub | Notifications | `/hub/notifications` | `unread`, `all`, `preferences` | record; ready |
| Hub | Helpdesk | `/hub/help` | `guides`, `troubleshooting`, `diagnostics` | record; ready |
| Hub | Logs | `/hub/logs` | `activity`, `authentication`, `sync` | record; ready |
| Hub | About | `/hub/about` | `version`, `capabilities`, `licenses` | detail; ready |
| Hub | Plans | `/hub/plans` | `capabilities`, `billing` | settings; ready |

<!-- END GENERATED UI ROUTES -->

## 20. Page-by-page workflows and main actions

This section covers all 61 registered module definitions in the navigation areas users see. Section 19 is the exact routing contract; this section explains the owning UI and its principal actions. A panel name, record filter and display mode can differ from a registered view ID. The generated inventory is the companion reference for individual render sites, including dynamic row actions and the expressions that handle them.

### Customers — 3 modules

All three use [CustomerAdminPage.jsx](../growthtrack-ultimate/src/domains/customer-admin/CustomerAdminPage.jsx).

| Module | Current workflow and controls |
| --- | --- |
| All customers | Choose FinSync or OxFin, then Directory, Activity or Support. Search name/email, filter status and plan, clear filters, check the connection, choose 25/50/100 rows, move Previous/Next, and open/close a customer preview. This is a product selector, not a combined cross-product customer database. |
| FinSync customers | The same directory scoped to FinSync. Preview shows the limited returned identity/status/plan fields. Plan editing and support-note editing are unavailable until separately connected and authorised. |
| OxFin customers | The same directory scoped to OxFin. Activity and Support currently show explicit setup states, rather than fabricated audit events or editable notes. A denied/unconfigured connection is different from an empty filtered directory. |

### Finance — 12 modules

The seven cash-flow pages use [Finance.tsx](../growthtrack-ultimate/src/components/Finance.tsx) and its [finance components](../growthtrack-ultimate/src/components/finance). Module navigation is supplied by the shell.

| Module | Current workflow and controls |
| --- | --- |
| Overview | Select a month, inspect recorded income/expenses, budgets and renewals, then use the transaction-entry workflow. Snip accompanies the heading. Near/over-budget notices use recorded values; invalid records are reported rather than included in totals. |
| Transactions | Review/filter the ledger, add an income/expense entry, open its editor, save/cancel and delete through the page-owned flow. Search/filter state and the editor determine the rows; the registry's All/Income/Expenses IDs do not by themselves establish three tab panels. |
| Analytics | Select the period and optionally category/payment method. Inspect breakdowns and previous-period comparisons. These filters act on saved finance records. |
| Trends | Inspect changes over time and recurring patterns from recorded transactions. Charts and period controls belong to this page. |
| Budgeting | Select a month, review category limits against spending, create/edit a budget, save/cancel, or delete a budget. Over-limit and near-limit states have explicit text and semantic colour. |
| Subscriptions | Review recurring costs/renewals and use add/edit/delete controls. The saved subscription status/date drives its display; the registry's status views are not proof of separate route-bound panels. |
| Sync | Inspect connection/import availability and the page-owned CSV import/review workflow. Configured capabilities determine account operations. Opening this page is not a successful bank connection or automatic import. |
| Portfolio | [Portfolio.jsx](../growthtrack-ultimate/src/components/Portfolio.jsx): Holdings, Allocation and Performance. Add/edit a holding, review dated value/currency, remove a holding and use the available undo action. Allocation uses dated values. Performance currently explains that historical valuations are unavailable; it does not invent a return chart. |
| SIP Calculator | [SIPCalculator.jsx](../growthtrack-ultimate/src/components/SIPCalculator.jsx): adjust contribution, duration, return, inflation and related investment inputs; inspect projected corpus, invested amount, estimated gains and the comparison/chart outputs. These are calculator outputs, not executed investments. |
| Shopping | [Shopping.jsx](../growthtrack-ultimate/src/components/Shopping.jsx): purchase timeline filters **Need later, Ordered, Arriving, Purchased, All**, search and record controls. Add/edit purchase details, update stage/completion and inspect price/priority context. These are the rendered stage controls rather than the registry's generic `lists/planned/purchased` grouping. |
| NiftyLens | [EquityPage.jsx](../growthtrack-ultimate/src/domains/equity/EquityPage.jsx): **Market watch, Movers, Data source**. Select the market context/instrument and chart controls, refresh/retry, inspect movers and data-source availability. The current native page does not implement separate Indices/Options/Chain panels merely because those IDs are registered. |
| Forex Forecast / Forex Studio | [ForexPage.jsx](../growthtrack-ultimate/src/domains/forex/ForexPage.jsx): **Models, Recent & future, Historical, Volatility**. Inspect saved model/data availability, select currency/model/history controls, refresh and use bounded comparisons. Currency comparison permits up to six selected currencies. Loading this UI does not train a model or establish live-price/forecast accuracy. Its navigation area is Finance even though its canonical URL starts `/insights/forex`. |

### Growth — 14 modules

| Module | Current workflow and controls |
| --- | --- |
| Overview | [WellnessCommand.jsx](../growthtrack-ultimate/src/components/WellnessCommand.jsx): review saved wellness context and use links/actions to its owning health, training, habit and measurement modules. Setup/check-in actions are based on current account state. |
| Sleep | [SleepDashboard.jsx](../growthtrack-ultimate/src/components/SleepDashboard.jsx): review saved sleep metrics/charts/history and enter a dated sleep log, including bed/wake information and available sleep-stage details. Add/save, history and refresh controls belong to the sleep page. Empty history is not generated sleep data. |
| Lifestyle | [Lifestyle.jsx](../growthtrack-ultimate/src/components/Lifestyle.jsx): rendered sections **Tracker, Analytics, Add Habit**. Track routine/habit completions, inspect rates/streaks and add a habit. These local labels differ from the registry's `routines/preferences/history`. |
| Mind & Wellness | [MindWellness.jsx](../growthtrack-ultimate/src/components/MindWellness.jsx): **Check-In, Trends, Journal, Breathe**. Choose mood/energy, save check-ins, write/review journal entries, inspect dated trends and use breathing controls. Breathing is a domain interaction with its own state. |
| Medical | [Medical.jsx](../growthtrack-ultimate/src/components/Medical.jsx): review/log vitals and medical records, manage medication entries and inspect the dated timeline. Record forms, remove/undo and filters are page-owned. Its medical-context copy is part of the page. |
| Health+ | [HealthExtras.jsx](../growthtrack-ultimate/src/components/HealthExtras.jsx): sensory, specialised vitality, lifestyle/performance and recovery/stress sections. Open a sense/detail and record supported metrics. Missing connected/saved data has an explicit empty explanation. |
| Habits | [HabitsMatrix.jsx](../growthtrack-ultimate/src/components/HabitsMatrix.jsx): add/edit habits, toggle dated completion, filter categories and inspect the completion matrix/history/streak context. Delete has the page's undo feedback. A matrix cell is a repeated record control, not a separately countable fixed button. |
| Physique | [Physique.jsx](../growthtrack-ultimate/src/components/Physique.jsx): **Blueprint, Measurements, Targets, History, 3D**. Review current body facts, open a measurement check-in, set targets/training-zone focus and review dated snapshots. The nested technical controls are described in section 21. |
| Assessment | [Assessment.jsx](../growthtrack-ultimate/src/components/Assessment.jsx): answer the assessment's steps, navigate the questionnaire and inspect its computed/saved result information and expandable rounds. This is separate from initial account onboarding. |
| Training | [Training.jsx](../growthtrack-ultimate/src/components/Training.jsx): **Schedule, Live Logger, PRs, Progressive Overload, Volume History, Sessions**. Add/remove plan days/exercises, start a session, enter/check sets, start rest timers, finish/save or cancel, log a PR, inspect history and delete a saved workout through its confirmation flow. |
| Strength | [StrengthMetrics.jsx](../growthtrack-ultimate/src/components/StrengthMetrics.jsx): log sets, choose exercises, review progression, estimated 1RM, fatigue and volume. Log Set opens the entry controls; Log/Cancel complete or close them. Displayed figures depend on saved workout/strength inputs. |
| Nutrition | [Nutrition.jsx](../growthtrack-ultimate/src/components/Nutrition.jsx): daily meal/macronutrient display, meal entry/removal, targets/calculator inputs and selectable history range. Log Meal saves an entry; Refresh reloads; age/body/activity/goal inputs drive calculator output. Macro colours identify series and are separate from the UI theme. |
| Hydration | [HydrationTracker.jsx](../growthtrack-ultimate/src/components/HydrationTracker.jsx): review today's progress and saved history, add preset quantities or use the ±100ml controls, refresh/retry history and inspect target context. Its progress visual follows recorded quantities. |
| Health Sync | [App.jsx](../growthtrack-ultimate/src/App.jsx): currently an explicit **Pair a health companion** setup state. Device pairing is not configured by the UI; no simulated readings are written. Registered Devices/Imports/History are not three completed live workflows. |

### Work — 9 modules

| Module | Current workflow and controls |
| --- | --- |
| Overview | [WorkspaceHub.jsx](../growthtrack-ultimate/src/components/WorkspaceHub.jsx): workspace overview and links into tasks, calendar, files, notes and other work tools. Each destination retains its own records and mutation flow. |
| Calendar | [Calendar.jsx](../growthtrack-ultimate/src/components/Calendar.jsx): **Month, Week, Agenda, Connections** route/view context. Move Previous/Next, return to Today, select a day, add/edit recurring or one-off events, and review import/export/delete operations. Import .ics and Export .ics open review/confirmation flows; Save event persists the form. |
| My Files | [Documents.jsx](../growthtrack-ultimate/src/components/Documents.jsx): upload/choose/drop a file, confirm upload, search/filter types, sort, select records, preview, download and delete individually or in bulk through the page's flow. Provider actions explain setup requirements. Vault/Providers/Recent registry labels are not proof of three separate rendered tabs. |
| Notes | [NotesRoute.jsx](../growthtrack-ultimate/src/app/NotesRoute.jsx): enters the domain-owned note workspace with **All, Pinned, Tags and Editor** view context. Browse/open/edit notes, manage note structure and page-owned file actions. The wrapper shows checking/synced/failed refresh state and Retry refresh; note drafts and server sync have separate lifecycles. |
| Tasks | [Tasks.tsx](../growthtrack-ultimate/src/components/Tasks.tsx): **Pending / Completed** collections; All, Overdue, Today, priority and category filters; **List / Matrix** presentation. Add/edit a task, save/cancel, expand/manage subtasks, complete/reopen/delete and refresh. Registry `list/board` IDs do not describe the actual local Matrix label. |
| Projects | [Projects.jsx](../growthtrack-ultimate/src/components/Projects.jsx): **Repositories / My Projects**, plus **Grid / List** controls and search/filter. Refresh provider repositories and manage manual projects. The component uses local `manual` for My Projects while the registry uses `mine`. |
| Timesheet | [Timesheet.tsx](../growthtrack-ultimate/src/components/Timesheet.tsx): **Timer, Sessions, Analytics**. Select project/task, billable/rate/notes, start/pause/resume/stop-and-save; add a manual entry, delete an entry or export CSV. An unfinished timer draft belongs to the current owner/device and is separate from saved sessions. |
| Skills | [Skills.jsx](../growthtrack-ultimate/src/components/Skills.jsx): tree/list/radar/history context with category filters, add/edit skill forms, XP/practice actions, delete/keep and available undo feedback. Counters/levels reflect the module's recorded XP; they are not a global health score. |
| Goals | [GoalsDashboard.jsx](../growthtrack-ultimate/src/components/GoalsDashboard.jsx): status/category/search filters, add/edit/save/cancel, set/remove the focus goal, expand a goal, add/check/remove subtasks, log progress, mark complete and delete with the page's feedback. Status filters are local controls rather than automatically route-bound panels. |

### Life — 5 modules

| Module | Current workflow and controls |
| --- | --- |
| Overview | [LifeCommand.jsx](../growthtrack-ultimate/src/components/LifeCommand.jsx): review life-related saved context and open the corresponding family, social, entertainment and place modules. |
| Family Connect | [FamilyPage.jsx](../growthtrack-ultimate/src/domains/family/FamilyPage.jsx): connect/sign in to the Family account, or use its own Create account option; choose/create a tree; use **Family tree, People, Memories, Private vault, Timeline, Access**. Open/edit people, manage supported relationships/events, upload/download authorised documents and inspect access. Family permissions determine available edits. An explicit biography-draft action sends its stated notes/profile to the configured provider; the resulting draft must be reviewed before saving. This separate Family account flow does not add public Ultimate registration. |
| Social | [SocialMedia.jsx](../growthtrack-ultimate/src/components/SocialMedia.jsx): **Profiles, Analytics, Connections**. Review/manage configured social profiles and connection state; provider setup governs available data. |
| Entertainment | [Entertainment.jsx](../growthtrack-ultimate/src/components/Entertainment.jsx): **Library, Stats, Sync**. Add/search/filter/sort titles, open/edit a title, change season/episode/rating/status, save progress and delete. Carousel arrows scroll the local shelves; provider sync has its own connection/error state. |
| Maps & Places | [Maps.jsx](../growthtrack-ultimate/src/components/Maps.jsx): **List, Map, Timeline, Privacy**; List is the local default. Save current location requests browser permission; Privacy can enable capture only while the page remains open. Map tiles require the explicit Load third-party map action. Open external map and Delete sample are record actions. Leaving the page stops active capture. |

### Insights — 7 modules, including home

| Module | Current workflow and controls |
| --- | --- |
| Overview / Home | [Overview.jsx](../growthtrack-ultimate/src/components/Overview.jsx): “Your day, in focus,” real next action, saved-record facts, recent activity and owning-module shortcuts. Its registered Today/Priorities/Summary IDs currently reuse this page. |
| Action Center | [ActionCenter.jsx](../growthtrack-ultimate/src/components/ActionCenter.jsx): open a recommended owning-module action, Snooze it or mark Not relevant. Mutations have saving/error state. No remaining actions produces “You’re caught up” with Review Insights. The registered action collections do not prove a four-tab implementation. |
| Current | [Current.jsx](../growthtrack-ultimate/src/components/Current.jsx): time/day context, configured/location-dependent weather and news. Use my location explicitly requests location; Weather/News refresh independently and show unavailable/error states. The time-dependent background colours belong to this page. |
| Analytics | [Analytics.jsx](../growthtrack-ultimate/src/components/Analytics.jsx): inspect recorded trends/correlations with local analysis controls. Incomplete data produces unavailable results; the displayed relationship is not fabricated from empty arrays. |
| Dashboards | [Dashboards.jsx](../growthtrack-ultimate/src/components/Dashboards.jsx): review the module's saved-data dashboard and export its displayed overview through a pending/error-aware action. Registered Saved/Arrange are not evidence of a complete drag-and-drop dashboard builder. |
| Progress | [InsightsHub.jsx](../growthtrack-ultimate/src/components/InsightsHub.jsx): currently a **read-only progress summary** with saved measurement/dates, goal/task/habit/sleep counts and links to measurement history and canonical logs. It is not three distinct Timeline/Comparisons/Milestones panels. |
| Forecast | [TransformationPredictor.jsx](../growthtrack-ultimate/src/components/TransformationPredictor.jsx): **Cards / Timeline** presentation of the module's forecast/projection information. These are the actual local controls; the registered `trends/scenarios` pair does not imply two different implemented panels. |

### Hub — 11 modules

| Module | Current workflow and controls |
| --- | --- |
| Overview | [HubCommand.jsx](../growthtrack-ultimate/src/components/HubCommand.jsx): platform overview and links into apps, settings, agents and operational tools. |
| Apps Suite | [UnifiedWorkspace.jsx](../growthtrack-ultimate/src/components/UnifiedWorkspace.jsx): retained product/module launcher. Family/Equity/Forex view selections redirect into their native Ultimate modules; FinSync/OxFin remain separate products. A launcher/handoff is not a customer-admin credential. |
| Apps | [AppLauncher.jsx](../growthtrack-ultimate/src/components/AppLauncher.jsx): search/filter available modules, switch **Grid / List**, manage the available favourites and open a module/external destination. The current group order influences its organisation. |
| Agents | [AiDashboard.jsx](../growthtrack-ultimate/src/components/AiDashboard.jsx) and [AgentsWorkspace.jsx](../growthtrack-ultimate/src/components/agents/AgentsWorkspace.jsx): agent conversation/workspace, history/context and configured provider/settings controls. Requests expose pending/error state; proposed actions have their own review controls. Opening the illustrated shell is not a successful provider connection or an approval to execute a suggested mutation. |
| Databases | [Databases.jsx](../growthtrack-ultimate/src/components/Databases.jsx): create/select custom tables, edit a schema, add/duplicate/delete rows, double-click an editable cell, sort/filter/search and use CSV import/export. All databases opens the console surface; application data also has Table/JSON presentation and explicit editable-copy/configuration actions. These controls are more granular than the three registered view labels. |
| Profile & Settings | [ProfileEditor.jsx](../growthtrack-ultimate/src/components/ProfileEditor.jsx): rendered **Account, Body & measurements, Privacy & security, Display, Connections**. Edit/save the relevant profile/body information; manage password/session/AI/local-draft controls; choose system/light/dark/AMOLED, accent, named colour theme, density, units/language/accessibility; inspect integrations. Each subsection keeps its own validation/save rules. |
| Notifications | [NotificationCenter.jsx](../growthtrack-ultimate/src/components/NotificationCenter.jsx): **Unread, All, Dismissed** collection buttons; mark/read/dismiss and available notification actions; expandable preferences. The registry's `preferences` is not a separate current tab, and `dismissed` is a local collection absent from that registered list. |
| Helpdesk | [Helpdesk.jsx](../growthtrack-ultimate/src/components/Helpdesk.jsx): search help articles, expand/collapse an article and Browse all docs. Registered Guides/Troubleshooting/Diagnostics are a routing/design contract rather than three proven tab panels. |
| Logs | [Logs.jsx](../growthtrack-ultimate/src/components/Logs.jsx): search/filter canonical activity by action/table/category/sentiment/date, inspect records and use the available diagnostic/self-test controls. Saved log records and diagnostic output have distinct loading/error state. |
| About | [About.jsx](../growthtrack-ultimate/src/components/About.jsx): version/capability/system context and changelog. Expand individual release entries, show more/less history and follow release links. These sections need not be separate tabs matching each registry view. |
| Plans | [Pricing.jsx](../growthtrack-ultimate/src/components/Pricing.jsx): inspect deployment capabilities and the recorded entitlement/billing availability returned by the service. If billing is unconfigured, the UI explicitly has no checkout or invented upgrade offer. |

## 21. Nested Physique / 3D interface

The technical 3D workspace is a separate interface inside Physique → 3D. It is not the flat Siren/Snip/Sunny character artwork. [ScrollShowcase.jsx](../growthtrack-ultimate/src/components/ScrollShowcase.jsx) enters [HumanoidViewer.tsx](../growthtrack-ultimate/src/components/HumanoidViewer.tsx); lazy model/editor panels retain their own source controls, rendering requirements and asset availability.

The source exposes body tracking and parametric-editor modes; current/goal/comparison/timeline context; view and quality controls; and a detailed editor. Controls depend on the active workspace mode and model capability. A listed render site is not a promise that every control appears simultaneously or that every asset is ready.

| Surface | Controls and purpose |
| --- | --- |
| Model interaction | Drag to rotate; scroll/pinch to zoom; double-click to fit the body. Front, Side and Back viewpoints, presentation rotation and presentation/fullscreen controls are separate from decorative page motion. |
| Main workspace | Switch Body tracker / Parametric human editor, choose the current/goal/comparison/timeline context offered by the active mode, and open/close avatar controls. Timeline availability depends on saved snapshots. |
| Editor tabs | **Measure, Face, Hair, Skin, Anatomy, Clothing, Pose, View**. The tab buttons support arrow/Home/End focus behaviour. Their content includes current/goal context selectors, sliders/fields, presets and model diagnostics. |
| Measurements | Edit supported body metrics; open a metric's measurement guide and focus its body region; use guided avatar setup. Save failures expose a retry rather than silently replacing saved measurements. |
| Appearance | Supported face measurements/adjustments, hair styles/colours, skin-tone/detail and eye-colour controls. Some styles explicitly require assets. Anatomy controls retain their own visibility/privacy handling. |
| Clothing and pose | Select supported wardrobe and posture presets; use the model's own fit/availability checks. A wardrobe choice is not proof that an absent garment asset has loaded. |
| View and rendering | Quality options LOW/MED/HIGH, scene environments/lighting/presentation settings and model/renderer diagnostics. The renderer's own gate controls what can be claimed about the model. |
| Export/share | Export/protected-image and protected-share actions, plus the explicit presentation exit. Their existing privacy and output rules remain owned by the model workspace. |

See the generated control inventory for the nested buttons and fields in HumanoidViewer, parametric editing, anatomy, animation and model-quality panels. Retained animation-panel source or a lazy import alone does not prove a visible top-level Animation tab; the current editor tab list above is the one rendered in the viewer source.

## 22. Public legal pages, companion products and older design docs

Privacy and Terms use a reading layout: skip link → logo/back navigation → title, introduction and last-updated label → numbered table of contents → six numbered content sections → link to the other legal page → footer with legal links and owner sign-in. The table of contents uses local anchors. [PrivacyPage.jsx](../growthtrack-ultimate/src/pages/PrivacyPage.jsx) covers information, use, security/deployment, other services, choices and contact; [TermsPage.jsx](../growthtrack-ultimate/src/pages/TermsPage.jsx) covers use, owner access, records/decisions, availability, conduct and responsibility/contact. This describes existing UI/content; it is not a new legal review or a claim that the displayed policy date equals this guide's source-snapshot date.

| Product/surface | UI ownership and documentation |
| --- | --- |
| Ultimate production UI | This guide, its source inventory and the implementation records linked in section 1. Sessions, real records and permissions remain in production modules. |
| Isolated design review | [UI_ARCHITECTURE_HANDOFF.md](UI_ARCHITECTURE_HANDOFF.md), [UI_REVIEW_AGENT_PROMPT.md](UI_REVIEW_AGENT_PROMPT.md) and [ui-review-manifest.json](ui-review-manifest.json). Run `npm run dev:design` for `/admin-demo.html`. Its fictional page/state catalogue is a design-review tool. |
| FinSync customer UI | Independent [FinSync Web README](../FinSync/apps/web/README.md); its customer-admin UI is represented in Ultimate, while customer onboarding/account screens retain their separate app. |
| OxFin customer UI | Independent [OxFin Web README](../FinSync/OxFin/ox-fin-web/README.md); its customer-admin interface belongs to Ultimate. |
| Native Family/NiftyLens/Forex | Their Ultimate source pages are documented above. The retained [Family frontend](../Family%20Connect/familyconnect/frontend/README.md), [NiftyLens](../Equity/NiftyLens/README.md) and [Forex](../Forex/README.md) entries describe standalone/compatibility setups and their own ownership. |
| Earlier UI references | [DESIGN_SYSTEM.md](../growthtrack-ultimate/docs/DESIGN_SYSTEM.md), [UI_SYSTEM_V2.md](../growthtrack-ultimate/docs/UI_SYSTEM_V2.md) and [SCREEN_DESIGN_REFERENCE.md](../growthtrack-ultimate/docs/SCREEN_DESIGN_REFERENCE.md) describe earlier design layers. For current actual values and font imports, use this guide's source map and `tokens.ts`/`main.jsx`. |

## 23. How to walk through the current UI

### Open the correct experience

1. From the repository root, follow [README.md](../README.md) to configure the existing local application and start it with `npm run dev`. This guide does not require a schema migration or new account credentials.
2. Open `http://127.0.0.1:5000/Ultimate/`. An anonymous root goes to the welcome page. Walk down the landing, try Snip the noise and the three fictional day modes, and use the motion control.
3. Open Owner sign in and use the configured account. A protected deep link retains its destination; a bare successful login currently falls back to Finance overview, while an already signed-in root goes to Insights home.
4. Complete onboarding only if the account needs it, then use the navigation rail/drawer/dock, module-shortcut strip and page-owned controls. Use the tables above to distinguish real native pages, setup states and shared/local views.

### Change display preferences

Open the account Settings modal, choose Display preferences, then use the full Profile & Settings → Display section. Choose appearance, accent/named theme, density and accessibility preferences there. The utility-header theme button is a quicker light/dark action. The decorative-motion button pauses only the governed animation system; reduced-motion preferences take priority. Check narrow-screen navigation and local table/tab overflow independently of theme choice.

The [Hub, Life and Current refinement](plans/2026-10-31-hub-life-weather.md) gives every Hub/Life registry page its own domain presentation boundary, decorative 2D artwork and governed card effects. Hub overview links include the module launcher, companions, account, notifications, agents, data, help, activity, customers and deployment information. Life overview adds illustrated library, social, saved-place and Family Connect destinations. Portal scrollbars are hidden on both axes; native scrolling remains, with horizontal edge cues on shared tabs, shortcuts and tables. These implementation changes do not establish rendered coverage or fill the metadata-only view limitations described above.

The subsequent [horizontal subtab and loading fix](plans/2026-10-31-tab-scroll-performance.md) adds visible previous/next controls to overflowing navigation rows, mouse-wheel support with page-scroll release at the ends, selected-item visibility and RTL behavior. It unifies the older module tab rows with the shared presentation and keeps account sections usable at phone widths. The selected route's code and stylesheet load together; unrelated page prefetching is replaced with bounded hover/focus intent. Nineteen distinct pages were exercised in the isolated Chrome fixture at 390px; this is scroll-interaction evidence, separate from owner-account or all-view visual approval.

Current accepts top-level weather/news settings and older nested sources. With no weather setting it uses Open-Meteo only after the owner chooses location; an explicitly blank source stays disabled. Its request uses a consistent provider contract and matches hourly detail data to the reported local hour. Failed refreshes retain the last reading and provide a retry. Source attribution is visible; missing values are not reported as zero.

### Inspect every control or update the reference

Search [UI_CONTROL_INVENTORY.md](UI_CONTROL_INVENTORY.md) for a component/module name or visible label. Read its handler/destination expression and follow its source link for the complete implementation. After source edits, regenerate with `node scripts/ui-guide-inventory.mjs` and verify with `node scripts/ui-guide-inventory.mjs --check`. README drift is checked with `node scripts/application-docs.mjs --check`.

If the app cannot start or sign in, follow the setup/configuration instructions for that application. If a native service or product adapter is unavailable, retain its setup/error state and use its available retry/connection action; do not substitute fictional records. A static inventory check can pass while a service is unavailable, and it does not replace a rendered page/tab/theme review.
