/** A profile-local calendar date, without importing finance schemas or charts. */
export function userDateKey(user: { timezone?: string; timeZone?: string } = {}, now = new Date()): string {
  const timeZone = user.timezone || user.timeZone;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', ...(timeZone ? { timeZone } : {}) }).formatToParts(now);
    const value = (part: string) => parts.find(item => item.type === part)?.value || '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  } catch {
    return userDateKey({}, now);
  }
}
