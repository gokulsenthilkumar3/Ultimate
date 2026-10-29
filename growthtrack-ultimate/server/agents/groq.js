// Server-only transport. Browser requests never supply a key or upstream URL.
import { AGENT_LIMITS } from '../../src/lib/agentPolicy.js';
import { boundedChunks, failure, readBoundedJson as readJson } from './transport.js';

const ROOT = 'https://api.groq.com/openai/v1';
const MAX_FRAME_CHARS = AGENT_LIMITS.frameChars;
export const DEFAULT_GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];
const STRUCTURED_MODELS = new Set([...DEFAULT_GROQ_MODELS, 'openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b', 'meta-models/muse-spark-open']);
const validModel = value => typeof value === 'string' && value.length <= 160 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*$/.test(value);

function modelOptions(model) {
  if (model === 'qwen/qwen3.8-27b') return { temperature: 0.6, top_p: 0.95, reasoning_effort: 'default', reasoning_format: 'hidden' };
  if (/^openai\/gpt-oss-(?:20b|120b)$/.test(model)) return { temperature: 1, top_p: 1, reasoning_effort: 'medium', include_reasoning: false };
  return { temperature: 0.6, top_p: 0.95 };
}

/** Normalize Groq SSE into the existing Agents text/done contract. */
export async function* groqRecords(body, signal) {
  const decoder = new TextDecoder();
  let pending = '';
  let finished = false;
  let frames = 0;
  for await (const value of boundedChunks(body, signal)) {
    pending += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = /\r?\n\r?\n/.exec(pending))) {
      signal.throwIfAborted();
      const frame = pending.slice(0, boundary.index);
      pending = pending.slice(boundary.index + boundary[0].length);
      if (++frames > AGENT_LIMITS.streamRecords || frame.length > MAX_FRAME_CHARS) throw failure('invalid_stream', 'The Groq stream event exceeded the size limit.');
      const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      if (data === '[DONE]') {
        if (!finished) throw failure('incomplete_stream', 'Groq ended the response before completing the answer.');
        yield { done: true };
        return;
      }
      let record;
      try { record = JSON.parse(data); }
      catch { throw failure('invalid_stream', 'Groq returned an invalid stream event.'); }
      if (record?.error || !Array.isArray(record?.choices)) throw failure('invalid_stream', 'Groq could not complete this response.');
      if (!record.choices.length) continue; // Optional usage-only chunk.
      const choice = record.choices.find(item => item.index === 0);
      if (!choice || finished || choice.delta?.tool_calls || choice.delta?.refusal) throw failure('invalid_stream', 'Groq returned an unsupported response.');
      const content = choice.delta?.content;
      if (content != null && typeof content !== 'string') throw failure('invalid_stream', 'Groq returned an invalid text chunk.');
      if (content) yield { message: { content }, done: false };
      if (choice.finish_reason != null) {
        if (choice.finish_reason !== 'stop') throw failure('incomplete_stream', 'Groq could not finish the answer within the response limit. Try a shorter request.');
        finished = true;
      }
    }
    if (pending.length > MAX_FRAME_CHARS) throw failure('invalid_stream', 'The Groq stream event exceeded the size limit.');
  }
  throw failure('incomplete_stream', 'The Groq response stream was interrupted. Try again.');
}

export function createGroqTransport({ apiKey, modelNames, defaultModel = DEFAULT_GROQ_MODELS[0], fetchImpl = globalThis.fetch } = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  const names = modelNames == null ? DEFAULT_GROQ_MODELS : Array.isArray(modelNames) ? modelNames : String(modelNames).split(',').map(name => name.trim());
  const permitted = new Set(names);
  const validConfig = names.length > 0 && names.length <= 20 && names.every(validModel);
  const preferred = permitted.has(defaultModel) ? defaultModel : names[0];
  const configured = Boolean(key && !/[\r\n]/.test(key) && validConfig);

  async function request(path, options) {
    if (!configured) throw failure('not_configured', 'Set GROQ_API_KEY in the server environment to use Groq. Check GROQ_MODELS if configured.', 503);
    try {
      const response = await fetchImpl(`${ROOT}${path}`, {
        ...options, redirect: 'error',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (response.status === 401 || response.status === 403) throw failure('provider_auth_failed', 'Groq rejected the API key or model access. Check the server key and Groq model permissions.', 503);
        if (response.status === 429) throw failure('rate_limited', 'Groq rate limit reached. Wait before trying again.', 429);
        if (response.status === 400 || response.status === 404) throw failure('provider_request_rejected', 'Groq could not accept this request. Check that the selected model is enabled.', 502);
        throw failure('upstream_unavailable', 'Groq is unavailable. Try again later.', 503);
      }
      return response;
    } catch (error) {
      if (error.agentsFailure || options.signal.aborted) throw error;
      throw failure('upstream_unavailable', 'Groq is unavailable. Try again later.', 503);
    }
  }

  function generation(model, messages, stream) {
    if (!permitted.has(model)) throw failure('invalid_model', 'Choose a permitted Groq chat model.', 400);
    return { model, messages, stream, max_completion_tokens: stream ? AGENT_LIMITS.chatTokens : AGENT_LIMITS.planTokens, ...modelOptions(model) };
  }

  return {
    configured,
    defaultModel: preferred,
    async models(signal) {
      const response = await request('/models', { signal });
      const data = await readJson(response, signal);
      if (!Array.isArray(data?.data)) throw failure('invalid_models', 'Groq returned an invalid model list.');
      const available = new Set(data.data.filter(item => validModel(item?.id) && item.active !== false).map(item => item.id));
      return [...permitted].filter(id => available.has(id)).sort((a, b) => Number(b === preferred) - Number(a === preferred)).map(id => ({
        id, label: id, provider: 'groq', size: null, modifiedAt: null, capabilities: { text: true, tools: false },
      }));
    },
    async chat({ model, messages, signal }) {
      const response = await request('/chat/completions', { method: 'POST', signal, body: JSON.stringify(generation(model, messages, true)) });
      if (!response.headers.get('Content-Type')?.includes('text/event-stream') || !response.body?.getReader) {
        await response.body?.cancel().catch(() => {});
        throw failure('invalid_stream', 'Groq did not return a response stream.');
      }
      return response;
    },
    async plan({ model, messages, schema, signal }) {
      // The shared schema has optional fields; strict:false preserves those semantics.
      // The router validates every field and record reference before returning it.
      const response_format = STRUCTURED_MODELS.has(model)
        ? { type: 'json_schema', json_schema: { name: 'growthtrack_action_plan', strict: false, schema } }
        : { type: 'json_object' };
      const response = await request('/chat/completions', { method: 'POST', signal, body: JSON.stringify({ ...generation(model, messages, false), response_format }) });
      const result = await readJson(response, signal);
      const choice = result?.choices?.[0];
      if (choice?.finish_reason !== 'stop' || choice.message?.refusal || choice.message?.tool_calls || typeof choice.message?.content !== 'string') {
        throw failure('invalid_plan', 'Groq could not complete a valid action plan. Try a simpler request.');
      }
      return choice.message.content;
    },
  };
}
