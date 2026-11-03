# Ultimate typed records

Status: source implementation and disposable-database verification. These changes
have not been applied to an existing product database or deployed.

Regular record fields have explicit types. Lists with their own identity or
history use child tables. JSON remains appropriate for bounded label lists,
user-defined schemas, renderer/preferences configuration, nested extension
metadata, mutation receipts and historical values that cannot safely be converted.
It is not a duplicate of the ordinary record payload.

## Storage map

| Record | Dedicated storage |
| --- | --- |
| Current body profile | `body_profiles`: canonical cm/kg/percent/degree columns, including `headCircCm`, `handLengthCm`, `footLengthCm`, bilateral measurements and supported target columns |
| Measurement history | `MetricLog`: date, metric, value, unit, side, phase, source, timestamp, confidence, strength details, notes and photo; `MetricMeasurement`: individual numeric/text/boolean/null readings with key, container and unit |
| Goals | `Goal`: title, description, category, status, priority, target/current value, unit, deadline and focus; `GoalSubtask` and `GoalProgressLog` for steps and history |
| Skills | `user_skills`: name, category, XP, description, weekly target, resource, next action, practice timestamp/count; ordered records preserve client identifiers and timestamps |
| Tasks | `Task`: title, description, status, priority, project/section, due/completion/reminder dates, recurrence and parent; `TaskSubtask` for steps |
| Food and training logs | `NutritionLog`: meal/name, dates, calories and macros; `WorkoutSession`/`WorkoutExercise`: completed sessions and individual set fields |
| Training plans | `training_plans`: streaks and last completion; `training_days`/`planned_exercises`: named days, muscle group, exercises, sets/reps/weight; `training_personal_records`/`training_pr_history`: typed lifting records and dated history |
| Planned nutrition and medical tests | `nutrition_strategies`/`planned_meals`: calorie/macro goals, meal names/times/icons and item lists; `medical_plans`/`required_medical_tests`: required tests, priority, frequency, status and notes |
| Physique targets and plans | `physique_plans`: owner and configuration extensions; `physique_plan_measurements`: goal/appearance/private readings with typed values and units; `physique_targets`, `physique_milestones`, `physique_zones`: target values, milestone dates/completion and zone phases |
| Shopping | `ShoppingItem`: quantity, prices/costs, category, stage, priority, delivery/import/expense fields; `ShoppingPrice` for price history |
| Time and entertainment | `TimesheetSession`: project/task, duration/seconds, billable, earnings, notes and timestamps; `EntertainmentMedia`: title/type/status, progress, season/episode/count and rating |
| Sleep, mood and health | `SleepLog`, `MoodLog`, `VitalsLog`, `Medication`: their form fields; `health_profiles`, `HealthSense`, `HealthSpecialized`, `HealthRecoveryMetric`: lifestyle/sensory/recovery fields and values |
| Habits and subscriptions | `Habit`/`HabitLog`: name, icon, category, target/order and completions; `SubscriptionItem`: amount, active/renewal flags, category, billing cycle and dates |
| Notes and journals | `Note`: text/content, color, tags, source, date/time, prompt, journal version, word count/import id and pin/star flags; `NoteRevision` snapshots include these fields for restoration |
| Projects and assessments | `manual_projects`, `repository_notes`, `assessment_rounds`, `assessment_answers`: named fields and ordered answer rows |
| Files | `Document`: storage key, size, MIME/hash, preview and encryption metadata |
| Calendar and holdings | `calendar_events`/`portfolio_holdings`: typed record fields; their separately rehearsed row migration and `GROWTHTRACK_RECORD_ROWS=1` rollout remain required |

Metric measurements use the units in `src/lib/bodyMetricContract.js`. Old wide
manual check-ins without reliable unit information retain unknown units; the
migration does not guess conversions. Optional private anatomy measurements stay
in their existing consent-controlled flow.

Bounded tags/diets/hobbies and health-sense exercise labels have their own named
fields containing JSON lists. Custom table schemas/rows, avatar morph/viewer maps,
wellness preferences and lifestyle configuration remain JSON. Plan records use
typed fields and child tables; only their custom extensions remain in `data`.
A small `present` list records which fields were supplied so absent values, nulls
and explicitly empty lists round-trip without copying record values into JSON.
This change does not claim that
every existing JSON document is relational. New fixed record fields should extend
the owning schema and payload projection rather than being hidden in `data`.

## Migration and compatibility

The pending typed migrations promote convertible fields and remove duplicate
scalar properties from residual JSON. Invalid JSON and incompatible old values
remain available for explicit repair. Goal subtasks, shopping history, habit
completions, skills, projects and assessments retain their own records. Owners and
historical timestamps are preserved.

The 3 November follow-up migration covers note/journal fields and revisions, mood
tags and the current habit form's `icon`. It also classifies journals created while
the versioned Notes API was disabled so they remain excluded from Workspace Notes.
Pin/star fields survive partial edits and revision restoration.

The plan-record follow-up also migrates the fixed records in `User.trainingPlan`,
`nutritionStrategy`, `medicalData` and `physiqueTargets`. The existing state and
singleton endpoints reconstruct their original client shapes from the rows.
Replacing or clearing a plan, its children and its old User JSON happens in one
transaction. Root record identities/creation timestamps survive updates. Untouched
incompatible legacy fields can survive an unrelated edit; changed invalid fields
are rejected. Numeric training-form strings become numeric columns.

Reminders read the promoted goal, habit and subscription columns. With record-row
rollout enabled, calendar reminders read the calendar service rather than the old
User document. Legacy APIs retain their client payload shapes.

Existing installations must reconcile their migration history, back up and
rehearse before upgrading; see [database maintenance](../DATABASES.md). Do not
replay the restored baseline onto an already populated modern schema. The source
changes do not authorize applying migrations to real data.

## Verification

The backend suite creates synthetic records in temporary SQLite databases, replays
all migrations, saves/updates/reloads through actual Prisma models and controllers,
and checks:

- every supported body measurement has a typed reading and its declared unit;
- head/hand/foot measurements and targets save in body-profile columns;
- ordinary goal, skill and collection fields are absent from catch-all JSON;
- notes/revision snapshots restore typed fields and journals remain private;
- owners, zero/false/null values, custom metadata and malformed legacy inputs survive;
- stale writes and cross-owner access are rejected, and late failures roll back.

Fresh-installation schema parity checks compare columns, defaults, keys, indexes
and integrity triggers against migration replay.

```powershell
node growthtrack-ultimate/tests/unit/server-backend/run.mjs
npm run test:schemas
node growthtrack-ultimate/scripts/generate-schema.mjs --check
node scripts/application-docs.mjs --check
node growthtrack-ultimate/scripts/capture-record-example.mjs
```

`capture-record-example.mjs` creates an isolated in-memory SQLite database and
writes an ignored `.evergreen/ultimate-record-example.json` snapshot containing
saved goal/subtask, skill, head/foot measurement and training-plan records, plus
their reconstructed client values. It never reads product databases or `.env`.

The plan contract is in `server/domains/planContract.js`; the reviewed generated
models are checked by the backend tests. `generate-plan-records.mjs --schema`
regenerates those models. Its `--migration <previous-schema-file>` mode only
creates a new migration file and refuses to overwrite one that already exists.

Recorded verification after the UI persistence follow-up: 136 backend checks,
80 selected UI/store checks, nine isolated browser cases and 18
SQLite/mobile/repair checks pass. Gateway, Prisma validation, fresh-schema
generation and shared-design consistency also pass. Two PostgreSQL repair checks
are skipped without a configured disposable test database. The MindWellness
selector now uses the actual Breathe tab; see the
[UI follow-up](2026-11-03-ui-blind-spots.md) for its bounded browser coverage.
The separate 3D preview suite still reports 15 passes and the previously recorded
`humanoid-base.glb` hash mismatch.

The final pre-PR migration review also covers legacy pin/star writes made after
the earlier flag-column backfill. Valid booleans and integer flags move into the
existing columns before their JSON keys are removed. Missing, null or malformed
flags preserve existing column values and their residual metadata.
