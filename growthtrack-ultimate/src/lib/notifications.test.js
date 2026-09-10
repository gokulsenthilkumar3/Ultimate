import { describe, expect, it } from 'vitest';
import { generateLocalNotifications, normalizeServerNotifications, notificationStorageKey } from './notifications';

describe('notification derivation', () => {
  it('isolates persisted notification state by account', () => {
    expect(notificationStorageKey('notif_read', 'user@example.com')).toBe('notif_read:user%40example.com');
    expect(notificationStorageKey('notif_read')).toBe('notif_read');
  });

  it('uses loaded habit logs and avoids alerts while logs are unresolved', () => {
    const habits = [
      { id: 'done', name: 'Walk', streak: 4 },
      { id: 'missed', name: 'Read', streak: 2 },
      { id: 'loading', name: 'Stretch', streak: 1 },
    ];

    const notifications = generateLocalNotifications({
      habits,
      habitLogsByHabit: {
        done: [{ date: '2026-09-10' }],
        missed: [{ date: '2026-09-09' }],
      },
      today: '2026-09-10',
    });

    expect(notifications.map(notification => notification.id)).toEqual([
      'missed-habit-missed-2026-09-10',
    ]);
  });

  it('derives overdue tasks and goal deadlines from their canonical collections', () => {
    const notifications = generateLocalNotifications({
      pendingTasks: [{ id: 'task-1', title: 'Submit report', due_date: '2026-09-08', priority: 'high' }],
      goals: [
        { id: 'goal-1', title: 'Run 5k', deadline: '2026-09-12', current_value: 3, target_value: 5, status: 'active' },
        { id: 'goal-2', title: 'Finished', deadline: '2026-09-09', status: 'completed' },
      ],
      today: '2026-09-10',
    });

    expect(notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'overdue-task-task-1-2026-09-08', type: 'task_overdue' }),
      expect.objectContaining({ id: 'goal-deadline-goal-1-2026-09-12', body: expect.stringContaining('60%') }),
    ]));
    expect(notifications.some(notification => notification.id.includes('goal-2'))).toBe(false);
  });

  it('normalizes server audit rows for the notification UI', () => {
    expect(normalizeServerNotifications([{
      id: 'audit-1',
      type: 'system',
      title: 'Updated goal',
      message: 'Progress changed.',
      createdAt: '2026-09-10T08:30:00.000Z',
    }])).toEqual([expect.objectContaining({
      id: 'server-audit-1',
      type: 'general',
      body: 'Progress changed.',
      time: '2026-09-10',
    })]);
  });
});
