import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OLLAMA_BASE_URL, OllamaProvider, createModelProvider, modelCapabilities, normalizeBaseUrl, selectPreferredChatModel } from './aiProviders';

describe('local AI provider boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('normalizes only HTTP endpoints and rejects unsupported providers', () => {
    expect(normalizeBaseUrl('http://localhost:11434/')).toBe('http://localhost:11434');
    expect(normalizeBaseUrl('file:///models')).toBe('');
    expect(() => createModelProvider({ provider: 'cloud' })).toThrow('Unsupported model provider');
  });

  it('connects to the standard local Ollama endpoint when no endpoint is configured', () => {
    expect(new OllamaProvider().baseUrl).toBe(DEFAULT_OLLAMA_BASE_URL);
    expect(new OllamaProvider({ baseUrl: '' }).baseUrl).toBe(DEFAULT_OLLAMA_BASE_URL);
  });

  it('discovers installed models and exposes inferred capabilities', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [{ name: 'gemma4:e4b', size: 42, modified_at: '2026-01-01' }] }) }));
    const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434' });
    const models = await provider.listModels();
    expect(models[0]).toMatchObject({ id: 'gemma4:e4b', provider: 'ollama-local', size: 42 });
    expect(models[0].capabilities).toMatchObject({ text: true, vision: true, tools: true });
  });

  it('returns a stable unavailable state instead of throwing from availability', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const status = await new OllamaProvider({ baseUrl: 'http://localhost:11434' }).availability();
    expect(status).toMatchObject({ available: false, modelCount: 0, reason: 'offline' });
  });

  it('validates prompts and returns normalized chat output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ response: 'Ready', model: 'gemma3', done: true }) }));
    const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434', model: 'gemma3' });
    await expect(provider.chat({ prompt: '  ' })).rejects.toThrow('A prompt is required');
    await expect(provider.chat({ prompt: 'Plan my day' })).resolves.toEqual({ text: 'Ready', model: 'gemma3', provider: 'ollama-local', done: true });
  });

  it('classifies embedding-only models', () => {
    expect(modelCapabilities('embeddinggemma')).toMatchObject({ embedding: true, text: false });
  });

  it('selects an installed chat model and prefers configured Gemma families', () => {
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
