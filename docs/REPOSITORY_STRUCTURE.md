# Repository structure and file ownership

This is the maintained placement and validation guide for every file type in this workspace. The [engineering plan](Eng%20Plan.md) defines priorities and acceptance criteria. File organization does not imply that its proposed runtime or security changes have shipped.

## Ownership

| Location | Owner and responsibility |
| --- | --- |
| `growthtrack-ultimate/` | Desktop portal, Express API, SQLite persistence, Electron host and native companion presentation |
| `FinSync/apps/` and `FinSync/packages/` | FinSync customer applications and their shared product libraries |
| `FinSync/OxFin/` | Independent OxFin customer product; `services/` includes incomplete reference prototypes |
| `Family Connect/familyconnect/` | Family identity, tree permissions, files, API and standalone frontend |
| `Equity/NiftyLens/` | Standalone market application, pipeline and price-cache adapter |
| `Forex/` | Python research/inference, owned configuration and historical datasets |
| `scripts/`, `tests/`, `.github/` | Workspace tooling, cross-product contracts and CI |
| `docs/`, `diagrams/` | Maintained workspace guidance, plans and historical evidence |
| `.agents/` and nested agent-tool directories | Agent references and tooling; no production dependency |
| `Claude/` | Historical 3D provenance; no canonical application dependency |

`Forex/Forex-Ensemble-Prediction/` and `FinSync/Expense Tracker - Mobile/` remain historical/reference applications. Preserve their unique source. A directory's presence is not proof that its product is runnable or production-ready. See [build boundaries](BUILD_BOUNDARIES.md).

## File types

| File family | Placement and validation |
| --- | --- |
| Markdown and text notes | Keep maintained guidance with its owner. Place new historical records under `docs/archive/` or an existing dated research area. Keep an explicit status and link to the current source of truth. |
| JSON | Keep manifests/configuration with the consuming app. Parse as strict JSON, except TypeScript configuration, which supports JSONC. Generated files must name their source and regeneration command. |
| Root npm development tools | `package.json` and `package-lock.json` are Workspace-owned. The root Prettier dependency formats the generated graph; application dependency trees and builds remain independently owned. |
| YAML | Keep CI in `.github/workflows/`, deployment configuration beside its app and research configuration under its domain. Parse syntax, then validate with the consuming tool; valid YAML alone does not prove correct runtime behavior. |
| TOON | The artifact register uses `docs/evidence/artifacts.toon`; optional agent context exports use the official serializer with round-trip checks. Keep required manifests/API envelopes/schema in JSON. See the [agent workflow](AGENT_WORKFLOW.md) for selection and verification limits. |
| Ignore files | Keep a root Git policy and scoped additions. Container contexts have separate exclusion rules because Git ignores do not protect Docker `COPY` instructions. Ignore local credentials/data without hiding source or safe templates. |
| Graphify | `.graphifyignore` bounds the installed tool's scan; `.gitattributes` records its merge driver. `graphify-out/` is ignored local output. `npm run graphify:build` uses Graphify's code-only extractor with model backends disabled, then exports HTML/wiki and formats its JSON without changing graph data. |
| JavaScript/TypeScript, Python, Swift and Kotlin | Domain-owned source and tests; share contracts/primitives rather than importing sibling implementation details. Use each language's build/test tools. |
| SQL/Prisma | Keep migrations with the database owner. Review and test against disposable databases; documentation cleanup never authorizes applying migrations. |
| Documents, notebooks, spreadsheets, datasets and binaries | Preserve authorship, evidence, model provenance and licensing. Classify by owner; do not infer content correctness from a filename or extension. |
| Generated reports/builds and runtime state | Keep ignored and reproducible. Commit reviewed evidence intentionally in a documented historical location; never include real environments, databases, uploads or private records. |

The application README source is [applications.json](applications.json); regenerate it with `npm run docs:sync`. UI inventories/handoffs have their own generators. License text and copied agent references retain their upstream wording. Do not rewrite them as ordinary product documentation.

## Sources of truth

The [technology catalog](TECHNOLOGY_CATALOG.md) and its validated local planning profiles describe supported code versus adapters still required. Its presence does not make every listed stack deployable. Laya integration setup is owned under `growthtrack-ultimate/integrations/laya/`; its pinned optional Python dependency is separate from Forex.

- Start with the generated [application directory](APPLICATIONS.md) and [architecture](ARCHITECTURE.md).
- Use the [engineering plan](Eng%20Plan.md) for proposed work, [build boundaries](BUILD_BOUNDARIES.md) for ownership and [local workspace guide](UNIFIED_LOCAL_WORKSPACE.md) for launch modes.
- Use [CI validation](CI_VALIDATION.md) for configured checks and their verification limits.
- Historical plans, root sprint/task notes and local test observations are evidence with dates, not current implementation guarantees.

## Automated checks

`npm run repository:check` inventories tracked and unignored files without traversing installed dependencies. It records an owner and category for every path, validates JSON/JSONC and YAML, checks inline/reference Markdown file and image targets, verifies key Git exclusions and checks explicit container-context secret exclusions. Container checks require protective rules and reject later negations; they do not emulate every Docker matching rule. HTML links and heading fragments are outside the file-link check. The metadata report is local and ignored at `.code-index/repository-audit.json`; it does not copy file contents or secrets.

The former 35 dead historical artifact links now resolve to the [evidence register](evidence/ARTIFACTS.md). Its 26 distinct original files remain explicitly unavailable. The checker validates the TOON/schema/generated-page relationship and reports availability separately; it no longer exempts missing artifact links. Templates resolve links from their generated document location. The checker does not execute binaries, inspect private datasets, validate every API contract or establish that all source is architecturally correct.

Use this check alongside `npm run architecture:check`, `npm run docs:check`, `npm run config:check`, and the owning application's builds/tests. Configuration syntax, import boundaries, security findings and measured performance are separate checks; none substitutes for the others.

## Review outcome, 5 November 2026

At the review checkpoint, the file-policy check covered 2,887 tracked and unignored files. It parsed 133 JSON files, 16 JSONC TypeScript configurations and 19 YAML files, and checked file links in 270 Markdown documents. It reported no blocking file-policy errors. Copied agent references and license/provenance text were classified without editorial rewriting; binary/data files received ownership classification rather than invented semantic validation.

The pass replaced stale current architecture/launcher guidance, retained the originals under `docs/archive/`, labeled root planning notes as historical, corrected links to checked-in diagram sources and made missing artifact evidence explicit. A tracked UTF-16 architecture scratch report was preserved as UTF-8 historical JSON instead of being discarded. The root Git policy now excludes its former scratch location. Forex and OxFin build contexts now exclude local environments and key material independently of Git.

All 23 application READMEs were regenerated from their existing catalog and checked for drift. Fourteen focused repository/retrieval/import-policy tests passed. The existing architecture check reported no violations within its supported import rules; it still reported unresolved references outside that coverage. These results do not resolve the security priorities in the engineering plan or the build/performance failures documented in [CI validation](CI_VALIDATION.md). No runtime security redesign, live database migration, product deletion or deployment was performed in this pass.
