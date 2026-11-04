import React from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCheck, Files, FolderKanban, ListTodo, NotebookPen, Target, Timer } from 'lucide-react';
import PageArtwork from './motion/PageArtwork';
import usePlayfulMotion from '../hooks/usePlayfulMotion';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import { featurePath } from '../config/featureRegistry';
import { localDateKey } from '../lib/metricSeries';
import { formatDate, formatNumber } from '../utils/userFormatters';
import '../domains/workspace/workspace-hub.css';

const EMPTY = Object.freeze([]);
const asList = value => Array.isArray(value) ? value : EMPTY;
const isDone = task => Boolean(task?.completed || task?.done || ['done', 'completed'].includes(String(task?.status || '').toLowerCase()));
const dateKey = value => {
  const key = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(key)) ? key : '';
};

export default function WorkspaceHub() {
  const { canAnimate } = usePlayfulMotion();
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
  const activeProjects = projects.filter(project => String(project?.status || '').toLowerCase() === 'active');
  const activeProject = activeProjects[0];
  const projectPreview = [...activeProjects, ...projects.filter(project => project && !activeProjects.includes(project))].slice(0, 3);
  const count = value => formatNumber(value, user, { maximumFractionDigits: 0 });
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
    label: 'Open projects', href: featurePath('projects', 'mine'),
  } : {
    title: 'Plan your first task',
    description: 'Add a task to make your next step visible here.',
    label: 'Open tasks', href: featurePath('tasks'),
  };
  const activity = [
    ...tasks.filter(isDone).map((task, index) => ({
      key: 'task-' + (task.id ?? index), title: 'Completed ' + (task.title || task.name || 'a task'),
      date: task.completedAt || task.completed_at, href: featurePath('tasks'), type: 'Task completed',
    })),
    ...notes.map((note, index) => ({
      key: 'note-' + (note.id ?? index), title: 'Edited ' + (note.title || 'an untitled note'),
      date: note.updatedAt || note.updated_at, href: featurePath('notes'), type: 'Note edited',
    })),
  ].filter(item => dateKey(item.date)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);

  return <section className="module-page editorial-overview editorial-overview--workspace playful-overview workspace-hub" data-playful-motion={String(canAnimate)} aria-labelledby="workspace-title">
    <header className="editorial-overview__masthead">
      <div><p className="editorial-overview__eyebrow">Workspace / Overview</p><h1 id="workspace-title">Work, made clear</h1>
        <p className="editorial-overview__subtitle">A place for the next step. And everything that supports it.</p></div>
      <div className="workspace-hub__header-side"><PageArtwork /><p className="editorial-overview__asof"><time dateTime={today}>{formatDate(today, user, { style: 'long', weekday: true })}</time></p></div>
    </header>
    <div className="workspace-hub__board">
      <section className="editorial-overview__lead workspace-hub__focus" aria-labelledby="workspace-next-title" data-area-motion="focus">
        <div className="workspace-hub__paper-label"><span className="editorial-overview__eyebrow">Next useful action</span><span aria-hidden="true">01 / FOCUS</span></div>
        <div><h2 id="workspace-next-title">{focus.title}</h2><p>{focus.description}</p></div>
        <Link className="editorial-overview__primary" to={focus.href}>{focus.label}<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
      <section className="workspace-hub__queue workspace-hub__panel" aria-labelledby="workspace-queue-title" data-area-motion="queue">
        <div className="workspace-hub__panel-heading"><h2 id="workspace-queue-title">Your queue</h2><span className="workspace-hub__count">{count(pending.length)} open</span></div>
        <p className="workspace-hub__queue-summary" data-due={due.length > 0 ? 'true' : 'false'}><span aria-hidden="true" />{due.length ? count(due.length) + ' task' + (due.length === 1 ? '' : 's') + ' due or overdue' : 'No tasks due or overdue today'}</p>
        {pending.length ? <ol className="workspace-hub__queue-list">{pending.slice(0, 3).map((task, index) => {
          const date = dateKey(task.dueDate || task.due_date);
          return <li key={task.id ?? index}><Link to={featurePath('tasks')}><span className="workspace-hub__task-mark" aria-hidden="true" /><span className="workspace-hub__task-title">{task.title || task.name || 'Untitled task'}</span><span className="workspace-hub__due" data-overdue={date && date < today ? 'true' : 'false'}>{date ? <><time dateTime={date}>{date === today ? 'Today' : formatDate(date, user)}</time>{date < today && <span>Overdue</span>}</> : 'No date'}</span></Link></li>;
        })}</ol> : <div className="workspace-hub__queue-empty"><CheckCheck size={25} aria-hidden="true" /><p>A little room to think.<br /><span>Your next task will appear here.</span></p></div>}
        {pending.length > 3 && <Link className="workspace-hub__more" to={featurePath('tasks')}>View all {count(pending.length)} tasks<ArrowRight size={14} aria-hidden="true" /></Link>}
      </section>
    </div>
    <nav aria-label="Workspace destinations">
      <ul className="workspace-hub__destinations">
        {[
          { id: 'tasks', label: 'Tasks', metric: count(pending.length), detail: 'Open tasks', description: 'Turn a plan into a next step.', Icon: ListTodo, tone: 'mint' },
          { id: 'projects', view: 'mine', label: 'Projects', metric: count(projects.length), detail: 'Saved projects', description: 'Keep the bigger picture together.', Icon: FolderKanban, tone: 'lilac' },
          { id: 'notes', label: 'Notes', metric: count(notes.length), detail: 'Saved notes', description: 'Give a good thought somewhere to land.', Icon: NotebookPen, tone: 'yellow' },
        ].map(({ id, view, label, metric, detail, description, Icon, tone }) => <li key={id} data-area-motion="launcher"><Link to={featurePath(id, view)} aria-describedby={`workspace-door-${id}`} data-tone={tone}>
          <span className="workspace-hub__destination-top"><span className="workspace-hub__destination-icon">{React.createElement(Icon, { size: 22, strokeWidth: 1.65, 'aria-hidden': true })}</span><strong>{label}</strong><ArrowUpRight size={18} aria-hidden="true" /></span>
          <span className="workspace-hub__destination-detail" id={`workspace-door-${id}`}><span className="workspace-hub__metric">{metric}</span>{' '}<span>{detail}</span></span><span className="workspace-hub__destination-copy">{description}</span>
        </Link></li>)}
      </ul>
    </nav>
    <div className="workspace-hub__details">
      <section className="workspace-hub__panel" aria-labelledby="workspace-projects-title" data-area-motion="tile">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">The bigger picture</p><h2 id="workspace-projects-title">Project board</h2></div><Link to={featurePath('projects', 'mine')}>All projects<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        {projectPreview.length ? <><p className="workspace-hub__section-note">{count(activeProjects.length)} active · {count(projects.length)} saved</p><ul className="workspace-hub__project-list">{projectPreview.map((project, index) => <li key={project.id ?? index}><Link to={featurePath('projects', 'mine')}><FolderKanban size={18} aria-hidden="true" /><span>{project.title || project.name || 'Untitled project'}</span><span className="workspace-hub__project-status" data-active={String(project.status || '').toLowerCase() === 'active' ? 'true' : 'false'}>{project.status || 'No status'}</span></Link></li>)}</ul></>
          : <div className="workspace-hub__empty"><FolderKanban size={24} strokeWidth={1.5} aria-hidden="true" /><p>No saved projects yet.</p><span>Bring a longer running idea into focus.</span><Link to={featurePath('projects', 'mine')}>Start in Projects<ArrowRight size={14} aria-hidden="true" /></Link></div>}
      </section>
      <section className="workspace-hub__panel" aria-labelledby="workspace-activity-title" data-area-motion="trail">
        <div className="editorial-overview__section-heading"><div><p className="editorial-overview__eyebrow">Small steps, saved</p><h2 id="workspace-activity-title">Recent activity</h2></div><span className="workspace-hub__section-note">Latest dated changes</span></div>
        {activity.length ? <ol className="workspace-hub__activity">{activity.map(item => <li key={item.key}><span className="workspace-hub__activity-icon" aria-hidden="true">{item.type === 'Task completed' ? <CheckCheck size={17} /> : <NotebookPen size={17} />}</span><div><Link to={item.href}>{item.title}</Link><span>{item.type}</span></div><time dateTime={item.date}>{formatDate(item.date, user)}</time></li>)}</ol>
          : <div className="workspace-hub__empty"><NotebookPen size={24} strokeWidth={1.5} aria-hidden="true" /><p>A fresh page.</p><span>No dated task completions or note edits yet.</span><Link to={featurePath('notes')}>Capture a note<ArrowRight size={14} aria-hidden="true" /></Link></div>}
      </section>
    </div>
    <nav className="workspace-hub__tools" aria-label="More workspace tools">
      <p className="editorial-overview__eyebrow">Also on your desk</p>
      <ul>
        {[
          ['calendar', 'agenda', 'Calendar', 'Make room for what matters', CalendarDays],
          ['documents', undefined, 'My Files', 'Keep your documents close', Files],
          ['timesheet', 'timer', 'Timesheet', 'Give your time a clear record', Timer],
          ['goals', undefined, 'Goals', 'Connect today to what is next', Target],
        ].map(([id, view, label, description, Icon]) => <li key={id}><Link to={featurePath(id, view)}>{React.createElement(Icon, { size: 19, strokeWidth: 1.65, 'aria-hidden': true })}<span><strong>{label}</strong><small>{description}</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>)}
      </ul>
    </nav>
  </section>;
}
