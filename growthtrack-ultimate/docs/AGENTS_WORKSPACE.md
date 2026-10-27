# Agents workspace

Open `/Ultimate/hub/agents`. Chat, Activity, Context, and Settings have separate
URL views. Drafts and conversation stay in memory while switching these views;
leaving the module or changing accounts clears them.

The chat toolbar includes the model selector. The laptop layout keeps the
introduction, four starters, and composer visible at the checked laptop sizes,
including 1152×648, 1280×720, and 1366×650. Controls retain 44px targets.
Narrow screens use a single column. Light, dark, reduced-motion, keyboard, and
forced-color paths are covered by the scoped browser checks.

Ask answers general questions, explains concepts, helps with writing/code/math,
and uses a public guide to link to the app's actual pages. General questions do
not require sharing private records. Responses support safe Markdown, tables,
lists, and code blocks; generated HTML and remote images are not executed or
loaded.

Insights adds analysis of explicitly shared sources. In Context, select a
workspace overview for aggregate task, goal, habit, and time-session coverage,
or select individual records for detailed questions. Wellness, finance, and
journal overviews require their category opt-in as well as overview selection.
Additional sources include notes, projects, calendar, skills, file metadata,
nutrition, workouts, moods, vitals, medications, budgets, subscriptions,
portfolio holdings, shopping, and entertainment where owned records are loaded.

Overviews cover the currently loaded owner-filtered subset. They preserve
missing values, separate currencies and measurement units, label date coverage,
and avoid claiming partial logs are complete daily intake or full account data.
No overview authorizes an update to an individual record. General answers may
be wrong or outdated; the agent has no live web search, arbitrary database
access, or automatic access to unshared companion data.

## Asking and applying changes

Ask streams a response. Plan & act prepares proposed changes to tasks, goals,
habits, or notes. No proposal is preselected. Choose actions, review the exact
fields, then apply them. Saved means the existing record API acknowledged the
change. Failed writes are not automatically retried.

Existing records must be explicitly selected in Context before a model can
propose updates to them. Sensitive categories also require a category opt-in.
The runner checks the account, session, context snapshot, and record version
before saving through the existing app commands. It rejects stale records and
duplicate attempts. The model has no database or arbitrary tool access.

## Connection

See the [server configuration and API contract](../server/agents/README.md).
Qwen and OpenAI GPT-OSS remain selectable when the configured Groq account
permits them. Setup keeps the key in the ignored server `.env`, and the API
must restart after changing that key.

## Verification

Agents unit and browser tests use synthetic owners, mocked provider responses,
and intercepted record APIs. They do not import Prisma or `server.js`, migrate
schemas, use the application database, or make live model requests.

The browser suite covers all four views at nine viewport sizes, draft and model
selection retention, model failure/recovery, explicit action confirmation,
acknowledged fixture persistence after reload, and invalid model references.
Evidence is retained under `artifacts/agents-acceptance` and
`artifacts/agents-laptop-final`. The setup panel has an additional short-laptop
check under `artifacts/agents-setup-final`.

On 2026-10-27: 111 focused Vitest tests, one isolated authentication/mount test,
and all six Chromium browser cases passed. The setup case passed again after
the final setup-panel spacing change. Scoped ESLint, TypeScript checking, and
the production build passed; the build retains the existing large 3D chunk
warning. The live UI URL and changed UI source modules returned HTTP 200.

On 2026-10-28, the expanded question/insights flow passed seven browser cases
and focused unit checks for calculations, missing values, ownership, source
revocation, general/app prompts, and safe answer formatting. Both configured
Groq models also completed a live synthetic check for arithmetic, real app
links, the exact Context-to-Insights workflow, task counts, and missing-data
disclosure. No private application records were sent in those live checks.
