/** Compatibility for former companion entry URLs. API/assets and customer apps keep their owners. */
export function nativeEntryDestination(pathname) {
  const path = pathname.replace(/\/+$/, '');
  const entries = {
    '/Ultimate/products/equity': '/finance/equity',
    '/Ultimate/products/equity/auth': '/finance/equity',
    '/Ultimate/products/forex': '/insights/forex',
    '/Ultimate/products/family': '/life/family',
    '/Ultimate/products/family/dashboard': '/life/family',
    '/Ultimate/products/family/tree': '/life/family?view=tree',
    '/Ultimate/products/family/members': '/life/family?view=people',
    '/Ultimate/products/family/timeline': '/life/family?view=timeline',
    '/Ultimate/products/family/events': '/life/family?view=timeline',
    '/Ultimate/products/family/media': '/life/family?view=memories',
    '/Ultimate/products/family/settings': '/life/family?view=access',
    '/Ultimate/products/family/auth': '/life/family',
  };
  return entries[path] ? `/Ultimate${entries[path]}` : null;
}
