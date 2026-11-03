import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Skills from './Skills';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
const skill = { id: 'drawing', name: 'Drawing', category: 'creative', xp: 25, practiceCount: 1 };
beforeEach(() => {
  vi.clearAllMocks(); useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'owner' }, skills: [skill] });
  apiRequest.mockRejectedValue(new Error('Save failed; keep your draft.'));
});
afterEach(cleanup);
const openForm = () => { fireEvent.click(screen.getByRole('button', { name: 'Add Skill', exact: true })); fireEvent.change(screen.getByRole('textbox', { name: 'Skill name', exact: true }), { target: { value: 'Retained draft' } }); };

describe('Skills acknowledged writes', () => {
  it('keeps a rejected creation and never announces success', async () => {
    render(<Skills />); openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Add skill', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByRole('textbox', { name: 'Skill name', exact: true })).toHaveValue('Retained draft');
    expect(useStore.getState().skills).toEqual([skill]); expect(toast.success).not.toHaveBeenCalled();
  });
  it('blocks duplicate submissions and closes the draft only after acknowledgement', async () => {
    let resolve; apiRequest.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<Skills />); openForm();
    const save = screen.getByRole('button', { name: 'Add skill', exact: true });
    fireEvent.click(save); fireEvent.click(save);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    expect(save).toBeDisabled();
    await act(async () => { resolve({ id: 'owner' }); });
    expect(screen.queryByRole('textbox', { name: 'Skill name', exact: true })).not.toBeInTheDocument();
    expect(useStore.getState().skills).toHaveLength(2); expect(toast.success).toHaveBeenCalledTimes(1);
  });
  it('keeps failed practice and deletion unchanged without offering a false undo', async () => {
    render(<Skills />);
    fireEvent.click(screen.getByRole('button', { name: 'Practice +25' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(useStore.getState().skills[0].xp).toBe(25); expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Drawing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(useStore.getState().skills).toEqual([skill]); expect(toast.info).not.toHaveBeenCalled();
  });
  it('does not close or celebrate an earlier account’s late save', async () => {
    let resolve; apiRequest.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<Skills />); openForm(); fireEvent.click(screen.getByRole('button', { name: 'Add skill', exact: true }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    act(() => { useStore.getState().resetSessionData(); useStore.setState({ user: { id: 'other-owner' } }); });
    await act(async () => { resolve({ id: 'owner' }); });
    expect(useStore.getState().skills).toEqual([]); expect(toast.success).not.toHaveBeenCalled();
  });
});
