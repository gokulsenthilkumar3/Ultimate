---
name: TransformationPredictor bug fix
description: Documents the undefined variable bug fixed in TransformationPredictor and the upgrade pattern used
---

# TransformationPredictor — Bug Fix & Upgrade Notes

## The bug
`totalCycleDays` was referenced in the velocity fallback path (when velocity === 0) but was never defined anywhere in the file. This caused a `ReferenceError` every time a metric had zero velocity (common for new users with sparse data).

**Fix:** replaced with `DEFAULT_CYCLE_DAYS = 90` constant at module scope.

**Why:** using the full 90-day horizon as the denominator for the fallback velocity estimate produces a conservative (slow) projection, which is safer UX than crashing.

## Upgrade pattern
The component now supports three views toggled by tab buttons:
- `cards` — per-metric cards with expandable 6-week sparklines
- `radar` — RadarChart showing % progress toward each target
- `timeline` — stacked per-metric line charts with target reference lines

**How to apply:** any new metrics added to the `METRICS` array at the top of the file automatically appear in all three views.
