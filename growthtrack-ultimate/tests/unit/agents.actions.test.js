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

  it('rejects changed commands and plans from another runner before writing', async () => {
    const s = setup();
    const plan = s.prepare([{ kind: 'task.create', title: 'Reviewed title' }]);
    plan.actions[0].command.title = 'Unreviewed title';
    await expect(s.apply(plan)).rejects.toThrow('reviewed plan');
    expect(s.state.addTask).not.toHaveBeenCalled();
    const foreign = setup().prepare([{ kind: 'task.create', title: 'Other runner' }]);
    await expect(s.apply(foreign)).rejects.toThrow('reviewed plan');
  });

  it('preserves integrity when the UI copies an entry to update its status', async () => {
    const s = setup();
    const original = s.prepare([{ kind: 'task.create', title: 'Reviewed title' }]);
    const plan = { ...original, actions: original.actions.map(entry => ({ ...entry, status: 'applying' })) };
    await expect(s.apply(plan)).resolves.toMatchObject({ id: 'saved' });
    await expect(s.apply(original)).rejects.toThrow('already attempted');
  });

  it('bounds the number of prepared plans and refuses evicted proposals', async () => {
    const s = setup(), plans = [];
    for (let index = 0; index < 51; index += 1) plans.push(s.prepare([{ kind: 'task.create', title: `Task ${index}` }]));
    await expect(s.apply(plans[0])).rejects.toThrow('reviewed plan');
    expect(s.state.addTask).not.toHaveBeenCalled();
    await expect(s.apply(plans.at(-1))).resolves.toMatchObject({ id: 'saved' });
  });

  it('forgets cleared plans and invalidates updates still waiting in a queue', async () => {
    const s = setup();
    const cleared = s.prepare([{ kind: 'task.create', title: 'Discarded' }]);
    s.runner.clear();
    await expect(s.apply(cleared)).rejects.toThrow('reviewed plan');
    expect(s.state.addTask).not.toHaveBeenCalled();
    const queued = s.prepare([{ kind: 'task.update', recordId: 'task-1', title: 'Discarded update' }], context);
    s.state.updateTask = vi.fn(async (id, patch) => {
      s.runner.clear();
      return { id, ...patch(s.state.user.tasks.pending[0]) };
    });
    await expect(s.apply(queued)).rejects.toThrow('no longer active');
  });

  it('expires prepared plans and rechecks session and consent when queued writes start', async () => {
    const s = setup();
    let time = 1000;
    const runner = createAgentActionRunner({ getState: () => s.state, now: () => time });
    const prepare = () => runner.prepare({ summary: 'Review', actions: [{ kind: 'task.update', recordId: 'task-1', title: 'Reviewed' }] }, context, consent);
    const expired = prepare();
    time += 10 * 60 * 1000;
    await expect(runner.apply(expired, expired.actions[0], expired.scope)).rejects.toThrow('expired');
    expect(s.state.updateTask).not.toHaveBeenCalled();
    const queued = prepare();
    let scope = queued.scope;
    s.state.updateTask = vi.fn(async (id, patch) => {
      scope = 'revoked';
      return { id, ...patch(s.state.user.tasks.pending[0]) };
    });
    await expect(runner.apply(queued, queued.actions[0], () => scope)).rejects.toThrow('context changed');
    const next = prepare();
    s.state.updateTask = vi.fn(async (id, patch) => {
      s.state._sessionVersion += 1;
      return { id, ...patch(s.state.user.tasks.pending[0]) };
    });
    await expect(runner.apply(next, next.actions[0], next.scope)).rejects.toThrow('session changed');
  });
});
