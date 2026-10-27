# Private anatomy: rendered surface and movement verification

Updated 2026-10-24. This continuation implements the user's request to finish the private anatomy first, using a generic adult male. It supplies actual geometry, textures, rigging, fitting/contact code and reproducible review fixtures. The family remains an opt-in candidate; numerical agreement is separate from lifelike appearance, clinical accuracy and physical-device acceptance.

## Browser-only finish pass, 2026-10-24

The user scoped the remaining device work to browsers. Physical Android/iOS testing is excluded from this pass and is not claimed as complete.

- The retracted skin fold has less relief and a ventral taper, while preserving separation between its outer and inner layers. The authored and runtime surfaces use the same contour.
- Both detail levels refine the local pelvic mesh and use a wider attachment collar. The six retained body assets keep their previous opening dimensions; the new collar requires its own refined topology.
- Pelvic atlas coordinates, colour and regional skin attributes now follow the same interpolation as the fitted geometry. Changing skin or diagnostic material updates a stationary figure, and shared diagnostic materials are not disposed by the attachment.
- The offline viewer exposes stable accessible field labels. Its length, width/depth, perimeter, skin/tanning, states, poses, reveal/hide, guides and detail switches are exercised in Chrome, Edge and WebKit on Windows.
- The additional motion matrix evaluates 420 outward/return samples, including joint-limit seated, spread, crossed-leg, stride and twist sequences in both detail levels. Every sample measures fit and checks actual body/shaft/sac triangle contacts, detail-layer separation and attachment-boundary residuals. Browser motion records also check every sampled frame instead of only the endpoint.

**Visual gate remains open.** The wider collar softens the rectangular attachment transition, but close-ups still show a join at the root and a pronounced crease beside the sac. The whole figure's hair and some contours remain visibly modeled. The candidate is movable and dimension-fitted; it is not a finished photorealistic sculpt. The numerical contact tests exclude the attachment collar and do not certify the collar against self-intersection or establish continuous collision detection.

The current runnable deliverable is `artifacts/human-r2/live-human-3d.html`, with both detail levels embedded for offline use. It includes live fitting and contact support. `generic-adult-complete.glb` and `.blend` provide the editable 79-joint figure. The source/asset ZIP includes the viewer, its build inputs and verification scripts. See `data/private-finish/finish-review.json` for the final run's exact assets and results.

## Deliverables

- `artifacts/human-r2/generic-adult-complete.glb`: complete adult, embedded PBR maps, 79-joint rig, body shape keys and native coverage shape. Standard uncompressed glTF, with the matching pelvic opening. This is an explicit private offline artifact, outside public assets.
- `artifacts/human-r2/generic-adult-complete.blend`: editable import of that exact combined GLB, with a visible full figure and shared armature.
- `artifacts/human-r2/human-r2-implementation.zip`: source/asset overlay for the existing repository, with an entry-by-entry SHA-256 manifest and read-back verification.
- The separately loaded core/hero public and private GLBs remain the application's runtime assets. Ordinary captures/exports retain the intact covered body.

The standalone GLB provides ordinary rig posing. Measured dimension fitting, pose-dependent contact support, state changes and protected loading run in the included application code; a generic GLB viewer does not execute those JavaScript correctives.

## Shape and surface work

The native surface includes a directional glans/corona, ventral tissue bridge, recessed urethral opening, outer/inner mobile skin and rolled rim, paired sac fullness, restrained left/right asymmetry, median raphe and irregular folds. Contraction strengthens fold relief. These are generic external anatomy and schematic internal guides, not a patient-specific internal reconstruction.

Each private package embeds its own neutral albedo, tangent normal and roughness/metallic maps: 512 pixels in core and 1024 in hero. The body atlas is not reused on unrelated tissue UVs. Regional colour and tanning propagate through the native binding. Inner skin receives a different roughness response. Texture resources are owned and disposed per parsed attachment.

Coverage details retain each authored vertex's original loft coordinate, follow the full control scaffold and then the shaft's exact rigid contact correction. Large excursions through a small local triangle produced a flap; the coordinate driver replaces that interpolation without creating topology. Close-up state renders and a 2.5 mm maximum layer-separation check cover this regression. Pelvic vertices use the authored two-outlet boundary graph, rather than a nearest-triangle approximation. Matched rendered boundary positions/normals prevent a second attachment transform.

The sac is attached to the pelvis, independently of thigh articulation. Leg motion is handled by actual posed-body contact. This corrects the inherited thigh weights that displaced the internal guides during sitting.

## Measurements and fitting

Closed sections are compiled from the rendered mesh's material coordinates and evaluated after native deformation, skinning and contact. The readout measures 41 centerline stations, middle width/depth/perimeter, base/distal perimeters and posed sac width/height/depth/hang. Guides for external section rings and the centerline now follow those rendered sections.

The fitter uses an internal copy and never rewrites a saved measurement to hide a residual. Numerical tolerance is 0.1 mm or 0.1%, whichever is greater. Explicit sac dimensions are fitted in the posed pelvic frame. Hang uses the actual upper body-attachment boundary as its reference, rather than a root point that changes when the shaft rotates. Contracted dimensions use the documented 0.82 presentation factor. In guide mode explicit sac dimensions are minimum bounds.

Both endpoint states retain independent measurements. Existing records already support length, middle width/depth or circumference, base/distal circumference, sac width/height/depth/hang/neck, separate guide dimensions, placement, tilt, padding and asymmetry; no invented owner measurements or unnecessary schema migration was added. Aperture dimensions and tissue optics remain generic authoring values. Bone-pressed and visible lengths have different origins and are not inferred from one another.

The posed guide check samples 324 padded points against the actual connected outer surface using a triangle BVH. Guide deformation follows the sac field, its final affine fitting and contact displacement. This remains a finite containment sample of schematic guides.

## Movement and contact

Contact uses posed triangle BVHs. The sac moves clear of leg/body crossings; shaft support rotates/translates the intact contour around its root. The exact pelvic web follows the moved outlets. Dimensions are remeasured afterwards. This is quasistatic support, not finite-element tissue dynamics, friction or a validated gait simulation.

The crossing test explicitly excludes the authored attachment collar (shaft material coordinate <=0.12 and sac UV <=0.64). Shared attachment topology is checked separately through boundary residuals. This exclusion is recorded in every result; it is not a claim of unrestricted whole-mesh self-collision safety.

The matrix contains 150 core/hero fixtures: neutral, seated, crouched, wide stance, left/right stride and twist; independent resting/erect dimensions; coverage/retraction 0/50/100; curvature up to +/-60 degrees; elevation extremes; short/tall scaling; body-morph endpoints; asymmetric sac dimensions; and contracted padded guides. Visible detail layers are checked for finite positions, body crossings and separation from the main surface. Results are in [surface-pose-matrix.json](data/private-finish/surface-pose-matrix.json).

Contact searches reuse a verified prior support solution during movement. Source vertices are evaluated once per update, unchanged pigment work is skipped, and boundary fairing weights are compiled once per attachment. Neither another clone's buffers nor public geometry are modified by fitting.

## Review and device evidence

The isolated generic-adult review page is `scripts/review-native-anatomy.html`. It provides seven angles, skin/clay/grazing light, endpoint/coverage controls, regional tanning and an animated pose sequence. It does not read owner records. The end-to-end app flow separately checks explicit reveal, measurement editing, hide/reload covering and private-request behavior.

Run:

    node scripts/build-human-realism.mjs --source
    node scripts/verify-private-anatomy.mjs
    node scripts/validate-human-family.mjs
    npm.cmd exec playwright test -- --config=playwright.native-devices.config.ts

Review images are under `.tmp/private-finish`; browser timing, renderer, memory, draw count and viewport records are under `data/private-finish/*-browser.json`. Android/tablet entries are viewport emulation on the Windows host. They are not physical Android/iOS benchmarks. The user selected an Android USB phone; Google's platform tools and an isolated Chrome/CDP runner are prepared in `scripts/verify-android-native.mjs`. No authorized device was detected by ADB at the recorded probe. The runner opens only its own generic-adult review tab, records the phone's renderer and frame times, closes that tab and removes its port forwards. Physical-phone testing requires the connected phone's USB-debugging authorization. Independent human visual acceptance and clinical validation are separate.

No finite fixture matrix establishes accuracy in every imaginable human position or from every possible angle. Inputs outside the tested range remain editable, with achieved dimensions/residuals shown rather than an unconditional accuracy claim.

Anatomical references used for the generic external organization: [OpenStax reproductive anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/27-1-anatomy-and-physiology-of-the-testicular-reproductive-system) and [Cleveland Clinic foreskin anatomy](https://my.clevelandclinic.org/health/body/23175-foreskin). These references do not validate the mesh's measurements or optics.
