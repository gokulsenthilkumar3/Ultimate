# Design & Architecture System v2 — implementation tasks

Source: the supplied “GrowthTrack Ultimate — Design & Architecture System v2” brief.

## Completed in this pass

- [x] Establish one structural neutral palette for dark and light themes.
- [x] Add semantic domain accents for Today, Body, Wellness, Insights, Workspace, Money, Life, and System.
- [x] Make the active domain accent available to the application shell.
- [x] Consolidate the default UI type family to one Inter/system stack.
- [x] Add shared motion durations/easing and reduced-motion rules.
- [x] Document canonical entity ownership and mutation boundaries.
- [x] Keep the 3D Mirror as the dedicated material/depth surface.

## Next implementation queue

- [ ] Migrate legacy module accents and inline glass styles to semantic shell tokens.
- [ ] Make Insights Progress and Goals read-only summaries linking to the owning modules.
- [ ] Rename GitHub-adjacent labels to My Files, Repositories, and Release History.
- [ ] Route Training and Strength through one shared set/log mutation path.
- [ ] Split CRUD confirmations, persistent errors, notifications, and background sync into separate components.
- [ ] Add a per-entity schema note and mutation hook for every collection.
- [ ] Verify 3D Mirror isolation against the neutral canvas on desktop and mobile.
- [ ] Verify keyboard, screen-reader, reduced-motion, and forced-colors behavior for every migrated screen.

Each queue item should ship with a focused test or runtime check. Do not introduce a second data field or direct API write when the owning entity already has a store/API path.
