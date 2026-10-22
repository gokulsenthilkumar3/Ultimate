import Notes from '../components/Notes';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';
import { createNotesApi, createNotesWrites } from '../domains/workspace/adapters/notesApi';
import { encryptedNoteDrafts } from '../domains/workspace/adapters/encryptedNoteDrafts';
import { readMarkdownFile, downloadMarkdownNote } from '../domains/workspace/adapters/markdownFiles';
import { createNotePublisher, createNoteSync } from '../domains/workspace/application/noteSync';

// The composition root selects browser adapters. Notes receives ports so a
// native client or a test can provide a different file and draft implementation.
const files = { read: readMarkdownFile, download: downloadMarkdownNote };
export default function NotesRoute(props) {
  const ownerId = useStore(state => state.user?.id);
  const [syncStatus, setSyncStatus] = useState('checking');
  const capabilities = useQuery({ queryKey: ['notes-api-capability', ownerId], queryFn: () => apiRequest('/api/capabilities'), staleTime: 60_000 });
  const services = useMemo(() => {
    if (capabilities.data?.workspace?.notes?.apiVersion !== 1) return undefined;
    const version = useStore.getState()._sessionVersion;
    const api = createNotesApi(apiRequest);
    const state = {
      assertSession() { const state = useStore.getState(); if (state.user?.id !== ownerId || state._sessionVersion !== version) throw new Error('The session changed. Reopen Notes before saving.'); },
      get: id => useStore.getState().notes.find(note => note.id === id),
      publish: saved => useStore.setState(state => ({ notes: saved.deletedAt ? state.notes.filter(note => note.id !== saved.id) : [saved, ...state.notes.filter(note => note.id !== saved.id)] })),
    };
    const publisher = createNotePublisher(state);
    const versionedState = { ...state, publish: publisher };
    return { records: createNotesWrites(api, versionedState), sync: createNoteSync(api, versionedState) };
  }, [ownerId, capabilities.data]);
  useEffect(() => {
    if (!services) return;
    let stopped = false;
    const pull = async () => {
      if (document.visibilityState === 'hidden') return;
      if (!navigator.onLine) { if (!stopped) setSyncStatus('offline'); return; }
      try {
        await services.sync.pull();
        if (!stopped) setSyncStatus('synced');
      } catch { if (!stopped) setSyncStatus(navigator.onLine ? 'failed' : 'offline'); }
    };
    const offline = () => { if (!stopped) setSyncStatus('offline'); };
    void pull();
    const timer = setInterval(pull, 15_000);
    window.addEventListener('online', pull);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', pull);
    return () => {
      stopped = true; clearInterval(timer);
      window.removeEventListener('online', pull); window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [services]);
  if (capabilities.isPending) return <p role="status">Loading Notes capabilities…</p>;
  return <><div className="notes-sync-status" aria-live="polite">{services && <>
    <span>{syncStatus === 'synced' ? 'Server changes checked' : syncStatus === 'offline' ? 'Offline — unsent editor text stays in local drafts' : syncStatus === 'failed' ? 'Server changes could not be checked' : 'Checking server changes…'}</span>
    {syncStatus === 'failed' && <button type="button" onClick={() => services.sync.pull().then(() => setSyncStatus('synced')).catch(() => setSyncStatus('failed'))}>Retry refresh</button>}
  </>}</div><Notes key={ownerId || 'signed-out'} {...props} records={services?.records} draftStore={encryptedNoteDrafts} fileTransfer={files} /></>;
}
