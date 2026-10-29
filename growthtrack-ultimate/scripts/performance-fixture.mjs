// Deterministic, fictional records for the isolated browser benchmark only.
import { OWNER, emptyState } from '../tests/e2e/foundation-fixture.ts';

export function performanceFixture(kind = 'empty') {
  if (!['empty', 'populated'].includes(kind)) throw new Error('Use --fixture=empty or --fixture=populated.');
  const state = emptyState();
  const habitLogs = {};
  if (kind === 'empty') return { state, habitLogs, counts: {} };
  const today = '2026-10-29';
  const date = index => new Date(Date.UTC(2026, 9, 29 - index % 365)).toISOString().slice(0, 10);
  const rows = (name, count, fields) => Array.from({ length: count }, (_, index) => ({ id: `perf-${name}-${index}`, userId: OWNER.id, ...fields(index) }));
  state.tasks = rows('task', 2000, index => ({ title: `Fictional task ${index}`, description: 'Synthetic performance record', priority: `p${index % 4 + 1}`, status: index % 5 ? 'pending' : 'done', done: index % 5 === 0, due_date: date(index) }));
  state.finance = rows('transaction', 3000, index => ({ amount: index % 100 + 1, type: index % 7 ? 'Expense' : 'Income', category: ['Food', 'Transport', 'Shopping', 'Salary'][index % 4], method: 'Cash', date: date(index), note: `Synthetic transaction ${index}` }));
  state.goals = rows('goal', 120, index => ({ title: `Fictional goal ${index}`, description: 'Synthetic performance goal', category: 'personal', priority: 'medium', status: index % 6 ? 'active' : 'completed', current_value: index % 100, target_value: 100, deadline: date(0), subtasks: [] }));
  state.habits = rows('habit', 30, index => ({ name: `Fictional habit ${index}`, category: 'routine', target_days: 5, order_index: index }));
  for (const habit of state.habits) habitLogs[habit.id] = rows(`log-${habit.id}`, 90, index => ({ habit_id: habit.id, date: date(index), completed: index % 4 !== 0 }));
  state.notes = rows('note', 300, index => ({ title: `Fictional note ${index}`, content: '# Synthetic note\n\nFictional content for browser performance measurements.', tags: ['benchmark'], pinned: index % 12 === 0, updatedAt: `${date(index)}T12:00:00Z` }));
  state.documents = rows('file', 150, index => ({ title: `Fictional file ${index}.txt`, type: 'text', url: '', createdAt: `${date(index)}T12:00:00Z` }));
  state.sleep_logs = rows('sleep', 365, index => ({ date: date(index), hours: 6 + index % 3, quality: 3 }));
  state.metric_logs = rows('metric', 365, index => ({ date: date(index), metric: 'weight', type: 'weight', value: 70 + index % 5, weight: 70 + index % 5, unit: 'kg' }));
  state.nutrition_logs = rows('meal', 720, index => ({ name: `Fictional meal ${index}`, date: date(Math.floor(index / 3)), meal: 'Lunch', calories: 500, protein_g: 20, carbs_g: 50, fat_g: 15 }));
  state.timesheet = rows('time', 1000, index => ({ project: 'Research', task: `Fictional session ${index}`, date: date(index), seconds: 1800, hours: 0.5, billable: false }));
  state.shopping = rows('shopping', 200, index => ({ name: `Fictional item ${index}`, price: index + 1, quantity: 1, bought: index % 4 === 0, category: 'Other' }));
  state.entertainment = rows('media', 150, index => ({ title: `Fictional media ${index}`, type: 'movie', status: 'planned', rating: 0 }));
  state.subscriptions = rows('subscription', 25, index => ({ name: `Fictional subscription ${index}`, amount: 10, cost: 10, cycle: 'monthly', billingCycle: 'monthly', nextBillingDate: today, active: true }));
  state.user.portfolio = rows('holding', 200, index => ({ name: `Fictional holding ${index}`, symbol: `TEST${index}`, type: 'Stock', units: 10, buyPrice: 50, currentPrice: 55, buyDate: '2026-01-01', currency: 'INR', priceAsOf: today }));
  state.user.projects = rows('project', 60, index => ({ name: `Fictional project ${index}`, title: `Fictional project ${index}`, status: 'active', progress: index % 100 }));
  state.user.calendar_events = rows('event', 500, index => ({ title: `Fictional event ${index}`, start: `${date(index)}T10:00:00`, end: `${date(index)}T11:00:00`, type: 'Event' }));
  state.user.skills = rows('skill', 80, index => ({ name: `Fictional skill ${index}`, level: 'beginner', category: 'Technical', progress: index % 100 }));
  const counts = Object.fromEntries(Object.entries(state).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length]));
  return { state, habitLogs, counts: { ...counts, portfolio: state.user.portfolio.length, calendar: state.user.calendar_events.length, projects: state.user.projects.length, skills: state.user.skills.length, habitLogs: 2700 } };
}
