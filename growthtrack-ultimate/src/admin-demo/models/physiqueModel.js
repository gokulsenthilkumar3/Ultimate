export const PHYSIQUE_STORAGE_KEY = 'gt-demo-physique-profile-v1';
export const PHYSIQUE_FIELDS = Object.freeze([
  { key: 'height', label: 'Height', unit: 'cm', min: 140, max: 210, step: 1 },
  { key: 'weight', label: 'Weight', unit: 'kg', min: 45, max: 160, step: .1 },
  { key: 'chest', label: 'Chest', unit: 'cm', min: 65, max: 140, step: 1 },
  { key: 'waist', label: 'Waist', unit: 'cm', min: 50, max: 145, step: 1 },
  { key: 'hips', label: 'Hips', unit: 'cm', min: 65, max: 150, step: 1 },
]);
const baseline = { height: 178, weight: 76.4, chest: 100, waist: 82, hips: 98 };
export function createPhysiqueSession() {
  return { selected: 'current', contexts: { current: { ...baseline }, goal: { ...baseline, chest: 102, waist: 80, hips: 99 } }, savedContexts: null, savedAt: null };
}
export function restorePhysiqueSession(value) {
  const fallback = createPhysiqueSession();
  if (!value || value.format !== 'growthtrack-physique-ui-demo' || value.version !== 1 || !value.contexts) return fallback;
  const contexts = {};
  for (const context of ['current', 'goal']) {
    if (!value.contexts[context]) return fallback;
    contexts[context] = {};
    for (const field of PHYSIQUE_FIELDS) {
      const number = value.contexts[context][field.key];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < field.min || number > field.max) return fallback;
      contexts[context][field.key] = number;
    }
  }
  const savedAt = typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)) ? value.savedAt : null;
  return { ...fallback, contexts, savedContexts: structuredClone(contexts), savedAt };
}
export function updatePhysiqueField(session, context, key, rawValue) {
  const field = PHYSIQUE_FIELDS.find(item => item.key === key);
  if (!field || !['current', 'goal'].includes(context) || rawValue === '' || !Number.isFinite(Number(rawValue))) return session;
  const value = Math.round(Math.min(field.max, Math.max(field.min, Number(rawValue))) / field.step) * field.step;
  return { ...session, selected: context, contexts: { ...session.contexts, [context]: { ...session.contexts[context], [key]: Math.round(value * 10) / 10 } } };
}
export function physiqueIsDirty(session) {
  return !session.savedContexts || ['current', 'goal'].some(context => PHYSIQUE_FIELDS.some(field => session.contexts[context][field.key] !== session.savedContexts[context][field.key]));
}
export function physiqueSnapshot(session, savedAt = new Date().toISOString()) {
  return { format: 'growthtrack-physique-ui-demo', version: 1, savedAt, contexts: structuredClone(session.contexts) };
}
export function physiqueMeasurements(session) {
  return PHYSIQUE_FIELDS.map(field => ({ ...field, id: field.key, title: field.label, current: session.contexts.current[field.key], goal: session.contexts.goal[field.key], difference: Math.round((session.contexts.goal[field.key] - session.contexts.current[field.key]) * 10) / 10 }));
}
