# Appearance architecture through the 35-point checkpoint

The requested commit adds an OxFin finance application. None of its 31 added files is a 3D addition. Its 1,731 deletion entries and two workspace replacements are excluded. The user's clarified scope is 3D only. The [machine-readable review](data/commit-68218b4-scope.json) records this decision; no cherry-pick or reset is required.

The 20-to-30 increment completes the unfinished local hair and freckle modules on GrowthTrack's current meshes. These are two five-point runtime/customization checkpoints in the existing planning budget. Thirty points do not certify 30% of the source sculpt, anatomical accuracy, photorealism or the v3 authoring specification.

The next five-point checkpoint adds an accessible Face-tab eye editor, procedural iris pigment/detail, fixed pupils and an optional response to the renderer's scene exposure. As with the earlier checkpoints, these are implementation planning points, not an anatomical or photorealism score.

## Saved data flow

```mermaid
flowchart TD
    Config[appearanceDetail.json: defaults, bounds, shades, styles, pattern settings] --> Controls[HairDetailControls / FreckleControls / EyeAppearanceControls]
    Controls --> Context[HumanoidViewer: Current or Goal context]
    Context --> Draft[Owner-scoped draft and debounced ordered save]
    Draft --> Profile[metricsToBodyProfile: existing supported columns]
    Draft --> Targets[appearanceMetrics + goalMetrics JSON]
    Profile --> BodyAPI[Authenticated /api/body-profile]
    Targets --> TargetAPI[Authenticated /api/physique_targets]
    BodyAPI --> Database[(SQLite / Prisma)]
    TargetAPI --> Database
    Database --> Hydrate[/api/state: owner profile and physiqueTargets]
    Hydrate --> Clones[Current / Goal clone metrics]
    Context --> Clones
    Clones --> Resolve[Bounded appearanceDetail resolvers]
    Resolve --> Hair[Hair cards + matching depth/distance cutouts + scalp coverage]
    Resolve --> Skin[Physical skin shader: seeded rest-space pigment]
    Resolve --> Eyes[Rest-surface iris and pupil uniforms]
    Exposure[Actual renderer exposure] --> Pupil[Bounded pupil response]
    Pupil --> Eyes
    Hair --> Scene[Live Three.js scene]
    Skin --> Scene
    Eyes --> Scene
    Scene --> Capture[Existing guarded high-resolution PNG capture]
```

Current values use `physiqueTargets.appearanceMetrics`. Goal values use `physiqueTargets.goalMetrics`; absent Goal properties inherit Current in the live comparison renderer. `User.physiqueTargets` is the existing database JSON string column, written for the authenticated owner. Existing `BodyProfile.hairDensity` and `BodyProfile.skinFreckleDensity` remain populated through the supported mapping. Cosmetic layers and seeds do not become measurement columns or general check-in history. No schema migration or production database rewrite is needed.

| Property | Meaning | Storage |
| --- | --- | --- |
| `hairColor`, `hairStyle` | Selected shade and available asset style | Existing body-profile mapping and appearance/goal JSON |
| `hairDensity` | Retained card coverage, with matching scalp opacity | Existing current body-profile column and appearance/goal JSON |
| `hairGrey`, `hairSeed` | Fraction of silver strands and stable pattern identity | Appearance/goal JSON |
| `skinFreckleDensity` | Cosmetic pigment density | Existing current body-profile column and appearance/goal JSON |
| `skinFreckleSizeMm`, `skinFreckleContrast`, `skinFreckleSeed` | Radius bound, contrast and stable pattern identity | Appearance/goal JSON |
| `eyeColor`, `scleraColor`, `irisLimbalRing` | Iris pigment, existing sclera tint and optional dark iris rim | Existing body-profile mapping and appearance/goal JSON |
| `eyePupilMode`, `eyePupilSizeMm` | Fixed cosmetic pupil diameter or scene-exposure response; the fixed value is retained while automatic response is active | Appearance/goal JSON |
| `eyeIrisDetail`, `eyeSeed` | Iris fibre/collarette detail and stable pattern phase | Appearance/goal JSON |

`src/config/appearanceDetail.json` holds application definitions, not a user's selected values. The resolvers clamp numeric values, reject nonnumeric/boolean/object inputs and bound integer seeds. Missing values retain the previous full-density hair, zero greying and no procedural freckles. Existing authored skin pigment remains part of the source atlas.

## Renderer ownership and stable patterns

Each comparison clone owns its materials and uniforms; shared GLTF textures are retained and never recoloured in place. Hair greying and thinning use integer hashes of the saved seed and rest UV columns. The visible material, directional-light depth material and point-light distance material share the cutout uniform. Removed strands therefore stop casting shadows. Scalp opacity follows density and its shade blends towards the configured silver colour. Changing density does not author a different hairstyle or hair length.

Freckles use three projections of rest positions in glTF metres, weighted by the rest normal and existing skin-exposure mask. Integer hashes select jittered centres, radius and ellipticity. Neighbour-cell sampling avoids clipped marks at cell edges. The pattern stays attached as morphs and bones deform the body; it does not depend on the animation clock, screen coordinates or device identifiers. Pixel derivatives fade unresolved marks at a distance. This is artistic pigment on the current assets, not the planned authored Poisson-disc/region-mask pipeline. There is no new texture download or additional render pass; enabled freckles do add fragment work, which has not been benchmarked on reference mobile GPUs.

The skin layer multiplies diffuse pigment independently of base tone, tan history, flush, undertone, normal maps and roughness. Hiding freckles changes only their density. Resetting tan/flush/undertone retains freckles, just as it retains the chosen base colour. Feature materials and their shadow materials are disposed by their owning clone; shared maps remain owned by the loader.

The existing draft/save system preserves edits during delayed hydration, serializes writes, rejects obsolete session work and exposes retry on failure. The hair tab now uses the same selected Current/Goal context as skin. Captures render these same scene materials through the existing capture guards and colour pipeline.

## Eye rendering and capture

`eyeAppearance.js` validates saved colours, mode, boolean rim, detail, seed and diameter using definitions in `appearanceDetail.json`. `EyeAppearanceControls` uses those same definitions. The visible Face tab edits the selected Current/Goal context. The earlier settings-drawer eye colours remain compatible; saved `eyeColor` still maps to the same database column.

`deriveEyeFrames` separates the paired eye geometry at its actual rest bounding-box centre. It derives each iris centre from the forward cap and its scale from that eye's bounds. Shader coordinates attach to the rest mesh before morph and gaze transforms, so the pupil/iris follows the deformed globe. No fixed world head position, camera-pixel mask, UV rewrite, new GLB, texture download or additional draw pass is introduced. This frame convention targets the bundled forward-facing paired eye meshes; a differently oriented future asset needs its own verified frame convention.

The existing wet physical material and authored maps remain owned by their previous loader. The iris patch uses the selected linear pigment, derivative-filtered radial detail, a collarette and an optional limbal ring. Its phase derives from the saved integer seed. The source sclera texture remains outside the iris. This is partial A3 on the current geometry; it does not author a separate corneal shell, wet line, pupil aperture or calibrated eye asset.

Fixed mode defaults to the JSON-defined cosmetic diameter. Exposure mode reads `renderer.toneMappingExposure`, using the viewer's existing exposure limits, and contracts from the configured maximum to minimum pupil diameter as exposure increases. Exponential convergence is independent of normal frame rate; frame stalls are bounded. Reduced motion, measurement inspection, paused playback and capture settle immediately. Exposure is an artistic viewer setting, not a measurement of scene illuminance or a medical response model.

`freezeEyePupil` synchronously settles the current exposure's pupil before a protected image is rendered, then restores both the previous diameter and target. It composes with the existing idle-pose capture guard. Tests also cover PNG encoding failure, so a failed capture cannot leave the live transition overwritten. Each comparison clone owns independent eye uniforms and response state.

## Reproduction and remaining gates

The subsequent 50-point checkpoint adds saved poses and camera views to the same owner-scoped `viewerPreferences` database path. See [pose and camera architecture](10-pose-camera-architecture.md) for rig-frame IK, neutral views, capture composition and the bounded head/neck skin-weight repair. The source asset files and appearance choices remain preserved.

Run from `growthtrack-ultimate`:

```powershell
npm.cmd exec -- vitest run src/lib/appearanceDetail.test.js src/components/physique/AppearanceDetailControls.test.jsx src/store/__tests__/appearanceDatabase.test.js --maxWorkers=2
npm.cmd exec -- vitest run src/lib/eyeAppearance.test.js src/components/morphEngine/eyeMaterial.test.js --maxWorkers=2
npm.cmd exec -- playwright test --config playwright.milestone-review.config.ts
npm.cmd run test:human-spec
npm.cmd run typecheck
npm.cmd run build
npm.cmd run validate:glb
npm.cmd run check:assets
```

The combined browser suite covers all seven checkpoints: measurement entry; five skies; authored map retention, eyelid closure and idle motion; tan history and save recovery; hair appearance; seeded freckles; and eye appearance/pupil response. It uses intercepted API fixtures and actual WebGL rendering. The separate database integration test exercises real store serialization, queued updates, owner separation and reconnecting to an isolated SQLite file through Prisma, including distinct eye settings and a saved false limbal-ring value. Its HTTP boundary is a test adapter; it does not claim a full production-server integration test. Neither fixture opens the owner's database.

The combined milestone configuration builds a separate production artifact under `.tmp/milestone-smoke-dist` and previews it on `GROWTHTRACK_SMOKE_PORT` (default 5177), with server reuse disabled. Its build uses `/` as the base path, matching the isolated browser fixture. Vite runs in the same process; global teardown closes only this localhost preview using a per-run random token. That endpoint exists only in this test script, never the production application or backend. This avoids reliance on restricted Windows process-tree termination and changes to normal `/Ultimate/` builds, shared development ports or finance entry points. The [35-point review record](data/milestone-35-review.json) contains current counts and scope limits; the [30-point record](data/milestone-30-review.json) retains the preceding checkpoint.

Strand geometry authoring, beard assets, authored freckles/moles/scars, calibrated optics, advanced face extremes, source sculpt/rig/texture changes and Safari/native-device performance remain open. The earlier v3 conformance audit is a historical baseline; no new conformance percentage is inferred from this checkpoint.
