import { describe, expect, it, vi } from 'vitest';
import { BufferAttribute, Group, MeshBasicMaterial, ShaderLib, Vector3 } from 'three';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { createPrivateAnatomyDeformer } from './anatomyDeformation';
import { anatomicalBodyExportIndex } from './anatomyTissueGeometry';
import { bakeAvatarSurface } from './avatarExport';
import { createDeltaMaterial } from './DeltaHeatmapShader';
import { createPhysicalSkinMaterial } from '../body3d/physicalSkinMaterial';
import { applyAnatomySurface } from './anatomySurface';

const files=['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb','humanoid-preview-75.glb','humanoid-preview-75-lite.glb'];
describe.each(files)('layered adult tissues: %s',file=>{
  it('joins three complete boundaries with consistently oriented faces and a closed lower pole',()=>{
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body);
    const e=d.apply({scrotum:{envelope:{foldDetail:0}}});
    expect(e.tissues.pelvicJunction).toBe('body-shaft-scrotum');
    const g=anatomy.getObjectByName('PrivateAnatomyPelvicTransition').geometry,edges=new Map();
    for(let i=0;i<g.index.count;i+=3)for(let k=0;k<3;k++){
      const a=g.index.getX(i+k),b=g.index.getX(i+(k+1)%3),key=[Math.min(a,b),Math.max(a,b)].join(':');
      if(!edges.has(key))edges.set(key,[]);edges.get(key).push([a,b]);
    }
    expect(g.attributes.position.count-edges.size+g.index.count/3).toBe(-1);
    const boundary=new Map();
    for(const entries of edges.values()){
      expect(entries.length).toBeLessThanOrEqual(2);
      if(entries.length===2)expect(entries[0]).toEqual([...entries[1]].reverse());
      else for(const [a,b] of [entries[0],[...entries[0]].reverse()]){
        if(!boundary.has(a))boundary.set(a,[]);boundary.get(a).push(b);
      }
    }
    const seen=new Set();let loops=0;
    for(const first of boundary.keys())if(!seen.has(first)){
      loops++;let current=first,previous=-1;
      do{expect(boundary.get(current)).toHaveLength(2);seen.add(current);const next=boundary.get(current).find(id=>id!==previous);previous=current;current=next;}while(current!==first && !seen.has(current));
      expect(current).toBe(first);
    }
    expect(loops).toBe(3);
    // A constant-depth groove can cross the opposite side near a narrowing
    // pole. Front/back sections must retain their order all the way down.
    const {segments,tipVertex}=anatomy.userData.layout,p=anatomy.geometry.attributes.position,uv=anatomy.geometry.attributes.uv;
    for(let row=tipVertex+2;row+segments<p.count;row+=segments)if(uv.getY(row)>.86){
      expect(p.getZ(row+segments/4)).toBeGreaterThan(p.getZ(row+segments*3/4));
    }
    d.dispose();
  });
  it('caches still surfaces and invalidates them for morph, rig, geometry and material changes',()=>{
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body);
    d.apply({});
    const patch=anatomy.getObjectByName('PrivateAnatomyPelvicTransition');
    const version=patch.geometry.attributes.position.version;
    expect(d.updateDetails()).toBe(false);
    expect(patch.geometry.attributes.position.version).toBe(version);
    body.morphTargetInfluences[body.morphTargetDictionary.pelvis_width]=.5;
    expect(d.updateDetails()).toBe(true);
    expect(d.updateDetails()).toBe(false);
    body.skeleton.bones[0].rotation.y=.2;
    expect(d.updateDetails()).toBe(true);
    expect(d.updateDetails()).toBe(false);
    body.geometry.attributes.position.needsUpdate=true;
    expect(d.updateDetails()).toBe(true);
    body.material=new MeshBasicMaterial();
    expect(d.updateDetails()).toBe(true);
    expect(patch.material).toBe(anatomy.material);
    d.dispose();body.material.dispose();
  });
  it('stitches the pelvic cut and restores intact geometry for covered views and public export',()=>{
    const {body,anatomy}=glbMeshFixture(file),original=body.geometry.index;
    const d=createPrivateAnatomyDeformer(anatomy,body),e=d.apply({});
    expect(e.tissues.pelvis).toBe('stitched-body-boundary');
    expect(body.geometry.index.count).toBeLessThan(original.count);
    const patch=anatomy.getObjectByName('PrivateAnatomyPelvicTransition');
    const p=patch.geometry.attributes.position,b=body.geometry.attributes.position;
    const count=e.tissues.pelvicBoundaryVertices;
    const boundaryIds=[];
    for(let i=0;i<count;i++){
      const point=new Vector3().fromBufferAttribute(p,i);let distance=Infinity,closest=-1;
      for(let k=0;k<b.count;k++){
        const separation=point.distanceTo(new Vector3().fromBufferAttribute(b,k));
        if(separation<distance){distance=separation;closest=k;}
      }
      boundaryIds.push(closest);
      expect(distance).toBeLessThan(1e-7);
    }
    const scene=new Group();scene.add(body,anatomy);
    scene.rotation.y=.3;scene.scale.set(1.1,.9,1.05);
    for(const mesh of [body,anatomy]){
      mesh.morphTargetInfluences[mesh.morphTargetDictionary.pelvis_width]=.8;
      const hip=mesh.skeleton.bones.find(bone=>bone.name==='Hips') || mesh.skeleton.bones[0];
      hip.rotation.z=.1;
    }
    d.updateDetails();
    boundaryIds.forEach((id,i)=>{
      const actual=body.getVertexPosition(id,new Vector3());body.localToWorld(actual);anatomy.worldToLocal(actual);
      expect(actual.distanceTo(new Vector3().fromBufferAttribute(p,i))).toBeLessThan(1e-7);
    });
    const baked=bakeAvatarSurface(scene);
    expect(baked.children).toHaveLength(1);
    expect(baked.children[0].geometry.index.count).toBe(original.count);
    anatomy.visible=false;expect(body.geometry.index).toBe(original);
    anatomy.visible=true;expect(body.geometry.index.count).toBeLessThan(original.count);
    d.dispose();expect(body.geometry.index).toBe(original);
    expect(anatomy.children.filter(c=>c.userData.sensitive)).toHaveLength(0);
    expect(anatomicalBodyExportIndex(body)).toBe(original);
    // React development effect replay must rebuild once, without duplicate
    // surfaces or losing the intact covered-body index.
    d.apply({});d.apply({});
    expect(anatomy.children.filter(c=>c.userData.sensitive)).toHaveLength(3);
    anatomy.visible=false;expect(body.geometry.index).toBe(original);
  });
  it('opens the terminal ring into a recessed duct and keeps separate skin layers through retraction',()=>{
    const {body,anatomy}=glbMeshFixture(file),d=createPrivateAnatomyDeformer(anatomy,body);
    const {segments,shaftRings,tipVertex}=anatomy.userData.layout;
    const e=d.apply({penis:{resting:{shape:{foreskinCoverage:100}}}});
    expect(Array.from(anatomy.geometry.index.array)).not.toContain(tipVertex);
    const duct=anatomy.getObjectByName('PrivateAnatomyMeatus'),skin=anatomy.getObjectByName('PrivateAnatomyForeskin');
    for(let k=0;k<segments;k++){
      const edge=new Vector3().fromBufferAttribute(duct.geometry.attributes.position,k);
      const ring=new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,(shaftRings-1)*segments+k);
      expect(edge.distanceTo(ring)).toBeLessThan(1e-7);
      const inner=new Vector3().fromBufferAttribute(duct.geometry.attributes.position,4*segments+k);
      expect(inner.distanceTo(edge)/e.unit).toBeGreaterThan(.4);
    }
    for(const state of ['resting','erect'])for(const retraction of [0,50,100]){
      d.apply({penis:{[state]:{shape:{foreskinCoverage:100,foreskinRetraction:retraction,curvature:20}}}},{state,heightScale:1.1});
      expect(skin.visible).toBe(true);
      expect(Array.from(skin.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      for(let k=0;k<segments;k++){
        const outer=new Vector3().fromBufferAttribute(skin.geometry.attributes.position,10*segments+k);
        const inner=new Vector3().fromBufferAttribute(skin.geometry.attributes.position,38*segments+k);
        expect(outer.distanceTo(inner)).toBeGreaterThan(.0001);
      }
    }
    d.apply({});expect(skin.visible).toBe(false);
  });
});

it('shares diagnostic materials without shader injection or disposing their live uniforms',()=>{
  const {body,anatomy}=glbMeshFixture(),d=createPrivateAnatomyDeformer(anatomy,body);
  d.apply({});
  const delta=createDeltaMaterial(),dispose=vi.spyOn(delta,'dispose');
  body.material=anatomy.material=delta;
  d.updateDetails();
  const patch=anatomy.getObjectByName('PrivateAnatomyPelvicTransition');
  expect(patch.material).toBe(delta);
  const shader={uniforms:{},vertexShader:delta.vertexShader,fragmentShader:delta.fragmentShader};
  patch.material.onBeforeCompile(shader);
  expect(shader.vertexShader).not.toContain('vPelvicUv');
  delta.uniforms.uTime.value=4;
  expect(patch.material.uniforms.uTime.value).toBe(4);
  body.material=anatomy.material=new MeshBasicMaterial();d.updateDetails();
  expect(dispose).not.toHaveBeenCalled();
  body.material=anatomy.material=delta;d.updateDetails();d.dispose();
  expect(dispose).not.toHaveBeenCalled();delta.dispose();
});

it('carries regional body vertex pigment into the pelvic atlas blend',()=>{
  const {body,anatomy}=glbMeshFixture();
  body.material=createPhysicalSkinMaterial(2,null,{vertexColors:true});
  anatomy.material=applyAnatomySurface(createPhysicalSkinMaterial(2,null,{surfaceDetail:true}));
  const color=body.geometry.attributes.color;
  for(let i=0;i<color.count;i++)color.setXYZ(i,.3,.5,.7);
  color.needsUpdate=true;
  const d=createPrivateAnatomyDeformer(anatomy,body),e=d.apply({});
  const patch=anatomy.getObjectByName('PrivateAnatomyPelvicTransition');
  const pigment=patch.geometry.attributes.pelvicPigment;
  expect(pigment).toBeDefined();
  for(let i=0;i<e.tissues.pelvicBoundaryVertices;i++){
    expect(pigment.getX(i)).toBeCloseTo(.3);expect(pigment.getY(i)).toBeCloseTo(.5);expect(pigment.getZ(i)).toBeCloseTo(.7);
  }
  const shader={uniforms:{},vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader};
  patch.material.onBeforeCompile(shader);
  expect(shader.fragmentShader).toContain('uPelvicColor*vPelvicPigment');
  d.dispose();body.material.dispose();anatomy.material.dispose();
});

it('reads normalized RGBA body pigment with its actual attribute stride',()=>{
  const {body,anatomy}=glbMeshFixture();
  const colors=new Uint8Array(body.geometry.attributes.position.count*4);
  for(let i=0;i<colors.length;i+=4)colors.set([128,64,32,255],i);
  body.geometry.setAttribute('color',new BufferAttribute(colors,4,true));
  body.material.vertexColors=true;
  const d=createPrivateAnatomyDeformer(anatomy,body),e=d.apply({});
  const pigment=anatomy.getObjectByName('PrivateAnatomyPelvicTransition').geometry.attributes.pelvicPigment;
  for(let i=0;i<e.tissues.pelvicBoundaryVertices;i++)for(let axis=0;axis<3;axis++){
    expect(pigment.getComponent(i,axis)).toBeCloseTo([128,64,32][axis]/255);
  }
  d.dispose();
});
