import React from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { datedLogs, finiteMetric, localDateKey } from '../lib/metricSeries';
import { formatDate, formatNumber } from '../utils/userFormatters';

const EMPTY = Object.freeze([]);
const MOOD_NAMES = { 1: 'Rough', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Excellent' };
const SHORTCUTS = [
  ['sleep', 'log', 'Log sleep'], ['mind', 'checkin', 'Mood check-in'], ['habits', 'today', 'Today’s habits'],
  ['training', 'logger', 'Log a workout'], ['nutrition', 'daily', 'Nutrition'], ['hydration', 'today', 'Hydration'],
  ['medical', 'vitals', 'Medical records'], ['physique', 'measurements', 'Body measurements'],
  ['lifestyle', 'routines', 'Lifestyle'], ['health', 'senses', 'Health+'],
  ['strength', 'log', 'Strength'], ['assessment', 'questionnaire', 'Assessment'],
];

export default function WellnessCommand({ user: suppliedUser, onOpenCheckIn, onDismissCheckIn, checkInAvailable = false }) {
  const storedUser = useStore(state => state.user);
  const user = suppliedUser || storedUser;
  const habits = useStore(state => state.habits) || EMPTY;
  const sleep = useStore(state => state.sleep_logs) || EMPTY;
  const moods = useStore(state => state.moodLogs) || EMPTY;
  const metrics = useStore(state => state.metric_logs) || EMPTY;
  const habitLogs = useStore(state => state.habitLogsByHabit) || {};
  const today = localDateKey(new Date());
  const latestSleep = datedLogs(sleep).filter(log => {
    const hours = finiteMetric(log.duration ?? log.hours);
    return hours !== null && hours > 0 && hours <= 24;
  }).at(-1);
  const latestMood = datedLogs(moods).filter(log => MOOD_NAMES[Number(log.mood)]).at(-1);
  const checkedOff = habits.filter(habit => (habit.completed_dates || []).includes(today)
    || (habitLogs[habit.id] || []).some(log => log.date === today && log.completed !== false)).length;
  const canCheckIn = Boolean(checkInAvailable && typeof onOpenCheckIn === 'function');
  const focus = canCheckIn ? {
    title: 'Make today’s check-in',
    description: 'The daily check-in is available now.',
    label: 'Open daily check-in', href: null,
  } : habits.length > checkedOff ? {
    title: 'Review today’s habits',
    description: String(habits.length - checkedOff) + ' tracked habit' + (habits.length - checkedOff === 1 ? '' : 's') + ' without a check-off today.',
    label: 'Open habits', href: featurePath('habits', 'today'),
  } : !latestSleep ? {
    title: 'Record your sleep',
    description: 'No dated sleep entry is available in your records.',
    label: 'Log sleep', href: featurePath('sleep', 'log'),
  } : !latestMood ? {
    title: 'Make a mood check-in',
    description: 'No dated mood check-in is available in your records.',
    label: 'Mood check-in', href: featurePath('mind', 'checkin'),
  } : {
    title: 'Review your wellness record',
    description: 'See your latest observations and choose what to record next.',
    label: 'Open sleep history', href: featurePath('sleep', 'history'),
  };
  const activity = [
    ...sleep.map((log, index) => ({ key: 'sleep-' + (log.id ?? index), title: 'Sleep entry', date: log.date, href: featurePath('sleep', 'history') })),
    ...moods.map((log, index) => ({ key: 'mood-' + (log.id ?? index), title: 'Mood check-in', date: log.date, href: featurePath('mind', 'trends') })),
    ...metrics.map((log, index) => ({ key: 'metric-' + (log.id ?? index), title: 'Health metric', date: log.date, href: featurePath('physique', 'history') })),
  ].filter(item => typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date) && Number.isFinite(Date.parse(item.date)))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return <section className="module-page editorial-overview editorial-overview--wellness" aria-labelledby="wellness-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Wellness / Overview</p><h1 id="wellness-title">Wellness, on the record</h1>
        <p className="editorial-overview__subtitle">Sleep, mood, and habits from your saved entries.</p></div>
      <p className="editorial-overview__asof">Today · {formatDate(today, user)}</p>
    </header>
    <section className="editorial-overview__lead" aria-labelledby="wellness-next-title">
      <div><p className="editorial-overview__eyebrow">Next useful action</p><h2 id="wellness-next-title">{focus.title}</h2><p>{focus.description}</p>
        {canCheckIn ? <><button className="editorial-overview__primary" type="button" onClick={onOpenCheckIn}>{focus.label}<span aria-hidden="true"> →</span></button>
          {typeof onDismissCheckIn === 'function' && <button className="editorial-overview__secondary" type="button" onClick={onDismissCheckIn}>Not today</button>}</>
          : <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<span aria-hidden="true"> →</span></Link>}</div>
      <dl className="editorial-overview__observations">
        <div><dt>Latest sleep</dt><dd>{latestSleep ? formatNumber(latestSleep.duration ?? latestSleep.hours, user) + ' hours' : 'Not recorded'}</dd>
          <p>{latestSleep ? 'Recorded for ' + formatDate(latestSleep.date, user) : 'No dated sleep entries.'}</p></div>
        <div><dt>Latest mood</dt><dd>{latestMood ? MOOD_NAMES[Number(latestMood.mood)] : 'Not recorded'}</dd>
          <p>{latestMood ? 'Recorded for ' + formatDate(latestMood.date, user) : 'No dated mood check-ins.'}</p></div>
      </dl>
    </section>
    <dl className="editorial-overview__facts" aria-label="Wellness record summary">
      <div><dt>Habits today</dt><dd>{formatNumber(checkedOff, user, { maximumFractionDigits: 0 })} recorded check-offs</dd>
        <p>{formatNumber(habits.length, user, { maximumFractionDigits: 0 })} habits tracked · {formatDate(today, user)}</p></div>
      <div><dt>Sleep entries</dt><dd>{formatNumber(sleep.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Health metrics</dt><dd>{formatNumber(metrics.length, user, { maximumFractionDigits: 0 })}</dd></div>
    </dl>
    <div className="editorial-overview__lower">
      <section className="editorial-overview__section" aria-labelledby="wellness-activity-title">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">Freshness</p><h2 id="wellness-activity-title">Latest dated records</h2></div>
          <Link to={featurePath('physique', 'history')}>Measurement history</Link></div>
        {activity.length ? <ol className="editorial-overview__activity">{activity.map(item => <li key={item.key}><Link to={item.href}>{item.title}</Link><time dateTime={item.date}>{formatDate(item.date, user)}</time></li>)}</ol>
          : <p className="editorial-overview__empty">No dated wellness records yet. Your saved entries will appear here.</p>}
      </section>
      <nav className="editorial-overview__section" aria-label="Wellness shortcuts">
        <p className="editorial-overview__eyebrow">Record in</p><h2>Wellness modules</h2>
        <ul className="editorial-overview__links">{SHORTCUTS.map(([id, view, label]) => <li key={id}><Link to={featurePath(id, view)}>{label}<span aria-hidden="true">↗</span></Link></li>)}</ul>
      </nav>
    </div>
  </section>;
}
