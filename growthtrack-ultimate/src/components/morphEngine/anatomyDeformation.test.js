import { describe,expect,it } from 'vitest';
import { Group,Vector3 } from 'three';
import { createAnatomyGuides } from './anatomyGuides';
import { bakeAvatarSurface } from './avatarExport';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { createPrivateAnatomyDeformer,createButtockDeformer,testisGuideDimensions } from './anatomyDeformation';
import { anatomyPreviewWarning,createAnatomyCustomization } from '../../lib/anatomyCustomization';
import { validateBodyMetric } from '../../lib/bodyMetricContract';

const profile=()=>createAnatomyCustomization().current;
function measure(mesh,unit,heightScale=1) {
  const {segments,baseRing,shaftRings,midRing,tipVertex}=mesh.userData.layout;
  const at=i=>new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).multiply(new Vector3(1,heightScale,1));
  const centers=[];
  for(let ring=baseRing;ring<shaftRings;ring++) {const c=new Vector3();for(let k=0;k<segments;k++) c.addScaledVector(at(ring*segments+k),1/segments);centers.push(c);}
  centers.push(at(tipVertex));
  return {length:centers.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(centers[i]),0)/unit,
    girth:Array.from({length:segments},(_,k)=>at(midRing*segments+k).distanceTo(at(midRing*segments+(k+1)%segments))).reduce((a,b)=>a+b,0)/unit};
}
describe.each(['humanoid-base.glb','humanoid-base-lite.glb'])('independent private dimensions on %s',file=> {
  it('draws a value beyond the old limits and preserves circumference under curvature and stature',()=> {
    const {body,anatomy}=glbMeshFixture(file),deformer=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    p.penis.resting={measurements:{lengthCm:22,midCircumferenceCm:17},shape:{curvature:30}};
    deformer.apply(p,{heightScale:1.1});
    const measured=measure(anatomy,deformer.unit,1.1);
    expect(measured.length).toBeCloseTo(22,2);expect(measured.girth).toBeCloseTo(17,2);
    expect(validateBodyMetric('anatomyLengthCm',22)).toMatchObject({valid:true,value:22});
    expect(anatomyPreviewWarning('lengthCm',22)).toContain('Outside suggested');
  });
  it('updates every section, shape and sac field without sharing geometry or changing records',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    const base=()=>{d.apply(p);return anatomy.geometry.attributes.position.array.slice();};
    for(const key of ['lengthCm','baseCircumferenceCm','midCircumferenceCm','distalCircumferenceCm','widthCm','depthCm']) {
      const before=base();p.penis.resting={measurements:{[key]:key.includes('Circumference')?12:7},inputMode:['widthCm','depthCm'].includes(key)?'dimensions':'circumference'};
      d.apply(p);expect(anatomy.geometry.attributes.position.array, key).not.toEqual(before);p.penis.resting={};
    }
    for(const key of ['taper','ovalness','glansFlare','curvature','foreskinCoverage']) {
      const before=base();p.penis.resting={shape:{[key]:80}};d.apply(p);expect(anatomy.geometry.attributes.position.array,key).not.toEqual(before);p.penis.resting={};
    }
    for(const key of ['heightCm','widthCm','depthCm','hangCm','neckWidthCm','foldDetail','asymmetry']) {
      const before=base();p.scrotum.envelope={[key]:key.endsWith('Cm')?8:70};d.apply(p);expect(anatomy.geometry.attributes.position.array,key).not.toEqual(before);p.scrotum.envelope={};
    }
    const before=base();p.scrotum.presentation='contracted';d.apply(p);expect(anatomy.geometry.attributes.position.array).not.toEqual(before);
  });
  it('keeps sac size independent of shaft girth, supports independent endpoints and resets cleared records',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile(),start=(anatomy.userData.layout.tipVertex+1)*3;
    p.penis.resting={measurements:{midCircumferenceCm:8}};d.apply(p);const sac=anatomy.geometry.attributes.position.array.slice(start);
    p.penis.resting.measurements.midCircumferenceCm=15;d.apply(p);expect(anatomy.geometry.attributes.position.array.slice(start)).toEqual(sac);
    p.penis.erect={measurements:{lengthCm:19,midCircumferenceCm:13}};d.apply(p,{state:'erect'});expect(measure(anatomy,d.unit).length).toBeCloseTo(19,2);
    p.penis.resting.measurements.lengthCm=null;const result=d.apply(p,{legacy:{anatomyLengthCm:25}});expect(result.requestedLengthCm).toBe(9.16);
  });
  it('updates body envelopes and region colors with independent clone buffers',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile(),apply=createButtockDeformer(body,d.junction);
    const original=body.geometry.attributes.position.array.slice();
    p.buttocks={measurements:{projectionCm:20,widthCm:45}};apply(p);expect(body.geometry.attributes.position.array).not.toEqual(original);
    apply(profile());expect(body.geometry.attributes.position.array).toEqual(original);
    for(const key of ['hipCircumferenceCm','widthCm','heightCm','projectionCm','pelvicBreadthCm','volumeMl']) {
      const sample=profile();sample.buttocks={measurements:{[key]:key==='volumeMl'?4000:key==='hipCircumferenceCm'?150:50,inputMode:key==='volumeMl'?'volume':'dimensions'}};
      apply(sample);expect(body.geometry.attributes.position.array,key).not.toEqual(original);
    }
    for(const key of ['upperFullness','lowerFullness','asymmetry','cleft','hipDip','thighTransition']) {
      const sample=profile();sample.buttocks={shape:{[key]:80}};
      apply(sample);expect(body.geometry.attributes.position.array,key).not.toEqual(original);
    }
    const colors=anatomy.geometry.attributes.color.array.slice();p.skinRegions.shaft={enabled:true,color:'#775544',tanIntensity:20};d.apply(p);expect(anatomy.geometry.attributes.color.array).not.toEqual(colors);
  });
});
it('uses dimensions or an explicit volume mode for internal schematic guides',()=> {
  const dims=testisGuideDimensions({lengthCm:4,widthCm:3,depthCm:2,volumeMl:30,inputMode:'volume'});
  expect(Math.PI/6*dims[0]*dims[1]*dims[2]).toBeCloseTo(30,8);
  expect(testisGuideDimensions({lengthCm:4,widthCm:3,depthCm:2,volumeMl:30,inputMode:'dimensions'})).toEqual([4,3,2]);
});
it('excludes internal schematic guides from exported surface geometry',()=> {
  const {body,anatomy}=glbMeshFixture(),deformer=createPrivateAnatomyDeformer(anatomy,body);
  const evidence=deformer.apply(profile()),root=new Group();root.add(anatomy);
  const guides=createAnatomyGuides(anatomy,evidence);root.add(guides);
  expect(guides.children.filter(mesh=>mesh.name.startsWith('Schematic_'))).toHaveLength(2);
  const baked=bakeAvatarSurface(root);
  expect(baked.children.map(mesh=>mesh.name)).toEqual(['GrowthTrackPrivateAnatomy']);
  guides.userData.dispose();baked.children.forEach(mesh=>mesh.geometry.dispose());
});
