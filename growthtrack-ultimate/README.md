# GrowthTrack Ultimate

The desktop portal for personal growth, work, insights and family/market modules, and the future customer-admin home for FinSync and OxFin.

**Runtime:** React, Vite, Express, Prisma/SQLite; optional Electron desktop packaging and Three.js physique tools.

**Status:** Authenticated desktop portal with native NiftyLens, Family Connect and Forex pages, shared motion/loading states and a separate fictional review demo. FinSync/OxFin customer adapters still require configuration.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install
Copy-Item .env.example .env
npm run db:generate
```

## Run

```powershell
npm run dev
```

## Configuration

- The design demo requires no credentials. ADMIN_DEMO_PORT can override its local port.
- The live app requires locally configured owner credentials, session/encryption/handoff secrets and its database. After configuration, npm run db:sync initialises the development schema; review database changes before running it against existing data.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run build:design
npm run test:design
npm run build
npm test
```

## Scope and limitations

- For the existing app use npm run dev; the workspace-root npm run dev:core also starts the gateway and database console.
- 3D research HTML and assets live in docs/3d-plans/. Runtime Physique assets remain separate.
- Use the root architecture plan for product boundaries and the required customer-admin security work.

## Workspace documentation

- [Complete UI workflow and style guide](../docs/UI_WORKFLOW_AND_STYLE_GUIDE.md)
- [Application directory](../docs/APPLICATIONS.md)
- [Ownership and independent builds](../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
