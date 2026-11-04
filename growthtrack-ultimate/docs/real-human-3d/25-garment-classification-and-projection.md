# Garment classification and projection experiments

> Evidence availability: linked local artifacts are not included in this checkout. This historical record does not establish current rendered coverage. Use the [maintained architecture](../../../docs/ARCHITECTURE.md) and fresh scoped tests when assessing the current implementation.

Date: **27 October 2026**. Continues the interrupted follow-up to
[asynchronous fitting and editable joints](24-asynchronous-garment-fitting.md).

**The production solver now passes 149/150 fixtures.** A certified convex-part
fallback clears both flexed-torso cases. The hand/belly case still has **77
crossing pairs** and a zero global gap, so strict verification correctly fails.
No new garment has been added. The bone-collider and geodesic candidates stay
offline.

## Separate evidence for skin folds and garment contact

`body-self-contact.mjs` counts proper crossings between nonadjacent body
triangles separately from garment contact. Rest-pose counts are zero in all
four candidate fixtures. The flexed waist and heavy-body fixtures introduce
19 and 22 crossing pairs respectively; the flexed-elbow/belly fixture
introduces 158. These are explicit triangle-crossing diagnostics, not an
anatomical pose assessment or a claim that every negative signed sample is
caused by self-intersection. Shared vertices and point/coplanar touches are
excluded from these counts.

`proxyClassification.js` clips each entire garment triangle against every
closed, unexpanded convex body part. Testing only vertices would miss a
triangle spanning a finger. It verifies all source-face indices and assigned
triangle corners, finite indexed surfaces (including interleaved XYZ), finite
unit plane normals, and bounded halfspaces. A `watertight` flag alone is
insufficient: the plane normals must positively span three-dimensional space.
The result certifies exterior to this conservative proxy union. It does not
turn a folded source mesh into a valid anatomical solid.

The independent verifier retains negative signed samples in its report but
allows this certificate to resolve a disagreement. Actual body/garment
crossings and the global **2 mm triangle-surface clearance** remain hard
failures. Body self-intersection is reported independently and never excuses
garment crossings. Candidate acceptance also checks displacement from the
authored posed tee against the existing **80 mm** cap, allowing only 0.0001 mm
of floating-point tolerance.

## Candidate results

Each candidate was evaluated on the neutral control and the same three
problem fixtures, using the pinned source and authored tee. These are four
cases per candidate, not a replacement for the full 150-case matrix.

| Candidate | Neutral | Waist / torso flexed | Heavy wide / torso flexed | Belly / elbows flexed |
| --- | --- | --- | --- | --- |
| Expanded convex body parts | Pass | Pass | Pass | Fail: 164 crossing pairs |
| Bone boxes and capsule support polyhedra | Fail: 80 crossing pairs | Fail: 86 crossing pairs | Fail: not certified outside proxies | Fail: 263 crossing pairs |
| Corrected graph-geodesic projection plus convex contact | Pass | Pass | Pass | Fail: 164 crossing pairs |

For the expanded convex candidate, both torso cases have zero garment/body
crossings and no garment triangles inside any classification proxy. Their
global gaps are **3.2766 mm** and **3.4050 mm** despite signed nearest samples
of **-19.6981 mm** and **-18.9189 mm**. Every source triangle is enclosed in its
assigned part. The certificate therefore supports accepting these candidate
fits geometrically; visual acceptance is still open.

The original solver's torso outputs contain real crossings. They cannot be
reclassified merely by changing a sign test. The shared worker/offline solver
therefore tries the convex candidate only after both original contact attempts
fail. It accepts the replacement geometry only when the whole-triangle
exterior certificate, 2 mm source-surface gap and 80 mm displacement checks
all pass. Otherwise it restores the previous result and reports failure.

The full [production matrix](../../../docs/evidence/ARTIFACTS.md#artifact-023)
verifies these results after the inverse-skin round trip, using all 30 shapes,
five poses and original hand/finger checks. Both torso fixtures pass with
negative signed samples still present in the evidence. Only the belly/elbow
fixture fails; the shared source geometry and skeleton remain unchanged.
Numerical acceptance does not establish the fallback's visual quality. Failed
fits can still take many seconds inside the worker.

### Bone-attached primitives

`boneCollisionProxies.js` assigns every source triangle to its dominant bone.
Torso, pelvis and palms use bone-oriented boxes; arms and individual finger
segments use capsules conservatively represented by 26 support halfspaces.
Dimensions are fitted to every assigned triangle corner at the current shape
and pose. The fit uses a 3 mm expansion; independent classification uses the
same bone primitives without expansion.

This implementation does not shrink finger colliders or move them away from
their source skin to manufacture clearance. Its conservative support
polyhedra overconstrain the current tee and fail all four fixtures. In the
heavy torso case, zero source-triangle crossings and a 7.1490 mm gap still do
not establish exterior to the bone-proxy union. This particular primitive
and projection combination has not solved appendage contact; the result does
not prove that tuned capsules, cloth dynamics or another garment cannot fit.

### Graph-geodesic prototype

The prototype uses four landmark distance fields over reference-topology
edges, local candidate patches and three edge-length relaxation sweeps. It
does not connect a hand to the belly merely because they become spatially
close. It then runs the convex contact correction and independent verifier.

The interrupted implementation mixed an authored reference offset with a
different approximate chart correspondence. This moved even unchanged
triangle-interior anchors. The repair computes the reference residual using
the same neighbors and weights as the target correspondence. A regression
checks that an unchanged body under translation preserves those anchors and
UV duplicates. The neutral raw tee still needs contact correction.

In single Node CPU samples, field computation plus projection and relaxation
took **55.2–68.5 ms**. Including convex contact fitting took **291–2,271 ms**;
reference preparation took **393–537 ms** separately. Timing excludes proxy
construction and independent verification, and is not an Android or sustained
frame-rate benchmark. The projection by itself leaves crossings in every
fixture; collision correction is essential. It does not establish a speed
improvement over the convex candidate.

The [geodesic projection paper](https://ir.lib.vntu.edu.ua/bitstream/handle/123456789/50204/189452.pdf?isAllowed=y&sequence=2)
describes heat-based charts, geodesic barycentric correspondence, energy
minimization and a separate continuous collision handler, including a 2 mm
clearance claim. Our graph-distance prototype omits that complete solver and
collision handler. Its measurements neither reproduce nor disprove the
paper's reported sub-20 ms result. The paper assumes a closed manifold body;
this source's self-intersecting poses require separate handling.

## Export disclosure

The shape-editing export button has an accessible description explaining
that external shape or pose changes require joint/clothing refitting and
that the fitting solver is not included. Exported GLB metadata records the
selected-identity/rest-pose validity, invalidating changes and
`solverIncluded: false`. A round-trip regression verifies that these fields
survive GLB serialization and loading.

## Reproduction and remaining gate

From `growthtrack-ultimate`:

```powershell
node scripts/parametric-portrait/review-garment-classification.mjs --strict
node scripts/parametric-portrait/review-garment-classification.mjs --bone-colliders --strict
node scripts/parametric-portrait/review-garment-classification.mjs --geodesic --strict
node scripts/parametric-portrait/review-garment-matrix.mjs --strict
```

All three candidate commands correctly exit with status 1 because their
four-case sets are incomplete. Reports record source-file integrity,
per-case displacement, body crossings, source-surface clearance, proxy
classification and timing scope:

- [Expanded convex candidate](../../../docs/evidence/ARTIFACTS.md#artifact-019)
- [Bone primitives](../../../docs/evidence/ARTIFACTS.md#artifact-018)
- [Geodesic candidate](../../../docs/evidence/ARTIFACTS.md#artifact-020)

Wardrobe expansion remains gated on the actual production solver passing all
150 fixtures and visual acceptance. The immediate unresolved case is
appendage/torso contact under the current displacement and clearance limits.

## Validation

- **1,294 tests across 190 files pass in aggregate.** The full sandboxed run
  passed 1,283 tests; two layout suite setup hooks could not see the installed
  Playwright headless browser. Rerunning those two suites with browser access
  passed all 11 previously unrun tests without changing their assertions.
- Typecheck, production build, targeted JavaScript ESLint and release asset
  provenance checks pass. The existing large Three.js bundle warning remains.
  ESLint does not configure the TypeScript end-to-end test file; that file is
  exercised by Playwright.
- Both Chromium save/export and per-person/mobile flows pass. The export
  button's refitting description is verified after editor readiness; both
  exported GLBs have zero validator errors or warnings. The first run exposed
  a premature five-second assertion before the lazy editor loaded, and its
  sandboxed test-server cleanup stalled. The assertion now follows the
  existing editor-ready wait; the final run with process access exits cleanly.
- The full production geometry matrix completes **149/150**, confirms the
  shared source is unchanged and correctly exits with status 1. Neither its
  failed case nor any fixture was removed.
- The desktop visual flow passes without WebGL errors or context loss. The
  latest 20-edit samples record p95 input-to-two-frame-callback times of
  **66.7 ms for nose edits** and **65.2 ms for waist edits**. The final garment
  worker solve takes **564.5 ms**, separately from input responsiveness.
  [Desktop evidence](../../../docs/evidence/ARTIFACTS.md#artifact-026).
  Inspected standing views remain a generic prototype and do not certify the
  fallback's flexed-pose appearance, likeness or physical Android performance.

No commit, push or deployment was performed. Browser fixtures intercept APIs
and do not write owner data.

The software and browser checks can be repeated with:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=4
node node_modules/playwright/cli.js test --config playwright.parametric.config.ts
node node_modules/playwright/cli.js test --config playwright.parametric-visual.config.ts
npm.cmd run typecheck
npm.cmd run build
node scripts/check-asset-provenance.mjs --release
```
