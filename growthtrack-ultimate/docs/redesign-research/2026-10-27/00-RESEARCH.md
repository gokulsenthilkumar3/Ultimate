# GrowthTrack redesign research

Date: 27 October 2026. Status: research complete for the host-page baseline; implementation plan awaiting approval.

## Confirmed product direction

The user chose body tracking and Current-versus-Goal comparison as the leading 3D experience, and refinement of the current calm editorial style. These are direction choices, not implementation approval. No application code or database changes were made for this research.

## Research coverage

- 60 canonical app routes captured at 1366×768 using isolated synthetic fixtures.
- 191 secondary-view registry entries inventoried, including their owning pages; not all individually exercised.
- 15 additional Physique captures: five main views, eight inspector sections, parametric editing at 1366×768 and 1280×720.
- Four signed-out pages captured: welcome, login, privacy and terms.
- 41 embedded-product routes/screens inventoried from source; authenticated inner-product review remains a required later gate.
- Current source and earlier design/asset documents cross-checked. Official interaction/accessibility references inform proposed adaptations.

The preceding responsive implementation remains the baseline, including compact laptop navigation. This research does not reclassify those earlier changes as a completed redesign.

## Findings and design decisions

### F1 — The model is below the initial laptop viewport (P1)

**Observed:** At 1366×768 the 3D entry screenshot shows the page title, five-view tabs, a second introduction, person card and editor selector; the model is below the visible bottom edge.

**Proposed:** Combine identity, saved state and workspace selection into compact controls and put the model in the first screen.

**Evidence:** [local evidence](screenshots/physique-3d.png).

### F2 — 3D controls compete across several control systems (P1)

**Observed:** The captured Measure state contains 119 visible DOM controls across the scrollable page, and Face contains 137. Controls counted include inputs, links, summary toggles and tabs; these are scope indicators, not a usability score.

**Proposed:** Keep Current/Goal/Compare as the main mode switch and use a task-based inspector; retain specialist controls in secondary studio sections.

**Evidence:** [local evidence](browser-evidence.json).

### F3 — Measurements expose a large editing surface (P1)

**Observed:** The synthetic populated Measurements view contains 182 visible DOM controls and a 2026px document height at 1366×768.

**Proposed:** Open Essentials first; use region selection, search and a focused guidance panel; preserve all existing fields and unit parsing.

**Evidence:** [local evidence](screenshots/physique-measurements.png).

### F4 — Recorded values and artistic edits need clearer context (P1)

**Observed:** Body tracker and Parametric human editor are separate switches. Source explicitly stores artistic shape controls separately and gives the parametric editor three export formats.

**Proposed:** Use clearly named body tracking and appearance workspaces with persistent person/context labels; preserve independent records.

**Evidence:** [local evidence](../../../src/components/physique/ParametricAvatarStudio.jsx).

### F5 — Page hierarchy and visual language vary across modules (P2)

**Observed:** 21 of the 60 inspected default pages expose no visible H1 in the captured main region. Editorial pages coexist with blue utility controls, large gradient banners and legacy uppercase titles. H1 presence is a semantic consistency finding, not proof of accessibility conformance.

**Proposed:** Use the existing editorial tokens and shared page header; reconcile the conflicting historical design documents.

**Evidence:** [local evidence](browser-evidence.json).

### F6 — Daily logging can be displaced by secondary tools (P2)

**Observed:** Nutrition’s first screen contains the macro calculator and BMR explanation rather than Log meal; captured document height is 2876px.

**Proposed:** Lead with the diary and logging action; place calculator assumptions and educational content in secondary views.

**Evidence:** [local evidence](screenshots/nutrition.png).

### F7 — App discovery requires a long catalog scan (P2)

**Observed:** App Hub contains 153 visible DOM controls over a 4285px captured document; search/area discovery comes after pinned tools and companion introductions.

**Proposed:** Bring search and area filters into the first screen; use compact results and disambiguate Overview by area.

**Evidence:** [local evidence](screenshots/apps.png).

### F8 — Some screens have overlapping jobs (P2)

**Observed:** Lifestyle and Habits both present Habit Matrix; five domain overviews, Apps, Apps Suite and companion pages create several navigation summaries.

**Proposed:** Give every route a distinct purpose while retaining current URLs; do not merge stores or delete destinations during styling work.

**Evidence:** [local evidence](browser-evidence.json).

### F9 — Companion wrappers add their own chrome and vertical constraints (P3)

**Observed:** UnifiedWorkspace adds a second header and toolbar; its iframe style has a 700px minimum height. This audit deliberately shows offline companion fixtures, not authenticated inner products.

**Proposed:** Use a compact host frame and separately verify each embedded product, authentication flow and scrolling behavior.

**Evidence:** [local evidence](../../../src/styles/unified-workspace.css).

## Preserve what already works

Preserve canonical routes and aliases, the laptop navigation behavior, semantic tokens, local owner authentication and CSRF, ownership boundaries, existing drafts and Notes revision recovery, finance calculations, unit conversion, date handling, independent Current/Goal documents, 3D fallback, protected captures/exports and capability-based unavailable states. Redesigning a surface is not authorization to rewrite its storage contract.

## Evidence limits

- Synthetic empty/default records and explicit unavailable service fixtures; no owner records opened or modified.
- 60 host routes and 15 additional Physique/editor states were captured. The 191 secondary-view entries were inventoried, not all browser-exercised.
- Companion inner routes are source-reviewed only; authenticated screenshots and functional acceptance remain required before their implementation.
- This is an expert design review and source comparison, not a participant usability study, physical-device certificate or human-model realism certification.
- Some initial captures include transient loading states. Targeted recaptures wait for loading indicators; unavailable fixture services remain deliberately unavailable.

## Review files

- [Page-by-page backlog](01-PAGE-BY-PAGE.md)
- [3D workflow and layout plan](02-3D-PLAN.md)
- [Implementation sequence and approval boundary](03-IMPLEMENTATION-PLAN.md)
- [Reference sources](04-REFERENCE-SOURCES.md)
- [Interactive review board](index.html)
- [Structured plan](research-plan.json)
