import { FEATURES } from '../config/featureRegistry.ts';

const names = {
  overview: 'Workspace overview', finance: 'Personal finance', wellness: 'GrowthTrack overview',
  workspace: 'Work overview', life: 'Life overview', hub: 'Administration overview',
  finsync: 'FinSync customers', oxfin: 'OxFin customers', equity: 'Equity', forex: 'Forex',
  ai: 'Optional assistants', companion: 'Connected products', apps: 'Workspace modules',
};
export const AREA_NAMES = {
  insights: 'Insights', finance: 'Finance & markets', wellness: 'GrowthTrack',
  workspace: 'Work', life: 'Family & life', hub: 'Administration', customers: 'Customer management', public: 'Public pages',
};
export const PAGES = Object.freeze([
  ...FEATURES.filter(page => page.id !== 'customers').map(page => ({
    ...page, title: names[page.id] || page.label,
    area: ['finsync', 'oxfin'].includes(page.id) ? 'customers' : page.area,
    views: page.id === 'finsync' || page.id === 'oxfin' ? ['customers', 'activity', 'support'] : [...page.views],
    path: page.id === 'finsync' || page.id === 'oxfin' ? `/customers/${page.id}` : page.canonicalPath,
  })),
  { id: 'customers', title: 'All customers', area: 'customers', views: ['customers', 'activity', 'support'], path: '/customers', template: 'record' },
  { id: 'welcome', title: 'Welcome', area: 'public', views: [], path: '/welcome', template: 'public' },
  { id: 'login', title: 'Sign in', area: 'public', views: [], path: '/login', template: 'public' },
  { id: 'privacy', title: 'Privacy', area: 'public', views: [], path: '/privacy', template: 'public' },
  { id: 'terms', title: 'Terms', area: 'public', views: [], path: '/terms', template: 'public' },
]);
export const PAGE_BY_ID = Object.fromEntries(PAGES.map(page => [page.id, page]));
export const DEFAULT_PAGE = PAGE_BY_ID.overview;
export const REVIEW_STATES = ['populated', 'empty', 'loading', 'error', 'denied', 'unavailable'];
export const REVIEW_DENSITIES = ['comfortable', 'compact'];
export const PAGE_VIEWS = Object.freeze(PAGES.flatMap(page => (page.views.length ? page.views : ['']).map(view => ({ page, view }))));

export function resolveDemoRoute(hash = '') {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const page = PAGES.find(item => item.path === path) || DEFAULT_PAGE;
  const candidate = new URLSearchParams(query).get('view');
  return { page, view: page.views.includes(candidate) ? candidate : page.views[0] || '' };
}
export function demoHref(id, view) {
  const page = PAGE_BY_ID[id] || DEFAULT_PAGE;
  return `#${page.path}${page.views.includes(view) ? `?view=${encodeURIComponent(view)}` : ''}`;
}
export function reviewKey(page, view, theme, state, viewport = '', density = 'comfortable') {
  return [page.id, view || 'default', theme, state, density, ...(viewport ? [viewport] : [])].join(':');
}
export function reviewTargets() {
  return PAGES.flatMap(page => (page.views.length ? page.views : ['']).flatMap(view =>
      ['light', 'dark'].flatMap(theme => REVIEW_STATES.flatMap(state => REVIEW_DENSITIES.map(density => ({
      page: page.id, view, theme, state, density, key: reviewKey(page, view, theme, state, '', density),
    }))))));
}
