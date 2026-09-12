// Collection forms contain richer fields than the searchable database columns.
// Keep those fields in each record's JSON data, and use the same contract for
// collection endpoints and the initial dashboard snapshot.
const FIELDS = {
  tasks: ['title', 'status', 'due_date', 'priority', 'done', 'completedAt', 'project', 'section', 'tags'],
  finance: ['amount', 'type', 'category', 'method', 'date', 'note'],
  budgets: ['category', 'limit_amount', 'month'],
  nutrition_logs: ['logged_at', 'date'],
  workout_sessions: ['date', 'notes', 'duration_minutes', 'volume'],
  shopping: ['name', 'purchased'],
  timesheet: ['date', 'duration'],
  entertainment: ['title', 'progress'],
  notes: ['title', 'content'],
  goals: ['title', 'targetDate'],
  sleep_logs: ['date', 'hours', 'quality'],
  documents: ['title', 'url'],
  habits: ['name', 'streak'],
  subscriptions: ['name', 'cost', 'active'],
  mood_logs: ['date', 'mood'],
  vitals_logs: ['date', 'vital', 'value'],
  medications: ['name', 'dosage'],
  progress_photos: ['date', 'url', 'notes'],
  goal_progress_logs: ['goalId', 'value', 'note', 'date'],
};
const WITHOUT_DATA = new Set(['finance', 'budgets', 'workout_sessions', 'progress_photos', 'goal_progress_logs']);
const PROTECTED = new Set(['id', 'userId', 'user', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'created_at', '__proto__', 'prototype', 'constructor', 'logs', 'exercises', 'progressLogs']);
const NUMBERS = new Set(['amount', 'limit_amount', 'duration_minutes', 'volume', 'duration', 'hours', 'streak', 'cost', 'active', 'value']);

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

export function parseRecordData(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => !PROTECTED.has(key) && key !== 'data'));
}

export function collectionToClient(name, record) {
  if (!record || !FIELDS[name]) return record;
  const result = { ...parseRecordData(record.data), ...record };
  if (name === 'tasks') {
    result.dueDate = record.due_date ?? result.dueDate ?? '';
    result.completed_at = record.completedAt ?? result.completed_at ?? null;
    result.created_at = record.createdAt ?? result.created_at;
    result.status = record.done || record.status === 'done' ? 'done' : (record.status || 'pending');
    result.done = result.status === 'done';
    if (typeof result.tags === 'string') { try { result.tags = JSON.parse(result.tags); } catch { result.tags = result.tags ? [result.tags] : []; } }
  }
  if (name === 'sleep_logs') {
    result.duration = Number(record.hours ?? result.duration ?? 0);
    result.quality = Number(record.quality ?? result.quality ?? 0);
  }
  if (name === 'timesheet') {
    result.seconds = Number(result.seconds ?? Number(record.duration || 0) * 3600);
    result.hours = result.seconds / 3600;
    result.earnings = Number(result.earnings || 0);
    result.project ||= 'General';
  }
  if (name === 'documents') result.name = result.name || record.title || 'Untitled document';
  if (name === 'goals') result.deadline = result.deadline || record.targetDate || '';
  if (name === 'vitals_logs') result.type = result.type || record.vital;
  if (name === 'medications') result.dose = result.dose || record.dosage;
  return result;
}

export function collectionPayload(name, input, existing = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('A record object is required.');
  const fields = FIELDS[name];
  if (!fields) return input;
  const source = { ...parseRecordData(input.data), ...input };
  if (name === 'tasks') {
    if ('dueDate' in source) source.due_date = source.dueDate;
    if ('completed_at' in source) source.completedAt = source.completed_at;
    if ('done' in source) source.status = source.done ? 'done' : 'pending';
    else if ('status' in source) source.done = source.status === 'done';
    if (Array.isArray(source.tags)) source.tags = JSON.stringify(source.tags.map(String).map(v => v.trim()).filter(Boolean).slice(0, 20));
  }
  if (name === 'sleep_logs') {
    if ('duration' in source) source.hours = source.duration;
    if (source.quality != null) source.quality = String(source.quality);
  }
  if (name === 'timesheet' && ('hours' in source || 'seconds' in source)) source.duration = source.seconds != null ? Number(source.seconds) / 3600 : Number(source.hours);
  if (name === 'documents' && 'name' in source) source.title = source.name;
  if (name === 'goals' && 'deadline' in source) source.targetDate = source.deadline;
  if (name === 'vitals_logs' && 'type' in source) source.vital = source.type;
  if (name === 'medications' && 'dose' in source) source.dosage = source.dose;
  if (name === 'entertainment' && source.progress != null) source.progress = String(source.progress);
  if (name === 'mood_logs' && source.mood != null) source.mood = String(source.mood);

  const data = {};
  const metadata = parseRecordData(existing?.data);
  for (const [key, value] of Object.entries(source)) {
    if (PROTECTED.has(key) || key === 'data' || value === undefined) continue;
    if (fields.includes(key)) {
      if (NUMBERS.has(key) && value !== null && value !== '') {
        const number = Number(value);
        if (!Number.isFinite(number)) invalid(`${key} must be a finite number.`);
        if (['duration', 'hours', 'duration_minutes', 'streak', 'cost', 'limit_amount'].includes(key) && number < 0) invalid(`${key} cannot be negative.`);
        if (name === 'sleep_logs' && key === 'hours' && (number <= 0 || number > 24)) invalid('Sleep duration must be between 0 and 24 hours.');
        data[key] = number;
      } else {
        data[key] = value === '' && NUMBERS.has(key) ? null : value;
      }
    } else if (!WITHOUT_DATA.has(name)) {
      metadata[key] = value;
    } else {
      invalid(`Unsupported field: ${key}.`);
    }
  }
  if (!WITHOUT_DATA.has(name)) data.data = JSON.stringify(metadata);
  return data;
}

export const collectionHasData = name => Boolean(FIELDS[name]) && !WITHOUT_DATA.has(name);
