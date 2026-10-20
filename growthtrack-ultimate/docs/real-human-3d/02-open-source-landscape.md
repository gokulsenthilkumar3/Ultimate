# 02 · Open-source landscape: what exists, what we can use, what we must build

Question asked: *is there an open-source source for a human that looks real, or do we have to build it?*

**Answer: no single source gives all of (a) a licence that allows a commercial web app to ship and modify it, (b) a web-sized
mesh and textures, (c) a full rig with fingers, toes, jaw and eyes, and (d) hero-quality hands, face, teeth and skin.**
Parts exist separately. The plan therefore **adopts data and tools where the licence is clean and builds the asset
ourselves where it is not**, which is also what the existing provenance policy
([`ASSET_LICENCE_RESOLUTION.md`](../ASSET_LICENCE_RESOLUTION.md), `npm run check:assets`) already requires.

Licence statements below were checked on 2026-10-20 against the sources linked at the end. Where a source could not be
confirmed, the row says so; **no row is a legal opinion**, and any "adopt" decision still goes through the repository's
asset-provenance gate before a file ships.

## Human body models and base meshes

| Candidate | What it gives | Licence (as found) | Decision |
| --- | --- | --- | --- |
| **MakeHuman 1.x base, targets and system assets** | The mesh, 73 targets, skins, eyes, hair proxies the app ships today | CC0 1.0 (recorded in `ASSET-PROVENANCE.json`, verified 2026-10-19) | **Keep.** It is the proportion engine and the provenance-clean starting point. |
| **MPFB2** (MakeHuman for Blender) | Authoring inside Blender with the same targets and rigs | Code GPLv3; assets exported with it are CC0 | **Adopt as a tool**, never shipped. |
| **Anny** (NAVER LABS Europe) | Parametric body from MakeHuman data with phenotype controls, a full rig and several topologies | Code and model Apache-2.0 per the paper and PyPI page; the **SMPL-X-topology option is non-commercial** | **Evaluate (spike S1).** Use only MakeHuman-topology output; confirm the data licence in the repository before taking anything. |
| **MHR** (Meta Momentum Human Rig) | Parametric body and face with LODs, body blendshapes and pose correctives | Repository Apache-2.0; the `assets.zip` licence file **was not confirmed** from secondary sources | **Reference** for corrective-shape design and LOD ratios. Adopt only if the asset licence is confirmed in the release archive and web redistribution is allowed. |
| **SMPL, SMPL-X, STAR** | Scan-fitted body models | Non-commercial research licences | **Avoid** for anything shipped. |
| **MetaHuman** | Very high-quality characters and face rigs | Unreal Engine EULA since June 2025: usable outside Unreal, free below US$1M revenue, Epic's terms above; AI-training restriction | **Quality bar only.** Files are far over web budgets, rigged for Unreal, and the terms need legal review for a web product. |
| **Daz 3D Genesis** | Large asset ecosystem | Per-product interactive licence | **Avoid** (already excluded in `ANATOMY_ASSET_PLAN.md`). |
| **Z-Anatomy / BodyParts3D** | Skeleton, muscles, organs | CC BY-SA 4.0 (share-alike applies to a shipped derivative) | **Reference.** Shipping underlay layers derived from it needs an explicit decision that the *asset* (not the app code) is share-alike. Otherwise build the underlay ourselves. |

## Hair, skin and eyes: techniques, not assets

These are published methods; there is no licence to take. The plan page already implements the first three.

| Need | Method | Where used |
| --- | --- | --- |
| Hair shading | Kajiya-Kay (1989) and Marschner et al. (2003) lobes; strand ribbons that face the camera | `plan-assets/src/hair.mjs` (done), port in [04](04-skin-hair-eyes.md) |
| Eyes | Procedural iris (fibres, collarette, limbal ring), cornea as specular only, gaze from eye bones | `plan-assets/src/eyes.mjs` (done), see [04](04-skin-hair-eyes.md) |
| Skin colour | Melanin and haemoglobin as separate absorbers (Donner and Jensen 2006; Jimenez et al. 2010, dynamic facial colour); ITA classification (Chardon et al. 1991) | [`code/skin-layers.mjs`](code/skin-layers.mjs), [04](04-skin-hair-eyes.md) |
| Skin light transport | Pre-integrated skin shading (Penner and Borshukov 2011) for WebGL; separable subsurface scattering (Jimenez et al. 2015) as the HIGH-tier option; three.js node materials for WebGPU later | [04 §3](04-skin-hair-eyes.md) |
| Facial animation vocabulary | FACS (Ekman and Friesen 1978) as the ARKit 52-shape set | [03](03-anatomy-spec.md) |

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
| Blender | GPL (outputs are not encumbered) | Sculpt, retopology, weights, shape keys |
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
3. **Run spike S1 (one week)** on Anny's MakeHuman-topology output: can its CC0/Apache weights and phenotype targets
   replace our own finger, toe and jaw weighting? If yes, adopt with provenance entries; if no, author the weights in
   Blender (automatic weights, then hand cleanup).
4. **Generate the skin micro-detail procedurally** (a seeded script that produces the tiling pore, crease and fine-line
   normal tile). It has no third-party licence, it is deterministic, and it is the only way to guarantee a tile that
   repeats invisibly.
5. **Author the underlay layers** (skeleton, muscle, fat, organs) only after the licence decision on Z-Anatomy; they are
   optional and do not block the realism work.

Why not "use a ready-made character": every option that is licence-clean is either too low in detail for hands and
face (what we have), or too heavy and tied to another engine (MetaHuman), or has a restrictive licence (SMPL family,
Daz). The gap is exactly the part of the work that makes a person read as a person, so it is built, not bought.

## Sources checked

- Anny: [paper (arXiv 2511.03589)](https://arxiv.org/html/2511.03589v2), [PyPI release notes (SMPL-X topology, non-commercial)](https://pypi.org/project/anny/), [NAVER LABS Europe page](https://europe.naverlabs.com/research/publications/human-mesh-modeling-for-anny-body/).
- MHR: [paper (arXiv 2511.15586)](https://arxiv.org/abs/2511.15586v3), [facebookresearch/MHR listing](https://gittrend.io/repo/facebookresearch/MHR); the asset archive's own licence file still needs to be read.
- MetaHuman: [Epic's licence page](https://www.metahuman.com/en-US/license), [CG Channel on the June 2025 change](https://www.cgchannel.com/2025/06/you-can-now-sell-metahumans-or-use-them-in-unity-or-godot/), [Digital Production summary](https://digitalproduction.com/2025/06/05/metahumans-graduate-ready-for-unity-godot-and-the-fab-cash-register/).
- Repository records: `public/assets/models/ASSET-PROVENANCE.json`, `docs/ASSET_LICENCE_RESOLUTION.md`, `docs/ANATOMY_ASSET_PLAN.md`.
