import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function decodeHashTab(hash = '') {
  try {
    return decodeURIComponent(String(hash).replace(/^#/, '')).toLowerCase();
  } catch {
    return '';
  }
}

export default function useHashTab(tabIds, initialTab) {
  const location = useLocation();
  const navigate = useNavigate();
  const allowed = useMemo(() => new Set(tabIds), [tabIds]);
  const fallback = allowed.has(initialTab) ? initialTab : tabIds[0];
  const requested = new URLSearchParams(location.search).get('view') || decodeHashTab(location.hash);
  const tab = allowed.has(requested) ? requested : fallback;

  const selectTab = useCallback((nextTab, options = {}) => {
    if (!allowed.has(nextTab)) return;
    const query = new URLSearchParams(location.search);
    query.set('view', nextTab);
    navigate({
      pathname: location.pathname,
      search: `?${query.toString()}`,
      hash: '',
    }, { replace: Boolean(options.replace) });
  }, [allowed, location.pathname, location.search, navigate]);

  return [tab, selectTab];
}

export function handleTabKeyDown(event, { tabs, activeTab, selectTab, idPrefix }) {
  const currentIndex = Math.max(0, tabs.findIndex(item => item.id === activeTab));
  let nextIndex = null;

  const direction = document.documentElement.dir === 'rtl' ? -1 : 1;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
  if (event.key === 'ArrowLeft') nextIndex = (currentIndex - direction + tabs.length) % tabs.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tabs.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  const nextTab = tabs[nextIndex].id;
  selectTab(nextTab);
  window.requestAnimationFrame(() => document.getElementById(`${idPrefix}-${nextTab}`)?.focus());
}
