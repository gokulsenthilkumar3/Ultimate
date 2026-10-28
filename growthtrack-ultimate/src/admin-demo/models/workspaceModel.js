import { AREA_NAMES } from '../catalog';
import { validateEntry } from './entryModel';

export { REVIEW_VERSION } from './reviewModel';

const ACTIONS = {
  overview: ['task', 'Quick add'], tasks: ['task', 'New sample task'], actions: ['task', 'New sample task'],
  workspace: ['task', 'New sample task'], notes: ['note', 'New note'], calendar: ['calendar event', 'Add sample event'],
  projects: ['project', 'New sample project'], goals: ['goal', 'New sample goal'], skills: ['skill', 'Add sample skill'],
  family: ['family member', 'Add sample member'], equity: ['alert', 'Create sample alert'], forex: ['alert', 'Create sample alert'],
  transactions: ['transaction', 'Add sample transaction'], budgeting: ['budget category', 'Add sample category'],
  subscriptions: ['subscription', 'Add sample subscription'], shopping: ['shopping item', 'Add sample item'],
};
export function primaryAction(page) {
  if (page.id === 'physique') return null;
  if (page.area === 'customers') return { type: 'customer', label: 'Add sample customer', product: page.id === 'finsync' ? 'FinSync' : page.id === 'oxfin' ? 'OxFin' : undefined };
  if (ACTIONS[page.id]) return { type: ACTIONS[page.id][0], label: ACTIONS[page.id][1] };
  if (page.area === 'wellness' && page.id !== 'healthSync') return { type: `${page.title.toLowerCase()} entry`, label: 'Add sample entry' };
  return null;
}
export function entryDestination(type, pageId) {
  return ({ task: 'tasks', note: 'notes', 'calendar event': 'calendar', 'family event': 'calendar', transaction: 'transactions', 'budget category': 'budgeting', subscription: 'subscriptions', 'shopping item': 'shopping', project: 'projects', goal: 'goals', skill: 'skills' })[type] || pageId;
}
export function recordsForPage(page, added) { return added[['workspace', 'actions', 'tasks'].includes(page.id) ? 'tasks' : ['finance', 'financeAnalytics', 'financeTrends'].includes(page.id) ? 'transactions' : page.id] || []; }
export function hasNativeEntries(page) { return ['tasks', 'workspace', 'actions', 'notes', 'calendar', 'goals', 'projects', 'skills', 'family', 'transactions', 'finance', 'financeAnalytics', 'financeTrends', 'budgeting', 'subscriptions', 'shopping'].includes(page.id); }
export function searchDemo(pages, customers, query, { tasks = [], notes = [] } = {}) {
  const term = query.trim().toLowerCase();
  return {
    pages: pages.filter(page => `${page.title} ${page.area} ${AREA_NAMES[page.area] || ''} ${page.views.join(' ')} ${(page.aliases || []).join(' ')}`.toLowerCase().includes(term)),
    tasks: term ? tasks.filter(task => `${task.title} ${task.context || ''}`.toLowerCase().includes(term)) : [],
    notes: term ? notes.filter(note => `${note.title} ${note.notes || ''}`.toLowerCase().includes(term)) : [],
    customers: term ? customers.filter(customer => `${customer.name} ${customer.email} ${customer.id}`.toLowerCase().includes(term)) : [],
  };
}
export function isNavActive(page, id) {
  return page.id === id || id === 'wellness' && page.area === 'wellness' || id === 'finance' && page.area === 'finance' && page.id !== 'equity';
}
export function validateNewRecord(values, customers, type) {
  if (!values.title?.trim()) return 'Enter a name or title before adding this record.';
  if (type !== 'customer') return validateEntry(type, values);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email?.trim() || '')) return 'Enter a valid sample email address.';
  if (!['FinSync', 'OxFin'].includes(values.product)) return 'Choose a supported customer product.';
  if (!['Starter', 'Plus', 'Premium'].includes(values.plan)) return 'Choose a supported sample plan.';
  if (customers.some(customer => customer.product === values.product && customer.email.toLowerCase() === values.email.trim().toLowerCase())) return 'This sample customer already exists for the selected product.';
  return '';
}
