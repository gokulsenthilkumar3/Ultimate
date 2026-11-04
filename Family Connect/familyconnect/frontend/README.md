# Family Connect Frontend

Family-tree, memory, profile, event and document interfaces.

**Runtime:** React, TypeScript, Vite and React Flow.

**Status:** Independent legacy UI retained for compatibility. Ultimate now owns native family views; private media uses authenticated downloads in both interfaces.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install
Copy-Item .env.example .env.local
```

## Run

```powershell
npm run dev
```

## Configuration

- VITE_API_BASE points to the family backend's API. Its value is public routing configuration, not a secret.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run build
```

## Scope and limitations

- Start the configured backend before using live data. The root workspace launcher supplies the shared product base path.

## Workspace documentation

- [Application directory](../../../docs/APPLICATIONS.md)
- [Repository structure and file policy](../../../docs/REPOSITORY_STRUCTURE.md)
- [Current architecture](../../../docs/ARCHITECTURE.md)
- [Ownership and independent builds](../../../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../../../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../../../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../../../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../../../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../../../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../../../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
