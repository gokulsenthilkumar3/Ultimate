# Server configuration

All backend settings are read once by `server/config.js`, validated, and frozen. Each one has a default and can be overridden from the environment (`.env` locally, mounted secrets or variables in a container). Blank values count as unset. If any value is invalid, the server refuses to start and lists every problem, for example:

```text
Invalid server configuration:
- PORT: Invalid input: expected number, received NaN
- SYNC_MFAPI_BASE_URL: must use https
```

Secrets that belong to third parties (`STRIPE_*`, `GITHUB_CLIENT_*`, `OLLAMA_BASE_URL`, `DATABASE_URL`, `FILE_STORAGE_ROOT`, `LOG_*`) are read where they are used and are optional.

For a fresh local development installation, install dependencies, copy `.env.example` to a new ignored `.env`, and run `npm run db:generate`. Only for a new database, review the schema and run `npm run db:sync`, configure `OWNER_EMAIL`, `OWNER_NAME` and `OWNER_PASSWORD` locally, then run `npm run owner:create`. New passwords require at least 12 characters and at most 72 UTF-8 bytes. Remove the bootstrap password afterward. Existing installations use the reviewed migration/rehearsal procedures instead of an automatic schema push. Container initialization is described in [deployment](DEPLOYMENT.md).

## HTTP server

| Variable | Default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` requires `HANDOFF_SECRET`, drops local origins and serves the built frontend. |
| `PORT` | `3001` | API port. |
| `LISTEN_HOST` | `127.0.0.1` | Interface to bind. Containers explicitly use `0.0.0.0`; use that only when network access is intended. |
| `APP_URL` | `http://localhost:5000/Ultimate` | Public app address, kept exactly as written. |
| `APP_ORIGINS` | none | Comma-separated allowed browser origins. When set, replaces the development origins. |
| `CSP_CONNECT_ORIGINS` | none | Additional exact HTTP(S) origins for browser connections. No credentials, paths, wildcards or CSP directives. Same-origin traffic and the built-in Open-Meteo, Stripe and Mixpanel API origins are allowed. Add the ingest origin from a configured Sentry DSN here. |
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
| `OWNER_MFA_SECRET` | none | Optional uppercase, unpadded Base32 authenticator secret (32–128 characters). Required at every owner sign-in once configured. Also supports `OWNER_MFA_SECRET_FILE` through the deployment secret loader. |
| `APP_ENCRYPTION_KEY` | none | 64 hex characters; encrypts new vault files and sync connection secrets. Without it, sources that need a key or private URL show "Server key needed". |

MFA setup: run `npm run mfa:setup` in a private terminal. Add the generated secret or provisioning URI to an authenticator, retain a protected recovery copy, then put `OWNER_MFA_SECRET` in the ignored backend environment or deployment secret manager and restart. The login page requests a six-digit code after password verification. Codes use a 30-second period with one adjacent interval of clock tolerance; accepted counters are stored atomically in private application settings to reject replay across processes and restarts. Secret values and codes are not written to audit events. Enabling or rotating MFA requires existing password-only/previous-key sessions to sign in again. Other installations keep their existing session behaviour.

Recovery requires local operator access to the server secret configuration. There is no browser bypass or self-service enrollment. Rotate the authenticator secret after recovery; turning it off restores password-only authentication. Keep clocks synchronized and treat this as owner authentication for a single-owner deployment, rather than per-customer MFA provisioning.

Production HTML permits application-owned inline scripts by SHA-256 hash. Script attributes and JavaScript eval are blocked; Three's optional WASM decoding is allowed separately. Inline styles remain supported for the existing animation/rendering libraries. The same policy builder covers the frontend, server health page and API Explorer. See the [W3C CSP specification](https://www.w3.org/TR/CSP3/) and [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).

## Encrypted scheduled backups

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKUP_ENABLED` | off | Enable consistent encrypted SQLite snapshots while the server runs; requires `APP_ENCRYPTION_KEY`. |
| `BACKUP_DIR` | `backups` | Destination relative to the Ultimate directory, or an absolute mounted destination. |
| `BACKUP_INTERVAL_HOURS` | `24` | Time between completed runs (1–168 hours). |
| `BACKUP_FIRST_RUN_SECONDS` | `60` | Delay after startup (0–3600 seconds). |

Each run includes committed WAL data, integrity/foreign-key checks, schema/count parity and a fresh restore. The snapshot is streamed into an AES-256-GCM archive with a random IV and authenticated format header. The actual archive is decrypted into a new temporary file and its checksum is checked against the verified snapshot before a success manifest is published. Archives use `.db.enc`; manifests contain archive metadata rather than database records or table counts. Recovery checks use private temporary plaintext files that are removed at completion; the host's temporary storage must be protected. Persistent migration/legacy `npm run backup:db` copies remain plaintext.

Configure a mounted off-device `BACKUP_DIR` to retain copies beyond the machine. The scheduler prevents overlapping runs, retries at the next interval after failure, and drains in-flight work during shutdown. It does not delete older archives. Health JSON includes safe scheduling/last-success/failure status; authenticated `GET /api/operations/backups` reads it and CSRF-protected `POST /api/operations/backups` requests a run. This is a database backup, so retain uploaded file bytes and the original encryption key separately for a complete recovery set.

Run `npm run backup:restore -- <archive.db.enc> <NEW-destination.db>` to decrypt into a new file. The command refuses existing destinations and does not replace live storage. Keep `APP_ENCRYPTION_KEY` matching the archive, inspect the recovered database, then perform any application recovery through a coordinated operator procedure. Enabling backups does not migrate or encrypt existing SQLite records, logs or legacy files.

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
- `SIGTERM` and `SIGINT` stop sync, backup scheduling and log cleanup, let in-flight requests and backup work finish, close the database and exit (forced after 10 seconds). Electron's quit hook drains its local server and backups before quitting; shared-server mode does not stop the remote deployment.
- Rate-limit, login-throttle and handoff-nonce maps drop expired entries, so memory stays bounded on long-running servers.
