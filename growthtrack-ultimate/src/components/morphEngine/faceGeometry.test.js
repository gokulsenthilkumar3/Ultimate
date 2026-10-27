// @vitest-environment node
import {beforeAll,expect,it} from 'vitest';
import {Box3,DoubleSide,Mesh,Quaternion,Raycaster,Vector3} from 'three';
import {readGlb} from '../../../scripts/plan-preview/glb.mjs';
import {sceneFromGlb} from '../../../scripts/human75/glb-tools.mjs';
import {decompressGlb} from '../../../scripts/human-realism/glb-family.mjs';
import {prepareFaceGeometry,createMouthInterior} from './faceGeometry';
import {createFallbackCrown,FALLBACK_DENTAL_ARCH} from './dentalGeometry';

const mouthAssets=['humanoid-preview-75-lite.glb','humanoid-preview-75.glb','humanoid-human-r2-core.glb','humanoid-human-r2-hero.glb'];
const decoded={};
beforeAll(async()=>{for(const file of mouthAssets)decoded[file]=await decompressGlb(readGlb(`public/assets/models/${file}`));});
function mouthFixture(file){
  const scene=sceneFromGlb(decoded[file]);
  // Native R2 assets already contain the baked corrective and calibration.
  // Match the actual loader: never regenerate that baked facial geometry.
  if(!file.includes('human-r2'))prepareFaceGeometry(scene.body,scene.features);
  return {...scene,mouth:createMouthInterior(scene.body)};
}
function crownPoint(mesh){
  return mesh.getVertexPosition(8,new Vector3()).applyMatrix4(mesh.matrixWorld);
}

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

it('follows posed lips for aperture visibility and disposes the oral assembly',()=>{
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

it.each(mouthAssets)('keeps upper teeth skull-bound while the lower teeth follow the calibrated jaw on %s',file=>{
  const {body,root,skeleton,mouth}=mouthFixture(file);expect(mouth).not.toBeNull();
  const set=(name,value)=>{body.morphTargetInfluences[body.morphTargetDictionary[name]]=value;mouth.update();root.updateMatrixWorld(true);};
  mouth.update();root.updateMatrixWorld(true);
  const upperRest=crownPoint(mouth.upper),lowerRest=crownPoint(mouth.lower);
  const upperOrientation=mouth.upper.getWorldQuaternion(new Quaternion());
  expect(mouth.group.visible).toBe(false);
  set('jaw_open',.75);
  expect(crownPoint(mouth.upper).distanceTo(upperRest)).toBeLessThan(1e-8);
  expect(crownPoint(mouth.lower).distanceTo(lowerRest)).toBeGreaterThan(.009);
  expect(mouth.jaw.rotation.x).toBeCloseTo(.36*.75,10);
  expect(mouth.upper.getWorldQuaternion(new Quaternion()).angleTo(upperOrientation)).toBeLessThan(1e-7);
  expect(body.userData.mouthInterior).toMatchObject({visible:true,toothCount:28,upperAttachment:'skull',lowerAttachment:'calibrated-jaw-hinge'});
  // A smile or lip fullness must not drag either rigid dental arch around.
  const lowerOpen=crownPoint(mouth.lower);
  set('smile',.8);set('lip_fullness',.9);
  expect(crownPoint(mouth.upper).distanceTo(upperRest)).toBeLessThan(1e-8);
  expect(crownPoint(mouth.lower).distanceTo(lowerOpen)).toBeLessThan(1e-8);
  set('jaw_open',0);set('smile',0);set('lip_fullness',0);
  expect(crownPoint(mouth.lower).distanceTo(lowerRest)).toBeLessThan(1e-8);
  expect(mouth.group.visible).toBe(false);
  // Whole-head pose still carries both rows and the actual aperture with it.
  const head=skeleton.bones.find(b=>b.name==='Head');head.rotation.set(.16,.4,-.12);
  root.updateMatrixWorld(true);mouth.update();root.updateMatrixWorld(true);
  expect(crownPoint(mouth.upper).distanceTo(upperRest)).toBeGreaterThan(.01);
  expect(mouth.group.quaternion.toArray().every(Number.isFinite)).toBe(true);
  expect(mouth.group.visible).toBe(false);
  mouth.dispose();
});

it.each(mouthAssets)('fits head identity and retains distinct deterministic crown records on %s',file=>{
  const {body,root,mouth}=mouthFixture(file);mouth.update();root.updateMatrixWorld(true);
  const before=crownPoint(mouth.upper);
  body.morphTargetInfluences[body.morphTargetDictionary.head_circumference]=.85;
  mouth.update();root.updateMatrixWorld(true);
  expect(crownPoint(mouth.upper).distanceTo(before)).toBeGreaterThan(1e-5);
  for(const arch of [mouth.upper,mouth.lower]){
    const records=arch.userData.teeth;
    expect(records).toHaveLength(14);expect(new Set(records.map(t=>t.id)).size).toBe(14);
    expect(new Set(records.map(t=>t.kind)).size).toBe(7);
    expect(arch.geometry.groups).toHaveLength(2);
    expect(arch.geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
    expect(arch.geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
    expect(records.every(t=>t.start+t.count<=arch.geometry.attributes.position.count)).toBe(true);
  }
  const geometries=new Set(),materials=new Set();
  mouth.group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);});
  let disposedGeometry=0,disposedMaterial=0;
  geometries.forEach(g=>g.addEventListener('dispose',()=>disposedGeometry++));
  materials.forEach(m=>m.addEventListener('dispose',()=>disposedMaterial++));
  mouth.dispose();expect(disposedGeometry).toBe(geometries.size);expect(disposedMaterial).toBe(materials.size);
  expect(body.userData.mouthInterior).toBeUndefined();
});

it('constructs different closed crown forms with outward surfaces and reproducible topology',()=>{
  const shapes=FALLBACK_DENTAL_ARCH.map(createFallbackCrown);
  expect(shapes.every(g=>g.index.count>0)).toBe(true);
  const profiles=shapes.map(g=>Array.from(g.attributes.position.array).map(n=>n.toFixed(6)).join(','));
  expect(new Set(profiles).size).toBe(FALLBACK_DENTAL_ARCH.length);
  shapes.forEach((geometry,i)=>{
    const other=createFallbackCrown(FALLBACK_DENTAL_ARCH[i]);
    expect(other.attributes.position.array).toEqual(geometry.attributes.position.array);
    // Signed enclosed volume detects inside-out crowns independently of normals.
    const p=geometry.attributes.position,index=geometry.index,a=new Vector3(),b=new Vector3(),c=new Vector3();let volume=0;
    for(let n=0;n<index.count;n+=3){a.fromBufferAttribute(p,index.getX(n));b.fromBufferAttribute(p,index.getX(n+1));c.fromBufferAttribute(p,index.getX(n+2));volume+=a.dot(b.cross(c))/6;}
    expect(volume).toBeGreaterThan(0);geometry.dispose();other.dispose();
  });
});

it('does not generate calibrated oral anatomy on an unsupported imported mesh',()=>{
  expect(createMouthInterior(new Mesh())).toBeNull();
});

it('uses the actual aperture rather than the jaw slider to reveal the interior',()=>{
  const {body,mouth}=mouthFixture('humanoid-human-r2-core.glb');
  mouth.update();expect(mouth.group.visible).toBe(false);
  const p=body.geometry.attributes.position,{upper,lower}=mouth.anchors;
  const top=p.getY(upper),bottom=p.getY(lower);
  p.setY(upper,top+.004);p.setY(lower,bottom-.004);
  mouth.update();expect(mouth.group.visible).toBe(true);
  expect(body.userData.mouthInterior.jawAngle).toBe(0);
  p.setY(upper,top);p.setY(lower,bottom);mouth.update();
  expect(mouth.group.visible).toBe(false);mouth.dispose();
});

it.each(mouthAssets)('exposes both incisor rows through the open aperture rather than behind its backdrop on %s',file=>{
  const {body,root,mouth}=mouthFixture(file);body.material.side=DoubleSide;
  for(const jaw of [.65,1]){
    body.morphTargetInfluences[body.morphTargetDictionary.jaw_open]=jaw;
    mouth.update();root.updateMatrixWorld(true);
    for(const arch of [mouth.upper,mouth.lower]){
      const tooth=arch.userData.teeth[0],bounds=new Box3();
      for(let i=tooth.start;i<tooth.start+tooth.count;i++)bounds.expandByPoint(arch.getVertexPosition(i,new Vector3()).applyMatrix4(arch.matrixWorld));
      const sample=bounds.getCenter(new Vector3());
      sample.y=arch===mouth.upper?bounds.min.y+.001:bounds.max.y-.001;sample.z=1;
      const hits=new Raycaster(sample,new Vector3(0,0,-1)).intersectObject(root,true);
      // Real geometry occlusion, independent of render colours/diagnostics:
      // neither lip skin, tongue nor the opaque rear cap may hide both rows.
      expect(hits[0]?.object).toBe(arch);
    }
  }
  mouth.dispose();
});
