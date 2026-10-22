import { useCallback, useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import use3DStore from '../store/use3DStore';
import useAvatarRecord from './useAvatarRecord';
import { DEFAULT_AVATAR_PRESENTATION, sanitizeAvatarPresentation } from '../lib/avatarPresentation';

export default function useAvatarPresentation() {
  const record = useAvatarRecord();
  const registerFlush = record.registerFlush;
  const persisted = record.physiqueTargets?.viewerPreferences;
  const save = record.updatePhysiqueTargets;
  const userId = useStore(s => s.user?.id);
  const [saveState,setSaveState] = useState(null);
  const saveStatus = saveState && saveState.ownerId === userId ? saveState.status : persisted ? 'saved' : 'default';
  const timer = useRef(null), draft = useRef(null), revision = useRef(0), mounted = useRef(true);
  const owner = useRef(userId);
  const pendingSave = useRef(null), saving = useRef(Promise.resolve());
  useEffect(() => registerFlush(async () => {
    clearTimeout(timer.current); timer.current = null;
    if (draft.current && pendingSave.current) await pendingSave.current();
    await saving.current;
    if (draft.current) throw new Error('View settings could not be saved. Retry before switching people.');
  }), [registerFlush]);
  useEffect(() => {
    if (owner.current !== userId) { clearTimeout(timer.current); timer.current = null; draft.current = null; revision.current++; owner.current = userId; use3DStore.getState().fitCameraToBody(); }
    if (!draft.current) {
      const state=use3DStore.getState(),preferences=sanitizeAvatarPresentation(persisted);
      state.setAvatarWorkspace(state.avatarWorkspace.presentationMode?{...preferences,cameraMode:state.avatarWorkspace.cameraMode}:preferences);
    }
  }, [persisted,userId]);
  const change = useCallback(patch => {
    const next = sanitizeAvatarPresentation({ ...use3DStore.getState().avatarWorkspace, ...patch });
    use3DStore.getState().setAvatarWorkspace(next);
    draft.current = next;
    const sequence = ++revision.current;
    setSaveState({ ownerId:userId,status:'saving' });
    clearTimeout(timer.current);
    const persist = async () => {
      timer.current = null;
      if (useStore.getState().user?.id !== userId) return;
      try {
        await save(latest => ({ ...(latest || {}), viewerPreferences:next }));
        if (sequence === revision.current) { draft.current = null; if (mounted.current) setSaveState({ ownerId:userId,status:'saved' }); }
      } catch { if (sequence === revision.current && mounted.current) setSaveState({ ownerId:userId,status:'error' }); }
    };
    pendingSave.current = () => { saving.current = saving.current.then(persist, persist); return saving.current; };
    timer.current = setTimeout(pendingSave.current, 350);
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
  const reset = useCallback(() => {
    const {poseStudio,cameraBookmarks}=use3DStore.getState().avatarWorkspace;
    change({...DEFAULT_AVATAR_PRESENTATION,poseStudio,cameraBookmarks});
  },[change]);
  return { change, reset, saveStatus };
}
