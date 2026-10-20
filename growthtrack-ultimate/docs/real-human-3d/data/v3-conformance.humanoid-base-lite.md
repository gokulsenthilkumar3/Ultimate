# GLB v3 conformance: docs/real-human-3d/data/glb-audit.humanoid-base-lite.json

Profile **core**: 4 of 10 required checks pass, 0 of 3 recommended checks pass.

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
| pass | must | Body mesh within 30,000 triangles (core) | 29,682 |
| n/a | should | Head mesh edges at most 3.5 mm | 6 mm |
| n/a | should | Hand mesh edges at most 2 mm | 6.6 mm |
| n/a | should | Skin texture density meets the tile minimums (head 90, hands 45, feet 35, body 30 texels/cm) | Head 5.8 < 90; Hand 2.6 < 45; Foot 2.4 < 35; Body 2 < 30 |
| n/a | must | A tiling micro-detail texture is present | absent |
| **FAIL** | should | Textures are KTX2 (GPU-compressed) | 10 of 10 are not |
| **FAIL** | should | Geometry is meshopt-compressed | KHR_materials_clearcoat |
| **FAIL** | must | File within 3 MiB (core) | 6.6 MiB |
