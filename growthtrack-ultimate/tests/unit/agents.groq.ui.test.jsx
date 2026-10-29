import React from 'react';
import { TextEncoder } from 'node:util';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentsWorkspace from '../../src/components/agents/AgentsWorkspace';
import { getAgentsReadiness, streamAgentsChat } from '../../src/services/aiClient';

vi.mock('../../src/store/useStore', () => ({ default: { getState: vi.fn() } }));
vi.mock('../../src/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../src/services/agentActions', () => ({ createAgentActionRunner: () => ({ clear: vi.fn() }) }));
vi.mock('../../src/services/aiClient', () => ({ getAgentsReadiness: vi.fn(), streamAgentsChat: vi.fn(), requestAgentsPlan: vi.fn() }));
const fixture = { user: { id: 'fixture-owner', tasks: { pending: [], completed: [] } }, _sessionVersion: 1 };

beforeEach(() => {
  vi.stubGlobal('TextEncoder', TextEncoder);
  getAgentsReadiness.mockResolvedValue({ ready: true, provider: 'groq', defaultModel: 'openai/gpt-oss-120b', models: [
    { id: 'qwen/qwen3.8-27b', capabilities: { text: true } }, { id: 'openai/gpt-oss-120b', capabilities: { text: true } },
  ] });
  streamAgentsChat.mockImplementation(async ({ onDelta }) => { onDelta('Ready.'); return { done: true }; });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals(); });
const mount = (view = '') => render(<MemoryRouter initialEntries={[`/Ultimate/hub/agents${view ? `?view=${view}` : ''}`]}><AgentsWorkspace state={fixture} /></MemoryRouter>);

describe('Groq Agents setup and model selection', () => {
  it('honors the server default, permits selecting Qwen, and identifies the data destination', async () => {
    mount('settings');
    await screen.findByRole('region', { name: 'Groq setup' });
    expect(screen.getByRole('combobox', { name: 'Model' })).toHaveValue('openai/gpt-oss-120b');
    expect(screen.queryByRole('region', { name: 'Local model setup' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /key/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Model' }), { target: { value: 'qwen/qwen3.8-27b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Back to chat' }));
    expect(screen.getByRole('combobox', { name: 'Chat model' })).toHaveValue('qwen/qwen3.8-27b');
    expect(screen.getByText('Your messages and selected records are sent to Groq.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Explain AI' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(streamAgentsChat).toHaveBeenCalledOnce());
    expect(streamAgentsChat.mock.calls[0][0]).toMatchObject({ model: 'qwen/qwen3.8-27b', context: [] });
    expect(streamAgentsChat.mock.calls[0][0]).not.toHaveProperty('apiKey');
  });

  it('keeps Groq setup available after a missing-key readiness error', async () => {
    getAgentsReadiness.mockRejectedValue(Object.assign(new Error('Set GROQ_API_KEY on the server.'), { code: 'not_configured', configured: false, provider: 'groq' }));
    mount();
    await screen.findByRole('heading', { name: 'Connect Groq' });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Setup instructions' }));
    await screen.findByRole('region', { name: 'Groq setup' });
    expect(screen.getByText('AGENTS_PROVIDER=groq GROQ_API_KEY=your-key', { exact: false })).toBeInTheDocument();
    expect(streamAgentsChat).not.toHaveBeenCalled();
  });

  it('does not send earlier conversation to a different provider after refreshing', async () => {
    mount();
    await screen.findByText('2 available chat models · Groq');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'First provider question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Ready.');
    getAgentsReadiness.mockResolvedValue({ ready: true, provider: 'ollama-local', models: [{ id: 'gemma3:1b', capabilities: { text: true } }] });
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    await screen.findByText('1 installed chat model');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'New provider question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(streamAgentsChat).toHaveBeenCalledTimes(2));
    expect(streamAgentsChat.mock.calls[1][0].messages).toEqual([{ role: 'user', content: 'New provider question' }]);
  });
});
