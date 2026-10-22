import {afterEach,expect,it,vi} from 'vitest';
import {listenForPoseDragCancellation} from './poseDrag';

afterEach(()=>vi.restoreAllMocks());

function fixture(){
  const canvas=document.createElement('canvas');let session={pointerId:7,context:'current'},frame=null;
  const request=vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{frame=callback;return 1;});
  const cancelFrame=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{frame=null;});
  const cancel=vi.fn(()=>{session=null;});
  const dispose=listenForPoseDragCancellation(canvas,()=>session,cancel);
  const pointer=(type,pointerId)=>{const event=new Event(type);Object.defineProperty(event,'pointerId',{value:pointerId});canvas.dispatchEvent(event);};
  return {canvas,cancel,request,cancelFrame,dispose,pointer,flush:()=>{const callback=frame;frame=null;callback?.();},setSession:value=>{session=value;}};
}

it('cancels only the native pointer that owns the drag and removes native listeners',()=>{
  const test=fixture();test.pointer('pointercancel',8);expect(test.cancel).not.toHaveBeenCalled();
  test.pointer('pointercancel',7);expect(test.cancel).toHaveBeenCalledOnce();
  test.setSession({pointerId:7});test.dispose();expect(test.cancel).toHaveBeenCalledTimes(2);
  test.setSession({pointerId:7});test.pointer('pointercancel',7);window.dispatchEvent(new Event('blur'));
  expect(test.cancel).toHaveBeenCalledTimes(2);
});

it('defers lost capture until pointerup can complete, retaining successful drags',()=>{
  const test=fixture();test.pointer('lostpointercapture',7);expect(test.request).toHaveBeenCalledOnce();
  expect(test.cancel).not.toHaveBeenCalled();test.setSession(null);test.flush();expect(test.cancel).not.toHaveBeenCalled();
  test.setSession({pointerId:7});test.pointer('lostpointercapture',7);test.flush();expect(test.cancel).toHaveBeenCalledOnce();test.dispose();
});

it('does not cancel a replacement session when a previous lost-capture callback runs',()=>{
  const test=fixture();test.pointer('lostpointercapture',7);test.setSession({pointerId:7,context:'goal'});test.flush();
  expect(test.cancel).not.toHaveBeenCalled();test.dispose();expect(test.cancel).toHaveBeenCalledOnce();
});

it('cancels pending work on scope cleanup and handles Escape and blur',()=>{
  const test=fixture();test.pointer('lostpointercapture',7);test.dispose();
  expect(test.cancelFrame).toHaveBeenCalledWith(1);expect(test.cancel).toHaveBeenCalledOnce();test.flush();
  const escaped=fixture(),event=new KeyboardEvent('keydown',{key:'Escape',cancelable:true});window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);expect(escaped.cancel).toHaveBeenCalledOnce();escaped.dispose();
  const blurred=fixture();window.dispatchEvent(new Event('blur'));expect(blurred.cancel).toHaveBeenCalledOnce();blurred.dispose();
});
