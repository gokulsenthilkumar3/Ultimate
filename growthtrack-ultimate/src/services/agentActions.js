import { apiRequest } from '../lib/apiClient';
import { createNotesApi } from '../domains/workspace/adapters/notesApi';
import { agentPlanSchema, actionCollection, validatePlanReferences, agentContextScope } from '../lib/agentActions';
import { AGENT_LIMITS } from '../lib/agentPolicy';

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
export function createAgentActionRunner({ getState, createNote = input => createNotesApi(apiRequest).create(input), uuid = () => crypto.randomUUID(), now = Date.now }) {
  // Private snapshots survive UI status copies. Displayed/model-derived objects
  // never become the source of commands, ownership, or single-attempt state.
  const prepared = new Map();
  const seal = plan => fingerprint({ summary: plan.summary, ownerId: plan.ownerId, sessionVersion: plan.sessionVersion, dataRevision: plan.dataRevision, scope: plan.scope, context: plan.context,
    actions: plan.actions.map(({ id, command, expected }) => ({ id, command, expected })) });
  function check(binding, scope) {
    if (prepared.get(binding.id) !== binding) throw new Error('This reviewed plan is no longer active. Generate a fresh plan.');
    if (now() >= binding.expiresAt) throw new Error('This plan expired. Generate a fresh plan before applying actions.');
    const state = getState();
    if (state.user?.id !== binding.ownerId || state._sessionVersion !== binding.sessionVersion || state._dataRevision !== binding.dataRevision) throw new Error('The session changed. Generate a new plan before applying actions.');
    if (state.isLoading || state.initialLoadError) throw new Error('Your workspace is not ready. Refresh before applying actions.');
    if ((typeof scope === 'function' ? scope() : scope) !== binding.scope) throw new Error('Your selected context changed. Generate a fresh plan.');
    return state;
  }
  return {
    clear() { prepared.clear(); },
    prepare(raw, context, consent) {
      const plan = validatePlanReferences(agentPlanSchema.parse({ summary: raw.summary, actions: raw.actions }), context);
      const state = getState();
      if (!state.user?.id || state.isLoading || state.initialLoadError) throw new Error('Wait for your workspace to load before preparing actions.');
      const ownerId = state.user.id, sessionVersion = state._sessionVersion, dataRevision = state._dataRevision;
      const review = { ...plan, id: uuid(), ownerId, sessionVersion, dataRevision, scope: agentContextScope(context, consent), context,
        actions: plan.actions.map(action => {
          const existing = action.recordId ? recordFor(state, action) : null;
          if (action.recordId && !existing) throw new Error('A selected record is no longer available. Refresh Context and generate a new plan.');
          return { id: uuid(), command: action, expected: existing ? fingerprint(existing) : null };
        }) };
      for (const [key, binding] of prepared) if (binding.expiresAt <= now()) prepared.delete(key);
      while (prepared.size >= AGENT_LIMITS.preparedPlans) prepared.delete(prepared.keys().next().value);
      prepared.set(review.id, { id: review.id, ownerId, sessionVersion, dataRevision, scope: review.scope, expiresAt: now() + AGENT_LIMITS.planTtlMs, seal: seal(review),
        actions: new Map(review.actions.map(entry => [entry.id, { ...entry, command: Object.freeze({ ...entry.command }), attempted: false }])) });
      return review;
    },
    async apply(plan, entry, scope) {
      const binding = prepared.get(plan?.id), approved = binding?.actions.get(entry?.id);
      if (!approved || !Array.isArray(plan.actions) || !plan.actions.includes(entry) || seal(plan) !== binding.seal) throw new Error('This action does not match the reviewed plan. Generate a fresh plan.');
      const state = check(binding, scope);
      if (approved.attempted) throw new Error('This action was already attempted. Check its destination before generating a new plan.');
      const action = approved.command;
      if (action.recordId && fingerprint(recordFor(state, action)) !== approved.expected) throw new Error('This record changed after the plan was prepared. Generate a fresh plan.');
      // The record command may be queued behind another editor's write.
      // Recheck inside that queue instead of rebasing onto the newer record.
      const checkedPatch = patch => current => {
        check(binding, scope);
        if (fingerprint(current) !== approved.expected) throw new Error('This record changed after the plan was prepared. Generate a fresh plan.');
        return typeof patch === 'function' ? patch(current) : patch;
      };
      approved.attempted = true;
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
      else if (action.kind === 'note.create') saved = await createNote({ id: approved.id, mutationId: `agent:${approved.id}`, title: action.title, content: action.content });
      else throw new Error('This action is not supported.');
      const current = getState();
      if (current.user?.id !== binding.ownerId || current._sessionVersion !== binding.sessionVersion || current._dataRevision !== binding.dataRevision) throw new Error('The session changed while saving. Check the original account before trying again.');
      if (!saved || (saved.id == null && saved.success !== true)) throw new Error('The server did not acknowledge this change. Check the destination before trying again.');
      if (action.kind === 'note.create') {
        // Notes uses the versioned API; the Notes page will sync the record.
        return { id: saved.id, title: saved.title };
      }
      return { id: saved.id || action.recordId, title: saved.title || saved.name };
    },
  };
}
