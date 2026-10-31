import React from 'react';
import { AppWindow, Bot, Bell, Cable, Database, HelpCircle, History, Layers, Settings, ShieldCheck, Users } from 'lucide-react';
import PageArtwork from './motion/PageArtwork';
import usePlayfulMotion from '../hooks/usePlayfulMotion';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { formatDate, formatNumber } from '../utils/userFormatters';

const DESTINATIONS = [
  ['apps', 'modules', 'All modules', 'Find and pin your everyday tools.', AppWindow],
  ['companion', 'all', 'Companion apps', 'Open your connected products.', Layers],
  ['profile', 'integrations', 'Connections', 'Review providers and permissions.', Cable],
  ['notifications', undefined, 'Notifications', 'Read reminders from your modules.', Bell],
  ['ai', undefined, 'Agents', 'Continue with your configured assistant.', Bot],
  ['databases', undefined, 'Databases', 'Explore records and custom tables.', Database],
  ['profile', 'personal', 'Account settings', 'Personal details and appearance.', Settings],
  ['help', undefined, 'Helpdesk', 'Guides and connection diagnostics.', HelpCircle],
  ['logs', 'activity', 'Activity logs', 'Review recorded workspace events.', History],
  ['customers', undefined, 'Customer administration', 'Open supported product admin views.', Users],
  ['about', undefined, 'About', 'Version and workspace capabilities.', ShieldCheck],
  ['pricing', undefined, 'Plans', 'Your deployment and billing availability.', Layers],
];

export default function HubCommand({ notificationState }) {
  const { canAnimate } = usePlayfulMotion();
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

  return <section className="module-page editorial-overview editorial-overview--hub playful-overview" data-playful-motion={String(canAnimate)} aria-labelledby="hub-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Hub / Overview</p><h1 id="hub-title">Your operating center</h1>
        <p className="editorial-overview__subtitle">Connection status, reminders, and the tools that own them.</p></div>
      <PageArtwork />
      <p className="editorial-overview__asof">Current workspace</p>
    </header>
    <section className="editorial-overview__lead" aria-labelledby="hub-next-title">
      <div><p className="editorial-overview__eyebrow">Next useful action</p><h2 id="hub-next-title">{focus.title}</h2><p>{focus.description}</p>
        <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<span aria-hidden="true"> →</span></Link></div>
      <div className="editorial-overview__lead-note hub-service-note"><span className="editorial-overview__note-label">Workspace signals</span>
        <p><span>Application server</span><strong data-service-state={serverStatus}>{connectionLabel}</strong></p>
        <p><span>Reminders</span><strong>{feedLabel}</strong></p>
        <Link to={featurePath('help', 'diagnostics')}>View diagnostics <span aria-hidden="true">↗</span></Link></div>
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
        <ul className="hub-destinations">
          {DESTINATIONS.map(([id, view, label, description, Icon], index) => <li key={id + ':' + (view || '')} data-area-motion="launcher"><Link to={featurePath(id, view)} aria-label={label} aria-describedby={`hub-door-${id}-${view || ''}`}>
            <span className="hub-destination__icon" data-tone={index % 4}>{React.createElement(Icon, { size: 19, 'aria-hidden': true })}</span>
            <span><strong>{label}</strong><small id={`hub-door-${id}-${view || ''}`}>{description}</small></span><span className="hub-destination__arrow" aria-hidden="true">↗</span>
          </Link></li>)}
        </ul>
      </nav>
    </div>
  </section>;
}
