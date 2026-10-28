import React, { useState } from 'react';
import { ArrowUpRight, Badge, Button, Check, Empty, Icon, Metrics, Panel, Plus, Progress, RecordsTable } from '../components';
import { TASKS } from '../fixtures';
import FileScreen from './FileScreen';
import TimeScreen from './TimeScreen';
import ActionScreen from './ActionScreen';
import SkillsScreen from './SkillsScreen';
import { taskRecords } from '../models/taskModel';
import NotesScreen from './NotesScreen';
import SetupScreen from './SetupScreen';

const PROJECTS = [
  { id: 'rhythm', title: 'A consistent morning rhythm', workspace: 'GrowthTrack', progress: 72, color: 'sage' },
  { id: 'customer-workspace', title: 'A clearer customer workspace', workspace: 'Administration', progress: 48, color: 'blue' },
  { id: 'family-time', title: 'Make room for family', workspace: 'Family Connect', progress: 100, color: 'peach' },
];

function ProgressWorkspace({ page, view, added, openRecord }) {
  const current = [...PROJECTS, ...added.map((entry, i) => ({ id: entry.id || `added-${i}`, title: entry.title, workspace: page.title, progress: 0, color: 'sage' }))];
  const visible = view === 'archived' ? [{ id: 'archived-reading', title: 'A month of reading', workspace: 'Personal growth', progress: 100, color: 'sand', archived: true }] : view === 'completed' ? current.filter(row => row.progress === 100) : view === 'active' ? current.filter(row => row.progress < 100) : current;
  if (page.id === 'projects' && view === 'github') return <SetupScreen title="Your connected repositories" text="Connect an authorised GitHub account to review repository activity." items={['GitHub connection']} />;
  return <><Metrics items={[{ label: `Current ${page.title.toLowerCase()}`, value: current.length, detail: 'in your workspace' }, { label: 'In progress', value: current.filter(row => row.progress < 100).length, detail: 'moving along steadily' }, { label: 'Completed', value: current.filter(row => row.progress === 100).length, detail: 'this month' }, { label: 'Next review', value: 'Sunday', detail: 'a little time to reflect' }]} />
    {['list', 'history'].includes(view) ? <Panel title={`${page.title} records`}><RecordsTable rows={visible} columns={[{ key: 'title', label: 'Name' }, { key: 'workspace', label: 'Workspace' }, { key: 'progress', label: 'Progress', render: row => `${row.progress}%` }]} onRow={row => openRecord({ ...row, type: page.title })} /></Panel> : <div className="three-columns">{visible.map(row => <Panel key={row.id} title={row.title} subtitle={row.workspace} action={<span className={`module-icon small-icon ${row.color}`}><Icon name={page.id} /></span>}><div className="support-body"><Badge tone={row.archived ? 'neutral' : row.progress === 100 ? 'green' : 'amber'}>{row.archived ? 'Archived' : row.progress === 100 ? 'Completed' : 'In progress'}</Badge><p>{page.id === 'skills' ? 'Build your knowledge through a practical learning path.' : 'Small, clear steps toward a meaningful outcome.'}</p><Progress label="Progress" value={row.progress} /><div className="between"><span className="muted small">{row.progress === 100 ? 'Completed 26 Oct' : 'Due 08 Nov'}</span><Button onClick={() => openRecord({ ...row, type: page.title })}>Open details</Button></div></div></Panel>)}</div>}
  </>;
}

export default function WorkScreen({ page, view, addRecord, openRecord, added = [], nav, taskStatus, onTaskStatusChange, noteDrafts, onNoteChange, focusSession, onFocusSessionChange, focusHistory, actionOverrides, onActionOverridesChange }) {
  const [localStatus, setLocalStatus] = useState({});
  if (page.id === 'actions') return <ActionScreen view={view} added={added} taskStatus={taskStatus} onTaskStatusChange={onTaskStatusChange} actionOverrides={actionOverrides} onActionOverridesChange={onActionOverridesChange} openRecord={openRecord} />;
  if (page.id === 'documents' && view === 'providers') return <SetupScreen title="File providers" text="Choose an authorised file provider before importing documents. No provider is connected in this demo." items={['Local files · setup required', 'Cloud storage · setup required']} />;
  if (page.id === 'documents') return <FileScreen view={view} openRecord={openRecord} />;
  if (page.id === 'skills') return <SkillsScreen view={view} added={added} openRecord={openRecord} />;
  if (page.id === 'notes') return <NotesScreen view={view} added={added} addRecord={addRecord} openRecord={openRecord} noteDrafts={noteDrafts} onNoteChange={onNoteChange} />;
  if (['goals', 'projects'].includes(page.id)) return <ProgressWorkspace page={page} view={view} added={added} openRecord={openRecord} />;
  if (page.id === 'timesheet') return <TimeScreen view={view} focusSession={focusSession} onFocusSessionChange={onFocusSessionChange} focusHistory={focusHistory} />;
  const overrides = taskStatus || localStatus;
  const tasks = taskRecords(added, overrides);
  const filtered = view === 'completed' ? tasks.filter(task => task.status === 'Done') : view === 'today' ? tasks.filter(task => task.date === 'Today') : view === 'upcoming' ? tasks.filter(task => task.date !== 'Today') : tasks;
  function toggleTask(task) {
    const complete = task.status !== 'Done';
    if (onTaskStatusChange) onTaskStatusChange(task.id, complete);
    else setLocalStatus({ ...localStatus, [task.id]: complete });
  }
  return <>
    {page.id === 'workspace' && <div className="workspace-grid">{['tasks', 'projects', 'calendar', 'documents'].map(id => <button className="workspace-card" key={id} onClick={() => nav(id)}><span className="module-icon sage"><Icon name={id} /></span><h3>{id[0].toUpperCase() + id.slice(1)}</h3><p>A little more organised.</p><ArrowUpRight size={16} className="workspace-arrow" /></button>)}</div>}
    {view === 'board' ? <div className="three-columns">{['To do', 'In progress', 'Done'].map(status => <Panel key={status} title={status} action={<span className="count-tag">{tasks.filter(task => task.status === status).length}</span>}><div className="kanban-column">{tasks.filter(task => task.status === status).map(task => <button key={task.id} className="kanban-card" onClick={() => openRecord(task)}><Badge tone={task.priority === 'High' ? 'amber' : 'neutral'}>{task.priority}</Badge><h3>{task.title}</h3><p>{task.context}</p><span className="small muted">{task.date}</span></button>)}</div></Panel>)}</div> : <Panel title={page.id === 'actions' ? 'A clear next step' : 'Your work, with a little clarity'} subtitle="Focus on what matters today." action={<Button variant="primary" icon={Plus} onClick={() => addRecord('task')}>New sample task</Button>}><div className="task-list">{filtered.length ? filtered.map(task => <div key={task.title} className={`task-item${task.status === 'Done' ? ' task-complete' : ''}`}><button className="task-check" aria-label={`${task.status === 'Done' ? 'Reopen' : 'Complete'} ${task.title}`} aria-pressed={task.status === 'Done'} onClick={() => toggleTask(task)}>{task.status === 'Done' && <Check size={15} />}</button><button className="task-title" onClick={() => openRecord(task)}><strong>{task.title}</strong><small>{task.context}</small></button><Badge tone={task.priority === 'High' ? 'amber' : 'neutral'}>{task.priority}</Badge><span className="muted small">{task.date}</span></div>) : <Empty title="A clear list" description="No sample tasks match this view." />}</div></Panel>}
  </>;
}
