# Family completion: date certainty, audit trail, retry safety and a storage boundary

Date: 7 November 2026. This implements the parts of the [Family roadmap](2026-11-07-family-compact-workspace.md) and [hardening plan](2026-11-07-family-hardening.md) that can be built and proven without production credentials, cloud accounts or product policy decisions. It follows [GEDCOM interchange](2026-11-07-family-interchange.md). It **adds one migration but applies it to no database you own**: it was applied only to a throwaway local PostgreSQL. Deployment, cloud provisioning and desktop packaging are not part of this change.

## What changed

| Area | Change | Why |
| --- | --- | --- |
| Date certainty | `members` gains `birthDatePrecision`, `birthDateApproximate`, `deathDatePrecision`, `deathDateApproximate` and `deathRecorded`. Month and year dates are stored as the first day of the period. API, forms, profile, people list, tree labels, kinship picker, GEDCOM import/export and AI prompts honor them | GEDCOM files and real families have "about 1950" and "died, date unknown". The old model forced a made-up exact date or lost the fact |
| One definition of deceased | A person is living when `deathDate` is null **and** `deathRecorded` is false. Filters, birthday reminders, UI status and prompts all use it | A person recorded as deceased without a date no longer receives birthday reminders |
| Birthday reminders | Only an exact, non-approximate birthday is announced | A month, a year or a guess cannot be a birthday |
| Durable audit trail | New `audit_log` table, written in the same transaction as person, relationship, event, document, tree and access changes and GEDCOM import/export. `GET /trees/:id/audit` (tree admins, 50 per page, newest first) | The roadmap's audit item. A change and its record commit together or not at all |
| Retry safety | New `idempotency_keys` table. GEDCOM import accepts `idempotencyKey`; a retry after a timeout or lost response returns the committed result (`replayed: true`) instead of importing twice. The UI keeps one key per review | The bridge's 20-second timeout can leave the browser unsure whether an import happened |
| Storage boundary | Document bytes go through a `StorageAdapter` (`put`, `open`, `remove`) selected by `FAMILY_STORAGE` (default `local`, unchanged behavior). Unknown providers fail loudly. A shared contract test every adapter must pass | Keeps application authorization and storage keys independent of any cloud SDK, as the hardening plan requires |
| Real-database tests | `tests/integration.postgres.test.cjs` runs against a disposable local PostgreSQL | Fakes cannot prove foreign keys, rollback or serializable writes |

The audit trail records **metadata only**: actor account ID, action, record kind and ID, and counts, kinds or field names. Names, biographies, dates, file names and before/after values are never recorded, and the private Me marker is not audited. Entries have no foreign keys, so they outlive the records they describe, and the API cannot edit or delete them. The writer rejects anything that could carry free text (strings over 100 characters, nested values, control characters), so a coding mistake fails the change instead of persisting private text.

Date rules that keep old and new clients consistent: a date sent without certainty is exact; clearing a date resets its certainty; certainty without a date in the same payload is refused; a death date makes `deathRecorded` redundant (it only means "deceased, date unknown"); fields not in the payload are untouched. The standalone legacy Family frontend sends no certainty fields and keeps working with these defaults.

## The migration

[`20261107120000_family_precision_audit_idempotency`](../../Family%20Connect/familyconnect/backend/prisma/migrations/20261107120000_family_precision_audit_idempotency/migration.sql) is additive only: one enum, five `members` columns that all have defaults preserving current meaning, and two empty tables with indexes. No existing row, column or constraint changes, and nothing needs backfilling. A manual rollback is in a comment at the end of the file.

Checked on a disposable PostgreSQL 15 container created from the local image, on a spare loopback port, never your Family database:

- the three existing migrations and this one apply in order to a fresh database;
- `prisma migrate diff` between the migration history and `schema.prisma` reports no difference;
- a row inserted the old way (without the new columns) reads back exact and living.

**Before you apply it** (this change does not): back up the Family database; try it on a restored copy; apply with `npx prisma migrate deploy` (migrate first, then deploy code; older code ignores the new columns); then stop the Family API and run `npm run prisma:generate` before building, because on Windows the running service holds the generated client. `npm run build` fails its schema check until the client is regenerated, by design. The migration has not been run against your live data, and its locking on a large table is unmeasured, though adding columns with constant defaults is a quick operation on PostgreSQL 11 and later.

Run the integration suite yourself with a disposable database:

```powershell
$env:DATABASE_URL = "postgresql://postgres:<password>@127.0.0.1:<port>/family_test"
npx prisma migrate deploy
$env:FAMILY_TEST_DATABASE_URL = $env:DATABASE_URL
npm test
```

The suite refuses any URL whose host is not local or whose database name does not contain `test`, and it skips (with a reason) when the variable is unset, so ordinary runs and CI are unaffected.

## Verified

- Family backend: the full suite passes with the PostgreSQL integration run included, plus the schema check, TypeScript build and OpenAPI drift and route-registration checks. Without a database variable the integration suite is skipped and everything else passes.
- Real PostgreSQL covers: migration defaults; a GEDCOM import that stores precision, relationships and the trail together; a deliberate failure part-way through an import that leaves no people, no trail entry and no retry key; replay and duplicate refusal; export round trip; certainty rules on profile updates; living/deceased filters and birthday selection; one trail entry for each kind of create, grant and delete; and admin-only trail reads.
- Ultimate: the focused Family UI, admission and bridge suites pass, including new tests for date display and form payloads. UI impact and handoff drift checks and the generated-docs check pass; ESLint reports no errors.
- Everything uses fictional data in a disposable database. Your Family database, its files and its Prisma client were not touched; the worktree used its own copy of the dependencies to regenerate the client.
- Not verified: the new forms and labels in a browser (no rendered or visual sign-off, and no page approval from you); document upload and download against real files and Windows file locking; a real GEDCOM from Gramps, FamilySearch or similar; any run against production-sized data.

## Not done, and why

These need something this change cannot supply. None is hidden or claimed.

- **AWS S3 and Azure Blob adapters, and any cloud rollout.** The interface and shared contract exist; real adapters need the cloud SDKs, credentials, buckets or containers, identity, and a decision between providers. The owner deferred cloud deployment. Migrating existing files needs an inventory/checksum/cutover plan of its own.
- **Per-document permissions and the file-object split.** The sharing default is a product decision: existing viewers must be neither silently widened nor locked out. Needs your policy, then a migration and a backfill.
- **PostgreSQL row-level security.** Needs a restricted application role and a transaction-local actor context on every query path, with pool-isolation tests. It cannot be proven safely without changing how every handler connects, and enabling policies alone does not isolate tenants because table owners bypass them.
- **Soft delete.** Touches every reader; the hardening plan says not to add the column while queries could still expose deleted rows.
- **Verified member-to-account linking.** Needs a reviewed claim workflow. The private Me marker stays separate and grants nothing.
- **Outbox with consumers, and Calendar/Tasks/HR integration.** An outbox without a consumer only accumulates rows. The Ultimate consumer, recurring-birthday and timezone rules, and opt-in review are separate work.
- **Background workers (thumbnails, OCR, PDF export).** Need worker infrastructure, new dependencies and explicit consent for processing private files.
- **Real-time collaboration and reviewed edits; successor-admin lifecycle; erasure policy.** Product and policy design first.
- **Audit retention and a viewer.** The trail has no expiry job and no screen; retention is an operator policy. Reads of documents and trees are not audited, only exports, imports, writes and access grants.
- **Idempotency beyond GEDCOM import.** Other creates are not retry-keyed. The 24-hour key cleanup runs when an import commits, not on a schedule.
- **Date handling gaps.** Relationship dates are still exact-only; ranges and other calendars stay as text in notes; the standalone legacy frontend has no certainty controls.
- **Repository check.** `npm run repository:check` still fails only on missing screenshot links in three older redesign-research documents. Those are ignored local evidence files; none was fabricated.
