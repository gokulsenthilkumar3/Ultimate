import { apiRequest } from '../lib/apiClient';
import { createNotesApi } from '../domains/workspace/adapters/notesApi';
import { agentPlanSchema, actionCollection, validatePlanReferences, agentContextScope } from '../lib/agentActions';

const rows = value => Array.isArray(value) ? value : Object.values(value || {});
function recordFor(state, action) {
  const collection = actionCollection(action);
  const list = collection === 'tasks' ? [...rows(state.user?.tasks?.pending), ...rows(state.user?.tasks?.completed)] : rows(state[collection]);
  const record = list.find(item => String(item.id) === action.recordId);
  if (!record || [record.userId, record.user_id].some(id => id != null && String(id) !== String(state.user?.id))) return null;
  if (collection !== 'tasks' && record.userId == null && record.user_id == null) return null;
  return record;
}
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
const fingerprint = record => JSON.stringify(ordered(record));

/** Session-bound, acknowledged writes through the same commands as record pages.
 * Failed writes are not automatically retried: an acknowledgement may be lost. */
export function createAgentActionRunner({ getState, createNote = input => createNotesApi(apiRequest).create(input), uuid = () => crypto.randomUUID() }) {
  const attempted = new Set();
  const inFlight = new Set();
  return {
    prepare(raw, context, consent) {
      const plan = validatePlanReferences(agentPlanSchema.parse({ summary: raw.summary, actions: raw.actions }), context);
      const state = getState();
      if (!state.user?.id || state.isLoading || state.initialLoadError) throw new Error('Wait for your workspace to load before preparing actions.');
      const ownerId = state.user.id, sessionVersion = state._sessionVersion, dataRevision = state._dataRevision;
      return { ...plan, id: uuid(), ownerId, sessionVersion, dataRevision, scope: agentContextScope(context, consent), context,
        actions: plan.actions.map(action => {
          const existing = action.recordId ? recordFor(state, action) : null;
          if (action.recordId && !existing) throw new Error('A selected record is no longer available. Refresh Context and generate a new plan.');
          return { id: uuid(), command: action, expected: existing ? fingerprint(existing) : null };
        }) };
    },
    async apply(plan, entry, scope) {
      if (!plan.actions.includes(entry)) throw new Error('This action does not belong to the reviewed plan.');
      const state = getState();
      if (state.user?.id !== plan.ownerId || state._sessionVersion !== plan.sessionVersion || state._dataRevision !== plan.dataRevision) throw new Error('The session changed. Generate a new plan before applying actions.');
      if (state.isLoading || state.initialLoadError) throw new Error('Your workspace is not ready. Refresh before applying actions.');
      if (scope !== plan.scope) throw new Error('Your selected context changed. Generate a fresh plan.');
      if (attempted.has(entry.id) || inFlight.has(entry.id)) throw new Error('This action was already attempted. Check its destination before generating a new plan.');
      const action = entry.command;
      if (action.recordId && fingerprint(recordFor(state, action)) !== entry.expected) throw new Error('This record changed after the plan was prepared. Generate a fresh plan.');
      // The record command may be queued behind another editor's write.
      // Recheck inside that queue instead of rebasing onto the newer record.
      const checkedPatch = patch => current => {
        if (fingerprint(current) !== entry.expected) throw new Error('This record changed after the plan was prepared. Generate a fresh plan.');
        return typeof patch === 'function' ? patch(current) : patch;
      };
      inFlight.add(entry.id); attempted.add(entry.id);
      try {
        let saved;
        if (action.kind === 'task.create') saved = await state.addTask({ title: action.title, description: action.description || '', priority: action.priority || 'p3', ...(action.dueDate ? { due_date: action.dueDate } : {}), status: 'pending', done: false });
        else if (action.kind === 'task.update') {
          const patch = Object.fromEntries(['title', 'description', 'priority'].filter(key => action[key] !== undefined).map(key => [key, action[key]]));
          if (action.dueDate) patch.due_date = action.dueDate;
          saved = await state.updateTask(action.recordId, checkedPatch(patch));
        } else if (action.kind === 'task.complete') saved = await state.updateTask(action.recordId, checkedPatch(() => {
          const completedAt = new Date().toISOString();
          return { done: true, status: 'done', completedAt, completed_at: completedAt };
        }));
        else if (action.kind === 'goal.create') saved = await state.addGoal({ title: action.title, description: action.description || '', category: 'personal', status: 'active', priority: 'medium', current_value: 0, target_value: action.targetValue ?? null, unit: action.unit || '', deadline: action.deadline || '', subtasks: [] });
        else if (action.kind === 'goal.progress') saved = await state.updateGoal(action.recordId, checkedPatch({ current_value: action.value }));
        else if (action.kind === 'habit.create') saved = await state.addHabit({ name: action.name, category: action.category || 'routine', target_days: action.targetDays || 7, emoji: '✓' });
        else if (action.kind === 'habit.update') saved = await state.updateHabit(action.recordId, checkedPatch({ ...(action.name !== undefined ? { name: action.name } : {}), ...(action.targetDays !== undefined ? { target_days: action.targetDays } : {}) }));
        else if (action.kind === 'note.create') saved = await createNote({ id: entry.id, mutationId: `agent:${entry.id}`, title: action.title, content: action.content });
        else throw new Error('This action is not supported.');
        const current = getState();
        if (current.user?.id !== plan.ownerId || current._sessionVersion !== plan.sessionVersion || current._dataRevision !== plan.dataRevision) throw new Error('The session changed while saving. Check the original account before trying again.');
        if (!saved || (saved.id == null && saved.success !== true)) throw new Error('The server did not acknowledge this change. Check the destination before trying again.');
        if (action.kind === 'note.create') {
          // Notes uses the versioned API; the Notes page will sync the record.
          return { id: saved.id, title: saved.title };
        }
        return { id: saved.id || action.recordId, title: saved.title || saved.name };
      } finally { inFlight.delete(entry.id); }
    },
  };
}
