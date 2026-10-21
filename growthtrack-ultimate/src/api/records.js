import { apiRequest } from '../lib/apiClient';

// Versioned per-record writes for calendar events and holdings. Each write
// names the revision it was based on; a 409 carries the current record.
const mutationId = () => globalThis.crypto.randomUUID();
const send = (path, method, body) => apiRequest(path, { method, body: JSON.stringify(body) });

function recordsApi(base) {
  const item = id => `${base}/${encodeURIComponent(String(id))}`;
  return {
    create: (id, record) => send(base, 'POST', { id: String(id), mutationId: mutationId(), record }),
    update: (id, expectedRevision, record) => send(item(id), 'PUT', { mutationId: mutationId(), expectedRevision, record }),
    remove: (id, expectedRevision) => send(item(id), 'DELETE', { mutationId: mutationId(), expectedRevision }),
  };
}

export const calendarRecords = recordsApi('/api/v1/calendar/events');
export const holdingRecords = recordsApi('/api/v1/finance/holdings');

/** The server's current version of a record after a revision conflict. */
export function conflictRecord(error) {
  return error?.status === 409 && error?.payload?.current && typeof error.payload.current === 'object' ? error.payload.current : null;
}

export function recordWriteMessage(error, label) {
  const code = error?.payload?.code;
  if (conflictRecord(error)) return `This ${label} changed elsewhere (for example a price sync or another device). The latest version is now shown; apply your change again.`;
  if (code === 'READ_ONLY_RECORD') return `This ${label} is mirrored from a connected calendar. Change it in that calendar.`;
  if (code === 'RECORD_NOT_FOUND') return `This ${label} was removed elsewhere. Refresh to see the current list.`;
  return error?.payload?.error || error?.message || `The ${label} could not be saved.`;
}
