# Family Connect application

Family membership, relationship trees, memories, calendar events and document workflows.

**Runtime:** React/Vite frontend and Express/Prisma/PostgreSQL backend.

**Status:** Under development; native portal migration is planned.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install --prefix frontend
npm install --prefix backend
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
```

## Run

```powershell
npm --prefix frontend run dev
```

## Configuration

- Configure DATABASE_URL and JWT_SECRET for the backend. Set the frontend API base for standalone development; the workspace launcher provides its shared routing.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm --prefix frontend run build
npm --prefix backend run build
```

## Scope and limitations

- Run npm --prefix backend run dev in a second terminal after configuration. Generate Prisma client with npm --prefix backend run prisma:generate.
- Database migrations modify schema; review them against your existing data before applying them.

## Workspace documentation

- [Application directory](../../docs/APPLICATIONS.md)
- [Ownership and independent builds](../../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
