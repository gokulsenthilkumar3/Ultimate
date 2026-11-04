# Production security implementation — 5 November 2026

This records implemented application changes, not production activation. The
parallel GitHub-test work and optional agent integrations were preserved.

## FinSync profile boundary

New onboarding saves use `/api/profile/onboarding`, verified Firebase ID tokens
with revocation checking, bounded JSON, server validation and AES-256-GCM. The
authenticated owner and key version are authenticated encryption context.
Encrypted profiles live in server-only `privateProfiles`; the ordinary user
record retains the name, household size, onboarding status and existing budget
projection needed by the UI. Budget values remain owner-readable, not encrypted
by this change. Name and household edits remain supported.

Firestore rules deny client access to private profiles and prevent profile PII,
onboarding status or billing/privilege replacement through the user document.
Legacy ciphertext is preserved and returns `PROFILE_MIGRATION_REQUIRED` rather
than being overwritten. No existing ciphertext migration or key rotation ran.

Configure server-only `FINSYNC_PROFILE_ENCRYPTION_KEY` (64 hexadecimal characters),
`FINSYNC_PROFILE_KEY_VERSION`, `FINSYNC_APP_ORIGIN` (exact origin), Firebase project
and Admin SDK application-default credentials. Prefer workload identity; never
ship service-account keys in frontend bundles. Provision keys externally and
retain recovery copies. Firebase emulators are rejected in production.

This requires a Next.js server runtime; Firebase's historical static hosting
rewrite cannot execute these endpoints. Deploy to a server-capable platform and
deploy the reviewed Firestore rules before enabling the new onboarding path.
Do not remove the migration guard without a compatibility/recovery rehearsal.

## Read-only customer administration

Ultimate now supports independently configured FinSync/OxFin service adapters.
For each product set `CUSTOMER_ADMIN_<PRODUCT>_URL` (HTTPS product base),
`CUSTOMER_ADMIN_<PRODUCT>_TOKEN` (a distinct 64-hex service credential), and
`CUSTOMER_ADMIN_<PRODUCT>_READERS` (comma-separated Ultimate database user IDs).
Set the corresponding downstream `FINSYNC_ADMIN_SERVICE_TOKEN` or
`OXFIN_ADMIN_SERVICE_TOKEN` to the matching credential. Never use customer
handoff tokens. Reused cross-product credentials are rejected.

The BFF checks product scope and reader authorization, bounds filters/pagination
and response bytes, refuses redirects, strips unapproved fields, sets no-store,
and requires successful redacted audit persistence before returning records.
Product services expose only a read-only directory. Missing configuration keeps
the explicit 503; wrong reader scope returns 403. Mutation/support/activity
endpoints are not enabled. Configure separate downstream least-privilege service
identities and restrict service ingress during deployment.

FinSync projects Firebase Auth users without profile PII/password hashes. It has
bounded scanning and explicit capacity failure at more than 10,000 users; larger
directories need indexed product-owned pagination. OxFin projects id/name/email
from PostgreSQL using parameterized bounded queries, a read-only snapshot and a
statement timeout. Unknown plan/account state stays `unavailable` rather than
being invented. Global downstream credentials grant directory-read scope only;
they are not tenant credentials or proof of a multi-tenant lifecycle.

## Other application corrections

Firebase MFA helpers now use the modular SDK's `multiFactor` and
`getMultiFactorResolver` APIs. OxFin MFA buttons use the supported loading prop.
Legacy OxFin wallet operations no longer return mock balances or fictional
deposit/withdraw success. The missing bill-parser endpoint returns explicit
unavailable after session authentication. Real transfer and balance routes remain
separate. The old limiter no longer references removed NextRequest.ip and only
accepts a single forwarded IP when explicitly configured; real ingress must
scrub that header. Remaining legacy middleware composition needs its own route
verification before those other prototype endpoints can be treated as ready.

## Verification

Focused profile encryption/validation/atomic persistence, directory projection,
service identity, BFF authorization/filter/response/audit and database TLS tests:
15 passed before the final dependency update. FinSync type checking passed after
the MFA API correction. A real local Firebase Auth/Firestore emulator test passed
with synthetic accounts: cross-owner access, private profile access, client PII
and billing writes/deletion denied; ordinary name/budget edits preserved.

The emulator run used demo-finsync-security, dedicated loopback ports, a
checksum-verified workspace-local Java 21 runtime and no production credentials.
No production records, rules or DNS were changed. Dependency advisory work and
subsequent verification are recorded in the final task result; do not infer a
clean dependency audit from successful application tests.

## External gates remain explicit

### Dependency follow-up (supersedes the historical audit below)

The original 13 web advisories are resolved in the regenerated complete lockfile.
Both `npm audit --workspace=apps/web` and its `--omit=dev` variant returned zero
advisories; a clean isolated install also returned zero for the full web audit.
Next is now 16.4.5 with ESLint 9 flat configuration, mandatory TypeScript options
and a Suspense boundary on the handoff callback. Patched transitive overrides
are documented in [FinSync dependency security](../../FinSync/DEPENDENCY_SECURITY.md).

The wider mobile/root-tooling graph has a separate audit scope. No ignore list
or forced Firebase downgrade was used. A clean-install failure exposed missing
Firestore metadata in an intermediate lockfile; the final lockfile was rebuilt
from manifests and includes Firestore and patched gRPC. Both real emulator tests
passed against that clean graph, including client SDK writes/reads and
cross-owner denial. No owner environment was copied.

The earlier 13-advisory paragraph below is historical verification, not the
current web result. The original process holds its old native Next binary open;
upgrading that running instance requires a controlled restart/install after the
parallel task releases it. That process was not terminated here.

Final isolated lint and production build passed (including TypeScript and 21
generated pages), as did the repository/environment/generated-README checks.
The build used synthetic public Firebase configuration, not copied environments.

Final local follow-up: both FinSync web and OxFin TypeScript checks passed.
The focused application security suite passed 15 tests after the dependency
updates; the broader edge/application selection passed 18. The real Firestore
emulator test passed separately. The existing agent suite passed 180 tests,
and evidence, repository, environment-template and generated README checks
passed. These counts describe separate commands, not a combined coverage claim.

FinSync web now declares Firebase 13.2.0, Firebase Admin 14.5.0, a React-19
compatible Lucide release, and Next 15.5.29 with matching lint configuration.
Non-forced compatible dependency fixes were applied. The final npm production
workspace audit still reported 13 advisories (6 high, 7 moderate, 0 critical).
Some nodes are shared with sibling workspaces; manifest upgrades do not prove
every vulnerable transitive is removed. Do not force npm's suggested downgrade
or silently rewrite sibling dependency graphs to make the report green. This
remains a release gate requiring exact dependency-path review and affected
consumer builds. No clean audit or complete production readiness is claimed.

See [edge security](../../growthtrack-ultimate/docs/PRODUCTION_EDGE_SECURITY.md)
for Caddy, TLS, cache isolation and API flood protections. Live DNS/CDN/DNSSEC,
WAF/DDoS rules, origin firewall restrictions, certificate issuance/renewal and
actual customer service credentials require the production hostname/provider.
Those cannot be activated against an unidentified zone or host. No deployment,
legacy-data migration, customer-admin write access or full production readiness
is asserted here.
