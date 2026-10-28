export function statusTone(value) {
  const status = String(value).trim().toLowerCase();
  if (['active', 'done', 'ready', 'complete', 'completed', 'connected', 'healthy', 'logged', 'recorded', 'received', 'paid'].includes(status)) return 'green';
  return /review|in progress|pending/.test(status) ? 'amber' : 'neutral';
}
