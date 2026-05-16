import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tasks from '../components/Tasks';
import { ToastProvider } from '../hooks/useToast';
import useStore from '../store/useStore';

// Mock Zustand store with all selectors the Tasks component needs
vi.mock('../store/useStore', () => {
  const noop = vi.fn();
  const mockStore = vi.fn((selector) => {
    const state = {
      user: null,
      addTask: noop,
      deleteTask: noop,
      completeTask: noop,
      updateTask: noop,
      reopenTask: noop,
    };
    return typeof selector === 'function' ? selector(state) : state;
  });
  return {
    default: mockStore,
    selectAddTask: (s) => s.addTask,
    selectDeleteTask: (s) => s.deleteTask,
    selectCompleteTask: (s) => s.completeTask,
    selectUpdateTask: (s) => s.updateTask,
    selectReopenTask: (s) => s.reopenTask,
  };
});

const renderWithProviders = (ui) => render(<ToastProvider>{ui}</ToastProvider>);

describe('Frontend Adversarial & Boundary Tests', () => {

  it('should survive rendering 1,000 tasks without crashing (virtualization gate)', () => {
    const massiveTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      title: `Spam Task ${i}`,
      priority: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
      tag: 'finance',
      done: false,
      dueDate: '2026-12-31',
      recurring: false,
    }));

    const corruptedUser = {
      tasks: { pending: massiveTasks, completed: [], recurring: [] }
    };

    const startTime = performance.now();
    const { container } = renderWithProviders(<Tasks user={corruptedUser} />);
    const endTime = performance.now();

    expect(container).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(30000);
  }, 30000);

  it('should not crash when provided entirely malformed/undefined state objects', () => {
    const poisonedUser = {
      tasks: "I am definitely not a tasks object",
      finance: NaN
    };

    const { container } = renderWithProviders(<Tasks user={poisonedUser} />);
    expect(container).toBeInTheDocument();

    // Verify the empty state renders (match actual rendered text)
    // Tasks renders "0 pending" when no tasks exist
    expect(screen.getByText(/0 pending/i)).toBeInTheDocument();
  });

  it('should gracefully handle tasks with missing critical properties (undefined IDs, titles)', () => {
    const brokenUser = {
      tasks: {
        pending: [
          { id: undefined, title: undefined, priority: undefined },
          { id: null, title: null, priority: 'High', tag: undefined }
        ]
      }
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderWithProviders(<Tasks user={brokenUser} />);
    expect(container).toBeInTheDocument();
    // Match the actual "Add Task" button text that Tasks renders
    expect(screen.getByText(/Add Task/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
