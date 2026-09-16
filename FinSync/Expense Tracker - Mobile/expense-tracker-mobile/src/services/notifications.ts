/**
 * Local notification service
 * Schedules all due reminders and budget alerts using expo-notifications.
 * No push server — all notifications are local / device-only.
 *
 * FIX: notification_ids stored as JSON array per recurring_entry.
 * cancelEntryNotifications() MUST be called before rescheduling to prevent
 * stale duplicate notifications accumulating.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationType } from '../constants/enums';
import { getDB } from '../db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

// ─── Permission ───────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dues', {
      name: 'Payment Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('budget', {
      name: 'Budget Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}

// ─── Deduplication helpers ────────────────────────────────────────────────────

/** Cancel ALL existing notifications for a recurring_entry and clear stored IDs. */
export async function cancelEntryNotifications(entryId: number): Promise<void> {
  const db = getDB();
  const row = await db.getFirstAsync<{ notification_ids: string }>(
    'SELECT notification_ids FROM recurring_entries WHERE id = ?',
    [entryId]
  );
  if (row?.notification_ids) {
    try {
      const ids: string[] = JSON.parse(row.notification_ids);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    } catch { /* invalid JSON — safe to ignore */ }
  }
  await db.runAsync(
    'UPDATE recurring_entries SET notification_ids = ? WHERE id = ?',
    ['[]', entryId]
  );
}

async function appendNotificationId(entryId: number, newId: string): Promise<void> {
  const db = getDB();
  const row = await db.getFirstAsync<{ notification_ids: string }>(
    'SELECT notification_ids FROM recurring_entries WHERE id = ?',
    [entryId]
  );
  let ids: string[] = [];
  try { ids = JSON.parse(row?.notification_ids ?? '[]'); } catch { ids = []; }
  ids.push(newId);
  await db.runAsync(
    'UPDATE recurring_entries SET notification_ids = ? WHERE id = ?',
    [JSON.stringify(ids), entryId]
  );
}

// ─── Main entry-point: schedule all 3 notifications for an entry ──────────────

/**
 * Call this whenever a recurring_entry is created or its due_date changes.
 * Cancels stale notifications first, then schedules fresh ones.
 */
export async function scheduleAllNotificationsForEntry(
  entryId: number,
  name: string,
  amount: number | null,
  dueDate: Date,
  leadDays: number,
  remindOnDue: boolean
): Promise<void> {
  await cancelEntryNotifications(entryId);

  if (leadDays > 0) {
    const id = await scheduleDueSoonNotification(entryId, name, amount, dueDate, leadDays);
    if (id) await appendNotificationId(entryId, id);
  }

  if (remindOnDue) {
    const id = await scheduleDueTodayNotification(entryId, name, amount, dueDate);
    if (id) await appendNotificationId(entryId, id);
  }

  const overdueId = await scheduleOverdueNotification(entryId, name, dueDate);
  if (overdueId) await appendNotificationId(entryId, overdueId);
}

// ─── Individual schedulers ────────────────────────────────────────────────────

export async function scheduleDueSoonNotification(
  entryId: number,
  name: string,
  amount: number | null,
  dueDate: Date,
  leadDays: number
): Promise<string | null> {
  const triggerDate = new Date(dueDate);
  triggerDate.setDate(triggerDate.getDate() - leadDays);
  triggerDate.setHours(9, 0, 0, 0);
  if (triggerDate <= new Date()) return null;

  const amountStr = amount ? `₹${amount.toLocaleString('en-IN')}` : '';
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ Payment due in ${leadDays} day${leadDays > 1 ? 's' : ''}`,
      body: `${name}${amountStr ? ' — ' + amountStr : ''} is due on ${dueDate.toLocaleDateString('en-IN')}`,
      data: { type: NotificationType.DUE_SOON, entryId },
      // @ts-ignore
      channelId: 'dues',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function scheduleDueTodayNotification(
  entryId: number,
  name: string,
  amount: number | null,
  dueDate: Date
): Promise<string | null> {
  const triggerDate = new Date(dueDate);
  triggerDate.setHours(8, 0, 0, 0);
  if (triggerDate <= new Date()) return null;

  const amountStr = amount ? `₹${amount.toLocaleString('en-IN')}` : '';
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔴 Payment due today`,
      body: `${name}${amountStr ? ' — ' + amountStr : ''} is due today. Tap to mark as paid.`,
      data: { type: NotificationType.DUE_TODAY, entryId },
      // @ts-ignore
      channelId: 'dues',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function scheduleOverdueNotification(
  entryId: number,
  name: string,
  dueDate: Date
): Promise<string | null> {
  const triggerDate = new Date(dueDate);
  triggerDate.setDate(triggerDate.getDate() + 1);
  triggerDate.setHours(9, 0, 0, 0);
  if (triggerDate <= new Date()) return null;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Payment Overdue`,
      body: `${name} was due on ${dueDate.toLocaleDateString('en-IN')} and is still unpaid.`,
      data: { type: NotificationType.OVERDUE, entryId },
      // @ts-ignore
      channelId: 'dues',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

// ─── Budget alerts (immediate) ────────────────────────────────────────────────

export async function sendBudgetWarningNotification(
  budgetId: number,
  categoryName: string,
  pct: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `💸 Budget Alert`,
      body: `You've used ${pct}% of your ${categoryName} budget this month.`,
      data: { type: NotificationType.BUDGET_WARNING, budgetId },
      // @ts-ignore
      channelId: 'budget',
    },
    trigger: null,
  });
}

export async function sendBudgetExceededNotification(
  budgetId: number,
  categoryName: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 Budget Exceeded`,
      body: `Your ${categoryName} budget has been exceeded this month!`,
      data: { type: NotificationType.BUDGET_EXCEEDED, budgetId },
      // @ts-ignore
      channelId: 'budget',
    },
    trigger: null,
  });
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
