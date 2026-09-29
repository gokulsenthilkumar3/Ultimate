import React from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { localDateKey } from '../lib/metricSeries';
import { formatDate, formatNumber } from '../utils/userFormatters';

const EMPTY = Object.freeze([]);
const asList = value => Array.isArray(value) ? value : EMPTY;
const isDone = task => Boolean(task?.completed || task?.done || ['done', 'completed'].includes(String(task?.status || '').toLowerCase()));
const dateKey = value => {
  const key = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(key)) ? key : '';
};
const taskDate = task => dateKey(task?.dueDate || task?.due_date);
const taskPriority = task => ['p1', 'urgent', 'high'].includes(String(task?.priority || '').toLowerCase()) ? 0 : 1;
const completedDate = task => task?.completedAt || task?.completed_at;

export default function Overview() {
  const user = useStore(state => state.user);
  const habits = asList(useStore(state => state.habits));
  const goals = asList(useStore(state => state.goals));
  const metrics = asList(useStore(state => state.metric_logs));
  const sleep = asList(useStore(state => state.sleep_logs));
  const habitLogs = useStore(state => state.habitLogsByHabit) || {};
  const taskSource = user?.tasks;
  const tasks = Array.isArray(taskSource) ? taskSource : Object.values(taskSource || {}).flatMap(asList);
  const today = localDateKey(new Date());
  const pending = tasks.filter(task => task && !isDone(task))
    .sort((a, b) => (taskDate(a) || '9999').localeCompare(taskDate(b) || '9999') || taskPriority(a) - taskPriority(b));
  const due = pending.filter(task => taskDate(task) && taskDate(task) <= today);
  const checked = habits.filter(habit => (habit.completed_dates || []).includes(today)
    || (habitLogs[habit.id] || []).some(log => dateKey(log.date) === today && log.completed !== false)).length;
  const activeGoals = goals.filter(goal => String(goal?.status).toLowerCase() === 'active');
  const nextHabit = habits.find(habit => !(habit.completed_dates || []).includes(today)
    && !(habitLogs[habit.id] || []).some(log => dateKey(log.date) === today && log.completed !== false));
  const focus = due[0] ? {
    title: due[0].title || due[0].name || 'Untitled task',
    description: taskDate(due[0]) < today ? 'This task is overdue.' : 'This task is due today.',
    label: 'Open tasks', href: featurePath('tasks'),
  } : pending[0] ? {
    title: pending[0].title || pending[0].name || 'Untitled task',
    description: taskDate(pending[0]) ? 'Due ' + formatDate(taskDate(pending[0]), user) + '.' : 'A task waiting in your list.',
    label: 'Open tasks', href: featurePath('tasks'),
  } : nextHabit ? {
    title: nextHabit.name || nextHabit.title || 'Review a habit',
    description: 'No check-off is recorded for this habit today.',
    label: 'Open today’s habits', href: featurePath('habits', 'today'),
  } : activeGoals[0] ? {
    title: activeGoals[0].title || activeGoals[0].name || 'Review an active goal',
    description: 'Review the next step in Goals.',
    label: 'Open goals', href: featurePath('goals', 'active'),
  } : {
    title: 'Start with one task',
    description: 'Add a task to give this overview a useful starting point.',
    label: 'Open tasks', href: featurePath('tasks'),
  };
  const activity = [
    ...tasks.filter(isDone).map(task => ({
      key: 'task-' + task.id, title: 'Completed ' + (task.title || task.name || 'a task'),
      date: completedDate(task), href: featurePath('tasks'),
    })),
    ...metrics.map((log, index) => ({
      key: 'metric-' + (log.id ?? index), title: 'Measurement dated',
      date: log.date, href: featurePath('physique', 'history'),
    })),
    ...sleep.map((log, index) => ({
      key: 'sleep-' + (log.id ?? index), title: 'Sleep entry dated',
      date: log.date, href: featurePath('sleep', 'history'),
    })),
  ].filter(item => dateKey(item.date)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);

  return <section className="module-page editorial-overview editorial-overview--insights" aria-labelledby="insights-overview-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Insights / Overview</p><h1 id="insights-overview-title">Your day, in focus</h1>
        <p className="editorial-overview__subtitle">A clear view of saved work and wellness records.</p></div>
      <p className="editorial-overview__asof">As of {formatDate(today, user, { style: 'long', weekday: true })}</p>
    </header>
    <section className="editorial-overview__lead" aria-labelledby="insights-next-title">
      <div><p className="editorial-overview__eyebrow">Next useful action</p><h2 id="insights-next-title">{focus.title}</h2><p>{focus.description}</p>
        <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<span aria-hidden="true"> →</span></Link></div>
      <div className="editorial-overview__lead-note"><span className="editorial-overview__note-label">On the record</span>
        <p>{due.length ? formatNumber(due.length, user, { maximumFractionDigits: 0 }) + ' task' + (due.length === 1 ? '' : 's') + ' due or overdue' : 'No tasks due or overdue today'}</p>
        <p>{formatNumber(checked, user, { maximumFractionDigits: 0 })} of {formatNumber(habits.length, user, { maximumFractionDigits: 0 })} habits checked today</p></div>
    </section>
    <dl className="editorial-overview__facts" aria-label="Saved record summary">
      <div><dt>Open tasks</dt><dd>{formatNumber(pending.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Active goals</dt><dd>{formatNumber(activeGoals.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Saved measurements</dt><dd>{formatNumber(metrics.length, user, { maximumFractionDigits: 0 })}</dd></div>
    </dl>
    <div className="editorial-overview__lower">
      <section className="editorial-overview__section" aria-labelledby="insights-activity-title">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">Freshness</p><h2 id="insights-activity-title">Latest dated activity</h2></div>
          <Link to={featurePath('analytics')}>Explore analytics</Link></div>
        {activity.length ? <ol className="editorial-overview__activity">{activity.map(item => <li key={item.key}><Link to={item.href}>{item.title}</Link><time dateTime={item.date}>{formatDate(item.date, user)}</time></li>)}</ol>
          : <p className="editorial-overview__empty">No dated completions or wellness entries yet. Records appear here after you save them.</p>}
      </section>
      <nav className="editorial-overview__section" aria-label="Insight destinations">
        <p className="editorial-overview__eyebrow">Continue in</p><h2>Owning modules</h2>
        <ul className="editorial-overview__links">
          <li><Link to={featurePath('actions')}>Action Center <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('tasks')}>Tasks <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('habits', 'today')}>Habits <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('goals', 'active')}>Goals <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('training', 'logger')}>Training <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('physique', '3d')}>Body model <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('finance')}>Finance <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('portfolio')}>Portfolio <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('profile')}>Profile <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('ai')}>Agents <span aria-hidden="true">↗</span></Link></li>
        </ul>
      </nav>
    </div>
  </section>;
}
