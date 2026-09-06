-- Preserve rich task, note, and habit fields without changing existing records.
ALTER TABLE "Task" ADD COLUMN "data" TEXT;
ALTER TABLE "Note" ADD COLUMN "data" TEXT;
ALTER TABLE "Habit" ADD COLUMN "data" TEXT;
