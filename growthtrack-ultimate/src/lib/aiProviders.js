function normalizeBaseUrl(value) {
  const url = String(value || '').trim().replace(/\/$/, '');
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().replace(/\/$/, '');
  } catch { return ''; }
}

function modelCapabilities(name = '') {
  const id = String(name).toLowerCase();
  return {
    text: true,
    vision: /gemma[34]|llava|vision|qwen.*vl/.test(id),
    tools: /gemma4|functiongemma|qwen|llama3\.1/.test(id),
    embedding: /embed/.test(id),
  };
}

export class OllamaProvider {
  constructor(config = {}) {
    this.id = 'ollama-local';
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.defaultModel = config.model || 'gemma3';
    this.timeoutMs = Math.max(1000, Math.min(Number(config.timeoutMs) || 12000, 300000));
  }

  async request(path, options = {}) {
    if (!this.baseUrl) throw new Error('Ollama endpoint is not configured');
    const response = await fetch(`${this.baseUrl}${path}`, { ...options, signal: options.signal || AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Ollama request failed (${response.status})`);
    return response;
  }

  async availability() {
    try {
      const models = await this.listModels();
      return { available: true, modelCount: models.length, baseUrl: this.baseUrl };
    } catch (error) {
      return { available: false, modelCount: 0, baseUrl: this.baseUrl, reason: error?.message || 'Ollama is unavailable' };
    }
  }

  async listModels() {
    const response = await this.request('/api/tags');
    const data = await response.json();
    return (Array.isArray(data.models) ? data.models : []).map(model => ({
      id: model.name,
      label: model.name,
      provider: this.id,
      size: Number(model.size) || null,
      modifiedAt: model.modified_at || null,
      capabilities: modelCapabilities(model.name),
    }));
  }

  async chat({ prompt, model = this.defaultModel, signal } = {}) {
    if (!String(prompt || '').trim()) throw new Error('A prompt is required');
    const response = await this.request('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal,
    });
    const data = await response.json();
    return { text: data.response || '', model: data.model || model, provider: this.id, done: data.done !== false };
  }
}

export function createModelProvider(config = {}) {
  const provider = config.provider || 'ollama';
  if (provider !== 'ollama') throw new Error(`Unsupported model provider: ${provider}`);
  return new OllamaProvider(config);
}

export { modelCapabilities, normalizeBaseUrl };
