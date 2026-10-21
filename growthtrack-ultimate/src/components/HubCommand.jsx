import React from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { formatDate, formatNumber } from '../utils/userFormatters';

export default function HubCommand({ notificationState }) {
  const user = useStore(state => state.user);
  const serverStatus = useStore(state => state.serverStatus);
  const hasFeed = Boolean(notificationState?.hasLoaded && !notificationState?.error);
  const unread = hasFeed ? Math.max(0, Number(notificationState.unreadCount) || 0) : null;
  const reminders = hasFeed && Array.isArray(notificationState.notifications)
    ? notificationState.notifications.filter(item => !item.read && !item.dismissed) : [];
  const connectionLabel = serverStatus === 'online' ? 'Connected' : serverStatus === 'offline' ? 'Unavailable' : 'Checking';
  const feedLabel = notificationState?.enabled === false ? 'Paused'
    : notificationState?.error ? 'Could not load'
      : notificationState?.loading ? 'Loading'
        : hasFeed ? 'Loaded' : 'Not loaded';
  const focus = serverStatus === 'offline' ? {
    title: 'Review connection status',
    description: 'The application server is unavailable. Previously loaded records may still be visible.',
    label: 'Open diagnostics', href: featurePath('help', 'diagnostics'),
  } : unread ? {
    title: formatNumber(unread, user, { maximumFractionDigits: 0 }) + ' unread reminder' + (unread === 1 ? '' : 's'),
    description: 'Review reminders in their owning module before taking action.',
    label: 'Review reminders', href: featurePath('notifications', 'unread'),
  } : {
    title: 'Choose where to work next',
    description: 'Open a module or review your account settings.',
    label: 'Find a module', href: featurePath('apps', 'modules'),
  };

  return <section className="module-page editorial-overview editorial-overview--hub" aria-labelledby="hub-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Hub / Overview</p><h1 id="hub-title">Your operating center</h1>
        <p className="editorial-overview__subtitle">Connection status, reminders, and the tools that own them.</p></div>
      <p className="editorial-overview__asof">Current workspace</p>
    </header>
    <section className="editorial-overview__lead" aria-labelledby="hub-next-title">
      <div><p className="editorial-overview__eyebrow">Next useful action</p><h2 id="hub-next-title">{focus.title}</h2><p>{focus.description}</p>
        <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<span aria-hidden="true"> →</span></Link></div>
      <div className="editorial-overview__lead-note"><span className="editorial-overview__note-label">Service state</span>
        <p>Application server · <strong>{connectionLabel}</strong></p>
        <p>Reminders · <strong>{feedLabel}</strong></p></div>
    </section>
    <dl className="editorial-overview__facts" aria-label="Hub status summary">
      <div><dt>Application server</dt><dd>{connectionLabel}</dd></div>
      <div><dt>Unread reminders</dt><dd>{unread === null ? '—' : formatNumber(unread, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Reminder feed</dt><dd>{feedLabel}</dd></div>
    </dl>
    <div className="editorial-overview__lower">
      <section className="editorial-overview__section" aria-labelledby="hub-reminders-title">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">Freshness</p><h2 id="hub-reminders-title">Reminders to review</h2></div>
          <Link to={featurePath('notifications')}>All reminders</Link></div>
        {notificationState?.error ? <p className="editorial-overview__empty">Reminders could not be loaded. Open Notifications to retry.</p>
          : notificationState?.enabled === false ? <p className="editorial-overview__empty">In-app reminders are paused for this account.</p>
            : !hasFeed ? <p className="editorial-overview__empty">{notificationState?.loading ? 'Loading reminders…' : 'Reminders have not loaded yet.'}</p>
              : reminders.length ? <ol className="editorial-overview__activity">{reminders.slice(0, 4).map((item, index) => <li key={item.id ?? index}>
                <Link to={item.href || featurePath('notifications')}>{item.title || 'Untitled reminder'}</Link>
                <span>{item.dueDate ? 'Due ' + formatDate(item.dueDate, user) : 'Due date unavailable'}</span>
              </li>)}</ol> : <p className="editorial-overview__empty">No unread reminders from the loaded feed.</p>}
        <p className="editorial-overview__footnote">For recent server activity, <Link to={featurePath('logs', 'activity')}>open activity logs</Link>.</p>
      </section>
      <nav className="editorial-overview__section" aria-label="Hub destinations">
        <p className="editorial-overview__eyebrow">Continue in</p><h2>Tools &amp; settings</h2>
        <ul className="editorial-overview__links">
          <li><Link to={featurePath('apps', 'modules')}>All modules <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('profile', 'integrations')}>Connections <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('notifications')}>Notifications <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('ai')}>Agents <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('databases')}>Databases <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('help')}>Helpdesk <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('logs', 'activity')}>Activity logs <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('about')}>About <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('pricing')}>Plans <span aria-hidden="true">↗</span></Link></li>
        </ul>
      </nav>
    </div>
  </section>;
}
