/** Optional service boundary. Not a database driver or deployment executor. */
export function createHttpBridge({ baseUrl, token = '', fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const root = new URL(baseUrl);
  if (root.protocol === 'http:' && (typeof baseUrl !== 'string' || !/^http:\/\/(?:127\.0\.0\.1|\[::1\])(?::\d{1,5})?\/?$/.test(baseUrl))) throw new Error('Configure a literal loopback HTTP origin.');
  if ((root.protocol !== 'https:' && !(root.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(root.hostname))) || root.username || root.password || root.search || root.hash || root.pathname !== '/') throw new Error('Configure an exact HTTPS origin or local loopback origin.');
  if (/[\r\n]/.test(token) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('Invalid bridge configuration.');
  return {
    async health({ signal } = {}) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timer = setTimeout(abort, timeoutMs);
      try {
        const response = await fetchImpl(new URL('/health', root).href, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new Error(); }
        const reader = response.body.getReader(); let size = 0, text = ''; const decoder = new TextDecoder();
        const cancel = () => { void reader.cancel().catch(() => {}); };
        controller.signal.addEventListener('abort', cancel, { once: true });
        try {
          while (true) { controller.signal.throwIfAborted(); const chunk = await reader.read(); controller.signal.throwIfAborted(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 8192) throw new Error(); text += decoder.decode(chunk.value, { stream: true }); }
          text += decoder.decode();
          const data = JSON.parse(text);
          if (data.status !== 'ok') throw new Error();
          return { status: 'ok' };
        } finally { controller.signal.removeEventListener('abort', cancel); void reader.cancel().catch(() => {}); }
      } catch { throw new Error('Optional service health check failed.'); }
      finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
    },
  };
}
