# 3D subsystem: implemented architecture and staged target

Audited on 2026-10-28 against this working tree. Scope: diagrams and an
implementation plan. No renderer, worker, persistence or database schema is
changed by this documentation pass.

## Views

- [Workspace system context source](../../diagrams/workspace-system-context.mmd)
- [Current 3D runtime source](../../diagrams/avatar-3d-current.mmd)
- [Proposed four-layer architecture source](../../diagrams/avatar-3d-target.mmd)
- [Editable sources and diagram formats](../../diagrams/README.md)

The context view locates the subsystem inside Ultimate. The current view shows
what the code does. The target view is a component/runtime design, with NEW
nodes and dashed outlines identifying work that has not been implemented.

## Corrections to the supplied proposal

The four-layer separation is a useful target, but several claims need narrower
wording before they can guide implementation.

1. `App.jsx` already lazy-loads Physique. It does not import `CloneEngine` or
   implement GLB loading or garment fitting. `CloneEngine` is a comparison-scene
   orchestrator under `components/morphEngine`, rather than the whole subsystem.
   The coupling that needs work is inside the parametric viewport and studio.
2. There are two relevant runtime branches. The comparison branch uses
   `Physique → ScrollShowcase → HumanoidViewer → CloneEngine`. The appearance
   branch uses `ParametricAvatarStudio → ParametricAvatarViewport`. Collapsing
   both into one engine box hides different state and geometry paths.
3. Identity evaluation is already CPU-based, with the identity morph bank
   removed from live viewing geometry. It is synchronous main-thread work,
   not an implemented `IdentityBakeWorker`.
4. Garment contact solving already uses a Web Worker. Its queue debounces by
   80 ms and rejects superseded results. Posed-surface extraction, inverse skin
   transforms and attachment preparation still occur on the main thread.
5. The 400 ms semantic-save debounce is independent of the 80 ms garment queue.
   There is no global 80 ms identity-controller debounce in the current code.
6. “68 MB” is not a universal GPU limit. The implementation estimates a morph
   texture allocation and queries the active context's texture-size and array
   layer limits. Device limits and resident GPU memory are separate questions.
7. “Collision-free” must be scoped to the solver's convergence/classification
   checks for the tested shape and pose. The code describes prototype garments
   and unverified exports; it does not certify every pose, garment or morph
   combination.
8. Exports are generated and downloaded in the browser. The arrow from an API
   gateway through “Export GLB” into SQLite is incorrect for this implementation.
   The database stores semantic editing state; GLB and ZIP are derived files.
9. The service worker deliberately excludes GLBs, textures, HTML and personal
   APIs. A successfully loaded in-memory asset promise is not durable offline
   caching. A fresh route also waits for the application's initial account load.
10. Agents currently proxy text generation to Groq or Ollama. There is no
    avatar image-generation, upscaling or face-tracking model inside the API
    gateway that needs to be moved out. Those would be separate future features.

## Current layers and source evidence

### Assets and persisted semantic data

`public/assets/models/parametric-base-v1.glb` and the skin, eye and attachment
manifests are loaded over same-origin HTTP. The parametric loader checks the
basis byte length and SHA-256 before parsing it. It checks related asset/source
notices on their respective load/export paths.

The measured basis is **6,806,984 bytes (6.49 MiB)**. Its GLB JSON reports 306
position targets on Body, with additional target banks on Eyes, Teeth and
Tongue. The 306 figure describes the main body bank, not every mesh combined.

Semantic state has separate Current/Goal contexts and versioned asset identity.
`useParametricAvatar` keeps its editable document in React state, then saves
through `useAvatarRecord` and the existing per-person serialized save adapter.
For the owner it is under `physiqueTargets.parametricAvatar`; other people have
their own scoped targets. `use3DStore` serves the existing comparison/view state.
There is no need to invent a new database table merely to introduce workers.

Evidence:
[asset manifest](../src/config/parametricHuman.json),
[asset loader](../src/components/morphEngine/parametricAssetLoader.js),
[document contract](../src/lib/avatarDocument.js),
[parametric validation](../src/lib/parametricHuman.js),
[editor persistence](../src/hooks/useParametricAvatar.js),
[person scope](../src/hooks/useAvatarRecord.js),
[people workspace](../src/components/physique/AvatarPeopleWorkspace.jsx).

### State, orchestration and computation

The studio owns controls, asset readiness, runtime references, export and import
actions. The viewport creates the identity scene, materials, eye layers and
attachments, evaluates weights and requests garment updates. This makes the
viewport more than a renderer and is the concrete extraction boundary.

`parametricIdentity.setWeights` evaluates named source channels, updates normals,
tangents and bounds, and refits the rest rig geometrically. The rig fit is a
surface-anchored approximation, not anatomical calibration. Viewing geometry
does not retain the full identity morph bank; explicitly retained expression
channels are a separate capability.

For async garment fitting, `prepareGarmentContact` creates posed body/garment
buffers on the main thread. `garmentFitQueue` transfers owned buffers to
`garmentFit.worker`, allows one active solve and keeps only the newest queued
shape. Accepted output must match the latest revision and report convergence.
An initially unfitted garment is hidden until a valid fit exists; an older
accepted fit is not proof of validity for a newer body or pose.

Evidence:
[studio](../src/components/physique/ParametricAvatarStudio.jsx),
[viewport](../src/components/physique/ParametricAvatarViewport.jsx),
[CPU identity](../src/components/morphEngine/parametricIdentity.js),
[rig fitting](../src/components/morphEngine/parametricRigFit.js),
[attachments](../src/components/morphEngine/parametricAttachments.js),
[posed preparation and solve](../src/components/morphEngine/posedGarmentContact.js),
[queue](../src/components/morphEngine/garmentFitQueue.js),
[worker](../src/components/morphEngine/garmentFit.worker.js).

### Rendering and exports

The parametric viewport uses React Three Fiber/Three.js with neutral tone
mapping, PBR materials, shadows, bounded DPR and `frameloop="demand"`. A static
view does not need a continuous 60 fps loop. Interactive frame time and worker
latency need separate measurements on specified hardware.

The studio waits for the current garment revision before ordinary GLB or ZIP
export. The compact GLB contains baked identity and a rig. The shape-editing
GLB deliberately retains the full shape basis for desktop editing and must not
be mounted as the lightweight browser viewing mesh. The editable ZIP preserves
the semantic document, a viewing GLB, source basis and source notices.

Existing local example artifacts measured during this audit:

- `avatar-export.glb`: 16,759,532 bytes, about 15.98 MiB.
- `avatar-shape-editing.glb`: 87,024,848 bytes, about 82.99 MiB.
- `avatar-editable.zip`: 22,393,751 bytes, about 21.36 MiB.

These are examples from `artifacts/parametric-human`, not fixed production
budgets or promises about every future export. They remain ignored local files.

Evidence:
[viewing GLB exporter](../src/components/morphEngine/parametricExport.js),
[editing exporter](../src/components/morphEngine/parametricEditingExport.js),
[portable package](../src/components/morphEngine/avatarPackage.js),
[comparison orchestrator](../src/components/morphEngine/CloneEngine.jsx),
[service-worker allowlist](../public/sw.js),
[initial account-load gate](../src/App.jsx).

## Target contracts

The architecture should separate the four layers without replacing the
canonical semantic document or creating a second source of truth.

### Scope and revision identity

Every editor request and result carries owner, person, document ID, Current/Goal
context, document revision, job revision and asset identity. Asset identity
includes the source/topology hashes and rig, material and solver versions.
Results from another owner, person, context, asset or superseded job are never
applied. A document's existing timestamp is not a substitute for a well-defined
local job sequence or a server acknowledgement/version.

### Worker boundary

- Initialization owns a validated immutable basis and typed-array metadata once
  per active editor session. Do not resend 306 dense targets on every drag.
- Bake requests contain semantic weights, pose inputs and revision identity.
- Bake results contain owned position/normal/tangent buffers, rig updates and
  bounds, not Three.js objects, React nodes or store references.
- Garment requests use the matching body and pose revision. Results include
  convergence, gap/displacement measurements and validation scope.
- Check topology, buffer lengths, indices, finite values, transforms and version
  identity before constructing or updating live GPU attributes.
- Transfer only owned buffers. Never detach immutable basis data still needed
  by the editor or exporter. Measure peak memory during initialization/export;
  moving work to a worker alone does not guarantee lower total memory use.

### Controller and render packet

`EditorController` owns scheduling, cancellation, stale-result rejection,
worker lifecycle, readiness/error state and coherent commits. Geometry stays
in transient runtime resources, not in persistent Zustand/JSON state.

The renderer accepts a validated render packet for one scope and revision. It
owns camera, lighting, GPU objects, material presentation and disposal, without
running CPU identity evaluation or garment spatial queries from React effects.
Publish compatible body/garment results together, or visibly withhold an
unvalidated garment; never present a mixed-revision pair as a successful fit.

### Editor and viewer entry points

Editor mode loads the basis and computation pipeline. A separate lazy viewer
entry loads a matching baked snapshot and rendering assets. It must not import
or instantiate either worker just to show a dashboard avatar. If the snapshot
is missing or stale, show that state explicitly rather than silently loading
the heavy editor. Support only documented poses/animations for each fitted
garment snapshot; a fitted neutral pose is not an all-pose certificate.

## Staged implementation plan

### 0. Baseline and contracts

- Record current identity/garment buffers, mesh counts, named weights, normal
  and rig results, export contents, load times, frame intervals and peak memory.
- Capture reference laptop/browser/GPU capabilities rather than assuming a
  universal morph-memory limit or frame rate.
- Define the scope/revision packet and typed-array validation contracts. Keep
  self/other-person and Current/Goal persistence semantics unchanged.
- Record the legacy comparison branch and parametric editor separately so that
  a refactor of one does not silently remove features from the other.

Acceptance: reproducible fixtures and parity tolerances are agreed; no schema
migration, generated-asset replacement or claimed performance improvement.

### 1. Extract a thin renderer and an editor controller

- Extract identity/attachment/material orchestration from the viewport into a
  runtime controller. Initially retain the existing evaluator and solver.
- Keep studio controls and existing save/export adapters. Keep Three.js
  instances in runtime ownership and expose a small render/status interface.
- Move listener registration/disposal, pending export cancellation and context
  loss/reopen behavior behind explicit lifecycle methods.

Acceptance: visual and export parity; changing account, person or context cannot
apply a late result or save to the wrong scope; disposal leaves no workers or
GPU resources running. This stage establishes ownership, not worker performance.

### 2. Move identity evaluation to a worker

- Extract a pure evaluator from `parametricIdentity` with no DOM, renderer or
  store dependency. Initialize the basis once and reuse the existing named
  weight semantics, including omitted weights returning to zero.
- Add the worker and latest-request scheduling; make debounce configurable.
  Coalesce rapid drags and avoid an unbounded queue of obsolete work.
- Return updated body/auxiliary geometry, normals/tangents/bounds and compatible
  rig data. Preserve the distinction between identity and any expression bank.
- Remove heavy `setWeights` computation from the viewport effect. If workers
  fail or are unavailable, show a clear failure/read-only snapshot option;
  do not quietly perform an unbounded synchronous fallback.

Acceptance: numeric parity for body, eyes, teeth and tongue over a defined morph
matrix; reset/extreme/invalid-input tests; no basis detachment; bounded memory;
stale/cancelled/terminated jobs never alter the displayed revision. Measure
drag responsiveness and frame intervals independently of bake completion time.

### 3. Integrate the existing garment worker with that revision model

- Reuse `garmentFitQueue` and its one-active/latest-queued behavior rather than
  spawning one worker per change. Retain convergence checks and export flush.
- Move or bound the expensive posed-surface/skin-transform preparation that is
  still synchronous. The worker contract must identify coordinate space and
  units, body/garment topology, skin/pose inputs and solver version.
- Commit only matching validated body/garment packets. Define behavior for
  non-convergence, worker crash, singular transforms and unsupported poses.

Acceptance: shape/pose/garment matrix tests with stated clearance, intersection
and displacement criteria; stale-result and export-race tests; honest failed-fit
UI. No universal “collision-free” guarantee based on one minimum-distance check.

### 4. Add the lightweight viewer and local asset resilience

- Generate a baked viewer snapshot from an accepted revision. Key it by owner,
  person, context, document revision and asset/material/solver identities.
- Add the separate read-only entry and explicit snapshot freshness state.
- Add verified caching for public rendering assets and an owner-scoped private
  draft/snapshot store. Do not broaden the existing service worker to cache
  personal APIs, auth responses or arbitrary downloads.
- Define local unlock/session-expiry, logout and account-switch behavior before
  exposing cached private avatars. Never reuse the last user's cached document
  as an authentication fallback.
- Decouple the local viewer from the fresh account-load gate only under that
  explicit policy. Saving still uses the canonical API and truthful dirty/error
  state. Optional companion sync must not enter the rendering readiness chain.

Acceptance: read-only route loads without identity/garment jobs; cache hashes and
revision checks pass; warm-cache gateway/core failure, missing/evicted/corrupt
assets, quota errors, account switch and logout are exercised. Cold first visit
without assets is an explicit unavailable state, not an offline-success claim.

### 5. Export and optional artifact/service extensions

- Export only a coherent accepted revision, with the semantic document and
  provenance matching its geometry. Keep normal viewing and shape-editing
  formats distinct.
- Keep browser downloads independent of API saves. If cross-device artifact
  storage is later added, put binaries in private file/object storage and save
  references, hashes and revisions as metadata, rather than routing GLB bytes
  into the avatar JSON record.
- Keep Agents text inference outside the render critical path. Future image,
  upscaling or face-tracking models require their own worker/service and job
  budgets; nothing in this plan assumes those features already exist.

Acceptance: interrupted bake/fit/save/export cannot produce a misleading success;
round-trip package tests preserve both contexts and version identities; measured
payload and interaction budgets pass on declared reference hardware. “60 fps”
and “15 MB” remain measured targets only if explicitly adopted and verified.

## Verification of this documentation pass

Inspected the actual call sites, worker protocol, save and export paths, service
worker allowlist, source GLB JSON and existing local export byte sizes. Diagrams
are rendered from the checked-in Mermaid sources and delivered as SVG/PNG plus
editable Excalidraw scenes. Runtime refactoring and new performance/offline
guarantees are intentionally left to the staged implementation gates above.
