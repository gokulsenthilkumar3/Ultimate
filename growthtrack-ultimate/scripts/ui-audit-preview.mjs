// Isolated UI review fixture. Never connects to the application database.
// Run: node scripts/ui-audit-preview.mjs (loopback only, port 5099).
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

export function createAuditState(empty = false) {
  const date = (offset = 0) => {
    const day = new Date(); day.setDate(day.getDate() + offset);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  };
  return {
    user: { id: 'ui-review', name: 'Alex Morgan', email: 'review@example.test', gender: 'M', height: 178, weight: 76, bodyFat: 18, age: 30 },
    preference: { onboardingComplete: true, theme: 'dark', palette: 'gold', reducedMotion: true },
    bodyProfile: { height: 178, weight: 76, bodyFat: 18, chest: 99, waist: 84, shoulders: 116, arms: 34, thighs: 55, calves: 37, neck: 37, hips: 98 },
    tasks: empty ? [] : [{ id: 'review-task', title: 'Plan next week', priority: 'high', status: 'todo', due_date: date(), done: false }],
    habits: empty ? [] : [{ id: 'review-habit', name: 'Evening walk', color: '#a78bfa', frequency: 'daily' }],
    goals: empty ? [] : [{ id: 'review-goal', title: 'Read twelve books', target_value: 12, current_value: 4, status: 'active' }],
    metric_logs: empty ? [] : Array.from({ length: 12 }, (_, i) => ({ id: `metric-${i}`, date: date(-i * 3), weight: 76 + i * .2, water: i === 0 ? 0 : 1.5 + (i % 3) * .3, sleep: 6.5 + (i % 4) * .4, stamina: 60 + i, hr: 64 + i, mood: 6 + i % 4, energy: 5 + i % 5 })),
    sleep_logs: empty ? [] : Array.from({ length: 12 }, (_, i) => ({ id: `sleep-${i}`, date: date(-i * 3), duration: 6.5 + (i % 4) * .4, quality: 4 })),
    finance: [], budgets: [], shopping: [], entertainment: [], timesheet: [], notes: [], documents: [], subscriptions: [], nutrition_logs: [], moodLogs: [], vitalsLogs: [], medications: [], workout_sessions: [], databases: [], socialProfiles: [], config: {}, healthProfile: {},
  };
}

export function auditApi(req, res, next) {
  if (!req.url?.startsWith('/api/')) return next();
  const path = req.url.split('?')[0];
  const state = createAuditState(req.headers.cookie?.includes('audit-empty=1'));
  let data = [];
  if (path === '/api/auth/me') data = { user: state.user, expiresAt: '2099-01-01T00:00:00Z' };
  else if (path === '/api/auth/csrf') data = { csrfToken: 'isolated-ui-review' };
  else if (path === '/api/state') data = state;
  else if (path === '/api/health') data = { status: 'ok' };
  else if (path === '/api/config') data = {};
  else if (path.includes('logs') || path.includes('events')) data = [];
  else if (req.method !== 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'review-only', success: true }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/ui-audit-preview.mjs')) {
  const server = await createServer({
    configFile: false, base: '/Ultimate/',
    plugins: [{ name: 'isolated-audit-api', configureServer(server) { server.middlewares.use(auditApi); } }, react()],
    define: { 'import.meta.env.VITE_API_URL': '""', 'import.meta.env.VITE_API_BASE': '""', 'import.meta.env.VITE_SENTRY_DSN': '""', 'import.meta.env.VITE_MIXPANEL_TOKEN': '""' },
    server: { host: '127.0.0.1', port: 5099, strictPort: true },
  });
  await server.listen();
  server.printUrls();
}
