import { describe, expect, it, vi } from 'vitest';
import { agentPlanSchema, validatePlanReferences, agentContextScope } from '../../src/lib/agentActions';
import { createAgentActionRunner } from '../../src/services/agentActions';

const consent = { wellness: false, finance: false, journal: false };
const context = [{ id: 'task-1', type: 'tasks', domain: 'workspace', label: 'Existing task', text: '{"title":"Existing task"}' }];
function setup(extra = {}) {
  const state = { user: { id: 'owner', tasks: { pending: [{ id: 'task-1', title: 'Existing task', updatedAt: 'version-1', subtasks: [{ title: 'Review', done: false }] }], completed: [] } }, _sessionVersion: 1, _dataRevision: 1,
    addTask: vi.fn(async payload => ({ ...payload, id: 'saved' })), updateTask: vi.fn(async (id, patch) => ({ id, ...patch })), completeTask: vi.fn(async id => ({ id, done: true })),
    goals: [{ id: 'goal-1', title: 'Learn', userId: 'owner', current_value: 0 }], habits: [{ id: 'habit-1', name: 'Read', userId: 'owner' }],
    addGoal: vi.fn(async payload => ({ id: 'goal-new', ...payload })), updateGoal: vi.fn(async (id, patch) => ({ id, ...patch })), addHabit: vi.fn(async payload => ({ id: 'habit-new', ...payload })), updateHabit: vi.fn(async (id, patch) => ({ id, ...patch })), ...extra };
  const createNote = vi.fn(async input => ({ ...input, id: input.id }));
  const runner = createAgentActionRunner({ getState: () => state, createNote });
  const prepare = (actions, sources = []) => runner.prepare({ summary: 'Review these changes.', actions }, sources, consent);
  const apply = plan => runner.apply(plan, plan.actions[0], plan.scope);
  return { state, runner, createNote, prepare, apply };
}

describe('reviewed agent action boundary', () => {
  it('rejects unsupported operations, invalid dates and hidden payload fields', () => {
    for (const action of [{ kind: 'shell', command: 'anything' }, { kind: 'task.create', title: 'Task', url: 'https://external.test' }, { kind: 'task.create', title: 'Task', dueDate: '2026-02-31' }, { kind: 'task.update', recordId: 'task-1' }]) {
      expect(agentPlanSchema.safeParse({ summary: 'Plan', actions: [action] }).success).toBe(false);
    }
    expect(() => validatePlanReferences({ actions: [{ kind: 'task.complete', recordId: 'other' }] }, context)).toThrow('not selected');
    expect(() => validatePlanReferences({ actions: [{ kind: 'task.complete', recordId: 'task-1' }, { kind: 'task.update', recordId: 'task-1', title: 'Other' }] }, context)).toThrow('more than once');
  });
  it('preparation never writes records; confirmed execution uses canonical commands', async () => {
    const s = setup(); const plan = s.prepare([{ kind: 'task.create', title: 'Write draft', dueDate: '2026-11-01', priority: 'p2' }]);
    expect(s.state.addTask).not.toHaveBeenCalled();
    await expect(s.apply(plan)).resolves.toMatchObject({ id: 'saved' });
    expect(s.state.addTask).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Write draft', due_date: '2026-11-01', priority: 'p2', done: false }));
    await expect(s.apply(plan)).rejects.toThrow('already attempted');
  });
  it('blocks changed accounts, sessions, context and stale nested record data', async () => {
    const s = setup(); const plan = s.prepare([{ kind: 'task.complete', recordId: 'task-1' }], context);
    await expect(s.runner.apply(plan, plan.actions[0], agentContextScope([], consent))).rejects.toThrow('context changed');
    s.state.user.tasks.pending[0].subtasks[0].done = true;
    await expect(s.apply(plan)).rejects.toThrow('record changed');
    s.state._sessionVersion = 2;
    await expect(s.apply(plan)).rejects.toThrow('session changed');
    s.state._sessionVersion = 1; s.state.user.id = 'different';
    await expect(s.apply(plan)).rejects.toThrow('session changed');
    expect(s.state.completeTask).not.toHaveBeenCalled();
  });
  it('never retries an ambiguous failed write or reports it as saved', async () => {
    const s = setup({ addTask: vi.fn().mockRejectedValue(new Error('Connection lost')) });
    const plan = s.prepare([{ kind: 'task.create', title: 'One task' }]);
    await expect(s.apply(plan)).rejects.toThrow('Connection lost');
    await expect(s.apply(plan)).rejects.toThrow('already attempted');
    expect(s.state.addTask).toHaveBeenCalledOnce();
  });
  it.each([
    [{ kind: 'task.update', recordId: 'task-1', title: 'Updated', dueDate: '2026-11-02' }, context, 'updateTask'],
    [{ kind: 'task.complete', recordId: 'task-1' }, context, 'updateTask'],
    [{ kind: 'goal.create', title: 'Learn a skill', targetValue: 10, unit: 'lessons' }, [], 'addGoal'],
    [{ kind: 'goal.progress', recordId: 'goal-1', value: 3 }, [{ id: 'goal-1', type: 'goals' }], 'updateGoal'],
    [{ kind: 'habit.create', name: 'Read', targetDays: 5 }, [], 'addHabit'],
    [{ kind: 'habit.update', recordId: 'habit-1', targetDays: 4 }, [{ id: 'habit-1', type: 'habits' }], 'updateHabit'],
  ])('executes the supported command %j', async (action, sources, command) => {
    const s = setup(); await s.apply(s.prepare([action], sources)); expect(s.state[command]).toHaveBeenCalledOnce();
  });
  it('uses versioned note creation with a stable mutation identity', async () => {
    const s = setup(); const plan = s.prepare([{ kind: 'note.create', title: 'A note', content: 'Draft text' }]);
    await s.apply(plan);
    expect(s.createNote).toHaveBeenCalledExactlyOnceWith({ id: plan.actions[0].id, mutationId: `agent:${plan.actions[0].id}`, title: 'A note', content: 'Draft text' });
  });
  it('does not update a record belonging to a different owner', () => {
    const s = setup(); s.state.user.tasks.pending[0].userId = 'another-owner';
    expect(() => s.prepare([{ kind: 'task.complete', recordId: 'task-1' }], context)).toThrow('no longer available');
  });
  it('rechecks the snapshot when a queued write actually starts', async () => {
    const s = setup();
    s.state.updateTask = vi.fn(async (id, patch) => {
      s.state.user.tasks.pending[0].title = 'Changed by another editor';
      return { id, ...patch(s.state.user.tasks.pending[0]) };
    });
    const plan = s.prepare([{ kind: 'task.update', recordId: 'task-1', title: 'Agent draft' }], context);
    await expect(s.apply(plan)).rejects.toThrow('record changed');
    expect(s.state.user.tasks.pending[0].title).toBe('Changed by another editor');
  });
});
