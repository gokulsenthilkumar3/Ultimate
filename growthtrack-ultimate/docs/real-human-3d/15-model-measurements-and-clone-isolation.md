# Neutral model measurements and independent figures

Implemented 2026-10-22 as a continuation of the [people review](14-review-100-and-people.md) and the [master application plan](../MASTER_PRODUCT_SPEC.md). The 75-point historical ledger and 66/100 subjective readiness assessment have not been rescored.

## Model measurement workflow

Open **Physique → 3D → Measure → Model fit → Check model measurements**. The selected Current or Goal model reports its estimated chest, waist and hip contours, entered targets and signed differences in the account's display units. Missing targets remain **Not recorded** and have no error. Changing the person, context, model or measurement inputs invalidates the old report. An identical save acknowledgement does not clear it.

`modelMeasurements.js` evaluates the loaded body's morph targets without changing its geometry, morph influences, live skeleton or saved records. It intersects triangle edges with horizontal planes, welds duplicate seam positions, and walks closed contours. It excludes detached arm/leg contours and refuses open or ambiguous central contours instead of closing gaps with a convex hull. Indexed and non-indexed geometry and relative/absolute morph targets are covered by analytic fixtures. All six shipped body assets produce finite contours that respond to shape changes.

The sections are fixed preview landmarks at 72%, 58% and 50% of neutral body stature. Horizontal distances use the viewer's neutral 175 cm reference; selected height stretches Y independently. A height edit can still alter estimated proportions through the existing metric mapper. Pose, camera and garments are excluded. The check runs on request, outside the frame loop, and is available for the supported bundled GLBs. It does not measure a procedural fallback or an unreviewed custom model.

These are **mesh contour estimates**, not calibrated anatomical measurements. A fixed slice may miss a person's true chest, natural waist or maximum hip landmark, especially at extreme proportions. This checkpoint does not implement a fit solver, adjust the avatar automatically, change the existing metric mapping or claim personal likeness. Authored landmarks, circumference/length fitting with tolerances and independent bilateral shapes remain next work.

## Clone isolation repair

Visual review found floating hair and displaced eyes after switching contexts. `SkeletonUtils.clone` remapped skeleton bones but retained the original inverse-bind matrices. `createMorphRig` edits those matrices as body proportions change, so a figure could alter both another clone and the cached GLB used by later figures.

`cloneHumanoidScene` now deep-copies inverse-bind matrices once per figure. Surfaces bound to the same inverse set within that figure still share it, so body and nails remain coherent. Current, Goal and future clones have independent matrices. The regression reproduces cached-source corruption on both articulated full/lite assets before the fix, and verifies source preservation, separate figure edits and within-figure surface sharing after the fix.

No GLB or texture bytes were changed by this continuation. Existing local asset and application work was retained.

## Application continuation

The parallel application slice adds **Notes → Duplicate note**, using the existing owner-scoped record port. Details, retry behavior and remaining application gates are recorded in [Notes](../NOTES_VERTICAL_SLICE.md). The broader application remains in progress.

## Verification

- 46 focused tests in six files cover contour math, six real assets, report invalidation, Notes copies, retry, failed saves, delayed acknowledgements, account changes and existing Notes persistence/sync contracts.
- A further 29 tests in four files cover inverse-bind isolation, articulated surfaces, contact and contour behavior; 11 contour tests overlap the first run.
- Ten Chromium flows passed together against an isolated production preview, covering the new workflows and existing people, Notes import/export, encrypted recovery, knowledge links, revisions, conflicts and keyboard navigation. The model-measurement flow passed again after the clone repair.
- Final model review, build and static checks are recorded in the implementation status when completed.

The Notes recovery browser fixture now reads the isolated browser's IndexedDB directly instead of importing development-only `/src` modules. Its ciphertext, nonextractable-key and paused-submission assertions remain intact in production preview runs. No test reads or writes the owner's database.

Reproduce from `growthtrack-ultimate`:

```powershell
npm.cmd exec -- vitest run src/components/Notes.persistence.test.jsx src/domains/workspace/domain/duplicateNote.test.js src/domains/workspace/adapters/notesApi.test.js src/domains/workspace/application/noteSync.test.js src/components/morphEngine/modelMeasurements.test.js src/components/physique/ModelMeasurementCheck.test.jsx --maxWorkers=2
npm.cmd exec -- vitest run src/components/morphEngine/cloneHumanoidScene.test.js src/components/morphEngine/human75Assets.test.js src/components/morphEngine/human75SurfaceContact.test.js src/components/morphEngine/modelMeasurements.test.js --maxWorkers=2
npm.cmd exec -- playwright test --config playwright.continuation.config.ts
npm.cmd exec -- playwright test --config playwright.model-review.config.ts
```

Native GPU/Safari performance, complete asset conformance, calibrated body fitting, exact likeness and offline/native Notes parity remain open. Passing these targeted checks does not establish a green repository-wide suite or a release.
