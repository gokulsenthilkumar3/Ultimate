import { useEffect, useSyncExternalStore } from 'react';
import { getCsrfToken, refreshCsrfToken } from '../../lib/apiClient';

let connection = null, owner = null, epoch = 0;
const listeners = new Set();
const publish = () => listeners.forEach(listener => listener());
export function resetFamilyConnection(nextOwner = null) { connection = null; owner = nextOwner; epoch += 1; publish(); }
if (typeof window !== 'undefined') window.addEventListener('growthtrack:session-changed', event => resetFamilyConnection(event.detail?.owner || null));
export function connectFamily(ownerId, payload, expectedEpoch) {
  if (owner !== ownerId || epoch !== expectedEpoch) return false;
  if (!payload?.user?.id || (payload.authMode !== 'ultimate' && (typeof payload.token !== 'string' || payload.token === 'ultimate-local'))) throw new Error('Family Connect did not return a valid account connection.');
  connection = payload.authMode === 'ultimate' ? { owner: ownerId, user: payload.user, authMode: 'ultimate' } : { owner: ownerId, user: payload.user, token: payload.token }; publish(); return true;
}
export const familyEpoch = () => epoch;
export function useFamilyConnection(ownerId) {
  const snapshot = useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => connection, () => null);
  useEffect(() => { if (owner !== ownerId) resetFamilyConnection(ownerId); }, [ownerId]);
  return snapshot?.owner === ownerId ? snapshot : null;
}

export class FamilyError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; this.payload = { error: message }; }
}

/** Native 401s belong to Ultimate; legacy token failures only clear Family. */
export async function familyRequest(path, { connection: account, body, method = 'GET', signal, blob = false } = {}) {
  if (!/^\/(session|auth\/(login|register)|trees|members|relationships|events|documents|ai)(\/|\?|$)/.test(path)) throw new FamilyError('Unsupported Family request.');
  const shared = path === '/session' || account?.authMode === 'ultimate';
  const requestEpoch = epoch;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20_000);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) controller.abort();
  const headers = new Headers({ Accept: blob ? '*/*' : 'application/json' });
  if (!shared && account?.token) headers.set('Authorization', `Bearer ${account.token}`);
  if (body && !(body instanceof FormData)) headers.set('Content-Type', 'application/json');
  try {
    if (shared && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) headers.set('X-CSRF-Token', getCsrfToken() || await refreshCsrfToken());
    const response = await fetch(`${shared ? '/api/native/family' : '/api/family'}${path}`, { method, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, headers, credentials: shared ? 'include' : 'omit', signal: controller.signal });
    if (!response.ok) {
      if (response.status === 401 && shared && requestEpoch === epoch && !controller.signal.aborted) window.dispatchEvent(new CustomEvent('growthtrack:auth-expired'));
      if (response.status === 401 && account && connection === account) resetFamilyConnection(account.owner);
      const data = await response.json().catch(() => ({}));
      const fallback = response.status === 404 ? 'This Family feature is missing from the running API. Start the latest Family build and retry.' : response.status === 429 ? 'Too many Family requests. Wait a moment before retrying.' : 'The Family service could not complete this request.';
      throw new FamilyError(typeof data.error === 'string' ? data.error : fallback, response.status);
    }
    return blob ? response.blob() : response.json();
  } catch (error) {
    if (error instanceof FamilyError) throw error;
    throw new FamilyError(error.name === 'AbortError' ? signal?.aborted ? 'Request cancelled.' : 'The Family request timed out. Review before retrying a change.' : 'The Family service is unavailable. Retry when connected.');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}

export const canEditFamily = role => ['admin', 'editor', 'family_head'].includes(role);
