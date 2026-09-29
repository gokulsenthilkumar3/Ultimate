# Agents API contract

Main/backend owns mounting. Named and default exports are the factory:

```js
import createAgentsRouter from './server/agents/router.js';
app.use('/api/agents', authMiddleware, createAgentsRouter());
```

Mount after existing origin/session/CSRF middleware, preserving security headers
and API rate limits. The factory independently requires `req.user.id`; it does
not replace session/CSRF verification. Browser requests use same-origin
`/api/agents` and the existing `X-CSRF-Token`. Do not log request bodies, selected
context, or model output.

Set server-only `OLLAMA_BASE_URL` (e.g. `http://127.0.0.1:11434` on the backend
machine). Missing/invalid configuration returns 503 and readiness false. No
request/browser URL is accepted; redirects are disabled. No model pulls or
database reads/writes occur.

Tests can inject `{ ollamaBaseUrl, fetchImpl, timeoutMs, readinessTimeoutMs,
allowedModels }`. `allowedModels` restricts exact installed names. Default total
chat deadline: 120 seconds; discovery: 5 seconds.

| Method | Path | Response |
|---|---|---|
| GET | `/readiness` or `/models` | `{ configured, ready, available, modelCount, models, reason, capabilities: { streaming: true, actions: false } }` |
| POST | `/chat` | SSE `meta`, repeated `delta`, then `done` or `error` |

Empty/embedding-only/disallowed lists report readiness false. Models come from
Ollama tags; text eligibility excludes embedding names. Tags do not certify
vision/tool support or sufficient server memory. Generation errors remain visible.
Discovery failures use 502/503/504. All responses use `no-store`.

Chat JSON (64 KiB maximum):

```json
{
  "model": "gemma3:1b",
  "messages": [{ "role": "user", "content": "Help me plan today" }],
  "context": [{ "id": "task-1", "type": "tasks", "domain": "workspace", "label": "Review draft", "text": "Review draft" }],
  "consent": { "wellness": false, "finance": false, "journal": false },
  "responseStyle": "standard"
}
```

Only user/assistant messages: at most 16, each up to 8,000 characters, ending in
a user message. Context: at most 20 records, 6,000 characters of text each.
Types: `tasks`, `goals`, `habits`, `metrics`, `sleep`, `transactions`, `journal`.
Sensitive types require their matching domain and explicit consent. Styles:
`standard`, `multiple-choice`. Unknown fields, model URLs, tools, and action
payloads are rejected (400), as are models absent from the permitted installed
list. Oversized bodies return 413, including when parent JSON parsing already ran.

Frames contain JSON: `event: delta` / `data: {"text":"Hello"}`.
`meta`: `{ model, actionsSupported: false }`; `done`: `{ model, done: true }`.
Pre-stream errors use JSON `{ code, error }`; mid-stream errors emit `error`
with that shape, never successful `done`. Incremental UTF-8 NDJSON follows
[Ollama chat](https://docs.ollama.com/api/chat). The proxy bounds records/output,
honors backpressure, and aborts upstream on disconnect/deadline. Clients require
`done`; EOF alone is incomplete. Stop uses AbortController.

Context is client-selected reference text, not an authoritative server lookup.
The client uses `user.tasks.pending/completed`, `metric_logs`, and session
collections; excludes mismatched `userId`/`user_id`; projects allowed fields.
Top-level records without an owner are excluded; task drafts can rely on their
placement under the signed-in `user.tasks` collection.
No profile, arbitrary blobs, legacy tasks, or whole-account context is sent.
Sensitive categories start off; enabling a category does not select records.
Changing selections omits earlier history with different context snapshots.
Chats stay in memory and reset on account/session change or unmount. The old
unscoped session cache is removed. Typed messages also go to the model server.

Actions are unsupported. No tools are supplied/executed or persistence API exposed;
confirmation is disabled. Suggestions are drafts for manual review. Tests import
only this router with fake auth/fetch and mocked state, never `server.js`, Prisma,
or `dev.db`.
