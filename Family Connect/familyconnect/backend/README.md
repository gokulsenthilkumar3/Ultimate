# Family Connect Backend

Family authentication, trees, relationships, events, documents and notification APIs.

**Runtime:** Express, TypeScript, Prisma and PostgreSQL; optional Redis and AI integration.

**Status:** Existing backend. Preserve its per-family permissions during portal migration.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install
Copy-Item .env.example .env
npm run prisma:generate
```

## Run

```powershell
npm run dev
```

## Configuration

- DATABASE_URL and JWT_SECRET are required. Generate your own random signing secret; there is no built-in fallback.
- PORT, REDIS_URL and GEMINI_API_KEY are optional configuration. An AI provider is not required for the family application.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run build
```

## Scope and limitations

- Apply database migrations only after reviewing their effect on the target database. No migration is performed by the design demo.
- The server refuses to start without a JWT signing secret.

## Workspace documentation

- [Application directory](../../../docs/APPLICATIONS.md)
- [Ownership and independent builds](../../../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../../../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../../../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../../../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../../../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../../../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../../../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
