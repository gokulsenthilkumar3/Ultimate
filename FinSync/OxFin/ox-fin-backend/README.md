# OxFin local infrastructure

Local PostgreSQL and Redis definitions and SQL initialisation for OxFin.

**Runtime:** Docker Compose; this folder is not a Node.js API package.

**Status:** Development infrastructure. Initialisation scripts run only for new database volumes.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
Copy-Item .env.example .env
```

## Run

```powershell
docker compose up -d
```

## Configuration

- Set POSTGRES_PASSWORD in the ignored .env before starting Compose; it has no shared default.
- Existing PostgreSQL volumes retain their current credentials. Changing an environment value does not rotate an existing database password.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
docker compose config --quiet
```

## Scope and limitations

- Preserve persistent volumes. No database migration, credential rotation or data deletion is part of the UI redesign.

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
