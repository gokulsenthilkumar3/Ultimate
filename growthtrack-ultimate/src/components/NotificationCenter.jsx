import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import Button from './ui/Button';
import Card from './ui/Card';
import PageState from './ui/PageState';

const CATEGORIES = [
  ['tasks', 'Tasks'], ['goals', 'Goals'], ['habits', 'Habits'],
  ['calendar', 'Calendar'], ['subscriptions', 'Financial renewals'],
];

export default function NotificationCenter({ notificationState }) {
  const toast = useToast();
  const [view, setView] = useState('unread');
  const [category, setCategory] = useState('all');
  const [actionError, setActionError] = useState('');
  const state = notificationState || {};
  const { notifications = [], dismissedNotifications = [], unreadCount = 0, preferences, saving, loading, refreshing, error, mutationError } = state;
  const disabled = Boolean(saving || loading || error || !state.hasLoaded);
  const list = (view === 'dismissed' ? dismissedNotifications : notifications)
    .filter(item => view !== 'unread' || !item.read)
    .filter(item => category === 'all' || item.category === category);

  async function perform(action, success) {
    setActionError('');
    try {
      await action();
      if (success) toast.success(success);
    } catch (failure) {
      setActionError(failure.message || 'The change could not be confirmed. Refresh before retrying.');
    }
  }

  if (!notificationState) return <PageState state="unavailable" title="Notifications are unavailable" description="The notification service is not connected." />;
  return <section style={{ maxWidth: 800, marginInline: 'auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div><h1><Bell size={22} aria-hidden="true" /> Notifications</h1>
        <p>{unreadCount} unread reminder{unreadCount === 1 ? '' : 's'} · Stored source records only</p></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        <Button variant="secondary" disabled={refreshing || saving || !state.enabled} onClick={() => perform(state.refresh)}>
          <RefreshCw size={15} aria-hidden="true" /> Refresh notifications
        </Button>
        <Button variant="secondary" disabled={disabled || !unreadCount} onClick={() => perform(state.markAllRead, 'Reminders marked as read.')}>Mark all read</Button>
        <Button variant="secondary" disabled={disabled || !notifications.length} onClick={() => perform(state.clearAll, 'Current reminders dismissed.')}>Dismiss current reminders</Button>
      </div>
    </div>
    {(actionError || mutationError) && <p role="alert">{actionError || mutationError.message}</p>}
    {error && <PageState state="error" title="Notifications could not be loaded" description={error.message} onRetry={() => perform(state.refresh)} />}
    {loading && <PageState state="loading" title="Loading reminders" />}
    {!state.enabled && <p role="status">Notifications are paused for this account. Enable them in Profile &amp; Settings.</p>}
    {preferences && <Card style={{ padding: '1rem' }}>
      <h2>Reminder preferences</h2>
      <p>Changes are shown after the server acknowledges them. Financial renewals start off. Reminders never complete or edit source records.</p>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '.75rem 1.5rem' }}>
        <legend className="sr-only">Reminder preferences</legend>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minHeight: 44 }}>
          <input type="checkbox" checked={preferences.enabled} onChange={event => perform(() => state.updatePreferences({ enabled: event.target.checked }), 'Reminder preference saved.')} />Enable in-app reminders
        </label>
        {CATEGORIES.map(([key, label]) => <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minHeight: 44 }}>
          <input type="checkbox" checked={preferences.categories[key]} onChange={event => perform(() => state.updatePreferences({ categories: { [key]: event.target.checked } }), 'Reminder preference saved.')} />{label}
        </label>)}
      </fieldset>
      {state.timeZone && <small>Due dates use your profile timezone: {state.timeZone}.</small>}
    </Card>}
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {['unread', 'all', 'dismissed'].map(filter => <Button key={filter} variant="secondary" aria-pressed={view === filter} onClick={() => setView(filter)}>{filter[0].toUpperCase() + filter.slice(1)}</Button>)}
      <label>Source <select value={category} onChange={event => setCategory(event.target.value)}>
        <option value="all">All sources</option>{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    {state.hasLoaded && !error && !loading && !list.length && <p role="status">
      {!preferences?.enabled ? 'In-app reminders are paused.' : view === 'dismissed' ? 'No dismissed reminders.' : view === 'unread' ? 'No unread reminders.' : 'No current reminders from the enabled sources.'}
    </p>}
    <div role="list" aria-label="Reminders" aria-busy={saving || loading}>
      {list.map(item => <Card as="article" key={item.id} role="listitem" aria-label={(item.read ? 'Read' : 'Unread') + ' reminder: ' + item.title}
        style={{ marginBlockEnd: '.75rem', padding: '1rem', overflowWrap: 'anywhere' }}>
        <h2 style={{ fontSize: '1rem' }}>{item.title}</h2>
        <p><strong>Due:</strong> <time dateTime={item.dueDate}>{item.dueDate}</time>{item.dueTime ? ' at ' + item.dueTime : ''}</p>
        <p>{item.reason}</p>
        <p><Link to={item.href}>Open source: {item.source.label}</Link></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          {item.dismissed ? <Button variant="secondary" disabled={disabled} onClick={() => perform(() => state.restore(item.id), 'Reminder restored.')}>Restore reminder</Button>
            : <>
              <Button variant="secondary" disabled={disabled} onClick={() => perform(() => item.read ? state.markUnread(item.id) : state.markRead(item.id), item.read ? 'Reminder marked unread.' : 'Reminder marked read.')}>{item.read ? 'Mark unread' : 'Mark as read'}</Button>
              <Button variant="secondary" disabled={disabled} onClick={() => perform(() => state.dismiss(item.id), 'Reminder dismissed.')}>Dismiss reminder</Button>
            </>}
        </div>
      </Card>)}
    </div>
  </section>;
}
