-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "subscriptionTier" TEXT DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT,
    "referralCode" TEXT NOT NULL,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainingPlan" TEXT,
    "nutritionStrategy" TEXT,
    "lifestyleTips" TEXT,
    "medicalData" TEXT,
    "physiqueTargets" TEXT,
    "assessmentQA" TEXT,
    "skills" TEXT,
    "calendarEvents" TEXT,
    "wellnessData" TEXT,
    "healthExtras" TEXT,
    "manualProjects" TEXT,
    "repoNotes" TEXT,
    "portfolio" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "palette" TEXT NOT NULL DEFAULT 'gold',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "navigationOrder" TEXT,
    "navigationTabOrder" TEXT,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "owner_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "dateOfBirth" TEXT,
    "gender" TEXT,
    "bloodType" TEXT,
    "locationName" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "nationality" TEXT,
    "language" TEXT,
    "timezone" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "maritalStatus" TEXT,
    "incomeBracket" REAL,
    "livingSituation" TEXT,
    "dietaryPreference" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "medicalConditions" TEXT,
    "allergies" TEXT,
    "restingHeartRate" REAL,
    "activityLevel" TEXT,
    "maintenanceCalories" REAL,
    "trainingStyle" TEXT,
    "baseCurrency" TEXT,
    "isdCode" TEXT,
    "netWorth" REAL,
    "primaryBank" TEXT,
    "passportNationality" TEXT,
    "dateFormat" TEXT,
    "numberFormat" TEXT,
    "measurementSystem" TEXT,
    "textDirection" TEXT,
    "motherLanguage" TEXT,
    "motherLanguageProficiency" TEXT,
    "privacyLevel" TEXT NOT NULL DEFAULT 'Private',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "primaryGoal" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "owner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "social_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "profileUrl" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "avgLikes" INTEGER NOT NULL DEFAULT 0,
    "avgViews" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "social_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "body_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "heightCm" REAL,
    "weightKg" REAL,
    "bodyFatPct" REAL,
    "leanMassKg" REAL,
    "skeletalMuscleKg" REAL,
    "bodyWaterPct" REAL,
    "boneMassKg" REAL,
    "visceralFatLevel" REAL,
    "chestCm" REAL,
    "waistCm" REAL,
    "shouldersCm" REAL,
    "armsCm" REAL,
    "forearmsCm" REAL,
    "hipsCm" REAL,
    "thighsCm" REAL,
    "calvesCm" REAL,
    "neckCm" REAL,
    "glutesCm" REAL,
    "ankleCm" REAL,
    "wristCm" REAL,
    "elbowCm" REAL,
    "underbustCm" REAL,
    "highHipCm" REAL,
    "chestDepthCm" REAL,
    "shoulderBreadthCm" REAL,
    "bideltoidBreadthCm" REAL,
    "pelvicBreadthCm" REAL,
    "torsoLengthCm" REAL,
    "sittingHeightCm" REAL,
    "upperArmCm" REAL,
    "lowerArmCm" REAL,
    "handLengthCm" REAL,
    "legLengthCm" REAL,
    "upperLegLengthCm" REAL,
    "lowerLegLengthCm" REAL,
    "inseamCm" REAL,
    "neckLengthCm" REAL,
    "footLengthCm" REAL,
    "headCircCm" REAL,
    "leftShoulderCm" REAL,
    "rightShoulderCm" REAL,
    "leftUpperArmCircumferenceCm" REAL,
    "rightUpperArmCircumferenceCm" REAL,
    "leftForearmCm" REAL,
    "rightForearmCm" REAL,
    "leftWristCm" REAL,
    "rightWristCm" REAL,
    "leftThighCm" REAL,
    "rightThighCm" REAL,
    "leftCalfCm" REAL,
    "rightCalfCm" REAL,
    "leftHipCm" REAL,
    "rightHipCm" REAL,
    "headTiltAngle" REAL,
    "pelvicTilt" REAL,
    "shoulderRounding" REAL,
    "shoulderTiltDeg" REAL,
    "spineCurvatureDeg" REAL,
    "hipRotationDeg" REAL,
    "kneeAlignmentDeg" REAL,
    "leftKneeAngleDeg" REAL,
    "rightKneeAngleDeg" REAL,
    "leftFootRotationDeg" REAL,
    "rightFootRotationDeg" REAL,
    "faceWidthCm" REAL,
    "faceHeightCm" REAL,
    "eyeSpacingCm" REAL,
    "earLengthCm" REAL,
    "earWidthCm" REAL,
    "noseLengthCm" REAL,
    "noseWidthCm" REAL,
    "browDepth" REAL,
    "noseBridgeWidth" REAL,
    "noseTipSize" REAL,
    "earProminence" REAL,
    "jawWidth" REAL,
    "chinProjection" REAL,
    "lipFullness" REAL,
    "eyeSize" REAL,
    "targetWeightKg" REAL,
    "targetBodyFatPct" REAL,
    "targetLeanMassKg" REAL,
    "targetSkeletalMuscleKg" REAL,
    "targetChestCm" REAL,
    "targetWaistCm" REAL,
    "targetShouldersCm" REAL,
    "targetArmsCm" REAL,
    "targetThighsCm" REAL,
    "targetHipsCm" REAL,
    "targetGlutesCm" REAL,
    "targetCalvesCm" REAL,
    "biologicalSex" TEXT,
    "modelPreset" TEXT,
    "skinTone" TEXT,
    "skinFitzpatrickIndex" INTEGER,
    "skinUndertone" TEXT,
    "skinColorHex" TEXT,
    "skinTextureVariant" TEXT,
    "skinFreckleDensity" REAL,
    "skinFeatureMap" TEXT,
    "hairStyle" TEXT,
    "hairColorHex" TEXT,
    "hairTexture" TEXT,
    "hairlineStyle" TEXT,
    "hairPart" TEXT,
    "hairDensity" REAL,
    "hairLengthCm" REAL,
    "facialHairStyle" TEXT,
    "facialHairColorHex" TEXT,
    "facialHairDensity" REAL,
    "eyebrowStyle" TEXT,
    "eyebrowColorHex" TEXT,
    "eyeColorHex" TEXT,
    "eyePattern" TEXT,
    "eyelidShape" TEXT,
    "eyelashStyle" TEXT,
    "scleraColorHex" TEXT,
    "irisLimbalRing" BOOLEAN,
    "lipColorHex" TEXT,
    "bodyHairPattern" TEXT,
    "bodyHairColorHex" TEXT,
    "bodyHairTexture" TEXT,
    "bodyHairDensity" REAL,
    "nailColorHex" TEXT,
    "nailShape" TEXT,
    "nailLengthMm" REAL,
    "avatarAsset" TEXT,
    "tattooAsset" TEXT,
    "anatomyPreset" TEXT,
    "anatomyVisibility" TEXT,
    "anatomyRevealConsent" BOOLEAN NOT NULL DEFAULT false,
    "morphOverrides" TEXT NOT NULL DEFAULT '{}',
    "facialMorphs" TEXT,
    "bodyProportions" TEXT,
    "skinTones" TEXT,
    "skinDetails" TEXT,
    "hairProperties" TEXT,
    "eyeProperties" TEXT,
    "skinShadeHeadHex" TEXT,
    "skinShadeNeckHex" TEXT,
    "skinShadeTorsoHex" TEXT,
    "skinShadeAbsHex" TEXT,
    "skinShadeArmsHex" TEXT,
    "skinShadeLegsHex" TEXT,
    "skinShadeGenitalsHex" TEXT,
    "skinShadeHandsHex" TEXT,
    "skinShadeFeetHex" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "body_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountName" TEXT,
    "clientIdCiphertext" TEXT,
    "accessTokenCiphertext" TEXT,
    "refreshTokenCiphertext" TEXT,
    "tokenExpiresAt" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "integration_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'application',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "integration_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "documentationUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "help_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "plan_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationWeeks" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "creditAmount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT,
    "due_date" TEXT,
    "priority" TEXT,
    "project" TEXT,
    "section" TEXT,
    "tags" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TEXT,
    "description" TEXT,
    "category" TEXT,
    "reminderAt" TEXT,
    "recurrence" TEXT,
    "parent_task_id" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL,
    "amountMinor" INTEGER,
    "type" TEXT,
    "category" TEXT,
    "method" TEXT,
    "date" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT,
    "limit_amount" REAL,
    "limitMinor" INTEGER,
    "month" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "metric" TEXT,
    "value" REAL,
    "unit" TEXT,
    "side" TEXT,
    "phase" TEXT DEFAULT 'current',
    "confidence" REAL,
    "measuredAt" DATETIME,
    "source" TEXT DEFAULT 'manual',
    "type" TEXT,
    "exercise" TEXT,
    "weight" REAL,
    "reps" INTEGER,
    "sets" INTEGER,
    "notes" TEXT,
    "photoUrl" TEXT,
    "label" TEXT,
    "data" TEXT,
    "stringValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetricLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricLogId" TEXT NOT NULL,
    "container" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "value" REAL,
    "stringValue" TEXT,
    "booleanValue" BOOLEAN,
    "unit" TEXT,
    CONSTRAINT "MetricMeasurement_metricLogId_fkey" FOREIGN KEY ("metricLogId") REFERENCES "MetricLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "health_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "posture" TEXT,
    "broncoTest" TEXT,
    "diets" TEXT,
    "hobbies" TEXT,
    "data" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "health_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthSense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "level" REAL,
    "note" TEXT,
    "currentPower" TEXT,
    "targetPower" TEXT,
    "path" TEXT,
    "color" TEXT,
    "exercises" TEXT,
    "data" TEXT,
    CONSTRAINT "HealthSense_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "health_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthSpecialized" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT,
    "score" REAL,
    "color" TEXT,
    "data" TEXT,
    CONSTRAINT "HealthSpecialized_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "health_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthRecoveryMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "clientId" TEXT,
    "position" INTEGER NOT NULL,
    "name" TEXT,
    "valueType" TEXT,
    "value" REAL,
    "stringValue" TEXT,
    "booleanValue" BOOLEAN,
    "status" TEXT,
    "data" TEXT,
    CONSTRAINT "HealthRecoveryMetric_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "health_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location_points" (
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

-- CreateTable
CREATE TABLE "custom_tables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" TEXT NOT NULL DEFAULT '[]',
    "rows" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "custom_tables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "logged_at" TEXT,
    "date" TEXT,
    "name" TEXT,
    "meal" TEXT,
    "calories" REAL,
    "protein_g" REAL,
    "carbs_g" REAL,
    "fat_g" REAL,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "notes" TEXT,
    "duration_minutes" INTEGER,
    "volume" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "exercise_name" TEXT,
    "sets" INTEGER,
    "reps" INTEGER,
    "weight_kg" REAL,
    "notes" TEXT,
    "source" TEXT,
    "metadataVersion" INTEGER,
    "setId" TEXT,
    "position" INTEGER,
    "setNumber" INTEGER,
    "completed" BOOLEAN,
    "payloadHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "priority" TEXT,
    "quantity" INTEGER,
    "estimatedCost" REAL,
    "targetPrice" REAL,
    "actualCost" REAL,
    "notes" TEXT,
    "url" TEXT,
    "stage" TEXT,
    "deliverySpeed" TEXT,
    "neededBy" TEXT,
    "source" TEXT,
    "orderedAt" TEXT,
    "expectedDelivery" TEXT,
    "importKey" TEXT,
    "expenseId" TEXT,
    "expenseDate" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimesheetSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "duration" REAL,
    "project" TEXT,
    "task" TEXT,
    "seconds" INTEGER,
    "billable" BOOLEAN,
    "earnings" REAL,
    "notes" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimesheetSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntertainmentMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "progress" TEXT,
    "type" TEXT,
    "status" TEXT,
    "season" INTEGER,
    "episode" INTEGER,
    "total_episodes" INTEGER,
    "rating" REAL,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntertainmentMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "color" TEXT,
    "tags" TEXT,
    "source" TEXT,
    "date" TEXT,
    "time" TEXT,
    "text" TEXT,
    "prompt" TEXT,
    "journalVersion" INTEGER,
    "wordCount" INTEGER,
    "legacyImportId" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL DEFAULT 'workspace',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "date" TEXT,
    "endDate" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "timeZone" TEXT,
    "recurrence" TEXT,
    "type" TEXT,
    "description" TEXT,
    "location" TEXT,
    "color" TEXT,
    "icsUid" TEXT,
    "syncLabel" TEXT,
    "allDay" BOOLEAN,
    "data" TEXT NOT NULL,
    "syncProvider" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    PRIMARY KEY ("userId", "id"),
    CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_holdings" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "symbol" TEXT,
    "type" TEXT,
    "units" REAL,
    "buyPrice" REAL,
    "currentPrice" REAL,
    "buyDate" TEXT,
    "date" TEXT,
    "priceDate" TEXT,
    "currentPriceDate" TEXT,
    "snapshotDate" TEXT,
    "asOf" TEXT,
    "asOfDate" TEXT,
    "recordedAt" TEXT,
    "capturedAt" TEXT,
    "timestamp" TEXT,
    "priceUpdatedAt" TEXT,
    "currency" TEXT,
    "baseCurrency" TEXT,
    "priceCurrency" TEXT,
    "buyCurrency" TEXT,
    "purchaseCurrency" TEXT,
    "valuationCurrency" TEXT,
    "schemeCode" TEXT,
    "coingeckoId" TEXT,
    "data" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    PRIMARY KEY ("userId", "id"),
    CONSTRAINT "portfolio_holdings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "record_mutations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "mutationId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "record_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "record_changes" (
    "sequence" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "record_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "color" TEXT,
    "tags" TEXT,
    "source" TEXT,
    "date" TEXT,
    "time" TEXT,
    "text" TEXT,
    "prompt" TEXT,
    "journalVersion" INTEGER,
    "wordCount" INTEGER,
    "legacyImportId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    CONSTRAINT "NoteRevision_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteMutation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mutationId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteMutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteChange" (
    "sequence" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "targetDate" TEXT,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT,
    "priority" TEXT,
    "target_value" REAL,
    "current_value" REAL,
    "unit" TEXT,
    "is_focus" BOOLEAN,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "hours" REAL,
    "quality" TEXT,
    "bed_time" TEXT,
    "wake_time" TEXT,
    "notes" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SleepLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "sha256" TEXT,
    "previewKind" TEXT,
    "encryptionFormat" TEXT,
    "encryptionKeyId" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "emoji" TEXT,
    "icon" TEXT,
    "category" TEXT,
    "target_days" INTEGER,
    "order_index" INTEGER,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "date" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "cost" REAL,
    "costMinor" INTEGER,
    "active" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT,
    "next_date" TEXT,
    "icon" TEXT,
    "auto_renew" INTEGER,
    "cycle" TEXT,
    "cancelled_date" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoodLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "mood" TEXT,
    "energy" REAL,
    "note" TEXT,
    "tags" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VitalsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "vital" TEXT,
    "value" REAL,
    "unit" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VitalsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskSubtask" (
    "taskId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("taskId", "id"),
    CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalSubtask" (
    "goalId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("goalId", "id"),
    CONSTRAINT "GoalSubtask_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingPrice" (
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "price" REAL NOT NULL,

    PRIMARY KEY ("itemId", "position"),
    CONSTRAINT "ShoppingPrice_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShoppingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalProgressLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "value" REAL,
    "note" TEXT,
    "date" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalProgressLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalProgressLog_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT,
    "table_name" TEXT,
    "item_id" TEXT,
    "details" TEXT,
    "actor_name" TEXT DEFAULT 'System',
    "actor_email" TEXT DEFAULT 'admin@growthtrack.ultimate',
    "actor_ip" TEXT,
    "category" TEXT DEFAULT 'system',
    "user_id" TEXT,
    "user_agent" TEXT,
    "severity" TEXT DEFAULT 'info',
    "source" TEXT DEFAULT 'ultimate-api',
    "request_id" TEXT,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "email" TEXT,
    "action" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "failure_reason" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT DEFAULT 'ultimate-api',
    "request_id" TEXT,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "session_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT DEFAULT 'ultimate-api',
    "request_id" TEXT,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "streak" INTEGER,
    "longestStreak" INTEGER,
    "lastCompletedDate" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "training_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_days" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "day" TEXT,
    "muscleGroup" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "training_days_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "training_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "planned_exercises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "name" TEXT,
    "sets" INTEGER,
    "reps" INTEGER,
    "weight" REAL,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "planned_exercises_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "training_days" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_pr_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "date" TEXT,
    "lift" TEXT,
    "weight" REAL,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "training_pr_history_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "training_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_personal_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "value" REAL,
    "stringValue" TEXT,
    "booleanValue" BOOLEAN,
    "unit" TEXT,
    CONSTRAINT "training_personal_records_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "training_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nutrition_strategies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "calories" REAL,
    "protein_g" REAL,
    "carbs_g" REAL,
    "fat_g" REAL,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "nutrition_strategies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "planned_meals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "name" TEXT,
    "time" TEXT,
    "icon" TEXT,
    "items" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "planned_meals_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nutrition_strategies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "medical_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "medical_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "required_medical_tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "name" TEXT,
    "priority" TEXT,
    "frequency" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "required_medical_tests_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "medical_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "physique_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "physique_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "physique_targets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "label" TEXT,
    "metric" TEXT,
    "key" TEXT,
    "currentValueType" TEXT,
    "currentValue" REAL,
    "currentStringValue" TEXT,
    "currentBooleanValue" BOOLEAN,
    "targetValueType" TEXT,
    "targetValue" REAL,
    "targetStringValue" TEXT,
    "targetBooleanValue" BOOLEAN,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "physique_targets_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "physique_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "physique_milestones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "label" TEXT,
    "targetDate" TEXT,
    "month" TEXT,
    "achieved" BOOLEAN,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "physique_milestones_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "physique_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "physique_zones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientIdType" TEXT,
    "clientCreatedAt" TEXT,
    "clientUpdatedAt" TEXT,
    "name" TEXT,
    "status" TEXT,
    "icon" TEXT,
    "present" TEXT NOT NULL DEFAULT '[]',
    "data" TEXT,
    CONSTRAINT "physique_zones_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "physique_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "physique_plan_measurements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "value" REAL,
    "stringValue" TEXT,
    "booleanValue" BOOLEAN,
    "unit" TEXT,
    CONSTRAINT "physique_plan_measurements_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "physique_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "user_skills_userId_category_idx" ON "user_skills"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_userId_position_key" ON "user_skills"("userId", "position");

-- CreateIndex
CREATE INDEX "manual_projects_userId_status_idx" ON "manual_projects"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "manual_projects_userId_position_key" ON "manual_projects"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "repository_notes_userId_repositoryId_key" ON "repository_notes"("userId", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_rounds_userId_position_key" ON "assessment_rounds"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answers_roundId_position_key" ON "assessment_answers"("roundId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_expiresAt_idx" ON "auth_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_profiles_userId_key" ON "owner_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_profiles_userId_provider_key" ON "social_profiles"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "body_profiles_userId_key" ON "body_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_userId_provider_key" ON "integration_credentials"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_providers_providerKey_key" ON "integration_providers"("providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "help_articles_slug_key" ON "help_articles"("slug");

-- CreateIndex
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_userId_status_due_date_idx" ON "Task"("userId", "status", "due_date");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Budget_userId_month_idx" ON "Budget"("userId", "month");

-- CreateIndex
CREATE INDEX "MetricLog_userId_metric_measuredAt_idx" ON "MetricLog"("userId", "metric", "measuredAt");

-- CreateIndex
CREATE INDEX "MetricLog_userId_date_idx" ON "MetricLog"("userId", "date");

-- CreateIndex
CREATE INDEX "MetricMeasurement_key_value_idx" ON "MetricMeasurement"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "MetricMeasurement_metricLogId_container_key_key" ON "MetricMeasurement"("metricLogId", "container", "key");

-- CreateIndex
CREATE UNIQUE INDEX "health_profiles_userId_key" ON "health_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthSense_profileId_key_key" ON "HealthSense"("profileId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "HealthSpecialized_profileId_position_key" ON "HealthSpecialized"("profileId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecoveryMetric_profileId_position_key" ON "HealthRecoveryMetric"("profileId", "position");

-- CreateIndex
CREATE INDEX "location_points_userId_capturedAt_idx" ON "location_points"("userId", "capturedAt");

-- CreateIndex
CREATE INDEX "NutritionLog_userId_date_idx" ON "NutritionLog"("userId", "date");

-- CreateIndex
CREATE INDEX "ShoppingItem_userId_stage_purchased_idx" ON "ShoppingItem"("userId", "stage", "purchased");

-- CreateIndex
CREATE INDEX "TimesheetSession_userId_date_idx" ON "TimesheetSession"("userId", "date");

-- CreateIndex
CREATE INDEX "EntertainmentMedia_userId_status_type_idx" ON "EntertainmentMedia"("userId", "status", "type");

-- CreateIndex
CREATE INDEX "Note_userId_kind_deletedAt_id_idx" ON "Note"("userId", "kind", "deletedAt", "id");

-- CreateIndex
CREATE INDEX "calendar_events_userId_deletedAt_idx" ON "calendar_events"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "calendar_events_userId_syncProvider_idx" ON "calendar_events"("userId", "syncProvider");

-- CreateIndex
CREATE INDEX "portfolio_holdings_userId_deletedAt_position_idx" ON "portfolio_holdings"("userId", "deletedAt", "position");

-- CreateIndex
CREATE UNIQUE INDEX "record_mutations_userId_collection_mutationId_key" ON "record_mutations"("userId", "collection", "mutationId");

-- CreateIndex
CREATE INDEX "record_changes_userId_collection_sequence_idx" ON "record_changes"("userId", "collection", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "NoteRevision_noteId_revision_key" ON "NoteRevision"("noteId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "NoteMutation_userId_mutationId_key" ON "NoteMutation"("userId", "mutationId");

-- CreateIndex
CREATE INDEX "NoteChange_userId_sequence_idx" ON "NoteChange"("userId", "sequence");

-- CreateIndex
CREATE INDEX "Goal_userId_status_targetDate_idx" ON "Goal"("userId", "status", "targetDate");

-- CreateIndex
CREATE INDEX "SleepLog_userId_date_idx" ON "SleepLog"("userId", "date");

-- CreateIndex
CREATE INDEX "SubscriptionItem_userId_active_next_date_idx" ON "SubscriptionItem"("userId", "active", "next_date");

-- CreateIndex
CREATE INDEX "MoodLog_userId_date_idx" ON "MoodLog"("userId", "date");

-- CreateIndex
CREATE INDEX "VitalsLog_userId_date_vital_idx" ON "VitalsLog"("userId", "date", "vital");

-- CreateIndex
CREATE INDEX "TaskSubtask_taskId_position_idx" ON "TaskSubtask"("taskId", "position");

-- CreateIndex
CREATE INDEX "GoalSubtask_goalId_position_idx" ON "GoalSubtask"("goalId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "training_plans_userId_key" ON "training_plans"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "training_days_parentId_position_key" ON "training_days"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "planned_exercises_parentId_position_key" ON "planned_exercises"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "training_pr_history_parentId_position_key" ON "training_pr_history"("parentId", "position");

-- CreateIndex
CREATE INDEX "training_personal_records_scope_key_value_idx" ON "training_personal_records"("scope", "key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "training_personal_records_parentId_scope_key_key" ON "training_personal_records"("parentId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_strategies_userId_key" ON "nutrition_strategies"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "planned_meals_parentId_position_key" ON "planned_meals"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "medical_plans_userId_key" ON "medical_plans"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "required_medical_tests_parentId_position_key" ON "required_medical_tests"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "physique_plans_userId_key" ON "physique_plans"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "physique_targets_parentId_position_key" ON "physique_targets"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "physique_milestones_parentId_position_key" ON "physique_milestones"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "physique_zones_parentId_position_key" ON "physique_zones"("parentId", "position");

-- CreateIndex
CREATE INDEX "physique_plan_measurements_scope_key_value_idx" ON "physique_plan_measurements"("scope", "key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "physique_plan_measurements_parentId_scope_key_key" ON "physique_plan_measurements"("parentId", "scope", "key");

-- Exact minor-unit mirrors; reject unsupported precision rather than silently round.
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
CREATE TRIGGER goal_progress_owner_insert BEFORE INSERT ON "GoalProgressLog"
 WHEN NOT EXISTS (SELECT 1 FROM "Goal" WHERE id=NEW.goalId AND userId=NEW.userId)
 BEGIN SELECT RAISE(ABORT, 'Goal owner mismatch'); END;
CREATE TRIGGER goal_progress_owner_update BEFORE UPDATE OF goalId, userId ON "GoalProgressLog"
 WHEN NOT EXISTS (SELECT 1 FROM "Goal" WHERE id=NEW.goalId AND userId=NEW.userId)
 BEGIN SELECT RAISE(ABORT, 'Goal owner mismatch'); END;
CREATE TRIGGER goal_owner_update BEFORE UPDATE OF userId ON "Goal"
 WHEN EXISTS (SELECT 1 FROM "GoalProgressLog" WHERE goalId=NEW.id AND userId<>NEW.userId)
 BEGIN SELECT RAISE(ABORT, 'Goal progress owner mismatch'); END;
