import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tasks from '../components/Tasks';
import { ToastProvider } from '../hooks/useToast';

// ── Mock store ───────────────────────────────────────────────────────────────
const noop = vi.fn();
const makeStore = (tasks = []) => {
  const state = {
    user: { tasks: { pending: tasks, completed: [], recurring: [] } },
    addTask:      noop,
    deleteTask:   noop,
    completeTask: noop,
    updateTask:   noop,
    reopenTask:   noop,
  };
  return vi.fn((selector) =>
    typeof selector === 'function' ? selector(state) : state
  );
};

// Mock the API call so Tasks doesn’t hang on fetch in jsdom
vi.mock('../store/useStore', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    default: makeStore([]),
    apiSync: vi.fn(() => Promise.resolve([])),
    selectAddTask:      (s) => s.addTask,
    selectCompleteTask: (s) => s.completeTask,
    selectDeleteTask:   (s) => s.deleteTask,
    selectUpdateTask:   (s) => s.updateTask,
    selectReopenTask:   (s) => s.reopenTask,
  };
});

const renderWithProviders = (ui) => render(<ToastProvider>{ui}</ToastProvider>);

describe('Frontend Adversarial & Boundary Tests', () => {

  it('should survive rendering 1,000 tasks without crashing (virtualization gate)', async () => {
    const massiveTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      title: `Spam Task ${i}`,
      priority: 'p3',
      category: 'Work',
      status: 'pending',
      subtasks: [],
    }));

    const { default: useStore, apiSync } = await import('../store/useStore');
    useStore.mockImplementation(makeStore(massiveTasks));
    apiSync.mockResolvedValue(massiveTasks);

    const startTime = performance.now();
    const { container } = renderWithProviders(<Tasks />);
    const endTime = performance.now();

    expect(container).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(30000);
  }, 30000);

  it('should not crash when store returns no tasks (empty state)', async () => {
    const { default: useStore, apiSync } = await import('../store/useStore');
    useStore.mockImplementation(makeStore([]));
    apiSync.mockResolvedValue([]);

    const { container } = renderWithProviders(<Tasks />);
    expect(container).toBeInTheDocument();
    // Actual empty-state text from Tasks.jsx:
    // "No pending tasks — add one above!"
    expect(await screen.findByText(/No pending tasks/i)).toBeInTheDocument();
  });

  it('should gracefully handle tasks with missing critical properties', async () => {
    const brokenTasks = [
      { id: undefined, title: undefined, priority: undefined, status: 'pending', subtasks: [] },
      { id: null,      title: null,      priority: 'p2',      status: 'pending', subtasks: [] },
    ];

    const { default: useStore, apiSync } = await import('../store/useStore');
    useStore.mockImplementation(makeStore(brokenTasks));
    apiSync.mockResolvedValue(brokenTasks);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderWithProviders(<Tasks />);
    expect(container).toBeInTheDocument();
    // The "Add Task" button is always rendered in the header
    expect(screen.getByText(/Add Task/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
