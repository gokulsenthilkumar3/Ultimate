# Character style across login and the Ultimate workspace

30 October 2026. The user requested the landing's animated illustration style for login, the logo, and all pages after sign-in. This implements that direction in local production source. Rendered page approval and deployment are separate.

The subsequent [sign-out, sub-tab and login refinement](2026-10-30-ultra-ui.md) records the user's “ultra UI” follow-up and the expanded component/interaction treatment.

## Presentation

- An original smiling sun/sprout logo replaces the letter marks on the landing, login, legal pages, desktop sidebar and mobile header. It shares pause, reduced-motion, hidden-document and offscreen rules with the character artwork.
- Login continues the Siren, Snip and Sunny story with a warm canvas, mint/lilac artwork, a rounded owner-access card and short entrance/press feedback. The characters close their eyes when the password input has focus; the illustration depends on field identity, never credential contents. The normal owner sign-in, error, loading, reveal-password and safe return-path behavior remain authoritative.
- Every authenticated module receives a shared breadcrumb/character moment through `App.jsx`. Work and Finance use Snip; Growth and Customers use Siren; Life, Insights and Platform use Sunny. This is decorative context, not fabricated account activity or a success indicator.
- Canonical generated tokens provide an opt-in `data-ui-style="playful"` presentation for Ultimate, with warm light surfaces, a mint rail, rounded primitives and coral/mint/yellow/lilac accents. Dark, AMOLED, density and saved colour palette settings remain available. Independent customer applications receive only the generated design-version comment update; the new appearance is scoped to Ultimate.
- Existing shared shell/component styles own the new card, tab, field, header and navigation treatment. The existing motion stylesheet owns logo, chapter and control animation. No additional CSS override stack or theme persistence store is introduced.
- Page entrances animate the existing main region with the Web Animations API. View changes do not gain a new React key or remount boundary. Animation cancellation restores normal styles when users navigate rapidly, pause, enable reduced motion, or hide the document.
- The global motion control is in the utility header. It also controls the login artwork, logo, existing overview/native scenes, CSS button/tab/dialog feedback and new page entrances. Actual data operations do not depend on animation completion.

## Scope

The shared presentation covers all registered Ultimate modules, including native NiftyLens, Family and Forex pages and FinSync/OxFin customer administration. Existing page-owned forms, numbers, charts, files, models, sessions, permissions and adapters retain their owners. The actual Physique model and measurements remain functional technical content. The isolated admin demo keeps its fictional fixtures and separate review surface.

## Verification

New component checks exercise the character treatment over every registered feature, global pause with usable navigation controls, password-focus/reveal behavior, sign-in with reduced motion and cancellation of page transitions while retaining a focused unfinished form. Token checks cover text/navigation contrast in light, dark and AMOLED and readable ink on every bright accent.

Verification completed:

| Check | Result |
| --- | --- |
| Targeted production component/contract checks, 16 suites across focused runs | 120 passed |
| Isolated fictional design demo | 1,005 passed |
| Final Ultimate production build and TypeScript | Passed |
| Isolated design-preview build | Passed |
| Gateway/workspace proxy checks | Six passed |
| Canonical tokens and five generated adapters | Passed |
| Generated application documentation | 23 READMEs checked |
| UI impact/handoff regeneration and drift checks | Passed; rendered sign-off remains pending |
| Local login route and updated shell source | HTTP 200; current source served |

The navigation test's viewport-only `matchMedia` mock was expanded to handle a reduced-motion query from the new logo; all 11 navigation tests pass with that corrected fixture. The illustration contrast cases cover all three supported appearance modes. Tests use fictional accounts, mocked authentication/data writes and an unfinished example form; they do not establish a live owner sign-in.

The supported computer-use inventory reports no connected browser or native UI; rendered layouts, actual animation timing, keyboard focus appearance and live authenticated flows still require browser review. A component or route count is not browser coverage. The previously documented historical humanoid preview hash mismatch is outside this UI work; no model asset or generated historical preview was changed.
