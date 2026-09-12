# Design & Architecture System v2 — implementation tasks

Source: the supplied “GrowthTrack Ultimate — Design & Architecture System v2” brief.

## Completed in this pass

- [x] Establish one structural neutral palette for dark and light themes.
- [x] Add semantic domain accents for Today, Body, Wellness, Insights, Workspace, Money, Life, and System.
- [x] Make the active domain accent available to the application shell.
- [x] Consolidate the default UI type family to the strict Outfit, Inter, system stack.
- [x] Add shared motion durations/easing and reduced-motion rules.
- [x] Document canonical entity ownership and mutation boundaries.
- [x] Keep the 3D Mirror as the dedicated material/depth surface.
- [x] Make Insights Progress and Goals read-only summaries linking to the owning modules.
- [x] Rename GitHub-adjacent labels to My Files, Repositories, and Release History where those surfaces are exposed.
- [x] Order profile writes and preserve array/object shapes for user-owned slices.
- [x] Add an explicit GitHub repository sync/retry state with normalized usernames.
- [x] Make the task creation sheet theme-aware so opening it cannot dim or recolor the page incorrectly.
- [x] Separate persistent errors from CRUD confirmations and system notifications.
- [x] Apply the strict admin dashboard palette: emerald actions, slate/white surfaces, and semantic status colors.
- [x] Keep the desktop shell to one primary sidebar and top command bar; use breadcrumbs for page context instead of a duplicate tab navigator.

## Next implementation queue

- [ ] Migrate remaining legacy module accents and inline glass styles to semantic shell tokens.
- [ ] Route Training and Strength through one shared set/log mutation path.
- [ ] Move remaining module-specific feedback calls to the shared CRUD/notification helpers.
- [ ] Add a per-entity schema note and mutation hook for every collection.
- [ ] Verify 3D Mirror isolation against the neutral canvas on desktop and mobile.
- [ ] Verify keyboard, screen-reader, reduced-motion, and forced-colors behavior for every migrated screen.

Each queue item should ship with a focused test or runtime check. Do not introduce a second data field or direct API write when the owning entity already has a store/API path.
