export const EMPTY_AI_CONSENT = { wellness: false, finance: false, journal: false };
const definitions = {
  tasks: { label: 'Tasks', fields: ['title', 'status', 'done', 'priority', 'due_date', 'project'] },
  goals: { label: 'Goals', fields: ['title', 'status', 'current_value', 'target_value', 'targetDate'] },
  habits: { label: 'Habits', fields: ['name', 'category', 'streak', 'frequency'] },
  metrics: { label: 'Wellness measurements', domain: 'wellness', fields: ['metric', 'value', 'unit', 'date', 'measuredAt'] },
  sleep: { label: 'Sleep logs', domain: 'wellness', fields: ['hours', 'duration', 'quality', 'date'] },
  transactions: { label: 'Financial transactions', domain: 'finance', fields: ['amount', 'type', 'category', 'date', 'note'] },
  journal: { label: 'Journal entries', domain: 'journal', fields: ['title', 'content', 'date'] },
};

const rows = value => Array.isArray(value) ? value : Object.values(value || {});

function domainFor(type, record) {
  if (definitions[type].domain) return definitions[type].domain;
  const category = String(record.category || record.domain || '').toLowerCase();
  if (/health|wellness|fitness|sleep|nutrition|body|mind|medical/.test(category)) return 'wellness';
  if (/financ|money|budget|investment/.test(category)) return 'finance';
  if (/journal/.test(category)) return 'journal';
  return 'workspace';
}

export function getAiContextCandidates(state, consent = EMPTY_AI_CONSENT) {
  const owner = state.user?.id;
  if (!owner || state.isLoading || state.initialLoadError) return [];
  const collections = {
    tasks: [...rows(state.user.tasks?.pending), ...rows(state.user.tasks?.completed)],
    goals: rows(state.goals), habits: rows(state.habits),
    metrics: rows(state.metric_logs), sleep: rows(state.sleep_logs),
    transactions: rows(state.finance?.transactions),
    journal: rows(state.notes).filter(record => record?.source === 'mind-journal'),
  };
  const candidates = [];
  const seen = new Set();
  for (const [type, records] of Object.entries(collections)) {
    for (const record of records) {
      if (!record || record.id == null) continue;
      if ([record.userId, record.user_id].some(id => id != null && String(id) !== String(owner))) continue;
      // Top-level server collections must have an explicit owner. Tasks are
      // nested under the signed-in user and can also include local drafts.
      if (type !== 'tasks' && record.userId == null && record.user_id == null) continue;
      const domain = domainFor(type, record);
      if (domain !== 'workspace' && consent[domain] !== true) continue;
      const key = `${type}:${record.id}`;
      if (seen.has(key)) continue;
      const fields = Object.fromEntries(definitions[type].fields.flatMap(field => {
        const value = type === 'journal' && field === 'content' ? record.content ?? record.text : record[field];
        if (typeof value === 'string') return [[field, value.slice(0, type === 'journal' ? 4000 : 800)]];
        if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return [[field, value]];
        return [];
      }));
      const label = String(record.title || record.name || record.metric || `${definitions[type].label} · ${record.date || record.id}`).slice(0, 240);
      candidates.push({ key, group: definitions[type].label, id: String(record.id), type, domain, label, text: JSON.stringify(fields).slice(0, 6000) });
      seen.add(key);
    }
  }
  return candidates;
}

export function buildSelectedAiContext(state, selectedKeys = [], consent = EMPTY_AI_CONSENT) {
  const selected = new Set(selectedKeys);
  return getAiContextCandidates(state, consent).filter(record => selected.has(record.key)).slice(0, 20)
    .map(({ id, type, domain, label, text }) => ({ id, type, domain, label, text }));
}
