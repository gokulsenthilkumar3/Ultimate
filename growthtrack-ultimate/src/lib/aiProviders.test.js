import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OLLAMA_BASE_URL, OllamaProvider, createModelProvider, modelCapabilities, normalizeBaseUrl, selectPreferredChatModel } from './aiProviders';
import { getAgentsReadiness, streamAgentsChat } from '../services/aiClient';

vi.mock('../services/aiClient', () => ({ getAgentsReadiness: vi.fn(), streamAgentsChat: vi.fn() }));

describe('same-origin AI provider compatibility', () => {
  afterEach(() => vi.resetAllMocks());

  it('ignores client URL configuration and rejects unsupported providers', () => {
    expect(DEFAULT_OLLAMA_BASE_URL).toBe('/api/agents');
    expect(normalizeBaseUrl('http://attacker.example')).toBe('/api/agents');
    expect(new OllamaProvider({ baseUrl: 'http://attacker.example' }).baseUrl).toBe('/api/agents');
    expect(() => createModelProvider({ provider: 'cloud' })).toThrow('Unsupported model provider');
  });

  it('discovers models only through the authenticated backend', async () => {
    const models = [{ id: 'gemma3:1b', capabilities: { text: true } }];
    getAgentsReadiness.mockResolvedValue({ models, ready: true });
    const controller = new AbortController();
    expect(await new OllamaProvider().listModels({ signal: controller.signal })).toEqual(models);
    expect(getAgentsReadiness).toHaveBeenCalledWith({ signal: controller.signal });
  });

  it('preserves false readiness for empty model lists', async () => {
    getAgentsReadiness.mockResolvedValue({ models: [], modelCount: 0, ready: false, available: false });
    expect(await new OllamaProvider().availability()).toMatchObject({ available: false, modelCount: 0 });
  });

  it('reports unavailable status and propagates caller cancellation', async () => {
    getAgentsReadiness.mockRejectedValue(new Error('offline'));
    expect(await new OllamaProvider().availability()).toMatchObject({ available: false, ready: false, reason: 'offline' });
    const controller = new AbortController();
    controller.abort();
    await expect(new OllamaProvider().availability({ signal: controller.signal })).rejects.toThrow('offline');
  });

  it('validates prompts and forwards genuine streaming callbacks', async () => {
    const onDelta = vi.fn();
    streamAgentsChat.mockResolvedValue({ text: 'Ready', model: 'gemma3:1b', provider: 'ollama-local', done: true });
    const provider = new OllamaProvider({ model: 'gemma3:1b' });
    await expect(provider.chat({ prompt: '  ' })).rejects.toThrow('A prompt is required');
    expect(await provider.chat({ prompt: 'Plan today', onDelta })).toMatchObject({ text: 'Ready', done: true });
    expect(streamAgentsChat).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemma3:1b', messages: [{ role: 'user', content: 'Plan today' }], onDelta }));
  });

  it('classifies embeddings without claiming tool execution', () => {
    expect(modelCapabilities('embeddinggemma')).toMatchObject({ embedding: true, text: false, tools: false });
    expect(modelCapabilities('gemma3')).toMatchObject({ text: true, tools: false });
  });

  it('selects only installed chat models and honors configured families', () => {
    const models = [
      { id: 'embeddinggemma:latest', capabilities: { text: false } },
      { id: 'llama3.2:3b', capabilities: { text: true } },
      { id: 'gemma3:1b', capabilities: { text: true } },
      { id: 'gemma4:e4b', capabilities: { text: true } },
    ];
    expect(selectPreferredChatModel(models, 'gemma3')?.id).toBe('gemma3:1b');
    expect(selectPreferredChatModel(models, '')?.id).toBe('gemma4:e4b');
    expect(selectPreferredChatModel(models.slice(0, 1), '')).toBeNull();
  });
});
