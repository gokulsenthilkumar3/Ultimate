import React from 'react';
import {render,cleanup,act} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import ModelReadySignal from './ModelReadySignal';
const model=vi.hoisted(()=>({invalidate:vi.fn(),tick:null}));
vi.mock('@react-three/fiber',()=>({useThree:selector=>selector({invalidate:model.invalidate}),useFrame:callback=>{model.tick=callback;}}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('wakes a suspended scene and reports after the rendered task without a second animation frame',()=>{
  const onReady=vi.fn(),canvas={dataset:{}};let afterFrame;
  vi.stubGlobal('queueMicrotask',vi.fn(callback=>{afterFrame=callback;}));
  render(<ModelReadySignal onReady={onReady}/>);
  expect(model.invalidate).toHaveBeenCalledOnce();expect(onReady).not.toHaveBeenCalled();
  act(()=>model.tick({gl:{domElement:canvas}}));
  expect(onReady).not.toHaveBeenCalled();act(()=>afterFrame());
  expect(canvas.dataset.modelReady).toBe('true');expect(onReady).toHaveBeenCalledOnce();
  act(()=>model.tick({gl:{domElement:canvas}}));expect(queueMicrotask).toHaveBeenCalledOnce();
});
it('does not publish readiness from a frame whose model was unmounted',()=>{
  const onReady=vi.fn(),canvas={dataset:{}};let afterFrame;
  vi.stubGlobal('queueMicrotask',vi.fn(callback=>{afterFrame=callback;}));
  const {unmount}=render(<ModelReadySignal onReady={onReady}/>);
  act(()=>model.tick({gl:{domElement:canvas}}));unmount();act(()=>afterFrame());
  expect(onReady).not.toHaveBeenCalled();expect(canvas.dataset.modelReady).toBeUndefined();
});
