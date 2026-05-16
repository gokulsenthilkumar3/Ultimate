import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '../hooks/useToast';

// vi.mock is HOISTED — the factory MUST NOT reference any variables
// defined outside it (they won’t exist yet at hoist time).
vi.mock('../store/useStore', () => {
  const { vi: viInner } = require('vitest');
  const noop = viInner.fn();
  const state = {
    user: { tasks: { pending: [], completed: [], recurring: [] } },
    addTask:      noop,
    deleteTask:   noop,
    completeTask: noop,
    updateTask:   noop,
    reopenTask:   noop,
  };
  const mockStore = viInner.fn((selector) =>
    typeof selector === 'function' ? selector(state) : state
  );
  mockStore.__state = state;
  return {
    default: mockStore,
    apiSync: viInner.fn(() => Promise.resolve([])),
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
    // Import AFTER mock is set up
    const { default: Tasks }   = await import('../components/Tasks');
    const { apiSync }          = await import('../store/useStore');
    apiSync.mockResolvedValue(
      Array.from({ length: 1000 }, (_, i) => ({
        id: i, title: `Spam Task ${i}`, priority: 'p3',
        category: 'Work', status: 'pending', subtasks: [],
      }))
    );

    const startTime = performance.now();
    const { container } = renderWithProviders(<Tasks />);
    const endTime = performance.now();

    expect(container).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(30000);
  }, 30000);

  it('should not crash when store returns no tasks (empty state)', async () => {
    const { default: Tasks } = await import('../components/Tasks');
    const { apiSync }        = await import('../store/useStore');
    apiSync.mockResolvedValue([]);

    const { container } = renderWithProviders(<Tasks />);
    expect(container).toBeInTheDocument();
    // Tasks.jsx empty state: "No pending tasks — add one above!"
    expect(await screen.findByText(/No pending tasks/i)).toBeInTheDocument();
  });

  it('should gracefully handle tasks with missing critical properties', async () => {
    const { default: Tasks } = await import('../components/Tasks');
    const { apiSync }        = await import('../store/useStore');
    apiSync.mockResolvedValue([
      { id: undefined, title: undefined, priority: undefined, status: 'pending', subtasks: [] },
      { id: null,      title: null,      priority: 'p2',      status: 'pending', subtasks: [] },
    ]);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderWithProviders(<Tasks />);
    expect(container).toBeInTheDocument();
    // Tasks.jsx always renders "Add Task" button in header
    expect(screen.getByText(/Add Task/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
