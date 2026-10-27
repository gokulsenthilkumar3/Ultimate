import { useCallback, useEffect, useRef, useState } from 'react';
import useAvatarRecord from './useAvatarRecord';
import useStore from '../store/useStore';
import { createParametricDocument, validateParametricDocument } from '../lib/parametricHuman';

/** Uses the existing per-person serialized save queue; no profile migration. */
export default function useParametricAvatar() {
  const record = useAvatarRecord();
  const ownerId = useStore(state => state.user?.id);
  const personId = record.personId;
  const scope = useRef({ ownerId, personId });
  const registerFlush = record.registerFlush;
  const initial = useRef(null);
  if (!initial.current) {
    try { initial.current = { document: record.physiqueTargets?.parametricAvatar ? validateParametricDocument(record.physiqueTargets.parametricAvatar) : createParametricDocument(), error: '' }; }
    catch (cause) { initial.current = { document: null, error: `Saved avatar could not be opened: ${cause.message}` }; }
  }
  const [document, setDocument] = useState(initial.current.document);
  const [status, setStatus] = useState(record.physiqueTargets?.parametricAvatar ? 'saved' : 'new');
  const [error, setError] = useState(initial.current.error);
  const latest = useRef(document), dirty = useRef(null), timer = useRef(null), mounted = useRef(true);
  const saving = useRef(Promise.resolve());
  const save = record.updatePhysiqueTargets;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const persist = async () => {
      // A flush is a navigation boundary: finish newer edits made while the
      // first request was in flight, rather than hiding them on unmount.
      while (dirty.current) {
        const next = dirty.current;
        if (mounted.current) setStatus('saving');
        try {
          if (useStore.getState().user?.id !== scope.current.ownerId || ownerId !== scope.current.ownerId || personId !== scope.current.personId) throw new Error('The account or person changed before the avatar was saved.');
          await save(targets => ({ ...targets, parametricAvatar: next }));
          if (dirty.current === next) dirty.current = null;
          if (mounted.current && !dirty.current) { setStatus('saved'); setError(''); }
        } catch (cause) {
          if (mounted.current) { setStatus('error'); setError(`Avatar was not saved: ${cause.message}`); }
          throw cause;
        }
      }
    };
    saving.current = saving.current.then(persist, persist);
    return saving.current;
  }, [ownerId, personId, save]);
  const replace = useCallback(next => {
    if (useStore.getState().user?.id !== scope.current.ownerId || ownerId !== scope.current.ownerId || personId !== scope.current.personId) throw new Error('Reopen the avatar editor after changing accounts or people.');
    const validated = validateParametricDocument(next);
    latest.current = validated;
    dirty.current = validated;
    setDocument(validated);
    setStatus('unsaved'); setError('');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush().catch(() => {}); }, 400);
    return validated;
  }, [flush, ownerId, personId]);
  useEffect(() => registerFlush(flush), [registerFlush, flush]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timer.current); if (dirty.current) flush().catch(() => {}); };
  }, [flush]);
  return { document, read: () => latest.current, replace, flush, status, error };
}
