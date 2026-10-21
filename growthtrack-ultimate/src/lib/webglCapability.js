/** Probe WebGL2 (required by the current Three renderer) without mounting React Three Fiber. */
export function probeWebGL(createCanvas = () => document.createElement('canvas')) {
  let context;
  try {
    context = createCanvas().getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!context || context.isContextLost()) return false;
    return true;
  } catch {
    return false;
  } finally {
    try { context?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* Cleanup is best effort. */ }
  }
}
