import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';

export default function ModelReadySignal({onReady}) {
  const reported=useRef(false),pending=useRef(false),mounted=useRef(false);
  const invalidate=useThree(state=>state.invalidate);
  useEffect(()=>{
    mounted.current=true;
    pending.current=false;
    invalidate();
    return ()=>{mounted.current=false;};
  },[invalidate]);
  useFrame(({gl})=>{
    if(reported.current || pending.current)return;
    pending.current=true;
    // R3F renders after its frame subscribers in this same task. Complete the
    // signal afterwards without waiting for a second, possibly hidden-tab RAF.
    queueMicrotask(()=>{
      pending.current=false;
      if(!mounted.current || reported.current)return;
      reported.current=true;
      gl.domElement.dataset.modelReady='true';
      onReady();
    });
  });
  return null;
}
