import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore from '../store/useStore';

// Mock the global fetch API
global.fetch = vi.fn();

describe('useStore API Integration', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useStore.setState({
      user: { tasks: { pending: [], completed: [], recurring: [] } },
      shopping: { items: [] },
      timesheet: { sessions: [] },
      finance: { transactions: [] }
    });
    vi.resetAllMocks();
  });

  it('fetchInitialData populates store with backend data', async () => {
    // Mock the responses for the 4 API calls
    const mockUser = { name: 'Test User' };
    const mockTasks = [{ id: 1, title: 'Test Task' }];
    const mockShopping = [{ id: 1, name: 'Apple' }];
    const mockTimesheet = [{ id: 1, task: 'Coding' }];

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUser) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTasks) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockShopping) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTimesheet) });

    await useStore.getState().fetchInitialData();

    const state = useStore.getState();
    expect(state.user.name).toBe('Test User');
    expect(state.user.tasks.pending).toEqual(mockTasks);
    expect(state.shopping.items).toEqual(mockShopping);
    expect(state.timesheet.sessions).toEqual(mockTimesheet);
  });

  it('addTask sends POST request and updates store', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 99 }) });

    const newTask = { title: 'New API Task', priority: 'High' };
    await useStore.getState().addTask(newTask);

    const state = useStore.getState();
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/tasks', expect.objectContaining({ method: 'POST' }));
    expect(state.user.tasks.pending.length).toBe(1);
    expect(state.user.tasks.pending[0].id).toBe(99);
    expect(state.user.tasks.pending[0].title).toBe('New API Task');
  });

  it('addShoppingItem sends POST request and updates store', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 42 }) });

    const newItem = { name: 'Whey Protein', estimatedCost: 3500 };
    await useStore.getState().addShoppingItem(newItem);

    const state = useStore.getState();
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/shopping', expect.objectContaining({ method: 'POST' }));
    expect(state.shopping.items.length).toBe(1);
    expect(state.shopping.items[0].id).toBe(42);
    expect(state.shopping.items[0].name).toBe('Whey Protein');
  });
});
