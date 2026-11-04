# Technology customization catalog

Generated from `growthtrack-ultimate/src/config/technologyCatalog.json`. Edit that source, then run `npm run technology:sync`. The TOON export carries identical data for agents.

The Stack button in the authenticated portal saves an account-scoped planning profile in this browser. Export/import accepts only known technology IDs. It never installs packages, changes live providers, provisions cloud resources or migrates data. Required runtime credentials remain server-only.

**Status meanings:** present means checked-in code, not verified credentials/deployment; reference-only means incomplete source/configuration; adapter-required means native integration is not implemented. Selecting an entry is not enabling it. The [optional adapter kit](../growthtrack-ultimate/integrations/adapters/README.md) provides 32 disabled service boundaries and templates; verify them with `npm run adapters:check`.

The existing modular portal and independent product services remain the recommended baseline. MERN is an optional service profile: React/Express/Node already exist, but MongoDB storage would need an owned adapter and migration/backup/authorization tests. Do not replace current SQLite/PostgreSQL owners to satisfy a stack label.

## API

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| JSON | present | Workspace | Configuration and HTTP/SSE data envelopes. [Source](../growthtrack-ultimate/server/agents/router.js) |
| REST | present | Ultimate | Existing Express endpoints and authenticated client. [Source](../growthtrack-ultimate/src/lib/apiClient.js) |
| GraphQL | adapter-required | Domain service | Requires an owned schema, resolvers, authorization and query-cost limits. |

## Architecture

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| Modular monolith | present | Ultimate | Retain domain-owned modules in the existing portal/API. [Source](../docs/BUILD_BOUNDARIES.md) |
| Microservices | reference-only | OxFin | Prototype service source exists; independent deployment and production readiness are unverified. [Source](../FinSync/OxFin/services/api-gateway/README.md) |
| Serverless | adapter-required | Deployment owner | Requires runtime/storage/session/worker design; not suitable for the complete local desktop stack unchanged. |
| MERN | adapter-required | Optional domain service | React, Express and Node exist. MongoDB persistence is not installed; preserve existing SQL owners. |

## Caching

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| CDN / edge cache | present | Ultimate edge | Static asset policies exist; no external CDN is provisioned. [Source](../growthtrack-ultimate/deploy/Caddyfile) |
| Redis | present | OxFin / Family | Existing product configuration; live connection not verified. [Source](../FinSync/OxFin/ox-fin-backend/docker-compose.yml) |
| Memcached | adapter-required | Domain service | Needs key ownership, TTLs, invalidation, outage behavior and private-data policy. |

## CI and version control

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| GitHub | present | Workspace | Checked-in GitHub Actions workflows. [Source](../.github/workflows/ci.yml) |
| GitLab | adapter-required | Workspace CI | Requires translating existing gates, secrets, artifact retention and protected-branch policies. |
| Bitbucket | adapter-required | Workspace CI | Requires translating existing gates, secrets, artifact retention and protected-branch policies. |
| Jenkins | adapter-required | Workspace CI | Requires translating existing gates, secrets, artifact retention and protected-branch policies. |
| CircleCI | adapter-required | Workspace CI | Requires translating existing gates, secrets, artifact retention and protected-branch policies. |

## Deployment

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| Docker | present | Application owner | Docker build/runtime manifests exist; not a deployment authorization. [Source](../growthtrack-ultimate/Dockerfile) |
| Vercel | reference-only | Equity | Existing deployment configuration; hosted status unverified. [Source](../Equity/NiftyLens/vercel.json) |
| AWS | adapter-required | Deployment owner | Needs isolated deployment manifests, identity/secrets, persistent storage, health, rollback and cost limits. |
| Azure | adapter-required | Deployment owner | Needs isolated deployment manifests, identity/secrets, persistent storage, health, rollback and cost limits. |
| GCP | adapter-required | Deployment owner | Needs isolated deployment manifests, identity/secrets, persistent storage, health, rollback and cost limits. |
| Kubernetes | adapter-required | Deployment owner | Needs isolated deployment manifests, identity/secrets, persistent storage, health, rollback and cost limits. |

## AI

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| GPT / OpenAI | adapter-required | Agents | Existing GPT-OSS through Groq is not the OpenAI GPT API. A native provider needs its own transport and tests. |
| Claude | adapter-required | Agents | Requires Anthropic transport, consent, models, streaming and error-contract tests. |
| Gemini | reference-only | Family / integrations | Existing SDK references do not establish a working Ultimate chat provider. [Source](../Family%20Connect/familyconnect/backend/package.json) |
| DeepSeek | adapter-required | Agents | Can be evaluated through configured local inference when installed; not a verified provider here. |
| Mistral | adapter-required | Agents | Requires an evaluated local model or owned provider adapter. |
| Meta Llama | adapter-required | Agents | Ollama can discover permitted installed text models; no Llama checkpoint was installed or evaluated. |
| Groq | present | Agents | Existing bounded chat/plan transport; keys required. [Source](../growthtrack-ultimate/server/agents/groq.js) |
| Ollama | present | Agents | Existing local inference transport; running models required. [Source](../growthtrack-ultimate/server/agents/router.js) |
| Jev | present | Agents | Optional advisory decision adapter; key/consent required, no automatic actions. [Source](../growthtrack-ultimate/server/agents/jev.js) |
| Laya | present | Agents | Loopback HTTP decision adapter; separate local server/checkpoints required, live inference unverified. [Source](../growthtrack-ultimate/server/agents/jev.js) |

## Frameworks

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| Node.js | present | Workspace | Existing JavaScript runtime; Node is a runtime rather than an application framework. [Source](../package.json) |
| React | present | Ultimate | Existing frontend. [Source](../growthtrack-ultimate/package.json) |
| Express | present | Ultimate | Existing API. [Source](../growthtrack-ultimate/server.js) |
| FastAPI | present | Forex | Existing owned Python API. [Source](../Forex/Dockerfile.api) |
| Spring Boot | adapter-required | Independent service | Use a separate domain-owned service with versioned HTTP contracts and independent dependencies/tests. |
| Django | adapter-required | Independent service | Use a separate domain-owned service with versioned HTTP contracts and independent dependencies/tests. |
| Ruby on Rails | adapter-required | Independent service | Use a separate domain-owned service with versioned HTTP contracts and independent dependencies/tests. |
| LangChain | adapter-required | Independent service | Use a separate domain-owned service with versioned HTTP contracts and independent dependencies/tests. |

## Databases

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| PostgreSQL | present | Family / OxFin | Independent SQL owners and migration tests. [Source](../tests/database-postgres-schema.mjs) |
| SQLite | present | Ultimate | Existing owner-scoped persistence. [Source](../growthtrack-ultimate/prisma/schema.prisma) |
| MySQL | adapter-required | Data owner | Requires an owned schema/adapter, query and ownership semantics, migration/replay and backup/restore tests. |
| Oracle | adapter-required | Data owner | Requires an owned schema/adapter, query and ownership semantics, migration/replay and backup/restore tests. |
| MongoDB | adapter-required | Data owner | Requires an owned schema/adapter, query and ownership semantics, migration/replay and backup/restore tests. |
| DynamoDB | adapter-required | Data owner | Requires an owned schema/adapter, query and ownership semantics, migration/replay and backup/restore tests. |
| Apache Cassandra | adapter-required | Data owner | Requires an owned schema/adapter, query and ownership semantics, migration/replay and backup/restore tests. |

## Languages

| Technology | Status | Owner | Scope and evidence |
| --- | --- | --- | --- |
| JavaScript | present | Workspace | Existing authored application source. [Source](../growthtrack-ultimate/server.js) |
| TypeScript | present | Workspace | Existing authored application source. [Source](../growthtrack-ultimate/src/config/featureRegistry.ts) |
| Python | present | Forex | Existing Python runtime; keep its independent environment. [Source](../Forex/main.py) |
| Swift | present | iOS companion | Existing native source/build checks. [Source](../growthtrack-ultimate/companions/ios/Package.swift) |
| Java | adapter-required | Independent service | New language runtimes require a separately owned build, dependencies, tests and deployment contract. |
| C# | adapter-required | Independent service | New language runtimes require a separately owned build, dependencies, tests and deployment contract. |
| Ruby | adapter-required | Independent service | New language runtimes require a separately owned build, dependencies, tests and deployment contract. |
| PHP | adapter-required | Independent service | New language runtimes require a separately owned build, dependencies, tests and deployment contract. |
| Rust | adapter-required | Independent service | New language runtimes require a separately owned build, dependencies, tests and deployment contract. |
| Go | adapter-required | Independent service | New language runtimes require a separately owned build, dependencies, tests and deployment contract. |

## Completion boundary

Every technology requested is represented in this catalog and can be selected in a validated planning profile. The adapter-required entries are not implemented systems. Supporting multiple clouds, databases, languages and CI providers requires separate versioned contracts, fixtures and deployment evidence for each owner. This pass does not create paid services, external repositories, database migrations or CI accounts.

Use [the agent workflow](AGENT_WORKFLOW.md) for Jev/Laya and [the Laya integration guide](../growthtrack-ultimate/integrations/laya/README.md) for local setup. No GrowthTrack benchmark establishes that Laya is better than Jev.
