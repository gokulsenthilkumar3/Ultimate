import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JevPanel } from './JevAssistant';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const show = () => render(<MemoryRouter><JevPanel activeTab="sleep" onNavigate={() => {}} /></MemoryRouter>);
it('shows setup needed and cannot send when the key is absent', async () => {
  apiClient.get.mockResolvedValue({ enabled: true, configured: false });
  show();
  await screen.findByText(/Enabled · setup needed/);
  expect(screen.getByRole('button', { name: 'Ask for advice' })).toBeDisabled();
  expect(apiClient.post).not.toHaveBeenCalled();
});
it('requires fresh consent, attaches only typed text/current feature and shows a reviewed destination', async () => {
  apiClient.get.mockResolvedValue({ enabled: true, configured: true, features: [{ id: 'sleep' }] });
  apiClient.post.mockResolvedValue({ status: 'suggestion', recommendation: 'sleep', feature: { id: 'sleep' } });
  show();
  await screen.findByText(/Configured for 1 features/);
  fireEvent.change(screen.getByLabelText('What would you like to do?'), { target: { value: 'Track my sleep' } });
  expect(screen.getByRole('button', { name: 'Ask for advice' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Ask for advice' }));
  await screen.findByRole('link', { name: 'Open Sleep' });
  expect(apiClient.post.mock.calls[0][1]).toEqual({ request: 'Track my sleep', allowRemote: true, featureId: 'sleep' });
  await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
  expect(screen.getByRole('link', { name: 'Open Sleep' })).toHaveAttribute('href', '/wellness/sleep');
});
it('aborts requests when the panel closes', async () => {
  apiClient.get.mockResolvedValue({ configured: true, features: [] });
  const view = show();
  await screen.findByText(/Configured for 0 features/);
  const signal = apiClient.get.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
});

it('clears consent when switching to Laya and sends only to that selected provider', async () => {
  apiClient.get.mockResolvedValue({ provider: 'jev', configured: true, features: [], providers: [{ id: 'jev', configured: true }, { id: 'laya', enabled: true, configured: true }] });
  apiClient.post.mockResolvedValue({ status: 'abstain' });
  show();
  await screen.findByRole('combobox', { name: 'Decision provider' });
  fireEvent.change(screen.getByLabelText('What would you like to do?'), { target: { value: 'Plan a routine' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'laya' } });
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Ask for advice' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Ask for advice' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
  expect(apiClient.post.mock.calls[0][1]).toEqual({ request: 'Plan a routine', allowRemote: true, provider: 'laya', featureId: 'sleep' });
});
