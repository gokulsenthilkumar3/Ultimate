# Page-by-page redesign backlog

Status: proposal awaiting implementation approval. Every canonical route has an explicit job, layout, primary action and acceptance criterion. Secondary-view names are retained from the registry; listing them is not a claim that each view has been exercised.

Common acceptance for every page: working deep links and back navigation; readable empty/populated/loading/error/filtered-empty states; keyboard access; explicit saving and recovery; no hidden final controls; narrow/zoomed layouts; light/dark/reduced-motion support. Use isolated records, never the owner’s live data.

## Finance

### Overview — `/finance/overview`

- **Job:** Understand this month’s money and act on exceptions.
- **Current evidence:** [1366×768 capture](screenshots/finance.png); first heading: “Your money, in focus”. Page-level H1 present.
- **Proposed layout:** Keep a compact cash-flow summary, recent activity and upcoming commitments; put date range and Add transaction on one toolbar.
- **Primary action:** Add transaction.
- **Views retained:** current default view.
- **Acceptance:** The selected period explains every total; recent activity opens the matching filtered ledger.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Transactions — `/finance/transactions`

- **Job:** Find, inspect and correct a recorded transaction.
- **Current evidence:** [1366×768 capture](screenshots/transactions.png); first heading: “Transactions”. Page-level H1 present.
- **Proposed layout:** Use one ledger toolbar with search, a few active filter chips and More filters; show a detail drawer instead of expanding the whole page.
- **Primary action:** New transaction.
- **Views retained:** all, income, expenses.
- **Acceptance:** Search, date range and export agree; editing preserves filters and returns focus to the row.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Analytics — `/finance/analytics`

- **Job:** Understand where recorded money went.
- **Current evidence:** [1366×768 capture](screenshots/financeAnalytics.png); first heading: “Finance analytics”. Page-level H1 present.
- **Proposed layout:** Lead with one answered question and its period, chart and accessible table; place secondary breakdowns beneath it.
- **Primary action:** Choose period.
- **Views retained:** categories, income, comparisons.
- **Acceptance:** Missing data, zero and unavailable sources remain distinct; chart totals reconcile to the ledger.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Trends — `/finance/trends`

- **Job:** Compare complete financial periods.
- **Current evidence:** [1366×768 capture](screenshots/financeTrends.png); first heading: “Finance trends”. Page-level H1 present.
- **Proposed layout:** Use aligned period comparisons with explicit incomplete-month labels and a compact metric selector.
- **Primary action:** Compare periods.
- **Views retained:** monthly, recurring.
- **Acceptance:** Comparison uses equal, disclosed periods; a chart point links to its source transactions.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Budgeting — `/finance/budgeting`

- **Job:** Set category limits and see what needs attention.
- **Current evidence:** [1366×768 capture](screenshots/budgeting.png); first heading: “Budgeting”. Page-level H1 present.
- **Proposed layout:** Lead with current category rows, remaining amounts and exceptions; move category creation into a focused form.
- **Primary action:** Create budget.
- **Views retained:** current, history.
- **Acceptance:** Month scope, rollover policy and over-budget state are visible; no silent change to financial arithmetic.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Subscriptions — `/finance/subscriptions`

- **Job:** Review upcoming renewals and recurring costs.
- **Current evidence:** [1366×768 capture](screenshots/subscriptions.png); first heading: “Subscriptions”. Page-level H1 present.
- **Proposed layout:** Put next renewals first, then the searchable list; separate detected suggestions from confirmed subscriptions.
- **Primary action:** Add subscription.
- **Views retained:** active, upcoming, archived.
- **Acceptance:** Suggested recurrence requires review; cancellation and next billing date remain understandable.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Portfolio — `/finance/portfolio`

- **Job:** Review holdings using dated valuation evidence.
- **Current evidence:** [1366×768 capture](screenshots/portfolio.png); first heading: “Portfolio”. No visible H1 in this captured main region.
- **Proposed layout:** Use a holdings-first ledger with valuation date and source beside the summary; group manual snapshot and refresh actions.
- **Primary action:** Add holding.
- **Views retained:** holdings, allocation, history.
- **Acceptance:** Undated or stale values cannot look current; no unsupported profit or return claim appears.
- **Implementation:** P2; `src/components/Portfolio.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### SIP Calculator — `/finance/sip`

- **Job:** Explore an investment scenario with explicit assumptions.
- **Current evidence:** [1366×768 capture](screenshots/sip.png); first heading: “SIP Calculator”. No visible H1 in this captured main region.
- **Proposed layout:** Keep inputs and a single projection side by side; provide numeric entry beside sliders and a concise assumptions disclosure.
- **Primary action:** Compare scenario.
- **Views retained:** inputs, projection, comparison.
- **Acceptance:** Keyboard entry works; changing an assumption updates an identified estimate rather than a recorded result.
- **Implementation:** P2; `src/components/SIPCalculator.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Shopping — `/finance/shopping`

- **Job:** Move a purchase from need through planned to purchased.
- **Current evidence:** [1366×768 capture](screenshots/shopping.png); first heading: “Shopping List”. No visible H1 in this captured main region.
- **Proposed layout:** Use a clear status list with estimated versus actual cost; keep optional import and price tracking secondary.
- **Primary action:** Plan purchase.
- **Views retained:** lists, planned, purchased.
- **Acceptance:** Statuses remain readable without color; planned and purchased totals do not mix.
- **Implementation:** P2; `src/components/Shopping.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Sync — `/finance/sync`

- **Job:** Import financial records with review and recovery.
- **Current evidence:** [1366×768 capture](screenshots/financeSync.png); first heading: “Finance sync”. Page-level H1 present.
- **Proposed layout:** Use a step sequence: select source, map fields, preview duplicates, confirm, then receipt/history.
- **Primary action:** Import statement.
- **Views retained:** accounts, csv, history.
- **Acceptance:** Preview performs no durable write; deduplication and errors remain visible after retry.
- **Implementation:** P2; `src/components/Finance.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### FinSync — `/finance/finsync`

- **Job:** Reach budgeting and account tools without losing orientation.
- **Current evidence:** [1366×768 capture](screenshots/finsync.png); first heading: “One Ultimate workspace”. Page-level H1 present.
- **Proposed layout:** Give the embedded product a slim named header, status and native-route links; avoid a second marketing masthead.
- **Primary action:** Open FinSync.
- **Views retained:** dashboard, budget, cards, accounts.
- **Acceptance:** Offline, expired handoff and authenticated content have distinct states; existing companion records stay in their store.
- **Implementation:** P3; `src/components/UnifiedWorkspace.jsx`.
- **Coverage:** Browser-inspected host frame with deliberately offline fixture; inner product requires independent verification.

### OxFin — `/finance/oxfin`

- **Job:** Reach wallet, bill and card workflows from Ultimate.
- **Current evidence:** [1366×768 capture](screenshots/oxfin.png); first heading: “One Ultimate workspace”. Page-level H1 present.
- **Proposed layout:** Use the same companion frame and clear return navigation; keep ownership and data origin visible.
- **Primary action:** Open OxFin.
- **Views retained:** wallets, cards, investments, intelligence.
- **Acceptance:** The inner application is validated separately with a test identity; a wrapper screenshot does not certify it.
- **Implementation:** P3; `src/components/UnifiedWorkspace.jsx`.
- **Coverage:** Browser-inspected host frame with deliberately offline fixture; inner product requires independent verification.

### Equity Lens — `/finance/equity`

- **Job:** Inspect a market instrument with date and source context.
- **Current evidence:** [1366×768 capture](screenshots/equity.png); first heading: “One Ultimate workspace”. Page-level H1 present.
- **Proposed layout:** Use an instrument-led workspace and restrained chart controls inside a consistent companion frame.
- **Primary action:** Choose instrument.
- **Views retained:** charts, indices, options, chain.
- **Acceptance:** Delayed, offline and current quotes are distinguishable; chart controls remain usable at laptop widths.
- **Implementation:** P3; `src/components/UnifiedWorkspace.jsx`.
- **Coverage:** Browser-inspected host frame with deliberately offline fixture; inner product requires independent verification.

## Insights

### Overview — `/insights/overview`

- **Job:** Choose the next useful action across the app.
- **Current evidence:** [1366×768 capture](screenshots/overview.png); first heading: “Your day, in focus”. Page-level H1 present.
- **Proposed layout:** Keep a short priority list, a small factual summary and recent activity; remove repeated navigation catalogs.
- **Primary action:** Open next action.
- **Views retained:** today, priorities, summary.
- **Acceptance:** Every recommendation cites its recorded trigger and opens the correct task, goal or log.
- **Implementation:** P2; `src/components/Overview.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Action Center — `/insights/actions`

- **Job:** Resolve or defer a real next action.
- **Current evidence:** [1366×768 capture](screenshots/actions.png); first heading: “Your next best actions.”. Page-level H1 present.
- **Proposed layout:** Use grouped actionable rows with why-this-appears detail, due state and one explicit action per row.
- **Primary action:** Resolve action.
- **Views retained:** today, upcoming, snoozed, dismissed.
- **Acceptance:** Dismiss and snooze preserve their scope; retry cannot duplicate a completion.
- **Implementation:** P2; `src/components/ActionCenter.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Current — `/insights/current`

- **Job:** Check local conditions and current information.
- **Current evidence:** [1366×768 capture](screenshots/current.png); first heading: “No stories right now.”. No visible H1 in this captured main region.
- **Proposed layout:** Replace the decorative clock banner with a compact location/time row and separate weather and news panels.
- **Primary action:** Refresh current data.
- **Views retained:** weather, news, local.
- **Acceptance:** Location stays opt-in; permission, provider failure, stale data and empty news are distinguishable.
- **Implementation:** P2; `src/components/Current.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Analytics — `/insights/analytics`

- **Job:** Explore relationships in recorded data.
- **Current evidence:** [1366×768 capture](screenshots/analytics.png); first heading: “Analytics”. No visible H1 in this captured main region.
- **Proposed layout:** Use a question/metric pair selector, period and a single readable analysis panel; keep data sufficiency beside the result.
- **Primary action:** Choose comparison.
- **Views retained:** trends, correlations, comparisons.
- **Acceptance:** Insufficient paired observations remain explicit; correlation never becomes a causal recommendation.
- **Implementation:** P2; `src/components/InsightsHub.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Dashboards — `/insights/dashboards`

- **Job:** Scan personally useful signals.
- **Current evidence:** [1366×768 capture](screenshots/dashboards.png); first heading: “Minimal dashboards for fast decisions”. No visible H1 in this captured main region.
- **Proposed layout:** Offer a few named dashboard layouts with explicit metric sources; move arrange/export controls out of the main reading path.
- **Primary action:** Choose dashboard.
- **Views retained:** saved, arrange.
- **Acceptance:** Each panel has a meaningful empty state and accessible data alternative; configuration survives reload.
- **Implementation:** P2; `src/components/InsightsHub.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Progress — `/insights/progress`

- **Job:** Review meaningful change over time.
- **Current evidence:** [1366×768 capture](screenshots/progress.png); first heading: “Progress at a glance”. No visible H1 in this captured main region.
- **Proposed layout:** Use a dated timeline and comparable metric summaries; prioritize changes over a wall of counters.
- **Primary action:** Choose period.
- **Views retained:** timeline, comparisons, milestones.
- **Acceptance:** The period and latest recorded date are visible; the user can open the underlying check-ins.
- **Implementation:** P2; `src/components/InsightsHub.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Forecast — `/insights/forecast`

- **Job:** Understand an estimate and its assumptions.
- **Current evidence:** [1366×768 capture](screenshots/forecast.png); first heading: “Growth Forecast”. No visible H1 in this captured main region.
- **Proposed layout:** Show historical observations, forecast boundary and assumptions together; secondary scenarios use the same units and dates.
- **Primary action:** Adjust scenario.
- **Views retained:** trends, scenarios.
- **Acceptance:** An estimate is labelled as an estimate; missing history and missing targets each explain the next step.
- **Implementation:** P2; `src/components/InsightsHub.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Forex Forecast — `/insights/forex`

- **Job:** Inspect forecasting outputs without confusing them with outcomes.
- **Current evidence:** [1366×768 capture](screenshots/forex.png); first heading: “One Ultimate workspace”. Page-level H1 present.
- **Proposed layout:** Use the shared companion frame and an internal layout centered on currency, date and forecast context.
- **Primary action:** Choose currency.
- **Views retained:** models, forecast, analytics, volatility.
- **Acceptance:** Historical fit and future forecast stay separate; model/source freshness and unavailable states are visible.
- **Implementation:** P3; `src/components/UnifiedWorkspace.jsx`.
- **Coverage:** Browser-inspected host frame with deliberately offline fixture; inner product requires independent verification.

## Wellness

### Overview — `/wellness/overview`

- **Job:** Make a daily check-in and review today’s records.
- **Current evidence:** [1366×768 capture](screenshots/wellness.png); first heading: “Wellness, on the record”. Page-level H1 present.
- **Proposed layout:** Put a short check-in above a concise daily summary; route details to the owning pages rather than duplicate forms.
- **Primary action:** Daily check-in.
- **Views retained:** current default view.
- **Acceptance:** Recorded values, estimates and missing entries use different language; one action opens the correct workflow.
- **Implementation:** P2; `src/components/WellnessCommand.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Sleep — `/wellness/sleep`

- **Job:** Record sleep and understand recent patterns.
- **Current evidence:** [1366×768 capture](screenshots/sleep.png); first heading: “Sleep Analytics”. Page-level H1 present.
- **Proposed layout:** Lead with last night and Log sleep; put trends, history and optional advice behind clear views.
- **Primary action:** Log sleep.
- **Views retained:** log, trends, history.
- **Acceptance:** Dates across midnight and units are clear; missing or imported stages are not fabricated.
- **Implementation:** P2; `src/components/SleepDashboard.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Lifestyle — `/wellness/lifestyle`

- **Job:** Manage daily routines rather than repeat the habit tracker.
- **Current evidence:** [1366×768 capture](screenshots/lifestyle.png); first heading: “Habit Matrix”. No visible H1 in this captured main region.
- **Proposed layout:** Clarify this page’s purpose as routines/preferences; cross-link the existing Habits page and preserve both routes.
- **Primary action:** Edit routine.
- **Views retained:** routines, preferences, history.
- **Acceptance:** Lifestyle and Habits have distinct titles and jobs; no record migration or route removal is implied.
- **Implementation:** P2; `src/components/Lifestyle.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Mind & Wellness — `/wellness/mind`

- **Job:** Complete a private check-in or open a journal.
- **Current evidence:** [1366×768 capture](screenshots/mind.png); first heading: “Mental Health”. Page-level H1 present.
- **Proposed layout:** Keep a focused check-in, optional journal and calm history view; reduce competing streak and chart emphasis.
- **Primary action:** Save check-in.
- **Views retained:** checkin, trends, journal, breathe.
- **Acceptance:** Mood and journal privacy, save state and recovery are clear; breathing controls respect reduced motion.
- **Implementation:** P2; `src/components/MindWellness.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Medical — `/wellness/medical`

- **Job:** Record and retrieve clinician-provided information.
- **Current evidence:** [1366×768 capture](screenshots/medical.png); first heading: “Medical History”. No visible H1 in this captured main region.
- **Proposed layout:** Organize vitals, medications and documents into clear sections; make Log vital the primary action and use exact units.
- **Primary action:** Log vital.
- **Views retained:** vitals, medications, records, timeline.
- **Acceptance:** Records are dated and attributed; export scope is explicit; treatment guidance is not introduced by a visual redesign.
- **Implementation:** P2; `src/components/Medical.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Health+ — `/wellness/health`

- **Job:** Review additional self-recorded health metrics.
- **Current evidence:** [1366×768 capture](screenshots/health.png); first heading: “Health+ & Extras”. No visible H1 in this captured main region.
- **Proposed layout:** Use plain category labels, progressive form disclosure and clear links to the medical record page.
- **Primary action:** Record metric.
- **Views retained:** senses, lifestyle, specialized, recovery.
- **Acceptance:** Each metric identifies unit, date and source; unsupported sensor integrations remain setup-required.
- **Implementation:** P2; `src/components/HealthExtras.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Habits — `/wellness/habits`

- **Job:** Mark today’s habits and see consistency.
- **Current evidence:** [1366×768 capture](screenshots/habits.png); first heading: “Habit Matrix”. No visible H1 in this captured main region.
- **Proposed layout:** Lead with today’s checkable list; move matrix and trends into secondary views.
- **Primary action:** New habit.
- **Views retained:** today, matrix, history.
- **Acceptance:** Keyboard marking works, missed and unrecorded days differ, and history cannot change silently.
- **Implementation:** P2; `src/components/HabitsMatrix.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Physique — `/wellness/physique`

- **Job:** Record a body check-in and compare current versus goal.
- **Current evidence:** [1366×768 capture](screenshots/physique.png); first heading: “Your body, in perspective.”. Page-level H1 present.
- **Proposed layout:** Use a compact overview with essential measurements, latest check-in and direct entry to a comparison-first 3D workspace.
- **Primary action:** Record check-in.
- **Views retained:** blueprint, measurements, targets, history, 3d.
- **Acceptance:** All five views preserve their URLs and data ownership; model editing never overwrites recorded measurements.
- **Implementation:** P1; `src/components/Physique.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Assessment — `/wellness/assessment`

- **Job:** Complete and revisit a structured questionnaire.
- **Current evidence:** [1366×768 capture](screenshots/assessment.png); first heading: “Health Assessment”. No visible H1 in this captured main region.
- **Proposed layout:** Use a focused step flow, progress indicator and a clear historical results list.
- **Primary action:** New assessment.
- **Views retained:** questionnaire, results, history.
- **Acceptance:** Back navigation preserves answers; incomplete drafts and completed assessments are clearly different.
- **Implementation:** P2; `src/components/Assessment.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Training — `/wellness/training`

- **Job:** Start or resume today’s workout.
- **Current evidence:** [1366×768 capture](screenshots/training.png); first heading: “Training Matrix”. Page-level H1 present.
- **Proposed layout:** Lead with today’s planned session and Resume workout; put schedule, PRs and volume into supporting views.
- **Primary action:** Start workout.
- **Views retained:** schedule, logger, prs, overload, volume, sessions.
- **Acceptance:** Draft versus completed session is explicit; final submission and repeated retry do not duplicate the workout.
- **Implementation:** P2; `src/components/Training.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Strength — `/wellness/strength`

- **Job:** Review strength progression from recorded sets.
- **Current evidence:** [1366×768 capture](screenshots/strength.png); first heading: “Strength Metrics”. No visible H1 in this captured main region.
- **Proposed layout:** Use exercise selection, recent sets and one progression chart; coordinate naming and links with Training.
- **Primary action:** Log set.
- **Views retained:** log, progression, 1rm, fatigue, volume.
- **Acceptance:** Estimated 1RM is identified; missing reps/weight cannot appear as factual completed sets.
- **Implementation:** P2; `src/components/StrengthMetrics.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Nutrition — `/wellness/nutrition`

- **Job:** Log food and compare intake with chosen targets.
- **Current evidence:** [1366×768 capture](screenshots/nutrition.png); first heading: “Fueling Strategy”. Page-level H1 present.
- **Proposed layout:** Move Today’s diary and Log meal to the top; make the long macro calculator and explanatory content secondary.
- **Primary action:** Log meal.
- **Views retained:** daily, history, targets, calculator.
- **Acceptance:** Assumed calculator inputs are labelled; measured/profile values and estimates stay separate.
- **Implementation:** P2; `src/components/Nutrition.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Hydration — `/wellness/hydration`

- **Job:** Quickly record water and see the running total.
- **Current evidence:** [1366×768 capture](screenshots/hydration.png); first heading: “Hydration Tracker”. Page-level H1 present.
- **Proposed layout:** Lead with quantity presets, custom amount and a dated log; put hourly charts below the primary task.
- **Primary action:** Log water.
- **Views retained:** today, history, targets.
- **Acceptance:** Failed history cannot look like zero consumption; quantity, units, save acknowledgement and retry are clear.
- **Implementation:** P2; `src/components/HydrationTracker.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Health Sync — `/wellness/sync`

- **Job:** Understand device/import availability and next setup step.
- **Current evidence:** [1366×768 capture](screenshots/healthSync.png); first heading: “Pair a health companion”. No visible H1 in this captured main region.
- **Proposed layout:** Use a restrained setup page with supported sources, requirements and an actionable connection path where available.
- **Primary action:** View setup requirements.
- **Views retained:** devices, imports, history.
- **Acceptance:** Unavailable integration states do not present a working Connect action or invented readings.
- **Implementation:** P2; `src/App.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

## Workspace

### Overview — `/workspace/overview`

- **Job:** Resume work with minimal navigation.
- **Current evidence:** [1366×768 capture](screenshots/workspace.png); first heading: “Work, made clear”. Page-level H1 present.
- **Proposed layout:** Use today’s task queue, next calendar event and recent documents/notes; retain a single focused summary.
- **Primary action:** Open next task.
- **Views retained:** current default view.
- **Acceptance:** Summary links retain source context and do not recreate competing task or note stores.
- **Implementation:** P2; `src/components/WorkspaceHub.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Calendar — `/workspace/calendar`

- **Job:** Find a date or event and add one quickly.
- **Current evidence:** [1366×768 capture](screenshots/calendar.png); first heading: “Calendar”. Page-level H1 present.
- **Proposed layout:** Use a consistent view toolbar and an agenda alternative; collapse the detail rail on short or narrow laptops.
- **Primary action:** Add event.
- **Views retained:** month, week, agenda, connections.
- **Acceptance:** Keyboard-accessible dates/events, timezone labels and import previews are verified; event edits persist.
- **Implementation:** P2; `src/components/Calendar.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### My Files — `/workspace/files`

- **Job:** Find a file, inspect its details and upload securely.
- **Current evidence:** [1366×768 capture](screenshots/documents.png); first heading: “Documents”. No visible H1 in this captured main region.
- **Proposed layout:** Lead with files, search and filters; move storage statistics and security explanations to supporting details.
- **Primary action:** Upload file.
- **Views retained:** vault, providers, recent.
- **Acceptance:** Filename, size, source and upload state are readable; failed upload can be retried without false completion.
- **Implementation:** P2; `src/components/Documents.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Notes — `/workspace/notes`

- **Job:** Open or capture a note with reliable recovery.
- **Current evidence:** [1366×768 capture](screenshots/notes.png); first heading: “My Notes”. Page-level H1 present.
- **Proposed layout:** Keep a comfortable split list/editor, an explicit selected-note title and visible saved/draft state; use a back-to-list layout when space is tight.
- **Primary action:** New note.
- **Views retained:** all, pinned, tags, editor.
- **Acceptance:** Existing revisions, receipts, drafts, encrypted recovery and unsaved edits survive the redesign.
- **Implementation:** P2; `src/app/NotesRoute.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Tasks — `/workspace/tasks`

- **Job:** Find the next task and complete it.
- **Current evidence:** [1366×768 capture](screenshots/tasks.png); first heading: “Tasks Command”. Page-level H1 present.
- **Proposed layout:** Use a shared list toolbar, concise filter chips and a focused task detail drawer; keep board an optional view.
- **Primary action:** Add task.
- **Views retained:** today, upcoming, all, completed, list, board.
- **Acceptance:** Filter/sort selections survive opening a task; recurrence is only presented according to verified backend behavior.
- **Implementation:** P2; `src/components/Tasks.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Projects — `/workspace/projects`

- **Job:** Choose a project and see its next work.
- **Current evidence:** [1366×768 capture](screenshots/projects.png); first heading: “Projects Hub”. Page-level H1 present.
- **Proposed layout:** Separate personal projects from connected repositories with explicit source status; reduce decorative counters.
- **Primary action:** New project.
- **Views retained:** github, mine, grid, list.
- **Acceptance:** Offline repository data cannot appear current; project edits and child task links retain context.
- **Implementation:** P2; `src/components/Projects.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Timesheet — `/workspace/timesheet`

- **Job:** Start, stop and review a work session.
- **Current evidence:** [1366×768 capture](screenshots/timesheet.png); first heading: “Timesheet”. Page-level H1 present.
- **Proposed layout:** Keep one prominent timer and task/project context; separate running local draft, submitted session and earnings estimates.
- **Primary action:** Start timer.
- **Views retained:** timer, sessions, analytics.
- **Acceptance:** Navigation/reload preserve the intended timer state; submission acknowledgement and export scope are clear.
- **Implementation:** P2; `src/components/Timesheet.tsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Skills — `/workspace/skills`

- **Job:** Choose a learning goal and record practice.
- **Current evidence:** [1366×768 capture](screenshots/skills.png); first heading: “Skill Tree”. No visible H1 in this captured main region.
- **Proposed layout:** Lead with active skills and next practice; keep tree/radar as optional exploration.
- **Primary action:** Add skill.
- **Views retained:** tree, list, radar, history.
- **Acceptance:** Experience values identify their recorded source; a decorative level is not mistaken for assessed proficiency.
- **Implementation:** P2; `src/components/Skills.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Goals — `/workspace/goals`

- **Job:** Review next milestones and update progress.
- **Current evidence:** [1366×768 capture](screenshots/goals.png); first heading: “Goals”. No visible H1 in this captured main region.
- **Proposed layout:** Use active goals with next milestone/date, followed by completed history; make updates contextual.
- **Primary action:** New goal.
- **Views retained:** active, completed, archived.
- **Acceptance:** Manual and derived progress are identified; completion and reopening preserve their recorded history.
- **Implementation:** P2; `src/components/GoalsDashboard.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

## Life

### Overview — `/life/overview`

- **Job:** Resume a personal activity or find a saved item.
- **Current evidence:** [1366×768 capture](screenshots/life.png); first heading: “Room for the rest of life”. Page-level H1 present.
- **Proposed layout:** Use a small personal queue and recent items; avoid repeating the full Apps catalog.
- **Primary action:** Open next item.
- **Views retained:** current default view.
- **Acceptance:** Every summary opens its owning library or place; private data stays scoped to the owner.
- **Implementation:** P2; `src/components/LifeCommand.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Social — `/life/social`

- **Job:** Manage saved profile links and manual figures.
- **Current evidence:** [1366×768 capture](screenshots/social.png); first heading: “Social profiles”. Page-level H1 present.
- **Proposed layout:** Use a concise profile list with edit details; clearly distinguish manual records from connected provider analytics.
- **Primary action:** Add profile.
- **Views retained:** profiles, analytics, connections.
- **Acceptance:** No provider-connect or automated-growth claim appears unless an authorized working integration exists.
- **Implementation:** P2; `src/components/SocialMedia.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Entertainment — `/life/entertainment`

- **Job:** Add a title or continue something in progress.
- **Current evidence:** [1366×768 capture](screenshots/entertainment.png); first heading: “Entertainment Tracker”. Page-level H1 present.
- **Proposed layout:** Put the library, search and Continue queue first; move Add title into a focused form and statistics into their view.
- **Primary action:** Add title.
- **Views retained:** library, stats, sync.
- **Acceptance:** Watch/read status, rating and date are usable on keyboard; sync/import states identify their source.
- **Implementation:** P2; `src/components/Entertainment.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Maps & Places — `/life/places`

- **Job:** Find a saved place or deliberately record location.
- **Current evidence:** [1366×768 capture](screenshots/maps.png); first heading: “Maps & places”. Page-level H1 present.
- **Proposed layout:** Use a map/list switch with a shared selection and compact privacy controls.
- **Primary action:** Save place.
- **Views retained:** map, list, timeline, privacy.
- **Acceptance:** Location stays opt-in, approximate/precise choices are clear, and a list alternative works without the map.
- **Implementation:** P2; `src/components/Maps.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Family Connect — `/life/family`

- **Job:** Open a family workflow while retaining app context.
- **Current evidence:** [1366×768 capture](screenshots/family.png); first heading: “One Ultimate workspace”. Page-level H1 present.
- **Proposed layout:** Use the common companion frame; inside the companion prioritize tree, selected person and a searchable member list.
- **Primary action:** Open family tree.
- **Views retained:** tree, memories, vault, timeline.
- **Acceptance:** Inner canvas and forms are separately verified with a test identity; no legacy data migration is assumed.
- **Implementation:** P3; `src/components/UnifiedWorkspace.jsx`.
- **Coverage:** Browser-inspected host frame with deliberately offline fixture; inner product requires independent verification.

## Hub

### Overview — `/hub/overview`

- **Job:** Understand service state and reach settings/tools.
- **Current evidence:** [1366×768 capture](screenshots/hub.png); first heading: “Your operating center”. Page-level H1 present.
- **Proposed layout:** Lead with actionable unavailable items, then account/configuration and recent system activity; keep raw detail optional.
- **Primary action:** Review connection.
- **Views retained:** current default view.
- **Acceptance:** Status refers to a dated probe; failure has a meaningful next action rather than an ambiguous badge.
- **Implementation:** P2; `src/components/HubCommand.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Apps — `/hub/apps`

- **Job:** Find a module without scanning the full catalog.
- **Current evidence:** [1366×768 capture](screenshots/apps.png); first heading: “App Hub.”. Page-level H1 present.
- **Proposed layout:** Move search and area filters to the first screen, use compact searchable rows and keep pinned tools distinct from companion apps.
- **Primary action:** Find tool.
- **Views retained:** modules, favorites, external.
- **Acceptance:** All 60 canonical destinations remain reachable; duplicate Overview labels include their area.
- **Implementation:** P2; `src/components/AppLauncher.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Apps Suite — `/hub/companion`

- **Job:** Choose between the five companion products.
- **Current evidence:** [1366×768 capture](screenshots/companion.png); first heading: “One Ultimate workspace”. Page-level H1 present.
- **Proposed layout:** Use a concise service list with current status, data ownership and clear Open actions; keep runtime instructions in diagnostics.
- **Primary action:** Open product.
- **Views retained:** all, finsync, oxfin, equity, forex, family.
- **Acceptance:** Unavailable, authentication-required and connected states differ; embedded and native workflows are not misrepresented as migrated.
- **Implementation:** P3; `src/components/UnifiedWorkspace.jsx`.
- **Coverage:** Browser-inspected host frame with deliberately offline fixture; inner product requires independent verification.

### Agents — `/hub/agents`

- **Job:** Ask a question with clear model and context boundaries.
- **Current evidence:** [1366×768 capture](screenshots/ai.png); first heading: “GrowthTrack AI”. Page-level H1 present.
- **Proposed layout:** Prioritize a simple composer, model readiness and selected context; put advanced settings/history in secondary panels.
- **Primary action:** Start conversation.
- **Views retained:** chat, history, context, settings.
- **Acceptance:** An unavailable model blocks sending with a clear reason; selected private context is visible before submission.
- **Implementation:** P2; `src/components/AiDashboard.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Databases — `/hub/databases`

- **Job:** Choose a data source and inspect records safely.
- **Current evidence:** [1366×768 capture](screenshots/databases.png); first heading: “Databases”. No visible H1 in this captured main region.
- **Proposed layout:** Separate custom editable tables from the read-only system console; use source tabs, a table list and explicit permissions.
- **Primary action:** Choose database.
- **Views retained:** custom, application, imports.
- **Acceptance:** An editable cell cannot appear in read-only sources; source identity and row counts remain clear.
- **Implementation:** P2; `src/components/Databases.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Profile & Settings — `/hub/settings`

- **Job:** Edit a specific account preference without a long form.
- **Current evidence:** [1366×768 capture](screenshots/profile.png); first heading: “A considered space for your details.”. Page-level H1 present.
- **Proposed layout:** Use clear settings sections, concise titles and section-level save feedback; avoid requesting unrelated sensitive fields up front.
- **Primary action:** Save section.
- **Views retained:** personal, physical, security, appearance, integrations.
- **Acceptance:** Dirty/saving/saved/error are visible; theme, language, units and session controls retain their behavior.
- **Implementation:** P2; `src/components/ProfileEditor.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Notifications — `/hub/notifications`

- **Job:** Act on or dismiss a reminder and review its source.
- **Current evidence:** [1366×768 capture](screenshots/notifications.png); first heading: “Notifications”. Page-level H1 present.
- **Proposed layout:** Use a clean inbox with source filter and a detail view; move preference editing outside the reading flow.
- **Primary action:** Open reminder.
- **Views retained:** unread, all, preferences.
- **Acceptance:** Unread, dismissed, failed-load and empty states differ; batch actions disclose exactly what they affect.
- **Implementation:** P2; `src/components/NotificationCenter.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Helpdesk — `/hub/help`

- **Job:** Find an answer about a specific workflow.
- **Current evidence:** [1366×768 capture](screenshots/help.png); first heading: “Understand your workspace”. Page-level H1 present.
- **Proposed layout:** Lead with search and a few task-based guides; keep diagnostics as a separate supporting section.
- **Primary action:** Search help.
- **Views retained:** guides, troubleshooting, diagnostics.
- **Acceptance:** Links open current routes and explain unavailable integrations accurately; keyboard search is usable.
- **Implementation:** P2; `src/components/Helpdesk.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Logs — `/hub/logs`

- **Job:** Inspect an event, filter a period or export evidence.
- **Current evidence:** [1366×768 capture](screenshots/logs.png); first heading: “Audit Logs”. No visible H1 in this captured main region.
- **Proposed layout:** Use the shared ledger toolbar with grouped filters and an optional event drawer; move test logging out of everyday use.
- **Primary action:** Filter events.
- **Views retained:** activity, authentication, sync.
- **Acceptance:** Timestamp, owner/source and export range remain accurate; UI cleanup does not delete audit events.
- **Implementation:** P2; `src/components/Logs.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### About — `/hub/about`

- **Job:** Check version, capabilities and notices.
- **Current evidence:** [1366×768 capture](screenshots/about.png); first heading: “GrowthTrackDigital Twin Engine”. No visible H1 in this captured main region.
- **Proposed layout:** Replace the decorative gradient hero with a readable compact product summary and grouped technical details.
- **Primary action:** View capabilities.
- **Views retained:** version, capabilities, licenses.
- **Acceptance:** Version matches runtime; capability labels do not imply unfinished human realism or unavailable integrations.
- **Implementation:** P2; `src/components/About.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

### Plans — `/hub/plans`

- **Job:** Understand this deployment’s available capabilities.
- **Current evidence:** [1366×768 capture](screenshots/pricing.png); first heading: “Plans & capabilities”. Page-level H1 present.
- **Proposed layout:** Use a plain capability/status list and connection settings link; keep the current honest no-billing state.
- **Primary action:** Manage connections.
- **Views retained:** capabilities, billing.
- **Acceptance:** Checkout or upgrade actions appear only when backed by configured billing capabilities.
- **Implementation:** P2; `src/components/Pricing.jsx`.
- **Coverage:** Browser-inspected default state and source/routing inventory; other data states and nested views remain acceptance work.

## Public pages

- **Welcome — `/welcome`**: Retain the calm editorial introduction; make owner sign-in obvious and ensure the overview remains readable on a short laptop. [Capture](screenshots/public-welcome.png).

- **Owner sign-in — `/login`**: Keep the labeled sign-in form high enough for the submit action to remain visible; test password visibility, failure, keyboard submission and safe return destinations. [Capture](screenshots/public-login.png).

- **Privacy — `/privacy`**: Keep readable line length and an accessible contents list; verify deployment-specific statements independently of styling. [Capture](screenshots/public-privacy.png).

- **Terms — `/terms`**: Retain current content and accessible reading navigation; legal edits require their own review. [Capture](screenshots/public-terms.png).

## Embedded companion route inventory

These 41 source-reviewed inner routes/screens are separate from the browser-reviewed host wrappers. They require isolated authenticated inspection before their styling begins. They are included in the plan, not marked visually accepted.

- **FinSync `/auth/ultimate/callback`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/apps/web/app/auth/ultimate/callback/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/analytics`** — Name the question, period, units and data source; offer accessible chart alternatives. Source: `FinSync/apps/web/app/dashboard/analytics/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/bills`** — Lead with due date and status; keep capture/import review separate from confirmation. Source: `FinSync/apps/web/app/dashboard/bills/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/budget`** — Use a month-scoped budget ledger and focused category form; preserve product-specific calculations. Source: `FinSync/apps/web/app/dashboard/budget/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/cards`** — Lead with account identity, balances and dated activity; keep editing and transfer actions distinct. Source: `FinSync/apps/web/app/dashboard/cards/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/investments`** — Identify valuation date, source and assumptions; distinguish recorded holdings from estimates. Source: `FinSync/apps/web/app/dashboard/investments/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard`** — Reduce duplicate host/product chrome, preserve primary workflow and add consistent laptop/empty/error layouts. Source: `FinSync/apps/web/app/dashboard/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/profile`** — Use focused settings sections with explicit save and connection states. Source: `FinSync/apps/web/app/dashboard/profile/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/settings`** — Use focused settings sections with explicit save and connection states. Source: `FinSync/apps/web/app/dashboard/settings/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/transactions`** — Use a readable transaction list, shared filter language and contextual details; retain source attribution. Source: `FinSync/apps/web/app/dashboard/transactions/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/dashboard/wallets`** — Lead with account identity, balances and dated activity; keep editing and transfer actions distinct. Source: `FinSync/apps/web/app/dashboard/wallets/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/forgot-password`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/apps/web/app/forgot-password/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/login`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/apps/web/app/login/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/onboarding`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/apps/web/app/onboarding/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/`** — Reduce duplicate host/product chrome, preserve primary workflow and add consistent laptop/empty/error layouts. Source: `FinSync/apps/web/app/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/signup`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/apps/web/app/signup/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **FinSync `/test-dashboard`** — Treat as a development/test destination; verify whether it belongs in user navigation before any redesign. Source: `FinSync/apps/web/app/test-dashboard/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/auth/error`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/OxFin/ox-fin-web/src/app/auth/error/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/auth/ultimate/callback`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `FinSync/OxFin/ox-fin-web/src/app/auth/ultimate/callback/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/bills`** — Lead with due date and status; keep capture/import review separate from confirmation. Source: `FinSync/OxFin/ox-fin-web/src/app/bills/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/cards`** — Lead with account identity, balances and dated activity; keep editing and transfer actions distinct. Source: `FinSync/OxFin/ox-fin-web/src/app/cards/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/dashboard`** — Reduce duplicate host/product chrome, preserve primary workflow and add consistent laptop/empty/error layouts. Source: `FinSync/OxFin/ox-fin-web/src/app/dashboard/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/investments`** — Identify valuation date, source and assumptions; distinguish recorded holdings from estimates. Source: `FinSync/OxFin/ox-fin-web/src/app/investments/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/`** — Reduce duplicate host/product chrome, preserve primary workflow and add consistent laptop/empty/error layouts. Source: `FinSync/OxFin/ox-fin-web/src/app/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/settings`** — Use focused settings sections with explicit save and connection states. Source: `FinSync/OxFin/ox-fin-web/src/app/settings/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/transactions`** — Use a readable transaction list, shared filter language and contextual details; retain source attribution. Source: `FinSync/OxFin/ox-fin-web/src/app/transactions/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **OxFin `/wallets`** — Lead with account identity, balances and dated activity; keep editing and transfer actions distinct. Source: `FinSync/OxFin/ox-fin-web/src/app/wallets/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **Equity Lens `/auth/ultimate/callback`** — Keep identity and return destination clear; use compact labeled forms and explicit loading/error/retry states. Preserve each product’s authentication boundary. Source: `Equity/NiftyLens/src/app/auth/ultimate/callback/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **Equity Lens `/`** — Reduce duplicate host/product chrome, preserve primary workflow and add consistent laptop/empty/error layouts. Source: `Equity/NiftyLens/src/app/page.tsx`. Coverage: Source-reviewed route; authenticated inner UI not certified by this research.

- **Family Connect `/`** — Keep a concise overview, a clear next action and readable laptop navigation. Source: `Family Connect/familyconnect/frontend/src/pages/LandingPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/auth`** — Explain sign-in or expired handoff and retain a clear route back to Ultimate. Source: `Family Connect/familyconnect/frontend/src/pages/AuthPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/auth/ultimate/callback`** — Explain sign-in or expired handoff and retain a clear route back to Ultimate. Source: `Family Connect/familyconnect/frontend/src/pages/UltimateCallbackPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/dashboard`** — Keep a concise overview, a clear next action and readable laptop navigation. Source: `Family Connect/familyconnect/frontend/src/pages/DashboardPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/tree`** — Prioritize the tree canvas, selected-person inspector, fit/search and a keyboard-usable member-list alternative. Source: `Family Connect/familyconnect/frontend/src/pages/TreeCanvasPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/timeline`** — Use dated events with filters and a list alternative; preserve person context. Source: `Family Connect/familyconnect/frontend/src/pages/TimelinePage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/media`** — Use an accessible media library with upload progress, selection and recoverable errors. Source: `Family Connect/familyconnect/frontend/src/pages/MediaPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/members`** — Keep identity and relationship context visible; open detailed editing in a focused panel. Source: `Family Connect/familyconnect/frontend/src/pages/MembersPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/events`** — Use dated events with filters and a list alternative; preserve person context. Source: `Family Connect/familyconnect/frontend/src/pages/EventsPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/profile/:id`** — Keep identity and relationship context visible; open detailed editing in a focused panel. Source: `Family Connect/familyconnect/frontend/src/pages/ProfilePage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Family Connect `/settings`** — Group privacy, family access and connection settings with explicit save state. Source: `Family Connect/familyconnect/frontend/src/pages/SettingsPage.tsx`. Coverage: Route and source inventory; no authenticated family records opened.

- **Forex `/`** — Use a compact currency/model/date control area, separate historical fit from forward forecast and preserve provenance, assumptions and unavailable-model states. Source: `Forex/app/dashboard.py`. Coverage: Source-reviewed Streamlit dashboard; model behavior and predictions were not evaluated.

## Shared overlays and non-route surfaces

Include the command palette, module drawer, account menu, settings modal, Quick Capture, check-in dialog, onboarding, confirmation dialogs, toasts, file/import previews, Notes recovery/history and 3D setup/share/export dialogs. Reuse route-specific visual rules and test focus return, Escape, dirty-state protection and error recovery. Do not remove a non-route workflow because it is absent from the feature registry.
