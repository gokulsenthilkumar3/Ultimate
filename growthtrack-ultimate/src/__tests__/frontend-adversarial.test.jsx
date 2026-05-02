import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tasks from '../components/Tasks';
import useStore from '../store/useStore';

// Mock Zustand store
vi.mock('../store/useStore', () => {
  return {
    default: vi.fn(),
    selectAddTask: vi.fn(),
    selectDeleteTask: vi.fn(),
    selectCompleteTask: vi.fn()
  };
});

describe('Frontend Adversarial & Boundary Tests', () => {
  
  it('should survive rendering 10,000 tasks without a Maximum Update Depth error', async () => {
    // Generate 10,000 tasks
    const massiveTasks = [];
    for (let i = 0; i < 10000; i++) {
      massiveTasks.push({
        id: i,
        title: `Spam Task ${i}`,
        priority: i % 2 === 0 ? 'High' : 'Low',
        tag: 'finance',
        done: false,
        dueDate: '2026-05-15',
        recurring: false
      });
    }

    const corruptedUser = {
      tasks: {
        pending: massiveTasks,
        completed: [],
        recurring: []
      }
    };

    // Render it. If it causes an infinite loop, this will timeout or throw max depth exceeded.
    const startTime = performance.now();
    const { container } = render(<Tasks user={corruptedUser} />);
    const endTime = performance.now();
    
    // Test passes if it didn't crash.
    expect(container).toBeInTheDocument();
    
    // Let's verify that React survived. Performance check:
    // It currently takes ~32 seconds to render 10,000 DOM nodes because we lack windowing/virtualization.
    // This is a known vulnerability we should fix! For now, we just assert it didn't infinite loop.
    expect(endTime - startTime).toBeLessThan(45000); 
  }, 45000);

  it('should not crash when provided entirely malformed/undefined state objects', () => {
    // Simulating API corruption where tasks is a string instead of an object, 
    // or arrays are missing.
    const poisonedUser = {
      tasks: "I am definitely not a tasks object",
      finance: NaN
    };

    // If the component assumes tasks is always an object with .pending arrays, it will crash here.
    // Let's see if the fallbacks `tasks.pending || []` actually protect against `tasks` being a string.
    // Wait, if tasks is a string, `tasks.pending` is undefined. `undefined || []` becomes `[]`. 
    // This is safe! Let's assert it renders gracefully.
    const { getByText } = render(<Tasks user={poisonedUser} />);
    
    // It should render the empty state texts
    expect(getByText(/No high tasks/i)).toBeInTheDocument();
    expect(getByText(/No medium tasks/i)).toBeInTheDocument();
    expect(getByText(/No low tasks/i)).toBeInTheDocument();
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

    // The map uses `task.id` as the key. If multiple have `undefined`, React might warn, 
    // but the component shouldn't completely crash.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Tasks user={brokenUser} />);
    
    // Should still render
    expect(screen.getByText('Quick Add')).toBeInTheDocument();
    spy.mockRestore();
  });
});
