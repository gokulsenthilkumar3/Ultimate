# GrowthTrack workspace

A desktop workspace for personal growth, work, family, equity and Forex research, with a dedicated customer-admin area for the separate FinSync and OxFin products.

**Runtime:** Node.js/npm workspace; Ultimate uses React, Vite and Express. Companion services retain their current frameworks.

**Status:** NiftyLens, Family Connect and Forex have native Ultimate UI modules. The fictional review demo stays isolated; restricted customer-admin adapters remain separate work.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install --prefix growthtrack-ultimate
Copy-Item growthtrack-ultimate/.env.example growthtrack-ultimate/.env
```

## Run

```powershell
npm run dev
```

## Configuration

- Configure Ultimate's ignored .env for the live application. The design demo requires no credentials.
- Install and configure companion dependencies before using npm run dev. Use npm run dev:core for Ultimate, the gateway and database console only.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run build:design
npm run test:design
npm run test:gateway
npm run design:check
node --test tests/code-context.test.mjs
```

## Scope and limitations

- Design demo: http://127.0.0.1:5410/admin-demo.html. Use All pages & review to inspect every page, tab, theme and UI state.
- Live workspace: npm run dev, then http://127.0.0.1:5000/Ultimate/. This starts Ultimate, the gateway, database console, Family API and Forex API. npm run dev:all also runs the standalone customer and legacy UIs.
- Customer applications remain separate. The demo's customer records are fictional, with no product APIs connected.
- Local code retrieval: npm run context:index, then npm run context:search -- "question or symbol". Embeddings are optional planned work.
- Tested Node runtime for this change: 24.12.0. Python and external data services are required only for their respective applications.

## Workspace documentation

- [Complete UI workflow and style guide](docs/UI_WORKFLOW_AND_STYLE_GUIDE.md)
- [Application directory](docs/APPLICATIONS.md)
- [Ownership and independent builds](docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
