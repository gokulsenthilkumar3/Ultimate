import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentTextBatcher } from '../../src/lib/agentTextBatcher';
import { buildSelectedAiContext, getAiContextCandidates, selectAiContextRecords } from '../../src/lib/aiContext';

afterEach(() => vi.useRealTimers());
describe('bounded agent rendering work', () => {
  it('keeps first-token latency immediate and renders a 1000-token burst in two updates', () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const batch = createAgentTextBatcher(flush);
    for (let token = 0; token < 1000; token += 1) batch.push('界');
    expect(flush).toHaveBeenCalledExactlyOnceWith('界');
    vi.advanceTimersByTime(32);
    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush.mock.calls.map(([text]) => text).join('')).toBe('界'.repeat(1000));
    batch.dispose();
  });

  it('flushes the last tokens on completion, and discards pending or late tokens after abort/disposal', () => {
    vi.useFakeTimers();
    const controller = new AbortController(), flush = vi.fn();
    const batch = createAgentTextBatcher(flush, { signal: controller.signal });
    batch.push('First'); batch.push(' final'); batch.flush();
    expect(flush.mock.calls.map(([text]) => text).join('')).toBe('First final');
    batch.push(' private pending'); controller.abort(); batch.push(' late');
    vi.runAllTimers(); batch.flush(); batch.dispose(); batch.push(' disposed');
    expect(flush).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not scan account collections for an empty selection', () => {
    const state = { get user() { throw new Error('Account scan'); } };
    expect(buildSelectedAiContext(state, [])).toEqual([]);
  });

  it('reuses consent-filtered candidates while projecting only selected wire fields', () => {
    const state = { user: { id: 'owner', tasks: { pending: [{ id: 't1', title: 'Mine' }, { id: 't2', title: 'Other', userId: 'other' }], completed: [] } }, notes: [{ id: 'n1', userId: 'owner', title: 'Secret', category: 'journal', content: 'Private' }] };
    const candidates = getAiContextCandidates(state, {});
    const selected = selectAiContextRecords(candidates, ['tasks:t1', 'tasks:t2', 'notes:n1']);
    expect(selected).toEqual(buildSelectedAiContext(state, ['tasks:t1', 'tasks:t2', 'notes:n1'], {}));
    expect(selected).toHaveLength(1);
    expect(Object.keys(selected[0]).sort()).toEqual(['domain', 'id', 'label', 'text', 'type']);
  });
});
