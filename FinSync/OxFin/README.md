# OxFin

A separate customer product for wallets, cards, bills and investment-related workflows.

**Runtime:** Next.js web application, PostgreSQL/Redis infrastructure and reference service prototypes.

**Status:** Under development. Ultimate is the target for OxFin customer administration; existing service prototypes are not a production admin backend.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install --prefix ox-fin-web
Copy-Item ox-fin-web/.env.example ox-fin-web/.env.local
Copy-Item ox-fin-backend/.env.example ox-fin-backend/.env
```

## Run

```powershell
npm --prefix ox-fin-web run dev
```

## Configuration

- Configure DATABASE_URL, NEXTAUTH_SECRET and optional provider credentials locally.
- Database infrastructure is in ox-fin-backend/docker-compose.yml. Set its required password before starting it. Preserve existing volumes.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm --prefix ox-fin-web run build
```

## Scope and limitations

- The six services/ folders are reference prototypes with incomplete dependency manifests. They are not part of the default workspace launcher.
- In particular, the example identity service does not implement password verification and must not authorise customer administration.

## Workspace documentation

- [Application directory](../../docs/APPLICATIONS.md)
- [Repository structure and file policy](../../docs/REPOSITORY_STRUCTURE.md)
- [Current architecture](../../docs/ARCHITECTURE.md)
- [Ownership and independent builds](../../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
