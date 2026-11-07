# Family shares the Ultimate session

The native Family workspace at `/Ultimate/life/family` uses the signed-in Ultimate account. It has no second login, registration or disconnect control. The Ultimate shell, navigation and session govern Family alongside the other native modules. Family still owns its tree data, member roles, private files and database.

## Identity and permissions

The browser calls `/api/native/family` on the Ultimate API using its existing HttpOnly session cookie and CSRF protection. Ultimate authenticates every request and signs a 30-second, method/path-bound server assertion. The browser never receives a Family token or the bridge secret. Incoming browser authorization, cookies and identity headers are not forwarded to Family.

Family validates the assertion and derives a stable internal identity from the Ultimate account ID. Opening Family creates only that identity when necessary; it does not create trees or grant access to other users' trees. Existing tree roles and document authorization remain mandatory. Logout/account changes clear the native connection and cached Family queries. Failed bridge validation is a service error rather than a second login prompt.

An existing Family account can be preserved by explicitly configuring both `ULTIMATE_OWNER_ID` and `ULTIMATE_FAMILY_USER_ID` on the Family server. The IDs must refer to the intended accounts. Email matching never claims an existing Family account. Unlinked new identities use the Ultimate email if available; a collision uses a stable internal alias. No data migration or automatic merging occurs.

## Local setup

- Ultimate server: `FAMILY_API_URL=http://127.0.0.1:3104` and `FAMILY_ULTIMATE_SECRET` containing a randomly generated 64-character hexadecimal secret.
- Family server: the identical secret in `ULTIMATE_BRIDGE_SECRET`, `PORT=3104`, `LISTEN_HOST=127.0.0.1`, and its existing database configuration.
- Keep both secrets in ignored server environment files. Never expose them through `VITE_` variables or commit them.
- With the bridge configured, Family rejects legacy bearer-only requests and disables its separate login/registration endpoints. Standalone deployments without the bridge retain their original authentication.
- Run the existing Family PostgreSQL service, Family API and Ultimate API alongside the UI. The local environment has been configured; no database schema/data migration was performed.

## Verification

The isolated integration suite exercises shared authentication, CSRF, request signatures, rejected identity overrides, explicit legacy mappings, uploads/downloads and unchanged tree denial. Component tests cover automatic opening, service retry, owner changes, viewer restrictions and private-file access revocation. Browser tests in `playwright.family.config.ts` use fictional API responses and never write to the local database; they cover desktop/mobile opening and service recovery. These do not establish a visual sign-off or prove the current owner's authenticated live session.

Verified on 7 November 2026: all 18 shared-session/native-flow/security tests passed, plus two Chrome browser scenarios at 1440px and 390px. Family TypeScript compilation passed. Agent checks (3 tooling tests and 186 unit tests), repository validation, evidence provenance checks, UI impact/handoff drift checks and all 23 generated application READMEs passed. Screenshots remain in ignored `growthtrack-ultimate/playwright-report/`.

Live checks returned 200 for the UI, Ultimate API health and Family API health; 401 for unsigned Family tree requests and unauthenticated Ultimate Family requests; and 410 for separate Family login in integrated mode. The browser-control host was unavailable during this change, so an authenticated inspection of the owner's browser was not possible. Desktop packaging and public deployment are outside this web-only update.
