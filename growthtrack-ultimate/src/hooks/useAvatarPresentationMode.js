import {useCallback, useEffect, useRef, useState} from 'react';
import use3DStore from '../store/use3DStore';

/** Presentation is a temporary view, never a saved change to the owner's settings. */
export default function useAvatarPresentationMode(viewportRef, reducedMotion) {
  const active = use3DStore(state => state.avatarWorkspace.presentationMode);
  const snapshot = useRef(null);
  const wakeLock = useRef(null);
  const ownsFullscreen = useRef(false);
  const [controlsIdle, setControlsIdle] = useState(false);

  const exit = useCallback(() => {
    const previous = snapshot.current;
    if (!previous) return;
    snapshot.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
    if (ownsFullscreen.current && document.fullscreenElement === viewportRef.current) {
      document.exitFullscreen?.().catch(() => {});
    }
    ownsFullscreen.current = false;
    const state = use3DStore.getState();
    state.setAvatarWorkspace(previous.workspace);
    use3DStore.setState({cameraPreset:previous.cameraPreset, cameraZoom:previous.cameraZoom,
      focusedBodyPart:previous.focusedBodyPart, autoRotate:previous.autoRotate,
      cameraRevision:state.cameraRevision + 1});
    previous.trigger?.isConnected && previous.trigger.focus({preventScroll:true});
  }, [viewportRef]);

  const enter = useCallback(() => {
    if (snapshot.current || !viewportRef.current) return;
    const state = use3DStore.getState();
    const previous = {workspace:{cameraMode:state.avatarWorkspace.cameraMode,
      inspectorOpen:state.avatarWorkspace.inspectorOpen, presentationMode:false},
      cameraPreset:state.cameraPreset, cameraZoom:state.cameraZoom,
      focusedBodyPart:state.focusedBodyPart, autoRotate:state.autoRotate,
      trigger:document.activeElement};
    snapshot.current = previous;
    state.setAvatarWorkspace({cameraMode:'TURNTABLE', inspectorOpen:false, presentationMode:true});
    state.setAutoRotate(!reducedMotion && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    setControlsIdle(false);
    // Call within the click gesture. A rejected request keeps the same usable,
    // full-window view on browsers that do not implement native fullscreen.
    if (!document.fullscreenElement && viewportRef.current.requestFullscreen) {
      ownsFullscreen.current = true;
      viewportRef.current.requestFullscreen().then(()=>{
        if(snapshot.current!==previous && document.fullscreenElement===viewportRef.current)document.exitFullscreen?.().catch(()=>{});
      }).catch(() => {ownsFullscreen.current = false;});
    }
    if (navigator.wakeLock?.request) navigator.wakeLock.request('screen').then(lock => {
      if (snapshot.current === previous) wakeLock.current = lock;
      else lock.release().catch(() => {});
    }).catch(() => {});
  }, [reducedMotion, viewportRef]);

  useEffect(() => {
    const fullscreenChanged = () => {
      if (ownsFullscreen.current && !document.fullscreenElement) exit();
    };
    const keydown = event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('[role="dialog"][aria-modal="true"]') ||
        event.target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape' && snapshot.current) {event.preventDefault(); exit();}
      if (event.key.toLowerCase() === 'p') {event.preventDefault(); snapshot.current ? exit() : enter();}
      if (event.code === 'Space' && snapshot.current && event.target?.tagName !== 'BUTTON') {
        event.preventDefault(); const state = use3DStore.getState(); state.setAutoRotate(!state.autoRotate);
      }
    };
    document.addEventListener('fullscreenchange', fullscreenChanged);
    window.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      window.removeEventListener('keydown', keydown, true);
      exit();
    };
  }, [enter, exit]);

  useEffect(() => {
    if (!active) return;
    const viewport = viewportRef.current;
    let timer;
    const wake = () => {
      clearTimeout(timer); setControlsIdle(false);
      timer = setTimeout(() => {
        if (!viewport?.querySelector('.avatar-presentation-controls')?.contains(document.activeElement)) setControlsIdle(true);
      }, 2500);
    };
    wake();
    viewport?.addEventListener('pointermove', wake);
    viewport?.addEventListener('pointerdown', wake);
    viewport?.addEventListener('focusin', wake);
    viewport?.addEventListener('focusout', wake);
    return () => {
      clearTimeout(timer);
      viewport?.removeEventListener('pointermove', wake);
      viewport?.removeEventListener('pointerdown', wake);
      viewport?.removeEventListener('focusin', wake);
      viewport?.removeEventListener('focusout', wake);
    };
  }, [active, viewportRef]);
  return {active, controlsIdle, enter, exit};
}
