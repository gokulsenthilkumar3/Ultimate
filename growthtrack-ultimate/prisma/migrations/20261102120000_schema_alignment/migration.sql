-- Fill historical metadata/index gaps; no records are removed.
BEGIN IMMEDIATE;
CREATE TABLE "health_profiles_aligned" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT, "updatedBy" TEXT,
  CONSTRAINT "health_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "health_profiles_aligned" ("id", "userId", "data", "createdAt", "updatedAt")
 SELECT "id", "userId", "data", "createdAt", "updatedAt" FROM "health_profiles";
DROP TABLE "health_profiles";
ALTER TABLE "health_profiles_aligned" RENAME TO "health_profiles";
CREATE UNIQUE INDEX "health_profiles_userId_key" ON "health_profiles"("userId");
-- SQLite cannot add CURRENT_TIMESTAMP defaults to a nonempty table. Copy the
-- complete existing row shape, using its capture time for historical metadata.
CREATE TABLE "location_points_aligned" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "accuracyM" REAL,
  "source" TEXT NOT NULL DEFAULT 'browser',
  "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "location_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "location_points_aligned" ("id", "userId", "latitude", "longitude", "accuracyM", "source", "capturedAt", "createdAt", "updatedAt")
 SELECT "id", "userId", "latitude", "longitude", "accuracyM", "source", "capturedAt", "capturedAt", "capturedAt" FROM "location_points";
DROP TABLE "location_points";
ALTER TABLE "location_points_aligned" RENAME TO "location_points";
CREATE INDEX "location_points_userId_capturedAt_idx" ON "location_points"("userId", "capturedAt");
CREATE TABLE "custom_tables_aligned" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "schema" TEXT NOT NULL DEFAULT '[]', "rows" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT, "updatedBy" TEXT,
  CONSTRAINT "custom_tables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "custom_tables_aligned" ("id", "userId", "name", "schema", "rows", "createdAt", "updatedAt")
 SELECT "id", "userId", "name", "schema", "rows", "createdAt", "updatedAt" FROM "custom_tables";
DROP TABLE "custom_tables";
ALTER TABLE "custom_tables_aligned" RENAME TO "custom_tables";
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");
CREATE INDEX "auth_sessions_userId_expiresAt_idx" ON "auth_sessions"("userId", "expiresAt");
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");
CREATE UNIQUE INDEX "owner_profiles_userId_key" ON "owner_profiles"("userId");
CREATE UNIQUE INDEX "social_profiles_userId_provider_key" ON "social_profiles"("userId", "provider");
CREATE UNIQUE INDEX "body_profiles_userId_key" ON "body_profiles"("userId");
CREATE UNIQUE INDEX "integration_credentials_userId_provider_key" ON "integration_credentials"("userId", "provider");
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");
CREATE UNIQUE INDEX "integration_providers_providerKey_key" ON "integration_providers"("providerKey");
CREATE UNIQUE INDEX "help_articles_slug_key" ON "help_articles"("slug");
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt");
CREATE INDEX "Task_userId_status_due_date_idx" ON "Task"("userId", "status", "due_date");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE INDEX "Budget_userId_month_idx" ON "Budget"("userId", "month");
CREATE INDEX "MetricLog_userId_metric_measuredAt_idx" ON "MetricLog"("userId", "metric", "measuredAt");
CREATE INDEX "MetricLog_userId_date_idx" ON "MetricLog"("userId", "date");
COMMIT;
