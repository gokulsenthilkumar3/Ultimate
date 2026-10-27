import { describe,expect,it } from 'vitest';
import { Group,Vector3 } from 'three';
import { createAnatomyGuides } from './anatomyGuides';
import { bakeAvatarSurface } from './avatarExport';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { createPrivateAnatomyDeformer,createButtockDeformer,testisGuideDimensions,maleSectionContour,maleSurfaceLandmarks } from './anatomyDeformation';
import { anatomyPreviewWarning,createAnatomyCustomization } from '../../lib/anatomyCustomization';
import { validateBodyMetric } from '../../lib/bodyMetricContract';

const profile=()=>createAnatomyCustomization().current;
it('rejects incomplete section metadata before changing body or anatomy topology',()=>{
  const {body,anatomy}=glbMeshFixture(),layout=anatomy.userData.layout;
  const bodyIndex=body.geometry.index,anatomyIndex=anatomy.geometry.index;
  for(const change of [{shaftRings:layout.baseRing+2},{shaftRings:layout.baseRing+8},{segments:8.5},{baseRing:-1},{midRing:layout.shaftRings},{tipVertex:0}]){
    anatomy.userData.layout={...layout,...change};
    expect(createPrivateAnatomyDeformer(anatomy,body)).toBeNull();
    expect(body.geometry.index).toBe(bodyIndex);expect(anatomy.geometry.index).toBe(anatomyIndex);
  }
  anatomy.userData.layout=layout;
  const uv=anatomy.geometry.attributes.uv;anatomy.geometry.deleteAttribute('uv');
  expect(createPrivateAnatomyDeformer(anatomy,body)).toBeNull();
  anatomy.geometry.setAttribute('uv',uv);
  expect(createPrivateAnatomyDeformer(anatomy,body)).not.toBeNull();
});
function measure(mesh,unit,heightScale=1) {
  const {segments,baseRing,shaftRings,midRing,tipVertex}=mesh.userData.layout;
  const at=i=>new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).multiply(new Vector3(1,heightScale,1));
  const centers=[];
  for(let ring=baseRing;ring<shaftRings;ring++) {const c=new Vector3();for(let k=0;k<segments;k++) c.addScaledVector(at(ring*segments+k),1/segments);centers.push(c);}
  centers.push(at(tipVertex));
  return {length:centers.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(centers[i]),0)/unit,
    girth:Array.from({length:segments},(_,k)=>at(midRing*segments+k).distanceTo(at(midRing*segments+(k+1)%segments))).reduce((a,b)=>a+b,0)/unit};
}
describe.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb','humanoid-preview-75.glb','humanoid-preview-75-lite.glb'])('independent private dimensions on %s',file=> {
  it('fits one continuous envelope around independent padded guides while preserving records, shaft and neck',()=>{
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    p.scrotum.leftTestis={lengthCm:4.5,widthCm:3,depthCm:2.5};
    p.scrotum.rightTestis={lengthCm:3.5,widthCm:2.5,depthCm:2};
    d.apply(p,{heightScale:1.1});const manual=anatomy.geometry.attributes.position.array.slice();
    const start=anatomy.userData.layout.tipVertex+1;
    p.scrotum.fitMode='guides';p.scrotum.paddingCm=.2;
    const saved=JSON.stringify(p),e=d.apply(p,{heightScale:1.1});
    expect(JSON.stringify(p)).toBe(saved);
    expect(anatomy.geometry.attributes.position.array.slice(0,start*3)).toEqual(manual.slice(0,start*3));
    expect(anatomy.geometry.attributes.position.array.slice(start*3,start*3+3)).toEqual(manual.slice(start*3,start*3+3));
    expect(anatomy.geometry.attributes.position.array.slice(start*3)).not.toEqual(manual.slice(start*3));
    expect(e.guides.map(guide=>guide.dimensions)).toEqual([[4.5,3,2.5],[3.5,2.5,2]]);
    expect(e.scrotumFit).toMatchObject({mode:'guides',sampleCount:52,status:'contained-at-samples',unresolvedRays:0});
    expect(e.scrotumFit.maxOutsideCm).toBeLessThanOrEqual(.1);
    expect(e.scrotumFit.pairGapCm).toBeGreaterThanOrEqual(.05-1e-8);
    expect(Array.from(anatomy.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    p.scrotum.fitMode='envelope';d.apply(p,{heightScale:1.1});
    expect(anatomy.geometry.attributes.position.array).toEqual(manual);
    d.dispose();
  });
  it('reports attachment-limited guide edits instead of claiming a successful fit',()=>{
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    p.scrotum={fitMode:'guides',leftTestis:{lengthCm:12,placement:{verticalCm:5}},rightTestis:{lengthCm:4}};
    const saved=JSON.stringify(p),e=d.apply(p);
    expect(e.scrotumFit.status).toBe('attachment-limited');
    expect(e.scrotumFit.maxOutsideCm).toBeGreaterThan(.1);
    expect(Array.from(anatomy.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    expect(JSON.stringify(p)).toBe(saved);d.dispose();
  });
  it('sculpts independent glans landmarks while preserving fitted length and middle perimeter',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    p.penis.resting={measurements:{lengthCm:12,midCircumferenceCm:11},shape:{curvature:25}};
    const original=JSON.stringify(p);
    d.apply(p,{heightScale:1.12});const before=anatomy.geometry.attributes.position.array.slice();
    for(const key of ['glansLength','coronaDefinition','frenulumDefinition']) {
      const copy=structuredClone(p);copy.penis.resting.shape[key]=100;
      d.apply(copy,{heightScale:1.12});
      expect(anatomy.geometry.attributes.position.array,key).not.toEqual(before);
      expect(measure(anatomy,d.unit,1.12),key).toMatchObject({length:expect.closeTo(12,2),girth:expect.closeTo(11,2)});
      expect(Array.from(anatomy.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    }
    expect(JSON.stringify(p)).toBe(original);
    d.apply(p,{heightScale:1.12});expect(anatomy.geometry.attributes.position.array).toEqual(before);
  });
  it('keeps erection orientation independent of dimensions and does not reuse resting records',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    const unrecorded=d.apply(p,{state:'erect',legacy:{anatomyLengthCm:25,anatomyGirthCm:19}});
    expect(unrecorded.requestedLengthCm).not.toBe(25);
    p.penis.erect={measurements:{lengthCm:18,midCircumferenceCm:13},shape:{elevationDeg:45,curvature:30,curvatureDirectionDeg:90}};
    d.apply(p,{state:'erect',heightScale:.85});
    expect(measure(anatomy,d.unit,.85)).toMatchObject({length:expect.closeTo(18,2),girth:expect.closeTo(13,2)});
    const {segments,baseRing,tipVertex}=anatomy.userData.layout;
    const base=new Vector3();for(let k=0;k<segments;k++)base.addScaledVector(new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,baseRing*segments+k),1/segments);
    const tip=new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,tipVertex);
    expect(tip.y).toBeGreaterThan(base.y);
  });
  it('retracts foreskin without changing shaft measurements and keeps the UV seam smooth',()=> {
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
    p.penis.resting={measurements:{lengthCm:14,midCircumferenceCm:11},shape:{foreskinCoverage:100,foreskinRetraction:0}};
    d.apply(p);const skin=anatomy.getObjectByName('PrivateAnatomyForeskin');
    const covered=skin.geometry.attributes.position.array.slice();
    const glans=anatomy.geometry.attributes.position.array.slice();
    p.penis.resting.shape.foreskinRetraction=100;const retracted=d.apply(p);
    expect(skin.geometry.attributes.position.array).not.toEqual(covered);
    expect(anatomy.geometry.attributes.position.array).toEqual(glans);
    expect(retracted.foreskinCoverage).toBe(0);
    expect(measure(anatomy,d.unit)).toMatchObject({length:expect.closeTo(14,2),girth:expect.closeTo(11,2)});
    const {segments,midRing}=anatomy.userData.layout,n=anatomy.geometry.attributes.normal;
    const first=new Vector3().fromBufferAttribute(n,midRing*segments),last=new Vector3().fromBufferAttribute(n,midRing*segments+segments-1);
    expect(first.dot(last)).toBeGreaterThan(.8);
  });
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
    for(const key of ['taper','ovalness','glansFlare','curvature']) {
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
it('excludes private anatomy and internal schematic guides from exported surface geometry',()=> {
  const {body,anatomy}=glbMeshFixture(),deformer=createPrivateAnatomyDeformer(anatomy,body);
  const evidence=deformer.apply(profile()),root=new Group();root.add(anatomy);
  const guides=createAnatomyGuides(anatomy,evidence);root.add(guides);
  expect(guides.children.filter(mesh=>mesh.name.startsWith('Schematic_'))).toHaveLength(2);
  const baked=bakeAvatarSurface(root);
  expect(baked.children).toHaveLength(0);
  guides.userData.dispose();baked.children.forEach(mesh=>mesh.geometry.dispose());
});

it('mirrors guide placement reversibly and updates entire tilted guides after a pose',()=>{
  const {body,anatomy}=glbMeshFixture(),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
  p.scrotum.leftTestis={lengthCm:4,widthCm:2,depthCm:2,placement:{verticalCm:.5,lateralCm:.3,tiltDeg:20}};
  p.scrotum.rightTestis={lengthCm:3,widthCm:2.5,depthCm:2,placement:{verticalCm:-.6,tiltDeg:-5}};
  const separate=d.apply(p),original=JSON.stringify(p.scrotum.rightTestis);
  p.scrotum.mirrorPlacement=true;const linked=d.apply(p);
  expect(linked.guides[1].rotationDeg).toBe(-20);
  expect(linked.guides[1].dimensions).toEqual(separate.guides[1].dimensions);
  expect(JSON.stringify(p.scrotum.rightTestis)).toBe(original);
  p.scrotum.mirrorPlacement=false;const restored=d.apply(p,{heightScale:1.2});
  expect(restored.guides[1].rotationDeg).toBe(-5);
  const group=createAnatomyGuides(anatomy,restored),sphere=group.getObjectByName('Schematic_leftTestis');
  const before=sphere.geometry.attributes.position.array.slice();
  const bone=anatomy.skeleton.bones.find(b=>b.name==='Hips') || anatomy.skeleton.bones[0];
  bone.rotation.x=.4;group.userData.update();
  expect(sphere.geometry.attributes.position.array).not.toEqual(before);
  expect(Array.from(sphere.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
  group.userData.dispose();d.dispose();
});

it('retains independent guide dimensions and separation through both endpoint states and contraction',()=>{
  const {body,anatomy}=glbMeshFixture(),d=createPrivateAnatomyDeformer(anatomy,body),p=profile();
  p.scrotum={fitMode:'guides',leftTestis:{lengthCm:4.5,widthCm:3,depthCm:2.5,placement:{lateralCm:-2,tiltDeg:15}},rightTestis:{lengthCm:3.5,widthCm:2.5,depthCm:2}};
  for(const state of ['resting','erect'])for(const presentation of ['relaxed','contracted']){
    p.scrotum.presentation=presentation;
    const saved=JSON.stringify(p),e=d.apply(p,{state,heightScale:state==='resting'?.85:1.2});
    expect(e.guides[0].dimensions).toEqual([4.5,3,2.5]);
    expect(e.guides[1].dimensions).toEqual([3.5,2.5,2]);
    expect(e.scrotumFit.separationAdjustmentCm).toBeGreaterThan(0);
    expect(e.scrotumFit.pairGapCm).toBeGreaterThanOrEqual(.05-1e-8);
    expect(e.scrotumFit.maxOutsideCm).toBeLessThanOrEqual(.1);
    expect(JSON.stringify(p)).toBe(saved);
  }
  d.dispose();
});


describe('adult surface contours', () => {
  it('has an oblique coronal margin rather than a circular collar', () => {
    const { coronaT } = maleSurfaceLandmarks();
    const dorsal = Math.PI / 2;
    // Increased rim definition should peak proximal to the lateral margin on
    // the dorsal surface. Compare changes to isolate it from glans taper.
    const contribution = (t, angle) => maleSectionContour(t, angle, { coronaDefinition: 100 }).lateral
      - maleSectionContour(t, angle, { coronaDefinition: 0 }).lateral;
    expect(contribution(coronaT - .027, dorsal)).toBeGreaterThan(contribution(coronaT, dorsal));
    expect(contribution(coronaT, 0)).toBeGreaterThan(contribution(coronaT, -Math.PI / 2));
  });

  it('keeps contours positive and periodic across shape extremes', () => {
    for (const value of [0, 50, 100]) {
      const shape = { glansLength: value, glansFlare: value, coronaDefinition: value, frenulumDefinition: value };
      for (let t = 0; t <= 1; t += .01) {
        const seam = maleSectionContour(t, 0, shape);
        expect(maleSectionContour(t, 2 * Math.PI, shape).lateral).toBeCloseTo(seam.lateral, 10);
        for (let angle = 0; angle < Math.PI * 2; angle += .2) {
          const section = maleSectionContour(t, angle, shape);
          expect(section.lateral).toBeGreaterThan(0);
          expect(section.depth).toBeGreaterThan(0);
        }
      }
    }
  });
});
