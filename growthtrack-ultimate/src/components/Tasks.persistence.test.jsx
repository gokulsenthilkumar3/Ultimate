import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Tasks from './Tasks';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
const row = { id: 'task', title: 'Existing task', status: 'pending', done: false, subtasks: [] };
beforeEach(() => {
  vi.clearAllMocks(); useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'owner', tasks: { pending: [row], completed: [] } } });
  apiRequest.mockImplementation((path, options) => options.method === 'GET' ? Promise.resolve([row]) : Promise.reject(new Error('Save failed; try again.')));
});
afterEach(cleanup);
const mount = async () => { render(<Tasks />); await waitFor(() => expect(screen.getByText('Existing task')).toBeVisible()); };
const writes = () => apiRequest.mock.calls.filter(([, options]) => options.method !== 'GET');

describe('Tasks persistence feedback', () => {
  it('keeps a failed creation draft and never retries or claims success', async () => {
    await mount(); fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Initialize Task' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByLabelText('Title *')).toHaveValue('Keep this draft');
    expect(screen.getByRole('button', { name: 'Initialize Task' })).toBeEnabled();
    expect(writes()).toHaveLength(1); expect(toast.success).not.toHaveBeenCalled();
    expect(useStore.getState().user.tasks.pending).toEqual([row]);
  });
  it('rolls back failed completion and reports the failure', async () => {
    await mount(); fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByText('Existing task')).toBeVisible();
    expect(useStore.getState().user.tasks.completed).toEqual([]);
    expect(writes()).toHaveLength(1); expect(toast.success).not.toHaveBeenCalled();
  });
  it('retains an unsaved subtask input when the server rejects it', async () => {
    await mount(); fireEvent.click(screen.getByRole('button', { name: 'Add sub-tasks' }));
    fireEvent.change(screen.getByPlaceholderText('+ Add sub-task…'), { target: { value: 'Keep subtask' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByPlaceholderText('+ Add sub-task…')).toHaveValue('Keep subtask');
    expect(useStore.getState().user.tasks.pending[0].subtasks).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('offers Undo only after acknowledged deletion and awaits restoration', async () => {
    apiRequest.mockImplementation((path, options) => options.method === 'GET' ? Promise.resolve([row]) : options.method === 'DELETE' ? Promise.resolve({ success: true, count: 1 }) : Promise.reject(new Error('Restore failed')));
    await mount(); fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    const undo = toast.info.mock.calls[0][2].action.onClick;
    await act(async () => { await undo(); });
    expect(toast.error).toHaveBeenCalledWith('Restore failed');
    expect(toast.success).not.toHaveBeenCalled();
    expect(useStore.getState().user.tasks.pending).toEqual([]);
  });
});
