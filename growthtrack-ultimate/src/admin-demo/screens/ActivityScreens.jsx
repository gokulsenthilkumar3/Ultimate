import React, { useState } from 'react';
import { Badge, Button, Empty, Panel, RecordsTable } from '../components';
import { SAMPLE_LOGS, SAMPLE_NOTIFICATIONS } from '../models/activityModel';

export function NotificationsScreen({ view, nav, openRecord, notifications, onNotificationsChange, notificationPreferences, onNotificationPreferencesChange }) {
  const [local, setLocal] = useState(() => [...SAMPLE_NOTIFICATIONS]), [localPreferences, setLocalPreferences] = useState({ email: false, reminders: true });
  const records = notifications || local, update = onNotificationsChange || setLocal;
  const preferences = notificationPreferences || localPreferences, updatePreferences = onNotificationPreferencesChange || setLocalPreferences;
  const filtered = view === 'all' ? records : records.filter(row => !row.read);
  const mark = (id, read) => update(records.map(row => row.id === id ? { ...row, read } : row));
  if (view === 'preferences') return <Panel title="Notification preferences" subtitle="Local preference preview; no email or device service is contacted."><div className="settings-section">{[['reminders', 'Workspace reminders'], ['email', 'Email summaries']].map(([key, label]) => <label key={key} className="setting-row"><span><strong>{label}</strong><small>Kept for this demo session.</small></span><input type="checkbox" checked={preferences[key]} onChange={event => updatePreferences({ ...preferences, [key]: event.target.checked })} /></label>)}</div></Panel>;
  return <Panel title={view === 'all' ? 'All notifications' : 'Unread notifications'} subtitle="Opening or marking a sample notification updates its local read state." action={<Button disabled={!records.some(row => !row.read)} onClick={() => update(records.map(row => ({ ...row, read: true })))}>Mark all as read</Button>}>
    {filtered.length ? <div className="notification-list">{filtered.map(row => <article className="notification-row" key={row.id}><button className="notification-content" onClick={() => { mark(row.id, true); openRecord({ ...row, type: 'Sample notification' }); }}><strong>{row.title}</strong><span>{row.text}</span><small>{row.time} ago</small></button><Badge tone={row.read ? 'neutral' : 'blue'}>{row.read ? 'Read' : 'Unread'}</Badge><Button aria-label={`Mark ${row.title} as ${row.read ? 'unread' : 'read'}`} onClick={() => mark(row.id, !row.read)}>{row.read ? 'Mark unread' : 'Mark read'}</Button></article>)}</div> : <Empty title="You’re all caught up" description="There are no unread sample notifications." actionLabel="View all notifications" onReset={() => nav('notifications', 'all')} />}
  </Panel>;
}

export function LogsScreen({ view }) {
  const kind = Object.hasOwn(SAMPLE_LOGS, view) ? view : 'activity';
  const common = [{ key: 'id', label: 'Event' }, { key: 'title', label: 'Activity' }];
  const fields = kind === 'authentication' ? [{ key: 'account', label: 'Sample account' }, { key: 'method', label: 'Method' }, { key: 'scope', label: 'Scope' }] : kind === 'sync' ? [{ key: 'source', label: 'Source' }, { key: 'direction', label: 'Direction' }] : [{ key: 'actor', label: 'Actor' }, { key: 'product', label: 'Product' }, { key: 'target', label: 'Record' }];
  return <Panel title={kind === 'authentication' ? 'Authentication events' : kind === 'sync' ? 'Sync events' : 'Workspace activity'} subtitle="Read-only fixtures demonstrating this event schema. No real audit stream is connected." provenance="Read-only sample"><RecordsTable label={`${kind} sample log`} rows={SAMPLE_LOGS[kind]} columns={[...common, ...fields, { key: 'time', label: 'Time' }, { key: 'result', label: 'Result', render: row => <Badge>{row.result}</Badge> }]} searchPlaceholder="Search sample events…" /></Panel>;
}
