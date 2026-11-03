# Navigation usability and rendering work: impact analysis

## Delivered scope

This pass builds on the existing Overview, SearchField and DataTable edits described in [the earlier report](2026-11-03-overview-ui-impact.md). Those edits are preserved. The new changes are confined to Ultimate's command palette, shared dialog focus hook and virtual-table hook, plus regression tests and generated inventories.

| Finding | Change | User-visible effect |
| --- | --- | --- |
| Palette results have negative tabindex but were included as Tab boundaries | Filter the dialog's focus candidates to actual tab stops, accounting for hidden ancestors, disabled fieldsets and inert content | Tab and Shift+Tab remain inside the palette; closing returns focus to the trigger |
| Search Enter could execute quick capture while an IME was confirming text | Ignore composing events and key code 229 | Confirming composed text does not navigate or save |
| Fixed-height results could push controls below a short window | Move palette layout into its owned stylesheet, cap the dialog by viewport height, keep results independently scrollable, allow footer wrapping | Search, close control and keyboard hints have reserved space; input can shrink on narrow screens |
| Palette sits outside the shell that sizes header controls | Give close-search its own 44px target and explicit input/button focus outlines | A larger close target and visible keyboard focus in both presentation styles |
| Result removal could leave aria-activedescendant pointing to a missing option | Clamp the active index to the current list and announce result counts | Keyboard selection stays valid after source updates; empty results are announced |
| Mounted, closed palette ranked records on source updates | Return an empty list before capture parsing and ranking while closed | Search recomputes from current records when opened |
| Virtual scrolling repeatedly scanned all row keys for unchanged focus | Cache focused index by keys/focused key; reuse viewport state when geometry and focus are unchanged | Focused unsaved edits remain mounted without the repeated lookup or identical-state commits |

## Production reach

| Changed source | Verified consumers | Risk / review priority |
| --- | --- | --- |
| `components/CommandPalette.jsx` and `.css` | Palette mounted by `App.jsx` in the authenticated shell | High reach: verify Ctrl/Cmd+K, search, quick capture, Escape and short-window layout |
| `hooks/useDialogFocus.js` | CommandPalette, PremiumSidebar, FloatingPillDock, SettingsModal, Documents, FileVaultPreview, AvatarCreationWizard, OnboardingWizard, SocialShareModal, shared Modal and DetailPanel | High reach: check nested dialogs, initial focus, Tab wrap, trigger restoration and responsive drawers. KineticProvider also subscribes to dialog state; its tests pass |
| `hooks/useVirtualTableRows.ts` | Shared DataTable; direct callers are CustomerAdminPage, native ModuleUI and the development gallery | Medium reach: virtualization applies above 50 supplied rows. Verify sorting/filtering and focused edits with live variable-height content |

These are source-observed production dependencies. The existing `impact:ui` generator traces the isolated preview catalog and its RecordsTable imports: its 65 pages, 205 destinations and 54 potential table pages / 181 views are **preview inventory estimates**, not the production DataTable dependency count or browser coverage. Production reach is described separately above.

Routes, authentication, permissions, data stores and API contracts are unchanged. No customer records, demo fixtures, dependencies, database migrations or deployments are introduced. FinSync/OxFin customer applications retain their independent builds. Layout rules are owned by CommandPalette rather than appended to global override styles.

## Optimization limits

- Closed-palette result derivation now returns immediately, but store subscriptions remain mounted. Opening still performs the existing bounded search and ranking.
- Stable-focus scroll updates reuse the focused-row index. Focus or row-order changes can still require O(N) lookup; key/height changes rebuild offsets as before.
- A regression test checks committed renders for repeated identical viewport observations and confirms that genuine scrolling still changes the visible window. Another preserves the same focused input and its unsaved value after row reordering.
- Memoization assumes immutable source collections. No browser timing, memory, frame-rate or production throughput improvement is claimed.

## Verification

- Production Ultimate build and isolated design-preview build passed.
- 79 tests passed across 12 production suites: palette, dialog focus, virtual table, shared foundation, responsive foundation, sidebar, kinetic motion, floating companion, Overview, entry and sign-out.
- 1,005 design-preview tests passed across six suites. This is automated fixture coverage, not visual sign-off.
- All six gateway tests passed.
- Targeted ESLint for changed palette/dialog JavaScript and their tests passed without output.
- Design adapters and all 23 generated application READMEs verified.
- Design inventories, UI impact map and UI handoff regenerated and drift-checked.
- Synthetic scale checks completed for 10,000 records and 24,600 review records. They exclude DOM/rendering, network and concurrent users and are not a benchmark of the changed hooks.

## Remaining review and known limitations

The computer-use inventory returned no apps or browsers: the native pipe and browser access host were unavailable. Browser review therefore remains pending. Check the palette at 390px width, short landscape height, 1024/1280/1440/1920px desktop widths, both themes, compact density, zoom, reduced motion and forced colors. Include actual IME input, virtual keyboard resizing, nested dialogs and long labels. Human page approval remains separate.

The existing palette still searches only the first 50 pending tasks and first 30 records in each other supported collection before ranking. Expanding search coverage needs an explicit indexing/large-collection design; this pass does not claim complete record search.

The earlier workspace check reported one historical 3D plan-preview failure because its embedded humanoid model hash differs from the current GLB. That asset/generator is outside this change and was not modified or rerun in this pass.
