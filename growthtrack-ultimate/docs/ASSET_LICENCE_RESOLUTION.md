# Resolving the digital-twin asset licence

Status: **resolved, 2026-10-19.** Both GLBs were rebuilt from pinned CC0 sources (section 4a) and promoted; every component in `ASSET-PROVENANCE.json` is `verified` or `project`, and `npm run check:assets -- --release` passes. Archived licence texts and source manifests are in `docs/licenses/`. The application-export route (section 3) remains available as a cross-check.

Update, **2026-10-20:** the assessed sources were reverified against the pinned upstream licence and system-asset catalog. `node scripts/verify-human-sources.mjs` verified all 97 cached source files against their recorded hashes, including git blob identities where applicable. Archived licence texts also match the pinned upstream hashes. The new adult-v2 full/lite derivatives use these same components and project-authored attachment binding; see section 4c. No commissioned anatomy sculpt is included.

## 1. The problem, precisely

`ASSET-PROVENANCE.json` marks four components of each GLB as unresolved:

| Component | Current source | Why unresolved |
| --- | --- | --- |
| Body mesh, skeleton binding, 52 morph recipes | MakeHuman 1.1.1 data package (`makehuman-data_1.1.1-1_all.deb`) | The package licenses `makehuman/data/*` as "GPL-3 or MH-output-exception". The CC0 exception covers characters exported from the MakeHuman application, but our GLB is built by a custom converter reading the data files directly. |
| Skin albedo variants | Same package, `skins/textures` | Same licence statement. |
| Eyes (`high-poly`, `brown_eye`) | Same package | File header: "This file is licensed AGPLv3". |
| Hair (`short02`) | Same package | File header: "This file is licensed AGPLv3". |

Project-authored parts (the anatomy placeholder, the 7 generated morphs and the surface bakes) are already resolved.

## 2. What the current licence says (verified 2026-10-19)

- MakeHuman `LICENSE.md` (master branch, © 2001–2020): source code is AGPL; assets "have been released under CC0 1.0 Universal", listing the base mesh and proxies, targets and modifiers, textures, clothes, poses and expressions. On exports (FBX, OBJ, DAE, MHX2), renderings and saved models, the project "makes no claim whatsoever" and regards them as the user's data. Third-party assets keep their own licences.
- The **MakeHuman system assets** pack is distributed as `makehuman_system_assets_cc0.zip` (267 MB, no published checksum). Every item, authored by "makehuman_system", is listed as CC0, including the `high-poly`/`low-poly` eyes, `short01`–`short04` hair, skins and the male/female proxies.

So the AGPLv3 headers belong to the old 1.1.1 files; the same assets are now offered under CC0. Not yet confirmed: that the CC0 files are byte- or topology-identical to the 1.1.1 ones, and which release tag the `LICENSE.md` text first shipped in.

## 3. Requested route: re-derive through the MakeHuman application's export

Exported output carries no project claim, which is the strongest position. The cost is that an export is a single static mesh: the application does not write MakeHuman body targets as shape keys. Each morph therefore has to be rebuilt from separate exports.

**Scale:** 1 base export plus 1 export per target = **70 exports** for the male body (69 targets used by the 45 non-generated recipes; the 7 generated recipes read none). A female body later needs its own set.

### Steps

1. **Pin the application.** Install MakeHuman Community 1.3.0 (installer already in `.tmp/makehuman`, SHA-256 to be recorded) on a clean machine or VM. Archive its `LICENSE.md` text and the version string in `docs/licenses/`.
2. **Spike the automation — result: GO (2026-10-19, from v1.3.0 source).** `plugins/7_scripting.py` exposes `MHScript.applyTarget(name, power)` (sets a raw target by the same names our recipes use), `updateModelingParameters({...})` and `saveObj(name, path)` (MakeHuman's own `wavefront.writeObjFile`). `scripts/makehuman/export_glb_sources.py` runs all 70 exports from the Scripting tab after clearing the default macro stack so the base matches the converter, and writes `export-manifest.json` with version and hashes. It has not been run: MakeHuman is not installed here and the local 1.3.0 installer is unsigned, so install it from makehumancommunity.org yourself before running the script.
3. **Fix the export settings once, record them in a manifest:** base mesh (no topology proxy), no subdivision, metres, Y-up, helper geometry excluded, default skeleton with weights (FBX for the skinned base; OBJ is enough for target exports), same eye/hair proxies throughout. Vertex order must be identical across exports; step 6 checks this.
4. **Base character:** male, young adult, average muscle and weight, matching today's `BASE_SCULPT_SOURCES`. Export FBX (mesh, skeleton, skin weights, UVs) and OBJ.
5. **Target exports:** for each of the 71 targets, set only that modifier to +1 (or −1 for `decr`), with symmetry on for left/right pairs, export OBJ, reset. File name is the target path; record each file's hash in the export manifest.
6. **New converter input.** Add an `--source makehuman-export` mode to `scripts/build-makehuman-glb.py`. It reads the base FBX/OBJ, computes each target delta as (target export − base export), then applies the existing recipe weights to produce the same 52 morph names. It refuses to run if vertex counts or orders differ between exports. Generated morphs, the anatomy placeholder and bakes stay unchanged.
7. **Eyes, hair, skins:** export the character with the CC0 system-asset versions installed, and record the system-assets zip's SHA-256 as the second evidence source.
8. **Parity check against today's asset**, before replacing anything:
   - same vertex count, UV layout and morph names;
   - per-morph RMS delta difference below 0.1 mm;
   - `anatomyCalibration.test.js` and the seam script give the same numbers;
   - unit and E2E renderer suites pass.
   
   A difference means MakeHuman's export pipeline changed the data, and must be reviewed before promotion.
9. **Provenance:** replace the four unresolved components with:
   - body: "MakeHuman Community 1.3.0 application export; output unclaimed per LICENSE.md";
   - eyes, hair and skins: "MakeHuman system assets, CC0".
   
   Include installer, zip and export-manifest hashes, set status `verified`, update `MAKEHUMAN-ASSET-NOTICE.txt`, then run `npm run check:assets -- --release`.

**Effort:** the spike, then roughly 1–2 days for an automated path (or 2–3 days with manual exports), plus parity review. No artist time.

## 4. Simpler alternative the evidence supports

Since `LICENSE.md` now places the base mesh, targets, proxies and textures themselves under CC0, the converter could keep its current design and switch only its **inputs**:

- `makehumancommunity/makehuman` at a pinned release tag (`makehuman/data/3dobjs` and `targets`);
- the CC0 system-assets zip.

That is the same 52 morphs, no 72-export pipeline, and the parity check becomes a near byte-level comparison. The evidence is the CC0 licence of the sources rather than unclaimed output. Both are verifiable; the export route additionally protects against any doubt about older data. **Recommendation:** run the step-2 spike and this alternative in parallel. If the pinned-tag sources prove CC0 and match, ship this route and keep the export route as a cross-check.

## 4a. Results of the pinned CC0 route (2026-10-19)

Sources (downloaded with approval, all hashes verified):
- `makehumancommunity/makehuman` tag v1.3.0, commit `1f508f6083b2f823dab15de924b3bde72e08d77c`: `LICENSE.md`, `LICENSE.ASSETS.md`, `base.obj` and the 70 `.target` files the converter reads, each checked against its git blob SHA-1 (3,521,054 bytes).
- `makehuman_system_assets_cc0.zip` (280,737,770 bytes, SHA-256 `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107`). The eye, hair and skin files used carry the header "This asset was explicitly released as CC0 in september 2020".

Pipeline: `npm run humanoid:fetch`, `npm run humanoid:compile`, then `python -I scripts/build-makehuman-glb.py` (defaults now read the compiled CC0 tree; add `--texture-size 512` for the lite asset). `compile_sources.py` reproduces MakeHuman's own OBJ and target compile rules.

Source-level parity against the 1.1.1 caches (`scripts/makehuman/compare_sources.py`):
- Base mesh coordinates, faces, UVs and face groups: identical. Eye and hair geometry: identical. Eye/hair bindings: identical apart from one added `tag MakeHuman™` line. All six textures: pixel-identical (re-encoded PNGs).
- Targets: 59 of 70 identical in effect, 3 differ only by rounding (0.01 cm), 8 were edited upstream (up to 2.4 cm: upper-leg depth and muscle, head width, torso height and depth, stomach tone).

GLB parity, same converter and machine (`scripts/makehuman/compare_glb.py`, old-source build vs CC0 build, full and lite):
- Identical: every position, normal, UV, joint, skin weight and index buffer, the anatomy mesh, and 49 of 58 body morphs.
- Changed morphs at full weight: `torso_length` max 0.75 cm, `chest_depth` 0.35 cm, `ribcage_depth` 0.27 cm, six others ≤ 0.005 cm. The larger upstream edits fall on helper geometry the converter discards.
- Embedded images pixel-identical; eye and hair PNGs are larger (full asset 21.77 MiB vs 21.17 MiB).

Reproducibility notes: rebuilding from the old sources does not byte-match the shipped GLB. Apart from float noise, 16 body vertices receive a different bone at equal weight (a tie-break), and rebuilds are structurally identical but not byte-identical. Record provenance hashes from the exact promoted files.

Export route: spike passed from source (section 3, step 2); not executed because MakeHuman is not installed here.

## 4b. Adult base and face features (2026-10-19)

Added inputs, same pinned sources and verification:
- Three targets from the v1.3.0 commit, downloaded with approval (1,223,689 bytes): `macrodetails/african-male-young`, `asian-male-young` and `caucasian-male-young`. With the universal young-male macro they form MakeHuman's default adult man, the new base sculpt. The body now cites 73 targets (`scripts/makehuman/export-targets.json`).
- From the CC0 system-assets zip: `eyebrows/eyebrow001` and `eyelashes/eyelashes01` (proxy, material and texture; same CC0 header). Both are recorded as verified components in `ASSET-PROVENANCE.json` and in the refreshed extract manifest.

Promoted hashes (adult base and face features): full `9ed4afbb…`, lite `adb36e49…`. Superseded the same day by the rebuild with the project-modelled anatomy and the contact-only occlusion bake (no new third-party inputs): full `faea01f2ef89fb7ae2572177b5e7c960c602a2dfa5c1e633955404b90283b3fc`, lite `3fa9ae0a182f4954bd848e413607c73aa1c8b3b6d06c7db515c874452131091d`. `check:assets -- --release` passes with 8 components.

## 4c. Assessed human attachment upgrade (2026-10-20)

`npm run humanoid:upgrade` builds `humanoid-adult-v2.glb` and `humanoid-adult-v2-lite.glb` from the reviewed original pair. It refuses a source hash mismatch or unresolved component and verifies the archived licence text before producing derivatives. The provenance manifest records each source-to-derivative hash chain and the project-authored upgrade component. Release checks now verify archived licence hashes and derivative source identities as well as packaged file hashes.

The added attachment upgrade follows the project's MIT licence. Its licence-file hash is recorded alongside the two archived upstream CC0 statements; the original MakeHuman component licences remain unchanged.

The upgrade seats hidden attachment tissue against pelvic triangles, transfers normalized body skin weights to 961 root/neck vertices, and adds pelvic follow deltas for all 58 body morph names. Visible shaft measurement sections, private size deltas, body geometry, rig nodes/bind matrices, UVs, facial proxies, materials and embedded image bytes are retained. Male profiles use the upgraded pair by default; explicit legacy/custom choices and covered female/neutral fallbacks remain available. The v2 label denotes this binding upgrade, not an authored or scanned replacement.

Sources rechecked:

- [Pinned MakeHuman v1.3.0 licence](https://github.com/makehumancommunity/makehuman/blob/1f508f6083b2f823dab15de924b3bde72e08d77c/LICENSE.md), section C: bundled graphical assets are CC0; application source code has a separate licence.
- [MakeHuman system-asset catalog](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html): the selected eyes, short02 hair, brow/lash and skin assets are listed as CC0. File identities match `docs/licenses/makehuman-system-assets-cc0-extract-manifest.json`.

## 5. Acceptance

- `npm run check:assets -- --release` passes, with no unresolved component.
- `docs/licenses/` holds the archived `LICENSE.md`, installer, zip and export-manifest hashes, plus the date and person who reviewed them.
- Parity results are recorded in `IMPLEMENTATION_STATUS.md`.
- Existing anatomy safeguards, calibration and seam tests are unchanged and passing.

## Sources

- MakeHuman licence: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md
- MakeHuman data directory: https://github.com/makehumancommunity/makehuman/tree/master/makehuman/data
- Asset packs: https://static.makehumancommunity.org/assets/assetpacks.html
- System assets pack (CC0): https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
- Local evidence: `.tmp/makehuman/extracted/usr/share/doc/makehuman-data/copyright`; headers of `data/hair/short02/short02.mhclo` and `data/eyes/high-poly/high-poly.mhclo`.
