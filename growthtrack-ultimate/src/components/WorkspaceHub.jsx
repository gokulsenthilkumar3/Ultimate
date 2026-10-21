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

export default function WorkspaceHub() {
  const user = useStore(state => state.user);
  const notes = asList(useStore(state => state.notes));
  const taskSource = user?.tasks;
  const tasks = Array.isArray(taskSource) ? taskSource : Object.values(taskSource || {}).flatMap(asList);
  const projects = asList(user?.manualProjects);
  const pending = tasks.filter(task => task && !isDone(task))
    .sort((a, b) => (dateKey(a.dueDate || a.due_date) || '9999').localeCompare(dateKey(b.dueDate || b.due_date) || '9999'));
  const today = localDateKey(new Date());
  const due = pending.filter(task => {
    const date = dateKey(task.dueDate || task.due_date);
    return date && date <= today;
  });
  const activeProject = projects.find(project => String(project?.status || '').toLowerCase() === 'active');
  const focus = due[0] ? {
    title: due[0].title || due[0].name || 'Untitled task',
    description: dateKey(due[0].dueDate || due[0].due_date) < today ? 'This task is overdue.' : 'This task is due today.',
    label: 'Open tasks', href: featurePath('tasks'),
  } : pending[0] ? {
    title: pending[0].title || pending[0].name || 'Untitled task',
    description: dateKey(pending[0].dueDate || pending[0].due_date) ? 'Due ' + formatDate(pending[0].dueDate || pending[0].due_date, user) + '.' : 'A task waiting in your list.',
    label: 'Open tasks', href: featurePath('tasks'),
  } : activeProject ? {
    title: activeProject.title || activeProject.name || 'Review an active project',
    description: 'An active project saved under My Projects.',
    label: 'Open projects', href: featurePath('projects'),
  } : {
    title: 'Plan your first task',
    description: 'Add a task to make your next step visible here.',
    label: 'Open tasks', href: featurePath('tasks'),
  };
  const activity = [
    ...tasks.filter(isDone).map((task, index) => ({
      key: 'task-' + (task.id ?? index), title: 'Completed ' + (task.title || task.name || 'a task'),
      date: task.completedAt || task.completed_at, href: featurePath('tasks'),
    })),
    ...notes.map((note, index) => ({
      key: 'note-' + (note.id ?? index), title: 'Edited ' + (note.title || 'an untitled note'),
      date: note.updatedAt || note.updated_at, href: featurePath('notes'),
    })),
  ].filter(item => dateKey(item.date)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);

  return <section className="module-page editorial-overview editorial-overview--workspace" aria-labelledby="workspace-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Workspace / Overview</p><h1 id="workspace-title">Work, made clear</h1>
        <p className="editorial-overview__subtitle">The next task, your saved projects, and recent edits.</p></div>
      <p className="editorial-overview__asof">As of {formatDate(today, user, { style: 'long', weekday: true })}</p>
    </header>
    <section className="editorial-overview__lead" aria-labelledby="workspace-next-title">
      <div><p className="editorial-overview__eyebrow">Next useful action</p><h2 id="workspace-next-title">{focus.title}</h2><p>{focus.description}</p>
        <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<span aria-hidden="true"> →</span></Link></div>
      <div className="editorial-overview__lead-note"><span className="editorial-overview__note-label">Your queue</span>
        <p>{due.length ? formatNumber(due.length, user, { maximumFractionDigits: 0 }) + ' task' + (due.length === 1 ? '' : 's') + ' due or overdue' : 'No tasks due or overdue today'}</p>
        <p>{formatNumber(pending.length, user, { maximumFractionDigits: 0 })} open tasks in total</p></div>
    </section>
    <dl className="editorial-overview__facts" aria-label="Workspace record summary">
      <div><dt>Open tasks</dt><dd>{formatNumber(pending.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Saved projects</dt><dd>{formatNumber(projects.length, user, { maximumFractionDigits: 0 })}</dd></div>
      <div><dt>Saved notes</dt><dd>{formatNumber(notes.length, user, { maximumFractionDigits: 0 })}</dd></div>
    </dl>
    <div className="editorial-overview__lower">
      <section className="editorial-overview__section" aria-labelledby="workspace-activity-title">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">Freshness</p><h2 id="workspace-activity-title">Recent saved activity</h2></div>
          <Link to={featurePath('notes')}>Open notes</Link></div>
        {activity.length ? <ol className="editorial-overview__activity">{activity.map(item => <li key={item.key}><Link to={item.href}>{item.title}</Link><time dateTime={item.date}>{formatDate(item.date, user)}</time></li>)}</ol>
          : <p className="editorial-overview__empty">No dated task completions or note edits yet. Add a task or capture a note to begin.</p>}
      </section>
      <nav className="editorial-overview__section" aria-label="Workspace destinations">
        <p className="editorial-overview__eyebrow">Continue in</p><h2>Your workspace</h2>
        <ul className="editorial-overview__links">
          <li><Link to={featurePath('tasks')}>Tasks <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('projects')}>Projects <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('calendar', 'agenda')}>Calendar <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('documents')}>My Files <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('notes')}>Notes <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('timesheet', 'timer')}>Timesheet <span aria-hidden="true">↗</span></Link></li>
          <li><Link to={featurePath('goals')}>Goals <span aria-hidden="true">↗</span></Link></li>
        </ul>
      </nav>
    </div>
  </section>;
}
