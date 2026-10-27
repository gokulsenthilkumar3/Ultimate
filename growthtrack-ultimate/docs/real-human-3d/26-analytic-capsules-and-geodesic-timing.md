# Exact capsule colliders and cached geodesic projection

Date: **27 October 2026**. Follows
[the 149/150 classification pass](25-garment-classification-and-projection.md).

**The requested primitive and projection experiments are implemented, but
neither closes the belly/elbow case.** The production solver remains at its
last verified **149/150** result with **77 garment/body crossing pairs** in
that fixture. The new candidates stay offline; no second garment was added.
Wardrobe expansion still requires all 150 cases plus visual acceptance.

## What changed

`boneCollisionProxies.js` now has an explicit analytic profile. It uses curved
capsules for individual finger segments, palms and limb bones, with oriented
boxes for the torso/pelvis. A palm's longitudinal axis follows its finger
roots collectively. Each capsule's centerline and radius fit the assigned
skin corners in the selected identity and pose; no corner is excluded and
no radius is shrunk to manufacture clearance. The previous support-polyhedron
profile remains available for comparison.

`analyticGarmentColliders.js` tests whole triangles against capsule segments
and radii, rather than against a flat-sided enclosing polyhedron. It
explicitly handles a capsule axis piercing a triangle's interior, even when
the triangle's vertices and edges all miss the capsule. The pinned
`three-mesh-bvh` segment-distance helper checks endpoints and edges but does
not cover that piercing case by itself. Regression tests cover it, curved
versus polyhedral classification, complete skin enclosure, UV duplicates and
the displacement limit.

The offline fit uses exact contact queries followed by capsule tangent-plane
or box-plane corrections. Source-triangle intersections, minimum source gap
and exterior classification remain independent verification steps. The
comparison retains **3 mm fit expansion, 2 mm minimum final gap, an 80 mm
displacement cap and 80 correction iterations**. It does not modify the body
pose, hide the hands or omit intersecting triangles.

Two collider profiles were evaluated: all bone boxes/capsules, and a mixed
profile retaining the successful convex torso parts while replacing palms,
fingers and forearms with exact capsules. Each was also evaluated with the
graph-geodesic projection stage. All four configurations use the neutral
control and the same three problem fixtures.

## Geometric results

Numbers below are actual garment/body triangle-crossing pairs. Passing also
requires clearance, exterior classification and bounded displacement.

| Candidate | Neutral | Waist / flexed torso | Heavy wide / flexed torso | Belly / flexed elbows | Passed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bone boxes + exact capsules | 84 | 90 | 16 | 215 | 0/4 |
| Convex torso + exact appendage capsules | 0 | 0 | 0 | 142 | 3/4 |
| Geodesic + bone boxes/capsules | 84 | 88 | 16 | 215 | 0/4 |
| Geodesic + convex torso/appendage capsules | 0 | 0 | 0 | 142 | 3/4 |

The mixed profile improves on the earlier expanded convex candidate's 164
belly/elbow crossings, but remains worse than the current production
solver's 77. The all-box torso profile overconstrains the garment, including
the neutral control. Neither result supports replacing the production fit.
The caps remain conservatively fitted to skin; this does not rule out a
different body partition, more carefully authored colliders, or another
contact response.

The belly/elbow body has **158 nonadjacent body/body crossing pairs**, of which
**96 are hand/finger versus torso/pelvis**. These are separate from the
garment/body counts above. Both intersection classes exist simultaneously.
Calling the pose self-intersecting cannot remove the observed garment
crossings from acceptance. Likewise, the original torso outputs contained
real garment crossings; the 149/150 improvement required replacement
geometry, followed by an exterior certificate for its signed disagreement.

Capsules are themselves convex. Changing convex hulls to capsules changes
their shape and conservatism; it does not, by itself, prove a different solver
paradigm or an impossibility result for this fixture. The experiments do not
establish that 150/150 is unattainable under the current limits.

## Geodesic work and timing

The existing prototype already computed shortest paths on the reference mesh
and transferred local garment correspondence. This pass adds a stable
top-three candidate search without sorting every patch and caches distance
fields only while the intrinsic edge lengths remain unchanged within
0.0001 mm. Comparisons remain against the last computed metric, preventing
many small edits from accumulating unchecked drift. Shape/pose metric changes
invalidate the cache; rigid translation and repeated poses can reuse it.

Each of the four fixtures records a first projection and five repeated
projections from identical garment input. All cached projections reproduce
their first output exactly in the recorded samples. These are small Node CPU
experiments, not sustained browser or mobile measurements.

| Stage, across both geodesic profiles | Observed range |
| --- | ---: |
| Reference graph and correspondence preparation | 410–533 ms |
| First projection, including field checks/computation and relaxation | 28.9–67.7 ms |
| Repeated projection with cached fields | 12.5–33.3 ms |
| First fit: collider creation + first projection + contact correction | 262–1,677 ms |

Independent verification time is recorded separately and excluded from
`firstFitMs`. Projection alone leaves crossings in every fixture. A cached
projection sample below 20 ms therefore does **not** establish a complete fit
below 20 ms, a speedup for changing identities, or mobile readiness.

The [referenced geodesic paper](https://ir.lib.vntu.edu.ua/bitstream/handle/123456789/50204/189452.pdf?isAllowed=y&sequence=2)
reports its performance for a pipeline including intrinsic correspondence,
per-vertex energy minimization and separate continuous collision handling.
Our graph-edge prototype does not reproduce its full heat-chart,
optimization and collision pipeline. Its failure does not disprove that
paper, and the paper's timing does not prove a runtime ceiling for our
existing solver. A technical note with the DOI and these qualifications now
lives beside the solver imports in `garmentContactFit.js`.

The [ContourCraft authors](https://is.mpg.de/ps/en/publications/10-1145-3641519-3657408)
also treat self-penetrating bodies as a source of intersections that must be
resolved. This supports separating body and garment diagnostics; it does not
justify ignoring actual garment crossings.

## Reproduction

From `growthtrack-ultimate`:

```powershell
node scripts/parametric-portrait/review-analytic-colliders.mjs --strict
node scripts/parametric-portrait/review-analytic-colliders.mjs --hybrid --strict
node scripts/parametric-portrait/review-analytic-colliders.mjs --geodesic --strict
node scripts/parametric-portrait/review-analytic-colliders.mjs --hybrid --geodesic --strict
```

Every strict command correctly returns status 1. All fixtures retain source
integrity, complete source-face coverage and the original displacement bound.
Reports include each collider's dimensions, first/cached projection timings,
contact-fitting time, verification time and the independent acceptance fields:

- [Exact capsules with torso boxes](../../artifacts/parametric-portrait/garment-analytic-capsules.json)
- [Exact appendages with convex torso parts](../../artifacts/parametric-portrait/garment-hybrid-capsules.json)
- [Geodesic plus exact capsules/boxes](../../artifacts/parametric-portrait/garment-analytic-capsules-geodesic.json)
- [Geodesic plus mixed colliders](../../artifacts/parametric-portrait/garment-hybrid-capsules-geodesic.json)

The external shape-editing export limitation remains explicitly disclosed.
No production solver switch, wardrobe expansion, commit, push or deployment
was performed.

## Validation

**38 focused tests across 10 files pass**, including the exact-capsule
regressions, geodesic cache invalidation, original contact and proxy fits,
whole-surface matrix checks, worker queue behavior and attachment round trips.
Typecheck, production build and targeted ESLint also pass. The existing large
Three.js bundle warning remains. The 150-case production matrix and browser
flows were not repeated for these offline candidates; their previous results
are recorded in the linked 149/150 handoff. No candidate was promoted on the
basis of the four-case experiment.
