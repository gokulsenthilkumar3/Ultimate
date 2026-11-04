# OxFin identity prototype

Reference token, registration and consent handlers.

**Runtime:** TypeScript/Express prototype.

**Status:** Prototype only: login does not verify passwords. It must not authorise real customers or administrators.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

This is reference source, not a complete standalone installation. Follow the status and limitations below before attempting execution.

## Run

No supported standalone launch is documented for this reference package.

## Configuration

- AUTH_JWT_SECRET must be supplied explicitly; there is no shared development secret.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

No complete verification command is declared for this reference package.

## Scope and limitations

- Complete dependency manifests, credential verification, persisted identity, token lifecycle and security tests before considering standalone use.

## Workspace documentation

- [Application directory](../../../../docs/APPLICATIONS.md)
- [Repository structure and file policy](../../../../docs/REPOSITORY_STRUCTURE.md)
- [Current architecture](../../../../docs/ARCHITECTURE.md)
- [Ownership and independent builds](../../../../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../../../../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../../../../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../../../../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../../../../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../../../../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../../../../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
