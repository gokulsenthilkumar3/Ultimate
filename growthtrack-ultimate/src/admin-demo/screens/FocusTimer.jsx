import React, { useEffect, useState } from 'react';
import { Button, Metrics, Panel, Plus } from '../components';
import { createFocusSession, focusRemaining, toggleFocus } from '../models/focusModel';

export default function FocusTimer({ focusSession, onFocusSessionChange }) {
  const [localSession, setLocalSession] = useState(createFocusSession);
  const [now, setNow] = useState(Date.now);
  const session = focusSession || localSession;
  const updateSession = onFocusSessionChange || setLocalSession;
  const remaining = focusRemaining(session, now);
  const active = session.deadline !== null && remaining > 0 && !session.completedAt;
  useEffect(() => {
    if (session.deadline === null) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session.deadline]);
  useEffect(() => {
    if (session.deadline !== null && remaining === 0) updateSession({ ...session, deadline: null, remainingSeconds: 0, completedAt: Date.now() });
  }, [remaining, session, updateSession]);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <>
    <Panel title="Make time for meaningful work" subtitle="The local countdown continues while you visit other pages."><div className="support-body"><label className="range-field">Project<select aria-label="Focus project" value={session.project || 'Unassigned'} onChange={event => updateSession({ ...session, project: event.target.value })} disabled={session.startedAt !== null && !session.completedAt}><option>Unassigned</option><option>Work</option><option>GrowthTrack</option><option>Family Connect</option></select></label></div><div className="focus-timer"><span className="eyebrow">FOCUS SESSION · LOCAL TIMER</span><strong role="timer" aria-label="Focus time remaining" aria-live="off">{time}</strong><p role="status">{session.completedAt ? 'Your sample focus session has been recorded.' : remaining === 0 ? 'Your sample focus session is complete.' : active ? 'Give this moment your attention.' : remaining < session.durationSeconds ? 'Paused. Pick up when you are ready.' : 'Choose one thing. Give it your attention.'}</p><div className="button-group timer-actions"><Button variant="primary" icon={Plus} onClick={() => { const currentTime = Date.now(); setNow(currentTime); updateSession(toggleFocus(session, currentTime)); }}>{active ? 'Pause sample session' : !session.completedAt && remaining < session.durationSeconds && remaining > 0 ? 'Resume sample session' : 'Start sample session'}</Button><Button disabled={session.startedAt === null || !!session.completedAt || remaining === session.durationSeconds} onClick={() => { const endedAt = Date.now(); setNow(endedAt); updateSession({ ...session, deadline: null, remainingSeconds: focusRemaining(session, endedAt), completedAt: endedAt }); }}>Finish sample session</Button><Button onClick={() => { setNow(Date.now()); updateSession(createFocusSession()); }}>Reset timer</Button></div></div></Panel>
  </>;
}
