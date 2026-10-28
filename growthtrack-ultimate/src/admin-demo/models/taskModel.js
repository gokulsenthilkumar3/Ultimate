import { TASKS } from '../fixtures';
export function taskRecords(added = [], overrides = {}) {
  return [...TASKS.map((task, index) => ({ ...task, id: `task-sample-${index}` })), ...added.map(entry => ({ ...entry, context: 'Workspace', date: 'Today', status: 'To do', priority: 'Medium' }))].map(task => ({ ...task, status: Object.hasOwn(overrides, task.id) ? overrides[task.id] ? 'Done' : 'To do' : task.status }));
}
export function actionState(task, overrides, now) {
  const entry = overrides[task.id];
  if (entry?.status === 'dismissed') return 'dismissed';
  if (entry?.status === 'snoozed' && entry.until > now) return 'snoozed';
  return task.date === 'Today' ? 'today' : 'upcoming';
}
