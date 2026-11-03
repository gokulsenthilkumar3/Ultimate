-- Exact minor-unit mirrors; reject unsupported precision rather than silently round.
BEGIN IMMEDIATE;
ALTER TABLE "Transaction" ADD COLUMN "amountMinor" INTEGER;
CREATE TRIGGER "Transaction_money_validate_insert" BEFORE INSERT ON "Transaction"
 WHEN NEW."amount" IS NOT NULL AND (abs(NEW."amount") > 1000000000000 OR NEW."amount" != round(NEW."amount", 2))
 BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places within supported range'); END;
CREATE TRIGGER "Transaction_money_sync_insert" AFTER INSERT ON "Transaction"
 WHEN NEW."amountMinor" IS NOT CAST(round(NEW."amount" * 100) AS INTEGER)
 BEGIN UPDATE "Transaction" SET "amountMinor" = CAST(round(NEW."amount" * 100) AS INTEGER) WHERE id = NEW.id; END;
CREATE TRIGGER "Transaction_money_validate_update" BEFORE UPDATE ON "Transaction"
 WHEN NEW."amount" IS NOT NULL AND (abs(NEW."amount") > 1000000000000 OR NEW."amount" != round(NEW."amount", 2))
 BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places within supported range'); END;
CREATE TRIGGER "Transaction_money_sync_update" AFTER UPDATE ON "Transaction"
 WHEN NEW."amountMinor" IS NOT CAST(round(NEW."amount" * 100) AS INTEGER)
 BEGIN UPDATE "Transaction" SET "amountMinor" = CAST(round(NEW."amount" * 100) AS INTEGER) WHERE id = NEW.id; END;
UPDATE "Transaction" SET "amount" = "amount";
ALTER TABLE "Budget" ADD COLUMN "limitMinor" INTEGER;
CREATE TRIGGER "Budget_money_validate_insert" BEFORE INSERT ON "Budget"
 WHEN NEW."limit_amount" IS NOT NULL AND (abs(NEW."limit_amount") > 1000000000000 OR NEW."limit_amount" != round(NEW."limit_amount", 2))
 BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places within supported range'); END;
CREATE TRIGGER "Budget_money_sync_insert" AFTER INSERT ON "Budget"
 WHEN NEW."limitMinor" IS NOT CAST(round(NEW."limit_amount" * 100) AS INTEGER)
 BEGIN UPDATE "Budget" SET "limitMinor" = CAST(round(NEW."limit_amount" * 100) AS INTEGER) WHERE id = NEW.id; END;
CREATE TRIGGER "Budget_money_validate_update" BEFORE UPDATE ON "Budget"
 WHEN NEW."limit_amount" IS NOT NULL AND (abs(NEW."limit_amount") > 1000000000000 OR NEW."limit_amount" != round(NEW."limit_amount", 2))
 BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places within supported range'); END;
CREATE TRIGGER "Budget_money_sync_update" AFTER UPDATE ON "Budget"
 WHEN NEW."limitMinor" IS NOT CAST(round(NEW."limit_amount" * 100) AS INTEGER)
 BEGIN UPDATE "Budget" SET "limitMinor" = CAST(round(NEW."limit_amount" * 100) AS INTEGER) WHERE id = NEW.id; END;
UPDATE "Budget" SET "limit_amount" = "limit_amount";
ALTER TABLE "SubscriptionItem" ADD COLUMN "costMinor" INTEGER;
CREATE TRIGGER "SubscriptionItem_money_validate_insert" BEFORE INSERT ON "SubscriptionItem"
 WHEN NEW."cost" IS NOT NULL AND (abs(NEW."cost") > 1000000000000 OR NEW."cost" != round(NEW."cost", 2))
 BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places within supported range'); END;
CREATE TRIGGER "SubscriptionItem_money_sync_insert" AFTER INSERT ON "SubscriptionItem"
 WHEN NEW."costMinor" IS NOT CAST(round(NEW."cost" * 100) AS INTEGER)
 BEGIN UPDATE "SubscriptionItem" SET "costMinor" = CAST(round(NEW."cost" * 100) AS INTEGER) WHERE id = NEW.id; END;
CREATE TRIGGER "SubscriptionItem_money_validate_update" BEFORE UPDATE ON "SubscriptionItem"
 WHEN NEW."cost" IS NOT NULL AND (abs(NEW."cost") > 1000000000000 OR NEW."cost" != round(NEW."cost", 2))
 BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places within supported range'); END;
CREATE TRIGGER "SubscriptionItem_money_sync_update" AFTER UPDATE ON "SubscriptionItem"
 WHEN NEW."costMinor" IS NOT CAST(round(NEW."cost" * 100) AS INTEGER)
 BEGIN UPDATE "SubscriptionItem" SET "costMinor" = CAST(round(NEW."cost" * 100) AS INTEGER) WHERE id = NEW.id; END;
UPDATE "SubscriptionItem" SET "cost" = "cost";
CREATE TRIGGER goal_progress_owner_insert BEFORE INSERT ON "GoalProgressLog"
 WHEN NOT EXISTS (SELECT 1 FROM "Goal" WHERE id=NEW.goalId AND userId=NEW.userId)
 BEGIN SELECT RAISE(ABORT, 'Goal owner mismatch'); END;
CREATE TRIGGER goal_progress_owner_update BEFORE UPDATE OF goalId, userId ON "GoalProgressLog"
 WHEN NOT EXISTS (SELECT 1 FROM "Goal" WHERE id=NEW.goalId AND userId=NEW.userId)
 BEGIN SELECT RAISE(ABORT, 'Goal owner mismatch'); END;
CREATE TRIGGER goal_owner_update BEFORE UPDATE OF userId ON "Goal"
 WHEN EXISTS (SELECT 1 FROM "GoalProgressLog" WHERE goalId=NEW.id AND userId<>NEW.userId)
 BEGIN SELECT RAISE(ABORT, 'Goal progress owner mismatch'); END;
UPDATE "GoalProgressLog" SET goalId=goalId;
COMMIT;
