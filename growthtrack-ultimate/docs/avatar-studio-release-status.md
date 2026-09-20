# Personal Avatar Studio — implementation evidence

## Implemented

- Height-required measurement editor with anatomical measurement guidance, explicit draft saving, reset and undo.
- Drafts use the authenticated owner's existing physique-target storage. Ordered persistence now propagates failures to callers.
- Baseline snapshots copy measurements, appearance fields, weights and asset version. Reload retains snapshot metadata; future edits do not mutate baseline values.
- Download body GLB evaluates the current mesh's morphs, skinning and transforms, removes live rig/morph bindings and normalizes stature to the entered height in metres. This is a static body export; custom runtime shader effects are not baked. Available in Current body / Anatomical mode and includes visible adult anatomy.
- Closed mesh-section extraction welds section endpoints without changing UV topology. Invalid/open contours yield no circumference. Fit results do not invent achieved measurements for uncalibrated assets.
- Blender source preparation imports the existing GLB, retains runtime topology, adds a hidden subdivision reference, produces neutral front/side/back renders and a hash manifest. The reference is NOT an artist-refined sculpt.

## Reproduce source review

Run Blender in background mode with `scripts/prepare-avatar-source.py`, passing `--input public/assets/models/humanoid-base.glb --output .tmp/avatar-studio-review` after Blender's `--` separator.

Outputs: `avatar-source.blend`, `source-manifest.json`, `front.png`, `side.png`, `back.png`. Local review artifacts stay outside the release asset channel.

## Release gates still open

- Reference render shows poor hair appearance, shoulder contours and visible external-anatomy attachment. This input does not meet the visual acceptance gate.
- Bundled MakeHuman 1.1.1 eye/hair proxy headers say AGPLv3; generated GLB claims CC0. Source-specific export licensing evidence must be established before promoting newly distributed assets. Do not assume a generated license label proves source rights.
- No verified anatomical landmark manifest, constrained fitting integration, or calibration fixture matrix yet. Section extraction alone is not anatomical calibration.
- No new sculpt, corrective rig, texture rebake, geometry LOD family or KTX2 release pipeline has been certified.
- No 20-minute performance benchmark or matching artifact comparison has passed.
- The candidate is not promoted and must not be described as photorealistic or calibration-certified.

The existing production assets and profile schemas remain compatible. Blender source preparation and cross-section unit tests are engineering evidence, not visual sign-off.
