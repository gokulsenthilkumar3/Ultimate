# Architecture diagrams

Verified against the working tree on 2026-10-28. These are architecture
documentation and a staged plan; this change does not refactor the runtime.

- [Workspace context](workspace-system-context.svg) shows the Ultimate boundary,
  the expanded 3D subsystem, API/storage, companion processes and model services.
- [Current 3D runtime](avatar-3d-current.svg) shows implemented paths. Amber nodes
  identify synchronous work on the browser main thread.
- [Target 3D architecture](avatar-3d-target.svg) shows the proposed four layers.
  Dashed nodes marked NEW are not implemented. It separates an editing pipeline
  from a read-only baked-GLB viewer.

Each view has `.mmd` source, `.svg`, `.png`, and an editable `.excalidraw` scene.
Open the Excalidraw file with File → Open on excalidraw.com to move individual
nodes and edges. The Mermaid file is the source for regeneration.

See the [subsystem audit and staged implementation plan](../growthtrack-ultimate/docs/3D_SUBSYSTEM_ARCHITECTURE.md)
for source references, contracts, limitations and acceptance gates.

These diagrams deliberately do not promise 60 fps, a fixed 15 MB export,
universal collision-free clothing, persistent offline GLB caching, or an
identity worker that has not been implemented.
