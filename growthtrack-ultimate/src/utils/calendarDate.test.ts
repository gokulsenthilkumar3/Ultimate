import { expect, it } from 'vitest';
import { userDateKey } from './calendarDate';
import { financeToday } from './financeModel';

it('keeps the shell and finance on the same profile-local date across UTC midnight', () => {
  const now = new Date('2026-10-28T20:00:00.000Z');
  expect(userDateKey({ timezone: 'Asia/Kolkata' }, now)).toBe('2026-10-29');
  expect(userDateKey({ timeZone: 'America/Los_Angeles' }, now)).toBe('2026-10-28');
  expect(financeToday({ timezone: 'Asia/Kolkata' }, now)).toBe(userDateKey({ timezone: 'Asia/Kolkata' }, now));
});

it('falls back to the browser date for an invalid saved timezone', () => {
  const now = new Date('2026-10-28T20:00:00.000Z');
  expect(userDateKey({ timezone: 'Invalid/Timezone' }, now)).toBe(userDateKey({}, now));
});
