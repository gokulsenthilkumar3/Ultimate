export function createFocusSession() { return { durationSeconds: 1500, remainingSeconds: 1500, deadline: null, startedAt: null, completedAt: null, runId: null, project: 'Unassigned' }; }
export function focusRemaining(session, now) {
  return session.deadline === null ? session.remainingSeconds : Math.max(0, Math.ceil((session.deadline - now) / 1000));
}
export function toggleFocus(session, now) {
  if (session.completedAt) session = { ...createFocusSession(), project: session.project };
  const remaining = focusRemaining(session, now);
  if (session.deadline !== null && remaining > 0) return { ...session, remainingSeconds: remaining, deadline: null };
  const duration = remaining || session.durationSeconds;
  return { ...session, remainingSeconds: duration, deadline: now + duration * 1000, startedAt: session.startedAt ?? now };
}
export const SAMPLE_FOCUS_HISTORY = Object.freeze([
  { id: 'focus-sample-1', title: 'Planning the week', project: 'Work', date: '2026-10-28', startedAt: '2026-10-28T08:00:00Z', endedAt: '2026-10-28T08:25:00Z', durationSeconds: 1500 },
  { id: 'focus-sample-2', title: 'Learning time', project: 'GrowthTrack', date: '2026-10-28', startedAt: '2026-10-28T09:00:00Z', endedAt: '2026-10-28T09:45:00Z', durationSeconds: 2700 },
  { id: 'focus-sample-3', title: 'Focused project work', project: 'Work', date: '2026-10-27', startedAt: '2026-10-27T08:00:00Z', endedAt: '2026-10-27T09:20:00Z', durationSeconds: 4800 },
]);
export function focusRecord(session, endedAt) {
  const durationSeconds = session.durationSeconds - focusRemaining(session, endedAt);
  if (!session.runId || durationSeconds <= 0) return null;
  return { id: session.runId, title: 'Local focus session', project: session.project || 'Unassigned', date: new Date(endedAt).toISOString().slice(0, 10), startedAt: new Date(session.startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), durationSeconds };
}
export function durationText(seconds) {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remaining = Math.floor(seconds % 60);
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '', remaining ? `${remaining}s` : ''].filter(Boolean).join(' ') || '0m';
}
