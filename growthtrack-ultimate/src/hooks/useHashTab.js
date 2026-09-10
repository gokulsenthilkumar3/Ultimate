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
  const hashTab = decodeHashTab(location.hash);
  const tab = allowed.has(hashTab) ? hashTab : fallback;

  const selectTab = useCallback((nextTab, options = {}) => {
    if (!allowed.has(nextTab)) return;
    navigate({
      pathname: location.pathname,
      search: location.search,
      hash: `#${nextTab}`,
    }, { replace: Boolean(options.replace) });
  }, [allowed, location.pathname, location.search, navigate]);

  return [tab, selectTab];
}

export function handleTabKeyDown(event, { tabs, activeTab, selectTab, idPrefix }) {
  const currentIndex = Math.max(0, tabs.findIndex(item => item.id === activeTab));
  let nextIndex = null;

  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tabs.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  const nextTab = tabs[nextIndex].id;
  selectTab(nextTab);
  window.requestAnimationFrame(() => document.getElementById(`${idPrefix}-${nextTab}`)?.focus());
}
