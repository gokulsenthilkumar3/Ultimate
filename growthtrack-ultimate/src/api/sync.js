import { apiRequest } from '../lib/apiClient';
import useStore from '../store/useStore';

const base = '/api/v1/sync';
const json = (method, body) => ({ method, body: JSON.stringify(body ?? {}), timeoutMs: 60_000 });

export const listConnectors = () => apiRequest(`${base}/connectors`);
export const saveConnection = (key, body) => apiRequest(`${base}/connections/${encodeURIComponent(key)}`, json('PUT', body));
export const runConnection = key => apiRequest(`${base}/connections/${encodeURIComponent(key)}/run`, json('POST'));
export const runSyncTarget = target => apiRequest(`${base}/run`, json('POST', { target }));
export const disconnectConnection = (key, { removeData = false } = {}) =>
  apiRequest(`${base}/connections/${encodeURIComponent(key)}?removeData=${removeData ? 'true' : 'false'}`, { method: 'DELETE' });

/** Publish records returned by a sync into the store, but only for the owner
    whose session started the request. */
export function publishSyncData(data, ownerId) {
  if (!data) return;
  const patch = {};
  if (Array.isArray(data.portfolio)) patch.portfolio = data.portfolio;
  if (Array.isArray(data.calendar_events)) patch.calendar_events = data.calendar_events;
  if (!Object.keys(patch).length) return;
  useStore.setState(state => (state.user?.id ?? null) !== ownerId ? state : ({ ...patch, user: state.user ? { ...state.user, ...patch } : state.user }));
}
