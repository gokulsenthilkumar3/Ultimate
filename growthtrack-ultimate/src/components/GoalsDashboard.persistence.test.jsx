import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GoalsDashboard from './GoalsDashboard';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../hooks/useAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
const goal = { id: 'goal', userId: 'owner', title: 'Read ten books', category: 'personal', status: 'active', priority: 'medium', current_value: 2, target_value: 10, subtasks: [] };
beforeEach(() => {
  vi.clearAllMocks(); useStore.getState().resetSessionData(); useStore.setState({ user: { id: 'owner' }, goals: [goal] });
  apiRequest.mockImplementation((_path, options) => options?.method === 'POST' || options?.method === 'PUT' ? Promise.reject(new Error('Save failed; keep the draft.')) : Promise.resolve([]));
});
afterEach(cleanup);
const expand = () => fireEvent.click(screen.getByRole('button', { name: 'Expand Read ten books' }));

describe('Goal save and history feedback', () => {
  it('retains rejected new-goal and subtask drafts without false success', async () => {
    render(<GoalsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'New Goal', exact: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Goal title' }), { target: { value: 'Retained goal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Goal', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByRole('textbox', { name: 'Goal title' })).toHaveValue('Retained goal');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    expand();
    fireEvent.change(screen.getByRole('textbox', { name: 'Add a sub-task to Read ten books' }), { target: { value: 'Retained step' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add sub-task to Read ten books' }));
    await waitFor(() => expect(apiRequest.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1));
    expect(screen.getByRole('textbox', { name: 'Add a sub-task to Read ten books' })).toHaveValue('Retained step');
    expect(useStore.getState().goals[0].subtasks).toEqual([]); expect(toast.success).not.toHaveBeenCalled();
  });
  it('submits progress once and waits for the atomic goal response', async () => {
    let resolve;
    apiRequest.mockImplementation((_path, options) => options?.method === 'POST' ? new Promise(done => { resolve = done; }) : Promise.resolve([]));
    render(<GoalsDashboard />); expand();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Value' }), { target: { value: '10' } });
    const log = screen.getByRole('button', { name: 'Log', exact: true }); fireEvent.click(log); fireEvent.click(log);
    await waitFor(() => expect(apiRequest.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1));
    const body = JSON.parse(apiRequest.mock.calls.find(([, options]) => options?.method === 'POST')[1].body);
    expect(body.goalId).toBe('goal'); expect(body.goal_id).toBeUndefined();
    expect(useStore.getState().goals[0].current_value).toBe(2); expect(toast.success).not.toHaveBeenCalled();
    await act(async () => { resolve({ id: body.id, goalId: 'goal', value: 10, date: body.date, goal: { ...goal, current_value: 10, status: 'completed' } }); });
    expect(useStore.getState().goals[0].status).toBe('completed');
    expect(apiRequest.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
  it('retains a failed progress draft and reuses its identifier on an explicit retry', async () => {
    render(<GoalsDashboard />); expand();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Value' }), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByRole('spinbutton', { name: 'Value' })).toHaveValue(7);
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(() => expect(apiRequest.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2));
    const requests = apiRequest.mock.calls.filter(([, options]) => options?.method === 'POST').map(([, options]) => JSON.parse(options.body));
    expect(requests[0].id).toBe(requests[1].id); expect(toast.success).not.toHaveBeenCalled();
  });
  it('shows failed history with an explicit retry, rather than an empty history', async () => {
    apiRequest.mockRejectedValueOnce(new Error('History failed')).mockResolvedValue([]);
    render(<GoalsDashboard />); expand();
    expect(await screen.findByRole('alert')).toHaveTextContent('History failed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry progress history' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry progress history' })).not.toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});
