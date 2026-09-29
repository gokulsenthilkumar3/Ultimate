import { test as base, expect } from '@playwright/test';

export const OWNER = { id: 'isolated-test-owner', name: 'Test owner', email: 'owner@example.test', tasks: { pending: [], completed: [] }, timezone: 'Asia/Kolkata', calendar_events: [], projects: [], skills: [], portfolio: [] };
export function emptyState() {
  return {
    user: { ...OWNER }, preference: { theme: 'system', palette: 'gold', density: 'comfortable', onboardingComplete: true },
    tasks: [], finance: [], budgets: [], shopping: [], entertainment: [], timesheet: [], sleep_logs: [], nutrition_logs: [], notes: [], goals: [], documents: [], habits: [], subscriptions: [], metric_logs: [], moodLogs: [], vitalsLogs: [], medications: [], workout_sessions: [], socialProfiles: [], config: {}, databases: [],
  };
}
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem('growthtrack-analytics-consent', 'denied'));
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown;
      if (path === '/api/auth/me') data = { user: OWNER, expiresAt: '2099-01-01T00:00:00.000Z' };
      else if (/csrf/.test(path)) data = { csrfToken: 'isolated-test-csrf' };
      else if (path === '/api/state') data = emptyState();
      else if (path === '/api/preferences') data = { id: 'isolated-preference', userId: OWNER.id, ...emptyState().preference, ...(route.request().postDataJSON() || {}) };
      else if (path === '/api/health') data = { status: 'ok' };
      else if (path === '/api/capabilities') data = { version: 'test', billing: { checkoutAvailable: false, tier: null }, connections: [] };
      else if (path === '/api/agents/readiness') data = { ready: false, code: 'setup_required', models: [] };
      else if (['/api/notifications', '/api/locations', '/api/documents', '/api/notes', '/api/goals', '/api/tasks', '/api/timesheet', '/api/finance', '/api/subscriptions', '/api/budgets', '/api/integrations/providers', '/api/custom-tables', '/api/database/tables', '/api/portfolio'].includes(path)) data = [];
      else if (route.request().method() !== 'GET' && path === '/api/logs') data = { success: true };
      else { await route.fulfill({ status: 503, json: { code: 'TEST_SERVICE_UNAVAILABLE', error: 'Optional service is unavailable in this isolated fixture.' } }); return; }
      await route.fulfill({ json: data });
    });
    await use(page);
  },
});
export { expect };
