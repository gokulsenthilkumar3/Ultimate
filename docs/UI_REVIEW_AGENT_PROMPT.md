# Copy-ready prompt: review the GrowthTrack UI

Use this with another agent. Attach `UI_ARCHITECTURE_HANDOFF.md` and `ui-review-manifest.json`, and provide the same current source working tree or a browser-accessible preview. The documents alone support an architecture/source review; actual visual review also requires rendered pages or screenshots.

---

You are independently reviewing the GrowthTrack desktop UI and preparing concrete redesign recommendations. Your first assignment is review and proposal, not production deployment or live customer changes.

Read `docs/UI_ARCHITECTURE_HANDOFF.md`, `docs/ui-review-manifest.json` and the repository's `AGENTS.md`. If supplied as attachments without the repository, treat their filenames as the bundle root and explicitly state which source/browser access is missing. Do not invent rendered observations.

Respect these agreed decisions:

1. Ultimate is the main desktop portal. Use a light workspace, dark forest sidebar, matching dark mode and comfortable/compact density. Mobile is a responsive fallback for this pass.
2. GrowthTrack, Equity, Family Connect and Forex move toward native portal modules with clear ownership and independent builds where useful.
3. FinSync and OxFin remain separate customer products. Their customer-admin views belong in Ultimate. Keep their customer-app visual reviews separate from portal administration.
4. The current `src/admin-demo` entry uses fictional data and no customer APIs. The Physique stage is a schematic, with independent Current/Goal drafts and explicit browser-local saves; it is not an integrated mesh/garment renderer.
5. Preserve existing auth, routes, data ownership, environment configuration and product boundaries. Do not query real customer data, collect credentials, change accounts, migrate/delete data, upload source or publish/deploy as part of this review.
6. Inspect the current working tree, including staged/uncommitted redesign files; do not reset unrelated changes. Claude/other AI tools are optional. Generated code indexes and `.codeindexignore` stay ignored.

Start the preview with `npm run dev:design` from the workspace root, then use `http://127.0.0.1:5410/admin-demo.html`. If an existing server is already running, reuse it. The demo requires no product credentials. Follow the application README if setup is missing.

If you run on another host, use a forwarded port or supplied reachable preview/screenshots. Your own localhost does not reach the user's preview.

The user approved the demo direction and requested real-app implementation. The [production integration report](plans/2026-10-28-production-ui.md) records the applied shared UI and remaining adapter/native migration work. Production is at `http://127.0.0.1:5000/Ultimate/` with the existing backend and owner session; use the real login without bypassing authentication. Fixture mutations remain isolated in the demo.

Review in this order:

- Shared shell, navigation, typography, tokens, themes, density, dialogs, tables and review controls.
- Customer administration, personal finance/markets, family/life, growth/Physique, work, insights and platform/public pages using the owner batches and exact routes in the manifest.
- The standalone FinSync/OxFin customer apps only when their source/preview access is provided; their pages are outside the portal's 201 destinations.

Visit every portal page/tab destination. Cover 1024×768, 1280×800, 1440×900 and 1920×1080, plus 390×844. Check light/dark, comfortable/compact and populated/empty/loading/error/denied/unavailable scopes. Keep a ledger for untested combinations; do not claim that the full 24,120-case planning matrix was executed because it was generated.

Test practical cases: long text and numbers, 200% zoom, keyboard-only navigation, focus restore/trapping, Back/Forward and direct URLs, page/tab switching, empty filters, sorting/pagination after source shrink, 10,000-record supplied tables, date boundaries, financial totals/precision, family event/vault scope, task/note/timer persistence, rapid Current/Goal edits, saved profile versus draft, denied/corrupt browser storage and the unavailable GLB export. Check console errors and reduced-motion/forced-colour behaviour. Review the [implemented proposal and its limits](plans/2026-10-28-proposal-implementation.md), including customer inline detail, filtered totals, separate Timesheet artifacts, action triage, notification read states, log schemas, skill coverage, local dashboard ordering and current-draft search. The handoff lists remaining layout-only tabs that need specialised workflows; distinguish an unfinished concept from a visual bug in a completed interaction.

Capture actual screenshots and reproduction steps for browser findings. Label source-only observations and blocked cases honestly. Prior automated results are a baseline, not visual proof. Only change demo approval status when explicitly authorised to do so by the user; recommendation and user approval are different.

Return:

1. A short assessment of the largest problems and what is already coherent.
2. Findings with ID, P0–P3 severity, page/view/theme/density/state/viewport, exact steps, observed/expected behaviour, screenshot/trace evidence, likely source location, shared impact and a concrete correction.
3. A coverage ledger using `not-tested`, `reviewed-no-finding`, `changes-requested` and `blocked` for each scope actually considered.
4. A redesign proposal that starts with reusable shell/primitives and then domain-specific layouts, with proposed page frames where useful.
5. Subtasks with owners, dependencies, acceptance criteria, impacted routes and appropriate regression checks. Separate visual fixes from specialised workflow implementation and production integration.
6. A small list of taste decisions for the user and all remaining verification gaps.

If later asked to implement, work in bounded domain batches, fix shared causes first, preserve local state/permissions and update the design review revision when layouts change. Reverify affected pages and builds. Keep real adapters, production rollout and data/key migrations behind their separate implementation/approval gates.

---

The main handoff contains architecture diagrams, the full feature/package inventory, implementation subtasks, source paths and the issue schema. The manifest lets you work one owner batch at a time without loading the entire repository into context.
