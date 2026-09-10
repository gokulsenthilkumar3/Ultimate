import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useStore, { apiSync } from '../store/useStore';
import {
  generateLocalNotifications,
  normalizeServerNotifications,
  NOTIFICATION_DISMISSED_KEY,
  NOTIFICATION_READ_KEY,
  NOTIFICATION_STATE_EVENT,
  notificationStorageKey,
  readNotificationIds,
  writeNotificationIds,
} from '../lib/notifications';

const EMPTY_LIST = [];
const EMPTY_RECORD = {};

export default function useNotifications({ enabled = true } = {}) {
  const user = useStore(state => state.user);
  const habits = useStore(state => state.habits) || EMPTY_LIST;
  const goals = useStore(state => state.goals) || EMPTY_LIST;
  const habitLogsByHabit = useStore(state => state.habitLogsByHabit) || EMPTY_RECORD;
  const fetchHabitLogsForHabit = useStore(state => state.fetchHabitLogsForHabit);

  const [serverState, setServerState] = useState({ accountId: '', rows: EMPTY_LIST });
  const [loading, setLoading] = useState(false);
  const [, setStorageRevision] = useState(0);
  const serverRequestId = useRef(0);
  const accountId = user?.id || user?.email || '';
  const serverNotifications = enabled && accountId && serverState.accountId === accountId
    ? serverState.rows
    : EMPTY_LIST;
  const dismissedStorageKey = notificationStorageKey(NOTIFICATION_DISMISSED_KEY, accountId);
  const readStorageKey = notificationStorageKey(NOTIFICATION_READ_KEY, accountId);
  const dismissedIds = readNotificationIds(dismissedStorageKey);
  const readIds = readNotificationIds(readStorageKey);

  const refresh = useCallback(async () => {
    if (!enabled || !accountId) return;
    const requestId = ++serverRequestId.current;
    const requestedAccountId = accountId;
    setLoading(true);
    try {
      const rows = await apiSync('/notifications', 'GET');
      if (serverRequestId.current === requestId) {
        setServerState({ accountId: requestedAccountId, rows: normalizeServerNotifications(rows) });
      }
    } catch {
      // The local notification feed remains available when the endpoint is offline.
    } finally {
      if (serverRequestId.current === requestId) setLoading(false);
    }
  }, [accountId, enabled]);

  useEffect(() => {
    if (!enabled || !accountId) {
      serverRequestId.current += 1;
      return undefined;
    }
    refresh();
    return () => { serverRequestId.current += 1; };
  }, [accountId, enabled, refresh]);

  useEffect(() => {
    if (!enabled || !fetchHabitLogsForHabit) return;
    const missingHabitIds = habits
      .map(habit => habit.id)
      .filter(id => id != null && !Object.prototype.hasOwnProperty.call(habitLogsByHabit, id));
    if (missingHabitIds.length > 0) {
      Promise.allSettled(missingHabitIds.map(id => fetchHabitLogsForHabit(id)));
    }
  }, [enabled, habits, habitLogsByHabit, fetchHabitLogsForHabit]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncStoredState = event => {
      if (event?.type === 'storage' && event.key && ![dismissedStorageKey, readStorageKey].includes(event.key)) return;
      setStorageRevision(revision => revision + 1);
    };
    window.addEventListener('storage', syncStoredState);
    window.addEventListener(NOTIFICATION_STATE_EVENT, syncStoredState);
    return () => {
      window.removeEventListener('storage', syncStoredState);
      window.removeEventListener(NOTIFICATION_STATE_EVENT, syncStoredState);
    };
  }, [dismissedStorageKey, readStorageKey]);

  const localNotifications = useMemo(() => generateLocalNotifications({
    habits,
    habitLogsByHabit,
    pendingTasks: user?.tasks?.pending || EMPTY_LIST,
    goals,
  }), [habits, habitLogsByHabit, user?.tasks?.pending, goals]);

  const mergedNotifications = useMemo(() => {
    const serverIds = new Set(serverNotifications.map(notification => notification.id));
    return [
      ...serverNotifications,
      ...localNotifications.filter(notification => !serverIds.has(notification.id)),
    ];
  }, [serverNotifications, localNotifications]);

  const notifications = useMemo(() => {
    if (!enabled) return EMPTY_LIST;
    return mergedNotifications
      .filter(notification => !dismissedIds.has(String(notification.id)))
      .map(notification => ({
        ...notification,
        read: notification.read || readIds.has(String(notification.id)),
      }));
  }, [enabled, mergedNotifications, dismissedIds, readIds]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications],
  );

  const markRead = useCallback(id => {
    const normalizedId = String(id);
    const next = readNotificationIds(readStorageKey);
    next.add(normalizedId);
    writeNotificationIds(readStorageKey, next, { broadcast: false });
    setStorageRevision(revision => revision + 1);
  }, [readStorageKey]);

  const markAllRead = useCallback(() => {
    const next = readNotificationIds(readStorageKey);
    notifications.forEach(notification => next.add(String(notification.id)));
    writeNotificationIds(readStorageKey, next, { broadcast: false });
    setStorageRevision(revision => revision + 1);
  }, [notifications, readStorageKey]);

  const dismiss = useCallback(id => {
    const normalizedId = String(id);
    const next = readNotificationIds(dismissedStorageKey);
    next.add(normalizedId);
    writeNotificationIds(dismissedStorageKey, next, { broadcast: false });
    setStorageRevision(revision => revision + 1);
  }, [dismissedStorageKey]);

  const clearAll = useCallback(() => {
    const next = readNotificationIds(dismissedStorageKey);
    notifications.forEach(notification => next.add(String(notification.id)));
    writeNotificationIds(dismissedStorageKey, next, { broadcast: false });
    setStorageRevision(revision => revision + 1);
  }, [dismissedStorageKey, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
  };
}
