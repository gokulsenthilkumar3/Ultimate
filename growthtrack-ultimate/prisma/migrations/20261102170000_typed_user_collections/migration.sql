-- Promote stable collections; retain malformed documents and unconvertible fields.

BEGIN IMMEDIATE;

CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "name" TEXT,
    "category" TEXT,
    "xp" REAL,
    "description" TEXT,
    "weeklyTarget" REAL,
    "resource" TEXT,
    "nextAction" TEXT,
    "lastPracticed" TEXT,
    "practiceCount" INTEGER,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "manual_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "title" TEXT,
    "description" TEXT,
    "stack" TEXT,
    "status" TEXT,
    "url" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "manual_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "repository_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "repository_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "assessment_rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "round" TEXT,
    "color" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "assessment_rounds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "assessment_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "questionKey" TEXT,
    "question" TEXT,
    "answer" TEXT,
    "data" TEXT,
    CONSTRAINT "assessment_answers_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "assessment_rounds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_skills_userId_category_idx" ON "user_skills"("userId", "category");

CREATE UNIQUE INDEX "user_skills_userId_position_key" ON "user_skills"("userId", "position");

CREATE INDEX "manual_projects_userId_status_idx" ON "manual_projects"("userId", "status");

CREATE UNIQUE INDEX "manual_projects_userId_position_key" ON "manual_projects"("userId", "position");

CREATE UNIQUE INDEX "repository_notes_userId_repositoryId_key" ON "repository_notes"("userId", "repositoryId");

CREATE UNIQUE INDEX "assessment_rounds_userId_position_key" ON "assessment_rounds"("userId", "position");

CREATE UNIQUE INDEX "assessment_answers_roundId_position_key" ON "assessment_answers"("roundId", "position");

WITH source AS (SELECT u.id AS ownerId,u.createdAt,u.updatedAt,j.key AS position,j.value AS payload FROM "User" u,json_each(CASE WHEN json_valid(u."skills") THEN CASE WHEN json_type(u."skills")='array' THEN u."skills" ELSE '[]' END ELSE '[]' END) j WHERE json_valid(u."skills") AND CASE WHEN json_valid(u."skills") THEN json_type(u."skills")='array' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u."skills") THEN CASE WHEN json_type(u."skills")='array' THEN u."skills" ELSE '[]' END ELSE '[]' END) bad WHERE bad.type<>'object'))
INSERT INTO "user_skills" ("id","userId","position","clientId","clientIdType","clientCreatedAt","clientUpdatedAt","name","category","xp","description","weeklyTarget","resource","nextAction","lastPracticed","practiceCount","data","createdAt","updatedAt")
SELECT 'legacy-skills:'||s.ownerId||':'||s.position,
 s.ownerId,
 s.position,
 CASE WHEN json_type(s.payload,'$.id') IN ('text','integer','real') THEN CAST(json_extract(s.payload,'$.id') AS TEXT) END,
 CASE json_type(s.payload,'$.id') WHEN 'text' THEN 'string' WHEN 'integer' THEN 'number' WHEN 'real' THEN 'number' END,
 CASE WHEN json_type(s.payload, '$.createdAt') = 'text' THEN json_extract(s.payload, '$.createdAt') END,
 CASE WHEN json_type(s.payload, '$.updatedAt') = 'text' THEN json_extract(s.payload, '$.updatedAt') END,
 CASE WHEN json_type(s.payload, '$.name') = 'text' THEN json_extract(s.payload, '$.name') END,
 CASE WHEN json_type(s.payload, '$.category') = 'text' THEN json_extract(s.payload, '$.category') END,
 CASE WHEN json_type(s.payload, '$.xp') IN ('integer','real') THEN json_extract(s.payload, '$.xp') END,
 CASE WHEN json_type(s.payload, '$.description') = 'text' THEN json_extract(s.payload, '$.description') END,
 CASE WHEN json_type(s.payload, '$.weeklyTarget') IN ('integer','real') THEN json_extract(s.payload, '$.weeklyTarget') END,
 CASE WHEN json_type(s.payload, '$.resource') = 'text' THEN json_extract(s.payload, '$.resource') END,
 CASE WHEN json_type(s.payload, '$.nextAction') = 'text' THEN json_extract(s.payload, '$.nextAction') END,
 CASE WHEN json_type(s.payload, '$.lastPracticed') = 'text' THEN json_extract(s.payload, '$.lastPracticed') END,
 CASE WHEN json_type(s.payload, '$.practiceCount') = 'integer' THEN json_extract(s.payload, '$.practiceCount') END,
 (SELECT json_group_object(p.key,json(CASE p.type WHEN 'text' THEN json_quote(p.value) WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE p.value END)) FROM json_each(s.payload) p WHERE NOT ((p.key='name' AND p.type ='text') OR (p.key='category' AND p.type ='text') OR (p.key='xp' AND p.type IN ('integer','real')) OR (p.key='description' AND p.type ='text') OR (p.key='weeklyTarget' AND p.type IN ('integer','real')) OR (p.key='resource' AND p.type ='text') OR (p.key='nextAction' AND p.type ='text') OR (p.key='lastPracticed' AND p.type ='text') OR (p.key='practiceCount' AND p.type ='integer') OR (p.key='id' AND p.type IN ('text','integer','real')) OR (p.key IN ('createdAt','updatedAt') AND p.type='text'))),
 s.createdAt,
 s.updatedAt FROM source s;

WITH source AS (SELECT u.id AS ownerId,u.createdAt,u.updatedAt,j.key AS position,j.value AS payload FROM "User" u,json_each(CASE WHEN json_valid(u."manualProjects") THEN CASE WHEN json_type(u."manualProjects")='array' THEN u."manualProjects" ELSE '[]' END ELSE '[]' END) j WHERE json_valid(u."manualProjects") AND CASE WHEN json_valid(u."manualProjects") THEN json_type(u."manualProjects")='array' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u."manualProjects") THEN CASE WHEN json_type(u."manualProjects")='array' THEN u."manualProjects" ELSE '[]' END ELSE '[]' END) bad WHERE bad.type<>'object'))
INSERT INTO "manual_projects" ("id","userId","position","clientId","clientIdType","clientCreatedAt","clientUpdatedAt","title","description","stack","status","url","startDate","endDate","data","createdAt","updatedAt")
SELECT 'legacy-manualProjects:'||s.ownerId||':'||s.position,
 s.ownerId,
 s.position,
 CASE WHEN json_type(s.payload,'$.id') IN ('text','integer','real') THEN CAST(json_extract(s.payload,'$.id') AS TEXT) END,
 CASE json_type(s.payload,'$.id') WHEN 'text' THEN 'string' WHEN 'integer' THEN 'number' WHEN 'real' THEN 'number' END,
 CASE WHEN json_type(s.payload, '$.createdAt') = 'text' THEN json_extract(s.payload, '$.createdAt') END,
 CASE WHEN json_type(s.payload, '$.updatedAt') = 'text' THEN json_extract(s.payload, '$.updatedAt') END,
 CASE WHEN json_type(s.payload, '$.title') = 'text' THEN json_extract(s.payload, '$.title') END,
 CASE WHEN json_type(s.payload, '$.description') = 'text' THEN json_extract(s.payload, '$.description') END,
 CASE WHEN json_type(s.payload, '$.stack') = 'text' THEN json_extract(s.payload, '$.stack') END,
 CASE WHEN json_type(s.payload, '$.status') = 'text' THEN json_extract(s.payload, '$.status') END,
 CASE WHEN json_type(s.payload, '$.url') = 'text' THEN json_extract(s.payload, '$.url') END,
 CASE WHEN json_type(s.payload, '$.startDate') = 'text' THEN json_extract(s.payload, '$.startDate') END,
 CASE WHEN json_type(s.payload, '$.endDate') = 'text' THEN json_extract(s.payload, '$.endDate') END,
 (SELECT json_group_object(p.key,json(CASE p.type WHEN 'text' THEN json_quote(p.value) WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE p.value END)) FROM json_each(s.payload) p WHERE NOT ((p.key='title' AND p.type ='text') OR (p.key='description' AND p.type ='text') OR (p.key='stack' AND p.type ='text') OR (p.key='status' AND p.type ='text') OR (p.key='url' AND p.type ='text') OR (p.key='startDate' AND p.type ='text') OR (p.key='endDate' AND p.type ='text') OR (p.key='id' AND p.type IN ('text','integer','real')) OR (p.key IN ('createdAt','updatedAt') AND p.type='text'))),
 s.createdAt,
 s.updatedAt FROM source s;

WITH source AS (SELECT u.id AS ownerId,u.createdAt,u.updatedAt,j.key AS position,j.value AS payload FROM "User" u,json_each(CASE WHEN json_valid(u."assessmentQA") THEN CASE WHEN json_type(u."assessmentQA")='array' THEN u."assessmentQA" ELSE '[]' END ELSE '[]' END) j WHERE json_valid(u."assessmentQA") AND CASE WHEN json_valid(u."assessmentQA") THEN json_type(u."assessmentQA")='array' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u."assessmentQA") THEN CASE WHEN json_type(u."assessmentQA")='array' THEN u."assessmentQA" ELSE '[]' END ELSE '[]' END) bad WHERE bad.type<>'object'))
INSERT INTO "assessment_rounds" ("id","userId","position","clientId","clientIdType","clientCreatedAt","clientUpdatedAt","round","color","data","createdAt","updatedAt")
SELECT 'legacy-assessment:'||s.ownerId||':'||s.position,
 s.ownerId,
 s.position,
 CASE WHEN json_type(s.payload,'$.id') IN ('text','integer','real') THEN CAST(json_extract(s.payload,'$.id') AS TEXT) END,
 CASE json_type(s.payload,'$.id') WHEN 'text' THEN 'string' WHEN 'integer' THEN 'number' WHEN 'real' THEN 'number' END,
 CASE WHEN json_type(s.payload, '$.createdAt') = 'text' THEN json_extract(s.payload, '$.createdAt') END,
 CASE WHEN json_type(s.payload, '$.updatedAt') = 'text' THEN json_extract(s.payload, '$.updatedAt') END,
 CASE WHEN json_type(s.payload, '$.round') = 'text' THEN json_extract(s.payload, '$.round') END,
 CASE WHEN json_type(s.payload, '$.color') = 'text' THEN json_extract(s.payload, '$.color') END,
 (SELECT json_group_object(p.key,json(CASE p.type WHEN 'text' THEN json_quote(p.value) WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE p.value END)) FROM json_each(s.payload) p WHERE NOT ((p.key='round' AND p.type ='text') OR (p.key='color' AND p.type ='text') OR (p.key='id' AND p.type IN ('text','integer','real')) OR (p.key IN ('createdAt','updatedAt') AND p.type='text') OR (p.key='items' AND p.type='array' AND NOT EXISTS(SELECT 1 FROM json_each(p.value) bad WHERE bad.type<>'object')))),
 s.createdAt,
 s.updatedAt FROM source s;

WITH source AS (
 SELECT r.id AS roundId,j.key AS position,j.value AS payload FROM assessment_rounds r
 JOIN "User" u ON u.id=r.userId
 JOIN json_each(CASE WHEN json_valid(u."assessmentQA") THEN CASE WHEN json_type(u."assessmentQA")='array' THEN u."assessmentQA" ELSE '[]' END ELSE '[]' END) rounds ON rounds.key=r.position
 JOIN json_each(CASE WHEN json_type(rounds.value,'$.items')='array' THEN json_extract(rounds.value,'$.items') ELSE '[]' END) j
 WHERE j.type='object' AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_type(rounds.value,'$.items')='array' THEN json_extract(rounds.value,'$.items') ELSE '[]' END) bad WHERE bad.type<>'object')
)
INSERT INTO assessment_answers(id,roundId,position,"clientId","clientIdType","clientCreatedAt","clientUpdatedAt",questionKey,question,answer,data)
SELECT 'legacy-answer:'||s.roundId||':'||s.position,s.roundId,s.position,CASE WHEN json_type(s.payload,'$.id') IN ('text','integer','real') THEN CAST(json_extract(s.payload,'$.id') AS TEXT) END,CASE json_type(s.payload,'$.id') WHEN 'text' THEN 'string' WHEN 'integer' THEN 'number' WHEN 'real' THEN 'number' END,CASE WHEN json_type(s.payload, '$.createdAt') = 'text' THEN json_extract(s.payload, '$.createdAt') END,CASE WHEN json_type(s.payload, '$.updatedAt') = 'text' THEN json_extract(s.payload, '$.updatedAt') END,CASE WHEN json_type(s.payload, '$.key') = 'text' THEN json_extract(s.payload, '$.key') END,CASE WHEN json_type(s.payload, '$.q') = 'text' THEN json_extract(s.payload, '$.q') END,CASE WHEN json_type(s.payload, '$.a') = 'text' THEN json_extract(s.payload, '$.a') END,(SELECT json_group_object(p.key,json(CASE p.type WHEN 'text' THEN json_quote(p.value) WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE p.value END)) FROM json_each(s.payload) p WHERE NOT ((p.key='key' AND p.type ='text') OR (p.key='q' AND p.type ='text') OR (p.key='a' AND p.type ='text') OR (p.key='id' AND p.type IN ('text','integer','real')) OR (p.key IN ('createdAt','updatedAt') AND p.type='text'))) FROM source s;

INSERT INTO repository_notes(id,userId,repositoryId,note,createdAt,updatedAt)
 SELECT 'legacy-note:'||u.id||':'||j.key,u.id,j.key,j.value,u.createdAt,u.updatedAt
 FROM "User" u,json_each(CASE WHEN json_valid(u.repoNotes) THEN CASE WHEN json_type(u.repoNotes)='object' THEN u.repoNotes ELSE '{}' END ELSE '{}' END) j WHERE json_valid(u.repoNotes) AND CASE WHEN json_valid(u.repoNotes) THEN json_type(u.repoNotes)='object' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u.repoNotes) THEN CASE WHEN json_type(u.repoNotes)='object' THEN u.repoNotes ELSE '{}' END ELSE '{}' END) bad WHERE bad.type<>'text');

UPDATE "User" AS u SET "skills"=NULL WHERE json_valid(u."skills") AND CASE WHEN json_valid(u."skills") THEN json_type(u."skills")='array' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u."skills") THEN CASE WHEN json_type(u."skills")='array' THEN u."skills" ELSE '[]' END ELSE '[]' END) bad WHERE bad.type<>'object') OR "skills"='null';

UPDATE "User" AS u SET "manualProjects"=NULL WHERE json_valid(u."manualProjects") AND CASE WHEN json_valid(u."manualProjects") THEN json_type(u."manualProjects")='array' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u."manualProjects") THEN CASE WHEN json_type(u."manualProjects")='array' THEN u."manualProjects" ELSE '[]' END ELSE '[]' END) bad WHERE bad.type<>'object') OR "manualProjects"='null';

UPDATE "User" AS u SET "assessmentQA"=NULL WHERE json_valid(u."assessmentQA") AND CASE WHEN json_valid(u."assessmentQA") THEN json_type(u."assessmentQA")='array' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u."assessmentQA") THEN CASE WHEN json_type(u."assessmentQA")='array' THEN u."assessmentQA" ELSE '[]' END ELSE '[]' END) bad WHERE bad.type<>'object') OR "assessmentQA"='null';

UPDATE "User" AS u SET repoNotes=NULL WHERE json_valid(u.repoNotes) AND CASE WHEN json_valid(u.repoNotes) THEN json_type(u.repoNotes)='object' ELSE 0 END AND NOT EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(u.repoNotes) THEN CASE WHEN json_type(u.repoNotes)='object' THEN u.repoNotes ELSE '{}' END ELSE '{}' END) bad WHERE bad.type<>'text') OR repoNotes='null';

COMMIT;
