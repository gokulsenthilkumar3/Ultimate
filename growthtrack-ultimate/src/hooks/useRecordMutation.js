import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { captureSession } from '../store/persistence';

// One acknowledged operation at a time. Drafts and success messages belong to
// the account that started the request, even after navigation or account changes.
export default function useRecordMutation() {
  const owner = useStore(state => state.user?.id ?? state.user?.email);
  const version = useStore(state => state._sessionVersion);
  const active = useRef(null);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useLayoutEffect(() => {
    mounted.current = true; active.current = null;
    setPending(false); setError('');
    return () => { mounted.current = false; active.current = null; };
  }, [owner, version]);
  const run = useCallback(async (operation, onSuccess) => {
    if (active.current) return false;
    const token = {};
    active.current = token;
    const session = captureSession(useStore.getState);
    const current = () => mounted.current && active.current === token && session();
    setPending(true); setError('');
    try {
      const result = await operation();
      if (!current()) return false;
      await onSuccess?.(result);
      return true;
    } catch (cause) {
      if (current()) setError(cause?.message || 'The change could not be saved. Your draft is still available.');
      return false;
    } finally {
      if (active.current === token) { active.current = null; if (mounted.current) setPending(false); }
    }
  }, []);
  return { pending, error, run };
}
