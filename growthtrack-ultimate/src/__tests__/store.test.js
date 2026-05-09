import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore from '../store/useStore';

// Mock the global fetch API
global.fetch = vi.fn();

// The store uses VITE_API_BASE env var, with fallback to the Render URL.
// We intercept fetch universally so the URL doesn't need to match exactly.
describe('useStore API Integration', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useStore.setState({
      user: { tasks: { pending: [], completed: [], recurring: [] } },
      shopping: { items: [] },
      timesheet: { sessions: [] },
      finance: { transactions: [], budgets: [] },
      notes: [], goals: [], sleep_logs: [], documents: [],
      subscriptions: [], habits: [],
      entertainment: { media: [] },
      skills: [], calendar_events: [], metric_logs: [],
    });
    vi.resetAllMocks();
  });

  it('fetchInitialData populates store with backend data', async () => {
    const mockUser = { name: 'Test User' };
    const mockTasks = [{ id: 1, title: 'Test Task', done: false }];
    const mockShopping = [{ id: 1, name: 'Apple' }];
    const mockTimesheet = [{ id: 1, task: 'Coding' }];

    // fetchInitialData makes 22 parallel requests — resolve all of them
    // First 4 match meaningful data, the rest resolve to []/{}
    let callCount = 0;
    global.fetch.mockImplementation(() => {
      callCount++;
      const bodies = [mockUser, mockTasks, mockShopping, mockTimesheet];
      const body = callCount <= 4 ? bodies[callCount - 1] : [];
      const bodyStr = JSON.stringify(body);
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(bodyStr),
        json: () => Promise.resolve(body),
      });
    });

    await useStore.getState().fetchInitialData();

    const state = useStore.getState();
    expect(state.user.name).toBe('Test User');
    expect(state.user.tasks.pending[0].title).toBe('Test Task');
    expect(state.shopping.items).toEqual(mockShopping);
    expect(state.timesheet.sessions).toEqual(mockTimesheet);
  });

  it('addTask sends POST request and updates store', async () => {
    const responseBody = { id: 99 };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(responseBody)),
      json: () => Promise.resolve(responseBody),
    });
    const newTask = { title: 'New API Task', priority: 'High' };
    await useStore.getState().addTask(newTask);

    const state = useStore.getState();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(state.user.tasks.pending.length).toBe(1);
    expect(state.user.tasks.pending[0].id).toBe(99);
    expect(state.user.tasks.pending[0].title).toBe('New API Task');
  });

  it('addShoppingItem sends POST request and updates store', async () => {
    const responseBody2 = { id: 42 };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(responseBody2)),
      json: () => Promise.resolve(responseBody2),
    });
    const newItem = { name: 'Whey Protein', estimatedCost: 3500 };
    await useStore.getState().addShoppingItem(newItem);

    const state = useStore.getState();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/shopping'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(state.shopping.items.length).toBe(1);
    expect(state.shopping.items[0].id).toBe(42);
    expect(state.shopping.items[0].name).toBe('Whey Protein');
  });
});
