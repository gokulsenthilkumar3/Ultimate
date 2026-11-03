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

export { metricToClient } from './metricPayload.js';
