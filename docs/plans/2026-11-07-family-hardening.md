# Family hardening: implementation and remaining rollout

Date: 7 November 2026. The user's improvement proposal is the direction for this work. Their follow-up defers cloud deployment and asks that both AWS and Azure remain possible. This document distinguishes completed local stabilization from proposed schema/storage/UI/integration work. It does not authorize a production migration or claim those later phases are implemented.

## Implemented local stabilization

- Retain the native Ultimate session bridge and separate Family PostgreSQL ownership.
- Fix the reminder query to derive living status from `deathDate: null`. No redundant `isAlive` column or backfill is needed. Birthday calculation handles month/year boundaries and observes February 29 on February 28 in non-leap years. The scheduler runs at midnight UTC, pages 250 people at a time and prevents overlapping runs within one process. Sequential reruns deduplicate within the UTC day; concurrent processes still need durable deduplication/outbox work.
- Add `schema:check` to the Family build. It compares checked-in and generated models/enums/datasource before compiling, without changing the database or replacing a running Prisma DLL. A stale client fails the check and requires stopping Family before `prisma:generate` on Windows.
- Add milestone and relationship update routes and member/relationship/milestone/document delete routes. Editors and family heads may update; permanent deletion is restricted to tree admins and requires JSON `{ "confirm": "<exact record ID>" }` on DELETE. Ownership and tree IDs cannot be changed by updates. ACL checks and record changes share a database transaction; serialization conflicts return 409 without replaying writes.
- Member deletion clears its root reference, removes its relationships and detaches retained milestones/documents in one transaction. This is permanent deletion in the current schema, not soft deletion. No deletion was run on owner data during verification. These are API additions; native edit/delete controls belong to the later UI phase.
- Document deletion removes metadata first, clears an unshared profile photo reference and then removes eligible local files. Shared storage references are retained. A storage failure returns `storageCleanupPending: true` and logs metadata; the API does not falsely report physical cleanup or retry the committed deletion. A durable cleanup queue remains required before cloud cutover.
- Emit metadata-only structured audit entries for the new mutations. Names, biographies, file names/content and before/after private records are excluded. This is not the proposed durable audit table and does not cover all legacy writes.
- Add `GET /api/v1/events?treeId=&from=&to=&page=` through the native bridge. It reads recorded milestones only, with tree membership checks, an inclusive UTC range capped at 366 days and 100 rows per page. It does not expand recurring birthdays or synchronize Ultimate Calendar.
- Add `GET /ready` on Family, separately from liveness `/health`. It runs `SELECT 1`, returns sanitized 200/503, times out after two seconds and reuses an in-flight probe so repeated checks cannot multiply a hung query. Health alone still does not prove CRUD/schema compatibility.
- Keep the bridge's 20-second timeout. Add an in-process circuit breaker after three service failures, with a 15-second cooldown and one recovery probe. Browser cancellations do not count as service failures. No mutation is automatically retried.
- Rate-limit verified Ultimate identities separately rather than aggregating every user behind the bridge's loopback IP. Forged/invalid assertions remain in IP-based buckets. The limit remains 200 requests per 15 minutes; distributed enforcement across API replicas is future work.
- Generate a scoped OpenAPI 3.1 contract from runtime Zod validators for the new operations. Contract drift and route registration are tested. Existing session/tree/profile/upload operations and response DTOs are not fully covered yet; this is not a claim that the complete UI/backend contract is generated.

The contract is [stabilization.openapi.json](../../Family%20Connect/familyconnect/backend/docs/stabilization.openapi.json). Run `npm test`, `npm run contract:write` and `npm run contract:check` from the Family backend. No new runtime dependency was required.

## Schema decisions before migrations

Several proposed distinctions already exist: `members` and `users` are separate; access_control is user × tree × role; EventType, Role and RelationshipType are enums; same-tree composite foreign keys and supporting indexes exist. Preserve those guarantees.

1. Add optional member/account linking with an explicit uniqueness rule per tree. Never claim a login merely by matching a person's name/email.
2. Rename the Prisma access model for clarity while initially retaining the existing physical table mapping, avoiding an unnecessary table rename during rollout.
3. Add file_objects and document_permissions. Document access must require both tree membership and document permission; granting document access must never bypass the parent tree. Review/backfill the sharing default explicitly so existing viewers are neither silently broadened nor accidentally locked out.
4. Keep EventType as an enum unless user-defined event categories are required; then migrate to an event_types lookup with a compatibility mapping.
5. Preserve existing CUID IDs and foreign keys. UUIDs can be used for new infrastructure records without rewriting every existing identifier.
6. Add deleted_at and consistent timestamps with all readers, uniqueness rules, restore/retention behavior and cleanup updated together. Do not add a soft-delete field while queries still expose deleted records.
7. Add audited duplicate/self/ancestry-cycle protection. Current creation/update paths do not yet provide complete graph-wide cycle enforcement; spouse/sibling/friend connections must not be mistaken for ancestry cycles. Concurrent writes need database-backed protection.
8. Add audit_log, outbox, idempotency and storage cleanup records with retention and privacy rules. Mutations and their outbox/audit records must commit together. Sensitive before/after fields require redaction/encryption and restricted readers.

Prepare and review additive SQL/Prisma migrations, reconciliation checks and rollback procedures before running them. No schema or owner-record migration was applied in this change.

## AWS and Azure later

Keep PostgreSQL, storage keys and application authorization independent from the chosen cloud SDK. Use small storage/secrets adapters and provider-specific infrastructure modules. Do not assume Azure Blob implements the S3 API or switch providers merely by changing an endpoint string.

| Capability | AWS candidate | Azure candidate |
| --- | --- | --- |
| Managed PostgreSQL | RDS PostgreSQL in a private VPC | Azure Database for PostgreSQL Flexible Server with private networking |
| File objects | Private S3 bucket | Private Azure Blob container |
| Keys/secrets | KMS and Secrets Manager | Key Vault and managed identity |
| Private connectivity | Application network access to private RDS/storage endpoints | Application VNet access/private endpoints and private DNS |

These are deployment candidates, not provisioned resources. Database TLS and certificate verification, pooled connections, separate migration/application/read-only credentials, automated backups/PITR, file encryption, access logging and tested restores are acceptance criteria for either provider. DB Studio must use a separate read-only identity before cloud access. A private cloud database also needs an approved VPN/tunnel or an application hosted in that private network; a local desktop cannot directly reach an isolated subnet by itself.

Native object access must check tree/document authorization before issuing a short-lived download grant. Persist only opaque storage keys, checksums, size/MIME and encryption metadata, never pre-signed URLs. AWS and Azure adapters need separate tests. Storage migration should inventory/checksum existing files, copy/verify them, cut reads over with rollback and remove originals only after explicit retention approval. Avoid uncoordinated dual writes; use an authoritative write path plus durable replication/outbox and reconciliation.

Primary provider references: [RDS private networking and encryption](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/advanced-security.html), [RDS PostgreSQL TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html), [Azure PostgreSQL private access](https://learn.microsoft.com/en-ca/azure/postgresql/network/concepts-networking-private), [Azure PostgreSQL managed identities](https://learn.microsoft.com/en-au/azure/postgresql/flexible-server/concepts-identity).

## Integrations and UI still to build

Family's transactional outbox should publish event IDs, revisions and relevant tree/member IDs. Ultimate consumers must be idempotent, recheck current access, deduplicate retries and handle updates/deletions. Define recurring birthday/timezone behavior before adding calendar projections. Family notifications are not currently merged into Ultimate's notification center.

Ultimate is authoritative for account/profile lifecycle events. Those events originate in an Ultimate outbox; Family consumes/reconciles them through the stable account mapping. A Family-only outbox cannot discover an Ultimate account deletion. Preserve legacy explicit mappings and never merge accounts by email.

The next UI phase remains interactive zoom/pan, minimap, branch collapse, bounded/lazy loading, deep links and focus/search, an accessible person drawer and permission-aware edit/delete controls. Vault sharing UI depends on the document ACL migration. Keep Ultimate tokens/components and preserve sessions. A page review is required; API/component tests are not visual sign-off.

## Evidence and limits

- Family build, schema check and all 23 Family tests passed with isolated fixtures. The original scheduler failed the regression with `Unknown Member field: isAlive` before the fix.
- All 20 selected Ultimate bridge/circuit/native-flow tests passed, including actual loopback HTTP PUT/DELETE forwarding, CSRF rejection and circuit opening without retries.
- Local Family `/health` and `/ready` returned 200; Ultimate health returned 200. Unsigned Family DELETE and unauthenticated native PUT returned 401. The APIs were restarted with the tested source.
- No live mutation/deletion, cloud provisioning, database migration or desktop packaging was performed. Transaction/FK behavior for the new deletion routes has not been exercised against a live PostgreSQL fixture; tests use injected databases. Review this before rollout beyond local use.
- Existing local vault files are still not application-encrypted. Per-document ACLs, durable idempotency/audit/outbox, full contract coverage, cloud backups/restore drills and the graph UI rebuild remain open work, not resolved security claims.

## Debug report: reminders

Symptom: scheduled birthday reminders query a nonexistent Member field.
Root cause: the cron query used isAlive although the canonical/generated schema represents death via deathDate.
Fix: derive living status, replace boundary date arithmetic, bound the scan and check schema/client drift during builds.
Evidence: failing-before/passing-after scheduler regression; UTC year/month/leap-day and repeat-run tests.
Status: DONE for the reminder defect. The broader hardening rollout remains incomplete as listed above.
