export type ProductArea = 'finance' | 'insights' | 'wellness' | 'workspace' | 'life' | 'hub';
export type PageTemplate = 'command' | 'record' | 'analytics' | 'detail' | 'settings' | 'immersive';
export type Availability = 'ready' | 'setup-required';

export interface FeatureDefinition {
  readonly id: string;
  readonly area: ProductArea;
  readonly module: string;
  readonly label: string;
  readonly canonicalPath: string;
  readonly aliases: readonly string[];
  readonly views: readonly string[];
  readonly template: PageTemplate;
  readonly capabilities: readonly string[];
  readonly availability: Availability;
}

function feature(id: string, area: ProductArea, module: string, label: string, template: PageTemplate = 'record', views: readonly string[] = [], aliases: readonly string[] = [], availability: Availability = 'ready'): FeatureDefinition {
  return Object.freeze({ id, area, module, label, template, views: Object.freeze([...views]), aliases: Object.freeze([...aliases]), canonicalPath: `/${area}/${module}`, capabilities: Object.freeze([]), availability });
}

// Routes, launchers and navigation consume this inventory. IDs retain saved navigation preferences.
export const FEATURES: readonly FeatureDefinition[] = Object.freeze([
  feature('finance', 'finance', 'overview', 'Overview', 'command'),
  feature('transactions', 'finance', 'transactions', 'Transactions', 'record', ['all', 'income', 'expenses']),
  feature('financeAnalytics', 'finance', 'analytics', 'Analytics', 'analytics', ['categories', 'income', 'comparisons']),
  feature('financeTrends', 'finance', 'trends', 'Trends', 'analytics', ['monthly', 'recurring']),
  feature('budgeting', 'finance', 'budgeting', 'Budgeting', 'record', ['current', 'history']),
  feature('subscriptions', 'finance', 'subscriptions', 'Subscriptions', 'record', ['active', 'upcoming', 'archived']),
  feature('portfolio', 'finance', 'portfolio', 'Portfolio', 'record', ['holdings', 'allocation', 'history']),
  feature('sip', 'finance', 'sip', 'SIP Calculator', 'analytics', ['inputs', 'projection', 'comparison'], ['planning', 'sip-calculator']),
  feature('shopping', 'finance', 'shopping', 'Shopping', 'record', ['lists', 'planned', 'purchased']),
  feature('financeSync', 'finance', 'sync', 'Sync', 'settings', ['accounts', 'csv', 'history']),
  feature('overview', 'insights', 'overview', 'Overview', 'command', ['today', 'priorities', 'summary'], ['insights']),
  feature('actions', 'insights', 'actions', 'Action Center', 'record', ['today', 'upcoming', 'snoozed', 'dismissed'], ['action-center']),
  feature('current', 'insights', 'current', 'Current', 'command', ['weather', 'news', 'local']),
  feature('analytics', 'insights', 'analytics', 'Analytics', 'analytics', ['trends', 'correlations', 'comparisons']),
  feature('dashboards', 'insights', 'dashboards', 'Dashboards', 'analytics', ['saved', 'arrange']),
  feature('progress', 'insights', 'progress', 'Progress', 'analytics', ['timeline', 'comparisons', 'milestones']),
  feature('forecast', 'insights', 'forecast', 'Forecast', 'analytics', ['trends', 'scenarios']),
  feature('wellness', 'wellness', 'overview', 'Overview', 'command', [], ['wellnessCommand']),
  feature('sleep', 'wellness', 'sleep', 'Sleep', 'record', ['log', 'trends', 'history']),
  feature('lifestyle', 'wellness', 'lifestyle', 'Lifestyle', 'record', ['routines', 'preferences', 'history']),
  feature('mind', 'wellness', 'mind', 'Mind & Wellness', 'record', ['checkin', 'trends', 'journal', 'breathe']),
  feature('medical', 'wellness', 'medical', 'Medical', 'record', ['vitals', 'medications', 'records', 'timeline']),
  feature('health', 'wellness', 'health', 'Health+', 'record', ['senses', 'lifestyle', 'specialized', 'recovery']),
  feature('habits', 'wellness', 'habits', 'Habits', 'record', ['today', 'matrix', 'history']),
  feature('physique', 'wellness', 'physique', 'Physique', 'record', ['blueprint', 'measurements', 'targets', 'history', '3d'], ['humanoid']),
  feature('assessment', 'wellness', 'assessment', 'Assessment', 'record', ['questionnaire', 'results', 'history']),
  feature('training', 'wellness', 'training', 'Training', 'record', ['schedule', 'logger', 'prs', 'overload', 'volume', 'sessions']),
  feature('strength', 'wellness', 'strength', 'Strength', 'analytics', ['log', 'progression', '1rm', 'fatigue', 'volume']),
  feature('nutrition', 'wellness', 'nutrition', 'Nutrition', 'record', ['daily', 'history', 'targets', 'calculator']),
  feature('hydration', 'wellness', 'hydration', 'Hydration', 'record', ['today', 'history', 'targets']),
  feature('healthSync', 'wellness', 'sync', 'Health Sync', 'settings', ['devices', 'imports', 'history'], [], 'setup-required'),
  feature('workspace', 'workspace', 'overview', 'Overview', 'command'),
  feature('calendar', 'workspace', 'calendar', 'Calendar', 'record', ['month', 'week', 'agenda', 'connections']),
  feature('documents', 'workspace', 'files', 'My Files', 'record', ['vault', 'providers', 'recent'], ['files']),
  feature('notes', 'workspace', 'notes', 'Notes', 'record', ['all', 'pinned', 'tags', 'editor']),
  feature('tasks', 'workspace', 'tasks', 'Tasks', 'record', ['today', 'upcoming', 'all', 'completed', 'list', 'board']),
  feature('projects', 'workspace', 'projects', 'Projects', 'record', ['github', 'mine', 'grid', 'list']),
  feature('timesheet', 'workspace', 'timesheet', 'Timesheet', 'record', ['timer', 'sessions', 'analytics']),
  feature('skills', 'workspace', 'skills', 'Skills', 'record', ['tree', 'list', 'radar', 'history']),
  feature('goals', 'workspace', 'goals', 'Goals', 'record', ['active', 'completed', 'archived']),
  feature('life', 'life', 'overview', 'Overview', 'command'),
  feature('social', 'life', 'social', 'Social', 'analytics', ['profiles', 'analytics', 'connections']),
  feature('entertainment', 'life', 'entertainment', 'Entertainment', 'record', ['library', 'stats', 'sync']),
  feature('maps', 'life', 'places', 'Maps & Places', 'record', ['map', 'list', 'timeline', 'privacy'], ['places']),
  feature('hub', 'hub', 'overview', 'Overview', 'command'),
  feature('apps', 'hub', 'apps', 'Apps', 'record', ['modules', 'favorites', 'external']),
  feature('ai', 'hub', 'agents', 'Agents', 'record', ['chat', 'history', 'context', 'settings'], ['agents']),
  feature('databases', 'hub', 'databases', 'Databases', 'record', ['custom', 'application', 'imports']),
  feature('profile', 'hub', 'settings', 'Profile & Settings', 'settings', ['personal', 'physical', 'security', 'appearance', 'integrations'], ['settings']),
  feature('notifications', 'hub', 'notifications', 'Notifications', 'record', ['unread', 'all', 'preferences']),
  feature('help', 'hub', 'help', 'Helpdesk', 'record', ['guides', 'troubleshooting', 'diagnostics']),
  feature('logs', 'hub', 'logs', 'Logs', 'record', ['activity', 'authentication', 'sync']),
  feature('about', 'hub', 'about', 'About', 'detail', ['version', 'capabilities', 'licenses']),
  feature('pricing', 'hub', 'plans', 'Plans', 'settings', ['capabilities', 'billing'], ['plans']),
]);

export const FEATURE_BY_ID = Object.freeze(Object.fromEntries(FEATURES.flatMap(item => [[item.id, item], ...item.aliases.map(alias => [alias, item])])) as Record<string, FeatureDefinition>);
const BY_PATH = Object.fromEntries(FEATURES.map(item => [item.canonicalPath, item]));
export const AREA_ORDER: readonly ProductArea[] = Object.freeze(['finance', 'insights', 'wellness', 'workspace', 'life', 'hub']);

export function featurePath(id: string, view?: string): string {
  const item = FEATURE_BY_ID[id];
  if (!item) return '/finance/overview';
  return item.canonicalPath + (view && item.views.includes(view) ? `?view=${encodeURIComponent(view)}` : '');
}

export interface ResolvedFeatureRoute { feature: FeatureDefinition | null; view: string | null; redirect: string | null }
export function resolveFeatureRoute(pathname: string, search = '', hash = ''): ResolvedFeatureRoute {
  const path = `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  const query = new URLSearchParams(search);
  let consumedFragment = false;
  let fragment = '';
  try { fragment = decodeURIComponent(hash.replace(/^#/, '')).toLowerCase(); } catch { /* malformed legacy fragments are ignored */ }
  let item: FeatureDefinition | undefined = BY_PATH[path];
  const areaRoot = AREA_ORDER.includes(path.slice(1) as ProductArea);
  if (!item && areaRoot) {
    const area = path.slice(1);
    item = FEATURES.find(entry => entry.area === area && (entry.module === fragment || entry.id === fragment || entry.aliases.includes(fragment))) || FEATURES.find(entry => entry.area === area && entry.module === 'overview');
    consumedFragment = Boolean(fragment && item && (item.module === fragment || item.id === fragment || item.aliases.includes(fragment)));
    if (area === 'finance' && fragment === 'planning') item = FEATURE_BY_ID.sip;
  }
  if (!item) item = FEATURE_BY_ID[path.slice(1)];
  // Old quick links were emitted as /overview#portfolio, /finance#shopping, etc.
  if (item && ['portfolio', 'sip', 'shopping'].includes(fragment) && !item.views.includes(fragment)) { item = FEATURE_BY_ID[fragment]; consumedFragment = true; }
  if (!item) return { feature: null, view: null, redirect: null };
  if (path === '/humanoid' && !query.has('view')) query.set('view', '3d');
  if (item.views.includes(fragment)) { consumedFragment = true; if (!query.has('view')) query.set('view', fragment); }
  if (fragment === 'planning' && item.id === 'sip') consumedFragment = true;
  const requested = query.get('view');
  if (requested && !item.views.includes(requested)) query.delete('view');
  const nextSearch = query.toString();
  const remainingHash = consumedFragment ? '' : hash;
  const destination = item.canonicalPath + (nextSearch ? `?${nextSearch}` : '') + remainingHash;
  return { feature: item, view: query.get('view'), redirect: pathname !== item.canonicalPath || remainingHash !== hash || nextSearch !== search.replace(/^\?/, '') ? destination : null };
}

// Only local router destinations may be restored after login; retain filters and view selections.
export function safeReturnDestination(from: unknown, fallback = '/finance/overview'): string {
  if (!from || typeof from !== 'object') return fallback;
  const location = from as { pathname?: unknown; search?: unknown; hash?: unknown };
  if (typeof location.pathname !== 'string' || !location.pathname.startsWith('/') || location.pathname.startsWith('//') || location.pathname.includes('\\') || location.pathname === '/login') return fallback;
  return location.pathname + (typeof location.search === 'string' && location.search.startsWith('?') ? location.search : '') + (typeof location.hash === 'string' && location.hash.startsWith('#') ? location.hash : '');
}
