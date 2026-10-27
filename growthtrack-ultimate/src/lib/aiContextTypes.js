// Required domains are shared by the browser selector and the API boundary.
// null means a record's category may make otherwise ordinary data sensitive.
export const AI_CONTEXT_DOMAINS = Object.freeze({
  tasks: null, goals: null, habits: null, notes: null, projects: null, calendar: null, timesheets: null, skills: null, files: null, entertainment: null,
  metrics: 'wellness', sleep: 'wellness', nutrition: 'wellness', workouts: 'wellness', moods: 'wellness', vitals: 'wellness', medications: 'wellness',
  transactions: 'finance', budgets: 'finance', subscriptions: 'finance', holdings: 'finance', shopping: 'finance', journal: 'journal',
  workspace_summary: 'workspace', wellness_summary: 'wellness', finance_summary: 'finance', journal_summary: 'journal',
});
