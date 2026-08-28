const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const CSRF_KEY = 'growthtrack-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export const setCsrfToken = token => token ? sessionStorage.setItem(CSRF_KEY, token) : sessionStorage.removeItem(CSRF_KEY);
export const getCsrfToken = () => sessionStorage.getItem(CSRF_KEY);

export class ApiError extends Error {
  constructor(message, { status = 0, payload = {}, path = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.path = path;
  }
}

export class ApiClient {
  constructor({ baseUrl = API_BASE, timeoutMs = 12_000, retries = 1 } = {}) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
  }

  async request(path, options = {}) {
    const { timeoutMs: requestTimeoutMs, signal: callerSignal, ...requestOptions } = options;
    const method = String(options.method || 'GET').toUpperCase();
    const maxAttempts = SAFE_METHODS.has(method) ? this.retries + 1 : 1;
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const headers = new Headers(requestOptions.headers || {});
      if (!headers.has('Content-Type') && requestOptions.body !== undefined && !(requestOptions.body instanceof FormData)) headers.set('Content-Type', 'application/json');
      if (!SAFE_METHODS.has(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
      }

      const controller = new AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), requestTimeoutMs || this.timeoutMs);
      const abortFromCaller = () => controller.abort();
      callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

      try {
        const response = await fetch(`${this.baseUrl}${path}`, { ...requestOptions, method, headers, signal: controller.signal, credentials: 'include' });
        const text = await response.text();
        let payload = {};
        try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text || 'Invalid server response.' }; }
        if (response.status === 401) window.dispatchEvent(new CustomEvent('growthtrack:auth-expired'));
        if (!response.ok) throw new ApiError(payload.error || `Request failed (${response.status})`, { status: response.status, payload, path });
        return payload;
      } catch (error) {
        lastError = error?.name === 'AbortError'
          ? new ApiError('The server took too long to respond.', { status: 408, path })
          : error;
        const retryable = SAFE_METHODS.has(method) && (lastError.status === 0 || RETRYABLE_STATUS.has(lastError.status));
        if (!retryable || attempt === maxAttempts - 1) throw lastError;
        await new Promise(resolve => globalThis.setTimeout(resolve, 250 * (2 ** attempt) + Math.random() * 100));
      } finally {
        globalThis.clearTimeout(timeout);
        callerSignal?.removeEventListener('abort', abortFromCaller);
      }
    }

    throw lastError;
  }

  get(path, options) { return this.request(path, { ...options, method: 'GET' }); }
  post(path, body, options) { return this.request(path, { ...options, method: 'POST', body: JSON.stringify(body ?? {}) }); }
  put(path, body, options) { return this.request(path, { ...options, method: 'PUT', body: JSON.stringify(body ?? {}) }); }
  patch(path, body, options) { return this.request(path, { ...options, method: 'PATCH', body: JSON.stringify(body ?? {}) }); }
  delete(path, options) { return this.request(path, { ...options, method: 'DELETE' }); }
}

export const apiClient = new ApiClient();
export const apiRequest = (path, options = {}) => apiClient.request(path, options);

export async function refreshCsrfToken() {
  const payload = await apiRequest('/api/auth/csrf');
  setCsrfToken(payload.csrfToken);
  return payload.csrfToken;
}
