-- Additive record-row migration. Tables only, and the reviewed data copy runs in
-- server/domains/recordMigration.js so JSON parity is verified per owner.
-- User.calendarEvents and User.portfolio are left untouched as a rollback copy.
CREATE TABLE "calendar_events" (
 "userId" TEXT NOT NULL, "id" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
 "data" TEXT NOT NULL, "syncProvider" TEXT, "deletedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdBy" TEXT, "updatedBy" TEXT,
 PRIMARY KEY ("userId", "id"),
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "calendar_events_userId_deletedAt_idx" ON "calendar_events"("userId", "deletedAt");
CREATE INDEX "calendar_events_userId_syncProvider_idx" ON "calendar_events"("userId", "syncProvider");
CREATE TABLE "portfolio_holdings" (
 "userId" TEXT NOT NULL, "id" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1, "position" INTEGER NOT NULL DEFAULT 0,
 "data" TEXT NOT NULL, "deletedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdBy" TEXT, "updatedBy" TEXT,
 PRIMARY KEY ("userId", "id"),
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "portfolio_holdings_userId_deletedAt_position_idx" ON "portfolio_holdings"("userId", "deletedAt", "position");
CREATE TABLE "record_mutations" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "collection" TEXT NOT NULL, "mutationId" TEXT NOT NULL,
 "fingerprint" TEXT NOT NULL, "response" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "record_mutations_userId_collection_mutationId_key" ON "record_mutations"("userId", "collection", "mutationId");
CREATE TABLE "record_changes" (
 "sequence" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "userId" TEXT NOT NULL, "collection" TEXT NOT NULL,
 "recordId" TEXT NOT NULL, "revision" INTEGER NOT NULL, "operation" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "record_changes_userId_collection_sequence_idx" ON "record_changes"("userId", "collection", "sequence");
