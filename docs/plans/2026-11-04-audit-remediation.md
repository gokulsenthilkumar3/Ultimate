# Comprehensive audit: engineering remediation

The supplied [audit transcript](../GrowthTrack%20Workspace%20%E2%80%94%20Comprehensive%20Audit.md) mixes observations from a different runtime, proposed features and historical product assumptions. This record describes the engineering work against the current checkout. Existing staged runtime/lint/test/asset work was retained. No owner environment, live database, deployment, product boundary or customer provisioning was changed.

## Implemented

- Retained the Node engine contracts and `.nvmrc` from existing work. CI now uses that exact runtime and splits unit/component coverage into four independently gated shards. Build/static checks, isolated backend tests and browser projects retain separate jobs and the required aggregate Quality Gate. The native SQLite fixture runner uses two workers on developer machines as well as CI.
- Fresh developer startup generates Prisma's client before launching. Generated root/Ultimate setup instructions include `db:generate`; no schema synchronization or migration runs automatically. The current `db:sync` command already uses Prisma 7's supported flags.
- Retained the ESLint asset/config scoping repairs. The avatar hook's existing acknowledgement check remains intact; its mocks now provide record acknowledgements, and the regression for an omitted acknowledgement remains required.
- Replaced broad script permissions with a shared CSP builder. Application-owned inline scripts receive hashes from the final served HTML (including HTML line-ending normalization). Script attributes and JavaScript eval are blocked. WASM decoders, blob workers, existing inline styles and explicit integration origins have separate policies. Exact origin validation prevents directive injection. Frontend index/SPA fallbacks, health HTML and the Explorer use the same builder.
- The standalone server defaults to loopback. The container explicitly binds its required network interface. Reverse proxy IP handling remains an explicit `TRUST_PROXY` operator setting.
- Added optional owner authenticator codes, provisioning instructions and login UI/provider support. Codes follow RFC 6238; all published SHA-1 vectors are tested. Counter claims are atomic in existing private settings, preventing replay across concurrent requests, processes and restarts. MFA sessions retain CSRF protection; password-only sessions must sign in again after MFA is enabled. Password verification uses a dummy bcrypt comparison for absent accounts and reserves throttle attempts before asynchronous work. New/changed credentials follow the existing desktop provisioning limit of 72 UTF-8 bytes; legacy password comparison remains compatible.
- Added optional encrypted scheduled SQLite backups, configurable intervals/destinations, non-overlap, failure/retry status, shutdown draining and authenticated status/manual-run endpoints. A successful archive includes an actual decrypt-and-checksum restore verification. Wrong keys/tampering fail; existing restore destinations cannot be replaced. Electron now waits for its local HTTP/backup work before closing; shared-server desktop mode leaves the remote server alone. Legacy migration backup behaviour is preserved.
- Extracted operational/diagnostic routes and companion handoffs into domain modules, keeping route URLs and authentication boundaries intact. Additional inline legacy CRUD/state routes remain; a wholesale rewrite is outside this repair.
- Updated the API Explorer to cookie sessions and CSRF, including MFA login and actual logout. Removed JWT/signup claims and inline event attributes. Added browser checks for the Explorer controls under the real CSP.
- Included the Explorer and native-entry contract in package definitions where needed by the server. Refreshed the historical model preview from its actual source asset so its provenance/geometry check can pass.

Configuration and recovery procedures are documented in [server configuration](../../growthtrack-ultimate/docs/CONFIGURATION.md). MFA and scheduled backups are opt-in; existing keys are neither generated nor rotated by application startup. Scheduled archives cover the database, while uploads and key recovery remain separate parts of an application recovery set. SQLite records/logs and historical migration backups are not encrypted by this change. Temporary backup verification files contain plaintext during a run and require protected host storage.

## Audit corrections and remaining product work

- Connected-source scheduling, NAV/crypto/stock/calendar connectors, a global command palette, capability-driven billing presentation and frontend performance budgets already exist. The audit's blanket statements that these are absent are stale.
- An unset development handoff key is generated with cryptographic randomness; it does not make token forgery trivial. Production already requires a configured key. Restart invalidation of the development handoff and process-local one-use nonce records remain explicit limits.
- Ultimate is the desktop owner portal, with separate FinSync/OxFin customer products and restricted customer-admin integration work. The workspace guidance already resolves that boundary; enabling public signup or removing product integrations would change the approved scope.
- Real Apple Health/wearable/bank ingestion, mobile transport/conflict resolution, full localization, customer-admin service authorization and a hosted multi-user lifecycle are feature projects. They need provider/product contracts and credentials rather than replacing setup-required states with fabricated data.
- On-demand model-pack distribution and retiring an animation library require separate asset/licence, offline/desktop and visual parity work. Lazy 3D loading and startup budgets remain enforced here.

## Verification

Verification uses synthetic fixtures and temporary databases. Component/browser checks are behavioural evidence and do not replace page approval.

| Check | Result |
| --- | --- |
| Production build and startup/compression budgets | Pass; eager JS 446,968/450,000 bytes, CSS 274,708/320,000 bytes; 217 compressed asset pairs verified. |
| Demo build and design tests | Pass; 1,005 tests in six files. |
| Isolated backend runner | Pass; 145/145 tests after bounding native fixture workers, including MFA, backup encryption/tampering/restore, route extraction and shutdown. |
| Full component run | 2,862/2,865 passed before the shared test-wait correction; three first-lazy-route assertions exceeded the one-second default. |
| Affected route/auth/browser recheck after the correction | Pass; 104/104 tests in six files, including every failure from the full run. The whole component suite was not rerun after this final test-only timing configuration change. |
| Browser security checks | Pass in Chromium: authorized hashed code runs; injected code/handlers, JavaScript eval and unlisted connections are blocked; Explorer cookie login, CSRF mutation and logout work. |
| Gateway, model preview and shared design contracts | Pass; 6 gateway/proxy tests, 16 preview tests, five design adapters. |
| Typecheck, Prisma generation and ESLint | Pass; existing lint warnings remain. |
| Runtime dependency audit at high severity | Pass; four moderate advisories remain in the Sentry Vite-plugin build-tool dependency chain. No forced plugin downgrade was applied. |
| Generated README and UI impact drift checks | Pass; 23 READMEs checked; impact map verification remains explicitly distinct from rendered page coverage. |

The attempted four-worker local component run was stopped after resource contention caused timing failures; subsequent verification used two workers. One native record-fixture process failed in an unbounded backend run and all 11 record tests passed in isolation; the final bounded runner passed all 145 tests. These outcomes do not establish hosted CI success, a packaged Electron launch, Firefox/WebKit end-to-end coverage or a production release. Encrypted archives and manifests are excluded from Git, Docker contexts and Electron package inputs.
