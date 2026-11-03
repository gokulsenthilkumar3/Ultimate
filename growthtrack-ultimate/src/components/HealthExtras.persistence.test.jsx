import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HealthExtras from './HealthExtras';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
const recovery = { id: 'r', name: 'Readiness', value: '5', status: 'Pending' };
beforeEach(() => {
  vi.clearAllMocks(); useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'owner' }, healthProfile: { recoveryMetrics: [recovery], senses: { vision: { level: 50, currentPower: 'Recorded', targetPower: 'Target' } } } });
  apiRequest.mockRejectedValue(new Error('Save failed; keep your draft.'));
});
afterEach(cleanup);

describe('Health+ recovery drafts and keyboard detail', () => {
  it('keeps keystrokes local and retains a rejected recovery draft', async () => {
    render(<HealthExtras />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Metric name' }), { target: { value: 'Retained recovery draft' } });
    expect(apiRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save recovery metrics' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByRole('textbox', { name: 'Metric name' })).toHaveValue('Retained recovery draft');
    expect(useStore.getState().healthProfile.recoveryMetrics).toEqual([recovery]);
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
  });
  it('acknowledges one explicit save and does not fabricate a saved state from an empty response', async () => {
    apiRequest.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'profile', data: { recoveryMetrics: [{ ...recovery, name: 'Updated' }] } });
    render(<HealthExtras />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Metric name' }), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save recovery metrics' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not acknowledge');
    fireEvent.click(screen.getByRole('button', { name: 'Save recovery metrics' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Recovery metrics saved.'));
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(useStore.getState().healthProfile.recoveryMetrics[0].name).toBe('Updated');
  });
  it('opens sensory details from the keyboard, handles missing exercise labels, and restores focus on Escape', async () => {
    render(<HealthExtras />);
    const trigger = screen.getByRole('button', { name: 'Open vision details' }); trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'vision details' })).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
