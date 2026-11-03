-- Preserve records. Inconsistent existing references make this migration fail.
BEGIN;

CREATE UNIQUE INDEX "members_id_treeId_key" ON "members"("id", "treeId");
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_member1_tree_fkey"
 FOREIGN KEY ("member1Id", "treeId") REFERENCES "members"("id", "treeId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_member2_tree_fkey"
 FOREIGN KEY ("member2Id", "treeId") REFERENCES "members"("id", "treeId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_distinct_members" CHECK ("member1Id" <> "member2Id");
ALTER TABLE "events" ADD CONSTRAINT "events_member_tree_fkey"
 FOREIGN KEY ("memberId", "treeId") REFERENCES "members"("id", "treeId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "documents" ADD CONSTRAINT "documents_member_tree_fkey"
 FOREIGN KEY ("memberId", "treeId") REFERENCES "members"("id", "treeId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "family_trees" ADD CONSTRAINT "family_trees_root_tree_fkey"
 FOREIGN KEY ("rootMemberId", "id") REFERENCES "members"("id", "treeId") DEFERRABLE INITIALLY DEFERRED;
DROP INDEX "access_control_treeId_userId_idx";
CREATE INDEX "access_control_userId_treeId_idx" ON "access_control"("userId", "treeId");

-- Replace relationship RESTRICT references so a whole tree can cascade safely.
ALTER TABLE "relationships" DROP CONSTRAINT "relationships_member1Id_fkey";
ALTER TABLE "relationships" DROP CONSTRAINT "relationships_member2Id_fkey";
-- Keep event/document single-column ON DELETE SET NULL references. They detach
-- optional member links while preserving the event/document and its treeId;
-- the deferred composite references still enforce boundaries for attached rows.

COMMIT;
