# GrowthTrack architecture

Status: maintained overview, 5 November 2026. Read the [engineering plan](Eng%20Plan.md) for priorities and proposed work, [build boundaries](BUILD_BOUNDARIES.md) for ownership, and [repository structure](REPOSITORY_STRUCTURE.md) for file placement. The [earlier architecture overview](archive/architecture-overview-legacy.md) is retained as historical guidance.

## Product boundaries

Ultimate is the desktop owner portal. It uses React/Vite, Express, Prisma/SQLite and optional Electron packaging. FinSync and OxFin keep separate customer applications and identities; their customer-administration presentation belongs in Ultimate. A shared shell does not merge their customer databases, sessions or authorization.

Equity, Family and Forex have native portal presentation under Ultimate's domain modules. Their standalone applications and backend responsibilities remain independently owned. Family owns its identity, tree permissions and files. Forex owns Python inference and saved research artifacts. Equity owns its price-cache/provider integration. See [the application directory](APPLICATIONS.md).

## Runtime flow

1. Ultimate serves the portal at the configured frontend base path, normally /Ultimate/ through the workspace launcher.
2. The browser restores the Ultimate owner session through the API client. Unsafe requests carry the session CSRF token; private records are filtered by owner on the server.
3. Domain UI and store actions call their owned endpoints. The store in src/store/useStore.ts restores /api/state and coordinates acknowledged writes through persistence helpers. Browser persistence is not the authoritative identity or authorization boundary.
4. Express owns Ultimate application routes, validation, sessions, private storage and Prisma access. SQLite migration and encrypted backup/restore behavior belong to the backend.
5. The workspace gateway routes explicit companion namespaces to their owning services. It does not turn an Ultimate owner session into a product-admin credential.

The relevant implementation lives in the [application shell](../growthtrack-ultimate/src/App.jsx), [API client](../growthtrack-ultimate/src/lib/apiClient.js), [store](../growthtrack-ultimate/src/store/), [Express entry point](../growthtrack-ultimate/server.js), [security middleware](../growthtrack-ultimate/server/security.js), [server domains](../growthtrack-ultimate/server/domains/) and [workspace gateway](../scripts/gateway.mjs). Consult the owning source before changing behavior.

## Customer administration

The presentation exists, but restricted FinSync/OxFin adapters are not production-ready. Known products return authenticated unavailable responses until configured. Real adapters require product-scoped authorization, server-owned credentials, minimal response contracts and audited mutations. They must not reuse customer handoff tokens as administrator authority.

The [engineering plan](Eng%20Plan.md) tracks replacing FinSync's browser-held encryption boundary, building authorized customer-admin adapters and verifying OxFin database TLS. Follow its current evidence and acceptance criteria when assessing implementation progress. This documentation pass does not implement those runtime changes.

## Dependency direction

Domain modules own product logic and data access. Shared UI primitives and explicit contracts may be reused; production modules must not import fictional demo fixtures, server implementations into the browser, or sibling-domain implementation details. The native companion presentation shares primitives under src/domains/native without transferring service ownership.

The demo under src/admin-demo uses fictional data and local review interactions. Its fixtures and mutations remain isolated from production authentication, queries, stores and persistence.

Use npm run architecture:check for the supported relative JS/TS import rules. The static graph does not resolve every alias, computed import, Python reference or runtime interaction, and does not prove the absence of cycles. Independent builds and runtime contracts remain separate evidence.

## Configuration and packaging

Dependency manifests, lockfiles and environment examples belong to their application or owning workspace. FinSync's apps share the parent npm workspace lockfile; reference prototypes do not all have complete manifests. Generated READMEs come from [applications.json](applications.json). Secrets stay in ignored local environments or deployment secret storage; frontend-public variables are visible to clients. Git exclusions and Docker-context exclusions are separate boundaries.

Node majors in the repository are not fully uniform: the local runtime pin and main CI follow .nvmrc, while some containers/platform jobs use another supported major. The checked-in engine ranges and each owner's builds determine compatibility; do not claim identical runtimes everywhere.

## Verification and decisions

Use [CI validation](CI_VALIDATION.md) for configured checks, measured local results and known failures. Browser tests, generated review matrices and historical audit counts do not establish visual approval or production capacity. The [UI handoff](UI_ARCHITECTURE_HANDOFF.md) describes the review process and its limits.

Preserve historical 3D research, model provenance, licensing and independent build scripts. Do not restart the workspace, migrate databases, delete legacy products or broaden public access as part of documentation/configuration cleanup.
