import React from 'react';
import { Metrics, Panel, Progress, RecordsTable } from '../components';
import { SAMPLE_FOCUS_HISTORY, durationText } from '../models/focusModel';
import FocusTimer from './FocusTimer';

export default function TimeScreen({ view, focusSession, onFocusSessionChange, focusHistory = SAMPLE_FOCUS_HISTORY }) {
  const seconds = focusHistory.reduce((sum, row) => sum + row.durationSeconds, 0);
  const projects = [...new Set(focusHistory.map(row => row.project))].map(project => ({ project, seconds: focusHistory.filter(row => row.project === project).reduce((sum, row) => sum + row.durationSeconds, 0) }));
  const days = [...new Set(focusHistory.map(row => row.date))].sort().reverse().map(date => ({ date, sessions: focusHistory.filter(row => row.date === date).length, seconds: focusHistory.filter(row => row.date === date).reduce((sum, row) => sum + row.durationSeconds, 0) }));
  return <><Metrics items={[{ label: 'Recorded focus time', value: durationText(seconds), detail: 'from the sample session history' }, { label: 'Sessions', value: focusHistory.length, detail: 'sample and local completions' }, { label: 'Average session', value: durationText(focusHistory.length ? Math.round(seconds / focusHistory.length) : 0), detail: 'from the same records' }, { label: 'Projects', value: projects.length, detail: 'represented in the history' }]} />
    {view === 'sessions' ? <Panel title="Focus sessions" subtitle="Recorded local completions and fictional history. Times are shown in UTC."><RecordsTable label="Focus session history" rows={focusHistory} columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Session' }, { key: 'project', label: 'Project' }, { key: 'startedAt', label: 'Start (UTC)', render: row => row.startedAt.slice(11, 19) }, { key: 'endedAt', label: 'End (UTC)', render: row => row.endedAt.slice(11, 19) }, { key: 'durationSeconds', label: 'Duration', numeric: true, render: row => durationText(row.durationSeconds) }]} searchPlaceholder="Search focus sessions…" renderSummary={rows => <><span>Time in this view</span><strong>{durationText(rows.reduce((sum, row) => sum + row.durationSeconds, 0))}</strong></>} /></Panel>
      : view === 'analytics' ? <div className="two-columns"><Panel title="Focus by day" subtitle="Derived from the recorded sample sessions."><RecordsTable label="Daily focus totals" rows={days} columns={[{ key: 'date', label: 'Date' }, { key: 'sessions', label: 'Sessions', numeric: true }, { key: 'seconds', label: 'Focus time', numeric: true, render: row => durationText(row.seconds) }]} /></Panel><Panel title="Focus by project" subtitle="Share of recorded focus time"><div className="support-body">{projects.map(row => <Progress key={row.project} label={`${row.project} · ${durationText(row.seconds)}`} value={seconds ? Math.round(row.seconds / seconds * 100) : 0} />)}</div></Panel></div>
      : <FocusTimer focusSession={focusSession} onFocusSessionChange={onFocusSessionChange} />}
  </>;
}
