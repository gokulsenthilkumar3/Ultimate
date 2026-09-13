# Entity ownership map

| Entity | Owning UI | API route | Zustand owner |
|---|---|---|---|
| User/profile | Profile | `/api/user` | `user` |
| Theme/preferences | Profile / shell | `/api/preferences` | `theme`, `palette` |
| GitHub profile link | Profile | `/api/user` → `socialLinks` | `user.socialLinks` |
| GitHub repositories | Projects | GitHub REST API / OAuth | Projects query state |
| Manual projects and repository notes | Projects | `/api/user` JSON singletons | `user.manualProjects`, `user.repoNotes` |
| Body measurements | Physique / Progress | body-profile and metric routes | `bodyProfile`, `metric_logs` |
| Tasks | Tasks | `/api/tasks` | `user.tasks` plus query cache |
| Training sessions and sets | Training | workout routes | `workouts` |
| Strength analysis | Strength | reads workout/strength routes | derived workout data |
| Goals and milestones | Goals | goals and progress routes | `goals` |
| Finance transactions | Finance | finance collection route | `finance.transactions` |
| Portfolio holdings | Portfolio | user portfolio singleton | `portfolio` |
| Habits and logs | Habits | habit routes | `habits` |
| Sleep | Sleep | sleep routes | `sleep_logs` |
| Nutrition | Nutrition | nutrition routes | `nutrition_logs` |
| Calendar events | Workspace / Calendar | `/api/calendar_events` | `calendar_events` |
| Documents | Workspace / Documents | `/api/documents` | `documents` |
| Notes | Workspace / Notes | `/api/notes` | `notes` |
| Notifications | Notifications | notification routes | notification hook state |

Known boundary: Tasks still has a screen query cache alongside Zustand. The current write path keeps optimistic records visible without waiting for a duplicate fallback request; a later migration should replace this with one query/mutation abstraction.
