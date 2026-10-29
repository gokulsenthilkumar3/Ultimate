# Agent efficiency and guardrails — 29 October 2026

Scope: Ultimate's real Agents workspace and `/api/agents`. This extends the
[page performance work](2026-10-29-page-performance.md). Existing session,
permission, consent, canonical record commands and explicit review flows remain
the authority for account changes. No model, database or deployment migration
is part of this change.

## Problems reproduced and addressed

| Observed gap | Implemented control | Regression evidence |
| --- | --- | --- |
| Every token updated the transcript and reparsed completed Markdown | Immediate first token, 32 ms batches, final flush, memoized completed answers | A deterministic 1,000-token burst produces two updates with identical text; abort/disposal drops pending tokens |
| Full context projection ran twice, including for empty selections | On-demand context candidates, one reusable projection, memoized search/scope/byte checks, focused store subscription | Empty selection reads no account fields; initial chat does not scan task collections; ownership/consent projection tests still pass |
| Each message rediscovered the same model inventory | Public metadata cache for 15 seconds, refreshed by explicit readiness/model checks | Readiness plus two generations performs one catalog fetch; manual readiness contacts the provider again |
| No generation admission bound across browser tabs or chat/plan routes | Shared per-account budget and concurrency, global capacities, bounded expiring owner buckets | Overlapping chat/plan rejected before provider contact; separate owners admitted within capacity; disconnect releases slots |
| Ollama inventory JSON was parsed before a size check | Byte-bounded, abort-aware JSON reader; capped model metadata projection | Oversized catalogs and UTF-8 byte amplification rejected; allowlist applied before the 100-model display cap |
| A stalled Ollama body reader could outlive its deadline | Reader cancellation on abort; never await an untrusted cancellation promise | Stalled and never-resolving cancellation fixtures terminate and release locks/slots |
| Ignored upstream metadata could bypass answer-size limits | Aggregate raw byte and record/event limits for Ollama, Groq and browser SSE | Empty/usage-only record floods, raw byte floods and oversized text rejected without a successful completion |
| Ollama had no explicit generation-token cap | 4,096 chat / 2,048 plan tokens for both providers | Provider request fixtures assert limits; truncated completions remain incomplete |
| Selected reference text was placed in a system message | A single trusted system role; selected reference JSON is labelled untrusted user data | Injection-text fixture stays outside the system role; unsupported tool/action proposals remain rejected |
| Duplicate type/ID context could describe conflicting targets | Reject duplicate references before calling the model | Conflicting duplicate records return 400 without a provider request |
| Coded body-reader errors could expose internal transport details | Return only locally constructed safe errors verbatim | Coded fake network failures disclose no private host/provider text |
| Prepared plan objects were mutable, indefinitely usable and unbounded | Private command/context snapshots, integrity checks, ten-minute expiry, 50-plan cap | Changed commands, foreign plans, expired/evicted plans and replay attempts cannot write; UI status copies remain valid |
| Clearing conversation could leave private prepared snapshots actionable | Clear snapshots on conversation reset and unmount; check registration inside queued patches | Cleared plans and updates waiting in a queue are rejected |
| Session/consent could change while an update waited in a queue | Recheck the binding and target fingerprint when queued patches run | Queued consent/session changes and stale nested record data rejected; ambiguous saves never retry |
| Conversation state grew throughout an open session | Retain the latest 50 complete question/answer turns | Browser stress fixture sends 51 turns and checks conversation, activity and outbound history bounds |

## Effective limits

| Boundary | Limit |
| --- | --- |
| Input | 64 KiB serialized body; 16 messages; 8,000 characters/message; 20 unique references |
| Reference | 6,000 characters of projected text; matching domain and explicit sensitive-category consent |
| Chat / plan generation | 4,096 / 2,048 completion tokens; 120-second deadline |
| Discovery | Five-second deadline; 256 KiB raw catalog JSON; up to 100 permitted Ollama models |
| Stream | 1 MiB raw bytes including metadata; 8,192 records/events; 256 Ki characters/frame; 64 Ki characters of answer text |
| Per account | One generation; 12 generation requests/minute shared by chat/plan; one discovery; 60 discovery requests/minute |
| Per router process | Four generations and four discoveries concurrently; 1,000 expiring account budget buckets; no waiting queue |
| Review / memory | Ten-minute plan expiry; 50 prepared plans; 50 conversation turns; no prompt or answer cache |

Admission rejects with 429 and `Retry-After`; it never performs automatic retries.
Only authenticated identity keys account budgets. Requests cannot supply provider
URLs, credentials, system roles, tools, deletes, payments or arbitrary actions.
Configured local Ollama URLs remain supported; redirects remain disabled.

## Dependency fixes

The runtime dependency audit initially reported five affected packages: three
high-severity and two moderate-severity findings. Updated only these five
packages within compatible version ranges, and raised the two direct dependency
minimums in `package.json` and the lockfile:

| Package | Before | Locked version | Advisory |
| --- | --- | --- | --- |
| body-parser | 2.3.0 | 2.4.0 | [Compressed-body denial of service](https://github.com/advisories/GHSA-27r3-jxmh-p828) |
| multer | 2.4.0 | 2.5.0 | [Asynchronous file-filter teardown](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) |
| zod | 4.4.3 | 4.6.7 | [Oversized collection validation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |
| qs | 6.16.0 | 6.17.1 | [Comma-array serialization](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) |
| fast-uri | 3.1.8 | 3.1.9 | [URI normalization](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) |

The repeated `npm audit --omit=dev --audit-level=high --json` reports zero
vulnerabilities at every severity as of this check. Audit coverage is the
Ultimate dependency tree; it does not establish exploitability of every prior
advisory or certify separate product dependency trees. The dedicated CI job also
runs the existing runtime security audit command.

## Verification

Run from `growthtrack-ultimate`:

```powershell
npm run test:agents
npm run test:agents:e2e
npm run typecheck
npm run build
node --test tests/unit/server-backend/agents-mount.test.mjs
npm run security:audit
```

The dedicated CI Agent guardrails job runs the first two commands using locked
dependencies and an isolated Chromium fixture. Session/CSRF tests use the real
security middleware with an in-memory session adapter, fake providers and a
loopback-only Express server. Browser tests intercept all APIs and use fictional
owner records; neither the application server nor an owner database is opened.

| Check | Result |
| --- | --- |
| Agent unit/integration suite | 169 tests pass across 12 files, including the final cleanup guard |
| Isolated backend suite | 108 tests pass, including canonical owner authorization, uploads and versioned record writes |
| Agent browser workflows | Eight pass with the patched dependencies: nine viewport sizes, light/dark/forced colors, explicit action confirmation, owner fixture persistence, error recovery, source consent and 51-turn retention |
| Production build and typecheck | Pass with patched dependencies; changed authored JavaScript lint passes |
| Runtime dependency audit | Zero findings at all severities after compatible updates to five packages |
| Production performance audit | All 65 default routes pass; three samples/route after dependency fixes and a final one-sample/route check after plan-cleanup hardening |
| Startup and compression | 446,300 bytes of eager JS; 314,084 bytes of eager CSS; 157 gzip/Brotli asset pairs match their finalized source |
| Design demo | Build passes; full suite had 988 passes and one first-directory wait failure under parallel load; that workflow passes when run alone |
| Workspace metadata | UI impact/handoff checks, design adapters and 23 generated READMEs pass; local retrieval index refreshed |

The first combined backend attempt reported a Notes worker process failure
without an individual assertion failure. Its twelve tests pass in isolation and
the subsequent complete 108-test run passes. The separate demo's initial
directory wait also passed when rerun without parallel browser/test load. These
retries are recorded rather than treating the earlier broad runs as green.
The previously documented unrelated broad-suite failures in the page-performance
report were not suppressed or reclassified.

The security update increased the validator bundle. The performance gate caught
the default dashboard exceeding 1 MB; deferring the optional Growthcast AI
transport until an explicit request brings dashboard startup JS to 905,403 bytes
(from 988,096 before this pass). Existing Insights/export tests pass (12 cases).
The first token remains immediate; the tested 1,000-token burst batches to two
updates. These are code/fixture measurements, not live model latency claims.

Ignored browser reports: `.gstack/benchmark-reports/agent-secure-final.{json,md}`
(three samples/route) and `agent-cleanup-final.{json,md}` (final cleanup build,
one sample/route). Both audits show zero page-render failures. The three-sample
run passes comparison with the earlier `followup.json` report, including the
10% resource regression bounds. The final report passes absolute startup,
compression, paint, preload-order and default-dashboard budgets.

Browser verification used a separately owned Vite-only preview because this
managed Windows session could not finish Playwright's automatic child-server
teardown reliably. That preview was stopped after verification. The new CI job
uses bundled Chromium on Linux; its YAML/test commands are checked locally, but
the remote CI job has not been executed in this session. No deployment occurred.

## Practical limits

Prompt separation improves instruction priority; it does not prove a model will
ignore every injection. Enforcement comes from absence of model tools, strict
action validation, explicit user review and canonical server authorization.
Prepared-plan integrity is a client workflow defense; it cannot defend a browser
already controlled by malicious JavaScript. Session/record APIs remain the server
trust boundary.

Admission and model metadata caching are process-local. Multiple replicas need a
shared admission store and provider-level spend quotas before those per-process
limits can be treated as deployment-wide limits. Live model latency, model
quality and adversarial model behavior have not been measured with production
keys or personal data. Generated UI inventory counts do not establish rendered
coverage or human visual approval.
