# Shared Component Inventory

| Component | Current source | Migration role | Status |
| --- | --- | --- | --- |
| AppShell | `src/App.jsx` | Owns routing context, domain accent, visual stage, and responsive frame | In progress |
| PrimaryRail | `src/components/PremiumSidebar.jsx` | Product-area navigation and mobile dock | In progress |
| SecondaryNavigation | `src/components/PremiumSidebar.jsx` / `src/components/SectionNavigation.jsx` | Grouped, overflow-safe module navigation | In progress |
| Breadcrumbs | `src/components/Breadcrumbs.jsx` | Ultimate → area → screen context | In progress |
| PageHeader | `src/components/ui/PageHeader.jsx` | Apple-like title hierarchy and actions | In progress |
| CommandSearch | `src/components/CommandPalette.jsx` | Global search and keyboard command entry | Existing |
| StatusPill | `src/components/Header.jsx` | Connected/offline state | Existing |
| MetricCard | `src/components/ui/StatCard.jsx` | Numeric summaries with semantic accents | In progress |
| DataTable | Existing screen tables | Readable financial/workspace records | Pending screen migration |
| LoadingState / EmptyState / ErrorState / OfflineState | Existing page-state utilities | Non-blank resilient states | In progress |
| VisualStage | `src/components/visual/VisualStage.jsx` | Lumion depth with WebGL-safe fallback | Existing |
| ResponsiveTabList | Screen-specific tab lists | Grouped responsive sub-navigation | Pending screen migration |
| ProfileMenu | Header/settings flow | Profile and settings access | Existing |

## Retirement rule

Legacy styles are retired only after all consumers of the affected component pass route, interaction, accessibility, and visual checks.
