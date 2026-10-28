const working = new Set(['customers', 'finsync', 'oxfin', 'finance', 'transactions', 'budgeting', 'subscriptions', 'shopping', 'portfolio', 'sip', 'physique', 'calendar', 'notes', 'tasks', 'workspace', 'goals', 'family', 'timesheet', 'notifications', 'logs', 'actions']);
const setup = new Set(['financeSync', 'healthSync', 'ai', 'databases']);
export function screenScope(page, view = '', state = 'populated') {
  const connection = setup.has(page.id) || page.id === 'current' || page.id === 'calendar' && view === 'connections' || page.id === 'projects' && view === 'github' || page.id === 'documents' && view === 'providers' || page.id === 'profile' && ['security', 'integrations'].includes(view) || page.id === 'entertainment' && view === 'sync' || page.id === 'social' && view === 'connections';
  const mode = connection ? 'setup' : working.has(page.id) || page.id === 'profile' && view === 'appearance' ? 'demo' : 'preview';
  const provenance = state === 'unavailable' ? 'Unavailable' : state === 'denied' ? 'Access preview' : mode === 'setup' ? 'Not connected' : mode === 'preview' ? 'Illustrative' : 'Sample';
  return { mode, label: mode.toUpperCase(), provenance, description: mode === 'setup' ? 'Connection is not established' : mode === 'preview' ? 'Layout concept with illustrative content' : 'Fictional data and local demo interactions', detail: ['physique', 'maps'].includes(page.id) ? 'Schematic' : mode === 'setup' ? 'Not connected' : mode === 'preview' ? 'Concept' : 'Sample data' };
}
