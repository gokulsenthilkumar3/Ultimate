# Ultimate local workspace

Run `npm run dev` (or `npm run dev:all`) from the repository root. It starts
Ultimate, all five companion UIs, both separate companion APIs, the API gateway,
and the database console. Use `npm run dev:core` for Ultimate, gateway and console only.

| Entry point | URL |
| --- | --- |
| Ultimate and every product UI | http://localhost:5000/Ultimate/ |
| All product APIs | http://127.0.0.1:5300 |
| All local SQL stores, one read-only console | http://localhost:5556 |

The gateway uses 5300 because another local project occupies port 3000.
Ultimate's internal proxies and public API links use `127.0.0.1:5300` consistently.

In Ultimate, use **Apps** or **Apps Suite** to open FinSync, OxFin, Family Connect,
Equity/NiftyLens and Forex. These open inside Ultimate. **Databases → All databases**
opens the shared database console inside the same UI. The standalone console also
remains available on 5556. SQLite, OxFin PostgreSQL and Family Connect PostgreSQL
remain separate stores with their existing data. FinSync's existing cloud Firebase
integration is unchanged; it is not converted to a local SQL database.

Product HTML, navigation, assets and WebSockets use `/Ultimate/products/{product}/`
on port 5000. Framework base paths and Family Connect's router basename are set by
the workspace launcher. Browser API requests go through the same UI origin's `/api`
proxy to the gateway on 5300. They do not need to know internal backend ports.

| API namespace | Backend contract |
| --- | --- |
| `/api/ultimate/*` | Ultimate `/api/*`; legacy `/api/*` and `/auth/*` also work |
| `/api/finsync/*` | FinSync's Next.js API routes |
| `/api/oxfin/*` | OxFin's Next.js API routes |
| `/api/family/*` | Family Connect `/api/v1/*`; `/health` and `/uploads/*` supported |
| `/api/equity/*` | NiftyLens's Next.js API routes |
| `/api/forex/*` | Forex FastAPI routes, including `/docs` and `/openapi.json` |
| `/api/db/*` | Database source, table, schema and read-only query endpoints |
| `/api/gateway/health` | Aggregate service status |

The local processes retain loopback ports internally: Ultimate API 3001, Family API
3104, Next/Vite products 5101/5102/5104/5105, Forex UI 8501 and Forex API 8000.
Consolidation provides shared entry points; it does not combine different frameworks
into one process. Each companion still supports its original standalone mode when
started without the workspace environment variables.

The current existing database containers are Family PostgreSQL on 5432, OxFin
PostgreSQL on 5434 and project Redis on 6381. Start Docker and these containers if
they are stopped. `OXFIN_DB_PORT` overrides the OxFin port in the launcher and console.
The console also accepts `DB_STUDIO_SQLITE_URL`, `DB_STUDIO_OXFIN_URL` and
`DB_STUDIO_FAMILY_URL`. Credentials remain in ignored local environment files.

The launcher reuses services only after their configured health checks pass.
After changing base paths or switching between standalone and workspace mode,
restart the affected processes; an already-running server can have stale routing.

Validation: `npm run test:gateway`; the Ultimate `UnifiedWorkspace.test.jsx`,
`config.test.mjs` and `database-console.test.mjs` cover the shared routing, embedded
app view, handoff destinations and read-only source isolation.
