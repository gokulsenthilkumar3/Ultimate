export function setupRequired(provider, message, extra = {}) {
  return (_req, res) => res.status(501).json({
    ...extra,
    code: 'CONNECTOR_SETUP_REQUIRED',
    status: 'setup_required',
    setupRequired: true,
    provider,
    error: message,
    message,
  });
}

// This handler deliberately has no database dependency.
export const appleHealthSetupRequired = setupRequired('apple_health',
  'Apple Health requires a native HealthKit bridge or a verified export import. Sync is not configured; no readings were changed.');

export function metricToClient(row) {
  if (!row) return row;
  let metadata = {};
  try { metadata = JSON.parse(row.data || '{}'); } catch { /* Preserve the reading even if metadata is malformed. */ }
  const result = { ...metadata, ...row, data: undefined };
  if (/^apple[ _-]?health$/i.test(String(row.source || '').trim())) {
    result.provenance = 'unverified';
    result.provenanceWarning = 'Legacy Apple Health reading: its origin has not been verified.';
  }
  return result;
}
