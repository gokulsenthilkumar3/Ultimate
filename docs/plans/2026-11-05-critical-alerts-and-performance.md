# Critical alerts and local browser measurements

Measured 5 November 2026 against this working tree. Changes remain local and
uncommitted. GitHub alerts are a remote snapshot, not a fresh scan of these fixes.

## Security changes

- PR #2: both historically exposed deployment keys were still present in the
  ignored local Ultimate environment. A read-only inventory found zero encrypted
  documents, sealed connector rows, private file bytes and encrypted archives.
  The API was stopped. Both keys were rotated with a protected ignored recovery
  environment preserved. Server startup and deployment setup reject the known
  exposed fingerprints. No secret values were printed or added to this report.
  Other installations and historical copies are not automatically revoked.
- All 14 review threads across PRs 1?23 are now resolved on GitHub. Resolving a
  discussion is separate from resolving security-scanning alerts.
- Critical CodeQL #56?58 (PR #23): capture and narrow customer-admin filters
  before use; duplicated values are rejected before service access.
- Critical CodeQL #48: explicitly reject non-array portfolio payloads, then
  operate on an array copy with bounded holding count.
- Critical CodeQL #8: gateway paths can no longer replace the configured
  authority; protocol-relative, backslash and absolute URL inputs remain on the
  trusted upstream in an actual HTTP regression.
- Critical CodeQL #7: OxFin autopay accepts a bounded bill identifier and uses a
  fixed axios base URL with absolute URLs and redirects disabled. The actual
  route is tested with synthetic transport/auth dependencies.
- Also fixed the compressed-asset path boundary (CodeQL #59), worker format-string
  logging (#16), and the Family connectivity script that guessed/logged passwords
  (#17). Connectivity now uses only DATABASE_URL and sanitized status messages.

The snapshot had 24 critical dependency alerts. Current manifests/lockfiles no
longer contain a version in any of those listed critical affected ranges:
NiftyLens uses Next 15.5.29/React 19.2.6; Family uses DOMPurify 3.4.17 and
proxy-addr 2.0.8; the mobile lockfile pins shell-quote 1.12.0 and tar 7.5.22.
Both Forex requirements use torch 2.15.0 and mlflow-skinny 3.18.0 in place of
mlflow 2.13.0. The lightweight distribution still contains server modules; it is
not itself an isolation boundary. This application uses tracking APIs and did
not start a tracking server. Existing local file-store tracking is preserved by
an explicit compatibility opt-in, with telemetry disabled by default.
python-multipart was updated to 0.0.33 to satisfy the new client requirements.

Fresh npm audits (all dependency types):

| Application | Critical | High | Moderate | Low |
| --- | ---: | ---: | ---: | ---: |
| ultimate | 0 | 3 | 12 | 0 |
| equity | 0 | 7 | 14 | 0 |
| familyweb | 0 | 11 | 11 | 0 |
| familyapi | 0 | 6 | 3 | 0 |
| mobile | 0 | 16 | 17 | 1 |
| finsync | 0 | 4 | 7 | 10 |
| oxfin | 0 | 1 | 25 | 4 |

High/moderate/low findings remain. This is not an all-severity clean bill of
health. A pinned GitHub Actions matrix now rejects critical npm vulnerabilities
for all seven lockfile owners on future PRs. Hosted execution has not occurred.

## Verification

- 161 backend/security integration tests passed, including synthetic migrated
  SQLite, ownership, CSRF, MFA, backups, customer-admin filters and gateway paths.
- A further raw-HTTP Windows separator traversal regression passed.
- 186 agent tests and 3 agent-tooling tests passed.
- 22 focused scroll, Helpdesk, Tasks and Welcome tests passed.
- Production builds passed for Ultimate, NiftyLens and Family frontend/backend.
- Both complete Forex requirements sets resolved against Python 3.12. Patched
  torch/MLflow helpers installed in a separate audit venv; pip check and two
  synthetic forward/weights/local-tracking tests passed, including the
  TensorFlow-compatible protobuf 4.25.9/FastAPI constraints. No existing model
  or tracking records were migrated. The full training stack
  was resolved, not installed or trained.
- OxFin service-wide tsc is blocked by its pre-existing missing tsconfig.base.json
  and service dependency/type setup; the changed autopay route regression passed.
- Ultimate's TypeScript check passed. Targeted JavaScript ESLint had no errors
  and retained one existing effect warning; the current ESLint configuration
  does not cover the TypeScript files (covered by typecheck and their tests).
- Evidence, repository, architecture, environment-template, README and UI
  impact/handoff checks passed. Static import inventory gaps remain explicit.

## Browser measurements

The Ultimate production frontend was served on loopback with deterministic fictional
owner data. Authenticated fixtures include 2,000 tasks and 3,000 transactions;
optional customer services intentionally return unavailable. No real owner
backend/session, remote test service, paid account or public tunnel was used.

The desktop sweep executed 65 actual routes. It initially found two rail-end
wheel failures and an obsolete Welcome asset assertion. The wheel handler now
forwards vertical wheels to a scrollable ancestor at row boundaries; both
long-page browser rechecks passed. Welcome's approved v3 atlas is recognized
without weakening size, keyboard or single-resource checks.
The final current-build desktop sweep reran all 65 routes with interaction and
tab-overflow checks, HAR export and screenshots: zero recorded failures.

Six representative routes were also measured three times at 390px, 4? CPU
slowdown and the script's CDP 4G profile (150ms latency, 200,000 bytes/s down,
93,750 bytes/s up). A mobile settings harness failure targeted a hidden desktop
button; using the supported mobile drawer path passed the focused rerun.
Eighteen HAR waterfalls from those original samples and a focused recheck HAR,
resource timings, interaction samples and screenshots are retained locally.
Browser long-task totals cover the observed session; they are not Lighthouse
TBT or a field INP percentile. There is no pre-change performance baseline.

Lighthouse 13.6.0 ran six routes on desktop and mobile. This table is the rerun
after fixing Helpdesk list/headings, Tasks badges and Welcome contrast; it
precedes the final rail-boundary change. All 12 accessibility scores are 100.
Measurements are simulated lab results, not CrUX or production performance.

| Route | Performance D/M | Accessibility D/M | LCP seconds D/M | TBT ms D/M | CLS D/M |
| --- | ---: | ---: | ---: | ---: | ---: |
| welcome | 99 / 89 | 100 / 100 | 0.85 / 3.40 | 1 / 194 | 0.000 / 0.000 |
| login | 100 / 93 | 100 / 100 | 0.79 / 3.12 | 30 / 106 | 0.000 / 0.000 |
| overview | 80 / 74 | 100 / 100 | 3.21 / 14.02 | 8 / 136 | 0.090 / 0.000 |
| tasks | 78 / 74 | 100 / 100 | 4.02 / 14.28 | 0 / 108 | 0.069 / 0.004 |
| help | 80 / 74 | 100 / 100 | 3.28 / 14.65 | 0 / 98 | 0.079 / 0.000 |
| finsync | 99 / 75 | 100 / 100 | 0.63 / 14.56 | 0 / 69 | 0.033 / 0.023 |

SEO scored 100 in all 12 audits. Best-practices scores are 96?100; the synthetic
signed-out/authentication and unconfigured-service responses account for the
reported 401/503 console entries. These were retained, not suppressed. Several
populated routes fail the 2.5s LCP target, particularly on simulated mobile.
Performance is not signed off: the large synthetic state response and loaded
client work need further optimization and profiling.

A supplemental latest-build About audit verified the stronger release-badge ink:
desktop/mobile performance 98/74, accessibility 100/100, LCP 0.49s/15.48s, TBT
94ms/128ms and CLS 0.063/0.004. Best-practices scored 92/92 on this synthetic
unavailable-service state; SEO was 100/100. All 14 measured accessibility audits
therefore scored 100. This does not establish complete accessibility compliance.

## Requested external products

| Product | Actual result in this local-only task |
| --- | --- |
| Lighthouse | 14 real JSON/HTML audits (12 representative reruns plus 2 About audits), plus initial reports. |
| WebPageTest | No hosted run and no configured local controller/agent. HAR waterfalls and browser timings are local diagnostics, not WebPageTest results. |
| GTmetrix | No hosted result; the application has no public reachable URL/account integration. |
| Pingdom | No hosted result; remote agents cannot measure this machine's loopback application. |
| CrUX Vis | No field dataset for this local-only origin. It visualizes historical Chrome UX Report data, not locally generated Lighthouse samples. |

Sources: [Lighthouse](https://developer.chrome.com/docs/lighthouse),
[WebPageTest API](https://docs.webpagetest.org/api/),
[GTmetrix API](https://gtmetrix.com/api/docs/2.0),
[Pingdom tools](https://tools.pingdom.com/),
[CrUX Vis dataset requirements](https://developer.chrome.com/docs/crux/vis).

## Reproduction and remaining gates

Install Lighthouse into ignored local tooling with
`npm install --prefix .code-index/performance-tools lighthouse@13.6.0 --ignore-scripts`.
Build Ultimate, then run `npm --prefix growthtrack-ultimate run performance:lighthouse`.
The script uses only its synthetic loopback server and blocks external Chrome
traffic. Browser sweeps use `scripts/page-performance.mjs` with `--har` for waterfalls.
The rotation helper defaults to a dry run and refuses encrypted dependents.

Local raw evidence is under `.code-index/performance/`, npm audit snapshots
under `.code-index/audit-*.json`, and per-alert critical version checks in
`.code-index/critical-dependency-coverage.json`. These are ignored local artifacts,
not replacements for the historical unavailable-artifact register.

The six critical CodeQL source fixes await publication and a fresh GitHub scan;
no alert was dismissed to manufacture a clean result. The separate Google API
key secret-scanning alert remains open: repository removal does not verify
provider-side revocation/restrictions, and no Google administrative access was
available here. No deployment, history rewrite, real-record migration or
provider-side secret rotation was performed.
