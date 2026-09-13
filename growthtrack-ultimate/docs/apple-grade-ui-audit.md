# Apple-Grade UI Audit

## Baseline and scorecard

| Category | Before | Foundation | Target |
| --- | ---: | ---: | ---: |
| Clarity | 58 | 74 | 90 |
| Consistency | 42 | 68 | 92 |
| Performance | 64 | 76 | 90 |
| Accessibility | 61 | 75 | 92 |
| Trust and recovery | 68 | 82 | 92 |

## Representative findings

| Element | File | Issue | Severity | Resolution |
| --- | --- | --- | ---: | --- |
| Global tokens | `src/styles/*.css` | Multiple cascade layers compete for the final visual value. | High | Canonical generated semantic tokens now provide spacing, radius, motion, shadow, z-index, and target-size roles. |
| Raw buttons | `src/components/Calendar.jsx` and 78 other files | Per-control inline visual behavior is inconsistent. | High | Migrate feature actions to the shared button contract during feature passes; new work must use it. |
| Shared fields | `src/components/ui/TextField.jsx` | Good label/error contract exists, but raw controls bypass it. | High | Standardize field/select/date usage and preserve descriptions and validation announcements. |
| Wellness tabs | `src/components/WellnessCommand.jsx` | Tabs did not receive arrow-key navigation. | High | Uses shared keyboard tab handler. |
| Route loading | `src/App.jsx` | Spinner-only suspense fallback was not announced. | Medium | Status semantics and command-aware skeletons preserve context while content loads. |
| API responses | `src/lib/apiClient.js` | Malformed successful responses could be treated as data. | High | Reject malformed payloads with safe recovery copy. |

## Motion and loading contract

- Use `--gt-motion-fast` (160ms) for control feedback, `--gt-motion-standard` (220ms) for state changes, and `--gt-motion-emphasized` (280ms) for surfaces.
- Use `--gt-motion-spring` for transform and opacity only; never animate layout dimensions in response to user input.
- Skeletons match destination geometry. Progressive content order is heading, primary action, summary, then detail.
- Reduced motion disables decorative movement while preserving instantaneous state feedback.

## Security checklist

- Shared API client provides credentials, CSRF propagation, timeout, safe GET retry, and non-technical errors.
- Authenticated writes validate server-side and must use the shared client.
- Do not expose secrets in source, error copy, logs, or client telemetry.
- Treat external read-only integrations as untrusted data and validate before display.

## Rollback

The presentation changes are route- and data-model compatible. Removing the new token entry layer and density preference restores the prior presentation without touching feature data.
