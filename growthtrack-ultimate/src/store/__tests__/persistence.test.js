import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import useStore, { normalizePortfolioHolding, normalizePortfolio } from '../useStore';
import { apiRequest } from '../../lib/apiClient';
import { legacyJournalId, LEGACY_JOURNAL_KEY, journalPayload } from '../journalActions';

vi.mock('../../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const snapshot = (user = { id: 'owner' }, extra = {}) => ({ user, tasks: [], preference: {}, ...extra });
const task = (id = 'one', extra = {}) => ({ id, title: id, done: false, status: 'pending', subtasks: [], ...extra });
const state = () => useStore.getState();
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.mocked(apiRequest).mockReset();
  state().resetSessionData();
  useStore.setState({ user: { id: 'owner', tasks: { pending: [task()], completed: [], recurring: ['metadata'] } }, theme: 'system', palette: 'gold', sidebarCollapsed: false, reducedMotion: false, density: 'comfortable', onboardingComplete: false, navigationOrder: ['today'], navigationTabOrder: {} });
  localStorage.clear();
});

describe('acknowledged UI preference setters', () => {
  it.each([
    ['setSidebarCollapsed', 'sidebarCollapsed', true],
    ['setReducedMotion', 'reducedMotion', true],
    ['setDensity', 'density', 'compact'],
    ['setTheme', 'theme', 'dark'],
    ['setPalette', 'palette', 'blue'],
    ['setOnboardingComplete', 'onboardingComplete', true],
    ['setNavigationOrder', 'navigationOrder', ['money', 'work']],
    ['setNavigationTabOrder', 'navigationTabOrder', { work: ['tasks', 'notes'] }],
  ])('%s waits for acknowledgement and rolls back failure', async (action, key, value) => {
    const previous = state()[key];
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state()[action](value); const assertion = expect(request).rejects.toThrow('Preference save failed');
    await settle(); expect(state()[key]).toEqual(value);
    response.reject(new Error('Preference save failed')); await assertion;
    expect(state()[key]).toEqual(previous); expect(state().preferenceSaveError.message).toBe('Preference save failed');
    apiRequest.mockResolvedValueOnce({ id: 'prefs', [key]: value });
    await expect(state()[action](value)).resolves.toMatchObject({ id: 'prefs' });
    expect(state()[key]).toEqual(value); expect(state().preferenceSaveError).toBeNull();
  });
  it('observes ignored rejections while preserving rejection for awaited callers', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Offline collapse'));
    state().setSidebarCollapsed(true); // Legacy fire-and-forget caller.
    await settle(); await settle();
    expect(state().sidebarCollapsed).toBe(false);
    expect(state().preferenceSaveError.message).toBe('Offline collapse');
    apiRequest.mockRejectedValueOnce(new Error('Awaited failure'));
    await expect(state().setReducedMotion(true)).rejects.toThrow('Awaited failure');
  });
  it('serializes rapid toggles, rebases rollback and preserves unrelated changes', async () => {
    const first = deferred(); apiRequest.mockReturnValueOnce(first.promise).mockRejectedValueOnce(new Error('Second failed'));
    const a = state().setSidebarCollapsed(true), b = state().setSidebarCollapsed(false);
    const failed = expect(b).rejects.toThrow('Second failed'); await settle();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    useStore.setState({ density: 'compact' });
    first.resolve({ id: 'prefs', sidebarCollapsed: true }); await a; await failed;
    expect(state().sidebarCollapsed).toBe(true); expect(state().density).toBe('compact');
  });
  it('does not roll back a preference response into a newer session', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state().setSidebarCollapsed(true), failed = expect(request).rejects.toThrow('Offline');
    await settle(); state().resetSessionData(); useStore.setState({ sidebarCollapsed: true });
    response.reject(new Error('Offline')); await failed;
    expect(state().sidebarCollapsed).toBe(true); expect(state().preferenceSaveError).toBeNull();
  });
  it('keeps setActiveTab UI-only and rejects malformed preference acknowledgements', async () => {
    state().setActiveTab('tasks'); expect(state().activeTab).toBe('tasks'); expect(apiRequest).not.toHaveBeenCalled();
    apiRequest.mockResolvedValueOnce({});
    await expect(state().setSidebarCollapsed(true)).rejects.toThrow('did not acknowledge');
    expect(state().sidebarCollapsed).toBe(false);
  });
});

describe('initial workspace loading', () => {
  it('exposes and rethrows errors, preserves records, then clears on success', async () => {
    const failure = new Error('offline');
    apiRequest.mockRejectedValueOnce(failure);
    await expect(state().fetchInitialData()).rejects.toBe(failure);
    expect(state().initialLoadError).toBe(failure);
    expect(state().isLoading).toBe(false);
    expect(state().user.tasks.pending).toHaveLength(1);
    apiRequest.mockResolvedValueOnce(snapshot());
    await state().fetchInitialData();
    expect(state().initialLoadError).toBeNull();
    expect(state().isLoading).toBe(false);
  });
  it('defaults to system only when no saved theme exists', async () => {
    expect(useStore.getInitialState().theme).toBe('system');
    useStore.setState({ theme: 'light' });
    apiRequest.mockResolvedValueOnce(snapshot());
    await state().fetchInitialData();
    expect(state().theme).toBe('light');
    apiRequest.mockResolvedValueOnce(snapshot(undefined, { preference: { theme: 'dark' } }));
    await state().fetchInitialData();
    expect(state().theme).toBe('dark');
  });
  it('partitions all completed task representations and preserves metadata', async () => {
    apiRequest.mockResolvedValueOnce(snapshot(undefined, { tasks: [task(), task('two', { done: true }), task('three', { status: 'completed', createdBy: 'owner' })] }));
    await state().fetchInitialData();
    expect(state().user.tasks.pending.map(row => row.id)).toEqual(['one']);
    expect(state().user.tasks.completed).toHaveLength(2);
    expect(state().user.tasks.completed[1].createdBy).toBe('owner');
  });
  it('rejects malformed snapshots without calling them a successful load', async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(state().fetchInitialData()).rejects.toThrow('invalid workspace snapshot');
    expect(state().initialLoadError).toBeInstanceOf(Error);
  });
  it('ignores late successes and failures after session reset', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state().fetchInitialData();
    state().resetSessionData();
    useStore.setState({ user: { id: 'next', tasks: { pending: [], completed: [] } } });
    response.resolve(snapshot()); await request;
    expect(state().user.id).toBe('next');
    const failure = deferred(); apiRequest.mockReturnValueOnce(failure.promise);
    const failed = state().fetchInitialData(); const assertion = expect(failed).rejects.toThrow('old session');
    state().resetSessionData(); failure.reject(new Error('old session')); await assertion;
    expect(state().initialLoadError).toBeNull(); expect(state().isLoading).toBe(false);
  });
  it('lets only the latest load publish its result', async () => {
    const first = deferred(), second = deferred();
    apiRequest.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const a = state().fetchInitialData(), b = state().fetchInitialData();
    second.resolve(snapshot({ id: 'owner', name: 'latest' })); await b;
    first.resolve(snapshot({ id: 'owner', name: 'old' })); await a;
    expect(state().user.name).toBe('latest');
  });
});

describe('acknowledged task operations', () => {
  it('carries record versions forward across queued edits and delete', async () => {
    const firstVersion = '2026-09-29T10:00:00.000Z', secondVersion = '2026-09-29T10:01:00.000Z';
    useStore.setState({ user: { id: 'owner', tasks: { pending: [task('one', { updatedAt: firstVersion })], completed: [] } } });
    apiRequest.mockResolvedValueOnce({ success: true, count: 1, updatedAt: secondVersion });
    await state().updateTask('one', { title: 'Updated' });
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toMatchObject({ title: 'Updated', expectedUpdatedAt: firstVersion });
    expect(state().user.tasks.pending[0].updatedAt).toBe(secondVersion);
    expect(state().user.tasks.pending[0]).not.toHaveProperty('success');
    apiRequest.mockResolvedValueOnce({ success: true, count: 1 });
    await state().deleteTask('one');
    expect(JSON.parse(apiRequest.mock.calls[1][1].body).expectedUpdatedAt).toBe(secondVersion);
  });
  it('rolls back optimistic edits on a server version conflict', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('Refresh before saving.'), { status: 409 }));
    await expect(state().updateTask('one', { title: 'Conflicted' })).rejects.toMatchObject({ status: 409 });
    expect(state().user.tasks.pending[0].title).toBe('one');
  });
  it('returns the server record and preserves its metadata', async () => {
    apiRequest.mockResolvedValueOnce({ id: 'new', createdAt: 'server-time', userId: 'owner', tags: ['server'] });
    const result = await state().addTask({ title: 'New task', tags: ['client'] });
    expect(result).toMatchObject({ id: 'new', createdAt: 'server-time', tags: ['server'] });
    expect(state().user.tasks.pending[0]).toEqual(result);
  });
  it('requires a record ID for creation and never invents a saved task', async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(state().addTask({ title: 'No acknowledgement' })).rejects.toThrow('did not acknowledge');
    expect(state().user.tasks.pending.map(row => row.id)).toEqual(['one']);
  });
  it.each(['completeTask', 'deleteTask', 'updateTask', 'reopenTask'])('%s rejects failure and restores only the affected task', async action => {
    if (action === 'reopenTask') useStore.setState({ user: { id: 'owner', tasks: { pending: [], completed: [task('one', { done: true, status: 'done' })] } } });
    const before = state().user.tasks;
    apiRequest.mockRejectedValueOnce(new Error('save failed'));
    await expect(state()[action]('one', action === 'updateTask' ? { title: 'Changed' } : 'pending')).rejects.toThrow('save failed');
    expect(state().user.tasks).toEqual(before);
  });
  it('requires positive acknowledgement for updates and deletes', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, count: 0 });
    await expect(state().completeTask('one')).rejects.toThrow('did not acknowledge');
    expect(state().user.tasks.pending).toHaveLength(1);
  });
  it('keeps unrelated task and profile edits during a rollback', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state().completeTask('one'); const assertion = expect(request).rejects.toThrow('offline'); await settle();
    useStore.setState({ user: { ...state().user, name: 'New name', tasks: { ...state().user.tasks, pending: [task('two')] } } });
    response.reject(new Error('offline')); await assertion;
    expect(state().user.name).toBe('New name');
    expect(state().user.tasks.pending.map(row => row.id)).toEqual(['one', 'two']);
    expect(state().user.tasks.recurring).toEqual(['metadata']);
  });
  it('serializes edits to one task and rebases after the earlier failure', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise).mockResolvedValueOnce({ success: true, count: 1 });
    const first = state().updateTask('one', { title: 'Failed title' }); const assertion = expect(first).rejects.toThrow('offline');
    const second = state().updateTask('one', current => ({ subtasks: [...current.subtasks, { id: 'sub', title: 'Durable subtask' }] }));
    await settle(); expect(apiRequest).toHaveBeenCalledTimes(1);
    response.reject(new Error('offline')); await assertion; await second;
    expect(state().user.tasks.pending[0]).toMatchObject({ title: 'one', subtasks: [{ id: 'sub' }] });
  });
  it('does not let an in-flight refresh erase an optimistic task edit', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise).mockResolvedValueOnce([task()]);
    const change = state().completeTask('one'); await settle();
    await state().fetchTasks();
    expect(state().user.tasks.completed).toHaveLength(1);
    response.resolve({ success: true, count: 1 }); await change;
    expect(state().user.tasks.pending).toHaveLength(0);
  });
  it('never rolls back into another account', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state().deleteTask('one'); const assertion = expect(request).rejects.toThrow('offline'); await settle();
    state().resetSessionData(); useStore.setState({ user: { id: 'next', tasks: { pending: [task('next-task')], completed: [] } } });
    response.reject(new Error('offline')); await assertion;
    expect(state().user.tasks.pending.map(row => row.id)).toEqual(['next-task']);
  });
});

describe('record and singleton contracts', () => {
  it('preserves portfolio currency, manual date provenance and valuation snapshots, including zero prices', () => {
    const holding = { id: 'holding', name: 'Manual asset', units: 2, buyPrice: 0, currentPrice: 0, currency: 'USD', buyDate: '2026-01-01', priceAsOf: '2026-09-20', updatedAt: '2026-09-21T10:00:00Z', valuations: [{ date: '2026-09-20', price: 0, currency: 'USD', source: 'manual' }] };
    expect(normalizePortfolio([holding])).toEqual([expect.objectContaining(holding)]);
    expect(normalizePortfolioHolding({ ...holding, buyPrice: '' })).toBeNull();
    expect(normalizePortfolioHolding({ ...holding, currentPrice: -1 })).toBeNull();
    expect(normalizePortfolioHolding({ ...holding, currentPrice: null }).currentPrice).toBeNull();
    expect(normalizePortfolioHolding({ ...holding, currentPrice: '' }).currentPrice).toBeNull();
    expect(() => normalizePortfolio([holding, { ...holding, id: 'invalid', units: 0 }])).toThrow('No records were discarded');
    expect(() => normalizePortfolio('not-an-array')).toThrow('Portfolio records are invalid');
    const undated = normalizePortfolioHolding({ id: 'undated', name: 'Undated', units: 1, buyPrice: 10, currentPrice: 12 });
    expect(undated).not.toHaveProperty('priceAsOf');
    expect(undated).not.toHaveProperty('valuations');
  });
  it('publishes only acknowledged portfolio snapshots and retains metadata across queued holding edits', async () => {
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise).mockImplementation((path, options) => Promise.resolve({ id: 'owner', portfolio: options.body }));
    const first = state().addHolding({ id: 'one', name: 'First', units: 1, buyPrice: 10, currentPrice: 0, currency: 'USD', priceAsOf: '2026-09-20', valuations: [{ date: '2026-09-20', price: 0 }] });
    const second = state().addHolding({ id: 'two', name: 'Second', units: 1, buyPrice: 5, currentPrice: 6 });
    await settle(); expect(state().portfolio).toEqual([]);
    response.resolve({ id: 'owner', portfolio: apiRequest.mock.calls[0][1].body }); await first; await second;
    expect(state().portfolio.map(row => row.id)).toEqual(['one', 'two']);
    expect(state().portfolio[0]).toMatchObject({ currency: 'USD', priceAsOf: '2026-09-20', valuations: [{ price: 0 }] });
    expect(state().user.portfolio).toEqual(state().portfolio);
    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await expect(state().deleteHolding('one')).rejects.toThrow('offline');
    expect(state().portfolio).toHaveLength(2);
  });
  it('rejects a portfolio acknowledgement that dropped manual provenance instead of claiming a local save', async () => {
    const requested = { id: 'one', name: 'Manual', units: 1, buyPrice: 10, currentPrice: 12, currency: 'USD', priceAsOf: '2026-09-20' };
    apiRequest.mockResolvedValueOnce({ id: 'owner', portfolio: JSON.stringify([{ id: 'one', name: 'Manual', units: 1, buyPrice: 10, currentPrice: 12 }]) });
    await expect(state().setPortfolio([requested])).rejects.toThrow('did not retain');
    expect(state().portfolio).toEqual([]);
  });
  it('uses current note versions and retains new server version metadata', async () => {
    const oldVersion = '2026-09-29T10:00:00.000Z', newVersion = '2026-09-29T10:01:00.000Z';
    useStore.setState({ notes: [{ id: 'n', content: 'old', updatedAt: oldVersion, createdBy: 'owner' }] });
    apiRequest.mockResolvedValueOnce({ success: true, count: 1, updatedAt: newVersion });
    await state().updateNote('n', { content: 'new' });
    expect(JSON.parse(apiRequest.mock.calls[0][1].body).expectedUpdatedAt).toBe(oldVersion);
    expect(state().notes[0]).toMatchObject({ updatedAt: newVersion, createdBy: 'owner' });
  });
  it('keeps concurrent finance additions when a deletion rolls back', async () => {
    useStore.setState({ finance: { transactions: { first: { id: 'first', amount: 50 } }, budgets: { old: { id: 'old', limit_amount: 100 } } } });
    const transaction = deferred(), budget = deferred();
    apiRequest.mockReturnValueOnce(transaction.promise).mockReturnValueOnce(budget.promise);
    const deletedTransaction = state().deleteTransaction('first');
    const deletedBudget = state().deleteBudget('old');
    const transactionError = expect(deletedTransaction).rejects.toThrow('offline');
    const budgetError = expect(deletedBudget).rejects.toThrow('offline');
    useStore.setState({ finance: { ...state().finance, transactions: { second: { id: 'second', amount: 25 } }, budgets: { new: { id: 'new', limit_amount: 200 } } } });
    transaction.reject(new Error('offline')); budget.reject(new Error('offline'));
    await transactionError; await budgetError;
    expect(Object.keys(state().finance.transactions)).toEqual(['second', 'first']);
    expect(Object.keys(state().finance.budgets)).toEqual(['new', 'old']);
  });
  it('does not resurrect finance records in a later account', async () => {
    useStore.setState({ finance: { transactions: { first: { id: 'first', amount: 50 } }, budgets: {} } });
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state().deleteTransaction('first'); const assertion = expect(request).rejects.toThrow('offline');
    state().resetSessionData(); response.reject(new Error('offline')); await assertion;
    expect(state().finance.transactions).toEqual({});
  });
  it('keeps finance creation metadata returned by the server', async () => {
    apiRequest.mockResolvedValueOnce({ id: 'transaction', createdBy: 'owner', createdAt: 'server-time' });
    await state().addTransaction({ id: 'transaction', amount: 100 });
    expect(state().finance.transactions.transaction).toMatchObject({ id: 'transaction', createdBy: 'owner', createdAt: 'server-time' });
  });
  it('awaits skills and physique targets and preserves their previous values on failure', async () => {
    useStore.setState({ skills: [{ id: 'skill', name: 'Existing' }], physiqueTargets: { weight: 70 } });
    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await expect(state().addSkill({ id: 'new' })).rejects.toThrow('offline');
    expect(state().skills).toEqual([{ id: 'skill', name: 'Existing' }]);
    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await expect(state().updatePhysiqueTargets({ weight: 75 })).rejects.toThrow('offline');
    expect(state().physiqueTargets).toEqual({ weight: 70 });
    apiRequest.mockResolvedValue({ id: 'owner' });
    await Promise.all([state().addSkill({ id: 'second' }), state().addSkill({ id: 'third' })]);
    expect(state().skills.map(row => row.id)).toEqual(['skill', 'second', 'third']);
  });
  it('awaits note deletion and keeps metadata on update', async () => {
    useStore.setState({ notes: [{ id: 'n', content: 'old', createdBy: 'owner', color: 'blue' }] });
    const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
    const request = state().deleteNote('n'); const assertion = expect(request).rejects.toThrow('offline'); await settle();
    expect(state().notes).toHaveLength(1);
    response.reject(new Error('offline')); await assertion;
    apiRequest.mockResolvedValueOnce({ success: true, count: 1 }); await state().updateNote('n', { content: 'new' });
    expect(state().notes[0]).toEqual({ id: 'n', content: 'new', createdBy: 'owner', color: 'blue' });
  });
  it('upserts mood by date without discarding the ID, tags or audit fields', async () => {
    apiRequest.mockResolvedValueOnce({ id: 'mood', userId: 'owner', createdAt: 'server' });
    await state().addMoodLog({ date: '2026-09-29', mood: 3, tags: ['calm'] });
    apiRequest.mockResolvedValueOnce({ success: true, count: 1 });
    await state().addMoodLog({ date: '2026-09-29', mood: 5 });
    expect(apiRequest.mock.calls[1][0]).toBe('/api/mood_logs/mood');
    expect(state().moodLogs).toEqual([expect.objectContaining({ id: 'mood', mood: 5, tags: ['calm'], createdAt: 'server' })]);
  });
  it('retains nutrition on failure and rejects unacknowledged metrics', async () => {
    useStore.setState({ nutrition_logs: [{ id: 'food', meal: 'Lunch' }] });
    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await expect(state().deleteNutritionLog('food')).rejects.toThrow('offline');
    expect(state().nutrition_logs).toHaveLength(1);
    apiRequest.mockResolvedValueOnce({});
    await expect(state().addMetricLog({ metric: 'weight' })).rejects.toThrow('did not acknowledge');
    expect(state().metric_logs).toEqual([]);
  });
  it('saves ActionCenter durably and merges concurrent changes with sibling wellness metadata', async () => {
    useStore.setState({ wellnessData: { hydrationGoal: 2000, actionCenter: { extra: 'preserve' } } });
    apiRequest.mockResolvedValue({ id: 'owner' });
    await Promise.all([
      state().updateActionCenterState(value => ({ ...value, dismissed: ['one'] })),
      state().updateActionCenterState(value => ({ ...value, snoozed: { two: 123 } })),
    ]);
    expect(state().wellnessData).toEqual({ hydrationGoal: 2000, actionCenter: { extra: 'preserve', dismissed: ['one'], snoozed: { two: 123 } } });
    expect(JSON.parse(apiRequest.mock.calls[1][1].body)).toEqual(state().wellnessData);
    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await expect(state().updateActionCenterState({ dismissed: ['failed'] })).rejects.toThrow('offline');
    expect(state().wellnessData.actionCenter.dismissed).toEqual(['one']);
  });
});

describe('explicit legacy journal import', () => {
  const entry = { id: 123, date: '2020-01-02', time: '2020-01-02T12:00:00Z', text: 'My original reflection', prompt: 'Why?' };
  it('requires explicit confirmation and preserves originals on failure', async () => {
    localStorage.setItem(LEGACY_JOURNAL_KEY, JSON.stringify([entry]));
    await expect(state().importLegacyJournals([entry])).rejects.toThrow('Confirm');
    expect(apiRequest).not.toHaveBeenCalled();
    apiRequest.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    await expect(state().importLegacyJournals([entry], true)).rejects.toThrow('offline');
    expect(JSON.parse(localStorage.getItem(LEGACY_JOURNAL_KEY))).toEqual([entry]);
    expect(state().notes).toEqual([]);
  });
  it('is idempotent after reload and uses owner-specific IDs', async () => {
    const id = await legacyJournalId('owner', entry);
    expect(await legacyJournalId('other', entry)).not.toBe(id);
    const saved = { ...journalPayload(entry), id, userId: 'owner', createdAt: 'server' };
    apiRequest.mockResolvedValueOnce([]).mockResolvedValueOnce(saved);
    await state().importLegacyJournals([entry], true);
    useStore.setState({ notes: [] }); apiRequest.mockResolvedValueOnce([saved]);
    await state().importLegacyJournals([entry], true);
    expect(apiRequest.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
    expect(state().notes).toEqual([saved]);
  });
  it('reconciles a committed write whose acknowledgement was lost without resending', async () => {
    const id = await legacyJournalId('owner', entry);
    const saved = { ...journalPayload(entry), id, userId: 'owner' };
    apiRequest.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('lost response')).mockResolvedValueOnce([saved]);
    await expect(state().importLegacyJournals([entry], true)).resolves.toEqual([saved]);
    expect(apiRequest.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  });
});
