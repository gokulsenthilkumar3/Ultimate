# Asynchronous garment fitting and editable joints

Date: **27 October 2026**. Continues the interrupted work after
[garment contact verification](23-garment-contact-verification.md).

**Desktop editing responds within the 100 ms target in this sample. Garment
acceptance remains open at 147/150.** The expanded proxy candidate did not pass
the three problem cases and is not used by the live editor. No additional
garment has been added.

## Responsive editing

The existing contact solver already used `three-mesh-bvh` for nearest-surface
and triangle queries. The architectural change moves that solver to a module
worker. One solve runs at a time; an 80 ms debounce coalesces queued edits to
the latest revision. Stale results never replace the current garment. The
previous completed garment geometry remains visible while a new fit is
pending; the tee stays hidden until the first valid fit.

The editor exposes a fitting state and a failure message. Compact GLB/package
exports wait for the current revision and reject a failed or superseded fit.
The shape-editing profile remains an offline approximation and explicitly
requires refitting after external shape or pose edits. Worker failures do not
fall back to blocking the main thread, and later exports fail promptly if the
worker has stopped. Closing the editor terminates its worker and rejects any
pending export wait.

[Desktop evidence](../../artifacts/parametric-visual/desktop-active-editing.json)
records 20 nose edits followed by 20 waist edits on the textured figure:

| Measurement | Result |
| --- | ---: |
| Nose input to two frame callbacks, p95 | 57.7 ms |
| Waist input to two frame callbacks, p95 | 50.9 ms |
| Final worker solve | 492.5 ms |
| Final fit minimum triangle gap | 2.2 mm |

The previous desktop sample was 696.8 ms p95. These new response measurements
exclude waiting for the worker; the geometric solve itself is still costly.
An already running obsolete solve finishes before the newest queued solve
starts. Failed extreme fixtures take roughly 14–24 seconds in the offline
matrix, so the architecture does not establish fast fitting for every case.
The tests wait for the latest successful fit before screenshots and check
that the fitting indicator clears. There was no WebGL error or context loss.
This remains a short desktop sample, not a sustained GPU, Android or likeness
certification.

## Editable export repair

Both GLB profiles now carry rest joints fitted to the selected identity. The
full editing profile retains all named morphs and their selected weights.
Its temporary selected-body evaluation packs XYZ using attribute accessors:
the pinned GLB uses interleaved positions, so copying the backing array as
packed positions corrupted joint locations. A regression checks every joint
position and inverse bind against the live fitted identity for combined
height, shoulder and waist edits. The shared source remains unchanged.

Further shape changes in Blender still require joint and garment fitting;
export metadata and the UI state that limitation. Both exported GLBs pass the
glTF validator with **zero errors and warnings**.

## Expanded body and hand proxy experiment

[Reproducible candidate evidence](../../artifacts/parametric-portrait/garment-proxy-experiment.json)
uses posed convex body parts expanded by 3 mm. Every source triangle belongs
to a part; palms, forearms and individual fingers have separate proxies.
Hand parts can select an exit side independent of the torso's outward normal.
The experiment uses the same canonical shapes, poses and authored tee, with
an 80 mm displacement bound. Full source triangle checks remain independent.

| Case | Crossing pairs | Global gap | Minimum signed sample | Accepted |
| --- | ---: | ---: | ---: | --- |
| Neutral / A-pose | 0 | 3.2980 mm | +3.5152 mm | Yes |
| Waist wide / torso flexed | 0 | 3.2766 mm | -19.6981 mm | No |
| Heavy wide / torso flexed | 0 | 3.4050 mm | -18.9189 mm | No |
| Belly large / elbows flexed | 164 | 0 mm | -30.6798 mm | No |

The two torso cases satisfy the proxy constraints and eliminate triangle
crossings, but still fail signed surface diagnostics. Those local signs are
not a watertight inside/outside classifier for a folded or self-intersecting
body. They have not been removed from acceptance. The hand case remains a
real intersection failure. Conservative convex parts can leave insufficient
space between appendages and the torso; this candidate's failure does not
prove that no valid garment fit exists. Proxy separation alone is not a
production fit, and the prototype has not received visual approval.

The live solver therefore retains its existing geometric behavior. The full
[150-case matrix](../../artifacts/parametric-portrait/garment-matrix.json)
was rerun through the shared typed-array solver boundary and again passed
**147/150**, with the same 92, 77 and 64 crossing-pair failures. The source was
unchanged, and strict mode correctly exited with status 1. The 2 mm global
clearance gate, all poses, hand/finger checks and displacement limits remain
in place. Wardrobe expansion stays gated on 150/150 and visual acceptance.

## Validation

- Targeted tests cover queue coalescing, obsolete results, failed exports,
  worker failure, disposal, transferred buffers, retained garment geometry,
  proxy enclosure, UV duplicates, displacement limits and fitted export rigs.
- Both Chromium state/export/per-person flows and the expanded desktop visual
  flow pass. Typecheck, production build, targeted ESLint and release asset
  provenance checks pass. The build includes a separate garment worker bundle;
  the existing large Three.js bundle warning remains.
- **1,282 tests across 187 files pass, with no failures or skips.** The first
  sandboxed run passed 1,271 tests, but two layout setup hooks could not access
  the installed headless browser, leaving 11 tests unrun. The final run with
  browser-cache access completed all tests without changing their assertions.

From `growthtrack-ultimate`:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=4
node node_modules/playwright/cli.js test --config playwright.parametric.config.ts
node node_modules/playwright/cli.js test --config playwright.parametric-visual.config.ts
node scripts/parametric-portrait/review-garment-matrix.mjs --strict
node scripts/parametric-portrait/review-garment-proxies.mjs --strict
npm.cmd run typecheck
npm.cmd run build
node scripts/check-asset-provenance.mjs --release
```

Both strict geometry commands currently return failure. Browser fixtures
intercept APIs and do not write owner data. No commit, push or deployment was
performed. Hair finishing, expressions, calibrated likeness, garment
acceptance and physical Android verification remain open.
