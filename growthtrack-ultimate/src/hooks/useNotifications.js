import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

const EMPTY = [];
const CATEGORY_KEYS = ['tasks', 'goals', 'habits', 'calendar', 'subscriptions'];
const PATHS = { tasks: '/workspace/tasks', goals: '/workspace/goals', habits: '/wellness/habits', calendar: '/workspace/calendar', subscriptions: '/finance/subscriptions' };

function notificationError(message, status = 0) {
  return Object.assign(new Error(message), { status });
}

function validateFeed(data, owner) {
  if (data?.ownerId !== owner || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Array.isArray(data.notifications)
    || typeof data.preferences?.enabled !== 'boolean' || CATEGORY_KEYS.some(key => typeof data.preferences.categories?.[key] !== 'boolean')) {
    throw notificationError('The notification service returned an invalid response. Refresh after the backend is configured.');
  }
  if (data.notifications.some(item => !/^n1_[a-f0-9]{64}$/.test(item?.id || '') || !CATEGORY_KEYS.includes(item.category)
    || typeof item.title !== 'string' || typeof item.reason !== 'string' || typeof item.dueDate !== 'string'
    || typeof item.read !== 'boolean' || typeof item.dismissed !== 'boolean'
    || !item.href?.startsWith(PATHS[item.category] + '?recordId=') || typeof item.source?.id !== 'string')) {
    throw notificationError('The notification service returned invalid reminders.');
  }
  return data;
}

function actionFailure(error) {
  if (error.status === 409) return notificationError('Notification preferences changed on another device. Refresh, then retry.', 409);
  if (error.status === 404) return notificationError('This reminder is no longer available. Refresh before retrying.', 404);
  if (error.status === 401 || error.status === 403) return notificationError('Sign in again before changing notifications.', error.status);
  return notificationError('Could not confirm the notification update. Refresh to verify its state before retrying.', error.status);
}

export default function useNotifications({ enabled = true } = {}) {
  const owner = useStore(state => state.user?.id) || '';
  const sessionVersion = useStore(state => state._sessionVersion) || 0;
  const client = useQueryClient();
  const queryKey = ['notifications', 'v1', owner, sessionVersion];
  const active = Boolean(enabled && owner);
  const controllers = useRef(new Set());
  const actor = owner + ':' + sessionVersion;
  const isCurrent = useCallback(() => {
    const current = useStore.getState();
    return current.user?.id === owner && (current._sessionVersion || 0) === sessionVersion;
  }, [owner, sessionVersion]);

  const query = useQuery({
    queryKey, enabled: active, gcTime: 0, staleTime: 30_000,
    refetchInterval: active ? 60_000 : false, refetchOnWindowFocus: true, retry: false,
    queryFn: async ({ signal }) => validateFeed(await apiRequest('/api/notifications', { signal, cache: 'no-store' }), owner),
  });

  useEffect(() => {
    const requests = controllers.current;
    return () => {
      requests.forEach(controller => controller.abort());
      requests.clear();
      const oldKey = ['notifications', 'v1', owner, sessionVersion];
      void client.cancelQueries({ queryKey: oldKey, exact: true });
      client.removeQueries({ queryKey: oldKey, exact: true });
    };
  }, [owner, sessionVersion, client]);

  const mutation = useMutation({
    mutationKey: [...queryKey, 'write'], scope: { id: actor }, retry: false,
    mutationFn: async variables => {
      if (!active || !isCurrent() || variables.actor !== actor) throw notificationError('The account changed. Refresh before retrying.');
      await client.cancelQueries({ queryKey, exact: true });
      const previous = client.getQueryData(queryKey);
      if (!previous) throw notificationError('Load notifications before changing them.');
      const controller = new AbortController();
      controllers.current.add(controller);
      try {
        const preferences = variables.kind === 'preferences';
        const body = preferences
          ? { expectedRevision: previous.revision, preferences: variables.patch }
          : { expectedRevision: previous.revision, action: variables.kind, ids: variables.ids };
        const data = await apiRequest('/api/notifications/' + (preferences ? 'preferences' : 'actions'), {
          method: preferences ? 'PUT' : 'POST', body: JSON.stringify(body), signal: controller.signal,
        });
        if (controller.signal.aborted || !isCurrent()) throw notificationError('The account changed. Refresh before retrying.');
        const acknowledged = validateFeed(data, owner);
        if (acknowledged.revision <= previous.revision) throw notificationError('The server did not acknowledge the notification update.');
        return acknowledged;
      } catch (error) { throw actionFailure(error); }
      finally { controllers.current.delete(controller); }
    },
    onSuccess: (data, variables) => {
      if (variables.actor === actor && isCurrent()) client.setQueryData(queryKey, data);
    },
    onError: (_error, variables) => {
      // Reconcile ambiguous writes; never replay a mutation automatically.
      if (variables.actor === actor && isCurrent()) void client.invalidateQueries({ queryKey, exact: true });
    },
  });

  const data = active && query.data?.ownerId === owner ? query.data : null;
  const notifications = data?.notifications.filter(item => !item.dismissed) || EMPTY;
  const dismissedNotifications = data?.notifications.filter(item => item.dismissed) || EMPTY;
  const perform = (kind, ids = [], patch) => mutation.mutateAsync({ kind, ids, patch, actor });
  const bulk = async (kind, ids) => {
    for (let offset = 0; offset < ids.length; offset += 500) await perform(kind, ids.slice(offset, offset + 500));
  };
  const refresh = async () => {
    if (!active) return;
    mutation.reset();
    return (await query.refetch({ throwOnError: true })).data;
  };

  return {
    notifications, dismissedNotifications,
    unreadCount: notifications.filter(item => !item.read).length,
    loading: active && query.isPending, refreshing: query.isFetching,
    enabled: active, hasLoaded: Boolean(data), error: active ? query.error : null,
    saving: mutation.variables?.actor === actor && mutation.isPending,
    mutationError: mutation.variables?.actor === actor ? mutation.error : null,
    preferences: data?.preferences || null, timeZone: data?.timeZone || '',
    refresh,
    markRead: id => perform('read', [id]), markUnread: id => perform('unread', [id]),
    markAllRead: () => bulk('read', notifications.filter(item => !item.read).map(item => item.id)),
    dismiss: id => perform('dismiss', [id]), restore: id => perform('restore', [id]),
    clearAll: () => bulk('dismiss', notifications.map(item => item.id)),
    updatePreferences: patch => perform('preferences', [], patch),
  };
}
