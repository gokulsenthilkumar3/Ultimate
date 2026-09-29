# Responsive components foundation

## Integration

The main styles entry must import `src/styles/responsive-foundation.css` **after** legacy CSS. This change does not modify App, navigation metadata, stores, provider adapters, or legacy styles. Mount `PremiumSidebar` and `FloatingPillDock` inside the existing Router and shell; only one navigation surface renders at a time.

```js
// src/styles/app-styles.css (owned by main)
// @import './responsive-foundation.css'; // after existing imports
```

`gt-responsive-foundation` is a named layer with new `gt-navigation-*`, `gt-mobile-*`, and component selectors. It uses existing `--gt-*` tokens with solid defaults. A small bridge, scoped to `.app-shell:has(.gt-app-navigation, .gt-mobile-navigation)`, aligns main/header logical offsets and hides the legacy `.command-subnav` strip. Important shell overrides extend the existing `legacy` layer: important priority reverses layer order, so an unlayered important override would lose to legacy important padding. Unlayered bridge rules contain only new offset tokens and strip visibility. Remove that bridge when the shell migration lands. It does not suppress each module's local view tabs. Minimum target sizes, reduced motion, forced colors, safe-area insets, and narrow-view reflow are in this stylesheet. Table overflow stays inside its keyboard-reachable region. At 200% browser zoom the CSS viewport determines the appropriate navigation mode.

## Navigation

| File | API / behavior |
| --- | --- |
| `src/components/PremiumSidebar.jsx` (+ `.d.ts`) | `activeTab`, optional `user: {name?, fullName?}`, `onOpenSettings()`, `onLogout()`. >=1024: rail + collapsible active-area modules; 640–1023: rail + dismissible, focus-trapped module drawer. A persistent Modules control opens/reopens the panel. |
| `src/components/FloatingPillDock.jsx` (+ `.d.ts`) | `activeTab`. <=639: first four saved areas + explicit More button. More searches modules across all six areas and preserves saved module order. Escape/backdrop/route/viewport changes dismiss overlays. |
| `src/components/ui/useNavigationFoundation.js` | Internal shared model and `useNavigationMode(): 'mobile' \| 'compact' \| 'desktop'`. Reads store preferences and `navigationGroups`, normalizes order; never writes preferences in effects. |
| `src/components/ui/useNavigationOverlay.js` | Internal transient overlay state. Route/query/hash/viewport changes dismiss overlays before paint; desktop preferences stay separate. |

Finance is first by default. Valid saved area order wins, including the four mobile destinations; missing areas append in default order. Home IDs are `finance`, `overview`, `wellness`, `workspace`, `life`, `hub`. Insights aliases resolve through `tabMeta`, without indexing `TABS.insights`. All destination URLs come from `tabMeta(id).canonicalPath`. Primary areas are Router `Link`s; modules are `NavLink`s. Primary `aria-current="location"` tracks the active area even on a module deep link; module `aria-current="page"` follows the Router. Settings, logout, search, collapse, and More remain buttons. Desktop collapse uses `setSidebarCollapsed` only on explicit interaction; compact drawer visibility never overwrites the saved desktop preference.

Legacy `setActiveTab`/`onTabChange` props are accepted for source compatibility but not invoked. The Router/main effect must synchronize the active ID from location; links must not also call a navigation callback. Existing sidebar tests that render without a Router or expect destination buttons need migration by their owner. Built-in groups and modules come from the live registry, including all ten Finance destinations and Calendar/My Files/Notes.

`setSidebarCollapsed(value)` may return a promise. Sidebar awaits it, catches rejection from close/toggle/retry, shows a local alert, and retries the exact failed value. The store remains responsible for preference persistence and rollback. Pending requests are guarded; no success notification is manufactured. The store must return its persistence promise for this recovery to observe a failure (a detached fire-and-forget rejection cannot be caught by the component).

## Templates

`src/components/ui/PageTemplate.tsx` exports default `PageTemplate` and `CommandPage`, `RecordPage`, `AnalyticsPage`, `DetailPage`, `SettingsPage`, `ImmersivePage`. Named presets take `Omit<PageTemplateProps, 'type'>`. The default takes:

```ts
type PageTemplateType = 'command' | 'record' | 'analytics' | 'detail' | 'settings' | 'immersive';
interface PageTemplateProps {
  type: PageTemplateType;
  title: string;
  children: ReactNode;
  subtitle?: string; accent?: string; icon?: ReactNode;
  actions?: ReactNode; status?: ReactNode;
  summary?: ReactNode; toolbar?: ReactNode; aside?: ReactNode;
  className?: string; headingLevel?: 1 | 2;
}
```

These render an existing PageHeader, summary, toolbar, content, and optional related-information aside without nesting `<main>`. The six types have distinct content layouts: command/analytics grids, record flow, bounded settings/detail widths, and an immersive stage. Below 1024px the aside stacks. `headingLevel=2` supports embedded use; the normal page owns one h1. Data, loading state, forms, and mutations stay with the module.

## Data and form primitives

All new `.tsx` files export their exact prop interfaces beside their default component. Import directly from the paths below; no provider is required beyond navigation's existing Router/store.

| File | Exported API |
| --- | --- |
| `src/components/ui/DataTable.tsx` | `DataTableProps<T>`, `DataColumn<T>`, `TableSort`. Required `caption`, `rows`, `columns`, `rowKey(row): string`; optional `rowLabel`, controlled `sort`, `onSortChange`, `manualSort`, controlled `selectedKeys`/`onSelectionChange`, `state: ready/loading/error/offline`, `onRetry`, `emptyMessage`. |
| `src/components/ui/FilterBar.tsx` | `FilterBarProps`: `label?`, `searchLabel?`, `query?`, `onQueryChange?`, `resultCount?`, `children?`, `actions?`, `onReset?`, `activeFilters?: {id,label,onRemove}[]`. Controls wrap; labels for child inputs remain the caller's responsibility. |
| `src/components/ui/DetailPanel.tsx` | `DetailPanelProps`: required `open`, `title`, `onClose`, `children`; optional `actions`, `variant: drawer/inline` (default drawer). Drawer traps/restores focus, closes on Escape/backdrop, scrolls its body. Inline is a labelled aside. |
| `src/components/ui/FileUploader.tsx` | `FileUploaderProps`: required `onFilesSelected(files: File[]): void \| Promise<void>`; optional `label`, `hint`, `accept` (extensions/exact MIME/MIME wildcard), `multiple`, `maxFiles` (1 or 10), `maxSizeBytes` (20MiB), `disabled`. Native picker and drop zone validate the full batch before callback; pending selection is guarded and async errors are announced. |
| `src/components/ui/ConnectionCard.tsx` | `ConnectionCardProps`, `ConnectionStatus`. Required `title`, `status: disconnected/connecting/connected/error/unavailable`; optional `description`, `icon`, `error`, `lastSynced`, `onConnect`, `onDisconnect`, `onRetry`, `children`. Unavailable exposes no fake connect action. |
| `src/components/ui/DraftIndicator.tsx` | `DraftIndicatorProps`: required `status: clean/dirty/saving/saved/error/offline`; optional `savedAt`, `error`, `onRetry`. Caller supplies persistence evidence; no automatic success timer. |
| `src/components/ui/FormError.tsx` | `FormErrorProps`: `id?`, `children?`, `errors?: {fieldId,message}[]`, `title?`. Renders nothing without an error; summaries focus matching invalid fields. Use `aria-invalid` and `aria-describedby` on fields. |

DataTable columns require `id`, `header`, `accessor(row): string | number | null | undefined`; optional `render`, `sortable`, `compare`, `align: start/end`. Sorting is stable and never mutates supplied rows. With `manualSort` the caller handles server sorting. Without controlled `sort`, the component keeps local sort and still notifies `onSortChange`. Selection is controlled; Select all visible preserves keys for rows on other pages. Use the existing `Pagination` below the table for pagination. Loading/error/offline can retain supplied rows; empty state appears only when ready with no rows. Row-specific navigation uses caller-rendered Router links, not implicit row click handlers.

FileUploader reports **selection/processing**, not successful upload. The caller performs uploads and supplies their status separately. `accept` is a client hint and validation convenience; server-side validation stays with the backend. ConnectionCard and DraftIndicator render only supplied states. Invoke provider callbacks through an adapter that handles promise errors and updates props.

## Updated existing primitives

`src/components/ui/Tabs.jsx` (+ `Tabs.d.ts`) preserves `label`, `tabs: {value,label,description?,panelId?,disabled?}[]`, `value`, `onChange`, `className?`, `idPrefix?`, `onKeyDown?`. Adds optional `dir: ltr/rtl`, `orientation: horizontal/vertical`, `activation: automatic/manual`. Without a custom `onKeyDown`, arrows wrap and skip disabled tabs; Home/End jump to the first/last enabled tab. Horizontal arrows follow inherited/explicit RTL. Default automatic activation changes selection and focus together; manual activation focuses until Enter/Space/click. A custom handler owns all keyboard behavior to avoid double selection. Invalid/disabled selection falls back to the first enabled tab as the keyboard entry point. Callers render labelled panels using `panelId` and `aria-labelledby`.

`src/components/ui/PageState.jsx` (+ `PageState.d.ts`) retains existing states and retry semantics; title/description/onRetry are optional. `src/components/ui/PageHeader.jsx` corrects the object-props JSDoc for typed consumers without changing runtime API. `src/components/ui/SearchField.jsx` (+ `SearchField.d.ts`) makes clear/count optional and preserves external descriptions alongside result counts. TextField and SelectField already provide field errors; FormError supplies reusable summaries and processing errors. Navigation uses a default desktop server snapshot and observes resize as a fallback in environments without matchMedia.

## Scoped checks

```sh
npx vitest run --config vitest.config.ts src/components/PremiumSidebar.foundation.test.jsx src/components/ui/responsive-foundation.test.jsx src/components/ui/responsive-layout.test.jsx src/components/ui/foundation.test.jsx src/tests/designSystem.test.jsx
```

New regression coverage: canonical links, default/saved order, module inventory, responsive boundary transitions, compact/desktop collapse behavior, focus restoration and trapping, all-area search, tab keyboard/RTL/disabled handling, six template slots, table sorting/selection/states, filter actions, drawer dismissal, file validation/failure, form-error focus, and no manufactured provider/save success.

The node-environment layout test uses the installed Playwright Chromium runtime and flattens the real `app-styles.css` imports in their layer order. It renders real primitives to static markup, with navigation CSS fixtures; actual navigation interactions are covered by the Router/store tests. Geometry checks include six viewport sizes, RTL/collapsed offsets, 44px controls, forced colors, reduced motion, solid surfaces, safe-area fallback, and the equivalent CSS viewport of 200% page zoom. No app server or database is involved.

## Exact foundation file inventory

All paths below are relative to `D:/Projects/Tracker/growthtrack-ultimate`. Six existing files were modified; twenty files were added. The main-owned stylesheet entry, registry, stores, modules, and navigation integration test are excluded from this inventory.

```text
Modified:
src/components/PremiumSidebar.jsx
src/components/FloatingPillDock.jsx
src/components/ui/PageHeader.jsx
src/components/ui/PageState.jsx
src/components/ui/SearchField.jsx
src/components/ui/Tabs.jsx

Added:
src/components/PremiumSidebar.d.ts
src/components/PremiumSidebar.foundation.test.jsx
src/components/FloatingPillDock.d.ts
src/components/ui/ConnectionCard.tsx
src/components/ui/DataTable.tsx
src/components/ui/DetailPanel.tsx
src/components/ui/DraftIndicator.tsx
src/components/ui/FileUploader.tsx
src/components/ui/FilterBar.tsx
src/components/ui/FormError.tsx
src/components/ui/PageTemplate.tsx
src/components/ui/PageState.d.ts
src/components/ui/SearchField.d.ts
src/components/ui/Tabs.d.ts
src/components/ui/useNavigationFoundation.js
src/components/ui/useNavigationOverlay.js
src/components/ui/responsive-foundation.test.jsx
src/components/ui/responsive-layout.test.jsx
src/styles/responsive-foundation.css
docs/COMPONENTS.md
```
