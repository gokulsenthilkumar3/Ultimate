import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AiDashboard from '../../src/components/AiDashboard';
import { getAgentsReadiness, streamAgentsChat } from '../../src/services/aiClient';

const fixture = vi.hoisted(() => ({ state: null }));
vi.mock('../../src/store/useStore', () => ({ default: () => fixture.state }));
vi.mock('../../src/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../src/services/aiClient', () => ({ getAgentsReadiness: vi.fn(), streamAgentsChat: vi.fn() }));

beforeEach(() => {
  fixture.state = {
    user: { id: 'owner', tasks: { pending: [{ id: 't1', userId: 'owner', title: 'Review draft' }], completed: [] } },
    _sessionVersion: 1,
    metric_logs: [{ id: 'm1', userId: 'owner', metric: 'weight', value: 72, unit: 'kg' }],
    finance: { transactions: { f1: { id: 'f1', userId: 'owner', amount: 12, type: 'Expense' } } },
    notes: [{ id: 'j1', userId: 'owner', source: 'mind-journal', title: 'Reflection', content: 'Private' }],
  };
  getAgentsReadiness.mockResolvedValue({ ready: true, models: [{ id: 'gemma3:1b', label: 'gemma3:1b', capabilities: { text: true } }] });
  streamAgentsChat.mockImplementation(async ({ onDelta }) => { onDelta('Draft suggestion.'); return { done: true }; });
  sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

async function mount() {
  const result = render(<AiDashboard />);
  await screen.findByText('1 installed chat model');
  return result;
}

async function send(text = 'Help me focus') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(streamAgentsChat).toHaveBeenCalled());
}

function openContext() {
  fireEvent.click(screen.getByRole('button', { name: /^Context/ }));
}

function openSession() {
  fireEvent.click(screen.getByRole('button', { name: /^Session/ }));
}

describe('Agents UI streaming and privacy', () => {
  it('uses empty context by default and disables unsupported action confirmation', async () => {
    sessionStorage.setItem('gt_ai_cache_v2', '[{"content":"other account"}]');
    await mount();
    expect(sessionStorage.getItem('gt_ai_cache_v2')).toBeNull();
    expect(screen.queryByText('other account')).not.toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Context selection' })).not.toBeInTheDocument();
    openContext();
    for (const name of ['Allow wellness records', 'Allow financial records', 'Allow journal entries']) expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    openSession();
    expect(screen.getByRole('button', { name: 'Confirm proposed actions' })).toBeDisabled();
    await send();
    expect(streamAgentsChat.mock.calls[0][0]).toMatchObject({ context: [], consent: { wellness: false, finance: false, journal: false } });
    expect(await screen.findByText('Draft suggestion.')).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });

  it('requires both sensitive-category opt-in and explicit record selection', async () => {
    await mount();
    openContext();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow wellness records' }));
    const measurement = screen.getByRole('checkbox', { name: /Wellness measurements: weight/ });
    expect(measurement).not.toBeChecked();
    fireEvent.click(measurement);
    await send();
    expect(streamAgentsChat.mock.calls[0][0].context).toEqual([expect.objectContaining({ id: 'm1', type: 'metrics', domain: 'wellness' })]);
    expect(JSON.stringify(streamAgentsChat.mock.calls[0][0])).not.toContain('Private');
  });

  it('drops revoked sensitive context and its old conversation history', async () => {
    await mount();
    openContext();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow wellness records' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Wellness measurements: weight/ }));
    await send('Review measurement');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow wellness records' }));
    await send('Next question');
    expect(streamAgentsChat.mock.calls[1][0]).toMatchObject({ context: [], messages: [{ role: 'user', content: 'Next question' }] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow wellness records' }));
    expect(screen.getByRole('checkbox', { name: /Wellness measurements: weight/ })).not.toBeChecked();
  });

  it('does not reuse history after sensitive consent changes without selected records', async () => {
    await mount();
    await send('First question');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());
    openContext();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow wellness records' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Question after consent change' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(streamAgentsChat).toHaveBeenCalledTimes(2));
    expect(streamAgentsChat.mock.calls[1][0].messages).toEqual([{ role: 'user', content: 'Question after consent change' }]);
  });

  it('shows actual partial deltas and stops the in-flight request', async () => {
    let current;
    streamAgentsChat.mockImplementation(args => {
      current = args;
      return new Promise((_resolve, reject) => args.signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true }));
    });
    await mount();
    await send();
    act(() => current.onDelta('First chunk'));
    expect(screen.getByText('First chunk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop response' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop response' }));
    await screen.findByText('Response stopped. This answer is incomplete.');
    expect(current.signal.aborted).toBe(true);
    act(() => current.onDelta('should not arrive'));
    expect(screen.queryByText(/should not arrive/)).not.toBeInTheDocument();
  });

  it('aborts and clears chat and selection when the account changes', async () => {
    let current;
    streamAgentsChat.mockImplementation(args => {
      current = args;
      return new Promise((_resolve, reject) => args.signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true }));
    });
    const view = await mount();
    await send('Private first-owner question');
    act(() => current.onDelta('Private first-owner answer'));
    fixture.state = { user: { id: 'new-owner', tasks: { pending: [], completed: [] } }, _sessionVersion: 2 };
    view.rerender(<AiDashboard />);
    await screen.findByText('1 installed chat model');
    expect(current.signal.aborted).toBe(true);
    expect(screen.queryByText('Private first-owner question')).not.toBeInTheDocument();
    expect(screen.queryByText('Private first-owner answer')).not.toBeInTheDocument();
    openContext();
    expect(screen.getByRole('checkbox', { name: 'Allow wellness records' })).not.toBeChecked();
    expect(screen.getByText('Select records (0/20 selected)')).toBeInTheDocument();
  });

  it('clearing/unmounting aborts streams and rejects late chunks', async () => {
    let current;
    streamAgentsChat.mockImplementation(args => {
      current = args;
      return new Promise((_resolve, reject) => args.signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true }));
    });
    const view = await mount();
    await send();
    openSession();
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(current.signal.aborted).toBe(true);
    act(() => current.onDelta('Late chunk'));
    expect(screen.queryByText('Late chunk')).not.toBeInTheDocument();
    await send('Another question');
    view.unmount();
    expect(current.signal.aborted).toBe(true);
  });

  it('keeps genuine failure visible and restores the prompt for retry', async () => {
    streamAgentsChat.mockRejectedValueOnce(new Error('Model server unavailable.'));
    await mount();
    await send('Keep this prompt');
    expect(await screen.findByRole('alert')).toHaveTextContent('Model server unavailable.');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Keep this prompt');
    expect(screen.queryByText(/taking a moment to reconnect/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(streamAgentsChat).toHaveBeenCalledTimes(2));
    expect(streamAgentsChat.mock.calls[1][0].messages).toEqual([{ role: 'user', content: 'Keep this prompt' }]);
  });

  it('disables send and quick prompts when no model is available', async () => {
    getAgentsReadiness.mockResolvedValue({ ready: false, models: [], reason: 'No chat-capable models.' });
    render(<AiDashboard />);
    await screen.findByText('No chat-capable models.');
    expect(screen.getByRole('button', { name: 'Plan my day' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Plan' } });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(streamAgentsChat).not.toHaveBeenCalled();
  });

  it('states when sign-in is required while retaining a draftable composer', async () => {
    fixture.state.user = null;
    render(<AiDashboard />);
    expect(await screen.findByText('Sign in to use GrowthTrack AI.')).toBeInTheDocument();
    const message = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(message, { target: { value: 'Draft for later' } });
    expect(message).toHaveValue('Draft for later');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('opens compact controls by keyboard and returns focus on Escape', async () => {
    await mount();
    const context = screen.getByRole('button', { name: /^Context/ });
    context.focus();
    await userEvent.keyboard('{Enter}');
    expect(context).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Context selection' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(context).toHaveAttribute('aria-expanded', 'false');
    expect(context).toHaveFocus();
  });
});
