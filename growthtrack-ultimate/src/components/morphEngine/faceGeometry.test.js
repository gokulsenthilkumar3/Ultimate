// @vitest-environment node
import {expect,it} from 'vitest';
import {Vector3} from 'three';
import {readGlb} from '../../../scripts/plan-preview/glb.mjs';
import {sceneFromGlb} from '../../../scripts/human75/glb-tools.mjs';
import {prepareFaceGeometry,createMouthInterior} from './faceGeometry';

it.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb','humanoid-preview-75.glb','humanoid-preview-75-lite.glb'])('moves the mouth, keeps the torso fixed and preserves rest positions on %s',file=>{
  const {body,features}=sceneFromGlb(readGlb(`public/assets/models/${file}`));
  const original=body.geometry.attributes.position.array.slice(),source=body.geometry.morphAttributes.position[body.morphTargetDictionary.jaw_open];
  const report=prepareFaceGeometry(body,features),p=body.geometry.attributes.position;
  expect(report.moved.jaw_open).toBeGreaterThan(50);expect(report.moved.smile).toBeGreaterThan(30);
  for(const name of ['jaw_open','smile']){
    const delta=body.geometry.morphAttributes.position[body.morphTargetDictionary[name]];
    let mouth=0;
    for(let i=0;i<p.count;i++){
      const distance=new Vector3().fromBufferAttribute(delta,i).length();
      if(p.getY(i)<.66)expect(distance).toBe(0);
      if(p.getY(i)>.71 && p.getY(i)<.733 && distance>.001)mouth++;
    }
    expect(mouth).toBeGreaterThan(20);
  }
  expect(body.geometry.attributes.position.array).toEqual(original);
  expect(source).not.toBe(body.geometry.morphAttributes.position[body.morphTargetDictionary.jaw_open]);
  features.forEach(({mesh})=>expect(mesh.geometry.morphAttributes.position[mesh.morphTargetDictionary.jaw_open].array.every(v=>v===0)).toBe(true));
});

it('fits both dental arches to the posed lips and disposes the oral assembly',()=>{
  const {body,features,root,skeleton}=sceneFromGlb(readGlb('public/assets/models/humanoid-preview-75-lite.glb'));
  prepareFaceGeometry(body,features);const mouth=createMouthInterior(body);
  mouth.update();expect(mouth.group.visible).toBe(false);
  body.morphTargetInfluences[body.morphTargetDictionary.jaw_open]=.8;mouth.update();
  expect(mouth.group.visible).toBe(true);expect(body.userData.mouthInterior.gap).toBeGreaterThan(.01);
  const before=mouth.group.getWorldPosition(new Vector3());
  skeleton.bones.find(b=>b.name==='Head').rotation.y=.4;root.updateMatrixWorld(true);mouth.update();
  expect(mouth.group.getWorldPosition(new Vector3()).distanceTo(before)).toBeGreaterThan(.01);
  expect(mouth.group.quaternion.toArray().every(Number.isFinite)).toBe(true);
  body.morphTargetInfluences[body.morphTargetDictionary.jaw_open]=0;mouth.update();expect(mouth.group.visible).toBe(false);
  mouth.dispose();expect(mouth.group.parent).toBeNull();
});
