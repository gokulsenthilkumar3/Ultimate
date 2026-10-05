# GrowthTrack Ultimate transformation blueprint

Status: execution blueprint, 2026-10-05. This document describes target work and does not certify that any unfinished module, native client, deployment, or integration is complete. The live route and view inventory is [MASTER_PRODUCT_SPEC.md](../growthtrack-ultimate/docs/MASTER_PRODUCT_SPEC.md); verified implementation claims belong in [IMPLEMENTATION_STATUS.md](../growthtrack-ultimate/docs/IMPLEMENTATION_STATUS.md).

## Product decision

Ultimate is an authenticated, stateful personal workspace with web and Electron clients, a backend, local persistence, and companion products. Keep its React/Vite application during the incremental merge. Astro can serve a future public, content-only project or documentation site, but migrating the authenticated workspace to Astro would not remove its need for client-side interaction. A Next.js migration also needs a measured product or operational benefit before it displaces working routes. The quoted 82% build-time improvement from another portfolio is not a GrowthTrack benchmark and is not a target.

Keep the current monorepo so domain contracts, API changes, import tools, and clients can change in one reviewed commit. Add Nx or a similar task runner only after measured build and test orchestration costs justify it. Do not split repositories while companion feature and data migrations need atomic review.

## Pillar 1: interface and accessibility

### Navigation concept

The authenticated home presents three source-linked priorities selected from pending actions, recent work, and user-pinned modules. A visible “All areas” control reveals the six-area navigation. The owner can pin, hide, and reorder cards; sensitive data is shown only after the current session's permissions are checked. Predictive suggestions require real consented history, an explanation of why each item appears, and an ordinary manual fallback. The public welcome page stays an honest product overview rather than a simulated dashboard.

### POUR audit contract

| Principle | Check on each route and view | Evidence |
| --- | --- | --- |
| Perceivable | Meaningful images have task-relevant text alternatives; decorative images are hidden; charts have text or table equivalents; text contrast is at least 4.5:1 for normal text and 3:1 for large text; controls and indicators are distinguishable. | Contrast measurements in light, dark, forced-color, error, and disabled states; screen-reader review. |
| Operable | Every action works with keyboard alone; skip links reach content; focus is visible and moves to new route content; dialogs restore focus; no keyboard traps; touch targets meet the design-system 44px floor. | Tab/Shift+Tab/Enter/Space/Escape walkthrough at desktop and narrow widths. |
| Understandable | Labels, errors, save state, sync state, permissions, and destructive actions use plain language and consistent placement. | Task-based usability review and form error tests. |
| Robust | Native elements carry name, role, value, and state; dynamic status is announced; DOM order matches reading order. | Accessibility-tree inspection in supported browsers and screen readers. |

Use the [W3C WCAG 2.1 criteria](https://www.w3.org/TR/WCAG21/) as the conformance reference. Passing a static scanner alone does not establish Level AA conformance. Record route, viewport, theme, browser, assistive technology, issue, fix, and retest result in the module inventory. Audit user-generated images for what their owner can actually describe; do not invent visual descriptions from filenames. The welcome page currently has no content images. Progress photos and file previews need contextual alternatives or an owner-supplied description when the image conveys information.

## Pillar 2: modular architecture

### Target dependency direction

```text
Web / Electron / iOS / Android interfaces
             ↓
Application use cases and typed ports
             ↓
Domain entities, policies, and validation

Infrastructure adapters implement ports: database, files, providers,
notifications, local storage, sync transport, and platform capabilities.
```

UI components call application use cases. Domain policies import no React, Electron, Prisma, HTTP, or platform SDK. Adapters import the port contracts and may use external libraries. Server authorization is enforced at the API and record layers, independently of UI visibility. Domain events are typed and owned by their source domain; a generic global pub/sub bus must not become an untraceable write path.

### Incremental folder target

```text
growthtrack-ultimate/
  src/
    app/                    # routing, composition, session shell
    domains/
      finance/
        domain/             # money, ledger rules, validation
        application/        # commands, queries, port definitions
        adapters/           # HTTP and local persistence
        ui/                 # Finance views and components
      workspace/            # Notes, Files, Tasks, Calendar
      wellness/
      life/
      insights/             # authorized, derived read models
      hub/
    shared/                 # design system and narrow utilities
  server/
    domains/                # versioned endpoints and repositories
    infrastructure/         # Prisma, files, providers, jobs
  companions/               # native platform adapters and clients
```

This is a migration map, not a bulk move request. Move one vertical slice with its tests and imports at a time. The first reference is [Notes](../growthtrack-ultimate/docs/NOTES_VERTICAL_SLICE.md): versioned API, owner scope, idempotent writes, conflict preservation, offline drafts, accessible editor, and native contract. Keep old endpoints until parity and rollback checks pass. Finance money migration must use integer minor units and reconcile balances against preserved fixtures. Companion sources and data stay available until preview, backup, import, parity, and rollback evidence exists.

### Platform and deployment gates

1. Establish typed domain contracts and versioned `/api/v1/<domain>` routes behind current endpoints.
2. Complete one web and desktop vertical slice, including owner isolation, offline, conflict, export, accessibility, and recovery.
3. Implement iOS and Android adapters against the same contract and prove the slice on real devices. Swift/Kotlin scaffolds are not a native release.
4. Repeat for foundational records, then merge companion workflows with read-only import previews and reconciliation.
5. Exercise signed builds, self-hosted/cloud/on-prem deployment, backup restore, upgrades, rollback, and device loss before release claims.

## Pillar 3: copy and documentation

### Evidence-based project copy

**Current overview:** “GrowthTrack Ultimate is a private workspace for wellness, finance, work, and life. The React web app and Electron shell share an owner-scoped backend. Several workflows are implemented; native mobile delivery, full sync, and companion data migration remain in progress.”

**Project bullet, supported by the 2026-09-29 status record:** “Built owner-scoped file upload and download with byte storage, safe previews, and explicit handling of legacy metadata-only records.”

**Project bullet, supported by the same record:** “Added CSV import preview, duplicate review, and transactional commit to the Finance workflow.”

For a resume, add a verified metric only after recording its baseline, date range, measurement method, and result. Template: “Reduced [measured task time/error rate] from [baseline] to [result] by [specific implementation], measured across [sample and period].” Do not turn test counts, route counts, or another site's build improvement into user impact claims.

### Ten-part GitHub README template

1. One-sentence product pitch and honest maturity statement.
2. Screenshot or short demonstration with descriptive alternative text and date.
3. Capability table: working, setup required, planned.
4. Architecture diagram and data ownership.
5. Prerequisites and tested versions.
6. Local quick start with copyable commands and expected result.
7. Configuration and secret handling.
8. Testing commands and what each gate covers.
9. Deployment, backup, recovery, and platform support.
10. Documentation links, contribution process, and license.

Only add badges for a real CI job, release, or published artifact. Use a terminal GIF only when it shows a current reproducible flow and has a text transcript. The root [README](../README.md) already covers much of this structure; update claims alongside code instead of replacing it with a generic template.

### Documentation development life cycle

Every module change starts from a view contract and ends with a checked status update. In the same change: (1) update the route/view inventory and relevant architecture decision, (2) write user-facing copy and task guidance, (3) implement code and tests, (4) run accessibility and platform acceptance, (5) record evidence and limitations in implementation status, and (6) revise README or release notes only if user-visible behavior changed. CI should check internal links, examples, and generated API contracts; a reviewer checks factual claims and screenshots. A registered tab alone never advances a module to “verified.”

## Immediate execution order

| Priority | Deliverable | Completion evidence |
| --- | --- | --- |
| 1 | Shared keyboard navigation and public-page skip links | Focus reaches content after route changes; public links work with keyboard. |
| 2 | Notes reference slice | Authenticated save/reload, revision conflict, offline recovery, owner isolation, export/import, desktop and real-device acceptance. |
| 3 | Foundation records: Files, Tasks, Calendar, Finance ledger, wellness logs | Each view's complete contract and migration reconciliation. |
| 4 | Companion workflow/data merges | Preview, backup, parity, rollback, native route, and canonical record tests for each source. |
| 5 | Production distribution | Signed clients, deployment modes, restore drill, accessibility and performance evidence. |

The implementation status document records which of these gates have actually passed. Do not infer completion from this blueprint.
