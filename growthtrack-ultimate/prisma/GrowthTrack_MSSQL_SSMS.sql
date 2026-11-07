-- GrowthTrack local SSMS / SQL Server 2017+ bootstrap: 73 application tables.
-- No DROP/TRUNCATE or replacement of existing tables. Repeat runs verify the model hash.
-- SSMS users execute this T-SQL; no Prisma CLI required. It does not copy SQLite data.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_ID(N'GrowthTrackDB') IS NULL EXEC(N'CREATE DATABASE [GrowthTrackDB]');
GO
USE [GrowthTrackDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.__GrowthTrackSchema',N'U') IS NOT NULL
BEGIN
 IF NOT EXISTS (SELECT 1 FROM dbo.__GrowthTrackSchema WHERE id=1 AND modelHash=N'dcfbdf9affc2d330bbbb47edfaf571ec75a62149b6f1464d4f694a761127f70f')
 BEGIN THROW 51000, 'Schema differs; apply a reviewed migration. No bootstrap changes applied.', 1; END;
 PRINT 'Matching schema already exists; no changes applied.';
END
ELSE
BEGIN
 IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped=0)
 BEGIN THROW 51000, 'Existing tables have no matching bootstrap marker. No changes applied.', 1; END;
 BEGIN TRY
 BEGIN TRANSACTION;
 BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(200) NOT NULL,
    [email] NVARCHAR(200) NOT NULL,
    [passwordHash] NVARCHAR(max) NOT NULL,
    [fullName] NVARCHAR(max) NOT NULL,
    [subscriptionTier] NVARCHAR(max) CONSTRAINT [User_subscriptionTier_df] DEFAULT 'free',
    [stripeCustomerId] NVARCHAR(200),
    [subscriptionStatus] NVARCHAR(max),
    [referralCode] NVARCHAR(200) NOT NULL,
    [creditBalance] INT NOT NULL CONSTRAINT [User_creditBalance_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [User_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [trainingPlan] NVARCHAR(max),
    [nutritionStrategy] NVARCHAR(max),
    [lifestyleTips] NVARCHAR(max),
    [medicalData] NVARCHAR(max),
    [physiqueTargets] NVARCHAR(max),
    [assessmentQA] NVARCHAR(max),
    [skills] NVARCHAR(max),
    [calendarEvents] NVARCHAR(max),
    [wellnessData] NVARCHAR(max),
    [healthExtras] NVARCHAR(max),
    [manualProjects] NVARCHAR(max),
    [repoNotes] NVARCHAR(max),
    [portfolio] NVARCHAR(max),
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_referralCode_key] UNIQUE NONCLUSTERED ([referralCode])
);

-- CreateTable
CREATE TABLE [dbo].[user_skills] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [name] NVARCHAR(max),
    [category] NVARCHAR(200),
    [xp] FLOAT(53),
    [description] NVARCHAR(max),
    [weeklyTarget] FLOAT(53),
    [resource] NVARCHAR(max),
    [nextAction] NVARCHAR(max),
    [lastPracticed] NVARCHAR(max),
    [practiceCount] INT,
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [user_skills_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [user_skills_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [user_skills_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_skills_userId_position_key] UNIQUE NONCLUSTERED ([userId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[manual_projects] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [title] NVARCHAR(max),
    [description] NVARCHAR(max),
    [stack] NVARCHAR(max),
    [status] NVARCHAR(200),
    [url] NVARCHAR(max),
    [startDate] NVARCHAR(max),
    [endDate] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [manual_projects_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [manual_projects_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [manual_projects_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [manual_projects_userId_position_key] UNIQUE NONCLUSTERED ([userId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[repository_notes] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [repositoryId] NVARCHAR(200) NOT NULL,
    [note] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [repository_notes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [repository_notes_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [repository_notes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [repository_notes_userId_repositoryId_key] UNIQUE NONCLUSTERED ([userId],[repositoryId])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_rounds] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [round] NVARCHAR(max),
    [color] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [assessment_rounds_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [assessment_rounds_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [assessment_rounds_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessment_rounds_userId_position_key] UNIQUE NONCLUSTERED ([userId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_answers] (
    [id] NVARCHAR(200) NOT NULL,
    [roundId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [questionKey] NVARCHAR(max),
    [question] NVARCHAR(max),
    [answer] NVARCHAR(max),
    [data] NVARCHAR(max),
    CONSTRAINT [assessment_answers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessment_answers_roundId_position_key] UNIQUE NONCLUSTERED ([roundId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[auth_sessions] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [tokenHash] NVARCHAR(200) NOT NULL,
    [csrfHash] NVARCHAR(max) NOT NULL,
    [ipAddress] NVARCHAR(max),
    [userAgent] NVARCHAR(max),
    [expiresAt] DATETIME2 NOT NULL,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [auth_sessions_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [auth_sessions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [auth_sessions_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [auth_sessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [auth_sessions_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[user_preferences] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [theme] NVARCHAR(max) NOT NULL CONSTRAINT [user_preferences_theme_df] DEFAULT 'dark',
    [palette] NVARCHAR(max) NOT NULL CONSTRAINT [user_preferences_palette_df] DEFAULT 'gold',
    [sidebarCollapsed] BIT NOT NULL CONSTRAINT [user_preferences_sidebarCollapsed_df] DEFAULT 0,
    [onboardingComplete] BIT NOT NULL CONSTRAINT [user_preferences_onboardingComplete_df] DEFAULT 0,
    [navigationOrder] NVARCHAR(max),
    [navigationTabOrder] NVARCHAR(max),
    [reducedMotion] BIT NOT NULL CONSTRAINT [user_preferences_reducedMotion_df] DEFAULT 0,
    [density] NVARCHAR(max) NOT NULL CONSTRAINT [user_preferences_density_df] DEFAULT 'comfortable',
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [user_preferences_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [user_preferences_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_preferences_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_preferences_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[owner_profiles] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [avatar] NVARCHAR(max),
    [phone] NVARCHAR(max),
    [bio] NVARCHAR(max),
    [dateOfBirth] NVARCHAR(max),
    [gender] NVARCHAR(max),
    [bloodType] NVARCHAR(max),
    [locationName] NVARCHAR(max),
    [country] NVARCHAR(max),
    [state] NVARCHAR(max),
    [city] NVARCHAR(max),
    [nationality] NVARCHAR(max),
    [language] NVARCHAR(max),
    [timezone] NVARCHAR(max),
    [occupation] NVARCHAR(max),
    [education] NVARCHAR(max),
    [maritalStatus] NVARCHAR(max),
    [incomeBracket] FLOAT(53),
    [livingSituation] NVARCHAR(max),
    [dietaryPreference] NVARCHAR(max),
    [emergencyContactName] NVARCHAR(max),
    [emergencyContactPhone] NVARCHAR(max),
    [medicalConditions] NVARCHAR(max),
    [allergies] NVARCHAR(max),
    [restingHeartRate] FLOAT(53),
    [activityLevel] NVARCHAR(max),
    [maintenanceCalories] FLOAT(53),
    [trainingStyle] NVARCHAR(max),
    [baseCurrency] NVARCHAR(max),
    [isdCode] NVARCHAR(max),
    [netWorth] FLOAT(53),
    [primaryBank] NVARCHAR(max),
    [passportNationality] NVARCHAR(max),
    [dateFormat] NVARCHAR(max),
    [numberFormat] NVARCHAR(max),
    [measurementSystem] NVARCHAR(max),
    [textDirection] NVARCHAR(max),
    [motherLanguage] NVARCHAR(max),
    [motherLanguageProficiency] NVARCHAR(max),
    [privacyLevel] NVARCHAR(max) NOT NULL CONSTRAINT [owner_profiles_privacyLevel_df] DEFAULT 'Private',
    [emailNotifications] BIT NOT NULL CONSTRAINT [owner_profiles_emailNotifications_df] DEFAULT 0,
    [smsNotifications] BIT NOT NULL CONSTRAINT [owner_profiles_smsNotifications_df] DEFAULT 0,
    [notifications] BIT NOT NULL CONSTRAINT [owner_profiles_notifications_df] DEFAULT 1,
    [primaryGoal] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [owner_profiles_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [owner_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [owner_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [owner_profiles_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[social_profiles] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [provider] NVARCHAR(200) NOT NULL,
    [profileUrl] NVARCHAR(max),
    [followers] INT NOT NULL CONSTRAINT [social_profiles_followers_df] DEFAULT 0,
    [avgLikes] INT NOT NULL CONSTRAINT [social_profiles_avgLikes_df] DEFAULT 0,
    [avgViews] INT NOT NULL CONSTRAINT [social_profiles_avgViews_df] DEFAULT 0,
    [enabled] BIT NOT NULL CONSTRAINT [social_profiles_enabled_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [social_profiles_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [social_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [social_profiles_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [social_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [social_profiles_userId_provider_key] UNIQUE NONCLUSTERED ([userId],[provider])
);

-- CreateTable
CREATE TABLE [dbo].[body_profiles] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [heightCm] FLOAT(53),
    [weightKg] FLOAT(53),
    [bodyFatPct] FLOAT(53),
    [leanMassKg] FLOAT(53),
    [skeletalMuscleKg] FLOAT(53),
    [bodyWaterPct] FLOAT(53),
    [boneMassKg] FLOAT(53),
    [visceralFatLevel] FLOAT(53),
    [chestCm] FLOAT(53),
    [waistCm] FLOAT(53),
    [shouldersCm] FLOAT(53),
    [armsCm] FLOAT(53),
    [forearmsCm] FLOAT(53),
    [hipsCm] FLOAT(53),
    [thighsCm] FLOAT(53),
    [calvesCm] FLOAT(53),
    [neckCm] FLOAT(53),
    [glutesCm] FLOAT(53),
    [ankleCm] FLOAT(53),
    [wristCm] FLOAT(53),
    [elbowCm] FLOAT(53),
    [underbustCm] FLOAT(53),
    [highHipCm] FLOAT(53),
    [chestDepthCm] FLOAT(53),
    [shoulderBreadthCm] FLOAT(53),
    [bideltoidBreadthCm] FLOAT(53),
    [pelvicBreadthCm] FLOAT(53),
    [torsoLengthCm] FLOAT(53),
    [sittingHeightCm] FLOAT(53),
    [upperArmCm] FLOAT(53),
    [lowerArmCm] FLOAT(53),
    [handLengthCm] FLOAT(53),
    [legLengthCm] FLOAT(53),
    [upperLegLengthCm] FLOAT(53),
    [lowerLegLengthCm] FLOAT(53),
    [inseamCm] FLOAT(53),
    [neckLengthCm] FLOAT(53),
    [footLengthCm] FLOAT(53),
    [headCircCm] FLOAT(53),
    [leftShoulderCm] FLOAT(53),
    [rightShoulderCm] FLOAT(53),
    [leftUpperArmCircumferenceCm] FLOAT(53),
    [rightUpperArmCircumferenceCm] FLOAT(53),
    [leftForearmCm] FLOAT(53),
    [rightForearmCm] FLOAT(53),
    [leftWristCm] FLOAT(53),
    [rightWristCm] FLOAT(53),
    [leftThighCm] FLOAT(53),
    [rightThighCm] FLOAT(53),
    [leftCalfCm] FLOAT(53),
    [rightCalfCm] FLOAT(53),
    [leftHipCm] FLOAT(53),
    [rightHipCm] FLOAT(53),
    [headTiltAngle] FLOAT(53),
    [pelvicTilt] FLOAT(53),
    [shoulderRounding] FLOAT(53),
    [shoulderTiltDeg] FLOAT(53),
    [spineCurvatureDeg] FLOAT(53),
    [hipRotationDeg] FLOAT(53),
    [kneeAlignmentDeg] FLOAT(53),
    [leftKneeAngleDeg] FLOAT(53),
    [rightKneeAngleDeg] FLOAT(53),
    [leftFootRotationDeg] FLOAT(53),
    [rightFootRotationDeg] FLOAT(53),
    [faceWidthCm] FLOAT(53),
    [faceHeightCm] FLOAT(53),
    [eyeSpacingCm] FLOAT(53),
    [earLengthCm] FLOAT(53),
    [earWidthCm] FLOAT(53),
    [noseLengthCm] FLOAT(53),
    [noseWidthCm] FLOAT(53),
    [browDepth] FLOAT(53),
    [noseBridgeWidth] FLOAT(53),
    [noseTipSize] FLOAT(53),
    [earProminence] FLOAT(53),
    [jawWidth] FLOAT(53),
    [chinProjection] FLOAT(53),
    [lipFullness] FLOAT(53),
    [eyeSize] FLOAT(53),
    [targetWeightKg] FLOAT(53),
    [targetBodyFatPct] FLOAT(53),
    [targetLeanMassKg] FLOAT(53),
    [targetSkeletalMuscleKg] FLOAT(53),
    [targetChestCm] FLOAT(53),
    [targetWaistCm] FLOAT(53),
    [targetShouldersCm] FLOAT(53),
    [targetArmsCm] FLOAT(53),
    [targetThighsCm] FLOAT(53),
    [targetHipsCm] FLOAT(53),
    [targetGlutesCm] FLOAT(53),
    [targetCalvesCm] FLOAT(53),
    [biologicalSex] NVARCHAR(max),
    [modelPreset] NVARCHAR(max),
    [skinTone] NVARCHAR(max),
    [skinFitzpatrickIndex] INT,
    [skinUndertone] NVARCHAR(max),
    [skinColorHex] NVARCHAR(max),
    [skinTextureVariant] NVARCHAR(max),
    [skinFreckleDensity] FLOAT(53),
    [skinFeatureMap] NVARCHAR(max),
    [hairStyle] NVARCHAR(max),
    [hairColorHex] NVARCHAR(max),
    [hairTexture] NVARCHAR(max),
    [hairlineStyle] NVARCHAR(max),
    [hairPart] NVARCHAR(max),
    [hairDensity] FLOAT(53),
    [hairLengthCm] FLOAT(53),
    [facialHairStyle] NVARCHAR(max),
    [facialHairColorHex] NVARCHAR(max),
    [facialHairDensity] FLOAT(53),
    [eyebrowStyle] NVARCHAR(max),
    [eyebrowColorHex] NVARCHAR(max),
    [eyeColorHex] NVARCHAR(max),
    [eyePattern] NVARCHAR(max),
    [eyelidShape] NVARCHAR(max),
    [eyelashStyle] NVARCHAR(max),
    [scleraColorHex] NVARCHAR(max),
    [irisLimbalRing] BIT,
    [lipColorHex] NVARCHAR(max),
    [bodyHairPattern] NVARCHAR(max),
    [bodyHairColorHex] NVARCHAR(max),
    [bodyHairTexture] NVARCHAR(max),
    [bodyHairDensity] FLOAT(53),
    [nailColorHex] NVARCHAR(max),
    [nailShape] NVARCHAR(max),
    [nailLengthMm] FLOAT(53),
    [avatarAsset] NVARCHAR(max),
    [tattooAsset] NVARCHAR(max),
    [anatomyPreset] NVARCHAR(max),
    [anatomyVisibility] NVARCHAR(max),
    [anatomyRevealConsent] BIT NOT NULL CONSTRAINT [body_profiles_anatomyRevealConsent_df] DEFAULT 0,
    [morphOverrides] NVARCHAR(max) NOT NULL CONSTRAINT [body_profiles_morphOverrides_df] DEFAULT '{}',
    [facialMorphs] NVARCHAR(max),
    [bodyProportions] NVARCHAR(max),
    [skinTones] NVARCHAR(max),
    [skinDetails] NVARCHAR(max),
    [hairProperties] NVARCHAR(max),
    [eyeProperties] NVARCHAR(max),
    [skinShadeHeadHex] NVARCHAR(max),
    [skinShadeNeckHex] NVARCHAR(max),
    [skinShadeTorsoHex] NVARCHAR(max),
    [skinShadeAbsHex] NVARCHAR(max),
    [skinShadeArmsHex] NVARCHAR(max),
    [skinShadeLegsHex] NVARCHAR(max),
    [skinShadeGenitalsHex] NVARCHAR(max),
    [skinShadeHandsHex] NVARCHAR(max),
    [skinShadeFeetHex] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [body_profiles_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [body_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [body_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [body_profiles_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[integration_credentials] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [provider] NVARCHAR(200) NOT NULL,
    [accountName] NVARCHAR(max),
    [clientIdCiphertext] NVARCHAR(max),
    [accessTokenCiphertext] NVARCHAR(max),
    [refreshTokenCiphertext] NVARCHAR(max),
    [tokenExpiresAt] DATETIME2,
    [enabled] BIT NOT NULL CONSTRAINT [integration_credentials_enabled_df] DEFAULT 1,
    [lastSyncAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [integration_credentials_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [integration_credentials_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [integration_credentials_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [integration_credentials_userId_provider_key] UNIQUE NONCLUSTERED ([userId],[provider])
);

-- CreateTable
CREATE TABLE [dbo].[app_settings] (
    [id] NVARCHAR(200) NOT NULL,
    [key] NVARCHAR(200) NOT NULL,
    [value] NVARCHAR(max) NOT NULL,
    [valueType] NVARCHAR(max) NOT NULL CONSTRAINT [app_settings_valueType_df] DEFAULT 'string',
    [category] NVARCHAR(max) NOT NULL CONSTRAINT [app_settings_category_df] DEFAULT 'application',
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [app_settings_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [app_settings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [app_settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [app_settings_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[integration_providers] (
    [id] NVARCHAR(200) NOT NULL,
    [providerKey] NVARCHAR(200) NOT NULL,
    [displayName] NVARCHAR(max) NOT NULL,
    [category] NVARCHAR(max) NOT NULL,
    [authType] NVARCHAR(max) NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [integration_providers_enabled_df] DEFAULT 0,
    [icon] NVARCHAR(max),
    [documentationUrl] NVARCHAR(max),
    [sortOrder] INT NOT NULL CONSTRAINT [integration_providers_sortOrder_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [integration_providers_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [integration_providers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [integration_providers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [integration_providers_providerKey_key] UNIQUE NONCLUSTERED ([providerKey])
);

-- CreateTable
CREATE TABLE [dbo].[help_articles] (
    [id] NVARCHAR(200) NOT NULL,
    [slug] NVARCHAR(200) NOT NULL,
    [section] NVARCHAR(max) NOT NULL,
    [title] NVARCHAR(max) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [help_articles_sortOrder_df] DEFAULT 0,
    [enabled] BIT NOT NULL CONSTRAINT [help_articles_enabled_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [help_articles_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [help_articles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [help_articles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [help_articles_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[plan_templates] (
    [id] NVARCHAR(200) NOT NULL,
    [planType] NVARCHAR(max) NOT NULL,
    [name] NVARCHAR(max) NOT NULL,
    [description] NVARCHAR(max),
    [durationWeeks] INT,
    [active] BIT NOT NULL CONSTRAINT [plan_templates_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [plan_templates_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [plan_templates_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [plan_templates_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [plan_templates_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Referral] (
    [id] NVARCHAR(200) NOT NULL,
    [referrerId] NVARCHAR(200) NOT NULL,
    [referredId] NVARCHAR(200) NOT NULL,
    [status] NVARCHAR(max) NOT NULL CONSTRAINT [Referral_status_df] DEFAULT 'pending',
    [creditAmount] INT NOT NULL CONSTRAINT [Referral_creditAmount_df] DEFAULT 10,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Referral_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Referral_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Referral_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Task] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [title] NVARCHAR(max),
    [status] NVARCHAR(200),
    [due_date] NVARCHAR(200),
    [priority] NVARCHAR(max),
    [project] NVARCHAR(max),
    [section] NVARCHAR(max),
    [tags] NVARCHAR(max),
    [done] BIT NOT NULL CONSTRAINT [Task_done_df] DEFAULT 0,
    [completedAt] NVARCHAR(max),
    [description] NVARCHAR(max),
    [category] NVARCHAR(max),
    [reminderAt] NVARCHAR(max),
    [recurrence] NVARCHAR(max),
    [parent_task_id] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Task_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Task_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Task_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Transaction] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [amount] FLOAT(53),
    [amountMinor] BIGINT,
    [type] NVARCHAR(max),
    [category] NVARCHAR(max),
    [method] NVARCHAR(max),
    [date] NVARCHAR(200),
    [note] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Transaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Transaction_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Transaction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Budget] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [category] NVARCHAR(max),
    [limit_amount] FLOAT(53),
    [limitMinor] BIGINT,
    [month] NVARCHAR(200),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Budget_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Budget_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Budget_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MetricLog] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(200),
    [metric] NVARCHAR(200),
    [value] FLOAT(53),
    [unit] NVARCHAR(max),
    [side] NVARCHAR(max),
    [phase] NVARCHAR(max) CONSTRAINT [MetricLog_phase_df] DEFAULT 'current',
    [confidence] FLOAT(53),
    [measuredAt] DATETIME2,
    [source] NVARCHAR(max) CONSTRAINT [MetricLog_source_df] DEFAULT 'manual',
    [type] NVARCHAR(max),
    [exercise] NVARCHAR(max),
    [weight] FLOAT(53),
    [reps] INT,
    [sets] INT,
    [notes] NVARCHAR(max),
    [photoUrl] NVARCHAR(max),
    [label] NVARCHAR(max),
    [data] NVARCHAR(max),
    [stringValue] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MetricLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [MetricLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MetricLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MetricMeasurement] (
    [id] NVARCHAR(200) NOT NULL,
    [metricLogId] NVARCHAR(200) NOT NULL,
    [container] NVARCHAR(200) NOT NULL,
    [key] NVARCHAR(200) NOT NULL,
    [valueType] NVARCHAR(max) NOT NULL,
    [value] FLOAT(53),
    [stringValue] NVARCHAR(max),
    [booleanValue] BIT,
    [unit] NVARCHAR(max),
    CONSTRAINT [MetricMeasurement_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MetricMeasurement_metricLogId_container_key_key] UNIQUE NONCLUSTERED ([metricLogId],[container],[key])
);

-- CreateTable
CREATE TABLE [dbo].[health_profiles] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [posture] NVARCHAR(max),
    [broncoTest] NVARCHAR(max),
    [diets] NVARCHAR(max),
    [hobbies] NVARCHAR(max),
    [data] NVARCHAR(max) NOT NULL CONSTRAINT [health_profiles_data_df] DEFAULT '{}',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [health_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [health_profiles_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [health_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [health_profiles_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[HealthSense] (
    [id] NVARCHAR(200) NOT NULL,
    [profileId] NVARCHAR(200) NOT NULL,
    [key] NVARCHAR(200) NOT NULL,
    [level] FLOAT(53),
    [note] NVARCHAR(max),
    [currentPower] NVARCHAR(max),
    [targetPower] NVARCHAR(max),
    [path] NVARCHAR(max),
    [color] NVARCHAR(max),
    [exercises] NVARCHAR(max),
    [data] NVARCHAR(max),
    CONSTRAINT [HealthSense_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [HealthSense_profileId_key_key] UNIQUE NONCLUSTERED ([profileId],[key])
);

-- CreateTable
CREATE TABLE [dbo].[HealthSpecialized] (
    [id] NVARCHAR(200) NOT NULL,
    [profileId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [name] NVARCHAR(max),
    [score] FLOAT(53),
    [color] NVARCHAR(max),
    [data] NVARCHAR(max),
    CONSTRAINT [HealthSpecialized_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [HealthSpecialized_profileId_position_key] UNIQUE NONCLUSTERED ([profileId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[HealthRecoveryMetric] (
    [id] NVARCHAR(200) NOT NULL,
    [profileId] NVARCHAR(200) NOT NULL,
    [clientId] NVARCHAR(200),
    [position] INT NOT NULL,
    [name] NVARCHAR(max),
    [valueType] NVARCHAR(max),
    [value] FLOAT(53),
    [stringValue] NVARCHAR(max),
    [booleanValue] BIT,
    [status] NVARCHAR(max),
    [data] NVARCHAR(max),
    CONSTRAINT [HealthRecoveryMetric_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [HealthRecoveryMetric_profileId_position_key] UNIQUE NONCLUSTERED ([profileId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[location_points] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [latitude] FLOAT(53) NOT NULL,
    [longitude] FLOAT(53) NOT NULL,
    [accuracyM] FLOAT(53),
    [source] NVARCHAR(max) NOT NULL CONSTRAINT [location_points_source_df] DEFAULT 'browser',
    [capturedAt] DATETIME2 NOT NULL CONSTRAINT [location_points_capturedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [location_points_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [location_points_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [location_points_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[custom_tables] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [name] NVARCHAR(max) NOT NULL,
    [schema] NVARCHAR(max) NOT NULL CONSTRAINT [custom_tables_schema_df] DEFAULT '[]',
    [rows] NVARCHAR(max) NOT NULL CONSTRAINT [custom_tables_rows_df] DEFAULT '[]',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [custom_tables_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [custom_tables_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [custom_tables_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NutritionLog] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [logged_at] NVARCHAR(max),
    [date] NVARCHAR(200),
    [name] NVARCHAR(max),
    [meal] NVARCHAR(max),
    [calories] FLOAT(53),
    [protein_g] FLOAT(53),
    [carbs_g] FLOAT(53),
    [fat_g] FLOAT(53),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NutritionLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [NutritionLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NutritionLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkoutSession] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(max),
    [notes] NVARCHAR(max),
    [duration_minutes] INT,
    [volume] FLOAT(53),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WorkoutSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [WorkoutSession_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkoutSession_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkoutExercise] (
    [id] NVARCHAR(200) NOT NULL,
    [sessionId] NVARCHAR(200) NOT NULL,
    [exercise_name] NVARCHAR(max),
    [sets] INT,
    [reps] INT,
    [weight_kg] FLOAT(53),
    [notes] NVARCHAR(max),
    [source] NVARCHAR(max),
    [metadataVersion] INT,
    [setId] NVARCHAR(200),
    [position] INT,
    [setNumber] INT,
    [completed] BIT,
    [payloadHash] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WorkoutExercise_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [WorkoutExercise_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkoutExercise_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ShoppingItem] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [name] NVARCHAR(max),
    [purchased] BIT NOT NULL CONSTRAINT [ShoppingItem_purchased_df] DEFAULT 0,
    [category] NVARCHAR(max),
    [priority] NVARCHAR(max),
    [quantity] INT,
    [estimatedCost] FLOAT(53),
    [targetPrice] FLOAT(53),
    [actualCost] FLOAT(53),
    [notes] NVARCHAR(max),
    [url] NVARCHAR(max),
    [stage] NVARCHAR(200),
    [deliverySpeed] NVARCHAR(max),
    [neededBy] NVARCHAR(max),
    [source] NVARCHAR(max),
    [orderedAt] NVARCHAR(max),
    [expectedDelivery] NVARCHAR(max),
    [importKey] NVARCHAR(max),
    [expenseId] NVARCHAR(200),
    [expenseDate] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ShoppingItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ShoppingItem_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ShoppingItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TimesheetSession] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(200),
    [duration] FLOAT(53),
    [project] NVARCHAR(max),
    [task] NVARCHAR(max),
    [seconds] INT,
    [billable] BIT,
    [earnings] FLOAT(53),
    [notes] NVARCHAR(max),
    [startTime] NVARCHAR(max),
    [endTime] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TimesheetSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [TimesheetSession_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TimesheetSession_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EntertainmentMedia] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [title] NVARCHAR(max),
    [progress] NVARCHAR(max),
    [type] NVARCHAR(200),
    [status] NVARCHAR(200),
    [season] INT,
    [episode] INT,
    [total_episodes] INT,
    [rating] FLOAT(53),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EntertainmentMedia_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [EntertainmentMedia_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EntertainmentMedia_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Note] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [title] NVARCHAR(max),
    [content] NVARCHAR(max),
    [color] NVARCHAR(max),
    [tags] NVARCHAR(max),
    [source] NVARCHAR(max),
    [date] NVARCHAR(max),
    [time] NVARCHAR(max),
    [text] NVARCHAR(max),
    [prompt] NVARCHAR(max),
    [journalVersion] INT,
    [wordCount] INT,
    [legacyImportId] NVARCHAR(200),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Note_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Note_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [kind] NVARCHAR(200) NOT NULL CONSTRAINT [Note_kind_df] DEFAULT 'workspace',
    [pinned] BIT NOT NULL CONSTRAINT [Note_pinned_df] DEFAULT 0,
    [starred] BIT NOT NULL CONSTRAINT [Note_starred_df] DEFAULT 0,
    [revision] INT NOT NULL CONSTRAINT [Note_revision_df] DEFAULT 1,
    [deletedAt] DATETIME2,
    CONSTRAINT [Note_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[calendar_events] (
    [userId] NVARCHAR(200) NOT NULL,
    [id] NVARCHAR(200) NOT NULL,
    [revision] INT NOT NULL CONSTRAINT [calendar_events_revision_df] DEFAULT 1,
    [title] NVARCHAR(max),
    [date] NVARCHAR(max),
    [endDate] NVARCHAR(max),
    [startTime] NVARCHAR(max),
    [endTime] NVARCHAR(max),
    [timeZone] NVARCHAR(max),
    [recurrence] NVARCHAR(max),
    [type] NVARCHAR(max),
    [description] NVARCHAR(max),
    [location] NVARCHAR(max),
    [color] NVARCHAR(max),
    [icsUid] NVARCHAR(max),
    [syncLabel] NVARCHAR(max),
    [allDay] BIT,
    [data] NVARCHAR(max) NOT NULL,
    [syncProvider] NVARCHAR(200),
    [deletedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [calendar_events_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [calendar_events_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [calendar_events_pkey] PRIMARY KEY CLUSTERED ([userId],[id])
);

-- CreateTable
CREATE TABLE [dbo].[portfolio_holdings] (
    [userId] NVARCHAR(200) NOT NULL,
    [id] NVARCHAR(200) NOT NULL,
    [revision] INT NOT NULL CONSTRAINT [portfolio_holdings_revision_df] DEFAULT 1,
    [position] INT NOT NULL CONSTRAINT [portfolio_holdings_position_df] DEFAULT 0,
    [name] NVARCHAR(max),
    [symbol] NVARCHAR(max),
    [type] NVARCHAR(max),
    [units] FLOAT(53),
    [buyPrice] FLOAT(53),
    [currentPrice] FLOAT(53),
    [buyDate] NVARCHAR(max),
    [date] NVARCHAR(max),
    [priceDate] NVARCHAR(max),
    [currentPriceDate] NVARCHAR(max),
    [snapshotDate] NVARCHAR(max),
    [asOf] NVARCHAR(max),
    [asOfDate] NVARCHAR(max),
    [recordedAt] NVARCHAR(max),
    [capturedAt] NVARCHAR(max),
    [timestamp] NVARCHAR(max),
    [priceUpdatedAt] NVARCHAR(max),
    [currency] NVARCHAR(max),
    [baseCurrency] NVARCHAR(max),
    [priceCurrency] NVARCHAR(max),
    [buyCurrency] NVARCHAR(max),
    [purchaseCurrency] NVARCHAR(max),
    [valuationCurrency] NVARCHAR(max),
    [schemeCode] NVARCHAR(max),
    [coingeckoId] NVARCHAR(200),
    [data] NVARCHAR(max) NOT NULL,
    [deletedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [portfolio_holdings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [portfolio_holdings_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [portfolio_holdings_pkey] PRIMARY KEY CLUSTERED ([userId],[id])
);

-- CreateTable
CREATE TABLE [dbo].[record_mutations] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [collection] NVARCHAR(200) NOT NULL,
    [mutationId] NVARCHAR(200) NOT NULL,
    [fingerprint] NVARCHAR(max) NOT NULL,
    [response] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [record_mutations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [record_mutations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [record_mutations_userId_collection_mutationId_key] UNIQUE NONCLUSTERED ([userId],[collection],[mutationId])
);

-- CreateTable
CREATE TABLE [dbo].[record_changes] (
    [sequence] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(200) NOT NULL,
    [collection] NVARCHAR(200) NOT NULL,
    [recordId] NVARCHAR(200) NOT NULL,
    [revision] INT NOT NULL,
    [operation] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [record_changes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [record_changes_pkey] PRIMARY KEY CLUSTERED ([sequence])
);

-- CreateTable
CREATE TABLE [dbo].[NoteRevision] (
    [id] NVARCHAR(200) NOT NULL,
    [noteId] NVARCHAR(200) NOT NULL,
    [revision] INT NOT NULL,
    [title] NVARCHAR(max),
    [content] NVARCHAR(max),
    [color] NVARCHAR(max),
    [tags] NVARCHAR(max),
    [source] NVARCHAR(max),
    [date] NVARCHAR(max),
    [time] NVARCHAR(max),
    [text] NVARCHAR(max),
    [prompt] NVARCHAR(max),
    [journalVersion] INT,
    [wordCount] INT,
    [legacyImportId] NVARCHAR(200),
    [pinned] BIT NOT NULL CONSTRAINT [NoteRevision_pinned_df] DEFAULT 0,
    [starred] BIT NOT NULL CONSTRAINT [NoteRevision_starred_df] DEFAULT 0,
    [data] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NoteRevision_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [actorId] NVARCHAR(200) NOT NULL,
    CONSTRAINT [NoteRevision_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NoteRevision_noteId_revision_key] UNIQUE NONCLUSTERED ([noteId],[revision])
);

-- CreateTable
CREATE TABLE [dbo].[NoteMutation] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [mutationId] NVARCHAR(200) NOT NULL,
    [fingerprint] NVARCHAR(max) NOT NULL,
    [response] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NoteMutation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NoteMutation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NoteMutation_userId_mutationId_key] UNIQUE NONCLUSTERED ([userId],[mutationId])
);

-- CreateTable
CREATE TABLE [dbo].[NoteChange] (
    [sequence] INT NOT NULL IDENTITY(1,1),
    [userId] NVARCHAR(200) NOT NULL,
    [noteId] NVARCHAR(200) NOT NULL,
    [revision] INT NOT NULL,
    [operation] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NoteChange_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NoteChange_pkey] PRIMARY KEY CLUSTERED ([sequence])
);

-- CreateTable
CREATE TABLE [dbo].[Goal] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [title] NVARCHAR(max),
    [targetDate] NVARCHAR(200),
    [description] NVARCHAR(max),
    [category] NVARCHAR(max),
    [status] NVARCHAR(200),
    [priority] NVARCHAR(max),
    [target_value] FLOAT(53),
    [current_value] FLOAT(53),
    [unit] NVARCHAR(max),
    [is_focus] BIT,
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Goal_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Goal_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Goal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SleepLog] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(200),
    [hours] FLOAT(53),
    [quality] NVARCHAR(max),
    [bed_time] NVARCHAR(max),
    [wake_time] NVARCHAR(max),
    [notes] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SleepLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [SleepLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SleepLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Document] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [title] NVARCHAR(max),
    [url] NVARCHAR(max),
    [storageKey] NVARCHAR(max),
    [sizeBytes] INT,
    [mimeType] NVARCHAR(max),
    [sha256] NVARCHAR(max),
    [previewKind] NVARCHAR(max),
    [encryptionFormat] NVARCHAR(max),
    [encryptionKeyId] NVARCHAR(200),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Document_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Document_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Document_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Habit] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [name] NVARCHAR(max),
    [streak] INT NOT NULL CONSTRAINT [Habit_streak_df] DEFAULT 0,
    [emoji] NVARCHAR(max),
    [icon] NVARCHAR(max),
    [category] NVARCHAR(max),
    [target_days] INT,
    [order_index] INT,
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Habit_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Habit_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Habit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[HabitLog] (
    [id] NVARCHAR(200) NOT NULL,
    [habitId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [HabitLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [HabitLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [HabitLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SubscriptionItem] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [name] NVARCHAR(max),
    [cost] FLOAT(53),
    [costMinor] BIGINT,
    [active] INT NOT NULL CONSTRAINT [SubscriptionItem_active_df] DEFAULT 1,
    [category] NVARCHAR(max),
    [next_date] NVARCHAR(200),
    [icon] NVARCHAR(max),
    [auto_renew] INT,
    [cycle] NVARCHAR(max),
    [cancelled_date] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SubscriptionItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [SubscriptionItem_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SubscriptionItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MoodLog] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(200),
    [mood] NVARCHAR(max),
    [energy] FLOAT(53),
    [note] NVARCHAR(max),
    [tags] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MoodLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [MoodLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MoodLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VitalsLog] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(200),
    [vital] NVARCHAR(200),
    [value] FLOAT(53),
    [unit] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VitalsLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [VitalsLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VitalsLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Medication] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [name] NVARCHAR(max),
    [dosage] NVARCHAR(max),
    [frequency] NVARCHAR(max),
    [start_date] NVARCHAR(max),
    [end_date] NVARCHAR(max),
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Medication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Medication_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Medication_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskSubtask] (
    [taskId] NVARCHAR(200) NOT NULL,
    [id] NVARCHAR(200) NOT NULL,
    [title] NVARCHAR(max) NOT NULL,
    [done] BIT NOT NULL CONSTRAINT [TaskSubtask_done_df] DEFAULT 0,
    [position] INT NOT NULL CONSTRAINT [TaskSubtask_position_df] DEFAULT 0,
    CONSTRAINT [TaskSubtask_pkey] PRIMARY KEY CLUSTERED ([taskId],[id])
);

-- CreateTable
CREATE TABLE [dbo].[GoalSubtask] (
    [goalId] NVARCHAR(200) NOT NULL,
    [id] NVARCHAR(200) NOT NULL,
    [text] NVARCHAR(max) NOT NULL,
    [done] BIT NOT NULL CONSTRAINT [GoalSubtask_done_df] DEFAULT 0,
    [position] INT NOT NULL CONSTRAINT [GoalSubtask_position_df] DEFAULT 0,
    CONSTRAINT [GoalSubtask_pkey] PRIMARY KEY CLUSTERED ([goalId],[id])
);

-- CreateTable
CREATE TABLE [dbo].[ShoppingPrice] (
    [itemId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [date] NVARCHAR(max) NOT NULL,
    [price] FLOAT(53) NOT NULL,
    CONSTRAINT [ShoppingPrice_pkey] PRIMARY KEY CLUSTERED ([itemId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[ProgressPhoto] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [date] NVARCHAR(max),
    [url] NVARCHAR(max),
    [notes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProgressPhoto_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ProgressPhoto_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProgressPhoto_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[GoalProgressLog] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [goalId] NVARCHAR(200) NOT NULL,
    [value] FLOAT(53),
    [note] NVARCHAR(max),
    [date] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [GoalProgressLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [GoalProgressLog_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [GoalProgressLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(200) NOT NULL,
    [action] NVARCHAR(max),
    [table_name] NVARCHAR(max),
    [item_id] NVARCHAR(max),
    [details] NVARCHAR(max),
    [actor_name] NVARCHAR(max) CONSTRAINT [audit_logs_actor_name_df] DEFAULT 'System',
    [actor_email] NVARCHAR(max) CONSTRAINT [audit_logs_actor_email_df] DEFAULT 'admin@growthtrack.ultimate',
    [actor_ip] NVARCHAR(max),
    [category] NVARCHAR(max) CONSTRAINT [audit_logs_category_df] DEFAULT 'system',
    [user_id] NVARCHAR(max),
    [user_agent] NVARCHAR(max),
    [severity] NVARCHAR(max) CONSTRAINT [audit_logs_severity_df] DEFAULT 'info',
    [source] NVARCHAR(max) CONSTRAINT [audit_logs_source_df] DEFAULT 'ultimate-api',
    [request_id] NVARCHAR(max),
    [metadata] NVARCHAR(max),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [audit_logs_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[login_logs] (
    [id] NVARCHAR(200) NOT NULL,
    [user_id] NVARCHAR(max),
    [email] NVARCHAR(max),
    [action] NVARCHAR(max),
    [ip_address] NVARCHAR(max),
    [user_agent] NVARCHAR(max),
    [failure_reason] NVARCHAR(max),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [login_logs_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [login_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [login_logs_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [source] NVARCHAR(max) CONSTRAINT [login_logs_source_df] DEFAULT 'ultimate-api',
    [request_id] NVARCHAR(max),
    [metadata] NVARCHAR(max),
    CONSTRAINT [login_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[session_logs] (
    [id] NVARCHAR(200) NOT NULL,
    [user_id] NVARCHAR(max),
    [action] NVARCHAR(max),
    [ip_address] NVARCHAR(max),
    [user_agent] NVARCHAR(max),
    [details] NVARCHAR(max),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [session_logs_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [session_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [session_logs_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [source] NVARCHAR(max) CONSTRAINT [session_logs_source_df] DEFAULT 'ultimate-api',
    [request_id] NVARCHAR(max),
    [metadata] NVARCHAR(max),
    CONSTRAINT [session_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[training_plans] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [streak] INT,
    [longestStreak] INT,
    [lastCompletedDate] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [training_plans_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [training_plans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [training_plans_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [training_plans_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [training_plans_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[training_days] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [day] NVARCHAR(max),
    [muscleGroup] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [training_days_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [training_days_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [training_days_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[planned_exercises] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [name] NVARCHAR(max),
    [sets] INT,
    [reps] INT,
    [weight] FLOAT(53),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [planned_exercises_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [planned_exercises_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [planned_exercises_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[training_pr_history] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [date] NVARCHAR(max),
    [lift] NVARCHAR(max),
    [weight] FLOAT(53),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [training_pr_history_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [training_pr_history_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [training_pr_history_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[training_personal_records] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [scope] NVARCHAR(200) NOT NULL,
    [key] NVARCHAR(200) NOT NULL,
    [valueType] NVARCHAR(max) NOT NULL,
    [value] FLOAT(53),
    [stringValue] NVARCHAR(max),
    [booleanValue] BIT,
    [unit] NVARCHAR(max),
    CONSTRAINT [training_personal_records_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [training_personal_records_parentId_scope_key_key] UNIQUE NONCLUSTERED ([parentId],[scope],[key])
);

-- CreateTable
CREATE TABLE [dbo].[nutrition_strategies] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [calories] FLOAT(53),
    [protein_g] FLOAT(53),
    [carbs_g] FLOAT(53),
    [fat_g] FLOAT(53),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [nutrition_strategies_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [nutrition_strategies_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [nutrition_strategies_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [nutrition_strategies_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [nutrition_strategies_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[planned_meals] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [name] NVARCHAR(max),
    [time] NVARCHAR(max),
    [icon] NVARCHAR(max),
    [items] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [planned_meals_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [planned_meals_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [planned_meals_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[medical_plans] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [medical_plans_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [medical_plans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [medical_plans_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [medical_plans_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [medical_plans_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[required_medical_tests] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [name] NVARCHAR(max),
    [priority] NVARCHAR(max),
    [frequency] NVARCHAR(max),
    [status] NVARCHAR(max),
    [notes] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [required_medical_tests_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [required_medical_tests_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [required_medical_tests_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[physique_plans] (
    [id] NVARCHAR(200) NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [physique_plans_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [physique_plans_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [physique_plans_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(max),
    [updatedBy] NVARCHAR(max),
    CONSTRAINT [physique_plans_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [physique_plans_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[physique_targets] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [label] NVARCHAR(max),
    [metric] NVARCHAR(max),
    [key] NVARCHAR(max),
    [currentValueType] NVARCHAR(max),
    [currentValue] FLOAT(53),
    [currentStringValue] NVARCHAR(max),
    [currentBooleanValue] BIT,
    [targetValueType] NVARCHAR(max),
    [targetValue] FLOAT(53),
    [targetStringValue] NVARCHAR(max),
    [targetBooleanValue] BIT,
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [physique_targets_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [physique_targets_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [physique_targets_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[physique_milestones] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [label] NVARCHAR(max),
    [targetDate] NVARCHAR(max),
    [month] NVARCHAR(max),
    [achieved] BIT,
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [physique_milestones_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [physique_milestones_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [physique_milestones_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[physique_zones] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [position] INT NOT NULL,
    [clientId] NVARCHAR(200),
    [clientIdType] NVARCHAR(max),
    [clientCreatedAt] NVARCHAR(max),
    [clientUpdatedAt] NVARCHAR(max),
    [name] NVARCHAR(max),
    [status] NVARCHAR(max),
    [icon] NVARCHAR(max),
    [present] NVARCHAR(max) NOT NULL CONSTRAINT [physique_zones_present_df] DEFAULT '[]',
    [data] NVARCHAR(max),
    CONSTRAINT [physique_zones_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [physique_zones_parentId_position_key] UNIQUE NONCLUSTERED ([parentId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[physique_plan_measurements] (
    [id] NVARCHAR(200) NOT NULL,
    [parentId] NVARCHAR(200) NOT NULL,
    [scope] NVARCHAR(200) NOT NULL,
    [key] NVARCHAR(200) NOT NULL,
    [valueType] NVARCHAR(max) NOT NULL,
    [value] FLOAT(53),
    [stringValue] NVARCHAR(max),
    [booleanValue] BIT,
    [unit] NVARCHAR(max),
    CONSTRAINT [physique_plan_measurements_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [physique_plan_measurements_parentId_scope_key_key] UNIQUE NONCLUSTERED ([parentId],[scope],[key])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_skills_userId_category_idx] ON [dbo].[user_skills]([userId], [category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [manual_projects_userId_status_idx] ON [dbo].[manual_projects]([userId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [auth_sessions_userId_expiresAt_idx] ON [dbo].[auth_sessions]([userId], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_userId_createdAt_idx] ON [dbo].[Task]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_userId_status_due_date_idx] ON [dbo].[Task]([userId], [status], [due_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_userId_date_idx] ON [dbo].[Transaction]([userId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_userId_createdAt_idx] ON [dbo].[Transaction]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Budget_userId_month_idx] ON [dbo].[Budget]([userId], [month]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MetricLog_userId_metric_measuredAt_idx] ON [dbo].[MetricLog]([userId], [metric], [measuredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MetricLog_userId_date_idx] ON [dbo].[MetricLog]([userId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MetricMeasurement_key_value_idx] ON [dbo].[MetricMeasurement]([key], [value]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [location_points_userId_capturedAt_idx] ON [dbo].[location_points]([userId], [capturedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NutritionLog_userId_date_idx] ON [dbo].[NutritionLog]([userId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ShoppingItem_userId_stage_purchased_idx] ON [dbo].[ShoppingItem]([userId], [stage], [purchased]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TimesheetSession_userId_date_idx] ON [dbo].[TimesheetSession]([userId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EntertainmentMedia_userId_status_type_idx] ON [dbo].[EntertainmentMedia]([userId], [status], [type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Note_userId_kind_deletedAt_id_idx] ON [dbo].[Note]([userId], [kind], [deletedAt], [id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [calendar_events_userId_deletedAt_idx] ON [dbo].[calendar_events]([userId], [deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [calendar_events_userId_syncProvider_idx] ON [dbo].[calendar_events]([userId], [syncProvider]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [portfolio_holdings_userId_deletedAt_position_idx] ON [dbo].[portfolio_holdings]([userId], [deletedAt], [position]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [record_changes_userId_collection_sequence_idx] ON [dbo].[record_changes]([userId], [collection], [sequence]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NoteChange_userId_sequence_idx] ON [dbo].[NoteChange]([userId], [sequence]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Goal_userId_status_targetDate_idx] ON [dbo].[Goal]([userId], [status], [targetDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SleepLog_userId_date_idx] ON [dbo].[SleepLog]([userId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SubscriptionItem_userId_active_next_date_idx] ON [dbo].[SubscriptionItem]([userId], [active], [next_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MoodLog_userId_date_idx] ON [dbo].[MoodLog]([userId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VitalsLog_userId_date_vital_idx] ON [dbo].[VitalsLog]([userId], [date], [vital]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskSubtask_taskId_position_idx] ON [dbo].[TaskSubtask]([taskId], [position]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoalSubtask_goalId_position_idx] ON [dbo].[GoalSubtask]([goalId], [position]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [training_personal_records_scope_key_value_idx] ON [dbo].[training_personal_records]([scope], [key], [value]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [physique_plan_measurements_scope_key_value_idx] ON [dbo].[physique_plan_measurements]([scope], [key], [value]);

-- AddForeignKey
ALTER TABLE [dbo].[user_skills] ADD CONSTRAINT [user_skills_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[manual_projects] ADD CONSTRAINT [manual_projects_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[repository_notes] ADD CONSTRAINT [repository_notes_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_rounds] ADD CONSTRAINT [assessment_rounds_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_answers] ADD CONSTRAINT [assessment_answers_roundId_fkey] FOREIGN KEY ([roundId]) REFERENCES [dbo].[assessment_rounds]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[auth_sessions] ADD CONSTRAINT [auth_sessions_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_preferences] ADD CONSTRAINT [user_preferences_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[owner_profiles] ADD CONSTRAINT [owner_profiles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[social_profiles] ADD CONSTRAINT [social_profiles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[body_profiles] ADD CONSTRAINT [body_profiles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[integration_credentials] ADD CONSTRAINT [integration_credentials_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Budget] ADD CONSTRAINT [Budget_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MetricLog] ADD CONSTRAINT [MetricLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MetricMeasurement] ADD CONSTRAINT [MetricMeasurement_metricLogId_fkey] FOREIGN KEY ([metricLogId]) REFERENCES [dbo].[MetricLog]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[health_profiles] ADD CONSTRAINT [health_profiles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HealthSense] ADD CONSTRAINT [HealthSense_profileId_fkey] FOREIGN KEY ([profileId]) REFERENCES [dbo].[health_profiles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HealthSpecialized] ADD CONSTRAINT [HealthSpecialized_profileId_fkey] FOREIGN KEY ([profileId]) REFERENCES [dbo].[health_profiles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HealthRecoveryMetric] ADD CONSTRAINT [HealthRecoveryMetric_profileId_fkey] FOREIGN KEY ([profileId]) REFERENCES [dbo].[health_profiles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[location_points] ADD CONSTRAINT [location_points_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[custom_tables] ADD CONSTRAINT [custom_tables_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NutritionLog] ADD CONSTRAINT [NutritionLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkoutSession] ADD CONSTRAINT [WorkoutSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkoutExercise] ADD CONSTRAINT [WorkoutExercise_sessionId_fkey] FOREIGN KEY ([sessionId]) REFERENCES [dbo].[WorkoutSession]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ShoppingItem] ADD CONSTRAINT [ShoppingItem_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TimesheetSession] ADD CONSTRAINT [TimesheetSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EntertainmentMedia] ADD CONSTRAINT [EntertainmentMedia_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Note] ADD CONSTRAINT [Note_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[calendar_events] ADD CONSTRAINT [calendar_events_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[portfolio_holdings] ADD CONSTRAINT [portfolio_holdings_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[record_mutations] ADD CONSTRAINT [record_mutations_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[record_changes] ADD CONSTRAINT [record_changes_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteRevision] ADD CONSTRAINT [NoteRevision_noteId_fkey] FOREIGN KEY ([noteId]) REFERENCES [dbo].[Note]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteMutation] ADD CONSTRAINT [NoteMutation_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NoteChange] ADD CONSTRAINT [NoteChange_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Goal] ADD CONSTRAINT [Goal_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SleepLog] ADD CONSTRAINT [SleepLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Habit] ADD CONSTRAINT [Habit_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HabitLog] ADD CONSTRAINT [HabitLog_habitId_fkey] FOREIGN KEY ([habitId]) REFERENCES [dbo].[Habit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SubscriptionItem] ADD CONSTRAINT [SubscriptionItem_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MoodLog] ADD CONSTRAINT [MoodLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VitalsLog] ADD CONSTRAINT [VitalsLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Medication] ADD CONSTRAINT [Medication_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskSubtask] ADD CONSTRAINT [TaskSubtask_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoalSubtask] ADD CONSTRAINT [GoalSubtask_goalId_fkey] FOREIGN KEY ([goalId]) REFERENCES [dbo].[Goal]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ShoppingPrice] ADD CONSTRAINT [ShoppingPrice_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[ShoppingItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProgressPhoto] ADD CONSTRAINT [ProgressPhoto_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoalProgressLog] ADD CONSTRAINT [GoalProgressLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoalProgressLog] ADD CONSTRAINT [GoalProgressLog_goalId_fkey] FOREIGN KEY ([goalId]) REFERENCES [dbo].[Goal]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[training_plans] ADD CONSTRAINT [training_plans_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[training_days] ADD CONSTRAINT [training_days_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[training_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[planned_exercises] ADD CONSTRAINT [planned_exercises_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[training_days]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[training_pr_history] ADD CONSTRAINT [training_pr_history_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[training_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[training_personal_records] ADD CONSTRAINT [training_personal_records_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[training_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[nutrition_strategies] ADD CONSTRAINT [nutrition_strategies_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[planned_meals] ADD CONSTRAINT [planned_meals_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[nutrition_strategies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[medical_plans] ADD CONSTRAINT [medical_plans_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[required_medical_tests] ADD CONSTRAINT [required_medical_tests_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[medical_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[physique_plans] ADD CONSTRAINT [physique_plans_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[physique_targets] ADD CONSTRAINT [physique_targets_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[physique_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[physique_milestones] ADD CONSTRAINT [physique_milestones_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[physique_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[physique_zones] ADD CONSTRAINT [physique_zones_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[physique_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[physique_plan_measurements] ADD CONSTRAINT [physique_plan_measurements_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[physique_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
 EXEC(N'CREATE OR ALTER TRIGGER dbo.[Transaction_money_integrity] ON dbo.[Transaction] AFTER INSERT, UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF TRIGGER_NESTLEVEL() > 1 RETURN;
 IF EXISTS (SELECT 1 FROM inserted WHERE [amount] IS NOT NULL AND (ABS([amount]) > 1000000000000 OR [amount] <> ROUND([amount],2)))
 BEGIN THROW 51001, ''Money requires at most two decimal places within supported range'', 1; END;
 UPDATE target SET [amountMinor]=CONVERT(BIGINT,ROUND(source.[amount]*100,0)) FROM dbo.[Transaction] target JOIN inserted source ON target.id=source.id;
END');
EXEC(N'CREATE OR ALTER TRIGGER dbo.[Budget_money_integrity] ON dbo.[Budget] AFTER INSERT, UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF TRIGGER_NESTLEVEL() > 1 RETURN;
 IF EXISTS (SELECT 1 FROM inserted WHERE [limit_amount] IS NOT NULL AND (ABS([limit_amount]) > 1000000000000 OR [limit_amount] <> ROUND([limit_amount],2)))
 BEGIN THROW 51001, ''Money requires at most two decimal places within supported range'', 1; END;
 UPDATE target SET [limitMinor]=CONVERT(BIGINT,ROUND(source.[limit_amount]*100,0)) FROM dbo.[Budget] target JOIN inserted source ON target.id=source.id;
END');
EXEC(N'CREATE OR ALTER TRIGGER dbo.[SubscriptionItem_money_integrity] ON dbo.[SubscriptionItem] AFTER INSERT, UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF TRIGGER_NESTLEVEL() > 1 RETURN;
 IF EXISTS (SELECT 1 FROM inserted WHERE [cost] IS NOT NULL AND (ABS([cost]) > 1000000000000 OR [cost] <> ROUND([cost],2)))
 BEGIN THROW 51001, ''Money requires at most two decimal places within supported range'', 1; END;
 UPDATE target SET [costMinor]=CONVERT(BIGINT,ROUND(source.[cost]*100,0)) FROM dbo.[SubscriptionItem] target JOIN inserted source ON target.id=source.id;
END');
EXEC(N'CREATE OR ALTER TRIGGER dbo.[GoalProgressLog_owner_integrity] ON dbo.[GoalProgressLog] AFTER INSERT, UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN dbo.Goal g ON g.id=i.goalId AND g.userId=i.userId WHERE g.id IS NULL) BEGIN THROW 51002, ''Goal owner mismatch'', 1; END; END');
EXEC(N'CREATE OR ALTER TRIGGER dbo.[Goal_owner_integrity] ON dbo.[Goal] AFTER INSERT, UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.GoalProgressLog p ON p.goalId=i.id WHERE p.userId<>i.userId) BEGIN THROW 51002, ''Goal owner mismatch'', 1; END; END');
 CREATE TABLE dbo.__GrowthTrackSchema(id INT NOT NULL PRIMARY KEY,modelHash NVARCHAR(64) NOT NULL,appliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
 INSERT INTO dbo.__GrowthTrackSchema(id,modelHash) VALUES(1,N'dcfbdf9affc2d330bbbb47edfaf571ec75a62149b6f1464d4f694a761127f70f');
 COMMIT TRANSACTION;
 PRINT 'Schema created; no personal accounts or secrets seeded.';
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
 THROW;
 END CATCH;
END;
GO
