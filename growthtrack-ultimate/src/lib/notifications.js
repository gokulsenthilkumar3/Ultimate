import safeLocalStorage from '../utils/safeLocalStorage';

export const NOTIFICATION_DISMISSED_KEY = 'notif_dismissed';
export const NOTIFICATION_READ_KEY = 'notif_read';
export const NOTIFICATION_STATE_EVENT = 'growthtrack:notification-state-changed';

const MAX_STORED_IDS = 500;

function toId(value) {
  return value == null ? '' : String(value);
}

export function notificationStorageKey(baseKey, accountId) {
  const scope = toId(accountId).trim();
  return scope ? `${baseKey}:${encodeURIComponent(scope)}` : baseKey;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayDifference(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  return Math.round((
    Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)
  ) / 86400000);
}

function goalProgress(goal) {
  if (Number.isFinite(Number(goal.progress))) return Math.max(0, Math.min(100, Math.round(Number(goal.progress))));
  const current = Number(goal.current_value ?? goal.currentValue);
  const target = Number(goal.target_value ?? goal.targetValue);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function readNotificationIds(key) {
  try {
    const stored = JSON.parse(safeLocalStorage.getItem(key) || '[]');
    return new Set(Array.isArray(stored) ? stored.map(toId).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

export function writeNotificationIds(key, ids, { broadcast = true } = {}) {
  const values = [...ids].map(toId).filter(Boolean).slice(-MAX_STORED_IDS);
  try { safeLocalStorage.setItem(key, JSON.stringify(values)); } catch { /* storage may be unavailable */ }
  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_STATE_EVENT));
  }
  return new Set(values);
}

export function dismissNotificationIds(ids, accountId) {
  const storageKey = notificationStorageKey(NOTIFICATION_DISMISSED_KEY, accountId);
  const next = readNotificationIds(storageKey);
  ids.forEach(id => {
    const normalized = toId(id);
    if (normalized) next.add(normalized);
  });
  return writeNotificationIds(storageKey, next);
}

export function generateLocalNotifications({ habits = [], habitLogsByHabit = {}, pendingTasks = [], goals = [], today = localDateKey() }) {
  const notifications = [];

  habits.forEach(habit => {
    const habitId = toId(habit.id);
    if (!habitId) return;

    const logsLoaded = Object.prototype.hasOwnProperty.call(habitLogsByHabit, habit.id)
      || Object.prototype.hasOwnProperty.call(habitLogsByHabit, habitId);
    const logs = habitLogsByHabit[habit.id] || habitLogsByHabit[habitId] || [];
    const completedDates = Array.isArray(habit.completed_dates) ? habit.completed_dates : [];

    // Habit logs are fetched separately from the main state payload. Avoid a
    // false missed-habit alert while those records are still loading.
    if (!logsLoaded && completedDates.length === 0) return;

    const completedToday = logs.some(log => log?.date === today && log?.completed !== false)
      || completedDates.includes(today);
    if (completedToday) return;

    notifications.push({
      id: `missed-habit-${habitId}-${today}`,
      type: 'habit_missed',
      title: `Missed: ${habit.name || 'Habit'}`,
      body: `You haven't logged “${habit.name || 'this habit'}” today. Current streak: ${habit.streak || 0} day${habit.streak === 1 ? '' : 's'}.`,
      time: today,
      read: false,
      link: 'habits',
    });
  });

  pendingTasks.forEach(task => {
    const taskId = toId(task.id);
    const due = task.dueDate || task.due_date;
    const daysOverdue = due ? dayDifference(due, today) : null;
    if (!taskId || daysOverdue == null || daysOverdue <= 0) return;

    notifications.push({
      id: `overdue-task-${taskId}-${due}`,
      type: 'task_overdue',
      title: `Overdue: ${task.title || 'Task'}`,
      body: `Due ${daysOverdue === 1 ? 'yesterday' : `${daysOverdue} days ago`} (${due}). Priority: ${String(task.priority || 'p3').toUpperCase()}.`,
      time: due,
      read: false,
      link: 'tasks',
    });
  });

  goals.forEach(goal => {
    if (goal.status === 'completed' || goal.status === 'cancelled') return;
    const goalId = toId(goal.id);
    const deadline = goal.deadline || goal.target_date;
    const daysLeft = deadline ? dayDifference(today, deadline) : null;
    if (!goalId || daysLeft == null || daysLeft > 7) return;

    const progress = goalProgress(goal);
    if (daysLeft >= 0) {
      notifications.push({
        id: `goal-deadline-${goalId}-${deadline}`,
        type: 'goal_deadline',
        title: `Goal deadline soon: ${goal.title || 'Goal'}`,
        body: daysLeft === 0
          ? `“${goal.title || 'This goal'}” is due today. Progress: ${progress}%.`
          : `“${goal.title || 'This goal'}” is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Progress: ${progress}%.`,
        time: deadline,
        read: false,
        link: 'goals',
      });
      return;
    }

    const overdueDays = Math.abs(daysLeft);
    notifications.push({
      id: `overdue-goal-${goalId}-${deadline}`,
      type: 'goal_deadline',
      title: `Goal overdue: ${goal.title || 'Goal'}`,
      body: `Missed deadline by ${overdueDays} day${overdueDays === 1 ? '' : 's'}. Progress: ${progress}%.`,
      time: deadline,
      read: false,
      link: 'goals',
    });
  });

  const priorityOrder = ['habit_missed', 'task_overdue', 'goal_deadline', 'metric_alert', 'general'];
  notifications.sort((a, b) => {
    const priorityDelta = priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type);
    if (priorityDelta !== 0) return priorityDelta;
    return String(b.time).localeCompare(String(a.time));
  });

  return notifications;
}

export function normalizeServerNotifications(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(row => row && row.id != null).map(row => {
    const createdAt = row.createdAt || row.created_at || row.time || '';
    return {
      ...row,
      id: `server-${toId(row.id)}`,
      type: row.type === 'system' ? 'general' : (row.type || 'general'),
      title: row.title || 'Notification',
      body: row.body || row.message || 'Local data changed.',
      time: createdAt ? String(createdAt).slice(0, 10) : '',
      read: Boolean(row.read),
    };
  });
}
