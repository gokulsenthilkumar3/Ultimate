# Family Connect

Family trees, member profiles, memories, shared events and documents.

**Runtime:** Frontend and backend packages in familyconnect/.

**Status:** Native Ultimate family views use the existing Family API, account connection, permissions and PostgreSQL records. Standalone builds remain available.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install --prefix familyconnect/frontend
npm install --prefix familyconnect/backend
```

## Run

```powershell
npm --prefix familyconnect/frontend run dev
```

## Configuration

- Follow the frontend and backend READMEs; start the backend separately or use the configured root workspace launcher.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm --prefix familyconnect/frontend run build
npm --prefix familyconnect/backend run build
```

## Scope and limitations

- Family permissions and document storage remain owned by the existing backend during UI migration.

## Workspace documentation

- [Application directory](../docs/APPLICATIONS.md)
- [Repository structure and file policy](../docs/REPOSITORY_STRUCTURE.md)
- [Current architecture](../docs/ARCHITECTURE.md)
- [Ownership and independent builds](../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
