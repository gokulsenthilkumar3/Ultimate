# Playful 2D landing and overview flow

The requested direction is a bright, flat illustrated experience with character animation and short, useful interactions. The fictional landing story introduces **Siren**, a coral attention bell, **Snip**, mint scissors for cutting distractions, and **Sunny**, a yellow spark for small wins. These are original vector characters, not 3D models.

The user's subsequent request extends this direction through login, a shared animated logo, and every authenticated module. See the [character workspace implementation](2026-10-30-character-workspace.md) for the shared presentation, motion controls and verification scope.

## Visitor flow

1. Visitors without a session arrive at `/welcome` from the app root. Signed-in owners keep their existing root-to-overview route. The landing introduces the characters and the idea of one small next step. The primary action jumps to a fictional interactive day; the existing owner sign-in stays visible.
2. Meet the crew explains what the characters represent. A three-mode playground lets visitors try focus, wellness, and life examples, check a fictional task, and reset it. All example records stay in component memory and are explicitly labelled fictional.
   The hero also gives the Siren/Snip metaphor a direct interaction: **Snip the noise** clears three illustrated distractions, changes the crew's expressions, and reveals space for the good stuff. **Play it again** restores the scene. The caption announces both outcomes; keyboard focus stays on the control. This story is labelled fictional, uses only component memory, and respects the same pause/reduced-motion controls as the rest of the landing.
3. Owner sign-in uses the existing `/login` route. Privacy, terms, authentication, safe return routing, permissions, and production record ownership stay with their current implementations.
4. Insights, wellness, work, life, hub, and finance overviews receive a compact character moment. Existing counts, next actions, loading/error states, records, and mutations remain authoritative.

## Visual and motion rules

- Cream canvas, dark ink, coral, mint, butter yellow, and lilac; crisp typography, generous whitespace, flat vector shapes, expressive faces, and rounded controls.
- Hero characters arrive with a short stagger and damped spring. Tiny idle movement is slow and bounded. Background scroll parallax is limited to decorative shapes and uses a single frame callback.
- Buttons compress on press, arrows nudge on hover, and task checks get one small celebratory pop. No audio, strobing siren, full-screen effects, or blocking page transitions.
- A shared in-memory pause control stops decorative motion everywhere. Both the operating-system reduced-motion setting and the existing application preference take precedence. Hidden/offscreen scenes stop animating. All content remains present without animation.
- Overview characters supplement page identity; they do not cover records, compete with error states, fabricate health/financial scores, or modify the body-model editor.
- Support keyboard activation, visible focus, announced demo results, and narrow-screen stacking.

## Verification scope

Run component interaction checks for the fictional flow, pause/reduced motion, navigation, owner login, and overview record integrity, plus the production build, type check, and available workspace checks. Browser verification requires a connected browser: the supplied browser-control tool currently reports no browsers and `Browser is not available: iab`. Do not describe component tests or generated counts as rendered visual approval.

The first implementation used the stale local `main` at `8960a1b`. The feature branch is now based on the already-merged portal at `04e366f` (`origin/main`), with the playful changes preserved and reapplied. The approved shell, Customers area, isolated design preview, and retrieval/impact/handoff tooling are restored. Finance keeps the current shared `PageHeader` and lazy tab loading; its character uses the header's actions slot. See the companion QA report for current checks and remaining native-integration limits.
