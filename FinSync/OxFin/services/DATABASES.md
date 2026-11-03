# Prototype database contracts

The wallet, payments, bills and OX reference packages each have a `schema.sql`
matching the SQL in their own `src/db.ts`. They use `WALLET_DB_URL`,
`PAYMENTS_DB_URL`, `BILLS_DB_URL` and `OX_DB_URL` respectively. Initialize each
schema only in its own empty database; existing database upgrades require a
separately reviewed migration. Identity and biller references stay external.

These files do not make the prototypes production ready. Dependency manifests,
authentication, transaction workflows and persistence behavior remain incomplete.
They are not installed by the legacy backend's Docker Compose setup.

The legacy web application uses `ox-fin-backend/infrastructure/init.sql` and
integer user/wallet IDs; its `wallets` table is incompatible with the wallet
prototype's text IDs and must stay separate. Its incremental upgrade scripts
are in `ox-fin-backend/infrastructure/migrations/`; applying them requires an
explicit target and approval. No source test applies migrations to product data.
