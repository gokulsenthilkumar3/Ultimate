# Database ownership and schema maintenance

Schema changes stay with each product. Reviewing or building a schema does not
apply it to an existing installation. No product database or deployed Firebase
rules were changed during the 2 November 2026 source review.

## Canonical definitions

| Owner | Store | Canonical schema and upgrade path |
| --- | --- | --- |
| Ultimate | SQLite through Prisma/libsql | `growthtrack-ultimate/prisma/schema.prisma`, `prisma/migrations/`, `prisma/integrity.sql`; desktop bootstrap uses `prisma/fresh-schema.sql` |
| Family Connect | PostgreSQL through Prisma | `Family Connect/familyconnect/backend/prisma/schema.prisma` and its `migrations/` directory |
| NiftyLens current client | Firestore | `Equity/NiftyLens/firestore.rules` and `firebase.json` |
| NiftyLens legacy cache/API | Supabase PostgreSQL | `Equity/NiftyLens/supabase/migrations/001_initial_schema.sql` through `003_market_data_integrity.sql` |
| FinSync web/mobile | Firestore | `FinSync/firestore.rules`; application records remain under each authenticated user's document |
| FinSync expense tracker | Device-local SQLite | `FinSync/Expense Tracker - Mobile/expense-tracker-mobile/src/db/schema.ts`; `initializeSchema` upgrades inside a transaction |
| OxFin customer web | PostgreSQL | `FinSync/OxFin/ox-fin-backend/infrastructure/init.sql` for new installs; `infrastructure/migrations/20261102_integrity.sql` and `20261103_financial_precision.sql` for existing installs |
| OxFin reference services | Separate PostgreSQL stores | Each wallet/payments/bills/ox service owns its `schema.sql`; see `FinSync/OxFin/services/DATABASES.md` |
| Forex | SQLite market-data cache | `Forex/src/data/mf_data_downloader.py`; `ohlcv_cache_v2` keys include instrument, granularity and UTC timestamp |

`Forex/Forex-Ensemble-Prediction/` and `Claude/` are historical reference sources.
Generated Prisma clients and application documentation are not schema authorities.
Both desktop and container builds use `growthtrack-ultimate/scripts/generate-schema.mjs`
so regenerated bootstrap SQL retains the reviewed custom integrity triggers.
The OxFin reference services remain prototypes, independently owned and separate
from the customer-web PostgreSQL schema.

## Guarantees covered by regression checks

- Ultimate fresh installation and migration replay agree on columns, defaults,
  primary/foreign keys, indexes and triggers. Populated location/profile/custom
  table upgrades preserve records and timestamps. Financial backfills fail
  transactionally on incompatible precision. Goal progress must share its goal's
  owner.
- Ultimate and device-local financial amounts gain integer minor-unit mirrors.
  Existing decimal API fields remain compatible. SQLite triggers maintain the
  mirrors and reject excess precision; the Ultimate mirrors are ignored by the
  generated Prisma API to avoid its 32-bit `Int` restriction. They are database
  implementation fields, not writable client fields.
- Device-local budgets retain category references on older installations;
  overall budgets have one key per month, and recurring entries have one key per
  template/due date. Invalid old references/precision abort upgrading without
  removing records.
- Family members, relationships, roots, events and documents cannot refer into
  another tree. Deferred composite constraints retain tree-deletion cascades.
- OxFin financial records require owners, finite amounts, supported precision
  and uppercase currency codes. Transfer receipts enforce owner/request-key
  uniqueness. The precision upgrade preserves stored values rather than rounding.
- NiftyLens legacy PostgreSQL validates finite market values and owner references;
  tests exercise actual RLS for public price reads, owner access and cross-owner
  denial on fresh and manually provisioned legacy installations.
- Forex intervals/instruments cannot overwrite each other's candles. Equivalent
  timezone-aware instants use the same UTC key. The old cache is retained because
  its missing interval cannot safely be inferred.

## Local verification

Use Node 24 for native SQLite and TypeScript schema checks. After installing the
owning applications' dependencies:

```powershell
npm run test:schemas
node growthtrack-ultimate/tests/unit/server-backend/run.mjs
node growthtrack-ultimate/scripts/generate-schema.mjs --check
```

PostgreSQL checks require `pg` from OxFin's dependencies and an explicitly set
`SCHEMA_TEST_DATABASE_URL` pointing to a disposable loopback database whose name
ends in `_test`. They never read product `.env` files. Each test uses synthetic
records, isolated schemas and rollback:

```powershell
npm run test:schemas:postgres
```

Validate Family and Ultimate Prisma schemas with their installed CLI versions.
Forex storage checks run from `Forex` with its Python environment:

```powershell
python -m pytest tests/test_cache_granularity.py
```

Firestore rules have source review only. Emulator verification requires Java 21
and the Firestore emulator; this machine currently has Java 17 and no cached
emulator. Existing unrelated OxFin/mobile typecheck and Forex API fixture failures
remain outside the passing schema checks. Passing schema tests are not a claim
that every application suite passes.

Recorded local verification for this review: 20 SQLite/mobile/repair-CLI checks
(including two real PostgreSQL repair checks), seven PostgreSQL schema/service
checks, 108 Ultimate backend tests, 14 customer-web transfer tests and 27 offline
Forex tests pass. Both Prisma schemas validate; Family builds and its three
permission tests pass. Gateway, shared-design and generated-README checks pass.
The workspace preview suite has an unrelated `humanoid-base.glb` hash mismatch
(15 pass, one fail); no preview assets were changed by this schema work.

## Existing installations

Back up and rehearse before applying migrations. Invalid legacy records should
produce a reviewable failure; these repairs do not discard or guess corrections
for conflicting ownership, orphan references or unsupported monetary precision.

The restored Ultimate baseline makes clean migration replay possible. An
installation previously maintained with `prisma db push` or hand-written SQL
must reconcile its actual schema with Prisma migration history before using
`prisma migrate deploy`. Do not replay the restored baseline onto a populated
modern schema, change applied checksums, or mark unapplied migrations as applied.
The JSON-to-row Notes/calendar/portfolio data migrations retain their existing
separate rehearsal and parity workflows.

Ultimate's pending typed-record work also covers metrics, goals/subtasks, skills,
projects/assessments, regular collection fields and note/journal revision snapshots.
Training plans, planned exercises/meals, required medical tests, physique target
readings, milestones and zones also have dedicated tables. Their singleton APIs
preserve their payload shapes while writing fixed records transactionally to rows.
See the [storage map and verification](plans/2026-11-03-ultimate-typed-records.md)
for the named fields, remaining JSON uses and rollout boundaries. The backend
checks create only synthetic records in disposable databases.

`npm run schema:repair -- --product=ultimate --database-file=<local-file>` rehearses
the financial repair on a verified backup copy. For Family/OxFin, choose
`--product=family` or `--product=oxfin` and explicitly supply
`SCHEMA_REPAIR_DATABASE_URL` for a local database; rehearsal rolls back its
transaction. The additional `--apply-local` flag opts into mutation only after
rehearsal succeeds. Prisma-managed application requires reconciled prior migration
checksums and records the new migration transactionally. A partial installation
is rejected for reconciliation instead of silently skipped. Inspect the result
before using this flag; no apply command was run during this review.
