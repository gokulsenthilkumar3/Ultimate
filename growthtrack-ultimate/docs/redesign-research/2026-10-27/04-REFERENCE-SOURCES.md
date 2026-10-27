# Reference research

Checked on 27 October 2026. These references inform interaction patterns; they are not a recommendation to copy entire applications or add new dependencies. Proposed adaptations below are design inferences, not user-test results. No source is quoted verbatim.

- **R1: [Blender: viewport navigation](https://docs.blender.org/manual/en/latest/editors/3dview/navigate/introduction.html)**
  - Observed pattern: Visible orientation, orbit, pan and zoom controls supplement gestures and hardware-specific shortcuts.
  - Proposed adaptation: Provide visible fit/front/side/back and zoom actions for laptop trackpads; avoid requiring a numpad or middle mouse button.
  - Evidence: Official indexed documentation; direct fetch failed, so only the returned indexed navigation description was used.

- **R2: [Blender: contextual sidebar](https://docs.blender.org/manual/en/latest/editors/3dview/sidebar.html)**
  - Observed pattern: Item, Tool and View separate object properties from tool and camera settings.
  - Proposed adaptation: Keep the body inspector contextual and move camera/render settings out of measurement editing.
  - Evidence: Official indexed documentation.

- **R3: [Linear: display options](https://linear.app/docs/display-options)**
  - Observed pattern: Grouping, ordering and layout options belong to the active view and can be retained as personal preferences.
  - Proposed adaptation: Use a stable list toolbar and optional saved view preferences without proliferating permanent page controls.
  - Evidence: Official documentation opened during this research.

- **R4: [Actual Budget: transaction filters](https://actualbudget.org/docs/transactions/filters/)**
  - Observed pattern: Composable filters support focused transaction summaries and saved selections.
  - Proposed adaptation: Keep ledger search and active filters visible; show advanced filter construction on request and validate resulting totals independently.
  - Evidence: Official documentation opened during this research. Its documented limitations are not adopted as requirements.

- **R5: [Cronometer: chart library](https://support.cronometer.com/hc/en-us/articles/360029490111-Charts-Chart-Library)**
  - Observed pattern: Time-series charts are selected by recorded biometric or nutrient, with optional configurable charts.
  - Proposed adaptation: Keep logging separate from exploration; name the measurement, date range, units and source for each wellness chart.
  - Evidence: Official documentation opened during this research; used for interaction design, not medical interpretation.

- **R6: [Notion: views, filters and sorts](https://www.notion.com/help/views-filters-and-sorts)**
  - Observed pattern: View configuration and record opening are distinct; records may open in a side panel, centered panel or full page.
  - Proposed adaptation: Keep list context when inspecting tasks/files/notes; use a full-page or stacked alternative on narrow screens.
  - Evidence: Official indexed documentation.

- **R7: [FullCalendar: accessibility](https://fullcalendar.io/docs/accessibility)**
  - Observed pattern: Calendar headings and interactive events need deliberate keyboard and labeling behavior.
  - Proposed adaptation: Test every date/event action, supply an agenda alternative and verify focus order rather than assuming a calendar grid is accessible.
  - Evidence: Official indexed documentation. This is a reference pattern, not a dependency recommendation.

- **R8: [W3C: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)**
  - Observed pattern: Ordinary content must reflow at 320 CSS pixels without losing information or functionality; essential two-dimensional surfaces have exceptions.
  - Proposed adaptation: Test the UI around 3D/maps/tables at zoom and narrow widths; the canvas exception does not exempt its surrounding forms and buttons.
  - Evidence: Official W3C explanatory document opened during this research.

- **R9: [W3C: focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)**
  - Observed pattern: Author-created sticky elements must not completely hide a focused control.
  - Proposed adaptation: Review header, inspector, mobile dock and dialogs with keyboard navigation; prefer full focused-control visibility as a product target.
  - Evidence: Official W3C explanatory document opened during this research.

- **R10: [W3C: target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)**
  - Observed pattern: WCAG 2.2 AA defines 24 CSS pixel targets with specified exceptions; larger targets support easier activation.
  - Proposed adaptation: Retain this app’s stronger 44 CSS pixel control target; do not shrink controls to fit a laptop.
  - Evidence: Official W3C explanatory document opened during this research.

## Existing project sources

- `src/config/featureRegistry.ts`: 60 canonical destinations and 191 secondary-view entries.
- `src/App.jsx`: actual module ownership and shared Finance/Insights/companion surfaces.
- `src/components/Physique.jsx`, `ScrollShowcase.jsx`, `HumanoidViewer.tsx`: 3D entry hierarchy and inspector behavior.
- `src/components/physique/ParametricAvatarStudio.jsx`: artistic shape document and export distinctions.
- `src/lib/headFeatureRegistry.js`: supported versus unavailable head controls.
- `docs/SCREEN_DESIGN_REFERENCE.md` and `docs/DESIGN_SYSTEM.md`: conflicting historical visual directions.
- `docs/real-human-3d/IMPLEMENTATION_PROGRESS.md`: historical asset gates; older counts and claims are not treated as a fresh baseline.
- `src/styles/unified-workspace.css`: companion iframe sizing.

The authoritative browser capture is [browser-evidence.json](browser-evidence.json). Optional unavailable services are fixture conditions, not production outages.
