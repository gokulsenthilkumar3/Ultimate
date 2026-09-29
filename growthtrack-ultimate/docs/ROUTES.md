# Route and page inventory

`src/config/featureRegistry.ts` is the source of truth. The configured deployment
base (default `/Ultimate/`) prefixes every client path; paths below are shown
without that base. Area roots redirect to the area overview. `?view=<id>` is
accepted only when the feature registry lists that view; legacy module IDs and
known hashes redirect to canonical routes while preserving unrelated filters.
The login return destination retains its path, query, and hash.

| Area | Canonical modules |
| --- | --- |
| Finance | `/finance/overview`, `/finance/transactions`, `/finance/analytics`, `/finance/trends`, `/finance/budgeting`, `/finance/subscriptions`, `/finance/portfolio`, `/finance/sip`, `/finance/shopping`, `/finance/sync` |
| Insights | `/insights/overview`, `/insights/actions`, `/insights/current`, `/insights/analytics`, `/insights/dashboards`, `/insights/progress`, `/insights/forecast` |
| Wellness | `/wellness/overview`, `/wellness/sleep`, `/wellness/lifestyle`, `/wellness/mind`, `/wellness/medical`, `/wellness/health`, `/wellness/habits`, `/wellness/physique`, `/wellness/assessment`, `/wellness/training`, `/wellness/strength`, `/wellness/nutrition`, `/wellness/hydration`, `/wellness/sync` |
| Workspace | `/workspace/overview`, `/workspace/calendar`, `/workspace/files`, `/workspace/notes`, `/workspace/tasks`, `/workspace/projects`, `/workspace/timesheet`, `/workspace/skills`, `/workspace/goals` |
| Life | `/life/overview`, `/life/social`, `/life/entertainment`, `/life/places` |
| Hub | `/hub/overview`, `/hub/apps`, `/hub/agents`, `/hub/databases`, `/hub/settings`, `/hub/notifications`, `/hub/help`, `/hub/logs`, `/hub/about`, `/hub/plans` |

Public paths are `/welcome`, `/privacy`, `/terms`, and `/login`. An unknown
module renders Not Found with recovery navigation; `/wellness/sync` truthfully
shows setup required. Registry view IDs are a navigation contract, not proof
that every legacy module already has a distinct fully migrated tab. Check the
implementation status before claiming feature completion.

Navigation at `<640px` offers four saved primary areas plus searchable More for
all six; `640–1023px` uses a rail and module drawer; `>=1024px` uses rail and
collapsible module navigation. Module destinations are links; local view changes
use accessible tabs where migrated. The numeric viewport mode is shared by
navigation and shell CSS so WebKit's rounded 640px media-query boundary cannot
hide both navigation surfaces.

