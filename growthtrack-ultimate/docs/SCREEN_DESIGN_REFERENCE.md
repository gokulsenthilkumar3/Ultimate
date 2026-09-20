# GrowthTrack Screen Design Reference

## Scope

This specification governs the screen-by-screen GrowthTrack redesign. Existing routes, hashes, records, calculations, persistence, authentication, drafts, and responsive behavior remain authoritative.

## Application shell — approved direction

- Architecture: Feature Stack, with a stable navigation frame and focused content regions.
- Visual language: light, calm SaaS; readable grotesk sans; cool accent used for state and action rather than decoration.
- Interaction: persistent orientation, clear current-section state, compact controls, visible focus, keyboard-complete navigation.
- Responsive behavior: desktop sidebar/frame, tablet condensed frame, mobile bottom/navigation surface without removing destinations.
- Rejected: oversized marketing hero treatment, decorative-only motion, dense dashboard chrome, low-contrast muted labels, and navigation that depends on hover.

## Accessibility and resilience

The implementation must preserve reduced-motion behavior, high-contrast support, keyboard access, loading/empty/error states, and WebGL fallback. Effects are optional and must never carry meaning alone.

## Review gate

A screen is not complete until matching desktop/tablet/mobile evidence exists and the relevant functional, accessibility, route, visual, and production-build checks pass.
