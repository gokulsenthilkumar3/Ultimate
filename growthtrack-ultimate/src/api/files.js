import { apiClient, apiRequest, ApiError } from '../lib/apiClient';

export const listFiles = () => apiRequest('/api/files');
export const deleteFile = (id, expectedUpdatedAt) => apiRequest(`/api/files/${encodeURIComponent(id)}`, {
  method: 'DELETE', body: JSON.stringify({ expectedUpdatedAt }),
});
export const connectFileProvider = provider => apiRequest(`/api/files/providers/${encodeURIComponent(provider)}/connect`, { method: 'POST', body: '{}' });

export function uploadFile(file) {
  const body = new FormData();
  body.append('file', file);
  body.append('visibility', 'private');
  return apiRequest('/api/files', { method: 'POST', body, timeoutMs: 60_000 });
}

async function readFileResponse(id, action, signal) {
  const path = `/api/files/${encodeURIComponent(id)}/${action}`;
  const response = await fetch(`${apiClient.baseUrl}${path}`, { credentials: 'include', cache: 'no-store', signal });
  if (response.status === 401) window.dispatchEvent(new CustomEvent('growthtrack:auth-expired'));
  if (!response.ok) {
    let payload = {};
    try { payload = await response.json(); } catch { /* The status remains authoritative. */ }
    throw new ApiError(payload.error || 'Unable to open this file.', { status: response.status, payload, path });
  }
  return response;
}

export async function downloadFile(file) {
  const response = await readFileResponse(file.id, 'download');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name || 'file';
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function previewFile(file, signal) {
  const response = await readFileResponse(file.id, 'preview', signal);
  const contentType = response.headers.get('content-type')?.split(';')[0];
  if (contentType === 'application/json') {
    const result = await response.json();
    if (result.kind !== 'text' || typeof result.text !== 'string') throw new Error('Preview is unavailable.');
    return result;
  }
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(contentType)) throw new Error('Preview format is unsupported.');
  return { kind: 'image', url: URL.createObjectURL(await response.blob()) };
}
