import { getCsrfToken } from '../lib/apiClient';

const ROOT = '/api/agents';
const MAX_EVENT_CHARS = 256 * 1024;
const abortError = () => new DOMException('Response stopped.', 'AbortError');

export class AgentsError extends Error {
  constructor(message, status = 0, code = 'agents_error') {
    super(message);
    this.name = 'AgentsError';
    this.status = status;
    this.code = code;
  }
}

async function checkResponse(response) {
  if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('growthtrack:auth-expired'));
  if (response.ok) return response;
  let data;
  try { data = await response.json(); } catch { /* non-JSON proxy errors */ }
  const message = response.status === 401 ? 'Sign in again to use Agents.'
    : response.status === 403 ? 'Your session could not be verified. Sign in again.'
      : data?.error || data?.reason || `Agents request failed (${response.status}).`;
  throw new AgentsError(message, response.status, data?.code);
}

export async function getAgentsReadiness({ signal } = {}) {
  const response = await checkResponse(await fetch(`${ROOT}/readiness`, { signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error' }));
  const data = await response.json();
  if (!Array.isArray(data?.models) || typeof data.ready !== 'boolean') throw new AgentsError('The Agents backend returned an invalid readiness response.');
  const models = data.models.filter(item => typeof item?.id === 'string' && item.capabilities?.text !== false);
  return { ...data, models, ready: data.ready && models.length > 0, available: data.ready && models.length > 0 };
}

/** Consume actual SSE deltas. Caller owns cancellation and conversation state. */
export async function streamAgentsChat({ model, messages, context = [], consent = {}, responseStyle = 'standard', signal, onDelta, onMeta } = {}) {
  if (signal?.aborted) throw abortError();
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  const response = await checkResponse(await fetch(`${ROOT}/chat`, {
    method: 'POST', headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
    body: JSON.stringify({ model, messages, context, consent, responseStyle }),
  }));
  if (!response.headers.get('Content-Type')?.includes('text/event-stream') || !response.body?.getReader) throw new AgentsError('The Agents backend did not return a response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const stop = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', stop, { once: true });
  let pending = '';
  let completed = false;
  let text = '';
  let metadata = {};
  function consume(frame) {
    let event = 'message';
    const lines = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) lines.push(line.slice(5).trimStart());
    }
    if (!lines.length) return;
    let data;
    try { data = JSON.parse(lines.join('\n')); } catch { throw new AgentsError('The Agents backend returned an invalid stream event.'); }
    if (event === 'error') throw new AgentsError(data.error || 'The model could not finish this response.', 0, data.code);
    if (event === 'meta') { metadata = data; onMeta?.(data); }
    if (event === 'delta') {
      if (typeof data.text !== 'string') throw new AgentsError('The Agents backend returned an invalid text chunk.');
      text += data.text;
      if (text.length > 2 * 1024 * 1024) throw new AgentsError('The response exceeded the stream limit.');
      onDelta?.(data.text);
    }
    if (event === 'done') {
      if (data.done !== true || !text.trim()) throw new AgentsError('The model returned an empty or incomplete answer.');
      completed = true;
    }
  }
  try {
    while (!completed) {
      if (signal?.aborted) throw abortError();
      const { value, done } = await reader.read();
      if (signal?.aborted) throw abortError();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const frame = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        if (frame.length > MAX_EVENT_CHARS) throw new AgentsError('The stream event exceeded the size limit.');
        consume(frame.replace(/\r\n/g, '\n'));
        if (completed) break;
      }
      if (pending.length > MAX_EVENT_CHARS) throw new AgentsError('The stream event exceeded the size limit.');
      if (done) break;
    }
    if (!completed) throw new AgentsError('The response stream was interrupted. Try again.', 0, 'incomplete_stream');
    return { text, model: metadata.model || model, provider: 'ollama-local', done: true };
  } finally {
    signal?.removeEventListener('abort', stop);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
