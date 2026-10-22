const sources = new WeakMap(), listeners = new Set();
const notify = () => listeners.forEach(listener => listener());
export function registerModelMeasurement(canvas, context, source) {
  if (!sources.has(canvas)) sources.set(canvas, new Map());
  const entries = sources.get(canvas);
  entries.set(context, source); notify();
  return () => { if (entries.get(context) === source) { entries.delete(context); notify(); } };
}
export const modelMeasurementSource = (canvas, context) => sources.get(canvas)?.get(context) || null;
export function subscribeModelMeasurements(listener) { listeners.add(listener); return () => listeners.delete(listener); }
