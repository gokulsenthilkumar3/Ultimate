const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const CSRF_KEY = 'growthtrack-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const setCsrfToken = token => token ? sessionStorage.setItem(CSRF_KEY, token) : sessionStorage.removeItem(CSRF_KEY);
export const getCsrfToken = () => sessionStorage.getItem(CSRF_KEY);

export async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body !== undefined && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, method, headers, credentials: 'include' });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text || 'Invalid server response.' }; }
  if (response.status === 401) window.dispatchEvent(new CustomEvent('growthtrack:auth-expired'));
  if (!response.ok) throw Object.assign(new Error(payload.error || `Request failed (${response.status})`), { status: response.status, payload });
  return payload;
}

export async function refreshCsrfToken() {
  const payload = await apiRequest('/api/auth/csrf');
  setCsrfToken(payload.csrfToken);
  return payload.csrfToken;
}
