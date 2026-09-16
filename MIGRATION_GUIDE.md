# Ultimate UX upgrade migration guide

## For users

No data migration is required. Existing SQLite records, owner login, sessions, gateway routes, and standalone product launch URLs remain compatible. Refresh the browser after deploying the updated frontend to load the new visual layer.

## For contributors

- Build UI with semantic design tokens and shared primitives.
- Do not replace `/api/*`, `/auth/*`, gateway namespaces, CSRF handling, or signed handoff endpoints.
- Avoid feature-specific hard-coded colors, sub-44px actions, and animations without a reduced-motion fallback.
- Test light/dark themes, narrow screens, keyboard navigation, and offline/error states for changed screens.

## Verification

Run `npm run build`, `npm test`, and `npm run test:gateway` from the workspace root. Run individual product commands before changing their product registry or gateway contracts.
