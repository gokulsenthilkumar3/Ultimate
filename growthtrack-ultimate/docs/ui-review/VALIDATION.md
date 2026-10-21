# Validation — 12 September 2026

| Check | Result | Evidence |
|---|---|---|
| Baseline shared component tests | 5 passed | Initial direct Vitest run before edits |
| Final unit/integration suite | 202 passed across 28 files | tests-final.txt; maxWorkers=2 |
| Initial final-suite attempt | 201 passed, one navigation test timed out at 5 seconds | tests-parallel-timeout.txt; retained for transparency |
| Production build | Passed; bundle-size warning remains | build-final.txt |
| Core changed files lint | Passed | Button, TextField, SelectField, Modal, DatePicker, ConfirmDialog, dialog hook, LoginPage, API client, message keys, regression suite |
| Extended legacy-file lint | Two existing-pattern errors; TSX file not covered by current ESLint configuration | lint-legacy.txt: JSX Icon false positive in Documents; colocated toast hook fast-refresh export rule; Tasks.tsx ignored |
| axe before | Contrast failures in all four login combinations | axe-login-before.json |
| axe after | Zero automated violations in all four login combinations | axe-login-after.json; 390/1440, light/dark |
| Layout checks | No horizontal overflow or sign-in/privacy-banner overlap in four login combinations | layout object in axe-login-after.json |
| Visual inspection | Mobile light screenshot reviewed before and after banner spacing correction | login-after-light-390.png |
| Git / PR check | Blocked by local object-read permissions; no commit or PR created | AUDIT.md migration section |

The 11 new regressions cover field descriptions, keyboard button activation, duplicate click prevention, date string preservation, nested Escape/scroll lock, safe initial confirmation focus, file-record failure recovery, curated server errors, non-retried writes and already-cancelled requests. There is no claim of exhaustive end-to-end coverage.

The browser tests use local Vite with mocked 401 responses for API calls. They do not access a real account or change backend data. axe incomplete results are retained, so zero violations does not imply complete accessibility conformance. No Lighthouse score was collected.

Reproduce from growthtrack-ultimate:

```text
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5178
node scripts/review-login.mjs after
```

Read AUDIT.md first, then COMPONENTS.md for APIs, COPY.md for remaining copy review, TOP-20.md for priorities, and inventory-after.md for source instance coverage. Do not regenerate the before snapshot from the modified tree.
