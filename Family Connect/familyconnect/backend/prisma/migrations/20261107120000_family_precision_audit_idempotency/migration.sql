-- Additive only: no existing column, row or constraint is changed or removed.
-- Every new members column has a default that preserves current meaning: dates stay exact and
-- a person is living unless deathDate is set (deathRecorded = false).
-- New tables start empty. Review, back up and run on a copy before production.
BEGIN;

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('day', 'month', 'year');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "birthDateApproximate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthDatePrecision" "DatePrecision" NOT NULL DEFAULT 'day',
ADD COLUMN     "deathDateApproximate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deathDatePrecision" "DatePrecision" NOT NULL DEFAULT 'day',
ADD COLUMN     "deathRecorded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "treeId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_treeId_createdAt_idx" ON "audit_log"("treeId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorId_createdAt_idx" ON "audit_log"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "idempotency_keys_createdAt_idx" ON "idempotency_keys"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_userId_scope_key_key" ON "idempotency_keys"("userId", "scope", "key");

COMMIT;

-- Manual rollback (only before the new columns or tables hold data you need; it discards it):
--   BEGIN;
--   DROP TABLE "idempotency_keys";
--   DROP TABLE "audit_log";
--   ALTER TABLE "members" DROP COLUMN "deathRecorded", DROP COLUMN "deathDateApproximate", DROP COLUMN "deathDatePrecision",
--     DROP COLUMN "birthDateApproximate", DROP COLUMN "birthDatePrecision";
--   DROP TYPE "DatePrecision";
--   DELETE FROM "_prisma_migrations" WHERE migration_name = '20261107120000_family_precision_audit_idempotency';
--   COMMIT;
