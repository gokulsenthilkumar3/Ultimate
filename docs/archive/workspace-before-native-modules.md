# GrowthTrack Workspace

Current redesign proposal: [desktop admin portal plan](../plans/2026-10-28-admin-redesign.md).
Run `npm run dev:design` for the isolated review demo. The runtime described below
is the existing integration, before native module migration. FinSync and OxFin
remain separate customer products; their customer-admin UI will live in Ultimate.

A monorepo of personal-growth and finance products, with **Ultimate** as the local control center.

The current default launcher provides **one UI port (5000), one API gateway
(5300), and one database console (5556)**. All five products open inside Ultimate;
their framework ports are internal. Existing SQLite and PostgreSQL stores are
preserved. See [the current local workspace guide](../UNIFIED_LOCAL_WORKSPACE.md)
for shared URLs, API namespaces, database sources and internal port details.

---

## Quick start

```bash
# Start Ultimate and all companion UIs/APIs, gateway and database console
npm run dev

# Start just Ultimate, gateway and database console
npm run dev:core

# Start gateway + Ultimate + FinSync
npm run dev:all  # or: node scripts/workspace.mjs gateway ultimate finsync

# Per-product dev commands
npm run dev:gateway   # API gateway on :5300
npm run dev:ultimate  # Ultimate UI :5000  /  API :3001
npm run dev:finsync   # FinSync web  :5101
npm run dev:oxfin     # OxFin web    :5102
npm run dev:family    # FamilyConnect :5104
npm run dev:equity    # NiftyLens    :5105
npm run dev:forex     # Forex (Streamlit) :8501  — requires Python venv
```

---

## Internal runtime port map

| Service | UI port | API / notes |
| --- | --- | --- |
| **Gateway** | — | :5300 (all `/api/*` routes) |
| **Ultimate** | :5000 (`/Ultimate/`) | :3001 (internal API) |
| **FinSync** | :5101 | Next.js API routes on same port |
| **OxFin** | :5102 | Next.js API routes on same port |
| **Family Connect** | :5104 | Vite frontend; backend separate |
| **Equity / NiftyLens** | :5105 | Next.js |
| **Forex** | :8501 | Streamlit — Python venv required |
| **Ollama (Agent)** | — | :11434 probed by gateway |

---

## API gateway namespaces

```text
GET  /api/gateway/health          → aggregate health of all products
GET  /api/gateway/products        → product registry (id, name, uiUrl, …)

/api/ultimate/*  →  http://127.0.0.1:3001  (Ultimate API)
/api/agent/*     →  http://127.0.0.1:11434 (Ollama)
/api/finsync/*   →  http://127.0.0.1:5101
/api/oxfin/*     →  http://127.0.0.1:5102
/api/family/*    →  http://127.0.0.1:5104
/api/equity/*    →  http://127.0.0.1:5105
/api/forex/*     →  http://127.0.0.1:8501

/api/*  (no product prefix)  →  Ultimate  (backwards-compat)
/auth/* →  Ultimate directly (Vite proxy bypasses gateway for auth cookies)
```

---

## Product registry contract

Each product in `growthtrack-ultimate/src/config/products.js` exposes:

```ts
{
  id: string;          // 'finsync' | 'oxfin' | 'forex' | 'family' | 'equity'
  name: string;        // display name
  icon: string;        // emoji
  color: string;       // hex accent colour
  description: string; // one-line summary
  uiUrl: string;       // local dev URL opened in new tab
  apiPrefix: string;   // '/api/finsync' etc.
  healthUrl: string;   // path probed by gateway (e.g. '/api/finsync/health')
  command: string;     // shown in App Hub: 'npm run dev:finsync'
  callbackUrl: string; // where Ultimate redirects after handoff auth
  capabilities: string[];
}
```

---

## Signed handoff flow

1. User clicks "Open app" on a product card in the App Hub.
2. Ultimate server issues a short-lived (60 s, one-time-use) signed token via `POST /api/integrations/handoff`.
3. New tab opens at `{callbackUrl}?ultimate_handoff={token}`.
4. Product validates the token via `POST /api/integrations/consume` (through the gateway).
5. Product reads `{ user: { id, email, name }, provider: 'ultimate-local' }` and creates a local session.

Token payload: `{ iss, aud, sub, email, name, iat, exp, jti }` — HMAC-SHA-256 signed.

Generate `HANDOFF_SECRET` once and put it in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Authentication adapters

`growthtrack-ultimate/server/identityProviders.js` lists all supported identity providers.
Only `local` is currently enabled. To add Google / Apple / Microsoft:

1. Obtain OAuth credentials from the provider.
2. Set `enabled: true` for the provider in `identityProviders.js`.
3. Implement the OAuth callback route in `server.js` (stub is already present for GitHub as a reference).

No product integrations or the database schema need to change — each product receives the same handoff payload regardless of which identity provider the owner used.

---

## Canonical product roots

| Product | Canonical path | Notes |
| --- | --- | --- |
| FinSync | `FinSync/apps/web` | Web app (Next.js + Firebase) |
| FinSync Mobile | `FinSync/apps/mobile` | React Native — separate launcher |
| OxFin | `FinSync/OxFin/ox-fin-web` | Standalone; surfaced as FinSync capability |
| Forex | `Forex/` | Python/Streamlit + ML ensemble |
| Family Connect | `Family Connect/familyconnect/frontend` | Vite; backend in `../backend` |
| Equity/NiftyLens | `Equity/NiftyLens` | Next.js market dashboard |

The `Forex/Forex-Ensemble-Prediction/` subdirectory is a legacy ML notebook source — not a second launcher target.

---

## Adding a new product

1. Add an entry to `growthtrack-ultimate/src/config/products.js`.
2. Add a target + probe entry in `scripts/gateway.mjs` (under `targets` and `productNames`).
3. Add a health registry entry in `growthtrack-ultimate/server.js` (`GATEWAY_PRODUCT_REGISTRY`).
4. Add a launcher entry in `scripts/workspace.mjs` (`COMMANDS`).
5. Add `dev:<product>` script to root `package.json`.
6. Document the port in this file.

---

## Environment setup

Copy `growthtrack-ultimate/.env.example` to `growthtrack-ultimate/.env` and fill in:

- `OWNER_EMAIL` / `OWNER_PASSWORD` — your local login credentials
- `HANDOFF_SECRET` — random 32-byte hex (see command above)
- `APP_ENCRYPTION_KEY` — 32-byte hex for encrypted fields

Everything else has safe defaults for local development.

## Visual-system contribution rules

Ultimate's shared visual tokens and primitives live in `growthtrack-ultimate/src/design` and `growthtrack-ultimate/src/components/ui`. Keep gateway, handoff, session, logging, and standalone product contracts intact when adopting the visual system. See `growthtrack-ultimate/docs/DESIGN_SYSTEM.md` and `MIGRATION_GUIDE.md`.

## Shared visual system

Use `npm run design:sync` to refresh companion-product design adapters and
`npm run design:check` to verify them. See [adapter documentation](../SHARED_DESIGN_ADAPTERS.md)
and the [current verification matrix](../UX_UPGRADE_VERIFICATION.md).
