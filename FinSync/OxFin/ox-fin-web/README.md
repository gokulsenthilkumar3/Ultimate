# OxFin Web

The independent OxFin customer interface for wallets, cards, bills and investment workflows.

**Runtime:** Next.js, React, NextAuth and PostgreSQL.

**Status:** Customer application under development. Shared customer-admin adapters are planned in Ultimate.

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

- Configure DATABASE_URL and NEXTAUTH_SECRET. OAuth, payment and investment integrations require their own server-only environment values.
- NEXT_PUBLIC_API_BASE and NEXT_PUBLIC_BASE_PATH are public routing configuration. Never put provider secrets in public variables.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run build
npm test
```

## Scope and limitations

- Start database infrastructure separately if required. The workspace launcher uses internal product ports and shared routes.
- Customer-admin authorisation must use explicit product permissions, not a consumer session or iframe handoff.

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
