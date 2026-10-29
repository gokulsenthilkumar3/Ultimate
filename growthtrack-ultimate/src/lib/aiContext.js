import { AI_CONTEXT_DOMAINS } from './aiContextTypes';
import { createAiOverviewCandidates } from './aiInsights';
import { localDateKey } from './metricSeries';

export const EMPTY_AI_CONSENT = { wellness: false, finance: false, journal: false };
const definitions = {
  tasks: { label: 'Tasks', fields: ['title', 'description', 'status', 'done', 'priority', 'due_date', 'dueDate', 'project'] },
  goals: { label: 'Goals', fields: ['title', 'description', 'status', 'current_value', 'target_value', 'unit', 'targetDate', 'deadline'] },
  habits: { label: 'Habits', fields: ['name', 'category', 'streak', 'frequency', 'target_days'] },
  metrics: { label: 'Wellness measurements', domain: 'wellness', fields: ['metric', 'value', 'unit', 'date', 'measuredAt'] },
  sleep: { label: 'Sleep logs', domain: 'wellness', fields: ['hours', 'duration', 'quality', 'date'] },
  transactions: { label: 'Financial transactions', domain: 'finance', fields: ['amount', 'type', 'category', 'date', 'note', 'currency'] },
  journal: { label: 'Journal entries', domain: 'journal', fields: ['title', 'content', 'date'] },
  notes: { label: 'Notes', fields: ['title', 'content', 'updatedAt', 'category'] },
  projects: { label: 'Projects', fields: ['name', 'title', 'description', 'status', 'deadline', 'progress', 'category'] },
  calendar: { label: 'Calendar events', fields: ['title', 'start', 'end', 'date', 'status', 'category'] },
  timesheets: { label: 'Time sessions', fields: ['task', 'project', 'hours', 'date', 'billable'] },
  skills: { label: 'Skills', fields: ['name', 'level', 'category', 'progress'] },
  files: { label: 'File metadata', fields: ['name', 'title', 'type', 'size', 'updatedAt'] },
  entertainment: { label: 'Entertainment', fields: ['title', 'name', 'type', 'status', 'rating'] },
  nutrition: { label: 'Nutrition logs', fields: ['name', 'food', 'meal', 'date', 'calories', 'protein', 'carbs', 'fat'] },
  workouts: { label: 'Workout sessions', fields: ['name', 'title', 'date', 'status', 'duration', 'duration_minutes'] },
  moods: { label: 'Mood logs', fields: ['mood', 'score', 'energy', 'stress', 'date', 'notes'] },
  vitals: { label: 'Vitals', fields: ['metric', 'value', 'unit', 'date', 'systolic', 'diastolic', 'pulse'] },
  medications: { label: 'Medications', fields: ['name', 'dosage', 'frequency', 'startDate', 'endDate'] },
  budgets: { label: 'Budgets', fields: ['category', 'limit_amount', 'month', 'currency'] },
  subscriptions: { label: 'Subscriptions', fields: ['name', 'amount', 'cost', 'billing_cycle', 'next_payment', 'active', 'currency'] },
  holdings: { label: 'Portfolio holdings', fields: ['symbol', 'name', 'quantity', 'avgPrice', 'currentPrice', 'currency'] },
  shopping: { label: 'Shopping', fields: ['name', 'title', 'quantity', 'price', 'status', 'purchased', 'currency'] },
};

const rows = value => Array.isArray(value) ? value : Object.values(value || {});

function domainFor(type, record) {
  if (AI_CONTEXT_DOMAINS[type]) return AI_CONTEXT_DOMAINS[type];
  const category = String(record.category || record.domain || '').toLowerCase();
  if (/health|wellness|fitness|sleep|nutrition|body|mind|medical/.test(category)) return 'wellness';
  if (/financ|money|budget|investment/.test(category)) return 'finance';
  if (/journal/.test(category)) return 'journal';
  return 'workspace';
}

export function getAiContextCandidates(state, consent = EMPTY_AI_CONSENT, { includeOverviews = false, today = localDateKey() } = {}) {
  const owner = state.user?.id;
  if (!owner || state.isLoading || state.initialLoadError) return [];
  const collections = {
    tasks: [...rows(state.user.tasks?.pending), ...rows(state.user.tasks?.completed)],
    goals: rows(state.goals), habits: rows(state.habits),
    metrics: rows(state.metric_logs), sleep: rows(state.sleep_logs),
    transactions: rows(state.finance?.transactions),
    journal: rows(state.notes).filter(record => record?.source === 'mind-journal'),
    notes: rows(state.notes).filter(record => record?.source !== 'mind-journal'),
    projects: rows(state.user.projects), calendar: rows(state.user.calendar_events), skills: rows(state.user.skills),
    timesheets: rows(state.timesheetEntries), files: rows(state.documents), entertainment: rows(state.entertainment?.media),
    nutrition: rows(state.nutrition_logs), workouts: rows(state.workouts?.sessions), moods: rows(state.moodLogs), vitals: rows(state.vitalsLogs), medications: rows(state.medications),
    budgets: rows(state.finance?.budgets), subscriptions: rows(state.subscriptions), holdings: rows(state.portfolio), shopping: rows(state.shopping?.items),
  };
  const candidates = [];
  const seen = new Set();
  for (const [type, records] of Object.entries(collections)) {
    for (const record of records) {
      if (!record || record.id == null) continue;
      if ([record.userId, record.user_id].some(id => id != null && String(id) !== String(owner))) continue;
      // Top-level server collections must have an explicit owner. Tasks are
      // nested under the signed-in user and can also include local drafts.
      if (!['tasks', 'projects', 'calendar', 'skills'].includes(type) && record.userId == null && record.user_id == null) continue;
      const domain = domainFor(type, record);
      if (domain !== 'workspace' && consent[domain] !== true) continue;
      const key = `${type}:${record.id}`;
      if (seen.has(key)) continue;
      const fields = Object.fromEntries(definitions[type].fields.flatMap(field => {
        const value = ['journal', 'notes'].includes(type) && field === 'content' ? record.content ?? record.text : record[field];
        if (typeof value === 'string') return [[field, value.slice(0, ['journal', 'notes'].includes(type) && ['content', 'text'].includes(field) ? 4000 : 800)]];
        if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return [[field, value]];
        return [];
      }));
      const label = String(record.title || record.name || record.metric || `${definitions[type].label} · ${record.date || record.id}`).slice(0, 240);
      // Keep bounded reference JSON valid even when several long fields coexist.
      while (JSON.stringify(fields).length > 6000) {
        const longest = Object.keys(fields).filter(field => typeof fields[field] === 'string').sort((a, b) => fields[b].length - fields[a].length)[0];
        if (!longest || !fields[longest].length) break;
        fields[longest] = fields[longest].slice(0, Math.floor(fields[longest].length / 2));
      }
      candidates.push({ key, group: definitions[type].label, id: String(record.id), type, domain, label, text: JSON.stringify(fields) });
      seen.add(key);
    }
  }
  return includeOverviews ? [...createAiOverviewCandidates(candidates, today), ...candidates] : candidates;
}

// Candidates have already passed ownership, consent, and projection checks.
export function selectAiContextRecords(candidates, selectedKeys = []) {
  const selected = new Set(selectedKeys);
  return candidates.filter(record => selected.has(record.key)).slice(0, 20)
    .map(({ id, type, domain, label, text }) => ({ id, type, domain, label, text }));
}

export function buildSelectedAiContext(state, selectedKeys = [], consent = EMPTY_AI_CONSENT) {
  if (!selectedKeys.length) return [];
  return selectAiContextRecords(getAiContextCandidates(state, consent, { includeOverviews: true }), selectedKeys);
}
