# GLB v3 conformance: public\assets\models\humanoid-preview-75.glb

Profile **full**: 17 of 23 required checks pass, 0 of 5 recommended checks pass.

| Result | Level | Check | Detail |
| --- | --- | --- | --- |
| pass | must | Every v3 joint exists (core, face, arms and twist, fingers, legs and twist, toes) | all present |
| pass | must | At most 100 joints | 79 joints |
| pass | must | At most 4 influences per vertex | 4 |
| **FAIL** | must | The 52 ARKit face blendshapes exist on the body mesh | 52 of 52 missing |
| n/a | must | Every face shape moves face vertices only (at least 98% inside the head, neck, jaw, eyes, tongue) | no face shapes to check |
| pass | must | Each body morph declares its region of influence (extras.growthtrack.morphRegions) | declared |
| pass | must | Morphs carry joint offsets so the skeleton follows the shape (extras.growthtrack.jointOffsets) | present |
| pass | must | At most 160 morph targets | 58 |
| **FAIL** | should | No morph target that moves nothing | d_length, d_girth |
| pass | must | The body mesh has TANGENT, _TILE, _REGION and _MICROSCALE | present |
| pass | must | Body mesh within 120,000 triangles (full) | 29,682 |
| **FAIL** | should | Head mesh edges at most 3.5 mm | 6.4 mm |
| **FAIL** | should | Hand mesh edges at most 2 mm | 7.6 mm |
| **FAIL** | must | Skin texture density meets the tile minimums (head 90, hands 45, feet 35, body 30 texels/cm) | Head 22.2 < 90; Hand 13.8 < 45; Foot 15.1 < 35; Body 8.4 < 30 |
| pass | must | A tiling micro-detail texture is present | present |
| **FAIL** | should | Textures are KTX2 (GPU-compressed) | 12 of 12 are not |
| **FAIL** | should | Geometry is meshopt-compressed | KHR_materials_clearcoat, KHR_materials_ior |
| pass | must | File within 28 MiB (full) | 23.7 MiB |
| pass | must | A mesh for eyes | GrowthTrackEyes |
| pass | must | A mesh for cornea | GrowthTrackCornea |
| pass | must | A mesh for tearline | GrowthTrackTearline |
| **FAIL** | must | A mesh for teeth | absent |
| **FAIL** | must | A mesh for gums | absent |
| **FAIL** | must | A mesh for tongue | absent |
| **FAIL** | must | A mesh for scalp | absent |
| pass | must | A mesh for nails | GrowthTrackNails |
| pass | must | A mesh for hair | GrowthTrackHair |
| pass | must | A mesh for eyebrows | GrowthTrackEyebrows |
| pass | must | A mesh for eyelashes | GrowthTrackEyelashes |
