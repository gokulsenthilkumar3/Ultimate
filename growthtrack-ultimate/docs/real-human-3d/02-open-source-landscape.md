# 02 · Open-source landscape: what exists, what we can use, what we must build

Question asked: *is there an open-source source for a human that looks real, or do we have to build it?*

**Finding: none of the candidates reviewed here has been verified as a drop-in asset meeting all of (a) redistribution terms suitable for this app, (b) its web payload/memory budgets, (c) the required body/face rig, and (d) the full-human visual acceptance checks.** This is a finding about the reviewed candidates, not proof that no suitable asset exists elsewhere.
Parts exist separately. The plan therefore **adopts data and tools where the licence is clean and builds the asset
ourselves where it is not**, which is also what the existing provenance policy
([`ASSET_LICENCE_RESOLUTION.md`](../ASSET_LICENCE_RESOLUTION.md), `npm run check:assets`) already requires.

Licence statements below were checked on 2026-10-20 against the sources linked at the end. Where a source could not be
confirmed, the row says so; **no row is a legal opinion**, and any "adopt" decision still goes through the repository's
asset-provenance gate before a file ships.

**2026-10-23 review:** [R2/I2](16-private-anatomy.md#research-plan-r2) expands the goal to a lifelike generic adult human. Anny, SMPL-family and MHR notes below were checked against current primary repositories/licence pages; unmentioned rows retain their earlier review dates. No new candidate was downloaded, adopted or benchmarked.

## Human body models and base meshes

| Candidate | What it gives | Licence (as found) | Decision |
| --- | --- | --- | --- |
| **MakeHuman 1.x base, targets and system assets** | The mesh, 73 targets, skins, eyes, hair proxies the app ships today | CC0 1.0 (recorded in `ASSET-PROVENANCE.json`, verified 2026-10-19) | **Keep.** It is the proportion engine and the provenance-clean starting point. |
| **MPFB2** (MakeHuman for Blender) | Authoring inside Blender with the same targets and rigs | Tool code GPLv3; exported assets retain their input/source rights. The pinned core MakeHuman inputs are CC0 | **Adopt as a tool.** Exporting does not erase a third-party input's terms. |
| **Anny** (NAVER LABS Europe) | MakeHuman-derived proportions/rigging and alternative topologies | Apache-2.0 code, CC0 MPFB/face-unit inputs; optional retopologies have distinct terms | **Evaluate, not adopt.** Current defaults use 104 bones versus the legacy 163-bone MakeHuman rig; pin conventions and verify eye/tongue/face channels explicitly. |
| **MHR** (Meta Momentum Human Rig) | Body/face shapes, multiple LODs and nonlinear pose correctives | Current official README declares Apache-2.0 for MHR; exact downloaded asset/notice files still need inspection before shipment | **Reference/candidate comparison.** No released archive was inspected or integrated here; its neural correctives do not become native glTF behavior automatically. |
| **SMPL / SMPL-X parametric models; SMPL-Body exports; STAR** | Parametric body/pose methods and, separately, exported body resources | The checked SMPL and SMPL-X model terms cover research uses; the defined SMPL-Body subset has a separate CC BY 4.0 licence excluding the shape-generation resources. STAR package terms were not rechecked | **Reference and verify exact package.** Do not treat the exported-body licence as permission for the full parametric model, or exclude every related resource by a blanket label. |
| **MetaHuman** | Very high-quality characters and face rigs | Unreal Engine EULA since June 2025: usable outside Unreal, free below US$1M revenue, Epic's terms above; AI-training restriction | **Quality bar only.** Files are far over web budgets, rigged for Unreal, and the terms need legal review for a web product. |
| **Daz 3D Genesis** | Large asset ecosystem | Per-product interactive licence | **Avoid** (already excluded in `16-private-anatomy.md`). |
| **Z-Anatomy / BodyParts3D** | Skeleton, muscles, organs | CC BY-SA 4.0 (share-alike applies to a shipped derivative) | **Reference.** Shipping underlay layers derived from it needs an explicit decision that the *asset* (not the app code) is share-alike. Otherwise build the underlay ourselves. |

## Hair, skin and eyes: techniques, not assets

These publications inform technique selection. They do not automatically license the authors' code, data, scans or images for redistribution. The old plan preview implemented simplified demonstrations of the first three; production fidelity still needs the R2/I2 asset and visual checks.

| Need | Method | Where used |
| --- | --- | --- |
| Hair shading | Kajiya-Kay (1989) and Marschner et al. (2003) lobes; strand ribbons that face the camera | `plan-assets/src/hair.mjs` (done), port in [04](04-skin-hair-eyes.md) |
| Eyes | Procedural iris (fibres, collarette, limbal ring), cornea as specular only, gaze from eye bones | `plan-assets/src/eyes.mjs` (done), see [04](04-skin-hair-eyes.md) |
| Skin colour | Melanin and haemoglobin as separate absorbers (Donner and Jensen 2006; Jimenez et al. 2010, dynamic facial colour); ITA classification (Chardon et al. 1991) | [`code/skin-layers.mjs`](code/skin-layers.mjs), [04](04-skin-hair-eyes.md) |
| Skin light transport | Pre-integrated skin shading (Penner and Borshukov 2011) for WebGL; separable subsurface scattering (Jimenez et al. 2015) as the HIGH-tier option; three.js node materials for WebGPU later | [04 §3](04-skin-hair-eyes.md) |
| Facial animation vocabulary | Anatomically authored feature motion exposed through ARKit-compatible names; ARKit coefficients and FACS are not interchangeable systems | [03](03-anatomy-spec.md), [Apple face coefficients](https://developer.apple.com/documentation/arkit/arfaceanchor) |

## Animation and rigging

| Candidate | Licence (as found) | Decision |
| --- | --- | --- |
| **Quaternius Universal Animation Library** | CC0; the free tier is a subset | **Evaluate**: retarget onto the v3 rig; fall back to our own cycles. |
| **Mixamo** | Adobe terms: free to use in projects, raw files may not be redistributed (not confirmed in this pass) | **Avoid shipping** Mixamo files. May be used to study timing while authoring our own walk, idle and gesture cycles. |
| **Own cycles** (procedural gait, authored idles) | Ours | **Build.** A walk is a small procedural model (pelvis bob and sway, counter-swing arms, foot-lock IK) plus authored idles; the pure `ik.mjs` already supplies the solver. |
| **Face tracking** (optional, later) | Not evaluated | **Out of scope for now**; the 52-shape rig keeps the door open. |

## Pipeline tools

| Tool | Licence | Use |
| --- | --- | --- |
| three.js, React Three Fiber, drei, postprocessing | MIT | Runtime (already in the app) |
| glTF-Transform | MIT | Scripted GLB pass: dedupe, prune, quantise, meshopt, KTX2 |
| meshoptimizer | MIT | Geometry, morph and animation compression (`EXT_meshopt_compression`) |
| KTX-Software (`toktx`) and Basis Universal | Apache-2.0 | GPU-compressed texture tiles (`KHR_texture_basisu`) |
| detect-gpu | MIT | Initial tier guess before the governor has frame times |
| Blender | GPL tool; outputs retain input/source rights | Sculpt, retopology, weights, shape keys |
| Playwright | Apache-2.0 | Viewer probes and visual regression |

## Data

| Data | Terms | Use |
| --- | --- | --- |
| **ANSUR II** (US Army anthropometric survey) | Released for public use; confirm terms before redistributing derived tables | Calibrate proportion morphs and plausible ranges for the metric inputs |
| **NASA SVS Deep Star Maps** and NASA imagery | NASA media guidelines (generally not copyrighted in the US) | Optional starfield texture; the primary space background is procedural, see [05 §7](05-viewer-and-interaction-spec.md) |
| **Poly Haven HDRIs** | CC0 | Optional environment maps for lighting |

## Decision: adopt data, build the asset

1. **Keep the MakeHuman CC0 foundation** for proportions and for the 58-shape language the measurements already drive.
2. **Rebuild the high-detail regions ourselves** (head, hands, feet) on that foundation in Blender: more edge loops,
   true ears, nostril openings, lid loops, fingertip pads. Add the missing joints, teeth, tongue, nails and garments as
   **project-authored** parts, recorded in `ASSET-PROVENANCE.json` as `project`.
3. **Run the bounded S1 feasibility comparison after approval** on Anny's compatible output: can its verified weights and shape controls
   replace our own finger, toe and jaw weighting? If yes, adopt with provenance entries; if no, author the weights in
   Blender (automatic weights, then hand cleanup).
4. **Evaluate project-authored or provenance-verified skin micro-detail** at the correct regional physical scale. A seeded procedural tile is reproducible, but repeat visibility, seam response and realism still need visual tests. It is not the only valid way to author a seamless tile.
5. **Author the underlay layers** (skeleton, muscle, fat, organs) only after the licence decision on Z-Anatomy; they are
   optional and do not block the realism work.

The present recommendation is to extend the pinned foundation because its controls and source records already integrate with this application. A ready-made candidate could still be selected if its exact rights, deformation transfer, visual quality and measured web costs pass. MetaHuman's current terms permit use outside Unreal; engine lock-in is not a valid blanket rejection. No candidate is assumed to supply the integrated adult anatomy or personal measurement contract without inspection.

## Sources checked

- Anny: [official repository and per-component terms](https://github.com/naver/anny), [paper (arXiv 2511.03589)](https://arxiv.org/abs/2511.03589). Exact release inputs still need a pinned provenance record before use.
- MHR: [official repository](https://github.com/facebookresearch/MHR), [paper (arXiv 2511.15586)](https://arxiv.org/abs/2511.15586). Exact release-archive notices still need inspection before redistribution.
- SMPL: [model terms](https://smpl.is.tue.mpg.de/modellicense.html), [defined exported-body subset](https://smpl.is.tue.mpg.de/license.html); [SMPL-X model terms](https://smpl-x.is.tue.mpg.de/modellicense.html).
- MetaHuman: [Epic's licence page](https://www.metahuman.com/en-US/license), [CG Channel on the June 2025 change](https://www.cgchannel.com/2025/06/you-can-now-sell-metahumans-or-use-them-in-unity-or-godot/), [Digital Production summary](https://digitalproduction.com/2025/06/05/metahumans-graduate-ready-for-unity-godot-and-the-fab-cash-register/).
- Repository records: `public/assets/models/ASSET-PROVENANCE.json`, `docs/ASSET_LICENCE_RESOLUTION.md`, `docs/real-human-3d/16-private-anatomy.md`.
