> Supplied design brief, preserved from the user-provided text file on 28 October 2026. This proposal is not a record of rendered review or page approval. See [implementation decisions and current scope](../plans/2026-10-28-proposal-implementation.md).

# GrowthTrack Ultimate — UI redesign proposal

**Basis and caveats.** I'm working from the handoff, the review prompt and the manifest you supplied. I do **not** have the rendered `admin-demo` in a browser, so nothing below is a pixel review or a claim about what currently renders. It is a redesign **proposal** grounded in the documented statuses (`working-demo`, `partial-layout`, `layout-proposal`, `setup-layout`, `schematic-layout`, `public-layout`). Every frame below still needs the R01–R13 browser passes and your page-by-page approval before it becomes a production decision. I'm keeping the agreed direction you already locked: light workspace, dark forest sidebar, matching dark mode, comfortable/compact density, desktop-first with a responsive fallback.

---

## 0. What the redesign must fix

From the handoff, the real design debt isn't colour or spacing — it's **semantic**. The recurring failure mode is *"a rendered route and a changed title do not establish that the tab's specialised function exists."* So the redesign has three jobs, in priority order:

1. **Make scope honest.** A `setup-layout` screen must not look like a working integration. A `layout-proposal` must not look like a finished workflow. Introduce a visible scope/status layer (§2.5).
2. **Give every tab a distinct primary artifact.** If a tab has no unique input, output or data object, it should be a filter/segment of its parent — not a tab. This kills the "layout-only" problem structurally rather than page by page (§6).
3. **Consolidate the shell and primitives** so the 65 pages stop drifting into per-module palettes and one-off tables.

---

## 1. Design principles

| Principle | What it means in practice |
|---|---|
| **One shell, domain content** | Navigation, header, tabs, tables, dialogs, status and empty/loading/error states are shared. Domains own only their artifact and controls. |
| **Honest by default** | Every screen states its scope (Demo / Setup / Preview / Live) and its data provenance. No fictional number looks like a real one. |
| **Tab = artifact** | A tab earns its place by a distinct object, input or output. Otherwise it's a segment. |
| **List → detail, always** | Directory-style domains (customers, files, notes, projects) use the same master/detail frame. |
| **Density is a token, not a rewrite** | Comfortable/compact changes row height, padding and type leading via tokens only. |
| **Recoverable, not dead-end** | Every empty, error, denied or unavailable state offers the next action. |
| **Desktop-first, not desktop-only** | 1024–1920 primary; 390 fallback is a real, tested collapse — not an afterthought. |

---

## 2. Design system

Semantic tokens live centrally (`portal.css`), domains consume them. The values below are **starting proposals** for your taste review, not final.

### 2.1 Colour and themes

**Light theme**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F8F6` | App background (warm off-white) |
| `--surface` | `#FFFFFF` | Cards, tables, dialogs |
| `--surface-2` | `#EEF2EE` | Subtle insets, hover rows |
| `--border` | `#E1E7E2` | Dividers, table rules |
| `--border-strong` | `#C9D3CB` | Input outlines |
| `--text` | `#15211B` | Primary text |
| `--text-2` | `#5A6B61` | Secondary, captions |
| `--text-3` | `#87968C` | Disabled, placeholders |
| `--sidebar` | `#0F2119` | Dark forest rail |
| `--sidebar-text` | `#DCE8E0` | Rail labels |
| `--sidebar-active` | `#1C3A2B` | Active nav pill |
| `--accent` | `#1F8A5B` | Primary action, focus ring |
| `--accent-hover` | `#17734B` | Hover |
| `--success` | `#1E8E5A` | Positive |
| `--warning` | `#B7791F` | Caution |
| `--danger` | `#C0392B` | Destructive, error |
| `--info` | `#2B6CB0` | Neutral notice |

**Dark theme**

| Token | Value |
|---|---|
| `--bg` | `#0C1410` |
| `--surface` | `#13201A` |
| `--surface-2` | `#1A2A22` |
| `--border` | `#24362C` |
| `--border-strong` | `#34503F` |
| `--text` | `#E8F0EB` |
| `--text-2` | `#9DB0A6` |
| `--text-3` | `#6C8078` |
| `--sidebar` | `#0A120E` |
| `--accent` | `#3BA876` |
| `--success` | `#34A870` |
| `--warning` | `#D9A441` |
| `--danger` | `#E06A5E` |
| `--info` | `#5A9BD8` |

Rules:
- Sidebar is always the forest token family in both themes; only the surrounding workspace flips.
- Financial/market direction uses **semantic** colours (positive/negative), never accent, so a green accent doesn't falsely imply "gain".
- All text meets WCAG AA on its surface at both densities; verify the `--text-3`/`--surface-2` pair in browser.

### 2.2 Typography

Inter, bundled locally. Numerals in tables and money use `font-feature-settings: "tnum" 1` so columns align.

| Role | Size / line | Weight |
|---|---|---|
| Display | 34 / 40 | 600 |
| H1 (page title) | 28 / 36 | 600 |
| H2 (section) | 22 / 30 | 600 |
| H3 (card title) | 18 / 26 | 600 |
| Body | 14 / 22 | 400 |
| Body-strong | 14 / 22 | 600 |
| Small / meta | 13 / 20 | 400 |
| Caption / badge | 12 / 16 | 500, slight tracking |
| Mono (IDs, keys) | 13 / 20 | 400 (JetBrains Mono or system mono) |

### 2.3 Spacing, density, grid

- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64`.
- Density tokens: comfortable row `48px`, cell pad `12/16`; compact row `36px`, cell pad `8/12`. Body leading drops from 22→20 in compact. Nothing else changes.
- Content max width `1360px`; gutters `24px` at ≥1280, `16px` below.
- 12-column grid inside content; two-pane master/detail uses `360px` master + fluid detail (min detail `640px`).

### 2.4 Elevation, radius, motion

- Radius: `8px` controls, `12px` cards, `16px` dialogs, `999px` pills.
- Elevation: `0` flat, `1` `0 1px 2px rgba(15,33,25,.06)`, `2` `0 4px 16px rgba(15,33,25,.10)`, dialog `0 24px 64px rgba(15,33,25,.24)`.
- Motion: `120ms` micro (hover/press), `200ms` layout (drawer, tab), `240ms` dialog. Respect `prefers-reduced-motion: reduce` → all to `0ms`. No parallax or springy motion in data tables.

### 2.5 Status and scope system — the honesty layer

This is the most important new primitive. Every screen header carries a **scope badge**, and every data region carries a **provenance chip**.

Scope badges (top-right of page header):

| Badge | Meaning | Style |
|---|---|---|
| `LIVE` | Real API, permissioned | solid success |
| `DEMO` | Fictional local data | outline info + "Sample data" tooltip |
| `SETUP` | Connection not established | outline warning + "Not connected" |
| `PREVIEW` | Layout proposal, no workflow | outline neutral + "Concept" |

Provenance chips inside data regions: `Sample`, `Not connected`, `Read-only`, `Unavailable`, `Stale · <time>`. This directly implements the handoff's demand that "concepts not be mistaken for connected services," and it's the cheapest fix for a large share of the current ambiguity.

---

## 3. App shell and navigation

Current shell (224px sidebar, 64px top bar, <960px drawer) is fine to keep; the redesign is in **information architecture** and **section chrome**.

### 3.1 Two-level rail

Primary rail (always visible, 224px; collapses to 64px icon rail with tooltips):

```
┌───────────────────────────────────────────┐
│  ▣  GrowthTrack            ⌕   ⊕   ◐  ◯  │  ← top bar 64px
├──────────────┬────────────────────────────┤
│  Overview    │  Customers                 │  ← section sub-nav
│  Customers  ◀│   FinSync                  │
│  Finance     │   OxFin                    │
│  Growth      │   All customers            │
│  Work        │                            │
│  Life        │  ┌──────────────────────┐  │
│  Insights    │  │ page header + tabs   │  │
│  Platform    │  ├──────────────────────┤  │
│              │  │ content              │  │
│              │  │                      │  │
│  ─────────   │  │                      │  │
│  ⚙ Settings  │  └──────────────────────┘  │
└──────────────┴────────────────────────────┘
```

- The 7 primary areas map to the owner batches and the product boundaries: **Customers** (B01) is first-class, not buried under Platform, because it is Ultimate's customer-admin home.
- Sub-nav appears only for areas with children; otherwise the content uses the full width.
- At <960px the rail becomes a drawer; at <720px the sub-nav becomes a horizontal scroll strip.
- **Search** (`⌕`) is global (pages, customers, tasks, notes); `⊕` is a context-aware quick-add; `◐` toggles theme; `◯` is the avatar/account menu containing density, notifications and sign-out.

### 3.2 Page header contract

Every page: title, one-line purpose, scope badge, primary action (when appropriate), overflow menu (secondary actions), then the tab row if tabs exist. Breadcrumb only where depth > 2. This is the "clear title, purpose, primary action, scope, content region, recovery path" contract from the handoff, made concrete.

---

## 4. Shared component contracts

| Component | Contract |
|---|---|
| **Button** | `primary` / `secondary` / `ghost` / `danger`; sizes `sm` (32), `md` (40). Icon-only requires `aria-label`. |
| **DataTable** | Server-shaped: `columns`, `rows`, `sort`, `pagination {offset, limit, total}`, `selection`, `emptyState`, `loadingState`, `errorState`. Row max 100/page; page size 25/50/100. Sticky header. Tabular numerals. Local scroll only (page never scrolls horizontally). |
| **FilterBar** | Search + typed filters + saved views. Empty filter result shows "No matches — clear filters" recovery. |
| **Tabs** | URL-backed. Changing tab preserves filters and scroll where sensible. Closing an overlay on navigation is mandatory. |
| **Dialog / Drawer** | Focus trap, focus restore to trigger, Escape, `aria-modal`, scroll lock via the existing ref-counted hook. |
| **StatusPill** | `neutral / success / warning / danger / info` × `solid / soft`. |
| **ScopeBadge / ProvenanceChip** | See §2.5. |
| **Money / Number** | Right-aligned, tabular, currency-aware, negative in parentheses in finance contexts. |
| **Empty / Loading / Error / Denied / Unavailable** | Five distinct, non-interchangeable states. Loading uses skeleton rows (not spinners for tables). Error names the failed operation and offers Retry. Denied explains the scope, no data leaks. Unavailable (provider down) keeps the last known timestamp. |
| **Toast** | Only for completed mutations; never for "saved" of fictional data — use a provenance chip instead. |

---

## 5. Page frames

Frames are ASCII schematics of layout and hierarchy, not visual comps. They apply the shell and primitives above.

### 5.1 Canonical master/detail (used across B01, B04, B06)

```
┌ Page header: Title            [DEMO]      [Primary] [⋯] ┐
├─────────────────────────────────────────────────────────┤
│ [FilterBar: search][filter][filter][saved view ▾]       │
├───────────────┬─────────────────────────────────────────┤
│ Master list   │ Detail pane                             │
│ ┌───────────┐ │ ┌─────────────────────────────────────┐ │
│ │ row       │ │ │ Header: name · status pill · meta   │ │
│ │ row ◀ sel │ │ ├─────────────────────────────────────┤ │
│ │ row       │ │ │ Section A (summary cards)           │ │
│ │ ...       │ │ │ Section B (table / timeline)        │ │
│ └───────────┘ │ │ Section C (notes / activity)        │ │
│ pagination    │ └─────────────────────────────────────┘ │
└───────────────┴─────────────────────────────────────────┘
```

Used for: customers (B01), notes/files/projects (B04), family members + vault (B06).

### 5.2 Customer administration (B01) — `finsync`, `oxfin`, `customers`

The current demo is fictional; the production frame must make **product/tenant scope** and **read-only vs mutate** unmistakable.

```
┌ FinSync customers                        [DEMO]  [Export] ┐
│ Administer FinSync customer records. Product scope: FinSync│
├───────────────────────────────────────────────────────────┤
│ Tabs:  Directory · Activity · Support                      │
├───────────────────────────────────────────────────────────┤
│ [Search name/email] [Status ▾] [Plan ▾] [Saved view ▾]     │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Name        Email            Status   Plan    Last    │ │
│ │ ─────────────────────────────────────────────────────  │ │
│ │ A. Rao      a.rao@…          Active   Pro     2d ago  │ │
│ │ …                                              [ ]sel  │ │
│ └───────────────────────────────────────────────────────┘ │
│ 25 rows · page 1/4 · [prev][next]                          │
└───────────────────────────────────────────────────────────┘
```

- Product scope is stated in the subtitle **and** reinforced by a product chip in every detail header. Never let a FinSync record appear in an OxFin view.
- `Activity` is a redacted event timeline; `Support` is a notes composer + history. Both carry `Read-only` chips until I03 ships mutations.
- The overflow menu's destructive/entitlement actions are disabled with a "Requires admin permission" tooltip until I02/I03 exist — the UI must not imply capability it lacks.
- A planned namespace switch (`/admin/customers/:product`) is an implementation detail; the frame doesn't change.

### 5.3 Personal finance (B02) — ledger-first

```
┌ Transactions                  [DEMO]              [+ Add] ┐
├───────────────────────────────────────────────────────────┤
│ Summary:  Income ₹X · Expenses ₹Y · Net ₹Z   (tabular)     │
│ Tabs:  All · Income · Expenses                             │
│ [Search][Date ▾][Category ▾][Direction ▾]                  │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Date   Description      Category   Direction  Amount  │ │
│ │ ─────────────────────────────────────────────────────  │ │
│ │ 28 Oct Grocery          Food       Expense   −1,240.00│ │
│ └───────────────────────────────────────────────────────┘ │
│ Totals row reflects the **filtered** set, not global.      │
└───────────────────────────────────────────────────────────┘
```

Critical finance rules: totals are computed from the filtered set and labelled as such; amount precision fixed (2 dp); dates use UTC keys as the handoff already enforces; empty filter shows recovery. Budgeting, Subscriptions, Portfolio, SIP and Shopping reuse this frame with domain-specific artifact columns — they do **not** get their own shell.

### 5.4 Markets — Equity and Forex (B02/B05)

```
┌ Equity                      [PREVIEW · no live feed]      ┐
├───────────────────────────────────────────────────────────┤
│ [Instrument search ▾]  [Charts|Indices|Options|Chain]      │
│ ┌───────────────────────────────┬───────────────────────┐ │
│ │ Chart (candles/line)          │ Watchlist             │ │
│ │                               │  NIFTY   …            │ │
│ │                               │  BANKNIFTY …          │ │
│ ├───────────────────────────────┴───────────────────────┤ │
│ │ Chain table: strike | OI | ΔOI | IV | LTP | volume     │ │
│ └───────────────────────────────────────────────────────┘ │
│ As-of: <timestamp> · Sample data · No orders              │
└───────────────────────────────────────────────────────────┘
```

- Selected market context is persistent and visible in the header (symbol + expiry + as-of time).
- Numeric tables use tabular numerals, right alignment, and a fixed decimal policy per column.
- Forex gets the same frame with a **model/uncertainty** strip: model name, horizon, evaluation window, uncertainty band, and an explicit `Unavailable` state when Python services or artifacts are absent. The handoff is emphatic that uncertainty and unavailable states must be honest.

### 5.5 Growth and Physique (B03)

Growth pages share a summary-and-routine frame:

```
┌ Sleep                       [DEMO]                         ┐
│ Log · Trends · History                                    │
├───────────────────────────────────────────────────────────┤
│ [Last night card] [7-day trend] [Target vs actual]        │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Log table (date, bedtime, wake, duration, quality)    │ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

**Physique** is the one page with a genuinely specialised workspace. Proposed frame:

```
┌ Physique      [DEMO · schematic]        [Save profile] [⋯]┐
│ Blueprint · Measurements · Targets · History · 3D          │
├──────────────┬────────────────────────────┬───────────────┤
│ Context      │ Viewer (SVG schematic)     │ Inspector     │
│ Current ◉    │  ┌──────────────────────┐  │ Height  …     │
│ Goal    ○    │  │                      │  │ Shoulder …    │
│              │  │   figure + outline   │  │ Chest   …     │
│ Saved:       │  │                      │  │ Waist   …     │
│  v3 · 2d ago │  └──────────────────────┘  │ (bounded      │
│  v2 · 5d ago │  [Zoom − +] [Front/Side]   │  sliders)     │
│              │  [Compare ◉]               │ [Reset]       │
├──────────────┴────────────────────────────┴───────────────┤
│ Draft ≠ saved banner · Save writes labelled sample JSON     │
└────────────────────────────────────────────────────────────┘
```

- Current and Goal are independent drafts with a clear **dirty vs saved** distinction (the handoff calls for this explicitly).
- 150 ms outline debounce is invisible to the user but keeps sliders smooth.
- The `3D` tab is labelled **schematic**; GLB export is present but `Unavailable` with a clear reason. Do not style the schematic to look like a WebGL render — that's precisely the "concept mistaken for shipped" trap.
- Targets, Measurements and History are real tabs because each has a distinct artifact (goals table, measurement log, version list).

### 5.6 Workspace (B04)

- **Tasks** is the model: filter segments (Today/Upcoming/All/Completed) plus two presentations (List / Board). List rows carry a checkbox, title, due, priority, project; Board columns are status lanes. Same data, two views — a legitimate tab pair.
- **Timesheet** must be split per the handoff: `Timer` (deadline/paused state, ring or progress), `Sessions` (table of completed sessions with start/end/duration/project), `Analytics` (hours by day/project, distinct chart contract). Do not reuse the timer widget across all three.
- **Calendar**: Month / Week / Agenda are presentations of the same event set; `Connections` is a setup screen (separate artifact), so it stays a tab but carries `SETUP`.
- **Notes/Files/Projects/Goals** use master/detail (§5.1).

### 5.7 Insights (B05)

- **Overview** and **Action Center** are the pair that must be differentiated. Overview = "what is my day"; Action Center = "what needs triage." Action Center gets explicit state tabs `Today · Upcoming · Snoozed · Dismissed`, each with a **meaning line** under the tab ("Snoozed: hidden until the snooze expires") so semantics are visible, not implicit.
- **Current** (weather/news/local) is a provider-fed dashboard: use provider cards with `Not connected` states instead of fabricated panels.
- **Analytics/Dashboards/Progress/Forecast** are `layout-proposal`. Keep them as illustrative frames but add a `PREVIEW` badge and replace generic charts with **named chart contracts** (e.g. "Correlation matrix — requires ≥2 variables and n≥30") so the reviewer sees what's missing rather than a confident-looking chart.
- **Forex** lives here or under Finance; either is fine, but pick one and keep the route canonical.

### 5.8 Family and life (B06)

- **Family Connect** uses master/detail with a tree canvas in the detail pane; `Tree · Memories · Vault · Timeline` are distinct artifacts.
- The **Vault** must carry family-scope chips (`Family: Rao`) and `Unavailable` for private files the viewer can't open — this is a privacy-aware presentation requirement.
- **Maps** stays `schematic` with an explicit "No map provider connected" chip; do not style a fake map to look real.
- **Social/Entertainment** are collection pages; each needs its own empty-state and its own "connect account" setup screen rather than mock analytics.

### 5.9 Platform and public (B07)

- **Settings**: left sub-nav (Personal, Physical, Security, Appearance, Integrations), right form. Appearance is the only one that works in the demo; Security/Integrations show `SETUP` and no fake toggles.
- **Notifications**: `Unread · All · Preferences`; unread/all must differ in behaviour (mark-read, clear), not just filter.
- **Logs**: `Activity · Authentication · Sync` with distinct event schemas; the handoff warns the tabs may currently share content.
- **Help/About/Plans**: informational; Plans carries `PREVIEW` and no checkout.
- **Public** (`Welcome`, `Login`, `Privacy`, `Terms`): a centred, calm reading layout, 65ch measure, no product chrome. Login is **read-only sample** and must not collect passwords.

---

## 6. Resolving the layout-only tabs (structural rule)

Adopt this test before creating or keeping any tab:

> **A tab is justified only if it has a distinct primary artifact** — a different data object, a different input form, or a different computed output. If it only re-renders the parent with a filter or a title change, it becomes a **segment** (segmented control) or a **saved view**, not a tab.

Applying the test to the known gaps:

| Page | Keep as tabs (distinct artifact) | Demote to segment/saved view | Needs new work |
|---|---|---|---|
| Timesheet | Timer, Sessions, Analytics | — | Sessions table + Analytics contract |
| Action Center | — | Today/Upcoming/Snoozed/Dismissed as **segments** with semantic help text | Snooze/dismiss behaviour |
| Notifications | Unread, All, Preferences | — | Mark-read/clear |
| Logs | Activity, Authentication, Sync | — | Distinct schemas |
| Training | Schedule, Logger, PRs, Overload, Volume, Sessions | — | Logger input/output |
| Strength | Log, Progression, 1RM, Fatigue, Volume | — | 1RM calculator (input → result) |
| Nutrition | Daily, History, Targets, Calculator | — | Calculator input/result |
| Assessment | Questionnaire, Results, History | — | Scored questionnaire flow |
| Skills | Tree, List, Radar, History | — | Skill-specific data model |
| Finance Analytics | Categories, Income, Comparisons | Comparisons may become a segment | Comparison layout |
| Insights Analytics | Trends, Correlations, Comparisons | — | Measured analysis contract |
| Dashboards | Saved, Arrange | — | Arrangement editor |

This table is the concrete answer to the handoff's "Known coverage gaps" section.

---

## 7. Rollout plan (mapped to your work packages)

Small, reversible, and gated exactly as your handoff requires.

**Phase A — Foundations (maps to I01, gated by R02)**
1. Ship tokens + themes + density as a reversible switch.
2. Ship shell v2 (two-level rail, page header, scope badge) behind the switch.
3. Ship shared primitives: DataTable, FilterBar, StatusPill, ScopeBadge/ProvenanceChip, the five states, Dialog/Drawer. Re-verify focus, keyboard, reduced-motion, forced-colours.

**Phase B — Highest-value domains (R03–R10 order)**
4. B01 Customers (master/detail + scope) — but mutations stay disabled until I02/I03.
5. B02 Finance ledger + Budgeting + Subscriptions (same frame, distinct artifacts).
6. B04 Tasks/Board + Calendar + Notes + Timesheet split.
7. B03 Growth + Physique workspace (schematic honesty, draft/save).
8. B05 Insights/Action Center (segments, semantics).
9. B06 Family (master/detail + vault scope).
10. B07 Platform + public.

**Phase C — Replace concepts, then migrate (I07, I04–I06, I08–I09)**
11. Specialised workflows for the §6 "needs new work" items.
12. Native Equity/Family/Forex migration after parity; CSS consolidation per approved page.

**Phase D — Production gates (V01–V02, I10)**
13. Real admin adapters, permissions, audit, matching-fit export; release with rollback.

Each phase: fix the shared cause first, keep domain ownership, bump the design revision when layout changes, and re-verify affected consumers. Prior 948 checks are a baseline, not proof of the new frames.

---

## 8. Taste decisions I need from you

These are genuine forks, not things I should decide:

1. **Accent hue.** I proposed an emerald `#1F8A5B` against the forest rail. Do you want a cooler forest-teal, a warmer moss, or a more neutral near-black rail with an emerald accent only on actions?
2. **Rail vs. top-nav.** Two-level rail (proposed) vs. single primary rail with in-page tabs only. The rail favours depth (7 areas); top-nav favours breadth.
3. **Density default.** Comfortable for first-run, or compact for power users with a first-run prompt?
4. **Scope-badge prominence.** Always visible in the header (proposed) vs. only on non-LIVE scopes. Always-visible is more honest but busier once everything is live.
5. **Physique schematic style.** Line-art blueprint vs. soft silhouette. Both read as "not a render"; pick the one that matches your brand.
6. **Public-page chrome.** Fully bare (proposed) vs. a slim brand header on Welcome/Login.

---

## 9. What still needs browser verification

Per your own R01–R13 gates, this proposal is **not** signed off on:

- Every frame at 1024×768, 1280×800, 1440×900, 1920×1080 and 390×844, both themes, both densities, all four states.
- 200% zoom, keyboard-only traversal, focus trap/restore, Back/Forward and direct URLs, console errors.
- Denied/corrupt/full storage, corrupt saved Physique profile, unavailable GLB export.
- Family vault scope, long names, unlinked members.
- Financial totals after filtering, date boundaries, 10,000-record tables, pagination after source shrink.
- Separate FinSync/OxFin customer apps (their own review; portal approval does not carry over).

I can turn any of these frames into annotated wireframes, a token file, or a component spec next — tell me which owner batch you want to start with, and whether you'd rather I produce the **token/theme file** or the **B01 customer-admin frame** first.