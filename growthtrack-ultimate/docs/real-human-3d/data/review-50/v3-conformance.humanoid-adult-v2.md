# GLB v3 conformance: glb-audit.humanoid-adult-v2.json

Profile **full**: 9 of 23 required checks pass, 0 of 5 recommended checks pass.

| Result | Level | Check | Detail |
| --- | --- | --- | --- |
| **FAIL** | must | Every v3 joint exists (core, face, arms and twist, fingers, legs and twist, toes) | missing core 1, face 6, arms 4, fingers 30, legs 6, toes 12 of 79 |
| pass | must | At most 100 joints | 20 joints |
| pass | must | At most 4 influences per vertex | 4 |
| **FAIL** | must | The 52 ARKit face blendshapes exist on the body mesh | 52 of 52 missing |
| n/a | must | Every face shape moves face vertices only (at least 98% inside the head, neck, jaw, eyes, tongue) | no face shapes to check |
| **FAIL** | must | Each body morph declares its region of influence (extras.growthtrack.morphRegions) | not declared |
| **FAIL** | must | Morphs carry joint offsets so the skeleton follows the shape (extras.growthtrack.jointOffsets) | absent |
| pass | must | At most 160 morph targets | 58 |
| **FAIL** | should | No morph target that moves nothing | d_length, d_girth |
| **FAIL** | must | The body mesh has TANGENT, _TILE, _REGION and _MICROSCALE | missing TANGENT, _TILE, _REGION, _MICROSCALE |
| pass | must | Body mesh within 120,000 triangles (full) | 29,682 |
| **FAIL** | should | Head mesh edges at most 3.5 mm | 6 mm |
| **FAIL** | should | Hand mesh edges at most 2 mm | 6.6 mm |
| **FAIL** | must | Skin texture density meets the tile minimums (head 90, hands 45, feet 35, body 30 texels/cm) | Head 23 < 90; Hand 10.3 < 45; Foot 9.5 < 35; Body 7.9 < 30 |
| **FAIL** | must | A tiling micro-detail texture is present | absent |
| **FAIL** | should | Textures are KTX2 (GPU-compressed) | 10 of 10 are not |
| **FAIL** | should | Geometry is meshopt-compressed | KHR_materials_clearcoat |
| pass | must | File within 28 MiB (full) | 22.9 MiB |
| pass | must | A mesh for eyes | GrowthTrackEyes |
| **FAIL** | must | A mesh for cornea | absent |
| **FAIL** | must | A mesh for tearline | absent |
| **FAIL** | must | A mesh for teeth | absent |
| **FAIL** | must | A mesh for gums | absent |
| **FAIL** | must | A mesh for tongue | absent |
| **FAIL** | must | A mesh for scalp | absent |
| **FAIL** | must | A mesh for nails | absent |
| pass | must | A mesh for hair | GrowthTrackHair |
| pass | must | A mesh for eyebrows | GrowthTrackEyebrows |
| pass | must | A mesh for eyelashes | GrowthTrackEyelashes |
