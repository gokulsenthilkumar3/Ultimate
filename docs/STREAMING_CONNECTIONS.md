# Entertainment history and custom webhooks

Open **Entertainment → Sync → Streaming connections** in the current source build. Supported service labels are Netflix, Prime Video, Crunchyroll, JioHotstar, SonyLIV, ZEE5, YouTube, Apple TV and Other player. A service label identifies the source of a record; it does not establish an authorized connection to that company.

Netflix documents a [Viewing activity CSV download](https://help.netflix.com/en/node/101917). Choose the exact date format used by your export, upload a CSV, review the preview, then explicitly import it. Imports are limited to 500 rows and 512 KB per file. A normalized CSV works for any supported service:

```csv
id,title,watchedAt,type,durationMinutes
my-stable-event-1,A title,2026-11-06T18:00:00Z,Movie,92
```

Only title and watchedAt are required in normalized CSV; a deterministic title/date ID is generated if id is missing. Netflix Title/Date exports also receive deterministic IDs. Re-importing the same event skips it; use distinct explicit IDs for separate watches with the same title/date. IDs are scoped to the account and service. Reusing an ID with edited content leaves the original event unchanged.

Imported history is separate from library progress and its aggregate episode/runtime metrics. Missing media types, durations and completion states remain unknown. The history panel shows at most the 100 most recently imported entries for the selected service. Runtime values are supplied by the user/sender, not verified against a catalog. No database migration is needed: events use existing EntertainmentMedia records with a dedicated progress marker; connection grants use IntegrationCredential.

## Connect an automation

1. Configure `APP_ENCRYPTION_KEY` in your ignored server environment if it is not already configured. Never change a key that protects existing connections without a reviewed rotation procedure.
2. Select the service, choose **Enable custom webhook**, then copy the one-time signing secret from the password field. Store it in your automation's secret manager, never its URL or public frontend. GrowthTrack seals it with AES-256-GCM, bound to the account and service.
3. Copy the relative endpoint shown under **Sender contract** and prepend your backend origin. A process on this computer can reach the local API. A hosted service cannot reach `127.0.0.1`; it needs a reachable HTTPS backend with the normal authentication, proxy and rate-limit configuration. This change does not expose your local server publicly.
4. Have your sender POST a single JSON event with `Content-Type: application/json`, the current Unix seconds in `X-GrowthTrack-Timestamp`, and the lowercase hex HMAC-SHA256 of `timestamp + "." + exact JSON body` in `X-GrowthTrack-Signature`. Maximum body size is 64 KB. Timestamps outside five minutes are rejected. Stable event IDs prevent duplicate insertion, including concurrent retries through the existing transactional retry path.
5. Refresh the history panel to see acknowledged deliveries. Rotate the secret to invalidate the previous sender credential; disable the webhook to revoke insertion access. Existing history remains available.

This Node.js example sends only the event you explicitly supply. Set `GROWTHTRACK_WATCH_URL` to the copied full endpoint and `GROWTHTRACK_WATCH_SECRET` through the sender's environment, then run the example from your automation. It does not log the secret:

```js
import { createHmac } from 'node:crypto';
const url = new URL(process.env.GROWTHTRACK_WATCH_URL);
if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw Error('Use HTTPS or local loopback.');
const secret = process.env.GROWTHTRACK_WATCH_SECRET;
if (!secret) throw Error('Configure the signing secret.');
const body = JSON.stringify({ id: 'your-stable-event-id', title: 'A title', watchedAt: '2026-11-06T18:00:00Z' });
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
const response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
  headers: { 'Content-Type': 'application/json', 'X-GrowthTrack-Timestamp': timestamp, 'X-GrowthTrack-Signature': signature }, body });
if (!response.ok) throw Error(`Delivery failed: HTTP ${response.status}`);
console.log(await response.json());
```

Optional event fields: type (Movie, Series, Anime, Documentary, YouTube), status (Watching, Completed, Dropped, Plan to Watch), season, episode and durationMinutes. Send only values your source actually establishes. Season/episode identify this event, not the total episodes watched in a series. Unknown fields, account overrides, invalid timestamps and out-of-range values are rejected.

## Provider support and verification limits

Netflix's documented export is an implemented import path. [Login with Amazon profile scopes](https://developer.amazon.com/docs/login-with-amazon/customer-profile.html) cover identity and postal code, not Prime Video history. No documented public personal watch-history webhook was verified for Netflix, Prime Video or Crunchyroll in this work. The custom endpoint therefore requires a sender you control; enabling it alone does not cause those services to send activity. Provider partnerships or a separately reviewed, user-authorized capture adapter remain future work. No streaming passwords, browser cookies, reverse-engineered provider APIs or unofficial account scrapers are used.

Automated route tests exercise synthetic owners, preview/commit, CSV dates/limits, encrypted grants, raw signatures, timestamp expiry, duplicate delivery, owner/provider isolation, rotation and revocation. Browser checks use isolated synthetic API responses at desktop and phone widths; they do not prove live provider synchronization.

The original growing-orbit mark is at `growthtrack-ultimate/public/favicon.svg`; the public entry/workspace logo uses that same asset. Regenerate its seven-resolution Windows icon with `node scripts/build-brand-icon.mjs` from Ultimate (requires local Chrome). The SVG is the editable source; `build/icon.ico` is included in desktop builds. Version 2.0.2 includes this icon; earlier installers retain their old packaged icon.

## 6 November 2026 delivery

The [2.0.2 Windows installer](https://github.com/gokulsenthilkumar3/Ultimate/releases/tag/desktop-v2.0.2) is published and installed locally. The unsigned installer is 303,457,122 bytes; SHA-256 is `d70d3477b9ecfd8fe17d3848b8594c315aba555c8cc234b920b1cd5f5944df96`. Source fingerprint: `43af496bef5dbe39068c8742be05cf94db15a405ca06739a8f99cc95416fdb72`. The release records pending working-tree source changes; no source commit, push or merge was performed.

Fresh verification: 4 route/security tests passed; Chromium flow checks passed at 1440 and 390 pixels. The packaged app also passed real first-run account creation, CSV preview/commit, duplicate skipping, HMAC delivery, encrypted-grant readiness and history display against an isolated SQLite profile. Two events appeared in history and zero in library progress. All 990 installed UI/runtime files matched the build. Per-user upgrade exited 0; the installed executable reports 2.0.2.0, and its existing profile remained connected to Microsoft SQL Server. The live API was restarted on 2.0.2 and returned HTTP 200/CONNECTED. The refreshed icon was extracted from the packaged executable for visual inspection.

Type check, 186 agent tests, installer ignore checks, repository/evidence checks, generated README checks, design adapters and UI handoff/impact drift checks passed. Graphify's AST graph, HTML, report and wiki were refreshed and JSON formatted; its older analysis sidecar remains a warning, with communities reconstructed from the graph. These checks establish neither live streaming-provider sync nor full-app visual coverage. The GitHub Actions workflow remains pending source merge as documented in the release guide.
