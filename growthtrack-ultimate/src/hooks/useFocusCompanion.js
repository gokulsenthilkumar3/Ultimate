import { useEffect, useRef, useState } from 'react';
import { readDraft, saveDraft } from '../lib/drafts';
import { createFocusTimer, focusSeconds, pauseFocusTimer, readFocusDraft, resumeFocusTimer } from '../lib/focusCompanion';

export default function useFocusCompanion(ownerId) {
  const [timer, setTimer] = useState(null), [ready, setReady] = useState(false), [clock, setClock] = useState(Date.now());
  const [notice, setNotice] = useState(''), [alerts, setAlerts] = useState(false);
  const [loadedOwner, setLoadedOwner] = useState(null);
  const scope = useRef(ownerId), fired = useRef(null);
  const channel = useRef(null), revision = useRef(0), instance = useRef(null);
  if (!instance.current) instance.current = crypto.randomUUID();
  useEffect(() => {
    if (!ownerId || typeof BroadcastChannel === 'undefined') return undefined;
    const bus = new BroadcastChannel('growthtrack-focus-v1'); channel.current = bus;
    bus.onmessage = event => {
      const update = event.data;
      if (update?.ownerId !== ownerId || update.source === instance.current || !Number.isFinite(update.revision) || update.revision <= revision.current || update.revision > Date.now() + 60000) return;
      const timer = readFocusDraft(update.timer);
      if (update.timer !== null && !timer) return;
      revision.current = update.revision; setTimer(timer); setClock(Date.now());
    };
    return () => { bus.close(); if (channel.current === bus) channel.current = null; };
  }, [ownerId]);
  const publish = next => {
    revision.current = Math.max(Date.now(), revision.current + 1);
    setTimer(next); setClock(Date.now());
    channel.current?.postMessage({ ownerId, source: instance.current, revision: revision.current, timer: next });
  };
  useEffect(() => {
    let active = true; scope.current = ownerId; revision.current = 0; setTimer(null); setReady(false); setNotice(''); setLoadedOwner(null);
    if (!ownerId) { setReady(true); return undefined; }
    readDraft(ownerId, 'companion-focus').then(draft => { if (active) { if (revision.current === 0) setTimer(readFocusDraft(draft?.data)); setLoadedOwner(ownerId); setReady(true); } }).catch(() => { if (active) { setLoadedOwner(ownerId); setReady(true); setNotice('Timer recovery is unavailable. Keep Ultimate open for this session.'); } });
    return () => { active = false; };
  }, [ownerId]);
  useEffect(() => {
    if (!ready || !ownerId || loadedOwner !== ownerId || scope.current !== ownerId) return;
    saveDraft(ownerId, 'companion-focus', timer).catch(() => setNotice('Timer changes could not be saved on this device.'));
  }, [ownerId, loadedOwner, ready, timer]);
  useEffect(() => {
    if (timer?.phase !== 'running') return undefined;
    let interval;
    const tick = () => {
      const now = Date.now(); setClock(now);
      if (focusSeconds(timer, now) === 0) {
        setTimer(current => current?.deadline === timer.deadline ? { ...current, phase: 'complete', remainingSeconds: 0, deadline: null } : current);
        if (alerts && fired.current !== timer.deadline && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          fired.current = timer.deadline;
          try { new Notification('GrowthTrack focus session complete', { body: 'Time for a short break.', tag: 'growthtrack-focus' }); } catch { /* The visible timer remains the source of truth. */ }
        }
      }
    };
    const visibility = () => { clearInterval(interval); tick(); if (!document.hidden) interval = setInterval(tick, 1000); };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [timer, alerts]);
  const start = minutes => publish(createFocusTimer(minutes));
  const pause = () => { if (timer) publish(pauseFocusTimer(timer)); };
  const resume = () => { if (timer) publish(resumeFocusTimer(timer)); };
  const stop = () => publish(null);
  const enableAlerts = async () => {
    if (typeof Notification === 'undefined') { setNotice('This browser does not support system notifications.'); return; }
    const permission = await Notification.requestPermission(); setAlerts(permission === 'granted');
    setNotice(permission === 'granted' ? 'Completion alerts enabled for this visit.' : 'Notifications are blocked. The timer still works.');
  };
  const visibleTimer = ownerId && loadedOwner !== ownerId ? null : timer;
  return { timer: visibleTimer, ready: ready && (!ownerId || loadedOwner === ownerId), seconds: focusSeconds(visibleTimer, clock), start, pause, resume, stop, notice, alerts, enableAlerts };
}
