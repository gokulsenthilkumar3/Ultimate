-- Additive Notes migration. Existing IDs, timestamps and content are retained.
ALTER TABLE "Note" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'workspace';
ALTER TABLE "Note" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "starred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Note" ADD COLUMN "deletedAt" DATETIME;
UPDATE "Note" SET "kind" = 'mind-journal'
 WHERE CASE WHEN json_valid("data") THEN json_extract("data", '$.source') ELSE NULL END = 'mind-journal';
UPDATE "Note" SET "pinned" = CASE WHEN json_valid("data") THEN COALESCE(json_extract("data", '$.pinned') = 1, false) ELSE false END,
 "starred" = CASE WHEN json_valid("data") THEN COALESCE(json_extract("data", '$.starred') = 1, false) ELSE false END;
CREATE INDEX "Note_userId_kind_deletedAt_id_idx" ON "Note"("userId", "kind", "deletedAt", "id");
CREATE TABLE "NoteRevision" (
 "id" TEXT NOT NULL PRIMARY KEY, "noteId" TEXT NOT NULL, "revision" INTEGER NOT NULL,
 "title" TEXT, "content" TEXT, "data" TEXT, "deletedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "actorId" TEXT NOT NULL,
 FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NoteRevision_noteId_revision_key" ON "NoteRevision"("noteId", "revision");
INSERT INTO "NoteRevision" ("id", "noteId", "revision", "title", "content", "data", "createdAt", "actorId")
 SELECT 'baseline:' || "id", "id", 1, "title", "content", "data", "updatedAt", "userId" FROM "Note";
CREATE TABLE "NoteMutation" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "mutationId" TEXT NOT NULL,
 "fingerprint" TEXT NOT NULL, "response" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NoteMutation_userId_mutationId_key" ON "NoteMutation"("userId", "mutationId");
CREATE TABLE "NoteChange" (
 "sequence" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "userId" TEXT NOT NULL,
 "noteId" TEXT NOT NULL, "revision" INTEGER NOT NULL, "operation" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "NoteChange_userId_sequence_idx" ON "NoteChange"("userId", "sequence");
INSERT INTO "NoteChange" ("userId", "noteId", "revision", "operation", "createdAt")
 SELECT "userId", "id", 1, 'create', "updatedAt" FROM "Note" WHERE "kind" = 'workspace' ORDER BY "id";
