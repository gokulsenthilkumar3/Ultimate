# Local Graphify workspace

Run `npm run graphify:serve` from the repository root. Open **http://127.0.0.1:5440/**. This port is separate from Ultimate UI, API and DB Console. Override it with the process environment variable `GRAPHIFY_PORT` (1024–65535). Stop the process with Ctrl+C when running in a terminal.

The styled browser workspace searches native Graphify symbols and paths, shows bounded neighborhoods, and exposes source locations, communities and relationship confidence. Select a node in the result list or diagram; keyboard users can Tab to nodes and press Enter. Node selections are shareable through the URL fragment. Next relationships cycles through pages of 16 original incident edges on desktop, or six on small screens. The diagram positions are a presentation layout, not new graph relationships.

The source is **graphify-out/graph.json**, not the older `.code-index/graph.html` import map. No product connections or agent self-links are injected. Extracted relationships do not prove that an application integration works at runtime. All labels and retrieved metadata remain untrusted data, never agent instructions or authorization.

## Brain: the whole codebase on one page

Open **http://127.0.0.1:5440/#brain** (also the default view). Brain loads every indexed native node and original relationship from one snapshot, including disconnected nodes and the indexed Graphify workspace itself. Canvas avoids creating tens of thousands of DOM elements; rendering runs on interaction rather than an endless physics loop. The graph is grouped visually by domain and native community. These positions and colors do not create new graph entities or edges. "Whole" means the policy-filtered Graphify index, not ignored secrets, private records or every possible file format.

Drag to pan, scroll or use +/− to zoom, and use **Fit all** to restore the overview. Domain legend buttons frame that part of the graph. Search labels, paths or community names; selecting a result centers the native node and shows its source and incident-edge count. **Explore original relationships** opens the existing Explorer tab for evidence. Canvas keyboard controls: arrows pan, +/− zoom, Home fits all. Search results are accessible buttons. Light/dark canvas themes are available.

The architecture/ports section shows all launcher services together. `scripts/graphify-services.mjs` reads the public `scripts/workspace.mjs` port arrays without importing or executing the launcher, adds the documented design-preview default from `docs/applications.json`, and reports the actual Graphify listener port. Cards locate existing source nodes; ports are annotations, never invented graph relationships. Defaults are not live health checks. Environment overrides and dynamic database ports are not inferred, and local environments are not read.

The Browser-only change was checked in local Chromium at 1512px and 390px widths: complete node/edge counts matched the source API; Graphify self-search, Explorer drilldown, port navigation, keyboard controls, themes and refresh passed with no page errors or external requests. One initial local sample on the 13,438-node / 31,028-edge snapshot measured 77.4ms layout preparation and 44.1ms canvas drawing. These are single browser timings, not field metrics or guaranteed frame rates. Screenshots and timings remain ignored under `.code-index/graphify-brain-*`.

## Animated 3D for people

The approved Brain now opens in a real WebGL 3D view, using the locally installed Three.js dependency. All native nodes and relationships are preserved. Depth, colors, camera state and animation are browser presentation only; agents continue reading the same JSON contracts without CSS or renderer coordinates. No CDN or model calls are used.

Drag to orbit; select **Pan** or hold Shift while dragging to move the camera. Scroll/pinch or +/− zooms. Search flies the camera to the selected native node; selection pauses automatic motion so the details remain readable. **Focus selection** dims the surrounding graph and emphasizes actual neighboring nodes and incident edges. Toggle **Connections**, switch light/dark canvas themes, copy a node ID, or use **Expand view**. The original **2D** map remains available.

Automatic orbit and subtle node breathing stop with **Pause motion**, when leaving Brain, when the canvas is offscreen, or when the document is hidden. `prefers-reduced-motion` disables automatic movement and camera easing. Frame submission is capped at 30fps desktop / 24fps small screens, with capped pixel ratio; these are ceilings, not guaranteed performance. Geometry is batched into point/line buffers. WebGL load failure or context loss restores the 2D map. Disposed renderers release their buffers, materials, observers and listeners.

Run `npm run test:graphify:browser` for a reproducible Chromium check using an owned temporary loopback server and the real graph. It checks full native counts, 3D depth, orbit, pause, tab lifecycle, 2D/3D switching, fullscreen, reduced motion, real WebGL context loss, renderer-load fallback, mobile overflow, and absence of visual coordinates in the agent payload. It needs Ultimate's installed Playwright/Chromium dependencies. Screenshots and runtime diagnostics remain ignored in `.code-index/`. Reported render-call timings measure CPU submission, not GPU completion or field performance.

## Agent access

Discover the read-only JSON API at http://127.0.0.1:5440/api/graph/capabilities and response fields at `/api/graph/schema`.

| GET endpoint                                        | Purpose                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/health`                                           | Service and graph availability                                                         |
| `/api/graph/meta`                                   | Snapshot token, counts, Graphify version, commit provenance and file modification time |
| `/api/graph/brain`                                  | Whole snapshot: all selected native node fields and original edges; gzip supported     |
| `/api/graph/services`                               | Public configured ports with source provenance; not live health                        |
| `/api/graph/nodes?q=welcome&limit=20&offset=0`      | Search labels and source paths                                                         |
| `/api/graph/neighbors?id=NODE_ID&limit=24&offset=0` | Original incoming/outgoing incident edges and endpoint nodes                           |

Encode node IDs with `encodeURIComponent`. `limit` is 1–100, `offset` is a nonnegative safe integer, and query text is limited to 200 characters. Follow `nextOffset` until null. Compare `snapshot` across pages: restart pagination if it changes. Source locations may be unavailable; absence of an edge is not proof that no runtime relationship exists.

The server binds only to 127.0.0.1, checks Host/Origin, has no CORS allowance, accepts only GET/HEAD, and serves an explicit asset allowlist. It exposes selected graph metadata, not source contents, environment files, databases or arbitrary file paths. It executes no commands or model calls and uses no CDN assets. Access assumes a trusted local machine; this is not a public authenticated service.

Run `npm run graphify:update` after code edits. The workspace notices the graph file's modification time and size on the next request; use **Refresh snapshot** to reload the displayed data. Missing or invalid snapshots return 503 without silently serving stale metadata. `npm run test:graphify:server` checks pagination, native edge identity, graph reload and HTTP boundaries with fictional fixtures.

This workspace is a browser UI for review. Further desktop integration requires the user's UI approval, as requested on 6 November 2026.
