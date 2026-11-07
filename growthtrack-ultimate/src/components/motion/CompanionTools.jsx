import React, { useRef, useState, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { parseCompanionCommand } from '../../lib/focusCompanion';
import { createNotesApi } from '../../domains/workspace/adapters/notesApi';
import { calendarRecords } from '../../api/records';
import { featurePath } from '../../config/featureRegistry';
import useStore from '../../store/useStore';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import SwingCompanion from './SwingCompanion';

const notes = createNotesApi((path, options) => apiClient.request(path, options));
export default function CompanionTools({ user, focus, onHide }) {
  const [view, setView] = useState('focus'), [minutes, setMinutes] = useState(25), [text, setText] = useState('');
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [reminderAt, setReminderAt] = useState('');
  const noteId = useRef(null), reminderId = useRef(null), saving = useRef(false), owner = useRef(user?.id); owner.current = user?.id;
  useLayoutEffect(() => { setText(''); setNotice(''); setReminderAt(''); noteId.current = null; reminderId.current = null; }, [user?.id]);
  const saveNote = async content => {
    if (!user?.id) throw new Error('Sign in before saving a note.');
    if (!content.trim()) throw new Error('Write a note first.');
    noteId.current ||= crypto.randomUUID();
    const saved = await notes.create({ id: noteId.current, title: content.trim().split('\n')[0].slice(0, 100), content, tags: ['companion'] });
    if (owner.current === user.id) { setNotice('Note saved to your workspace.'); noteId.current = null; setText(''); }
    return saved;
  };
  const device = async topic => {
    if (topic === 'internet') { setNotice(navigator.onLine ? 'This browser reports a network connection. Internet reachability has not been tested.' : 'This browser reports that it is offline.'); return; }
    if (topic === 'battery') {
      if (typeof navigator.getBattery !== 'function') throw new Error('Battery details are not available in this browser.');
      const battery = await navigator.getBattery(); setNotice(`Battery: ${Math.round(battery.level * 100)}%${battery.charging ? ' · charging' : ''}.`); return;
    }
    if (!window.growthTrackDesktop?.systemSummary) throw new Error('CPU, memory and disk readings require the Ultimate desktop app. No system monitoring runs in the browser.');
    const info = await window.growthTrackDesktop.systemSummary();
    setNotice(topic === 'memory' ? `Memory: ${(info.freeMemoryBytes / 1024 ** 3).toFixed(1)} GB free of ${(info.totalMemoryBytes / 1024 ** 3).toFixed(1)} GB.` : topic === 'disk' ? `Workspace drive: ${(info.diskFreeBytes / 1024 ** 3).toFixed(1)} GB free of ${(info.diskTotalBytes / 1024 ** 3).toFixed(1)} GB.` : `System CPU: ${info.cpuPercent.toFixed(1)}% in the sampled interval. No process names were collected.`);
  };
  const perform = async operation => {
    if (saving.current) return; saving.current = true; setBusy(true); setNotice('');
    try { await operation(); } catch (error) { setNotice(error.message || 'The action did not complete. Your text is still here.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const submit = event => { event.preventDefault(); void perform(async () => {
    const command = parseCompanionCommand(text);
    if (command.kind === 'timer') { focus.start(command.minutes); setView('focus'); setText(''); setNotice(`${command.minutes}-minute focus session started. This is not a submitted timesheet.`); }
    else if (command.kind === 'note') await saveNote(command.text);
    else if (command.kind === 'device') await device(command.topic);
    else if (command.kind === 'hide') onHide();
    else if (command.kind === 'greet') setNotice(`Hello${user?.fullName || user?.name ? `, ${user.fullName || user.name}` : ''}. One small next step is enough.`);
    else if (command.kind === 'weather') { setView('quick'); setNotice('Open Current below and choose Use my location. Weather needs your permission and a configured provider.'); }
  }); };
  const saveReminder = () => void perform(async () => {
    if (!user?.id || !text.trim()) throw new Error('Sign in and write a reminder first.');
    const date = new Date(reminderAt);
    if (!reminderAt || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a future reminder time.');
    reminderId.current ||= crypto.randomUUID();
    const end = new Date(date.getTime() + 5 * 60000), pad = value => String(value).padStart(2, '0');
    const payload = { id: reminderId.current, title: text.trim().slice(0, 500), date: reminderAt.slice(0, 10), endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`, allDay: false, startTime: reminderAt.slice(11, 16), endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`, type: 'Reminder', recurrence: 'none', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, color: '#55806b', description: '', location: '' };
    const saved = await calendarRecords.create(payload.id, payload);
    if (owner.current === user.id) {
      useStore.setState(state => state.user?.id !== user.id ? {} : { calendar_events: [...(state.calendar_events || []).filter(item => item.id !== saved.id), saved] });
      setNotice('Reminder saved in Calendar. Delivery follows your notification settings; this does not create an operating-system alarm.'); setText(''); reminderId.current = null;
    }
  });
  const clock = `${Math.floor(focus.seconds / 60).toString().padStart(2, '0')}:${(focus.seconds % 60).toString().padStart(2, '0')}`;
  return <section className="companion-tools" aria-label="Companion tools">
    <Tabs label="Companion tools" tabs={[{ value: 'focus', label: 'Focus' }, { value: 'quick', label: 'Quick capture' }, { value: 'play', label: 'Charms' }]} value={view} onChange={setView} />
    {view === 'focus' && <div className="companion-focus"><p>{focus.timer?.phase === 'complete' ? 'Session complete. Take a breath.' : focus.timer?.phase === 'paused' ? 'Paused' : focus.timer ? 'One thing at a time.' : 'Make a little room for focus.'}</p><output className="companion-focus__clock" aria-label="Focus time remaining">{focus.timer ? clock : `${minutes}:00`}</output>
      {!focus.timer || focus.timer.phase === 'complete' ? <><label>Minutes<input type="number" min="1" max="180" value={minutes} onChange={event => setMinutes(Number(event.target.value))} /></label><Button disabled={!focus.ready || !Number.isInteger(minutes) || minutes < 1 || minutes > 180} onClick={() => focus.start(minutes)}>Start focus</Button></> : <div className="connection-actions"><Button variant="secondary" onClick={focus.timer.phase === 'running' ? focus.pause : focus.resume}>{focus.timer.phase === 'running' ? 'Pause focus' : 'Resume focus'}</Button><Button variant="ghost" onClick={focus.stop}>End session</Button></div>}
      <Button variant="ghost" onClick={() => void focus.enableAlerts()} disabled={focus.alerts}>{focus.alerts ? 'Completion alerts enabled' : 'Enable completion alerts'}</Button><p>Timer recovery stays on this device. Focus time is not billed or added to Timesheet automatically.</p>{focus.notice && <p role="status">{focus.notice}</p>}
    </div>}
    {view === 'quick' && <><form onSubmit={submit} className="form-stack"><label>Quick command or note<textarea rows={3} value={text} maxLength={10000} onChange={event => { setText(event.target.value); noteId.current = null; reminderId.current = null; }} placeholder="/timer 25 · /note your thought · memory?" /></label><div className="connection-actions"><Button type="submit" disabled={busy || !text.trim()}>Run command</Button><Button variant="secondary" disabled={busy || !text.trim() || !user?.id} onClick={() => void perform(() => saveNote(text))}>Save as note</Button></div></form>
      <details><summary>Save a calendar reminder</summary><label>When, in this device’s time zone<input aria-label="Companion reminder time" type="datetime-local" value={reminderAt} onChange={event => setReminderAt(event.target.value)} /></label><Button variant="secondary" onClick={saveReminder} disabled={busy || !user?.id}>Save reminder from text</Button></details><p>Only explicit commands run here. Nothing you type is sent to an AI model. <Link to={featurePath('current')}>Current weather</Link> · <Link to={featurePath('notes')}>All notes</Link></p>
    </>}
    {view === 'play' && <SwingCompanion />}
    {window.growthTrackDesktop?.openCompanion && !document.documentElement.dataset.companionWindow && <Button variant="secondary" onClick={() => void perform(async () => { await window.growthTrackDesktop.openCompanion(); setNotice('Companion opened on your desktop. Drag its header to move it.'); })}>Pin companion on desktop</Button>}
    {notice && <p role="status" className="companion-tools__notice">{notice}</p>}
  </section>;
}
