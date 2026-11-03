import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationHandlers, notificationSettingsKey } from '../../../server/notifications/router.js';
import { migratedFixture } from './fixture.mjs';
import { createRecordServices } from '../../../server/domains/records.js';

function notificationFixture() {
  const settings = new Map();
  let writes = 0;
  const task = { id: 'task-a', userId: 'owner-a', title: 'Source task', due_date: '2026-09-29', status: 'pending', done: false };
  const prisma = {
    appSetting: {
      findUnique: async ({ where }) => settings.get(where.key) ?? null,
      create: async ({ data }) => { if (settings.has(data.key)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); settings.set(data.key, { ...data }); writes++; return data; },
      updateMany: async ({ where, data }) => {
        const current = settings.get(where.key);
        if (!current || current.createdBy !== where.createdBy || current.category !== where.category || current.value !== where.value) return { count: 0 };
        settings.set(where.key, { ...current, ...data }); writes++; return { count: 1 };
      },
    },
    ownerProfile: { findUnique: async () => ({ timezone: 'Asia/Kolkata' }) },
    user: { findUnique: async ({ where }) => ({ id: where.id, calendarEvents: '[]' }) },
    task: { findMany: async ({ where }) => where.userId === 'owner-a' ? [task] : [] },
    goal: { findMany: async () => [] }, habit: { findMany: async () => [] }, subscriptionItem: { findMany: async () => [] },
  };
  return { prisma, settings, writes: () => writes };
}

test('notifications are source-linked, owner-scoped and reads do not write settings', async () => {
  const fixture = notificationFixture();
  const handlers = createNotificationHandlers({ prisma: fixture.prisma, now: () => new Date('2026-09-29T10:00:00Z') });
  const first = await handlers.list('owner-a');
  assert.equal(first.notifications.length, 1);
  assert.equal(first.notifications[0].href, '/workspace/tasks?recordId=task-a');
  assert.equal(first.unreadCount, 1);
  assert.equal(fixture.writes(), 0);
  assert.equal((await handlers.list('owner-b')).notifications.length, 0);
  await assert.rejects(handlers.actions('owner-b', { expectedRevision: 0, action: 'read', ids: [first.notifications[0].id] }), { status: 404 });
  assert.equal(fixture.writes(), 0);
});

test('reminders use promoted goal/habit/subscription columns and the active calendar rows', async t => {
  const { prisma } = await migratedFixture(t);
  await prisma.goal.createMany({ data: [
    { id: 'goal-active', userId: 'owner-a', title: 'Active', targetDate: '2026-11-03', status: 'active', target_value: 10, current_value: 2 },
    { id: 'goal-done', userId: 'owner-a', title: 'Done', targetDate: '2026-11-03', status: 'completed' },
    { id: 'goal-reached', userId: 'owner-a', title: 'Reached', targetDate: '2026-11-03', target_value: 10, current_value: 10 },
  ] });
  await prisma.habit.create({ data: { id: 'daily', userId: 'owner-a', name: 'Read', target_days: 7 } });
  await prisma.subscriptionItem.create({ data: { id: 'renewal', userId: 'owner-a', name: 'Software', active: 1, next_date: '2026-11-03' } });
  const records = createRecordServices(prisma);
  await records.calendar.create('owner-a', { id: 'meeting', mutationId: 'calendar-notification', record: { title: 'Meeting', date: '2026-11-03', allDay: true, recurrence: 'none', type: 'work' } });
  const handlers = createNotificationHandlers({ prisma, calendarRecords: records.calendar, now: () => new Date('2026-11-03T09:00:00Z') });
  await handlers.updatePreferences('owner-a', { expectedRevision: 0, preferences: { enabled: true, categories: { tasks: true, goals: true, habits: true, calendar: true, subscriptions: true } } });
  const feed = await handlers.list('owner-a');
  assert.deepEqual(feed.notifications.map(item => item.source.id).sort(), ['daily', 'goal-active', 'meeting', 'renewal']);
  assert.equal((await handlers.list('owner-b')).notifications.length, 0);
  await prisma.habitLog.create({ data: { habitId: 'daily', date: '2026-11-03' } });
  assert.equal((await handlers.list('owner-a')).notifications.some(item => item.source.id === 'daily'), false);
});

test('read and dismiss state persists, revisions reject stale edits and no source text is stored', async () => {
  const fixture = notificationFixture();
  const now = () => new Date('2026-09-29T10:00:00Z');
  const handlers = createNotificationHandlers({ prisma: fixture.prisma, now });
  const id = (await handlers.list('owner-a')).notifications[0].id;
  const read = await handlers.actions('owner-a', { expectedRevision: 0, action: 'read', ids: [id] });
  assert.equal(read.revision, 1);
  assert.equal(read.notifications[0].read, true);
  const restoredHandler = createNotificationHandlers({ prisma: fixture.prisma, now });
  assert.equal((await restoredHandler.list('owner-a')).notifications[0].read, true);
  await assert.rejects(restoredHandler.actions('owner-a', { expectedRevision: 0, action: 'dismiss', ids: [id] }), { status: 409 });
  const dismissed = await restoredHandler.actions('owner-a', { expectedRevision: 1, action: 'dismiss', ids: [id] });
  assert.equal(dismissed.notifications[0].dismissed, true);
  assert.equal(dismissed.unreadCount, 0);
  const stored = fixture.settings.get(notificationSettingsKey('owner-a'));
  assert.equal(stored.createdBy, 'owner-a');
  assert.doesNotMatch(stored.value, /Source task|task-a|due date/);
  assert.equal(fixture.writes(), 2);
});
