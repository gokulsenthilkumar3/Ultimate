import React, { useEffect, useState } from 'react';
import { Badge, Button, Empty, Panel } from '../components';
import { actionState, taskRecords } from '../models/taskModel';

const descriptions = { today: 'Today: active tasks due in the sample day.', upcoming: 'Upcoming: active tasks scheduled after the sample day.', snoozed: 'Snoozed: hidden from active views until the snooze expires, or you restore it.', dismissed: 'Dismissed: removed from active triage until you restore it.' };
export default function ActionScreen({ view = 'today', added = [], taskStatus = {}, onTaskStatusChange, actionOverrides, onActionOverridesChange, openRecord }) {
  const [local, setLocal] = useState({}), [now, setNow] = useState(Date.now);
  const overrides = actionOverrides || local, update = onActionOverridesChange || setLocal;
  const tasks = taskRecords(added, taskStatus).filter(task => task.status !== 'Done');
  const filtered = tasks.filter(task => actionState(task, overrides, now) === view);
  useEffect(() => {
    const next = Object.values(overrides).filter(entry => entry.status === 'snoozed' && entry.until > Date.now()).map(entry => entry.until).sort((a, b) => a - b)[0];
    if (!next) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2147483647, Math.max(0, next - Date.now())));
    return () => clearTimeout(timer);
  }, [overrides, now]);
  const change = (id, value) => update({ ...overrides, [id]: value });
  return <Panel title="Action Center" subtitle={descriptions[view]} provenance="Local triage only">{filtered.length ? <div className="action-list">{filtered.map(task => <article className="action-row" key={task.id}><button className="task-title" onClick={() => openRecord(task)}><strong>{task.title}</strong><small>{task.context} · {task.date}</small></button><Badge>{task.priority}</Badge><div className="button-group">{['snoozed', 'dismissed'].includes(view) ? <Button onClick={() => change(task.id, { status: 'active' })}>Restore {task.title}</Button> : <><Button onClick={() => change(task.id, { status: 'snoozed', until: Date.now() + 86400000 })}>Snooze {task.title}</Button><Button onClick={() => change(task.id, { status: 'dismissed' })}>Dismiss {task.title}</Button>{onTaskStatusChange && <Button onClick={() => onTaskStatusChange(task.id, true)}>Complete {task.title}</Button>}</>}</div>{view === 'snoozed' && <small className="muted">Snoozed until {new Date(overrides[task.id].until).toLocaleString()}</small>}</article>)}</div> : <Empty title="No actions in this view" description="Try another segment, restore an action, or add a sample task." />}</Panel>;
}
