# Expense Tracker Mobile reference

An earlier Expo expense-tracking application, retained separately from the canonical FinSync mobile package.

**Runtime:** Expo and React Native.

**Status:** Reference application. Desktop portal work does not imply its features are merged or mobile-tested.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install
```

## Run

```powershell
npm start
```

## Configuration

- Configure only integrations used by this application's source; public app configuration cannot hold secrets.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run lint
```

## Scope and limitations

- Use FinSync/apps/mobile for canonical FinSync mobile development. Keep customer administration in Ultimate.

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
