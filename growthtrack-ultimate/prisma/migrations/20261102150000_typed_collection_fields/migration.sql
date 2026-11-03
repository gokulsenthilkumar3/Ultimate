-- Promote validated fixed-shape collection fields without changing invalid legacy values.

ALTER TABLE "Task" ADD COLUMN "description" TEXT;

UPDATE "Task" SET "description" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.description'), "data" = json_remove("data", '$.description') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.description') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.description') = 'text'));

ALTER TABLE "Task" ADD COLUMN "category" TEXT;

UPDATE "Task" SET "category" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category'), "data" = json_remove("data", '$.category') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'text'));

ALTER TABLE "Task" ADD COLUMN "reminderAt" TEXT;

UPDATE "Task" SET "reminderAt" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.reminderAt'), "data" = json_remove("data", '$.reminderAt') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.reminderAt') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.reminderAt') = 'text'));

ALTER TABLE "Task" ADD COLUMN "recurrence" TEXT;

UPDATE "Task" SET "recurrence" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.recurrence'), "data" = json_remove("data", '$.recurrence') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.recurrence') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.recurrence') = 'text'));

ALTER TABLE "Task" ADD COLUMN "parent_task_id" TEXT;

UPDATE "Task" SET "parent_task_id" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.parent_task_id'), "data" = json_remove("data", '$.parent_task_id') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.parent_task_id') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.parent_task_id') = 'text'));

ALTER TABLE "NutritionLog" ADD COLUMN "name" TEXT;

UPDATE "NutritionLog" SET "name" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.name'), "data" = json_remove("data", '$.name') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.name') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.name') = 'text'));

ALTER TABLE "NutritionLog" ADD COLUMN "meal" TEXT;

UPDATE "NutritionLog" SET "meal" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.meal'), "data" = json_remove("data", '$.meal') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.meal') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.meal') = 'text'));

ALTER TABLE "NutritionLog" ADD COLUMN "calories" REAL;

UPDATE "NutritionLog" SET "calories" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories') AS REAL), "data" = json_remove("data", '$.calories') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.calories') AS REAL) >= 0));

ALTER TABLE "NutritionLog" ADD COLUMN "protein_g" REAL;

UPDATE "NutritionLog" SET "protein_g" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g') AS REAL), "data" = json_remove("data", '$.protein_g') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.protein_g') AS REAL) >= 0));

ALTER TABLE "NutritionLog" ADD COLUMN "carbs_g" REAL;

UPDATE "NutritionLog" SET "carbs_g" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g') AS REAL), "data" = json_remove("data", '$.carbs_g') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.carbs_g') AS REAL) >= 0));

ALTER TABLE "NutritionLog" ADD COLUMN "fat_g" REAL;

UPDATE "NutritionLog" SET "fat_g" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g') AS REAL), "data" = json_remove("data", '$.fat_g') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.fat_g') AS REAL) >= 0));

ALTER TABLE "ShoppingItem" ADD COLUMN "category" TEXT;

UPDATE "ShoppingItem" SET "category" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category'), "data" = json_remove("data", '$.category') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "priority" TEXT;

UPDATE "ShoppingItem" SET "priority" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.priority'), "data" = json_remove("data", '$.priority') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.priority') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.priority') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "quantity" INTEGER;

UPDATE "ShoppingItem" SET "quantity" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') AS INTEGER), "data" = json_remove("data", '$.quantity') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.quantity') AS REAL) BETWEEN 1 AND 2147483647));

ALTER TABLE "ShoppingItem" ADD COLUMN "estimatedCost" REAL;

UPDATE "ShoppingItem" SET "estimatedCost" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') AS REAL), "data" = json_remove("data", '$.estimatedCost') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') AS REAL) >= 0 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') AS REAL) = round(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.estimatedCost') AS REAL),2)));

ALTER TABLE "ShoppingItem" ADD COLUMN "targetPrice" REAL;

UPDATE "ShoppingItem" SET "targetPrice" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') AS REAL), "data" = json_remove("data", '$.targetPrice') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') AS REAL) >= 0 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') AS REAL) = round(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.targetPrice') AS REAL),2)));

ALTER TABLE "ShoppingItem" ADD COLUMN "actualCost" REAL;

UPDATE "ShoppingItem" SET "actualCost" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') AS REAL), "data" = json_remove("data", '$.actualCost') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') AS REAL) >= 0 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') AS REAL) = round(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.actualCost') AS REAL),2)));

ALTER TABLE "ShoppingItem" ADD COLUMN "notes" TEXT;

UPDATE "ShoppingItem" SET "notes" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes'), "data" = json_remove("data", '$.notes') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "url" TEXT;

UPDATE "ShoppingItem" SET "url" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.url'), "data" = json_remove("data", '$.url') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.url') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.url') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "stage" TEXT;

UPDATE "ShoppingItem" SET "stage" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.stage'), "data" = json_remove("data", '$.stage') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.stage') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.stage') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "deliverySpeed" TEXT;

UPDATE "ShoppingItem" SET "deliverySpeed" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.deliverySpeed'), "data" = json_remove("data", '$.deliverySpeed') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.deliverySpeed') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.deliverySpeed') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "neededBy" TEXT;

UPDATE "ShoppingItem" SET "neededBy" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.neededBy'), "data" = json_remove("data", '$.neededBy') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.neededBy') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.neededBy') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "source" TEXT;

UPDATE "ShoppingItem" SET "source" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.source'), "data" = json_remove("data", '$.source') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.source') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.source') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "orderedAt" TEXT;

UPDATE "ShoppingItem" SET "orderedAt" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.orderedAt'), "data" = json_remove("data", '$.orderedAt') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.orderedAt') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.orderedAt') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "expectedDelivery" TEXT;

UPDATE "ShoppingItem" SET "expectedDelivery" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expectedDelivery'), "data" = json_remove("data", '$.expectedDelivery') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expectedDelivery') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expectedDelivery') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "importKey" TEXT;

UPDATE "ShoppingItem" SET "importKey" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.importKey'), "data" = json_remove("data", '$.importKey') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.importKey') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.importKey') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "expenseId" TEXT;

UPDATE "ShoppingItem" SET "expenseId" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expenseId'), "data" = json_remove("data", '$.expenseId') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expenseId') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expenseId') = 'text'));

ALTER TABLE "ShoppingItem" ADD COLUMN "expenseDate" TEXT;

UPDATE "ShoppingItem" SET "expenseDate" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expenseDate'), "data" = json_remove("data", '$.expenseDate') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expenseDate') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.expenseDate') = 'text'));

ALTER TABLE "TimesheetSession" ADD COLUMN "project" TEXT;

UPDATE "TimesheetSession" SET "project" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.project'), "data" = json_remove("data", '$.project') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.project') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.project') = 'text'));

ALTER TABLE "TimesheetSession" ADD COLUMN "task" TEXT;

UPDATE "TimesheetSession" SET "task" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.task'), "data" = json_remove("data", '$.task') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.task') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.task') = 'text'));

ALTER TABLE "TimesheetSession" ADD COLUMN "seconds" INTEGER;

UPDATE "TimesheetSession" SET "seconds" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') AS INTEGER), "data" = json_remove("data", '$.seconds') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.seconds') AS REAL) BETWEEN 0 AND 2147483647));

ALTER TABLE "TimesheetSession" ADD COLUMN "billable" BOOLEAN;

UPDATE "TimesheetSession" SET "billable" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.billable') AS INTEGER), "data" = json_remove("data", '$.billable') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.billable') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.billable') IN ('true','false') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.billable') = 'integer' AND json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.billable') IN (0,1)))));

ALTER TABLE "TimesheetSession" ADD COLUMN "earnings" REAL;

UPDATE "TimesheetSession" SET "earnings" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') AS REAL), "data" = json_remove("data", '$.earnings') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') AS REAL) >= 0 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') AS REAL) = round(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.earnings') AS REAL),2)));

ALTER TABLE "TimesheetSession" ADD COLUMN "notes" TEXT;

UPDATE "TimesheetSession" SET "notes" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes'), "data" = json_remove("data", '$.notes') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes') = 'text'));

ALTER TABLE "TimesheetSession" ADD COLUMN "startTime" TEXT;

UPDATE "TimesheetSession" SET "startTime" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.startTime'), "data" = json_remove("data", '$.startTime') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.startTime') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.startTime') = 'text'));

ALTER TABLE "TimesheetSession" ADD COLUMN "endTime" TEXT;

UPDATE "TimesheetSession" SET "endTime" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.endTime'), "data" = json_remove("data", '$.endTime') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.endTime') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.endTime') = 'text'));

ALTER TABLE "EntertainmentMedia" ADD COLUMN "type" TEXT;

UPDATE "EntertainmentMedia" SET "type" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.type'), "data" = json_remove("data", '$.type') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.type') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.type') = 'text'));

ALTER TABLE "EntertainmentMedia" ADD COLUMN "status" TEXT;

UPDATE "EntertainmentMedia" SET "status" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.status'), "data" = json_remove("data", '$.status') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.status') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.status') = 'text'));

ALTER TABLE "EntertainmentMedia" ADD COLUMN "season" INTEGER;

UPDATE "EntertainmentMedia" SET "season" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') AS INTEGER), "data" = json_remove("data", '$.season') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.season') AS REAL) BETWEEN 1 AND 2147483647));

ALTER TABLE "EntertainmentMedia" ADD COLUMN "episode" INTEGER;

UPDATE "EntertainmentMedia" SET "episode" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') AS INTEGER), "data" = json_remove("data", '$.episode') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.episode') AS REAL) BETWEEN 0 AND 2147483647));

ALTER TABLE "EntertainmentMedia" ADD COLUMN "total_episodes" INTEGER;

UPDATE "EntertainmentMedia" SET "total_episodes" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') AS INTEGER), "data" = json_remove("data", '$.total_episodes') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.total_episodes') AS REAL) BETWEEN 1 AND 2147483647));

ALTER TABLE "EntertainmentMedia" ADD COLUMN "rating" REAL;

UPDATE "EntertainmentMedia" SET "rating" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating') AS REAL), "data" = json_remove("data", '$.rating') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.rating') AS REAL) BETWEEN 0 AND 10));

ALTER TABLE "Goal" ADD COLUMN "description" TEXT;

UPDATE "Goal" SET "description" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.description'), "data" = json_remove("data", '$.description') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.description') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.description') = 'text'));

ALTER TABLE "Goal" ADD COLUMN "category" TEXT;

UPDATE "Goal" SET "category" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category'), "data" = json_remove("data", '$.category') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'text'));

ALTER TABLE "Goal" ADD COLUMN "status" TEXT;

UPDATE "Goal" SET "status" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.status'), "data" = json_remove("data", '$.status') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.status') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.status') = 'text'));

ALTER TABLE "Goal" ADD COLUMN "priority" TEXT;

UPDATE "Goal" SET "priority" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.priority'), "data" = json_remove("data", '$.priority') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.priority') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.priority') = 'text'));

ALTER TABLE "Goal" ADD COLUMN "target_value" REAL;

UPDATE "Goal" SET "target_value" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value') AS REAL), "data" = json_remove("data", '$.target_value') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_value') AS REAL)) <= 1000000000000));

ALTER TABLE "Goal" ADD COLUMN "current_value" REAL;

UPDATE "Goal" SET "current_value" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value') AS REAL), "data" = json_remove("data", '$.current_value') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.current_value') AS REAL)) <= 1000000000000));

ALTER TABLE "Goal" ADD COLUMN "unit" TEXT;

UPDATE "Goal" SET "unit" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.unit'), "data" = json_remove("data", '$.unit') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.unit') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.unit') = 'text'));

ALTER TABLE "Goal" ADD COLUMN "is_focus" BOOLEAN;

UPDATE "Goal" SET "is_focus" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.is_focus') AS INTEGER), "data" = json_remove("data", '$.is_focus') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.is_focus') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.is_focus') IN ('true','false') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.is_focus') = 'integer' AND json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.is_focus') IN (0,1)))));

ALTER TABLE "SleepLog" ADD COLUMN "bed_time" TEXT;

UPDATE "SleepLog" SET "bed_time" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.bed_time'), "data" = json_remove("data", '$.bed_time') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.bed_time') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.bed_time') = 'text'));

ALTER TABLE "SleepLog" ADD COLUMN "wake_time" TEXT;

UPDATE "SleepLog" SET "wake_time" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.wake_time'), "data" = json_remove("data", '$.wake_time') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.wake_time') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.wake_time') = 'text'));

ALTER TABLE "SleepLog" ADD COLUMN "notes" TEXT;

UPDATE "SleepLog" SET "notes" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes'), "data" = json_remove("data", '$.notes') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.notes') = 'text'));

ALTER TABLE "Habit" ADD COLUMN "emoji" TEXT;

UPDATE "Habit" SET "emoji" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.emoji'), "data" = json_remove("data", '$.emoji') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.emoji') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.emoji') = 'text'));

ALTER TABLE "Habit" ADD COLUMN "category" TEXT;

UPDATE "Habit" SET "category" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category'), "data" = json_remove("data", '$.category') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'text'));

ALTER TABLE "Habit" ADD COLUMN "target_days" INTEGER;

UPDATE "Habit" SET "target_days" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') AS INTEGER), "data" = json_remove("data", '$.target_days') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.target_days') AS REAL) BETWEEN 1 AND 2147483647));

ALTER TABLE "Habit" ADD COLUMN "order_index" INTEGER;

UPDATE "Habit" SET "order_index" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') AS INTEGER), "data" = json_remove("data", '$.order_index') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') AS REAL) = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') AS INTEGER) AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.order_index') AS REAL) BETWEEN 0 AND 2147483647));

ALTER TABLE "SubscriptionItem" ADD COLUMN "category" TEXT;

UPDATE "SubscriptionItem" SET "category" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category'), "data" = json_remove("data", '$.category') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.category') = 'text'));

ALTER TABLE "SubscriptionItem" ADD COLUMN "next_date" TEXT;

UPDATE "SubscriptionItem" SET "next_date" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.next_date'), "data" = json_remove("data", '$.next_date') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.next_date') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.next_date') = 'text'));

ALTER TABLE "SubscriptionItem" ADD COLUMN "icon" TEXT;

UPDATE "SubscriptionItem" SET "icon" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.icon'), "data" = json_remove("data", '$.icon') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.icon') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.icon') = 'text'));

ALTER TABLE "SubscriptionItem" ADD COLUMN "auto_renew" INTEGER;

UPDATE "SubscriptionItem" SET "auto_renew" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.auto_renew') AS INTEGER), "data" = json_remove("data", '$.auto_renew') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.auto_renew') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.auto_renew') IN ('true','false') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.auto_renew') = 'integer' AND json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.auto_renew') IN (0,1)))));

ALTER TABLE "SubscriptionItem" ADD COLUMN "cycle" TEXT;

UPDATE "SubscriptionItem" SET "cycle" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.cycle'), "data" = json_remove("data", '$.cycle') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.cycle') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.cycle') = 'text'));

ALTER TABLE "SubscriptionItem" ADD COLUMN "cancelled_date" TEXT;

UPDATE "SubscriptionItem" SET "cancelled_date" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.cancelled_date'), "data" = json_remove("data", '$.cancelled_date') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.cancelled_date') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.cancelled_date') = 'text'));

ALTER TABLE "MoodLog" ADD COLUMN "energy" REAL;

UPDATE "MoodLog" SET "energy" = CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy') AS REAL), "data" = json_remove("data", '$.energy') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy') = 'null' OR ((json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy') IN ('integer','real') OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy')='text' AND CASE WHEN json_valid(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy')) THEN json_type(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy')) IN ('integer','real') ELSE 0 END)) AND abs(CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy') AS REAL)) <= 1000000000000 AND CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.energy') AS REAL) BETWEEN 1 AND 5));

ALTER TABLE "MoodLog" ADD COLUMN "note" TEXT;

UPDATE "MoodLog" SET "note" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.note'), "data" = json_remove("data", '$.note') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.note') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.note') = 'text'));

ALTER TABLE "VitalsLog" ADD COLUMN "unit" TEXT;

UPDATE "VitalsLog" SET "unit" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.unit'), "data" = json_remove("data", '$.unit') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.unit') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.unit') = 'text'));

ALTER TABLE "Medication" ADD COLUMN "frequency" TEXT;

UPDATE "Medication" SET "frequency" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.frequency'), "data" = json_remove("data", '$.frequency') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.frequency') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.frequency') = 'text'));

ALTER TABLE "Medication" ADD COLUMN "start_date" TEXT;

UPDATE "Medication" SET "start_date" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.start_date'), "data" = json_remove("data", '$.start_date') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.start_date') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.start_date') = 'text'));

ALTER TABLE "Medication" ADD COLUMN "end_date" TEXT;

UPDATE "Medication" SET "end_date" = json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.end_date'), "data" = json_remove("data", '$.end_date') WHERE json_valid("data") AND (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.end_date') = 'null' OR (json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.end_date') = 'text'));

UPDATE "Task" SET "due_date"=coalesce("due_date",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.dueDate')),data=json_remove(data,'$.dueDate') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.dueDate') IN ('text','null');

UPDATE "Task" SET "completedAt"=coalesce("completedAt",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.completed_at')),data=json_remove(data,'$.completed_at') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.completed_at') IN ('text','null');

UPDATE "Goal" SET "targetDate"=coalesce("targetDate",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.deadline')),data=json_remove(data,'$.deadline') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.deadline') IN ('text','null');

UPDATE "SubscriptionItem" SET "next_date"=coalesce("next_date",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.nextDate')),data=json_remove(data,'$.nextDate') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.nextDate') IN ('text','null');

UPDATE "VitalsLog" SET "vital"=coalesce("vital",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.type')),data=json_remove(data,'$.type') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.type') IN ('text','null');

UPDATE "Medication" SET "dosage"=coalesce("dosage",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.dose')),data=json_remove(data,'$.dose') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.dose') IN ('text','null');

UPDATE "Medication" SET "start_date"=coalesce("start_date",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.startDate')),data=json_remove(data,'$.startDate') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.startDate') IN ('text','null');

UPDATE "Medication" SET "end_date"=coalesce("end_date",json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.endDate')),data=json_remove(data,'$.endDate') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.endDate') IN ('text','null');

UPDATE "SleepLog" SET "hours"=coalesce("hours",CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.duration') AS REAL)),data=json_remove(data,'$.duration') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.duration') IN ('integer','real') AND abs(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.duration'))<=1000000000000;

UPDATE "TimesheetSession" SET "duration"=coalesce("duration",CAST(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.hours') AS REAL)),data=json_remove(data,'$.hours') WHERE json_valid(data) AND json_type(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.hours') IN ('integer','real') AND abs(json_extract(CASE WHEN json_valid("data") THEN "data" ELSE '{}' END, '$.hours'))<=1000000000000;

UPDATE TimesheetSession SET duration=seconds/3600.0 WHERE seconds IS NOT NULL;

-- Client aliases were metadata in older builds. Canonical values win when present.
UPDATE SubscriptionItem SET next_date=json_extract(data,'$.nextDate'),data=json_remove(data,'$.nextDate')
 WHERE json_valid(data) AND next_date IS NULL AND json_type(data,'$.nextDate') IN ('text','null');
UPDATE Medication SET start_date=json_extract(data,'$.startDate'),data=json_remove(data,'$.startDate')
 WHERE json_valid(data) AND start_date IS NULL AND json_type(data,'$.startDate') IN ('text','null');
UPDATE Medication SET end_date=json_extract(data,'$.endDate'),data=json_remove(data,'$.endDate')
 WHERE json_valid(data) AND end_date IS NULL AND json_type(data,'$.endDate') IN ('text','null');

CREATE TABLE TaskSubtask(taskId TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,done BOOLEAN NOT NULL DEFAULT false,position INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(taskId,id),FOREIGN KEY(taskId) REFERENCES Task(id) ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX TaskSubtask_taskId_position_idx ON TaskSubtask(taskId,position);
CREATE TABLE GoalSubtask(goalId TEXT NOT NULL,id TEXT NOT NULL,text TEXT NOT NULL,done BOOLEAN NOT NULL DEFAULT false,position INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(goalId,id),FOREIGN KEY(goalId) REFERENCES Goal(id) ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX GoalSubtask_goalId_position_idx ON GoalSubtask(goalId,position);
CREATE TABLE ShoppingPrice(itemId TEXT NOT NULL,position INTEGER NOT NULL,date TEXT NOT NULL,price REAL NOT NULL,
 PRIMARY KEY(itemId,position),FOREIGN KEY(itemId) REFERENCES ShoppingItem(id) ON DELETE CASCADE ON UPDATE CASCADE);

INSERT INTO TaskSubtask(taskId,id,title,done,position)
 SELECT p.id,CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT),json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.title'),json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done'),CAST(e.key AS INTEGER)
 FROM Task p,json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e WHERE json_valid(p.data) AND json_type(p.data,'$.subtasks')='array'
 AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e WHERE e.type!='object'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') NOT IN ('text','integer') OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') IS NULL OR length(CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT))=0
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.title') IS NOT 'text'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') NOT IN ('true','false') OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') IS NULL
 OR EXISTS(SELECT 1 FROM json_each(CASE WHEN e.type='object' THEN e.value ELSE '{}' END) x WHERE x.key NOT IN ('id','title','done')))
 AND (SELECT count(*) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks'))=(SELECT count(DISTINCT CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT)) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e);
 UPDATE Task AS p SET data=json_remove(data,'$.subtasks') WHERE json_valid(p.data) AND json_type(p.data,'$.subtasks')='array'
 AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e WHERE e.type!='object'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') NOT IN ('text','integer') OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') IS NULL OR length(CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT))=0
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.title') IS NOT 'text'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') NOT IN ('true','false') OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') IS NULL
 OR EXISTS(SELECT 1 FROM json_each(CASE WHEN e.type='object' THEN e.value ELSE '{}' END) x WHERE x.key NOT IN ('id','title','done')))
 AND (SELECT count(*) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks'))=(SELECT count(DISTINCT CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT)) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e);

INSERT INTO GoalSubtask(goalId,id,text,done,position)
 SELECT p.id,CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT),json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.text'),json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done'),CAST(e.key AS INTEGER)
 FROM Goal p,json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e WHERE json_valid(p.data) AND json_type(p.data,'$.subtasks')='array'
 AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e WHERE e.type!='object'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') NOT IN ('text','integer') OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') IS NULL OR length(CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT))=0
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.text') IS NOT 'text'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') NOT IN ('true','false') OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') IS NULL
 OR EXISTS(SELECT 1 FROM json_each(CASE WHEN e.type='object' THEN e.value ELSE '{}' END) x WHERE x.key NOT IN ('id','text','done')))
 AND (SELECT count(*) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks'))=(SELECT count(DISTINCT CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT)) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e);
 UPDATE Goal AS p SET data=json_remove(data,'$.subtasks') WHERE json_valid(p.data) AND json_type(p.data,'$.subtasks')='array'
 AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e WHERE e.type!='object'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') NOT IN ('text','integer') OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') IS NULL OR length(CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT))=0
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.text') IS NOT 'text'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') NOT IN ('true','false') OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.done') IS NULL
 OR EXISTS(SELECT 1 FROM json_each(CASE WHEN e.type='object' THEN e.value ELSE '{}' END) x WHERE x.key NOT IN ('id','text','done')))
 AND (SELECT count(*) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks'))=(SELECT count(DISTINCT CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS TEXT)) FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.subtasks') e);

INSERT INTO ShoppingPrice(itemId,position,date,price)
 SELECT p.id,CAST(e.key AS INTEGER),json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.date'),json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price')
 FROM ShoppingItem p,json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.priceHistory') e WHERE json_valid(p.data) AND json_type(p.data,'$.priceHistory')='array' AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.priceHistory') e WHERE e.type!='object'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.date') IS NOT 'text' OR length(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.date'))!=10
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') NOT IN ('integer','real') OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') IS NULL
 OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') < 0 OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') > 1000000000000
 OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') != round(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price'),2)
 OR EXISTS(SELECT 1 FROM json_each(CASE WHEN e.type='object' THEN e.value ELSE '{}' END) x WHERE x.key NOT IN ('date','price')));
 UPDATE ShoppingItem AS p SET data=json_remove(data,'$.priceHistory') WHERE json_valid(p.data) AND json_type(p.data,'$.priceHistory')='array' AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.priceHistory') e WHERE e.type!='object'
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.date') IS NOT 'text' OR length(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.date'))!=10
 OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') NOT IN ('integer','real') OR json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') IS NULL
 OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') < 0 OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') > 1000000000000
 OR json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price') != round(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.price'),2)
 OR EXISTS(SELECT 1 FROM json_each(CASE WHEN e.type='object' THEN e.value ELSE '{}' END) x WHERE x.key NOT IN ('date','price')));

INSERT INTO HabitLog(id,habitId,date,createdBy,updatedBy)
 SELECT 'typed-habit-'||lower(hex(randomblob(16))),p.id,e.value,p.userId,p.userId
 FROM Habit p,json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.completed_dates') e WHERE json_valid(p.data) AND json_type(p.data,'$.completed_dates')='array' AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.completed_dates') e WHERE e.type!='text' OR length(e.value)!=10 OR date(e.value) IS NULL OR date(e.value)!=e.value)
 AND NOT EXISTS(SELECT 1 FROM HabitLog l WHERE l.habitId=p.id AND l.date=e.value) GROUP BY p.id,e.value;
 UPDATE Habit AS p SET data=json_remove(data,'$.completed_dates') WHERE json_valid(p.data) AND json_type(p.data,'$.completed_dates')='array' AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(p.data) THEN p.data ELSE '{}' END,'$.completed_dates') e WHERE e.type!='text' OR length(e.value)!=10 OR date(e.value) IS NULL OR date(e.value)!=e.value);

ALTER TABLE "Document" ADD COLUMN "storageKey" TEXT;

ALTER TABLE "Document" ADD COLUMN "sizeBytes" INTEGER;

ALTER TABLE "Document" ADD COLUMN "mimeType" TEXT;

ALTER TABLE "Document" ADD COLUMN "sha256" TEXT;

ALTER TABLE "Document" ADD COLUMN "previewKind" TEXT;

ALTER TABLE "Document" ADD COLUMN "encryptionFormat" TEXT;

ALTER TABLE "Document" ADD COLUMN "encryptionKeyId" TEXT;

ALTER TABLE "WorkoutExercise" ADD COLUMN "source" TEXT;

ALTER TABLE "WorkoutExercise" ADD COLUMN "metadataVersion" INTEGER;

ALTER TABLE "WorkoutExercise" ADD COLUMN "setId" TEXT;

ALTER TABLE "WorkoutExercise" ADD COLUMN "position" INTEGER;

ALTER TABLE "WorkoutExercise" ADD COLUMN "setNumber" INTEGER;

ALTER TABLE "WorkoutExercise" ADD COLUMN "completed" BOOLEAN;

ALTER TABLE "WorkoutExercise" ADD COLUMN "payloadHash" TEXT;

UPDATE Document SET storageKey=json_extract(data,'$._vault.key'),sizeBytes=json_extract(data,'$._vault.bytes'),mimeType=json_extract(data,'$._vault.mime'),
 sha256=json_extract(data,'$._vault.sha256'),previewKind=json_extract(data,'$._vault.previewKind'),encryptionFormat=json_extract(data,'$._vault.encryption.format'),encryptionKeyId=json_extract(data,'$._vault.encryption.keyId')
 WHERE json_valid(data) AND json_type(data,'$._vault')='object'
 AND json_type(data,'$._vault.key')='text' AND length(json_extract(data,'$._vault.key'))=64 AND json_extract(data,'$._vault.key') NOT GLOB '*[^a-f0-9]*'
 AND json_type(data,'$._vault.bytes')='integer' AND json_extract(data,'$._vault.bytes') BETWEEN 0 AND 2147483647
 AND json_type(data,'$._vault.mime')='text' AND json_type(data,'$._vault.sha256')='text'
 AND length(json_extract(data,'$._vault.sha256'))=64 AND json_extract(data,'$._vault.sha256') NOT GLOB '*[^a-f0-9]*'
 AND (json_type(data,'$._vault.previewKind') IS NULL OR json_type(data,'$._vault.previewKind')='null' OR json_extract(data,'$._vault.previewKind') IN ('text','image'))
 AND (json_type(data,'$._vault.encryption') IS NULL OR json_type(data,'$._vault.encryption')='null'
 OR (json_type(data,'$._vault.encryption.format')='text' AND json_type(data,'$._vault.encryption.keyId')='text'));
 UPDATE Document SET data=json_remove(data,'$._vault.key','$._vault.bytes','$._vault.mime','$._vault.sha256','$._vault.previewKind','$._vault.encryption.format','$._vault.encryption.keyId') WHERE storageKey IS NOT NULL AND json_valid(data);
 UPDATE Document SET data=json_remove(data,'$._vault.encryption') WHERE json_valid(data) AND json_extract(data,'$._vault.encryption')='{}';
 UPDATE Document SET data=json_remove(data,'$._vault') WHERE json_valid(data) AND json_extract(data,'$._vault')='{}';

UPDATE WorkoutExercise SET source=json_extract(notes,'$.source'),metadataVersion=1,setId=json_extract(notes,'$.setId'),position=json_extract(notes,'$.index'),
 setNumber=json_extract(notes,'$.set.setNum'),completed=1,payloadHash=json_extract(notes,'$.payloadHash')
 WHERE json_valid(notes) AND json_extract(notes,'$.source')='training-session' AND json_extract(notes,'$.version')=1
 AND json_type(notes,'$.setId')='text' AND json_extract(notes,'$.setId')=json_extract(notes,'$.set.id')
 AND json_type(notes,'$.index')='integer' AND json_extract(notes,'$.index')>=0
 AND json_type(notes,'$.set.setNum')='integer' AND json_extract(notes,'$.set.setNum')>0
 AND json_type(notes,'$.set.done')='true' AND json_type(notes,'$.payloadHash')='text' AND length(json_extract(notes,'$.payloadHash'))=64 AND json_extract(notes,'$.payloadHash') NOT GLOB '*[^a-f0-9]*'
 AND json_type(notes,'$.set.actualReps')='integer' AND json_extract(notes,'$.set.actualReps')>=0 AND json_extract(notes,'$.set.actualWeight')>=0
 AND exercise_name=json_extract(notes,'$.set.exName') AND sets=1 AND reps=json_extract(notes,'$.set.actualReps') AND weight_kg=json_extract(notes,'$.set.actualWeight');
 UPDATE WorkoutExercise SET notes=json_remove(notes,'$.source','$.version','$.setId','$.index','$.payloadHash','$.set.id','$.set.exName','$.set.setNum','$.set.actualReps','$.set.actualWeight','$.set.done') WHERE source='training-session';
 UPDATE WorkoutExercise SET notes=json_remove(notes,'$.set') WHERE json_valid(notes) AND json_extract(notes,'$.set')='{}';
 UPDATE WorkoutExercise SET notes=NULL WHERE notes='{}';

CREATE INDEX "NutritionLog_userId_date_idx" ON "NutritionLog"("userId","date");

CREATE INDEX "ShoppingItem_userId_stage_purchased_idx" ON "ShoppingItem"("userId","stage","purchased");

CREATE INDEX "TimesheetSession_userId_date_idx" ON "TimesheetSession"("userId","date");

CREATE INDEX "EntertainmentMedia_userId_status_type_idx" ON "EntertainmentMedia"("userId","status","type");

CREATE INDEX "Goal_userId_status_targetDate_idx" ON "Goal"("userId","status","targetDate");

CREATE INDEX "SleepLog_userId_date_idx" ON "SleepLog"("userId","date");

CREATE INDEX "SubscriptionItem_userId_active_next_date_idx" ON "SubscriptionItem"("userId","active","next_date");

CREATE INDEX "MoodLog_userId_date_idx" ON "MoodLog"("userId","date");

CREATE INDEX "VitalsLog_userId_date_vital_idx" ON "VitalsLog"("userId","date","vital");

UPDATE "Task" SET data=NULL WHERE data='{}';

UPDATE "NutritionLog" SET data=NULL WHERE data='{}';

UPDATE "ShoppingItem" SET data=NULL WHERE data='{}';

UPDATE "TimesheetSession" SET data=NULL WHERE data='{}';

UPDATE "EntertainmentMedia" SET data=NULL WHERE data='{}';

UPDATE "Goal" SET data=NULL WHERE data='{}';

UPDATE "SleepLog" SET data=NULL WHERE data='{}';

UPDATE "Habit" SET data=NULL WHERE data='{}';

UPDATE "SubscriptionItem" SET data=NULL WHERE data='{}';

UPDATE "MoodLog" SET data=NULL WHERE data='{}';

UPDATE "VitalsLog" SET data=NULL WHERE data='{}';

UPDATE "Medication" SET data=NULL WHERE data='{}';

UPDATE "Document" SET data=NULL WHERE data='{}';
