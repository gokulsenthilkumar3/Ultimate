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

For Groq, enter these server-only settings in `growthtrack-ultimate/.env`, then
restart the Ultimate API and refresh models on Agents → Settings:

```dotenv
AGENTS_PROVIDER=groq
GROQ_API_KEY=your-key
GROQ_DEFAULT_MODEL=openai/gpt-oss-120b
GROQ_MODELS=openai/gpt-oss-120b,qwen/qwen3.8-27b
```

The key is never sent to the browser. Do not use a `VITE_` key variable.
Enter the real key only in `.env`, which Git ignores. Keep `GROQ_API_KEY`
empty in the tracked `.env.example`; do not paste a real key into a source
file, test fixture, screenshot, or chat. Both configured models use the same
Groq key.
Requests go only to `https://api.groq.com/openai/v1` with redirects disabled.
Model discovery intersects Groq's enabled models with `GROQ_MODELS` and the
optional application allowlist. GPT-OSS uses temperature/top-p 1 and medium
reasoning; Qwen uses 0.6/0.95 and default reasoning. Both use a 2,048 completion
token limit and omit separate reasoning from the displayed answer. See the
[Groq API reference](https://console.groq.com/docs/api-reference).

For local inference, set `AGENTS_PROVIDER=ollama` and server-only
`OLLAMA_BASE_URL` (e.g. `http://127.0.0.1:11434` on the backend machine).
Without an explicit provider, a nonempty `GROQ_API_KEY` selects Groq; otherwise
Ollama is used. There is no automatic provider failover. Missing/invalid
configuration returns 503 and readiness false. No request/browser URL is
accepted. No model pulls or database reads/writes occur in the router.

Tests can inject `{ provider, groqApiKey, groqModels, groqDefaultModel,
ollamaBaseUrl, fetchImpl, timeoutMs, readinessTimeoutMs, allowedModels }`.
`allowedModels` restricts exact model IDs. Default total
chat deadline: 120 seconds; discovery: 5 seconds.

| Method | Path | Response |
|---|---|---|
| GET | `/readiness` or `/models` | `{ configured, provider, defaultModel, ready, available, modelCount, models, reason, code, capabilities }` |
| POST | `/chat` | SSE `meta`, repeated `delta`, then `done` or `error` |
| POST | `/plan` | Validated `{ summary, actions, model, requiresReview: true }`; no execution |

Empty/embedding-only/disallowed lists report readiness false. Local models come
from Ollama tags; text eligibility excludes embedding names. Tags do not certify
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
Types and required sensitive domains are defined in
`src/lib/aiContextTypes.js`. They include work records, wellness/finance logs,
journal entries, and optional per-domain overview summaries.
Sensitive types require their matching domain and explicit consent. Styles:
`standard`, `multiple-choice`. Unknown fields, model URLs, tools, and action
payloads are rejected (400), as are models absent from the permitted installed
list. Oversized bodies return 413, including when parent JSON parsing already ran.

Frames contain JSON: `event: delta` / `data: {"text":"Hello"}`.
`meta`: `{ model, provider, actionsSupported: false }`; `done`: `{ model, done: true }`.
Pre-stream errors use JSON `{ code, error }`; mid-stream errors emit `error`
with that shape, never successful `done`. Incremental UTF-8 NDJSON follows
[Ollama chat](https://docs.ollama.com/api/chat). The proxy bounds records/output,
honors backpressure, and aborts upstream on disconnect/deadline. Groq SSE is
normalized to the same contract and requires both a successful finish reason
and `[DONE]`. Length-limited, malformed, or interrupted answers report errors.
Invalid keys and provider permission errors use `provider_auth_failed` (503);
rate limits use `rate_limited` (429). Upstream error bodies are not returned and
requests are not automatically retried. Clients require
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

Chat accepts optional `intent: "general" | "insights"` (default `general`) and
`today` (`YYYY-MM-DD`, a real calendar date). Public application knowledge is
injected server-side from `knowledge.js`; it contains navigation and feature
guidance, never environment variables or account information. General questions
can use model knowledge. Account findings require supplied sources; no live web
or arbitrary database tools are available. Overview summaries are computed from
projected owned records only, remain unselected by default, and inherit the
same category-consent boundary as individual records. Their coverage is the
loaded subset, not a guarantee of a complete account export. Streaming chat has
a 4,096 completion-token budget; action plans retain 2,048.

`/chat` does not execute actions. `/plan` accepts the chat fields plus `today`
(`YYYY-MM-DD`) and an assistant preset. It requests non-streaming JSON, validates
the shared action schema and selected record references, and returns reviewable
proposals. Groq uses best-effort `json_schema` because the shared schema includes
optional fields; application validation remains mandatory. Other configured
Groq models use JSON object mode. See [Groq structured outputs](https://console.groq.com/docs/structured-outputs).
No tools or persistence APIs are exposed to the model. Tests import
only this router with fake auth/fetch and mocked state, never `server.js`, Prisma,
or `dev.db`.
