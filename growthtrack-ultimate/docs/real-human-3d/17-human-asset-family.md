# Generic adult human: R2/I2 implementation record

Updated 2026-10-24. The user approved proceeding with the 3D implementation, actual GLBs and code. The target is a lifelike generic adult human. This delivered family is an **opt-in candidate**; software tests and approval do not certify lifelike appearance. The [private-surface completion record](18-private-anatomy-finish.md) supersedes the original scaffold-only measurement and contact status below.

## Actual deliverables

| File in public/assets/models | Purpose | Payload | Body / rendered tissue triangles |
| --- | --- | ---: | ---: |
| humanoid-human-r2-core.glb | Public core body, eyes, nails and new scalp groom | 1.92 MB | 29,682 body |
| humanoid-human-r2-hero.glb | Hero with conforming head, hand and foot refinement | 4.29 MB | 87,090 body |
| humanoid-human-r2-private-core.glb | Separate native tissue package and dedicated maps | approximately 1.1 MB | 7,232 tissue |
| humanoid-human-r2-private-hero.glb | Hero native tissue, maps and a separate binding/body hash | approximately 2.0 MB | 14,376 tissue |

Public binaries contain no private meshes, nodes, orphaned accessors or private binding metadata. The transparent control scaffold in private packages is not counted as rendered tissue. All six retained GLBs are byte-for-byte intact.

The sculpt recipe changes torso/joint planes and adds restrained asymmetry on the pinned CC0 foundation. It is not a scan. Hero subdivision preserves original vertex IDs and transfers all skin/morph attributes; shared-edge refinement avoids T-junctions. Both bodies retain 79 joints and 58 named body morphs. The new swept ribbon groom has 240 core / 640 hero roots on actual scalp triangles, with offsets transferred in triangle frames. The GLB corneal material now matches the application's restrained dark wet film, replacing the exported white-looking plate.

Generic iris/pupil pigmentation is baked into the eye vertices for standalone GLB/DCC viewing; it no longer relies on the live shader to correct the old eye atlas. The app still provides dynamic eye colour and pupil controls. This remains a rendering approximation, not calibrated corneal/iris optics.

The editable scene is artifacts/human-r2/human-r2.blend. It includes the hero shape keys, groom, eyes/nails and separately hidden private surfaces/scaffold. The accompanying human-r2-blender-roundtrip.glb is an actual Blender import/export probe, not the shipping asset. human-r2-oblique.png records its source render. Source rendering and the live material pipeline can differ; visual agreement remains a review item.

## Application and native asset behavior

Open **Wellness → Physique → 3D Mirror → Model tools → Try human realism preview** on a male body preset. **Use reviewed model** restores the retained choice. The Profile model-version selector also accepts human-r2. HIGH loads hero; other tiers load core. This uses existing profile fields without a database migration or owner-data rewrite.

The editor discovers the matching private package without fetching it. Saved adult eligibility, a matching asset/body declaration and explicit Anatomical mode are required before fetching. Responses are SHA-256 checked and use the bundled local Meshopt decoder. Hiding, body/LOD changes and unmount cancel requests; late parsed scenes are disposed. Failure retains the intact public body and displays a retry explanation. Hashes version public/private URLs.

The native adapter evaluates authored offsets through live triangle frames. The existing centimetre/state solver drives an invisible scaffold and bypasses createAnatomyTissues for native rendering. Rendered positions are post-skin body-local and are not skinned twice. Each Current/Goal figure owns its geometry and rig buffers. A private package must match the exact public body hash and LOD.

Private GLBs also contain ordinary interpolated skin weights for standalone viewing and DCC posing. The live adapter detaches that approximate skinning before applying its post-skin triangle frames. Blender source parts share the public rig. The private parser owns its resources, so reveal/hide cycles do not leave discarded geometry clones behind.

The pelvic opening has a synchronous visibility guard. Hiding or capture redaction restores the full public index immediately; public export uses that intact index even during reveal. Native coverage interpolates authored retracted/covered shapes. Dimensional readouts now measure the **rendered posed surface**, with explicit residuals. Quasistatic contact and a named extreme-pose/state matrix are implemented; unrestricted biological or collision accuracy is not claimed.

## Reproduce and evidence

Use the repository's pinned source caches/licences, installed Node dependencies and Blender 5.1.1. No new scan, paid asset or external decoder service is required.

    npm.cmd run humanoid:realism
    npm.cmd run humanoid:source
    npm.cmd run validate:human-family
    npm.cmd run check:assets -- --release
    npm.cmd test -- src/components/morphEngine/humanAssetFamily.test.js src/components/morphEngine/useNativeAnatomy.test.js
    node_modules/.bin/playwright.cmd test --config playwright.physique.config.ts tests/e2e/human-asset-family.spec.ts

BLENDER_BIN or --blender selects Blender. --source also creates the editable scene and export probe. Blender image tools resize textures without changing PowerShell execution policy. The complete binding GLB is retained in .tmp/human-r2; the DCC copy omits mixed scalar/vector custom streams because Blender 5.1's importer mishandles them. The regular Blender exporter is not a lossless replacement for the runtime packager.

The validator checks **decoded geometry**, since Khronos validation does not decode EXT_meshopt_compression itself. Every encoded view is decoded during the build: topology, weights, binding attributes and matrices must match exactly. Position/morph filtering in this build has maximum error 0.000954 mm, below the 0.1 mm ceiling. Bounds are recomputed after decoding. This is compression evidence, not sculpt or biological accuracy.

- [Build, topology and retained-source hashes](data/human-r2/asset-build.json)
- [Decoded validation and budgets](data/human-r2/validation.json)
- src/config/humanAssetManifest.json: exact runtime hashes
- public/assets/models/ASSET-PROVENANCE.json: component/source evidence
- artifacts/human-r2/blender-source.json: actual scene/export record

## Milestone status and remaining work

| Milestone | Delivered / remaining |
| --- | --- |
| M0 contracts | Candidate brief, fixed review setup, source hashes and actual binding/export experiment delivered. Complete reference/human review remains open. |
| M1 sculpt | Additive sculpt derivatives and true body LODs delivered. Finished regional sculpt fidelity and clay acceptance remain open. |
| M2 fitting/rig | Transferred shapes, isolated rig buffers and candidate vertex-plane metadata delivered. Anatomical landmark validation and native surface fitting remain open. |
| M3 face/eyes/mouth | Existing facial assembly retained; exported corneal film corrected. Replacement dental/eye anatomy and complete expression acceptance remain open. |
| M4 skin/optics | Inherited standard channels, colour/data handling and bounded texture conversion delivered. New calibrated maps, scattering experiments and regional strain detail remain open. |
| M5 hair/detail | New scalp groom LODs and existing attached brows/lashes/nails delivered. Close-up groom/material acceptance and remaining detail remain open. |
| M6 private tissue | Dedicated maps, layered surfaces, exact junctions and measured final-surface fitting delivered. Independent visual/clinical acceptance is separate. |
| M7 movement/contact | Pelvic attachment correction, posed triangle support and 150 fixture cases delivered. Unrestricted collision safety and tissue dynamics are not claimed. |
| M8 delivery | Separate loads, integrity, cancellation/disposal and actual payload/triangle budgets delivered. Physical-device GPU memory/p95/latency checks remain open. |
| M9 acceptance | Local software/browser/format evidence and editable source delivered. Independent human visual review and final promotion remain open. |

The family remains opt-in. No realism percentage or full-plan completion is assigned.
