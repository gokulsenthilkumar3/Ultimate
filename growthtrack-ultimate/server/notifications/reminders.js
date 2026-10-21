import { createHash } from 'node:crypto';

export const CATEGORY_KEYS = ['tasks', 'goals', 'habits', 'calendar', 'subscriptions'];
export const DEFAULT_PREFERENCES = { enabled: true, categories: { tasks: true, goals: true, habits: true, calendar: true, subscriptions: false } };

export function calendarDay(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

const ordinal = value => Date.parse(`${value}T00:00:00Z`) / 86400000;
const label = (value, fallback) => String(value || fallback).slice(0, 240);
const done = record => record.done === true || ['done', 'completed', 'cancelled', 'archived'].includes(String(record.status || '').toLowerCase());

export function recordData(record) {
  if (record.data == null || record.data === '') return {};
  const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid source data');
  return data;
}

function reminder(category, type, record, dueDate, title, reason, path, dueTime = '') {
  const id = 'n1_' + createHash('sha256').update(JSON.stringify([category, String(record.id), dueDate, dueTime])).digest('hex');
  return {
    id, category, type, title, body: reason, reason, dueDate, dueTime,
    source: { module: category, id: String(record.id), label: label(record.title || record.name, 'Source record') },
    link: category === 'calendar' ? 'calendar' : category,
    href: `${path}?recordId=${encodeURIComponent(record.id)}${category === 'calendar' ? `&date=${dueDate}` : ''}`,
  };
}

/** Every reminder must have a stored source and a validated recorded schedule. */
export function deriveReminders({ tasks = [], goals = [], habits = [], events = [], subscriptions = [] }, { today }) {
  const reminders = [];
  const daysLeft = date => ordinal(date) - ordinal(today);
  const dueReason = date => daysLeft(date) < 0 ? `The recorded due date ${date} has passed.`
    : date === today ? `The recorded due date is today (${date}).` : `The recorded due date is ${date}, within the next seven days.`;

  for (const task of tasks) {
    const due = validDay(task.due_date);
    if (!task.id || !due || done(task) || daysLeft(due) > 7) continue;
    reminders.push(reminder('tasks', daysLeft(due) < 0 ? 'task_overdue' : 'task_due', task, due,
      label(task.title, 'Task due'), `${dueReason(due)} This task is not marked complete.`, '/workspace/tasks'));
  }
  for (const goal of goals) {
    const data = recordData(goal);
    const due = validDay(goal.targetDate || data.targetDate || data.target_date || data.deadline);
    if (!goal.id || !due || done({ ...data, ...goal, status: goal.status ?? data.status }) || daysLeft(due) > 7) continue;
    if (Number(data.target_value) > 0 && Number(data.current_value) >= Number(data.target_value)) continue;
    reminders.push(reminder('goals', 'goal_deadline', goal, due, label(goal.title, 'Goal deadline'),
      `${dueReason(due)} This goal is still active.`, '/workspace/goals'));
  }
  for (const habit of habits) {
    const data = recordData(habit);
    const daily = data.frequency === 'daily' || Number(data.target_days) === 7;
    if (!habit.id || !daily || data.active === false || data.active === 0 || data.archived || (validDay(data.startDate) && data.startDate > today)) continue;
    if (habit.logs?.some(log => log.date === today) || data.completed_dates?.includes(today)) continue;
    reminders.push(reminder('habits', 'habit_due', habit, today, label(habit.name, 'Habit check-in'),
      'This habit has a recorded daily schedule and no completion is logged for today.', '/wellness/habits'));
  }
  for (const event of events) {
    const start = validDay(event.date);
    if (event.id == null || !start || event.cancelled || done(event)) continue;
    const recurrence = event.recurrence || 'none';
    if (!['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(recurrence)) continue;
    if (event.allDay === false && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime || '')) continue;
    for (let day = 0; day <= 7; day += 1) {
      const date = new Date((ordinal(today) + day) * 86400000).toISOString().slice(0, 10);
      if (date < start) continue;
      const delta = ordinal(date) - ordinal(start);
      const occurs = (recurrence === 'none' && delta === 0) || recurrence === 'daily'
        || (recurrence === 'weekly' && delta % 7 === 0)
        || (recurrence === 'monthly' && date.slice(8) === start.slice(8))
        || (recurrence === 'yearly' && date.slice(5) === start.slice(5));
      if (!occurs) continue;
      const time = event.allDay === false ? event.startTime : '';
      reminders.push(reminder('calendar', 'calendar_due', event, date, label(event.title, 'Calendar event'),
        `This calendar event is scheduled for ${date}${time ? ` at ${time}` : ''}.`, '/workspace/calendar', time));
    }
  }
  for (const subscription of subscriptions) {
    const data = recordData(subscription);
    const due = validDay(data.next_date || data.nextDate);
    if (!subscription.id || !due || subscription.active === 0 || data.cancelled || daysLeft(due) > 7) continue;
    reminders.push(reminder('subscriptions', 'subscription_due', subscription, due, label(subscription.name, 'Subscription renewal'),
      `${dueReason(due)} Review the next recorded renewal; payment status has not been inferred.`, '/finance/subscriptions'));
  }
  return [...new Map(reminders.map(item => [item.id, item])).values()]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}
