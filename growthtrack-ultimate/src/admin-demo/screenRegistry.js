// Route ownership stays separate from the implementation of each product view.
export const screenLoaders = Object.freeze({
  overview: () => import('./screens/OverviewScreen'),
  customers: () => import('./screens/CustomerScreen'),
  markets: () => import('./screens/MarketsScreen'),
  family: () => import('./screens/FamilyScreen'),
  growth: () => import('./screens/GrowthScreen'),
  physique: () => import('./screens/PhysiqueScreen'),
  finance: () => import('./screens/FinanceScreen'),
  work: () => import('./screens/WorkScreen'),
  calendar: () => import('./screens/CalendarScreen'),
  life: () => import('./screens/LifeScreen'),
  insights: () => import('./screens/InsightsScreen'),
  system: () => import('./screens/SystemScreen'),
  public: () => import('./screens/PublicScreen'),
});

export function resolveScreenKey(page) {
  if (page.area === 'public') return 'public';
  if (page.id === 'overview') return 'overview';
  if (page.area === 'customers') return 'customers';
  if (['equity', 'forex'].includes(page.id)) return 'markets';
  if (page.id === 'family') return 'family';
  if (page.id === 'physique') return 'physique';
  if (page.area === 'wellness') return 'growth';
  if (page.area === 'finance') return 'finance';
  if (page.id === 'calendar') return 'calendar';
  if (page.area === 'workspace' || page.id === 'actions') return 'work';
  if (page.area === 'life') return 'life';
  if (page.area === 'insights') return 'insights';
  return 'system';
}
