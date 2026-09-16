# UX upgrade verification — 17 September 2026

This is an implementation progress record, not acceptance of the full redesign.

| Area | Result | Evidence / limitation |
| --- | --- | --- |
| Ultimate build | Passed | `npm --prefix growthtrack-ultimate run build`; vendor chunks exceed the existing warning threshold. |
| Ultimate tests | Passed | Final full run: 218 tests across 31 files. |
| WebGL gate | Passed unit/component checks | Unavailable, blocked, lost and working contexts; resource cleanup; failed/successful retry. Real-browser GPU/context-loss testing remains pending. |
| New renderer code lint | Passed | Targeted ESLint on renderer, capability helper, geolocation hook, and new tests. |
| Gateway | Passed | 3 existing routing/registry/health tests. Full security acceptance scenarios remain pending. |
| Shared adapters | Passed | `npm run design:check` verifies all five generated adapters. |
| Family Connect frontend | Passed | Production build and its TypeScript build check. Large tree chunk remains. |
| OxFin | Blocked | Missing `src/lib/billParser` prevents build. Obsolete wallet security-helper import paths were corrected. |
| FinSync web | Pending | No product-local dependency installation; workspace dependency resolution/build still needs verification. |
| Equity/NiftyLens | Pending | Dependencies and lockfile were absent at inspection. |
| Forex | Pending runtime verification | Local CSS adapter loaded; Python/Streamlit runtime checks remain. |
| Browser/accessibility | Pending | No claim of visual, keyboard, contrast, login, CRUD, or handoff acceptance yet. |

## Development restart requirement

The workspace launcher reuses healthy processes by design. After changing server,
middleware, or Next.js source, stop the existing processes and run
`npm run dev:all` again; otherwise HMR can continue serving an older compiled
module and show stale stack traces.

## Delivered in this increment

- WebGL2 capability check before loading the physique canvas, 2D fallback, renderer boundary, and explicit retry.
- Projects icon DOM-property fix; quiet optional analytics initialization.
- Explicit weather-location buttons; passive diagnostics/settings no longer prompt for GPS.
- Generated framework-independent semantic styles consumed locally by each companion product.
- Common recovery-state vocabulary without unsupported assurances about offline data persistence.

## Remaining implementation

Complete route-by-route visual migration and component adoption, advanced AI/Logs/Apps Hub work, full physique enhancements, compatible Three dependency upgrade, framework-specific companion shells, security and persistence integration tests, browser acceptance, performance optimization, and CI coverage. The generated token adapters are foundations, not complete companion redesigns.
