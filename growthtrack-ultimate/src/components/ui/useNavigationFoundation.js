import { useMemo, useSyncExternalStore } from 'react';
import useStore from '../../store/useStore';
import { navigationGroups, normalizeGroupOrder, normalizeTabOrder, ROUTE_ALIASES, tabMeta } from '../../config/navigation';

const EMPTY_LIST = Object.freeze([]);
const EMPTY_ORDER = Object.freeze({});
const AREA_HOME = Object.freeze({ money: 'finance', insights: 'overview', wellness: 'wellness', work: 'workspace', life: 'life', system: 'hub' });

function subscribeViewport(listener) {
  if (typeof window === 'undefined') return () => {};
  // WebKit can report max-width:639 as true for a 640px innerWidth at DPR 2.
  // Numeric layout width is the shell contract; observe resize and media
  // changes so zoom and orientation are not missed.
  window.addEventListener('resize', listener);
  const queries = typeof window.matchMedia === 'function'
    ? [window.matchMedia('(max-width: 639px)'), window.matchMedia('(max-width: 1023px)')]
    : [];
  queries.forEach(query => query.addEventListener('change', listener));
  return () => { window.removeEventListener('resize', listener); queries.forEach(query => query.removeEventListener('change', listener)); };
}
function viewportMode() {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth || document.documentElement.clientWidth || 1024;
  return width < 640 ? 'mobile' : width < 1024 ? 'compact' : 'desktop';
}
export function useNavigationMode() {
  return useSyncExternalStore(subscribeViewport, viewportMode, () => 'desktop');
}

/** Read saved ordering without writing preferences during render/effects. */
export default function useNavigationFoundation(activeTab) {
  const configured = useStore(state => state.appConfig?.navigation?.groups) || EMPTY_LIST;
  const savedOrder = useStore(state => state.navigationOrder) || EMPTY_LIST;
  const savedTabs = useStore(state => state.navigationTabOrder) || EMPTY_ORDER;
  const groups = useMemo(() => navigationGroups(configured), [configured]);
  const order = useMemo(() => normalizeGroupOrder(savedOrder), [savedOrder]);
  const highlightedTab = ROUTE_ALIASES[activeTab] || activeTab;
  const activeGroup = tabMeta(highlightedTab).group || 'system';
  const areas = order.map(id => ({
    id, ...groups[id], home: AREA_HOME[id], path: tabMeta(AREA_HOME[id]).canonicalPath,
    tabs: normalizeTabOrder(savedTabs[id], groups[id]?.tabs || []),
  }));
  return { areas, activeGroup, highlightedTab, group: areas.find(area => area.id === activeGroup) || areas.at(-1) };
}
