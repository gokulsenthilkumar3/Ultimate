# Optional local Laya decision service

The source at [NandhaKishorM/laya](https://github.com/NandhaKishorM/laya) was inspected at commit `462c2644e654add83516e53c7a65909f8072d529`. Its [HTTP documentation](https://github.com/NandhaKishorM/laya/blob/462c2644e654add83516e53c7a65909f8072d529/docs/http-api.md) defines a Jev-compatible `/v1/systemone` protocol. This app adds a bounded client for that protocol; Laya's model source is not copied into the application.

## Isolated setup

This optional Python service uses its own virtual environment and pinned source requirement. Do not install it into Forex's environment or globally. Installation can pull PyTorch and model dependencies; running inference may download substantial checkpoints and requires appropriate memory/hardware. On 5 November 2026, the local installation verified Laya 0.4.22 with Python 3.11 and PyTorch 2.15.0 CPU. `requirements.lock` records installed dependency versions; the ignored virtual environment and model cache are machine-local.

From this directory, with a supported Python 3.10+ interpreter and Git installed:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -I -c "import laya; print(laya.__version__)"
```

The version check imports the package without creating a router or loading checkpoints. The inspected server entry point uses environment variables, not an argparse `--help` flow. After reviewing model download/memory requirements, launch explicitly:

```powershell
$env:LAYA_HOST='127.0.0.1'
$env:LAYA_PORT='8011'
$env:LAYA_MODELS='multilingual'
$env:LAYA_MAX_TOKEN_BUDGET='8192'
$env:LAYA_JEV_STRICT='0'
.\.venv\Scripts\laya-serve.exe
```

Enable its bearer authentication if other local processes are not trusted. Supply its key through local secrets, using the same server-only `LAYA_API_KEY` in Ultimate. The adapter explicitly selects `multilingual` to accommodate the app feature catalog. It rejects a response unless `usage.truncated` is false, `state_tokens_dropped` is zero, `truncated_questions` is empty and any reported choice spans preserve every option. Review omitted/strict-mode metadata rather than silently accepting truncation.

## Connect Ultimate

Configure the ignored Ultimate server environment, then restart the API:

```dotenv
AGENTS_DECISION_PROVIDER=laya
LAYA_ENABLED=true
LAYA_BASE_URL=http://127.0.0.1:8011
LAYA_API_KEY=
```

`LAYA_API_KEY` is optional when the local server does not require authentication. It is never read from a browser request. Only literal loopback IPs over HTTP with no URL credentials/path/query are accepted, and the client fixes `/v1/systemone`. Nonlocal hosts, remote URLs and redirects are rejected. There is no automatic startup, installation, fallback to Jev or automatic cloud upload. Keep the local deployment private; remote hosting needs a separately reviewed transport policy.

Use **AI guide** in the portal header. The panel identifies the server-selected provider and requires per-request consent. A configured URL is not proof of a reachable model: readiness is explicitly not live verified. The first successful, complete inference establishes only that one request worked. The shared advice contract, admission limits, ten-second deadline, bounded output, closed choice set, abstention and action-review rules remain in force.

## Evaluation and limits

Local live verification on 5 November 2026 downloaded the multilingual checkpoint and returned a Sleep suggestion for one synthetic navigation request (confidence 0.986, about 10.4 seconds with a warm-up deadline). This exceeded the app's ten-second request budget and does not establish responsive production use or model quality. The adapter accounts for the pinned source's four-decimal probability rounding, while preserving confidence thresholds and consistency checks. Run `node live-smoke.mjs --warmup` for explicit checkpoint warm-up, then `node live-smoke.mjs` to enforce the app deadline. Reports go to ignored local temporary storage. No owner records are used; cold downloads may require network access. The local process is started explicitly and is not installed as an automatic system service.

The subsequent ten-second smoke check timed out on this CPU setup. Keep Laya optional until it meets the request budget on the intended hardware. Publisher benchmark claims do not establish superiority for GrowthTrack. Before selecting a default, evaluate representative feature requests, languages, ambiguous/out-of-scope cases, sensitive-text handling, truncation, latency and memory on held-out synthetic or approved data. Use separate thresholds for each provider after calibration. Current thresholds are provisional and never authorize actions.

Tests use mocked HTTP responses. They do not test checkpoint quality, installation compatibility or live inference. The initial provider follows `AGENTS_DECISION_PROVIDER`; the AI guide may explicitly select another provider enabled/configured on the server with fresh consent; Laya is an alternative decision provider, not a text-generation replacement for Groq/Ollama.
