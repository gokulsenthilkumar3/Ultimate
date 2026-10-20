// Plain-language summaries for sync runs, shared by the Sync Center and module headers.
export function relativeTime(value, now = Date.now()) {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return 'never';
  const minutes = Math.round((now - time) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function describeRun(run) {
  if (!run) return 'Not synced yet';
  if (run.status === 'failed') return run.message || 'The last sync failed.';
  const summary = run.summary || {};
  if ('events' in summary) {
    const changes = [summary.added && `${summary.added} new`, summary.updated && `${summary.updated} changed`, summary.removed && `${summary.removed} removed`].filter(Boolean);
    return `${summary.events} event${summary.events === 1 ? '' : 's'} mirrored${changes.length ? ` (${changes.join(', ')})` : ''}${summary.skipped ? ` · ${summary.skipped} skipped` : ''}`;
  }
  return `${summary.matched || 0} holding${summary.matched === 1 ? '' : 's'} priced${summary.updated ? ` · ${summary.updated} updated` : ''}${summary.unmatched ? ` · ${summary.unmatched} need details` : ''}`;
}
