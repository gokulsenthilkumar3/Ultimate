# Family opening error: stale API and ignored listen failure

Date: 7 November 2026. Status: fixed locally; owner browser review remains separate.

Symptom: immediately opening Family showed “Service unavailable / The Family service could not complete this request.” Basic UI/API/database health checks were all 200.

Root cause: the live Family process predated the Me route. A GET-only probe signed for a nonexistent diagnostic principal returned HTML 404 on `/api/v1/trees/diagnostic-no-such-tree/me`, while an older access route returned JSON 403 and the tree list returned an empty JSON list. Compiled files contained Me, but the running process had not loaded them. No owner identity was impersonated, session created or owner records queried by this probe.

A replacement process had previously attempted to bind the occupied port. Express 5 passed the listen error into the startup callback, which ignored it and announced success. Its background cron kept the non-listening process alive. Port/PID inspection did not reliably attribute the live listener, so it was not a sufficient restart verification. The actual route probe exposed the stale process.

Fix:

- Handle the listen callback error, report only its sanitized code and exit 1. Start background jobs only after binding succeeds.
- Report `service: family-connect-api` and `apiContract: family-native/1.1` in health metadata, and emit a listening event with actual port/PID only after success.
- Return a JSON missing-route error for unmatched Family API paths.
- Explain HTML 404/429 responses in the native client instead of masking them as a generic service failure. No authentication bypass or silent Me fallback was added.
- Stop only the two previously owned Family processes after checking their command lines, then start one current process. Ultimate, its sessions and databases were left intact.

Verification:

- Before the fix, an isolated occupied-port regression remained running instead of exiting; after the fix it exits 1 with EADDRINUSE and no successful-listening announcement.
- A fresh isolated process advertises the contract and returns JSON for missing routes. Its database configuration is synthetic and it reads no owner data.
- All 30 Family tests and 11 selected native-session/bridge tests passed.
- The live Me route changed from HTML 404 to JSON 403 for a nonexistent test identity; other permission checks remained enforced. Family health advertises the current contract and database readiness returns 200.
- Browser scenarios use fictional intercepted APIs. The browser-control host was unavailable, so the owner's authenticated browser could not be directly inspected.

Durable learning: verify a new runtime with an actual feature/contract probe after restart. A healthy port and an alive process do not prove the expected source was loaded, particularly when the framework delivers bind errors through a callback.
