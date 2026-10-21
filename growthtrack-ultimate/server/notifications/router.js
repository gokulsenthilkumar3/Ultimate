import express from 'express';
import { z } from 'zod';
import { CATEGORY_KEYS, DEFAULT_PREFERENCES, calendarDay, deriveReminders } from './reminders.js';

export const NOTIFICATION_SETTINGS_PREFIX = 'private:notifications:v1:';
export const notificationSettingsKey = owner => NOTIFICATION_SETTINGS_PREFIX + encodeURIComponent(owner);
const BODY_LIMIT = 64 * 1024;
const HISTORY_LIMIT = 5000;
const categoryShape = Object.fromEntries(CATEGORY_KEYS.map(key => [key, z.boolean()]));
const prefsSchema = z.object({ enabled: z.boolean(), categories: z.object(categoryShape).strict() }).strict();
const notificationId = z.string().regex(/^n1_[a-f0-9]{64}$/);
const history = z.record(notificationId, z.iso.datetime()).refine(value => Object.keys(value).length <= HISTORY_LIMIT);
const stateSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(),
  preferences: prefsSchema, read: history, dismissed: history,
}).strict();
const actionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  action: z.enum(['read', 'unread', 'dismiss', 'restore']),
  ids: z.array(notificationId).min(1).max(500),
}).strict();
const preferenceSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  preferences: z.object({ enabled: z.boolean().optional(), categories: z.object(categoryShape).partial().strict().optional() }).strict(),
}).strict();

function issue(status, code, message) { return Object.assign(new Error(message), { status, code, notificationIssue: true }); }
const conflict = () => issue(409, 'REVISION_CONFLICT', 'Notification preferences changed. Refresh before retrying.');
const defaults = () => ({ schemaVersion: 1, revision: 0, preferences: structuredClone(DEFAULT_PREFERENCES), read: {}, dismissed: {} });

export function createNotificationHandlers({ prisma, now = () => new Date() }) {
  if (!prisma?.appSetting || !prisma?.user) throw new TypeError('An injected Prisma client is required.');

  async function stored(owner) {
    const row = await prisma.appSetting.findUnique({ where: { key: notificationSettingsKey(owner) } });
    if (!row) return { row: null, state: defaults() };
    if (row.createdBy !== owner || row.category !== 'user-notifications') throw issue(503, 'PREFERENCES_INVALID', 'Stored notification preferences could not be verified.');
    let value;
    try { value = JSON.parse(row.value); } catch { throw issue(503, 'PREFERENCES_INVALID', 'Stored notification preferences could not be read.'); }
    const parsed = stateSchema.safeParse(value);
    if (!parsed.success) throw issue(503, 'PREFERENCES_INVALID', 'Stored notification preferences are invalid.');
    return { row, state: parsed.data };
  }

  async function sources(owner, time) {
    const profile = await prisma.ownerProfile.findUnique({ where: { userId: owner }, select: { timezone: true } });
    let timeZone = profile?.timezone || 'UTC';
    try { new Intl.DateTimeFormat('en-US', { timeZone }); } catch { timeZone = 'UTC'; }
    const today = calendarDay(time, timeZone);
    const [user, tasks, goals, habits, subscriptions] = await Promise.all([
      prisma.user.findUnique({ where: { id: owner }, select: { id: true, calendarEvents: true } }),
      prisma.task.findMany({ where: { userId: owner }, select: { id: true, userId: true, title: true, due_date: true, status: true, done: true } }),
      prisma.goal.findMany({ where: { userId: owner }, select: { id: true, userId: true, title: true, targetDate: true, data: true } }),
      prisma.habit.findMany({ where: { userId: owner }, select: { id: true, userId: true, name: true, data: true, logs: { where: { date: today }, select: { date: true } } } }),
      prisma.subscriptionItem.findMany({ where: { userId: owner }, select: { id: true, userId: true, name: true, active: true, data: true } }),
    ]);
    if (!user || user.id !== owner) throw issue(401, 'UNAUTHORIZED', 'Sign in to load notifications.');
    let events = [];
    try {
      events = user.calendarEvents ? JSON.parse(user.calendarEvents) : [];
      if (!Array.isArray(events)) throw new Error('Invalid calendar');
      events = events.filter(event => event && [event.userId, event.user_id].every(id => id == null || id === owner));
    } catch { throw issue(503, 'SOURCE_INVALID', 'Calendar reminders could not be verified. Review the calendar records.'); }
    const owned = rows => rows.filter(row => row.userId === owner);
    try {
      return { timeZone, reminders: deriveReminders({ tasks: owned(tasks), goals: owned(goals), habits: owned(habits), subscriptions: owned(subscriptions), events }, { today }) };
    } catch { throw issue(503, 'SOURCE_INVALID', 'Reminder source records could not be verified.'); }
  }

  function feed(owner, state, source, time) {
    const notifications = state.preferences.enabled ? source.reminders
      .filter(item => state.preferences.categories[item.category])
      .map(item => ({ ...item, read: Boolean(state.read[item.id]), dismissed: Boolean(state.dismissed[item.id]), readAt: state.read[item.id] || null, dismissedAt: state.dismissed[item.id] || null })) : [];
    return {
      ownerId: owner, revision: state.revision, preferences: state.preferences,
      timeZone: source.timeZone, generatedAt: time.toISOString(), notifications,
      unreadCount: notifications.filter(item => !item.read && !item.dismissed).length,
    };
  }

  async function save(owner, current, next) {
    if (!stateSchema.safeParse(next).success) throw issue(409, 'HISTORY_LIMIT', 'Notification history is full. No changes were saved.');
    const value = JSON.stringify(next);
    if (current.row) {
      const result = await prisma.appSetting.updateMany({
        where: { key: notificationSettingsKey(owner), createdBy: owner, category: 'user-notifications', value: current.row.value },
        data: { value, updatedBy: owner },
      });
      if (result.count !== 1) throw conflict();
    } else {
      try {
        await prisma.appSetting.create({ data: { key: notificationSettingsKey(owner), value, valueType: 'json', category: 'user-notifications', createdBy: owner, updatedBy: owner } });
      } catch (error) { if (error.code === 'P2002') throw conflict(); throw error; }
    }
  }

  const list = async owner => {
    const time = now();
    const [current, source] = await Promise.all([stored(owner), sources(owner, time)]);
    return feed(owner, current.state, source, time);
  };
  const preferences = async owner => {
    const current = await stored(owner);
    return { ownerId: owner, revision: current.state.revision, preferences: current.state.preferences };
  };
  const mutate = async (owner, input, preferenceUpdate = false) => {
    const parsed = (preferenceUpdate ? preferenceSchema : actionSchema).safeParse(input);
    if (!parsed.success) throw issue(400, 'INVALID_REQUEST', 'Invalid notification update.');
    const time = now();
    const [current, source] = await Promise.all([stored(owner), sources(owner, time)]);
    if (current.state.revision !== parsed.data.expectedRevision) throw conflict();
    const next = structuredClone(current.state);
    if (preferenceUpdate) {
      const patch = parsed.data.preferences;
      next.preferences = { ...next.preferences, ...patch, categories: { ...next.preferences.categories, ...patch.categories } };
    } else {
      const validIds = new Set(source.reminders.map(item => item.id));
      if (parsed.data.ids.some(id => !validIds.has(id))) throw issue(404, 'REMINDER_NOT_FOUND', 'A reminder is no longer available. Refresh before retrying.');
      for (const id of new Set(parsed.data.ids)) {
        if (parsed.data.action === 'read') next.read[id] = time.toISOString();
        if (parsed.data.action === 'unread') delete next.read[id];
        if (parsed.data.action === 'dismiss') next.dismissed[id] = time.toISOString();
        if (parsed.data.action === 'restore') delete next.dismissed[id];
      }
    }
    next.revision += 1;
    await save(owner, current, next);
    return feed(owner, next, source, time);
  };
  return { list, preferences, actions: (owner, input) => mutate(owner, input), updatePreferences: (owner, input) => mutate(owner, input, true) };
}

export function createNotificationsRouter(options) {
  const handlers = createNotificationHandlers(options);
  const router = express.Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.user?.id) return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Authentication required.' });
    if (Number(req.get('Content-Length')) > BODY_LIMIT) return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', error: 'Notification update is too large.' });
    next();
  });
  router.use(express.json({ limit: BODY_LIMIT, strict: true }));
  const respond = handler => async (req, res) => {
    try {
      if (Buffer.byteLength(JSON.stringify(req.body || {})) > BODY_LIMIT) throw issue(413, 'PAYLOAD_TOO_LARGE', 'Notification update is too large.');
      res.json(await handler(req.user.id, req.body));
    } catch (error) {
      // Never expose/log titles, amounts, journal values, JSON state or DB errors.
      res.status(error.notificationIssue ? error.status : 503).json({
        code: error.notificationIssue ? error.code : 'NOTIFICATIONS_UNAVAILABLE',
        error: error.notificationIssue ? error.message : 'Notifications could not be loaded or saved. Try refreshing.',
      });
    }
  };
  router.get('/', respond(handlers.list));
  router.get('/preferences', respond(handlers.preferences));
  router.post('/actions', respond(handlers.actions));
  router.put('/preferences', respond(handlers.updatePreferences));
  router.use((error, _req, res, _next) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({ code: 'INVALID_REQUEST', error: 'Invalid notification request.' }));
  return router;
}

export default createNotificationsRouter;
