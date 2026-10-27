import { describe, expect, it } from 'vitest';
import { getAiContextCandidates, buildSelectedAiContext } from '../../src/lib/aiContext';
import { createAiOverviewCandidates } from '../../src/lib/aiInsights';
import { validatePlanReferences } from '../../src/lib/agentActions';
import { FEATURES } from '../../src/config/featureRegistry';
import { APP_GUIDE, buildChatInstructions } from '../../server/agents/knowledge';

const record = (type, id, fields, domain = 'workspace') => ({ type, id, domain, label: id, text: JSON.stringify(fields) });
const overview = (records, domain = 'workspace') => JSON.parse(createAiOverviewCandidates(records, '2026-10-27').find(row => row.domain === domain).text);

describe('owner-filtered app insights', () => {
  it('calculates open/completed/overdue tasks without treating missing dates as overdue', () => {
    const summary = overview([
      record('tasks', 'late', { due_date: '2026-10-26', status: 'pending' }),
      record('tasks', 'today', { dueDate: '2026-10-27' }),
      record('tasks', 'done', { done: true, due_date: '2026-10-01' }),
      record('tasks', 'missing', {}), record('tasks', 'invalid-date', { due_date: '2026-02-31' }),
    ]);
    expect(summary.facts.tasks).toEqual({ total: 5, open: 4, completed: 1, overdue: 1, withoutDueDate: 2 });
    expect(summary.scope).toContain('currently loaded');
  });

  it('keeps unknown goal progress distinct from real zero progress', () => {
    const summary = overview([record('goals', 'zero', { current_value: 0, target_value: 10 }), record('goals', 'missing', { current_value: null, target_value: 10 }), record('goals', 'done', { current_value: 10, target_value: 10 })]);
    expect(summary.facts.goals).toEqual({ total: 3, withNumericProgress: 2, targetsReached: 1, withoutNumericProgress: 1 });
  });

  it('never combines currencies or silently includes missing money fields', () => {
    const summary = overview([
      record('transactions', 'usd-a', { currency: 'USD', amount: 0.1, type: 'Expense' }, 'finance'),
      record('transactions', 'usd-b', { currency: 'USD', amount: 0.2, type: 'Expense' }, 'finance'),
      record('transactions', 'inr', { currency: 'INR', amount: 100, type: 'Income' }, 'finance'),
      record('transactions', 'unknown', { amount: 1000, type: 'Income' }, 'finance'),
      record('transactions', 'null', { currency: 'USD', amount: null, type: 'Expense' }, 'finance'),
    ], 'finance');
    expect(summary.facts.transactions.totalsByCurrency).toEqual([
      { currency: 'USD', income: 0, expense: 0.3, investment: 0, records: 2 },
      { currency: 'INR', income: 100, expense: 0, investment: 0, records: 1 },
    ]);
    expect(summary.facts.transactions.excludedFromTotals).toBe(2);
  });

  it('compares dated measurements only within the same units and excludes future/invalid data', () => {
    const summary = overview([
      record('metrics', 'last', { metric: 'weight', unit: 'kg', value: 72, date: '2026-10-27' }, 'wellness'),
      record('metrics', 'first', { metric: 'weight', unit: 'kg', value: 74, date: '2026-10-01' }, 'wellness'),
      record('metrics', 'lb', { metric: 'weight', unit: 'lb', value: 160, date: '2026-10-15' }, 'wellness'),
      record('metrics', 'future', { metric: 'weight', unit: 'kg', value: 1, date: '2027-10-15' }, 'wellness'),
      record('metrics', 'invalid', { metric: 'weight', unit: 'kg', value: null, date: '2026-10-15' }, 'wellness'),
    ], 'wellness');
    expect(summary.facts.measurements).toEqual([
      expect.objectContaining({ unit: 'kg', observations: 2, firstValue: 74, latestValue: 72, change: -2 }),
      expect.objectContaining({ unit: 'lb', observations: 1, change: null }),
    ]);
  });

  it('averages usable sleep logs and describes partial coverage', () => {
    const summary = overview([
      record('sleep', 'a', { hours: 6, date: '2026-10-25' }, 'wellness'), record('sleep', 'b', { hours: 8, date: '2026-10-26' }, 'wellness'),
      record('sleep', 'missing', { duration: 480, date: '2026-10-24' }, 'wellness'), record('sleep', 'future', { hours: 10, date: '2026-11-24' }, 'wellness'),
    ], 'wellness');
    expect(summary.facts.sleep).toEqual({ usableLogs: 2, excludedLogs: 2, averageHoursPerLog: 7, distinctDays: 2 });
  });

  it('excludes other owners and requires opt-in plus selection for sensitive overviews', () => {
    const state = { user: { id: 'owner', email: 'never-share@example.test', tasks: { pending: [{ id: 'mine', title: 'PRIVATE TASK TEXT' }, { id: 'other', userId: 'another', title: 'FOREIGN' }], completed: [] } },
      finance: { transactions: { a: { id: 'a', userId: 'owner', currency: 'USD', amount: 12, type: 'Expense', note: 'PRIVATE FINANCE TEXT' }, foreign: { id: 'b', userId: 'another', amount: 999 } } },
      metric_logs: [{ id: 'metric', userId: 'owner', metric: 'weight', value: 72, unit: 'kg', date: '2026-10-27' }] };
    const candidates = getAiContextCandidates(state, {}, { includeOverviews: true });
    expect(candidates.filter(row => row.type.endsWith('_summary'))).toHaveLength(1);
    expect(buildSelectedAiContext(state)).toEqual([]);
    expect(buildSelectedAiContext(state, ['finance_summary:loaded-overview'])).toEqual([]);
    const selected = buildSelectedAiContext(state, ['workspace_summary:loaded-overview', 'finance_summary:loaded-overview'], { finance: true });
    expect(selected).toHaveLength(2);
    const text = JSON.stringify(selected);
    expect(text).not.toMatch(/PRIVATE TASK TEXT|PRIVATE FINANCE TEXT|FOREIGN|never-share|999/);
    expect(JSON.parse(selected[0].text).recordsIncluded).toBe(1);
    expect(buildSelectedAiContext(state, ['finance_summary:loaded-overview'], { finance: false })).toEqual([]);
  });
  it('reports known nutrition totals without turning absent nutrients into zero', () => {
    const summary = overview([
      record('nutrition', 'a', { date: '2026-10-25', calories: 200, protein: 0 }, 'wellness'),
      record('nutrition', 'b', { date: '2026-10-25', calories: 300 }, 'wellness'),
      record('nutrition', 'future', { date: '2026-11-25', calories: 900 }, 'wellness'),
    ], 'wellness');
    expect(summary.facts.nutrition).toMatchObject({ datedMeals: 2, excludedMeals: 1, distinctDays: 1, calories: { totalInLoadedMeals: 500, mealsWithValue: 2 }, protein: { totalInLoadedMeals: 0, mealsWithValue: 1 }, fat: { totalInLoadedMeals: null, mealsWithValue: 0 } });
  });

  it('supports additional record sources and preserves valid bounded JSON for long notes', () => {
    const state = { user: { id: 'owner', projects: [{ id: 'project', name: 'Project' }], calendar_events: [{ id: 'event', title: 'Meeting' }], skills: [{ id: 'skill', name: 'Writing' }] },
      notes: [{ id: 'note', userId: 'owner', title: 'a'.repeat(2000), text: 'b'.repeat(9000), category: 'c'.repeat(2000), updatedAt: 'd'.repeat(2000) }],
      nutrition_logs: [{ id: 'food', userId: 'owner', calories: 100 }], timesheetEntries: [{ id: 'time', userId: 'owner', hours: 2 }] };
    const rows = getAiContextCandidates(state);
    expect(rows.map(row => row.type)).toEqual(expect.arrayContaining(['notes', 'projects', 'calendar', 'skills', 'timesheets']));
    expect(rows.some(row => row.type === 'nutrition')).toBe(false);
    expect(getAiContextCandidates(state, { wellness: true }).some(row => row.type === 'nutrition')).toBe(true);
    const note = rows.find(row => row.type === 'notes');
    expect(note.text.length).toBeLessThanOrEqual(6000);
    expect(() => JSON.parse(note.text)).not.toThrow();
  });

  it('does not permit an overview to authorize changing an individual record', () => {
    expect(() => validatePlanReferences({ actions: [{ kind: 'task.complete', recordId: 'loaded-overview' }] }, [record('workspace_summary', 'loaded-overview', {})])).toThrow('not selected');
  });
});

describe('application knowledge and answer scope', () => {
  it('uses real canonical routes and explains feature/data boundaries', () => {
    const routes = APP_GUIDE.match(/\/(?:finance|insights|wellness|workspace|life|hub)\/[a-z-]+/g);
    const canonical = new Set(FEATURES.map(feature => feature.canonicalPath));
    expect(routes.length).toBeGreaterThan(50);
    for (const route of routes) expect(canonical.has(route), route).toBe(true);
    expect(APP_GUIDE).toContain('not proof that a service is online');
    expect(APP_GUIDE).toContain('/hub/agents?view=context');
    expect(APP_GUIDE).toContain('There is NO Share/Export button');
  });
  it('allows general knowledge and requires evidence for personal insights', () => {
    const prompt = buildChatInstructions({ intent: 'insights', today: '2026-10-27' });
    expect(prompt).toContain('not restricted to app-only questions');
    expect(prompt).toContain('Missing is unknown, not zero');
    expect(prompt).toContain('no live web-search');
    expect(prompt).toContain('user selected Insights');
    expect(prompt).toContain('Chat and Insights cannot save');
  });
});
