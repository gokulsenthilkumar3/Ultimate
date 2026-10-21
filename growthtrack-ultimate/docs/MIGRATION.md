# Safe migration and deployment handoff

No owner-data migration or production cutover was performed while implementing
the current foundation. Do not run `prisma db push` on a production database.

1. Make an independently restorable backup of the existing SQLite database and
   its private uploads. Keep its original path/volume untouched through review.
2. Run additive Prisma migrations on a *copy* of that backup. Compare owner and
   per-table record counts, finance totals and dated measurements before/after.
   Rehearse restoring the copy, including uploaded file bytes.
3. Inspect legacy Apple Health readings and available backups. Values remain
   labeled unverified; do not infer or fabricate replacement readings.
4. Preview any desktop-local-to-shared import with owner mapping and duplicate
   decisions. Never silently merge two databases or delete the originals until
   an acknowledged, count-verified import and rollback plan exist.
5. Provide one private HTTPS origin with persistent database and private-file
   volumes, authenticated same-origin API access, secrets outside the database,
   and a tested backup schedule. Point desktop shared mode to that origin only
   after the import review. Phones must not use the desktop's `127.0.0.1` for AI.
6. Enable each external connector only after authorization, capability, quota,
   revocation, incremental-sync and partial-failure tests using real provider
   accounts. Keep setup-required states visible meanwhile.
7. Run all unit/backend/E2E tests, branded browser and real-device checks,
   accessibility review, production-profile performance checks and the
   restore drill before a release decision.

Temporary automated tests use isolated SQLite fixture files and an in-memory
browser API fixture. They never run `server.js` against the owner database.
