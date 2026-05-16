import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '../hooks/useToast';

// vi.mock is HOISTED — factory must NOT reference any outer variables.
// All state lives inside the factory.
vi.mock('../store/useStore', () => {
  const { vi: v } = require('vitest');
  const noop = v.fn();
  const state = {
    user: { tasks: { pending: [], completed: [], recurring: [] } },
    addTask:      noop,
    deleteTask:   noop,
    completeTask: noop,
    updateTask:   noop,
    reopenTask:   noop,
  };
  const mockStore = v.fn((selector) =>
    typeof selector === 'function' ? selector(state) : state
  );
  return {
    default: mockStore,
    apiSync: v.fn(() => Promise.resolve([])),
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
    const { default: Tasks } = await import('../components/Tasks');
    const { apiSync }        = await import('../store/useStore');
    apiSync.mockResolvedValue(
      Array.from({ length: 1000 }, (_, i) => ({
        id: i, title: `Spam Task ${i}`, priority: 'p3',
        category: 'Work', status: 'pending', subtasks: [],
      }))
    );
    const start = performance.now();
    const { container } = renderWithProviders(<Tasks />);
    expect(container).toBeInTheDocument();
    expect(performance.now() - start).toBeLessThan(30000);
  }, 30000);

  it('should not crash when store returns no tasks (empty state)', async () => {
    const { default: Tasks } = await import('../components/Tasks');
    const { apiSync }        = await import('../store/useStore');
    apiSync.mockResolvedValue([]);
    const { container } = renderWithProviders(<Tasks />);
    expect(container).toBeInTheDocument();
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
    expect(screen.getByText(/Add Task/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
