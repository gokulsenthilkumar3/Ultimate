import { FEATURES as featureCatalog } from './featureCatalog.js';

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

export const FEATURES = featureCatalog as readonly FeatureDefinition[];

export const FEATURE_BY_ID = Object.freeze(Object.fromEntries(FEATURES.flatMap(item => [[item.id, item], ...item.aliases.map(alias => [alias, item])])) as Record<string, FeatureDefinition>);
// Shell routing needs domain names without downloading navigation artwork.
const AREA_GROUP = { finance: 'money', insights: 'insights', wellness: 'wellness', workspace: 'work', life: 'life', hub: 'system' };
export const FEATURE_GROUPS = Object.freeze(Object.fromEntries(FEATURES.map(item => [item.id,
  ['customers', 'finsync', 'oxfin'].includes(item.id) ? 'customers' : item.id === 'forex' ? 'money' : AREA_GROUP[item.area],
])) as Record<string, string>);
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
  if (!item && /^\/customers\/(finsync|oxfin)$/.test(path)) item = FEATURE_BY_ID[path.split('/').at(-1)!];
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
