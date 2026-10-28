import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import use3DStore from '../../store/use3DStore';
import { needsAnimatedFrames, renderInputsChanged } from './avatarRenderPolicy';
import { AVATAR_SPEECH_EVENT, avatarSpeechActive } from './avatarSpeech';

export default function DemandRendering({ active, reducedMotion }) {
  const invalidate = useThree(state => state.invalidate);
  const gl = useThree(state => state.gl);
  const settleUntil = useRef(0);

  useEffect(() => {
    const wake = () => {
      // Allow camera damping, morph interpolation and skin fitting to finish.
      settleUntil.current = performance.now() + 1800;
      invalidate();
    };
    if (active) wake();
    const unsubscribe = use3DStore.subscribe((next, previous) => {
      if (renderInputsChanged(next, previous)) wake();
    });
    gl.domElement.addEventListener(AVATAR_SPEECH_EVENT, wake);
    return () => { unsubscribe(); gl.domElement.removeEventListener(AVATAR_SPEECH_EVENT, wake); };
  }, [active, reducedMotion, invalidate, gl]);

  useFrame(({ gl }) => {
    const animating = needsAnimatedFrames(use3DStore.getState(), reducedMotion) || avatarSpeechActive(gl.domElement);
    const settling = performance.now() < settleUntil.current;
    gl.domElement.dataset.renderLoop = animating ? 'animated' : settling ? 'settling' : 'idle';
    if (active && (animating || settling)) invalidate();
  }, -100);

  return null;
}
