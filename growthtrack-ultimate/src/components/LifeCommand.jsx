import React from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { formatDate, formatNumber } from '../utils/userFormatters';

const EMPTY = Object.freeze([]);
const asList = value => Array.isArray(value) ? value : EMPTY;
const dateKey = value => {
  const key = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(key)) ? key : '';
};

export default function LifeCommand() {
  const user = useStore(state => state.user);
  const media = asList(useStore(state => state.entertainment?.media));
  const profiles = asList(useStore(state => state.socialProfiles));
  const watching = media.filter(item => String(item?.status || '').toLowerCase() === 'watching');
  const planned = media.filter(item => String(item?.status || '').toLowerCase() === 'plan to watch');
  const queue = [...watching, ...planned];
  const nextTitle = watching[0] || planned[0];
  const focus = nextTitle ? {
    title: nextTitle.title || nextTitle.name || 'An untitled library item',
    description: watching.length ? 'Marked Watching in your library.' : 'Marked Plan to Watch in your library.',
    label: 'Open library', href: featurePath('entertainment', 'library'),
  } : {
    title: 'Start a personal queue',
    description: 'Add a title to your library and mark it Plan to Watch.',
    label: 'Open library', href: featurePath('entertainment', 'library'),
  };
  const activity = [
    ...media.map((item, index) => ({
      key: 'media-' + (item.id ?? index), title: (item.updatedAt || item.updated_at ? 'Updated ' : 'Saved ') + (item.title || item.name || 'an untitled title'),
      date: item.updatedAt || item.updated_at || item.createdAt || item.created_at, href: featurePath('entertainment', 'library'),
    })),
    ...profiles.map((profile, index) => ({
      key: 'profile-' + (profile.id ?? profile.provider ?? index), title: 'Social profile · ' + (profile.provider || 'saved link'),
      date: profile.updatedAt || profile.updated_at || profile.createdAt || profile.created_at, href: featurePath('social', 'profiles'),
    })),
  ].filter(item => dateKey(item.date)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);

  return <section className="module-page editorial-overview editorial-overview--life" aria-labelledby="life-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Life / Overview</p><h1 id="life-title">Room for the rest of life</h1>
        <p className="editorial-overview__subtitle">Your library and profile records, with a path to places.</p></div>
      <p className="editorial-overview__asof">Personal records</p>
    </header>
    <section className="editorial-overview__lead" aria-labelledby="life-next-title">
      <div><p className="editorial-overview__eyebrow">Next useful action</p><h2 id="life-next-title">{focus.title}</h2><p>{focus.description}</p>
        <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<span aria-hidden="true"> →</span></Link></div>
      <div className="editorial-overview__lead-note"><span className="editorial-overview__note-label">In your queue</span>
        {queue.length ? <ul className="editorial-overview__compact-list">{queue.slice(0, 2).map((item, index) => <li key={item.id ?? index}>{item.title || item.name || 'Untitled title'}<span>{item.status}</span></li>)}</ul>
          : <p>No planned or in-progress titles saved.</p>}</div>
    </section>
    <dl className="editorial-overview__facts" aria-label="Life record summary">
      <div><dt>In your queue</dt><dd>{formatNumber(queue.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Saved titles</dt><dd>{formatNumber(media.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Saved profile links</dt><dd>{formatNumber(profiles.length, user, { maximumFractionDigits: 0 })}</dd></div>
    </dl>
    <div className="editorial-overview__lower">
      <section className="editorial-overview__section" aria-labelledby="life-activity-title">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">Freshness</p><h2 id="life-activity-title">Latest dated changes</h2></div>
          <Link to={featurePath('entertainment', 'library')}>View library</Link></div>
        {activity.length ? <ol className="editorial-overview__activity">{activity.map(item => <li key={item.key}><Link to={item.href}>{item.title}</Link><time dateTime={item.date}>{formatDate(item.date, user)}</time></li>)}</ol>
          : <p className="editorial-overview__empty">No dated library or profile updates to show yet.</p>}
      </section>
      <nav className="editorial-overview__section" aria-label="Life destinations">
        <p className="editorial-overview__eyebrow">Continue in</p><h2>Your life modules</h2>
        <ul className="editorial-overview__links">
          <li><Link to={featurePath('entertainment', 'library')}>Entertainment <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('social', 'profiles')}>Social profiles <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('maps', 'list')}>Saved places <span aria-hidden="true">↗</span></Link></li>
        </ul>
        <p className="editorial-overview__footnote">Location capture begins only when you choose it in Maps &amp; Places.</p>
      </nav>
    </div>
  </section>;
}
