import React from 'react';
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, ClipboardList, Droplets, Dumbbell, HeartPulse, Leaf, Moon, Ruler, Smile, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { datedLogs, finiteMetric, localDateKey } from '../lib/metricSeries';
import { formatDate, formatNumber } from '../utils/userFormatters';
import '../domains/wellness/wellness-command.css';

const EMPTY = Object.freeze([]);
const MOOD_NAMES = { 1: 'Rough', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Excellent' };
const SHORTCUTS = [
  ['sleep', 'log', 'Log sleep', 'Rest & sleep history', Moon, 'lilac'],
  ['mind', 'checkin', 'Mood check-in', 'A moment to reflect', Smile, 'yellow'],
  ['habits', 'today', 'Today’s habits', 'Your daily check-offs', Check, 'mint'],
  ['training', 'logger', 'Log a workout', 'Sessions & training', Dumbbell, 'coral'],
  ['nutrition', 'daily', 'Nutrition', 'Meals & daily entries', Utensils, 'yellow'],
  ['hydration', 'today', 'Hydration', 'Water intake & history', Droplets, 'lilac'],
  ['medical', 'vitals', 'Medical records', 'Vitals & medications', HeartPulse, 'coral'],
  ['physique', 'measurements', 'Body measurements', 'Measurements & history', Ruler, 'mint'],
  ['lifestyle', 'routines', 'Lifestyle', 'Routines & preferences', Leaf, 'mint'],
  ['health', 'senses', 'Health+', 'Senses & recovery', Activity, 'lilac'],
  ['strength', 'log', 'Strength', 'Lifts & progression', Dumbbell, 'coral'],
  ['assessment', 'questionnaire', 'Assessment', 'Questionnaire & results', ClipboardList, 'yellow'],
];

// A decorative landscape, independent of the user's records or health state.
function WellnessStillLife() {
  return <svg className="wellness-still-life" viewBox="0 0 184 168" width="184" height="168" fill="none" aria-hidden="true" focusable="false">
    <path d="M25 141V76a67 67 0 0 1 134 0v65" fill="var(--gt-character-mint)" fillOpacity=".35" stroke="currentColor" strokeOpacity=".24" strokeWidth="1.4" />
    <circle cx="112" cy="55" r="20" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="1.4" />
    <path d="M25 112c29-30 42-30 67-5s43 26 67-3v37H25v-29Z" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="1.4" />
    <path d="M25 132c30 8 53-25 85-18s31 17 49 14v13H25v-9Z" fill="var(--gt-surface)" stroke="currentColor" strokeWidth="1.4" />
    <path d="M14 142h156m-16-72 6-5m-1 17h8M39 37l-4-6m10-8-1-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M51 141V89m0 23c-16 0-24-9-21-21 15-1 22 8 21 21Zm0 13c16-1 24-9 21-21-15 0-22 8-21 21Z" fill="var(--gt-character-lilac)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M116 136c0-11 9-20 20-20s20 9 20 20" fill="var(--gt-character-coral)" stroke="currentColor" strokeWidth="1.4" />
    <path d="M105 150h51m-118 7h63" stroke="currentColor" strokeOpacity=".18" strokeLinecap="round" />
  </svg>;
}

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

  return <section className="module-page editorial-overview editorial-overview--wellness wellness-overview" aria-labelledby="wellness-title">
    <header className="wellness-overview__header">
      <div><p className="wellness-overview__eyebrow">Wellness / Overview</p><h1 id="wellness-title">Wellness, at your pace.</h1>
        <p className="wellness-overview__subtitle">Your sleep, mood and habits. A little space to see where you are.</p></div>
      <p className="wellness-overview__date"><CalendarDays size={16} aria-hidden="true" /><span>Today · <time dateTime={today}>{formatDate(today, user)}</time></span></p>
    </header>
    <div className="wellness-overview__today">
      <section className="wellness-focus" data-area-motion="card" aria-labelledby="wellness-next-title">
        <div className="wellness-focus__copy"><p className="wellness-overview__eyebrow">A place to begin</p><h2 id="wellness-next-title">{focus.title}</h2><p>{focus.description}</p>
          <div className="wellness-focus__actions">{canCheckIn ? <><button className="wellness-overview__primary" type="button" onClick={onOpenCheckIn}>{focus.label}<ArrowRight size={17} aria-hidden="true" /></button>
            {typeof onDismissCheckIn === 'function' && <button className="wellness-overview__secondary" type="button" onClick={onDismissCheckIn}>Not today</button>}</>
            : <Link className="wellness-overview__primary" to={focus.href}>{focus.label}<ArrowRight size={17} aria-hidden="true" /></Link>}</div></div>
        <WellnessStillLife />
      </section>
      <section className="wellness-habits" data-area-motion="metric" aria-labelledby="wellness-habits-title">
        <div className="wellness-habits__heading"><h2 id="wellness-habits-title">Habits today</h2><Check size={18} aria-hidden="true" /></div>
        <p className="wellness-habits__count"><strong>{formatNumber(checkedOff, user, { maximumFractionDigits: 0 })}</strong>{habits.length > 0 && <span> / {formatNumber(habits.length, user, { maximumFractionDigits: 0 })}</span>}</p>
        <p className="wellness-habits__checkoffs">{formatNumber(checkedOff, user, { maximumFractionDigits: 0 })} recorded check-offs</p>
        <p className="wellness-habits__context">{formatNumber(habits.length, user, { maximumFractionDigits: 0 })} habits tracked · {formatDate(today, user)}</p>
        <Link className="wellness-overview__text-link" to={featurePath('habits', 'today')}>{habits.length ? 'Review today’s habits' : 'Set up your first habit'}<ArrowRight size={15} aria-hidden="true" /></Link>
      </section>
    </div>
    <dl className="wellness-records" aria-label="Wellness record summary">
      <div className="wellness-records__item" data-tone="lilac" data-area-motion="metric"><dt><Moon size={17} aria-hidden="true" />Latest sleep</dt><dd><span className="wellness-records__value">{latestSleep ? formatNumber(latestSleep.duration ?? latestSleep.hours, user) + ' hours' : 'Not recorded'}</span>
        <p>{latestSleep ? 'Recorded for ' + formatDate(latestSleep.date, user) : 'No dated sleep entries.'}</p><Link to={featurePath('sleep', latestSleep ? 'history' : 'log')}>{latestSleep ? 'Sleep history' : 'Add a sleep entry'}<ArrowUpRight size={14} aria-hidden="true" /></Link></dd></div>
      <div className="wellness-records__item" data-tone="yellow" data-area-motion="metric"><dt><Smile size={17} aria-hidden="true" />Latest mood</dt><dd><span className="wellness-records__value">{latestMood ? MOOD_NAMES[Number(latestMood.mood)] : 'Not recorded'}</span>
        <p>{latestMood ? 'Recorded for ' + formatDate(latestMood.date, user) : 'No dated mood check-ins.'}</p><Link to={featurePath('mind', latestMood ? 'trends' : 'checkin')}>{latestMood ? 'Mood trends' : 'Record how you feel'}<ArrowUpRight size={14} aria-hidden="true" /></Link></dd></div>
      <div className="wellness-records__item" data-tone="mint" data-area-motion="metric"><dt><ClipboardList size={17} aria-hidden="true" />Sleep entries</dt><dd><span className="wellness-records__value">{formatNumber(sleep.length, user, { maximumFractionDigits: 0 })}</span>
        <p>In your saved sleep record</p><Link to={featurePath('sleep', 'history')}>View sleep record<ArrowUpRight size={14} aria-hidden="true" /></Link></dd></div>
      <div className="wellness-records__item" data-tone="coral" data-area-motion="metric"><dt><Activity size={17} aria-hidden="true" />Health metrics</dt><dd><span className="wellness-records__value">{formatNumber(metrics.length, user, { maximumFractionDigits: 0 })}</span>
        <p>In your saved metric record</p><Link to={featurePath('physique', 'history')}>Measurement history<ArrowUpRight size={14} aria-hidden="true" /></Link></dd></div>
    </dl>
    <div className="wellness-overview__lower">
      <nav className="wellness-modules" aria-label="Wellness shortcuts">
        <div className="wellness-overview__section-heading"><div><p className="wellness-overview__eyebrow">Your toolkit</p><h2 id="wellness-modules-title">Make room for wellness</h2></div><span>Record or review</span></div>
        <ul className="wellness-modules__grid">{SHORTCUTS.map(([id, view, label, description, Icon, tone]) => <li key={id} data-area-motion="card"><Link to={featurePath(id, view)} aria-label={label} data-tone={tone}><span className="wellness-modules__icon"><Icon size={19} strokeWidth={1.6} aria-hidden="true" /></span><span className="wellness-modules__copy"><strong>{label}</strong><small>{description}</small></span><ArrowUpRight className="wellness-modules__arrow" size={15} aria-hidden="true" /></Link></li>)}</ul>
      </nav>
      <section className="wellness-activity" data-area-motion="card" aria-labelledby="wellness-activity-title">
        <div className="wellness-overview__section-heading"><div><p className="wellness-overview__eyebrow">Your record</p><h2 id="wellness-activity-title">Latest dated records</h2></div></div>
        {activity.length ? <ol className="wellness-activity__list">{activity.map(item => <li key={item.key}><Link to={item.href}><span className="wellness-activity__dot" aria-hidden="true" /><span><strong>{item.title}</strong><time dateTime={item.date}>{formatDate(item.date, user)}</time></span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>)}</ol>
          : <div className="wellness-activity__empty"><span className="wellness-activity__empty-icon"><ClipboardList size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>Your record starts here</h3><p>No dated wellness records yet. Your saved entries will appear here.</p><Link className="wellness-overview__text-link" to={featurePath('sleep', 'log')}>Record your first night<ArrowRight size={15} aria-hidden="true" /></Link></div>}
        <p className="wellness-activity__note">Sleep, mood and measurement entries, ordered by their recorded date.</p>
      </section>
    </div>
  </section>;
}
