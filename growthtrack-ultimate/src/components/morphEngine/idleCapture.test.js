import {describe,it,expect,vi} from 'vitest';
import {Bone,Vector2,Vector3} from 'three';
import {freezeIdlePose} from './idleCapture';
import {captureAvatarImage,registerCaptureGuard,registerCaptureScene} from './captureRuntime';

function pose(){
  const meshes=[{morphTargetDictionary:{blink:0},morphTargetInfluences:[.8]}, {morphTargetDictionary:{blink:0},morphTargetInfluences:[.8]}];
  const eyeMaterial={userData:{gaze:{value:new Vector2(.02,-.01)}}};
  const breathingBone=new Bone();breathingBone.scale.set(1.002,1,1.004);
  return {meshes,eyeMaterial,breathingBone,breathingRestScale:new Vector3(1,1,1),manualBlink:.25};
}

describe('synchronous idle capture protection',()=>{
  it('renders a still with the explicit expression, neutral gaze and resting chest, then restores the live pose',()=>{
    const data=pose(),restore=freezeIdlePose(data);
    expect(data.meshes.map(mesh=>mesh.morphTargetInfluences[0])).toEqual([.25,.25]);
    expect(data.eyeMaterial.userData.gaze.value.toArray()).toEqual([0,0]);
    expect(data.breathingBone.scale.toArray()).toEqual([1,1,1]);
    restore();
    expect(data.meshes.map(mesh=>mesh.morphTargetInfluences[0])).toEqual([.8,.8]);
    expect(data.eyeMaterial.userData.gaze.value.toArray()).toEqual([.02,-.01]);
    expect(data.breathingBone.scale.toArray()).toEqual([1.002,1,1.004]);
  });
  it.each([false,true])('protects even a paused renderer and restores on encoding failure=%s',fail=>{
    const data=pose();let ratio=1,size=new Vector2(320,240);
    const canvas={width:320,height:240,toDataURL:()=>{
      expect(data.breathingBone.scale.toArray()).toEqual([1,1,1]);
      expect(data.meshes[0].morphTargetInfluences[0]).toBe(.25);
      if(fail)throw new Error('encoding failed');return 'data:image/png;base64,iVBORw==';
    }};
    const gl={capabilities:{maxTextureSize:4096},getSize:v=>v.copy(size),getPixelRatio:()=>ratio,setPixelRatio:v=>{ratio=v;},setSize:(x,y)=>{size.set(x,y);},render:vi.fn()};
    registerCaptureScene(canvas,{gl,scene:{},camera:{aspect:4/3,updateProjectionMatrix:vi.fn()}});
    registerCaptureGuard(canvas,()=>freezeIdlePose(data));
    if(fail)expect(()=>captureAvatarImage(canvas)).toThrow('encoding failed');else captureAvatarImage(canvas);
    expect(data.breathingBone.scale.toArray()).toEqual([1.002,1,1.004]);
    expect(data.meshes[0].morphTargetInfluences[0]).toBe(.8);
  });
});
