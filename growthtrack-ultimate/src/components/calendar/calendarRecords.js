import { calendarRecords, conflictRecord, recordWriteMessage } from '../../api/records';
import { sessionKey } from './calendarModel.js';

/** Row-storage counterpart of persistMutation: each event is written on its
    own with the revision it was read at. Results are published only to the
    session that made the request; a conflict replaces the stale local copy. */
export async function persistCalendarRows(operation, { getState, setState, api = calendarRecords }) {
  const session = sessionKey(getState());
  const publish = change => setState(state => sessionKey(state) !== session ? {} : (() => {
    const next = change(state.calendar_events || []);
    return { calendar_events: next, user: state.user ? { ...state.user, calendar_events: next } : state.user };
  })());
  const upsert = saved => publish(events => [...events.filter(event => event.id !== saved.id), saved]);
  const fail = (error, id) => {
    const latest = conflictRecord(error);
    if (latest) publish(events => events.map(event => event.id === id ? latest : event));
    return new Error(recordWriteMessage(error, 'event'));
  };

  if (operation.kind === 'create') {
    try { const saved = await api.create(operation.event.id, operation.event); upsert(saved); return saved; }
    catch (error) { throw fail(error, operation.event.id); }
  }
  if (operation.kind === 'update' || operation.kind === 'delete') {
    const { original } = operation;
    if (!original?.revision) throw new Error('This event is out of date. Refresh the calendar before changing it.');
    try {
      if (operation.kind === 'delete') {
        const result = await api.remove(original.id, original.revision);
        publish(events => events.filter(event => event.id !== original.id));
        return result;
      }
      const saved = await api.update(original.id, original.revision, operation.event);
      upsert(saved);
      return saved;
    } catch (error) { throw fail(error, original.id); }
  }
  if (operation.kind === 'import') {
    const known = new Set((getState().calendar_events || []).map(event => event.icsUid || `${event.id}@growthtrack`));
    const additions = operation.events.filter(event => !known.has(event.icsUid));
    if (!additions.length) throw new Error('All imported events already exist. Nothing was added.');
    let saved;
    for (const [index, event] of additions.entries()) {
      try { saved = await api.create(event.id, event); upsert(saved); }
      catch (error) {
        const reason = recordWriteMessage(error, 'event');
        throw new Error(index ? `${index} of ${additions.length} events were imported before an error: ${reason}` : reason);
      }
    }
    return saved;
  }
  throw new Error('Unsupported calendar change.');
}
