import {describe,it,expect} from 'vitest';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {scopeFacialMorphs,FACIAL_MORPHS} from './facialMorphScope';

describe.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb'])('%s facial controls',file=>{
  it('retains facial movement, removes all expression deltas outside the head and preserves body morphs',()=>{
    const {body}=glbMeshFixture(file),source=body.geometry;
    const smile=body.morphTargetDictionary.smile,original=source.morphAttributes.position[smile].array.slice();
    body.geometry=source.clone();const bodyMorph=body.geometry.morphAttributes.position[body.morphTargetDictionary.overall_mass].array.slice();
    const report=scopeFacialMorphs(body);expect(report.corrected.jaw_open).toBeGreaterThan(100);
    const {skinIndex,skinWeight}=body.geometry.attributes,head=body.skeleton.bones.findIndex(b=>b.name==='Head');
    for(const name of FACIAL_MORPHS){
      const delta=body.geometry.morphAttributes.position[body.morphTargetDictionary[name]];if(!delta)continue;
      let moved=0;
      for(let i=0;i<delta.count;i++)if(Math.hypot(delta.getX(i),delta.getY(i),delta.getZ(i))>1e-8){
        let dominant=0;for(let slot=1;slot<4;slot++)if(skinWeight.getComponent(i,slot)>skinWeight.getComponent(i,dominant))dominant=slot;
        expect(skinIndex.getComponent(i,dominant)).toBe(head);moved++;
      }
      expect(moved,name).toBeGreaterThan(0);
    }
    expect(source.morphAttributes.position[smile].array).toEqual(original);
    expect(body.geometry.morphAttributes.position[body.morphTargetDictionary.overall_mass].array).toEqual(bodyMorph);
    source.dispose();body.geometry.dispose();
  });
});
