# Family connector admission plan

Date: 7 November 2026. Scope: the Ultimate to Family bridge, `growthtrack-ultimate/server/domains/familyBridge.js`, which serves `/api/native/family/*`. "Admission" here means the same thing as in [agent guardrails](2026-10-29-agent-guardrails.md): bounded, process-local, per-account limits applied before the upstream service is contacted. No database migration, deployment, desktop packaging or Family backend change is included.

## What the connector already had

| Protection | Where | Limit |
| --- | --- | --- |
| IP request budget | Ultimate `server/requestBudget.js` | 600 requests/minute per client IP, 10,000 tracked clients |
| Short-lived request-bound assertion | bridge | 30-second HS256 JWT bound to method and path; browser cookies and `Authorization` are never forwarded |
| Route and method allowlist | bridge | Unknown routes 404, unsupported methods 405 before any upstream call |
| Upstream timeout | bridge | 20 seconds, aborted on browser disconnect |
| Service circuit breaker | bridge | Opens after three upstream failures, 15-second cooldown, one recovery probe; no automatic retries |
| Per-identity limiter | Family backend | 200 requests per 15 minutes per verified Ultimate identity |

## Gap

Nothing bounded one account's concurrency or burst rate at the bridge. A tab or script could hold unlimited simultaneous uploads, downloads or AI calls open to Family, and the only account-level limit was Family's 15-minute window, reached after the damage to shared sockets was done. Rejections from the circuit breaker also always said `Retry-After: 15`, even when the cooldown was nearly over.

## Implemented

`server/domains/familyAdmission.js` mirrors the Agents admission model. Requests are classified by cost, using only the validated method and path:

| Class | Matches | Per account per minute | Per account in flight | Per process in flight |
| --- | --- | --- | --- | --- |
| `read` | GET/HEAD | 120 | 8 | 64 |
| `write` | POST/PUT/PATCH/DELETE, including `/session` and document deletion | 30 | 2 | 16 |
| `transfer` | Document upload, `/documents/file/*` and `/documents/upload/*` downloads | 10 | 2 | 8 |
| `ai` | `/ai/*` | 6 | 1 | 4 |

These are conservative starting points, not measured capacity. They can be overridden through `registerFamilyBridge(..., { admission: { limits } })`; invalid values throw instead of disabling a bound. Account budgets are keyed only by the authenticated Ultimate account ID. Paths, bodies, IPs, names and credentials are not stored, and up to 1,000 account buckets expire after a minute of inactivity.

Refusals happen before Family is contacted:

| Cause | Status | Code |
| --- | --- | --- |
| Account budget spent | 429 + `Retry-After` (seconds until the window resets) | `FAMILY_RATE_LIMITED` |
| Account already at its in-flight limit | 429 + `Retry-After: 1` | `FAMILY_REQUEST_ACTIVE` |
| Process capacity or bucket table full | 503 + `Retry-After: 1` | `FAMILY_BUSY` |

Ordering, with the reason for each step:

1. Route, method, configuration and destination checks run first, so unsupported requests spend no budget.
2. The circuit breaker is peeked (`available()`, side-effect free) before admission, so requests refused during an outage do not consume the account's budget and a recovered service is not met by a spent budget.
3. Admission runs before the circuit's single recovery probe is claimed, so a refused request cannot leak the probe.
4. The slot is released once on response completion, upstream failure or browser disconnect.

Admission refusals are never counted as service failures and never trip the circuit. Nothing retries; writes are never replayed. The circuit's `Retry-After` now reports the remaining cooldown instead of a constant 15.

The existing native client already shows the server's `error` text, so the refusal messages reach the user without a UI change.

## Verification

`tests/unit/family-admission.server.test.js` (10 tests) covers classification, limit validation, per-window budget and reset, per-account and global concurrency, idempotent release, bounded owner state, circuit peek/probe behaviour, and real HTTP bridge flows: concurrent-write refusal with other accounts admitted, slot release on browser disconnect, per-account budgets with unsupported routes budget-free, and refusals neither tripping nor being preceded by the circuit. The existing bridge, circuit and native Family tests still pass (25 tests across five files in the focused run). Fictional fixtures only; no Family or owner data was read or written.

## Not done and not claimed

- Admission is process-local. Several Ultimate replicas multiply every limit; a shared store is required before they are deployment-wide limits.
- Defaults were not calibrated with load tests, real browsers or production-sized trees. Browser tab fan-out on a large tree load has not been measured against the `read` limits.
- `snapshot()` exposes counts only for tests; it is not surfaced in health or diagnostics.
- The UI does not back off on `Retry-After` and shows refusals as errors.
- Family's own 200-requests-per-15-minutes limiter is unchanged and remains the long-window limit.

## Proposed next steps (not implemented)

1. **Shared admission:** a small store (Redis or PostgreSQL) behind the same class model for multi-replica Ultimate, with the in-process limiter kept as a fallback. Add a per-tree key beside the per-account key so one busy tree cannot starve others.
2. **Measured calibration:** replay a bounded fictional-tree workload, record admitted/refused counts per class, and set defaults from observed concurrency rather than estimates.
3. **Adaptive concurrency:** adjust in-flight caps from measured upstream latency and failures (additive increase, multiplicative decrease) once step 2 provides a baseline; fixed caps stay as hard ceilings.
4. **Priority shedding:** under circuit recovery or saturation, admit interactive reads before transfers and AI, instead of treating classes as fully independent.
5. **Bounded observability:** admitted/refused counters per class without account identifiers, surfaced in Ultimate health and the readiness checks.
6. **Client back-off:** honor `Retry-After` with bounded back-off for idempotent reads only. Writes are retried only with the idempotency keys planned in [Family hardening](2026-11-07-family-hardening.md), never automatically before then.
7. **AI budgets:** per-account AI quotas tied to explicit consent, as listed in the [compact workspace](2026-11-07-family-compact-workspace.md) roadmap. No AI service is enabled by this change.

Run `npm --prefix growthtrack-ultimate exec -- vitest run tests/unit/family-admission.server.test.js tests/unit/family-bridge.server.test.js`.
