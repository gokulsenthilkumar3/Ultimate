# Digital Human Production and GLB/UI Quality Plan

## Current evidence

The current GLB is technically valid: 14,517 vertices, 26,756 triangles, 20 joints, 58 morph targets, and a gated private-anatomy mesh. The loader selects same-origin assets safely, clones skinned scenes correctly, maps morph targets, computes morph normals, and provides a capsule fallback. The reported “not human enough” problem is therefore primarily an art, topology, rigging, material, calibration, and presentation problem rather than a GLB transport failure.

## Target quality bar

- Believable neutral male, female, and neutral anatomical bases without exaggerated proportions.
- Facial silhouette, hands, feet, shoulders, pelvis, knees, and elbows remain human at rest and under deformation.
- Every supported measurement produces a visible, monotonic, anatomically plausible change.
- Skin reads as skin under all studio presets without wax, plastic, clipping, or crushed shadows.
- The same profile produces stable proportions across desktop, mobile LOD, current/goal comparison, screenshots, and timeline playback.
- Load failure is explicit and recoverable; the fallback is clearly identified and never mistaken for the calibrated model.

## Production phases

### 1. Reference and base mesh

- Establish licensed front/side/back references and percentile measurements for each base phenotype.
- Author clean quad topology with dedicated deformation loops around face, shoulder girdle, elbows, wrists, pelvis, knees, ankles, fingers, and toes.
- Keep body, eyes, teeth, hair, clothing, and gated anatomy as intentional meshes with documented ownership.
- Freeze transforms, real-world scale, coordinate orientation, mesh names, and neutral pose before morph work.

### 2. Rig and deformation

- Replace the minimum 20-joint rig with a production humanoid skeleton where required for hands, feet, spine, clavicles, neck, jaw, and eyes.
- Enforce four or fewer meaningful weights per vertex and validate normalized weights.
- Add corrective shape keys for shoulder raise, elbow/knee flexion, hip flexion, wrist/ankle bends, and extreme body-composition combinations.
- Create automated pose renders at neutral, 45°, 90°, and stress angles; reject pinching, volume loss, and self-intersection.

### 3. Morph authorship and calibration

- Sculpt all canonical body and facial targets against the same topology; keep shader-only values out of geometry.
- Measure morph output in world units and calibrate it against the source profile ranges.
- Test each target at 0, 0.25, 0.5, 0.75, and 1.0 plus representative multi-target combinations.
- Require monotonic measurements, bounded influence values, no vertex explosions, and no non-target anatomical drift.
- Add a calibration report mapping source metric, expected change, measured mesh change, tolerance, and pass/fail.

### 4. Skin, eyes, hair, and clothing

- Use physically based albedo, normal, roughness, subsurface/thickness, and optional micro-normal maps at appropriate resolutions.
- Calibrate skin tones under neutral lighting rather than tinting a single texture.
- Use separate cornea/iris/eye-white materials with correct depth and roughness; add brows/lashes where supported.
- Establish hair and clothing LODs, body clearance, clipping masks, and consistent shadow behavior.

### 5. Export and asset pipeline

- Export deterministic GLB files with embedded, compressed textures and stable node/morph names.
- Produce hero, medium, and mobile LODs from the same signed-off source file.
- Extend validation to check bounds, transforms, bone count/names, normalized weights, material slots, texture color spaces, morph order, morph displacement, NaN values, and private-mesh defaults.
- Remove the remote Draco decoder dependency by bundling the decoder or exporting an agreed compression format with a local decoder.
- Record source-file hash, exporter version, asset version, triangle count, texture budget, and validation result in a manifest.

### 6. Viewer integration

- Show explicit loading progress, asset version, GPU/LOD choice, calibration confidence, and actionable failure copy.
- Keep camera framing derived from model bounds and verify head-to-toe visibility for every body extreme.
- Pause rendering when hidden, cap device pixel ratio by GPU tier, and measure frame-time rather than relying only on device labels.
- Verify current/goal clones own independent morph arrays, materials, skeletons, clipping planes, and visibility state.
- Ensure reduced-motion mode disables nonessential camera and ambient animation.

### 7. Acceptance and promotion

- Automated: structural validator, morph coverage, measurement calibration, skeleton/weight checks, load/fallback tests, performance budgets, and deterministic screenshots.
- Visual: signed-off turntable, facial close-ups, joint stress poses, body-composition extremes, skin-tone matrix, clothing modes, current/goal comparison, and mobile LOD.
- Performance: define budgets for first model display, frame-time p95, peak GPU memory, GLB size, and texture memory on low/mid/high tiers.
- Promotion: keep V2 opt-in until every gate passes; then change the asset registry default in one reversible release switch.

## Definition of done

A model is not “perfect” because it passes the GLB parser. It is ready when a signed reference set, measurable anatomy tolerances, deformation stress renders, material review, accessibility behavior, and performance budgets all pass together on the exact exported assets shipped by the application.
