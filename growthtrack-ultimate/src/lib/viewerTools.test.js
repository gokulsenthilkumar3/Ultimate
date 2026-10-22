import { expect,it } from 'vitest';
import { emptyPose, patchPose, sanitizePoseStudio } from './poseStudio';
import { normalizeCameraView, restoreCameraView, sanitizeCameraBookmarks, sanitizeCameraView } from './cameraBookmarks';

it('validates untrusted pose JSON and keeps Current and Goal independent',()=>{
  const source={current:{enabled:true,joints:{head:[999,NaN,'10'],unknown:[1,2,3]},targets:{leftWrist:[Infinity,0,0],rightAnkle:[9,0,-9]}}};
  const safe=sanitizePoseStudio(source);
  expect(safe.current).toEqual({enabled:true,joints:{head:[25,0,0]},targets:{rightAnkle:[1.2,0,-1.2]}});
  expect(safe.goal).toEqual(emptyPose());
  const next=patchPose(safe,'goal',{enabled:true,joints:{head:[0,-20,0]}});
  expect(next.current).toEqual(safe.current);expect(safe.goal.enabled).toBe(false);
  next.current.joints.head[0]=0;expect(safe.current.joints.head[0]).toBe(25);
});
it('round-trips an actual camera pose and scales it with the evaluated model',()=>{
  const view=normalizeCameraView({position:[2,2,4],target:[.2,1,.1],frame:{height:2}});
  const restored=restoreCameraView(view,{height:3});
  restored.target.forEach((v,i)=>expect(v).toBeCloseTo([.3,1.5,.15][i],10));
  const {distance,azimuth,polar}=restored;
  const position=[distance*Math.sin(polar)*Math.sin(azimuth),distance*Math.cos(polar),distance*Math.sin(polar)*Math.cos(azimuth)].map((v,i)=>v+restored.target[i]);
  position.forEach((v,i)=>expect(v).toBeCloseTo([3,3,6][i],10));
  expect(normalizeCameraView({position:[0,1,2],target:[0,1,0],frame:null})).toBeNull();
});
it('rejects malformed and duplicate camera records, caps collection size and strips unrelated fields',()=>{
  expect(sanitizeCameraView({azimuth:0,polar:NaN,distanceRatio:1,targetOffset:[0,0,0]})).toBeNull();
  const view={azimuth:10,polar:7,distanceRatio:100,targetOffset:[99,0,-99],secret:1};
  const item={id:'view-1',name:'  Oblique  ',view};
  const records=sanitizeCameraBookmarks([item,item,{...item,id:'bad id'},{...item,id:'other',name:''}]);
  expect(records).toHaveLength(1);expect(records[0].name).toBe('Oblique');
  expect(records[0].view).toMatchObject({distanceRatio:30,targetOffset:[5,0,-5]});
  expect(records[0].view.secret).toBeUndefined();
  expect(sanitizeCameraBookmarks(Array.from({length:20},(_,i)=>({...item,id:`v-${i}`})))).toHaveLength(8);
});
