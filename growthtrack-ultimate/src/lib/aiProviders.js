import { getAgentsReadiness, streamAgentsChat } from '../services/aiClient';

// Compatibility for Growthcast callers; every request uses the same origin.
export const DEFAULT_OLLAMA_BASE_URL = '/api/agents';
export const normalizeBaseUrl = () => DEFAULT_OLLAMA_BASE_URL;

export function modelCapabilities(name = '') {
  const embedding = /embed/i.test(name);
  return { text: !embedding, tools: false, embedding };
}

export function selectPreferredChatModel(models = [], configuredModel = '') {
  const chatModels = models.filter(model => model?.capabilities?.text !== false);
  if (!chatModels.length) return null;
  const configured = String(configuredModel || '').trim().toLowerCase();
  return chatModels.find(model => model.id.toLowerCase() === configured)
    || chatModels.find(model => configured && model.id.toLowerCase().startsWith(configured + ':'))
    || chatModels.find(model => /^gemma4(?::|$)/i.test(model.id))
    || chatModels.find(model => /^gemma3(?::|$)/i.test(model.id))
    || chatModels[0];
}

export class OllamaProvider {
  constructor(config = {}) {
    this.id = 'ollama-local';
    this.baseUrl = DEFAULT_OLLAMA_BASE_URL;
    this.defaultModel = config.model || '';
  }

  async availability({ signal } = {}) {
    try { return await getAgentsReadiness({ signal }); }
    catch (error) {
      if (signal?.aborted) throw error;
      return { available: false, ready: false, modelCount: 0, models: [], reason: error.message };
    }
  }

  async listModels({ signal } = {}) {
    return (await getAgentsReadiness({ signal })).models;
  }

  async chat({ prompt, model = this.defaultModel, signal, onDelta } = {}) {
    if (!String(prompt || '').trim()) throw new Error('A prompt is required');
    return streamAgentsChat({ model, messages: [{ role: 'user', content: prompt }], signal, onDelta });
  }
}

export function createModelProvider(config = {}) {
  if (config.provider && config.provider !== 'ollama') throw new Error('Unsupported model provider: ' + config.provider);
  return new OllamaProvider(config);
}
