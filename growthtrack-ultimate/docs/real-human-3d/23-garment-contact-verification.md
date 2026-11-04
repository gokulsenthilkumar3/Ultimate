# Garment contact and rig continuation

> Evidence availability: linked local artifacts are not included in this checkout. This historical record does not establish current rendered coverage. Use the [maintained architecture](../../../docs/ARCHITECTURE.md) and fresh scoped tests when assessing the current implementation.

Date: **27 October 2026**. This resumes the interrupted validation after the
[skin and eye continuation](22-portrait-tissue-and-eyes.md).

**Acceptance remains open: 147 of 150 garment cases pass.** The full matrix
completed and strict mode exited with status 1. Passing software tests does not
override these three geometry failures or establish visual acceptance.

## Runtime and contact checks

The preceding interrupted work added instance-owned rest-joint fitting,
pose-aware tee correction, compact exports with fitted joints, and explicit
solver-version adapters for saved documents. Shape-editing exports retain the
source rest rig and still need fitting after external shape/pose edits.

This continuation fixes an unstable contact sign at a shared surface feature.
For the shorter-body forward reach, mapping the solver result back through the
skin transforms changed world coordinates by at most 0.00012 mm. The old check
then switched between incident face normals and reported a negative signed
distance despite unchanged surface separation. The solver and verifier now use
the face normal inside a triangle, the sum of incident normals at an edge, and
angle-weighted incident normals at a vertex. Exact coincident UV duplicates
share these diagnostic normals. Mesh topology, positions and skin weights are
not modified by the normal calculation.

Regression coverage includes a known crease with duplicated seam vertices and
the actual canonical shorter-body reach after the inverse-skin round trip.
The full triangle intersection check and global **2 mm minimum clearance** are
unchanged. The **80 mm displacement bound**, all 30 body configurations, all
five poses, and hand/finger contact checks remain in place. Nearest-feature
signs are still local diagnostics, not solid classification for open or
self-intersecting body geometry.

## Completed matrix

[Full machine-readable evidence](../../../docs/evidence/ARTIFACTS.md#artifact-023)
contains all 150 cases and confirms that the shared source was unchanged.

| Failing case | Crossing triangle pairs | Body region | Minimum signed sample |
| --- | ---: | --- | ---: |
| `waist-wide/torso-flexed` | 92 | Torso/pelvis | -7.0204 mm |
| `belly-large/elbows-flexed` | 77 | Hands/fingers | +2.7311 mm |
| `heavy-wide-combination/torso-flexed` | 64 | Torso/pelvis | -7.4848 mm |

All three have a zero global triangle gap. The belly case illustrates why
positive sampled clearance cannot replace complete triangle intersection
checks. Its correction reaches the 80 mm displacement bound. The waist case
does not reach that bound but does not converge within 60 iterations.

Directional exit projection, alternative support-plane corrections and
displacement smoothing were investigated locally. None cleared all three cases
under the existing limits. Those experimental changes were removed; the
documented runtime retains the established normal and outward-plane attempts.
This does not prove that the poses are impossible to fit. It identifies the
remaining solver/garment work without excluding cases or weakening acceptance.

## Other validation and limits

- **1,274 tests across 185 files passed, with no failures or skips**; the final
  Vitest process exited with status 0 using four workers. The first sandboxed
  attempt could not see the installed headless Chromium runtime and failed two
  suite setup hooks. Running with browser-cache access resolved both setup
  failures without changing their tests or assertions.
- Typecheck, production build, targeted ESLint and release asset provenance
  checks pass. The existing large Three.js bundle warning remains.
- The two Chromium state/export/per-person flows passed, and the dedicated
  desktop visual flow passed with no WebGL error or context loss. Both exported
  GLBs have zero validator errors and warnings.
- The final desktop sample recorded p95 CPU identity evaluation of **12.5 ms**
  and input-to-two-frame-callback latency of **696.8 ms**. The CPU metric excludes
  garment fitting. The end-to-end latency is materially slower than the earlier
  skin/eye-only checkpoint and is not an interactive-performance acceptance.
  [Raw desktop evidence](../../../docs/evidence/ARTIFACTS.md#artifact-026).
- The inspected torso-combination front view remains a generic prototype.
  Hair finishing, likeness calibration, expressions, garment acceptance and
  physical Android verification remain open.

## Reproduction

From `growthtrack-ultimate`, with the installed Playwright browser runtime
accessible to the process:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=4
node node_modules/playwright/cli.js test --config playwright.parametric.config.ts
node node_modules/playwright/cli.js test --config playwright.parametric-visual.config.ts
node scripts/parametric-portrait/review-garment-matrix.mjs --strict
npm.cmd run typecheck
npm.cmd run build
node scripts/check-asset-provenance.mjs --release
```

The strict garment command currently fails intentionally because three cases
remain unresolved. Browser fixtures intercept APIs and do not write owner data.
No deployment, push or commit was performed.
