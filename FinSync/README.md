# FinSync

A separate customer finance application for budgets, spending, account connections and financial planning, with web and mobile source packages.

**Runtime:** npm workspaces, Next.js web frontend, Firebase integration and Expo mobile source.

**Status:** Customer application under development. Its customer administration belongs in GrowthTrack Ultimate; the customer app is not merged into Ultimate.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
```

## Run

```powershell
npm run web:dev
```

## Configuration

- Configure the web application's Firebase project in apps/web/.env.local. The parent .env.example is a variable reference, not a file automatically loaded by Next.js in apps/web.
- Server SDK credentials and financial-provider secrets must stay in server-only environment variables.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run type-check --workspace=apps/web
```

## Scope and limitations

- Use apps/mobile for the mobile source. OxFin remains a separate product in this repository.
- Legacy onboarding uses browser-visible encryption configuration and needs server-side replacement before production. Removing fallback keys does not make that design secure.
- The root UI demo demonstrates customer administration with fictional data; it is not a live customer backend.

## Workspace documentation

- [Application directory](../docs/APPLICATIONS.md)
- [Ownership and independent builds](../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
