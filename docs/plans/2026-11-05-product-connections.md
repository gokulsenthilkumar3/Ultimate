# Ultimate product connections

Reviewed 5 November 2026 against the canonical five-product registry, gateway,
workspace launcher, proxy routing, native modules and restricted customer adapters.

The previous graph showed relative JavaScript/TypeScript imports only. Separately
built applications communicate through HTTP, identity handoffs and public provider
adapters, so their missing import arrows did not establish missing integrations.

| Product | Ultimate connection | Remaining runtime requirement |
| --- | --- | --- |
| FinSync | Separate customer portal; `/api/finsync`; authenticated `/api/admin/products/finsync/customers` adapter | Explicit product admin URL/token/reader configuration; separate customer identity |
| OxFin | Separate customer portal; `/api/oxfin`; authenticated `/api/admin/products/oxfin/customers` adapter | Explicit product admin URL/token/reader configuration; separate customer identity |
| Family Connect | Native `/Ultimate/life/family`; `/api/family` forwards to Family `/api/v1` | Running Family API, authorized Family session and product permissions |
| Forex | Native `/Ultimate/insights/forex`; authenticated `/api/native/forex/{metadata,history}` forwards to Python `/workspace/*`; `/api/forex` gateway | Running Python API, datasets and saved models |
| Equity / NiftyLens | Native `/Ultimate/finance/equity`; authenticated `/api/native/equity/prices` reads the owned public price cache; `/api/equity` gateway | Configured public cache; dedicated options/index providers remain unavailable |

Correction at the user's request: the manually declared product overlay and its
`productConnections` metadata were removed. The table above is a source review,
not Graphify-generated intents. The custom local source-import viewer remains
separate from Graphify. Installation verification confirmed `graphifyy` version
0.9.102 in uv's isolated user tool environment. `graphify --help` succeeds when
run with access to that environment outside the workspace sandbox. The earlier
`uv trampoline failed to canonicalize script path` error was sandbox-related,
not a broken installation. The subsequent local Graphify extraction is recorded
below.

## Graphify output and command verification

`npm run graphify:build` now invokes the installed `graphify extract . --code-only`
with `GRAPHIFY_BACKEND=none`, followed by Graphify's HTML and wiki exports. It
formats the resulting JSON with Prettier and checks parsed equality; no graph
nodes, edges or intent relationships are authored by the wrapper. `.graphifyignore`
excludes redundant agent/provenance copies, data and generated output; Git ignores
and Graphify's sensitive-file filters also apply. Output remains ignored locally.

The first extraction scanned 2,020 code files and generated **12,908 nodes,
30,045 edges and 576 communities**. Outputs are `graphify-out/graph.json`,
`graphify-out/graph.html` and `graphify-out/wiki/index.md` (586 wiki articles).
The HTML uses Graphify's aggregated community rendering above 5,000 source nodes.
The custom `.code-index/graph.html` remains an independent source-import tool.
The final incremental refresh re-extracted two files, pruned excluded/stale nodes,
and produced 12,898 nodes, 30,033 edges, 578 communities and 588 wiki articles.
Graphify's native HTML loads vis-network from a public CDN; unlike the separate
custom viewer, it is not a fully offline bundle.

Verified commands from the repository root:

```powershell
npm.cmd run graphify:build
graphify export wiki
graphify benchmark graphify-out/graph.json
```

Square brackets in help indicate an optional argument; `[graph.json]` is not a
literal path. `npm run graphify:wiki` and `npm run graphify:benchmark` are equivalent
convenience commands. Hooks do not substitute for generating the initial graph.

The benchmark succeeded; its reported token reduction is a heuristic comparison
against a naive corpus estimate, not measured model tokens, answer quality,
latency or browser performance. Extraction used zero semantic/model calls, skipped
500 non-code files, and reported three partial parse warnings (the mobile expense
test, Android CompanionModel.kt and task_opts.cjs). Another 241 code files yielded
no symbols. Graphify also flagged design-tokens.css and tokens.css as sensitive;
those source files were preserved, and the filter was not bypassed. These are
coverage limits, not proof that all runtime product connections were discovered.

The review also found a real health-reporting defect: after a failed intended
probe the gateway fetched the owner's homepage and could falsely report it online.
The fallback is removed. Next customer app probes are labeled `ui-reachability`
with `dataReadiness: not-checked`; an available UI is not proof of database,
provider, admin-access or inference readiness. Family/Forex health forwarding
retains the owners' responses.

Validation uses synthetic local HTTP owners, native authentication/provider tests,
graph tests and an offline browser. No provider accounts, customer data, deployment
or real product authorization were changed. Existing runtime setup requirements
are intentionally visible rather than replaced with mock successful connections.

Historical validation before overlay removal: 34 focused context/graph/gateway/native-module checks passed; offline
Chrome checked all five product arrows and selection details, source imports,
file search, bounded impact, zoom, SVG export, mobile overflow and hostile metadata
escaping with zero external requests or browser errors. Agent checks passed
(3 tooling and 186 application checks); formatting, evidence and repository
checks passed. Local screenshot: `.code-index/graph-viewer-products.png`.
