import { AGENT_LIMITS } from '../../src/lib/agentPolicy.js';

export const failure = (code, message, status = 502) => Object.assign(new Error(message), { code, status, agentsFailure: true });

/** Bound raw bytes, including ignored metadata, and unblock reads on cancellation.
 * Do not await an upstream's cancel implementation: it may itself never resolve. */
export async function* boundedChunks(body, signal, maxBytes = AGENT_LIMITS.streamBytes) {
  if (!body?.getReader) throw failure('invalid_response', 'The model server did not return a response.');
  const reader = body.getReader();
  let cancelled = false, bytes = 0;
  const cancel = () => {
    if (!cancelled) { cancelled = true; void reader.cancel().catch(() => {}); }
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) return;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw failure('invalid_response', 'The model response exceeded the size limit.');
      yield value;
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
    reader.releaseLock();
  }
}

export async function readBoundedJson(response, signal) {
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of boundedChunks(response.body, signal, AGENT_LIMITS.jsonBytes)) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  try { return JSON.parse(text); }
  catch { throw failure('invalid_response', 'The model server returned invalid JSON.'); }
}
