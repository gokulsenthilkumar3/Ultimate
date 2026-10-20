# Server configuration

All backend settings are read once by `server/config.js`, validated, and frozen. Each one has a default and can be overridden from the environment (`.env` locally, mounted secrets or variables in a container). Blank values count as unset. If any value is invalid, the server refuses to start and lists every problem, for example:

```text
Invalid server configuration:
- PORT: Invalid input: expected number, received NaN
- SYNC_MFAPI_BASE_URL: must use https
```

Secrets that belong to third parties (`STRIPE_*`, `GITHUB_CLIENT_*`, `OLLAMA_BASE_URL`, `DATABASE_URL`, `FILE_STORAGE_ROOT`, `LOG_*`) are read where they are used and are optional.

## HTTP server

| Variable | Default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` requires `HANDOFF_SECRET`, drops local origins and serves the built frontend. |
| `PORT` | `3001` | API port. |
| `LISTEN_HOST` | `0.0.0.0` | Interface to bind. |
| `APP_URL` | `http://localhost:5000/Ultimate` | Public app address, kept exactly as written. |
| `APP_ORIGINS` | none | Comma-separated allowed browser origins. When set, replaces the development origins. |
| `DEV_ORIGIN_PORTS` | `3001,5000,5001,5173` | Local ports allowed (as localhost and 127.0.0.1) when `APP_ORIGINS` is unset outside production. |
| `TRUST_PROXY` | `false` | Trust one reverse proxy for client IPs. |
| `SERVE_FRONTEND` | `false` | Serve `dist/` from the API (always on in production). |
| `FRONTEND_BASE_PATH` | `/Ultimate/` | Base path of the served frontend. |
| `JSON_BODY_LIMIT_MB` | `8` | Largest accepted JSON body (1–64). |

## Sessions, abuse limits and keys

| Variable | Default | Meaning |
| --- | --- | --- |
| `SESSION_HOURS` | `12` | Session lifetime (1–720). |
| `SESSION_TOUCH_MS` | `300000` | How often an active session's last-seen time is refreshed. |
| `LOGIN_WINDOW_MS` / `LOGIN_MAX_ATTEMPTS` | `900000` / `5` | Failed sign-in throttle. |
| `API_RATE_LIMIT_PER_MINUTE` | `120` | Write requests per client and path per minute. |
| `HANDOFF_SECRET` | ephemeral in development | 64 hex characters; signs companion handoffs. Required in production. |
| `APP_ENCRYPTION_KEY` | none | 64 hex characters; encrypts new vault files and sync connection secrets. Without it, sources that need a key or private URL show "Server key needed". |

## Logs and companion products

| Variable | Default | Meaning |
| --- | --- | --- |
| `LOG_RETENTION_DAYS` | `90` | Audit, session and login log retention. |
| `LOG_CLEANUP_HOURS` | `6` | How often expired logs are removed. |
| `GATEWAY_PROBE_TIMEOUT_MS` | `1800` | Timeout for each companion health probe. |
| `COMPANION_FINSYNC_URL` | `http://localhost:5101` | Base URL; health is `/api/health`, handoff callback `/auth/ultimate/callback`. |
| `COMPANION_OXFIN_URL` | `http://localhost:5102` | As above. |
| `COMPANION_FOREX_URL` | `http://localhost:8501` | Health `/api/health`; handoff opens the base URL. |
| `COMPANION_FAMILY_URL` | `http://localhost:5104` | As above. |
| `COMPANION_EQUITY_URL` | `http://localhost:5105` | As above. |
| `DB_STUDIO_URL` / `GATEWAY_URL` | `http://localhost:5556` / `http://localhost:3000` | Links on the server health page. |

## Feature gates and record storage

| Variable | Default | Meaning |
| --- | --- | --- |
| `GROWTHTRACK_NOTES_V1` | off | Versioned Notes; requires `npm run migrate:notes`. |
| `GROWTHTRACK_RECORD_ROWS` | off | Calendar events and holdings as revisioned rows; requires `npm run migrate:records`. The desktop app decides this from its own database. |
| `RECORD_CALENDAR_LIMIT` / `RECORD_HOLDINGS_LIMIT` | `5000` / `200` | Active records per owner. |
| `RECORD_MAX_KB` | `64` | Largest single stored record. |

Flags accept `1/0`, `true/false`, `on/off` or `yes/no`.

## Sync engine

| Variable | Default | Meaning |
| --- | --- | --- |
| `GROWTHTRACK_SYNC_SCHEDULER` | on | Background refresh of connected sources. |
| `SYNC_SCHEDULER_INTERVAL_MINUTES` | `5` | How often the scheduler checks for due sources. |
| `SYNC_FIRST_RUN_SECONDS` | `30` | Delay before the first check after start. |
| `SYNC_FETCH_TIMEOUT_MS` | `10000` | Provider API timeout. |
| `SYNC_FEED_TIMEOUT_MS` / `SYNC_FEED_MAX_MB` | `15000` / `5` | Calendar feed timeout and size cap. |
| `SYNC_CALENDAR_PAST_DAYS` / `SYNC_CALENDAR_FUTURE_DAYS` | `30` / `400` | Window of one-off events mirrored from a feed. |
| `SYNC_INTERVAL_{MFAPI,COINGECKO,ALPHAVANTAGE,ICS}_MINUTES` | `360`, `60`, `720`, `60` | Refresh interval per source. |
| `SYNC_MFAPI_PER_RUN` / `SYNC_ALPHAVANTAGE_PER_RUN` | `60` / `5` | Holdings priced per run (provider rate limits). |
| `SYNC_MFAPI_BASE_URL`, `SYNC_COINGECKO_BASE_URL`, `SYNC_ALPHAVANTAGE_BASE_URL` | the providers' public APIs | HTTPS base URL, for example a caching proxy. Requests are pinned to that host. |

## Operational behaviour

- Every unhandled failure, malformed JSON body or oversized body returns `{ code, error, requestId }` JSON; stack traces and internal messages are logged, never returned.
- `SIGTERM` and `SIGINT` stop the scheduler and log cleanup, let in-flight requests finish, close the database and exit (forced after 10 seconds). The desktop app manages its own lifecycle.
- Rate-limit, login-throttle and handoff-nonce maps drop expired entries, so memory stays bounded on long-running servers.
