import { useCallback, useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import use3DStore from '../store/use3DStore';
import { sanitizeWardrobePreferences } from '../lib/wardrobePreferences';

export default function useWardrobePreferences() {
  const saved=useStore(s=>s.physiqueTargets?.wardrobePreferences);
  const ownerId=useStore(s=>s.user?.id);
  const save=useStore(s=>s.updatePhysiqueTargets);
  const timer=useRef(null),pending=useRef(null),owner=useRef(null),revision=useRef(0),mounted=useRef(true);
  const [status,setStatus]=useState(null);
  useEffect(()=> {
    if(owner.current!==ownerId) {
      clearTimeout(timer.current); pending.current=null; revision.current++; owner.current=ownerId;
      const next=sanitizeWardrobePreferences(saved);
      use3DStore.getState().setWardrobePreferences(next);
      use3DStore.getState().setWardrobe(next.preset);
    } else if(!pending.current) {
      const next=sanitizeWardrobePreferences(saved);
      use3DStore.getState().setWardrobePreferences(next);
      if(use3DStore.getState().wardrobeState!=='ANATOMICAL') use3DStore.getState().setWardrobe(next.preset);
    }
  },[saved,ownerId]);
  const change=useCallback(patch=> {
    const current=use3DStore.getState().wardrobePreferences;
    const preset=patch.preset || current.preset;
    const next=sanitizeWardrobePreferences({...current,preset,outfits:{...current.outfits,[preset]:{...current.outfits[preset],...patch.options}}});
    use3DStore.getState().setWardrobePreferences(next);
    if(patch.preset) use3DStore.getState().setWardrobe(next.preset);
    pending.current=next;
    const sequence=++revision.current;
    setStatus({ownerId,value:'saving'}); clearTimeout(timer.current);
    timer.current=setTimeout(async()=> {
      timer.current=null;
      if(useStore.getState().user?.id!==ownerId) return;
      try {
        await save(latest=>({...latest,wardrobePreferences:next}));
        if(sequence===revision.current) { pending.current=null; if(mounted.current) setStatus({ownerId,value:'saved'}); }
      } catch { if(sequence===revision.current && mounted.current) setStatus({ownerId,value:'error'}); }
    },350);
  },[ownerId,save]);
  useEffect(()=> {mounted.current=true;return ()=> {
    mounted.current=false;clearTimeout(timer.current);
    if(timer.current && pending.current && useStore.getState().user?.id===ownerId) {
      const next=pending.current; save(latest=>({...latest,wardrobePreferences:next})).catch(()=>{});
    }
  };},[ownerId,save]);
  return {change,status:status?.ownerId===ownerId?status?.value:saved?'saved':'default'};
}
