import React, { useCallback, useMemo, useRef, useState } from 'react';
import useStore from '../../store/useStore';
import use3DStore from '../../store/use3DStore';
import { AvatarRecordContext } from '../../hooks/useAvatarRecord';
import { addAvatarPerson, avatarPeople, createAvatarPerson, patchAvatarPerson } from '../../lib/avatarPeople';

const EMPTY = Object.freeze({});
const EMPTY_LOGS = Object.freeze([]);

export default function AvatarPeopleWorkspace({ children }) {
  const ownerId = useStore(state => state.user?.id);
  return <PeopleSession key={ownerId || 'signed-out'}>{children}</PeopleSession>;
}

function PeopleSession({ children }) {
  const owner = useStore(state => state.user);
  const body = useStore(state => state.bodyProfile);
  const targets = useStore(state => state.physiqueTargets);
  const logs = useStore(state => state.metric_logs);
  const saveTargets = useStore(state => state.updatePhysiqueTargets);
  const saveBody = useStore(state => state.updateBodyProfile);
  const saveLog = useStore(state => state.saveMetricLog);
  const updateUser = useStore(state => state.updateUser);
  const [adding, setAdding] = useState(false), [name, setName] = useState(''), [base, setBase] = useState('male');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const flushers = useRef(new Set());
  const registerFlush = useCallback(flush => { flushers.current.add(flush); return () => flushers.current.delete(flush); }, []);
  const people = avatarPeople(targets);
  const person = people.find(item => item.id === targets?.avatarPeople?.activePersonId);
  const personId = person?.id || 'self';
  const ownerId = owner?.id;
  const patch = useCallback(update => {
    if (useStore.getState().user?.id !== ownerId) return Promise.reject(new Error('The account changed.'));
    return saveTargets(latest => patchAvatarPerson(latest, personId, update));
  }, [ownerId, personId, saveTargets]);
  const scopedSaveTargets = useCallback(update => patch(record => ({ physiqueTargets: typeof update === 'function' ? update(record.physiqueTargets) : update })), [patch]);
  const scopedSaveBody = useCallback(update => patch(record => ({ bodyProfile: { ...record.bodyProfile, ...update } })), [patch]);
  const scopedSaveLog = useCallback(log => patch(record => ({ metricLogs: [...(record.metricLogs || []), { ...log, id: crypto.randomUUID() }] })), [patch]);
  const updateDateOfBirth = useCallback(value => personId === 'self' ? updateUser({ dob: value }) : patch(() => ({ dateOfBirth: value })), [personId, updateUser, patch]);
  const value = useMemo(() => ({ personId, name: person?.name || 'My avatar',
    legacyUser: person ? EMPTY : owner || EMPTY,
    dateOfBirth: person ? person.dateOfBirth || null : owner?.dob ?? owner?.dateOfBirth ?? null,
    bodyProfile: person ? person.bodyProfile || EMPTY : body,
    physiqueTargets: person ? person.physiqueTargets || EMPTY : targets,
    metricLogs: person ? person.metricLogs || EMPTY_LOGS : logs,
    updateBodyProfile: person ? scopedSaveBody : saveBody,
    updatePhysiqueTargets: person ? scopedSaveTargets : saveTargets,
    saveMetricLog: person ? scopedSaveLog : saveLog,
    updateDateOfBirth, registerFlush,
  }), [personId, person, owner, body, targets, logs, scopedSaveBody, saveBody, scopedSaveTargets, saveTargets, scopedSaveLog, saveLog, updateDateOfBirth, registerFlush]);

  async function changePerson(nextPerson) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      // Finish all drafts before replacing the canvas/editor and their refs.
      for (const flush of [...flushers.current]) await flush();
      if (useStore.getState().user?.id !== ownerId) return;
      await saveTargets(latest => typeof nextPerson === 'object' ? addAvatarPerson(latest, nextPerson)
        : { ...latest, avatarPeople: { ...latest?.avatarPeople, schemaVersion: 1, activePersonId: nextPerson } });
      if (useStore.getState().user?.id !== ownerId) return;
      use3DStore.getState().setAvatarWorkspace({ workspaceMode: 'current', avatarContext: 'current', saveStatus: 'saved' });
      use3DStore.getState().setAnimation('standing', { playing: false });
      use3DStore.getState().fitCameraToBody();
      setAdding(false); setName('');
    } catch (cause) { setError(cause.message || 'Could not save. Your current person is still open; try again.'); }
    finally { setBusy(false); }
  }

  return <div className="avatar-people-workspace">
    <section className="avatar-people" aria-label="Saved people">
      <label className="workspace-field"><span>Person</span><select aria-label="Person" disabled={busy} value={personId} onChange={event => changePerson(event.target.value)}>
        <option value="self">Me · my avatar</option>{people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <button className="chamber-pill" type="button" disabled={busy} aria-expanded={adding} onClick={() => setAdding(!adding)}>Create a person</button>
      <p>Each person has their own measurements, appearance, poses and goals.</p>
      {busy && <p role="status">Saving edits and opening the selected person…</p>}
      {adding && <form className="avatar-people__form" onSubmit={event => {
        event.preventDefault();
        try { const next = createAvatarPerson(name, base); changePerson(next); } catch (cause) { setError(cause.message); }
      }}>
        <label className="workspace-field"><span>Person’s name</span><input autoFocus aria-label="Person’s name" required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="workspace-field"><span>Body base</span><select aria-label="New person body base" value={base} onChange={event => setBase(event.target.value)}><option value="male">Male adult</option><option value="female">Female adult</option><option value="neutral">Neutral adult</option></select></label>
        <p>Start with a blank measurement record. Female and neutral bases currently use a covered fallback mesh.</p>
        <button className="chamber-pill chamber-pill--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create person'}</button>
        <button className="chamber-pill" type="button" disabled={busy} onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
      </form>}
      {error && <p role="alert">{error}</p>}
    </section>
    <AvatarRecordContext.Provider value={value}><div key={personId} inert={busy || undefined}>{children}</div></AvatarRecordContext.Provider>
  </div>;
}
