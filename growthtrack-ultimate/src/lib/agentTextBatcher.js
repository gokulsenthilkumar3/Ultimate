/** Show the first token immediately, then coalesce updates between paints.
 * Cancellation discards pending text before an account/page can change. */
export function createAgentTextBatcher(onFlush, { signal, delayMs = 32 } = {}) {
  let pending = '', timer = null, started = false, disposed = false;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null; pending = '';
  };
  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (disposed || signal?.aborted) { pending = ''; return; }
    if (pending) { const text = pending; pending = ''; onFlush(text); }
  }
  signal?.addEventListener('abort', cancel, { once: true });
  return {
    push(text) {
      if (disposed || signal?.aborted || !text) return;
      pending += text;
      if (!started) { started = true; flush(); }
      else if (timer === null) timer = setTimeout(flush, delayMs);
    },
    flush,
    dispose() { disposed = true; cancel(); signal?.removeEventListener('abort', cancel); },
  };
}
