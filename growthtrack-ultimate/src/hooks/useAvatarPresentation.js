import { useCallback, useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import use3DStore from '../store/use3DStore';
import { sanitizeAvatarPresentation } from '../lib/avatarPresentation';

export default function useAvatarPresentation() {
  const persisted = useStore(s => s.physiqueTargets?.viewerPreferences);
  const save = useStore(s => s.updatePhysiqueTargets);
  const userId = useStore(s => s.user?.id);
  const [saveState,setSaveState] = useState(null);
  const saveStatus = saveState && saveState.ownerId === userId ? saveState.status : persisted ? 'saved' : 'default';
  const timer = useRef(null), draft = useRef(null), revision = useRef(0), mounted = useRef(true);
  const owner = useRef(userId);
  useEffect(() => {
    if (owner.current !== userId) { clearTimeout(timer.current); timer.current = null; draft.current = null; revision.current++; owner.current = userId; }
    if (!draft.current) use3DStore.getState().setAvatarWorkspace(sanitizeAvatarPresentation(persisted));
  }, [persisted,userId]);
  const change = useCallback(patch => {
    const next = sanitizeAvatarPresentation({ ...use3DStore.getState().avatarWorkspace, ...patch });
    use3DStore.getState().setAvatarWorkspace(next);
    draft.current = next;
    const sequence = ++revision.current;
    setSaveState({ ownerId:userId,status:'saving' });
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
      if (useStore.getState().user?.id !== userId) return;
      try {
        await save(latest => ({ ...(latest || {}), viewerPreferences:next }));
        if (sequence === revision.current) { draft.current = null; if (mounted.current) setSaveState({ ownerId:userId,status:'saved' }); }
      } catch { if (sequence === revision.current && mounted.current) setSaveState({ ownerId:userId,status:'error' }); }
    }, 350);
  }, [save,userId]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current && draft.current && useStore.getState().user?.id === userId) {
        clearTimeout(timer.current);
        const next = draft.current;
        save(latest => ({ ...(latest || {}), viewerPreferences:next })).catch(() => {});
      }
      clearTimeout(timer.current);
    };
  }, [save,userId]);
  return { change, saveStatus };
}
