import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '../hooks/useToast';

// vi.hoisted() runs BEFORE the module graph is resolved — safe for ESM.
// Variables returned here can be referenced in vi.mock() factories below.
const mocks = vi.hoisted(() => {
  const noop = vi.fn();
  const apiSyncMock = vi.fn(() => Promise.resolve([]));
  const state = {
    user: { tasks: { pending: [], completed: [], recurring: [] } },
    addTask:      noop,
    deleteTask:   noop,
    completeTask: noop,
    updateTask:   noop,
    reopenTask:   noop,
  };
  const storeMock = vi.fn((selector) =>
    typeof selector === 'function' ? selector(state) : state
  );
  return { storeMock, apiSyncMock, state };
});

vi.mock('../store/useStore', () => ({
  default:            mocks.storeMock,
  apiSync:            mocks.apiSyncMock,
  selectAddTask:      (s) => s.addTask,
  selectCompleteTask: (s) => s.completeTask,
  selectDeleteTask:   (s) => s.deleteTask,
  selectUpdateTask:   (s) => s.updateTask,
  selectReopenTask:   (s) => s.reopenTask,
}));

import Tasks from '../components/Tasks';

const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>);

describe('Frontend Adversarial & Boundary Tests', () => {

  it('should survive rendering 1,000 tasks without crashing', () => {
    const massiveTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: i, title: `Spam Task ${i}`, priority: 'p3',
      category: 'Work', status: 'pending', subtasks: [],
    }));
    mocks.apiSyncMock.mockResolvedValue(massiveTasks);

    const start = performance.now();
    const { container } = wrap(<Tasks />);
    expect(container).toBeTruthy();
    expect(performance.now() - start).toBeLessThan(30000);
  }, 30000);

  it('should not crash on empty task list and show empty state', async () => {
    mocks.apiSyncMock.mockResolvedValue([]);
    wrap(<Tasks />);
    // EmptyState renders title="No Pending Tasks" in an <h3> and ctaLabel="Add First Task" in a button
    const heading = await screen.findByRole('heading', { name: /No Pending Tasks/i });
    expect(heading).toBeTruthy();
  });

  it('should gracefully handle tasks with missing critical properties', () => {
    mocks.apiSyncMock.mockResolvedValue([
      { id: undefined, title: undefined, priority: undefined, status: 'pending', subtasks: [] },
      { id: null,      title: null,      priority: 'p2',      status: 'pending', subtasks: [] },
    ]);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = wrap(<Tasks />);
    expect(container).toBeTruthy();
    // Tasks.jsx always renders “Add Task” button
    expect(screen.getByText(/Add Task/i)).toBeTruthy();
    spy.mockRestore();
  });
});
