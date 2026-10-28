# Equity / NiftyLens

Equity instruments, market charts, watchlists and market-data API source.

**Runtime:** Next.js, React, Firebase/Supabase integrations and a separate pipeline folder.

**Status:** Existing application with a planned native portal UI. Provider availability depends on configuration.

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

- Configure the Firebase and/or Supabase integration used by your deployment. Public anonymous keys require database access rules; service-role keys remain server-only.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run typecheck
npm run build
```

## Scope and limitations

- Missing providers must surface as unavailable data. The isolated portal demo uses fictional market values.
- The pipeline has its own environment template and must be configured separately.

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
