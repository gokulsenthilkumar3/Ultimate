import { describe,it,expect } from 'vitest';
import { DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3 } from 'three';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { createPrivateAnatomyDeformer } from './anatomyDeformation';

describe.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb'])('pelvic attachment on %s',file=> {
  it('keeps the buried shaft ring inside the pelvic body in both states',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body);
    const surface=new Mesh(body.geometry,new MeshBasicMaterial({side:DoubleSide}));surface.updateMatrixWorld(true);
    const caster=new Raycaster(),{segments}=anatomy.userData.layout;
    for(const state of ['resting','erect']) {
      d.apply({penis:{[state]:{measurements:{lengthCm:18,baseCircumferenceCm:14,midCircumferenceCm:13}}}},{state});
      const gaps=[];
      for(let k=0;k<segments;k+=4) {
        const p=new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,k);
        caster.set(new Vector3(p.x,p.y,1),new Vector3(0,0,-1));
        const hit=caster.intersectObject(surface,false)[0];
        if(hit) gaps.push((p.z-hit.point.z)/d.unit);
      }
      expect(gaps.length).toBeGreaterThan(segments/4*.9);
      expect(Math.max(...gaps),state).toBeLessThan(0);
    }
    surface.material.dispose();
  });
  it('keeps the upper sac attachment fixed while changing hang',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),pole=anatomy.userData.layout.tipVertex+1;
    d.apply({});const attached=new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,pole);
    d.apply({scrotum:{envelope:{hangCm:18,widthCm:7,heightCm:6}}});
    const after=new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,pole);
    expect(after.distanceTo(attached)/d.unit).toBeLessThan(.01);
  });
});
