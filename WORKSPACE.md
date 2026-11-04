# GrowthTrack workspace operations

This is the maintained launcher entry point. See [current architecture](docs/ARCHITECTURE.md), [repository structure](docs/REPOSITORY_STRUCTURE.md), [engineering priorities](docs/Eng%20Plan.md) and the [complete local runtime guide](docs/UNIFIED_LOCAL_WORKSPACE.md). The [earlier integration notes](docs/archive/workspace-before-native-modules.md) are preserved as historical context.

## Launch modes

Run commands from the repository root after configuring and installing the selected applications.

| Command | Processes |
| --- | --- |
| npm run dev | Ultimate, API gateway, database console, Family API and Forex API |
| npm run dev:core | Ultimate, API gateway and database console |
| npm run dev:all | Full workspace, including standalone customer and legacy companion UIs |
| npm run dev:design | Fictional isolated review demo |

Ultimate's workspace entry is http://127.0.0.1:5000/Ultimate/. The gateway uses port 5300 and the database console uses 5556. Native Equity, Family and Forex views are part of the portal; standalone product handoffs require their selected process. FinSync and OxFin remain separate customer products.

## Validation

- npm run repository:check checks file ownership, supported configuration syntax and documentation/container boundaries.
- npm run architecture:check checks supported static production import boundaries.
- npm run docs:check verifies the generated application READMEs.
- npm run config:check verifies safe environment templates.
- See [CI validation](docs/CI_VALIDATION.md) for application tests, browser checks and performance limits.

The launcher does not authorize database migrations, deletion of local stores, deployment or production load tests. Preserve each product's sessions, data and independently owned build.
