import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GoalsDashboard from './GoalsDashboard';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
const goals = count => Array.from({ length: count }, (_, index) => ({
  id: `goal-${index}`, title: `Synthetic goal ${index}`, category: index === 50 ? 'health' : 'personal',
  status: 'active', priority: 'medium', current_value: 10, target_value: 100, deadline: '', subtasks: [],
}));
const results = () => screen.getByRole('region', { name: 'Goal results' });
const next = () => fireEvent.click(within(screen.getByRole('navigation', { name: 'Goal pages' })).getByRole('button', { name: 'Next' }));
const previous = () => fireEvent.click(within(screen.getByRole('navigation', { name: 'Goal pages' })).getByRole('button', { name: 'Previous' }));

beforeEach(() => {
  vi.clearAllMocks();
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'goal-owner' }, goals: goals(51) });
  apiRequest.mockImplementation((_path, options) => options?.method && options.method !== 'GET'
    ? Promise.reject(new Error('Fixture save rejected.')) : Promise.resolve([]));
});
afterEach(cleanup);

describe('Goals collection performance and workflows', () => {
  it('bounds cards, searches all records and resets the page for category filters', () => {
    render(<GoalsDashboard />);
    expect(within(results()).getAllByRole('progressbar')).toHaveLength(25);
    expect(screen.getByText('Showing 1–25 of 51')).toBeInTheDocument();
    next(); next();
    expect(within(results()).getAllByRole('progressbar')).toHaveLength(1);
    expect(results()).toHaveFocus();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search goals' }), { target: { value: 'Synthetic goal 50' } });
    expect(screen.getByRole('button', { name: 'Edit Synthetic goal 50' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Goal pages' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search goals' }), { target: { value: '' } });
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('button', { name: /Health \(1\)/ }));
    expect(screen.getByRole('button', { name: 'Edit Synthetic goal 50' })).toBeInTheDocument();
    expect(useStore.getState().goals).toHaveLength(51);
  }, 30_000);

  it('retains edit, progress and sub-task drafts across pages and failed edits', async () => {
    render(<GoalsDashboard />);
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Synthetic goal 25' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Value' }), { target: { value: '37' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Note', exact: true }), { target: { value: 'Progress draft' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Add a sub-task to Synthetic goal 25' }), { target: { value: 'Sub-task draft' } });
    next(); previous();
    expect(screen.getByRole('spinbutton', { name: 'Value' })).toHaveValue(37);
    expect(screen.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('Progress draft');
    expect(screen.getByRole('textbox', { name: 'Add a sub-task to Synthetic goal 25' })).toHaveValue('Sub-task draft');
    expect(apiRequest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Synthetic goal 25' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Goal title' }), { target: { value: 'Retained goal draft' } });
    next(); previous();
    expect(screen.getByRole('textbox', { name: 'Goal title' })).toHaveValue('Retained goal draft');
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Your changes are still here')));
    expect(screen.getByRole('textbox', { name: 'Goal title' })).toHaveValue('Retained goal draft');
    expect(useStore.getState().goals.find(goal => goal.id === 'goal-25').title).toBe('Synthetic goal 25');
    expect(toast.success).not.toHaveBeenCalled();
  }, 30_000);

  it('clamps after an acknowledged last-page deletion without reviving that page on insert', async () => {
    apiRequest.mockResolvedValue({ success: true });
    render(<GoalsDashboard />);
    next(); next();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Synthetic goal 50' }));
    await waitFor(() => expect(screen.getByText('Page 2 of 2')).toBeInTheDocument());
    expect(within(results()).getAllByRole('progressbar')).toHaveLength(25);
    act(() => useStore.setState({ goals: goals(51) }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  }, 30_000);

  it('opens the focus goal when another page and search currently hide it', async () => {
    useStore.setState({ goals: goals(51).map(goal => ({ ...goal, is_focus: goal.id === 'goal-50' })) });
    render(<GoalsDashboard />);
    next();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search goals' }), { target: { value: 'Synthetic goal 10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open plan' }));
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Synthetic goal 50' })).toBeInTheDocument();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  }, 30_000);

  it('does not let a retained Undo action copy a deleted goal into another session', async () => {
    apiRequest.mockResolvedValue({ success: true });
    useStore.setState({ goals: goals(1) });
    render(<GoalsDashboard />);
    fireEvent.click(screen.getByLabelText('Delete Synthetic goal 0'));
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    const undo = toast.info.mock.calls[0][2].action.onClick;
    act(() => useStore.setState({ user: { id: 'another-owner' }, goals: [] }));
    await act(async () => undo());
    expect(useStore.getState().goals).toEqual([]);
    expect(apiRequest.mock.calls.every(([, options]) => options.method === 'DELETE')).toBe(true);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('session changed'));
  });

  it('prevents duplicate pending edits and restores the editable draft after rejection', async () => {
    let rejectSave;
    apiRequest.mockImplementation(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    useStore.setState({ goals: goals(1) });
    render(<GoalsDashboard />);
    fireEvent.click(screen.getByLabelText('Edit Synthetic goal 0'));
    fireEvent.change(screen.getByLabelText('Goal title'), { target: { value: 'Pending draft' } });
    const save = screen.getByRole('button', { name: 'Save', exact: true });
    fireEvent.click(save); fireEvent.click(save);
    expect(screen.getByLabelText('Goal title')).toBeDisabled();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    await act(async () => rejectSave(new Error('Fixture edit rejected.')));
    expect(screen.getByLabelText('Goal title')).toBeEnabled();
    expect(screen.getByLabelText('Goal title')).toHaveValue('Pending draft');
    expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  });

  it('resets paging and private drafts when the owner changes, even with reused IDs', () => {
    render(<GoalsDashboard />);
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Synthetic goal 25' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Goal title' }), { target: { value: 'Owner-only draft' } });
    act(() => useStore.setState({ user: { id: 'another-owner' }, goals: goals(51) }));
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    next();
    expect(screen.getByRole('button', { name: 'Edit Synthetic goal 25' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Owner-only draft')).not.toBeInTheDocument();
  }, 30_000);
});
