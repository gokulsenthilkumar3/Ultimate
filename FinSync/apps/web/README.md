# FinSync Web

The customer-facing FinSync web interface for sign-in, onboarding, spending, budgets and account settings.

**Runtime:** Next.js App Router, React and Firebase.

**Status:** Independent customer app. Future administrator pages are owned by Ultimate.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
npm install --prefix ../..
Copy-Item .env.example .env.local
```

## Run

```powershell
npm run dev
```

## Configuration

- Provide NEXT_PUBLIC_FIREBASE_* project configuration in .env.local. Public variables are visible in the browser.
- Legacy NEXT_PUBLIC_ENCRYPTION_KEY has no built-in fallback and is not a confidential key. Do not use browser-held encryption for production PII; migrate through an authenticated server endpoint first.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
npm run type-check
npm run build
```

## Scope and limitations

- Missing required Firebase configuration now produces a setup error instead of using a hardcoded project.
- Onboarding requires a real session and a successful database save; it no longer reports mocked local saves as success.

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
