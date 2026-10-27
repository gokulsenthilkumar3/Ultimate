# Ultimate visual system

## Direction

The approved direction (27 October 2026) refines Ultimate’s calm editorial interface:
readable typography, quiet surfaces, semantic color and focused task layouts. Use
the existing editorial components and semantic tokens. Large decorative gradients,
glass effects and marketing-style page introductions are not the application default.
The screen-specific contract is in [Screen Design Reference](SCREEN_DESIGN_REFERENCE.md).

Every page has one primary heading and a clear primary action. Record pages lead
with their list or daily task, analytics pages identify the question and period,
and the 3D Mirror leads with Current/Goal comparison. Specialist controls use
contextual panels. A compact laptop layout must retain readable text and 44px
interactive controls rather than shrinking the entire interface.

## Tokens

The source of truth is `src/design/tokens.ts`; generated CSS lives in `src/styles/design-tokens.css`. Use semantic tokens such as `--gt-action`, `--gt-surface`, `--gt-text`, and `--gt-focus` rather than hard-coded colors.

The required interaction floor is 44px. Primary actions use `--gt-action`; destructive actions use `--gt-danger`. Each feature must work in light, dark, forced-color, and reduced-motion modes.

## Components

Use `Button`, `Card`, `Modal`, `TextField`, `SelectField`, `Tabs`, `Switch`, `PageState`, and `LoadingSkeleton` before introducing a local control. They provide accessible labels, visible keyboard focus, touch targets, loading/error states, and reduced-motion behavior.

## Motion

Use `--gt-motion-*` tokens. Motion explains spatial changes and feedback; it must never block input. Respect `prefers-reduced-motion`; avoid autoplaying decorative animation and use CSS-first transitions for standard UI.

## Accessibility checklist

- Keyboard focus is always visible.
- Dialogs trap focus and close with Escape.
- Color is never the only error/status signal.
- Inputs have associated labels and helpful error text.
- Charts provide textual summaries or accessible tabular alternatives.
- Interactive controls meet the 44px target minimum.
