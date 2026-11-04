# Production edge security and readiness

Reviewed 5 November 2026. **Not certified production-ready.** No production domain,
DNS zone, hosting/CDN account or deployed origin was supplied. Repository changes
below are implemented and locally tested; DNS/CDN/WAF/firewall activation is not.
No production DNS, certificates, provider settings or customer data were changed.

Application follow-up: [5 November implementation record](../../docs/plans/2026-11-05-production-security-implementation.md)
documents the new server-held FinSync onboarding encryption and read-only
product-scoped customer adapters. They require secret/identity/rules deployment
and preserve explicit unavailable states until configured. Legacy ciphertext is
not overwritten and real customer writes remain disabled.

## Implemented repository protections

- Caddy automatic HTTPS with TLS 1.2–1.3, persistent certificate storage in
  Compose, HTTP-to-HTTPS redirects and an application HTTPS origin.
- Caddy limits: 32 KB headers, 10-second header read, two-minute body/idle
  limits, 65 MB body ceiling, five-second upstream dial and 60-second response
  header timeout. The body ceiling accommodates the existing 25 MB upload and
  configurable JSON limit; application-specific validation remains stricter.
  No short response-write deadline is added to break agent streams/downloads.
- Only Caddy publishes ingress ports in Compose. Ultimate stays on the backend
  network, with a read-only root, dropped capabilities and mounted secrets/data.
- Direct-origin profile replaces forwarded client-IP chains with the socket peer
  and removes client-supplied alternative IP/request-ID headers. Express trusts
  one hop. Do not publish port 3001 or a development gateway to the Internet.
- API requests, including reads, now share a 600-request/client/minute budget
  across paths. Its client map is capped at 10,000 entries and fails closed with
  503 at capacity. Existing write/path and login limits remain, with tracking
  maps capped at 10,000 entries. 429/503 responses are private/no-store;
  the aggregate budget returns Retry-After. Limits are process-local and are
  neither network DDoS mitigation nor multi-instance coordination.
- API/auth responses are no-store. Only anonymous, non-range, hashed JS/CSS
  assets are public immutable for a year, including precompressed variants.
  Cookie/authorization requests, HTML, service workers and missing assets are
  not made public by this change. CDN rules must respect these distinctions.
- Existing authenticated sessions, CSRF, ownership checks, hashed CSP scripts,
  HSTS, MFA support, private-file encryption and verified encrypted scheduled
  database backups remain. MFA/backups still require actual configuration.
- OxFin's database helper now verifies production TLS certificates, supports
  a server-only private CA and omits SQL text from query timing logs; see
  [database TLS](../../FinSync/OxFin/ox-fin-web/DATABASE_TLS.md).

## CDN, DNS and upstream DDoS activation

Cloudflare is a reference option, not an installed service. Equivalent provider
controls are acceptable. Complete these against the actual domain/account:

1. Inventory current DNS and mail records before any nameserver change. Enable
   registrar MFA/lock, verify authoritative delegation, remove stale records and
   configure DNSSEC with the matching registrar DS record. Verify the complete
   chain; incorrect DS changes can take a domain offline. Use CAA only after
   confirming the certificate issuers used by both edge and origin.
2. Proxy the application hostname through the CDN and enable the provider's
   supported HTTP/network DDoS protections and WAF managed rules. Configure
   alerts and evaluate rules using legitimate login/API/upload/stream traffic.
   Apply separate limits to login and costly read endpoints, accounting for
   shared networks. Exempt verified webhooks from browser challenges, not from
   signature validation; keep CSRF protections on browser mutations.
3. Require HTTPS and validated encryption to the origin (Cloudflare Full
   **strict**, never Flexible or unverified Full). Test certificate validity,
   hostname, TLS versions, renewal, HTTP redirect and expiry alerting. DNSSEC
   protects DNS integrity; it does not replace TLS or DDoS protection.
4. Prevent direct-origin bypass with an authenticated tunnel or a host/cloud
   firewall permitting only the selected provider ingress. Close public access
   to application, databases, studio and gateway ports. Account for monitoring,
   SSH recovery and certificate renewal before applying firewall changes.
5. Configure provider-specific trusted proxy CIDRs and client-IP propagation
   **before** using the current direct-origin Caddy profile behind a CDN. The
   current profile deliberately uses the socket peer: behind a CDN, requests
   from an edge IP share a budget. Never simply trust arbitrary CF-Connecting-IP
   or X-Forwarded-For headers, or increase Express hop trust blindly. No provider
   IP ranges or trust configuration were guessed or activated in this review.
6. Bypass CDN caching for `/api/*`, `/auth/*`, authenticated cookies, Authorization,
   Set-Cookie responses, private files, HTML, service-worker code and webhook
   responses. Cache only explicit public immutable assets while respecting
   Cache-Control and Vary: Accept-Encoding. Test with two synthetic users so one
   account can never receive another's cached response. Do not use Cache Everything.
7. Validate each separately hosted FinSync/OxFin/Family/Forex hostname and its
   own ingress/auth/storage controls. Ultimate's Caddyfile does not protect an
   independently public companion endpoint.

Provider references: [Full strict TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/),
[DDoS protection](https://developers.cloudflare.com/ddos-protection/),
[DNSSEC](https://developers.cloudflare.com/dns/dnssec/),
[cache behavior](https://developers.cloudflare.com/cache/get-started/),
[Caddy server controls](https://caddyserver.com/docs/caddyfile/options).

## Verification and deployment gate

Local verification on 5 November 2026: the five-file command below passed
**19 tests, 0 failures**. Caddy's `validate` accepted the hardened Caddyfile in a
disposable `caddy:2-alpine` container with networking disabled and only the
configuration mounted read-only. Syntax checks and the generated README check
also passed. This did not launch the production application or obtain a public
certificate. Security fixture cleanup reported a temporary synthetic SQLite
directory retained until native handles close; no owner database was used.

Run from Ultimate:

```powershell
node --test tests/unit/server-backend/request-budget.test.mjs tests/unit/server-backend/edge-cache.test.mjs tests/unit/server-backend/frontend.test.mjs tests/unit/server-backend/security-hardening.test.mjs tests/unit/server-backend/config.test.mjs
node scripts/verify-production-edge.mjs your-production-hostname.example
```

The second command is a bounded read-only public DNS/TLS/header probe. It prints
no page body, credentials or certificate keys. It reports productionReady=false
because DNSSEC/CDN/WAF/firewall and application readiness require independent
evidence; response headers alone cannot prove them. Probe the actual hostname,
not the example. Do not run load/attack simulations against third-party hosts.

Before rollout, validate Caddy configuration, use a staging deployment, confirm
legitimate uploads/streams under the limits and test real client-IP separation.
Public probes do not certify origin firewall rules, lower TLS rejection,
certificate renewal, WAF effectiveness, backup recovery or hosted CI success.

Remaining application activation gates from [the engineering plan](../../docs/Eng%20Plan.md):
deploying the new FinSync encryption boundary and Firestore rules, provisioning
product-scoped admin credentials/readers, legacy ciphertext compatibility where
present, supported application dependencies, and deployment-specific
MFA/secrets/recovery verification. Customer-admin remains unavailable until its
new read-only adapters are explicitly configured; customer writes remain disabled.
No document can truthfully mark all production security complete until these
application and external deployment gates have evidence.
