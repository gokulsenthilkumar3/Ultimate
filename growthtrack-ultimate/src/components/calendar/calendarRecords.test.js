import { describe, expect, it, vi } from 'vitest';
import { persistCalendarRows } from './calendarRecords';

const event = (id, extra = {}) => ({ id, title: id, date: '2026-10-20', allDay: true, recurrence: 'none', ...extra });
function harness(events = []) {
  let state = { user: { id: 'owner' }, _sessionVersion: 1, _dataRevision: 0, calendar_events: events };
  return {
    getState: () => state,
    setState: update => { state = { ...state, ...update(state) }; },
    state: () => state,
    switchOwner: () => { state = { ...state, user: { id: 'other' } }; },
  };
}
const conflict = current => Object.assign(new Error('conflict'), { status: 409, payload: { code: 'VERSION_CONFLICT', current } });

describe('calendar row persistence', () => {
  it('creates, updates and deletes single events with their revision', async () => {
    const store = harness([event('a', { revision: 1 })]);
    const api = {
      create: vi.fn(async (id, record) => ({ ...record, id, revision: 1 })),
      update: vi.fn(async (id, revision, record) => ({ ...record, id, revision: revision + 1 })),
      remove: vi.fn(async (id, revision) => ({ id, revision: revision + 1, deleted: true })),
    };
    await persistCalendarRows({ kind: 'create', event: event('b') }, { ...store, api });
    await persistCalendarRows({ kind: 'update', original: store.state().calendar_events[0], event: { ...event('a'), title: 'Renamed' } }, { ...store, api });
    expect(api.update).toHaveBeenCalledWith('a', 1, expect.objectContaining({ title: 'Renamed' }));
    expect(store.state().calendar_events.find(row => row.id === 'a')).toMatchObject({ title: 'Renamed', revision: 2 });
    await persistCalendarRows({ kind: 'delete', original: store.state().calendar_events.find(row => row.id === 'b') }, { ...store, api });
    expect(api.remove).toHaveBeenCalledWith('b', 1);
    expect(store.state().calendar_events.map(row => row.id)).toEqual(['a']);
  });

  it('shows the newer version after a conflict instead of keeping the stale copy', async () => {
    const store = harness([event('a', { revision: 1, title: 'Old' })]);
    const api = { update: vi.fn().mockRejectedValue(conflict(event('a', { revision: 3, title: 'Changed on phone' }))) };
    await expect(persistCalendarRows({ kind: 'update', original: store.state().calendar_events[0], event: event('a', { title: 'Mine' }) }, { ...store, api }))
      .rejects.toThrow(/changed elsewhere/);
    expect(store.state().calendar_events[0]).toMatchObject({ title: 'Changed on phone', revision: 3 });
  });

  it('explains mirrored events and refuses edits without a known revision', async () => {
    const store = harness([event('feed', { revision: 1, readOnly: true })]);
    const api = { remove: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 409, payload: { code: 'READ_ONLY_RECORD' } })) };
    await expect(persistCalendarRows({ kind: 'delete', original: store.state().calendar_events[0] }, { ...store, api })).rejects.toThrow(/connected calendar/);
    await expect(persistCalendarRows({ kind: 'update', original: event('legacy'), event: event('legacy') }, { ...store, api })).rejects.toThrow(/out of date/);
  });

  it('imports only new events and reports partial progress', async () => {
    const store = harness([event('a', { revision: 1, icsUid: 'uid-a' })]);
    const api = { create: vi.fn()
      .mockImplementationOnce(async (id, record) => ({ ...record, id, revision: 1 }))
      .mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 0 })) };
    const events = [event('dup', { icsUid: 'uid-a' }), event('b', { icsUid: 'uid-b' }), event('c', { icsUid: 'uid-c' })];
    await expect(persistCalendarRows({ kind: 'import', events }, { ...store, api })).rejects.toThrow('1 of 2 events were imported before an error: offline');
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(store.state().calendar_events.map(row => row.id)).toEqual(['a', 'b']);
    await expect(persistCalendarRows({ kind: 'import', events: [event('dup', { icsUid: 'uid-a' })] }, { ...store, api })).rejects.toThrow('already exist');
  });

  it('does not publish results into another owner’s session', async () => {
    const store = harness([]);
    const api = { create: vi.fn(async (id, record) => { store.switchOwner(); return { ...record, id, revision: 1 }; }) };
    await persistCalendarRows({ kind: 'create', event: event('b') }, { ...store, api });
    expect(store.state().calendar_events).toEqual([]);
  });
});
