# GrowthTrack Ultimate — Portfolio and 3D quality plan

Updated: 2026-09-01

This is the working quality contract for the finance portfolio and digital-human
surface. “Perfect” is treated as a sequence of verifiable gates rather than a
visual promise: every phase has a measurable entry condition, a testable exit
condition, and a rollback-safe implementation.

## Current evidence

- The production build, 158 automated tests, authored GLB validation, lite GLB
  validation, renderer lint, and the 8/8 release quality gate pass.
- The authored model is structurally healthy (`14,517` vertices, `26,756`
  triangles, `20` joints, `58` morph targets). It is a safe renderer asset, but
  it is not yet the final human-grade art pass: facial topology, deformation
  examples, materials, hair, clothing, and side-by-side identity review still
  need explicit acceptance.
- The portfolio previously had UI controls without a backing store or server
  field. It now has normalized Zustand state, optimistic persistence, server
  validation, a migration, and keyboard-friendly add/edit forms.
- The browser preview reaches the private sign-in screen. No account data or
  credentials are available in this task, so authenticated flows must be
  verified with the owner’s test account during the release pass.

## Defect register

### Fixed in this pass

| Priority | Area | Failure | Correction | Proof |
| --- | --- | --- | --- | --- |
| P0 | Portfolio data | Add, edit, delete, refresh, and reload had no durable portfolio state. | Added normalized `portfolio` state/actions, `/api/portfolio` persistence, `/api/state` hydration, and a Prisma column/migration. | Store/API tests and authenticated smoke test. |
| P0 | Portfolio input | Empty, negative, non-finite, or unbounded quantities/prices could corrupt calculations. | Shared client/server normalization rejects invalid values, bounds lengths/counts, and returns clear errors. | Unit tests plus 400/413 API cases. |
| P1 | Portfolio keyboard UX | Enter did not submit add/edit forms; icon-only actions were not announced. | Real forms, submit/cancel types, tab semantics, labels, titles, and live refresh state. | Keyboard smoke test and axe scan. |
| P1 | 3D GPU lifecycle | Aura material was created inside JSX on every render, leaking shader resources. | Memoized aura material with lifecycle disposal. | React render loop check and WebGL resource review. |
| P1 | 3D appearance | Missing skin tone produced shader tone I while the material fallback showed IV. | One `resolveSkinTone` contract now feeds shader, authored material, and procedural fallback. | Morph mapping tests for missing, named, and numeric values. |
| P1 | 3D controls | Invalid camera/render/GPU values and NaN zoom/depth/divider/stress values could poison state. | Enum validation, finite-number guards, clamping, and zero-target progress handling. | Store tests for invalid inputs and edge progress. |

### Remaining issues to close deliberately

| Priority | Area | Risk | Planned resolution |
| --- | --- | --- | --- |
| P1 | Authenticated UI | The private sign-in state prevents end-to-end verification without a test account. | Run desktop/mobile smoke flows with an owner-provided non-production account; verify persistence after reload. |
| P1 | Asset fidelity | A valid GLB can still look generic or deform incorrectly. | Complete the deformation matrix and human review in Phase 1; do not promote on file-health alone. |
| P1 | Timeline integrity | Timeline scrubbing currently has a temporary store mutation path. | Make the scrubbed morph a pure render prop; never overwrite live “current” metrics. |
| P1 | Accessibility | The application has many dense modules and some legacy controls with incomplete labels/focus behavior. | Audit each authenticated route with keyboard, reduced motion, contrast, and axe; fix by route, not by blanket suppression. |
| P2 | Navigation | The large module count creates competing entry points (including finance/portfolio routing). | Keep one canonical Portfolio URL/tab and make redirects announce the destination. |
| P2 | Performance | Three.js and chart chunks are large; mobile GPU headroom is unknown. | Keep model/feature assets lazy, measure frame-time p95 by GPU tier, and enforce bundle budgets. |
| P2 | Observability | A fallback can hide an asset or mapping regression. | Surface renderer diagnostics, completeness, fallback reason, and context-loss recovery in owner-only diagnostics. |

## 3D implementation sequence

### Phase 0 — Contract and measurement (current gate)

1. Freeze the metric contract: units, legal ranges, appearance defaults,
   current/goal ownership, privacy consent, and missing-value behavior.
2. Freeze the asset contract: exact morph names, shader channels, bone names,
   material slots, texture color space, and supported model presets.
3. Add fixtures for empty, partial, extreme, and complete profiles. Every output
   must be finite, bounded, deterministic, and renderable without a GLB.

Exit gate: contract fixtures pass; no unknown morph name reaches a mesh; a blank
profile renders a neutral IV avatar without console errors.

### Phase 1 — Authored asset rebuild

1. Build male, female, and neutral source files in Blender/MakeHuman/MPFB from
   one clean, symmetrical base topology.
2. Preserve clean deformation loops at shoulders, elbows, wrists, hips, knees,
   ankles, jaw, lips, and eyelids. Apply scale and transforms before export.
3. Author the body morph matrix: composition, torso, shoulder, arm, lower-body,
   face, expression, corrective, and private channels. Test every key at 0 → 1
   and in representative combinations.
4. Use four bone influences or fewer per vertex, a named humanoid skeleton,
   neutral rest pose, PBR materials, UVs, and appropriately sized textures.
5. Export GLB with shape keys, skinning, normals, and animations. Keep an
   uncompressed source-of-truth asset and a web-optimized derivative.

Exit gate: `glb-health`, `validate-glb`, and the deformation matrix pass for each
model preset; no exploding vertices, flipped normals, Z-fighting, texture seam,
or incorrect zone response; identity review passes front/side/back/3-quarter.

### Phase 2 — Mapping, fallback, and timeline safety

1. Keep metric-to-morph mapping pure and versioned. Unknown or missing metrics
   use documented fallbacks and never produce NaN or `-1` shader indices.
2. Blend current and goal independently; appearance values inherit only where
   explicitly allowed.
3. Make timeline snapshots immutable render inputs. Scrubbing must not modify
   live measurements, persistence, undo state, or goal calculations.
4. Add property-style tests for monotonic ranges, bounds, fallback inheritance,
   and morph override isolation.

Exit gate: changing one measurement changes only its mapped channels and the
documented corrective channels; a timeline scrub followed by reload preserves
the live profile exactly.

### Phase 3 — Rendering and lifecycle

1. Select GLB by model preset and GPU tier; keep the procedural renderer as a
   visible, intentional fallback with a reason in diagnostics.
2. Use physically consistent skin, hair, cloth, eye, and private-surface
   materials. Dispose every generated material, geometry, texture, and post-FX
   resource on replacement/unmount.
3. Add the cinematic stack behind explicit quality settings: studio lighting,
   ambient occlusion/bloom where supported, exposure, tone mapping, and a
   reduced-motion analytic mode.
4. Recover from context loss, pause when hidden/off-screen, and preserve a
   usable 2D/sprite mode on unsupported devices.

Exit gate: no resource growth across 100 control changes; context-loss recovery
works; frame-time p95 is under 16 ms on HIGH, under 24 ms on MED, and under
33 ms on LOW; first meaningful avatar appears without a black/empty viewport.

### Phase 4 — Interaction and inclusive UX

1. Provide a clear Current/Goal model of the mental model, completeness status,
   and a non-blocking missing-data explanation.
2. Support keyboard camera presets, focus-visible controls, escape-to-close,
   logical focus return, touch-safe hit areas, and an accessible split divider.
3. Honor reduced motion and privacy defaults; keep intimate/anatomical layers
   consent-gated and never visible from a persisted stale flag.
4. Keep metric editing reversible with cancel/undo and announce saved,
   rejected, and fallback states.

Exit gate: a keyboard-only user can inspect, edit, cancel, undo, switch view,
and return focus; WCAG contrast and automated accessibility checks pass for each
3D panel and the portfolio module.

### Phase 5 — Release validation

- Run unit/integration tests, GLB health/validation, build, and renderer lint.
- Run authenticated Playwright smoke tests at desktop and mobile widths.
- Capture deterministic front/side/back/goal screenshots for visual diff.
- Check console/network errors, API validation errors, migration status,
  context-loss recovery, reduced-motion mode, and offline optimistic behavior.
- Record bundle sizes, model bytes, texture bytes, first-avatar time, frame-time
  p50/p95, and memory/resource counts by GPU tier.

Release gate: all P0/P1 items closed, no unexplained console errors, all phase
exit gates green, and a dated visual sign-off attached to the model revision.

### Phase 6 — Polish after correctness

Only after the gates above: authored hair and clothing variants, accessories,
goal celebrations, share/export snapshots, progress annotations, and cinematic
micro-interactions. These are enhancements, not substitutes for correct
measurements, safe persistence, accessibility, or stable rendering.

## Definition of done

The portfolio and 3D model are ready when a real owner can sign in, add and
edit a holding, reload without data loss, and use the 3D view with incomplete or
complete measurements; the avatar remains visually coherent across current,
goal, timeline, wardrobe, and fallback modes; the experience is keyboard,
reduced-motion, mobile, and context-loss safe; and the automated plus human
quality gates above are recorded against a specific commit and GLB revision.
