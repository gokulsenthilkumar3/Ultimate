// Stable form fields use typed columns and nested record collections use rows.
import { fileToClient } from './domains/fileMetadata.js';
import { workoutToClient } from './domains/workoutMetadata.js';
import { COLLECTION_COLUMNS, COLLECTION_ALIASES } from './domains/collectionFields.js';
import { COLLECTION_CHILDREN, collectionChildPayload, childrenToClient } from './domains/collectionChildren.js';
// Only custom extensions remain in data. Endpoint reads and the initial
// dashboard snapshot share this projection.
const BASE_FIELDS = {
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
const FIELDS = Object.fromEntries(Object.entries(BASE_FIELDS).map(([name,fields])=>[name,[...fields,...Object.keys(COLLECTION_COLUMNS[name] || {})]]));
const WITHOUT_DATA = new Set(['finance', 'budgets', 'workout_sessions', 'progress_photos', 'goal_progress_logs']);
const PROTECTED = new Set(['id', 'userId', 'user', 'amountMinor', 'limitMinor', 'costMinor', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'expectedUpdatedAt', 'expectedRevision', 'mutationId', 'revision', 'kind', 'deletedAt', 'created_at', '__proto__', 'prototype', 'constructor', 'logs', 'exercises', 'progressLogs', 'subtaskRows','priceRows']);
const NUMBERS = new Set(['amount', 'limit_amount', 'duration_minutes', 'volume', 'duration', 'hours', 'streak', 'cost', 'active', 'value']);

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function typedValue(field,type,value) {
  if (value == null) return null;
  if (type === 'labels') {
    if (!Array.isArray(value) || value.length > 100 || value.some(label => typeof label !== 'string' || label.length > 200)) invalid(`${field} must be a list of at most 100 text labels.`);
    return JSON.stringify(value);
  }
  if (type === 'text' || type === 'date' || type === 'time') {
    if (typeof value !== 'string' || value.length > 100000) invalid(`${field} must be text.`);
    if (!value) return value;
    if (type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) !== value)) invalid(`${field} must be a valid YYYY-MM-DD date.`);
    if (type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) invalid(`${field} must be a valid HH:MM time.`);
    return value;
  }
  if (type === 'boolean' || type === 'flag') {
    if (![true,false,0,1].includes(value)) invalid(`${field} must be a boolean flag.`);
    return type === 'boolean' ? Boolean(value) : Number(value);
  }
  if (value === '') return null;
  if (!['number','string'].includes(typeof value) || !String(value).trim()) invalid(`${field} must be a finite number.`);
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > 1e12) invalid(`${field} must be a finite number within the supported range.`);
  if (['positiveInteger','nonnegativeInteger'].includes(type)
    && (!Number.isInteger(number) || number > 2147483647 || number < (type === 'positiveInteger' ? 1 : 0))) invalid(`${field} must be a valid whole number.`);
  if (['nonnegative','money'].includes(type) && number < 0) invalid(`${field} cannot be negative.`);
  if (type === 'money' && number !== Math.round(number*100)/100) invalid(`${field} must have at most two decimal places.`);
  if (type === 'rating' && (number < 0 || number > 10)) invalid('Rating must be between 0 and 10.');
  if (type === 'energy' && (number < 1 || number > 5)) invalid('Energy must be between 1 and 5.');
  return number;
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
  if (name === 'documents') return fileToClient(record);
  if (name === 'workout_sessions') return workoutToClient(record);
  const metadata = parseRecordData(record.data);
  const result = { ...metadata, ...record };
  for (const field of Object.keys(COLLECTION_COLUMNS[name] || {})) {
    if (record[field] == null && Object.hasOwn(metadata,field)) result[field] = metadata[field];
    if (COLLECTION_COLUMNS[name][field] === 'labels' && typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field]); } catch { /* Preserve malformed historical values for review. */ }
    }
  }
  childrenToClient(name,record,result);
  for (const [field, minor] of [['amount', 'amountMinor'], ['limit_amount', 'limitMinor'], ['cost', 'costMinor']]) {
    if (record[minor] != null) result[field] = Number(record[minor]) / 100;
    delete result[minor];
  }
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
    if (result.project === undefined) result.project = 'General';
  }
  if (name === 'goals') result.deadline = record.targetDate ?? result.deadline ?? '';
  if (name === 'subscriptions') result.nextDate = result.next_date ?? result.nextDate ?? '';
  if (name === 'vitals_logs') result.type = record.vital ?? result.type;
  if (name === 'medications') result.dose = record.dosage ?? result.dose;
  return result;
}

export function collectionPayload(name, input, existing = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('A record object is required.');
  const fields = FIELDS[name];
  if (!fields) return input;
  const source = { ...parseRecordData(input.data), ...input };
  const aliases = COLLECTION_ALIASES[name] || {};
  for (const [alias,field] of Object.entries(aliases)) if (Object.hasOwn(source,alias)) source[field] = source[alias];
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
  const children = collectionChildPayload(name,source);
  if (children) delete metadata[children.spec.field];
  for (const [key, value] of Object.entries(source)) {
    if (PROTECTED.has(key) || key === 'data' || value === undefined) continue;
    if (Object.hasOwn(aliases,key) || (name === 'timesheet' && key === 'hours')) { delete metadata[key]; continue; }
    if (COLLECTION_CHILDREN[name]?.field === key) continue;
    if (fields.includes(key)) {
      delete metadata[key];
      const typed = COLLECTION_COLUMNS[name]?.[key];
      if (typed) {
        if (name === 'notes' && ['pinned', 'starred'].includes(key) && value === null) invalid(`${key} must be a boolean flag.`);
        data[key] = typedValue(key,typed,value);
        continue;
      }
      if (NUMBERS.has(key) && value !== null && value !== '') {
        const number = Number(value);
        if (!Number.isFinite(number)) invalid(`${key} must be a finite number.`);
        if (['amount', 'limit_amount', 'cost'].includes(key) && (Math.abs(number) > 1000000000000 || number !== Math.round(number * 100) / 100)) invalid(`${key} must have at most two decimal places.`);
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
  if (!WITHOUT_DATA.has(name)) data.data = Object.keys(metadata).length ? JSON.stringify(metadata) : null;
  return data;
}

export const collectionHasData = name => Boolean(FIELDS[name]) && !WITHOUT_DATA.has(name);
