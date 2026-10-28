import { ACTIVITY } from '../fixtures';
export const SAMPLE_NOTIFICATIONS = Object.freeze(ACTIVITY.map((entry, index) => ({ ...entry, id: `notification-${index + 1}`, read: index > 1 })));
export const SAMPLE_LOGS = Object.freeze({
  activity: [
    { id: 'ACT-001', title: 'Sample profile opened', actor: 'Sample administrator', product: 'FinSync', target: 'FS-1048', time: '2026-10-28 08:00 UTC', result: 'Read-only preview' },
    { id: 'ACT-002', title: 'Sample note recorded locally', actor: 'Sample administrator', product: 'OxFin', target: 'OX-2081', time: '2026-10-28 08:10 UTC', result: 'Session only' },
  ],
  authentication: [
    { id: 'AUTH-001', title: 'Sign-in result layout', account: 'owner@example.test', method: 'Sample account', scope: 'Demo workspace', time: '2026-10-28 08:00 UTC', result: 'No session created' },
  ],
  sync: [
    { id: 'SYNC-001', title: 'Calendar connection', source: 'Calendar provider', direction: 'Import', time: 'Not attempted', result: 'Not connected' },
    { id: 'SYNC-002', title: 'Financial account connection', source: 'Account provider', direction: 'Import', time: 'Not attempted', result: 'Not connected' },
  ],
});
