// @vitest-environment node
import {beforeAll,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {createAuthoredGarment,authoredGarmentLandmarks,waistHeightAt} from './authoredGarments';
import {wardrobeDefaults} from '../../lib/wardrobePreferences';
import {Box3,BufferGeometry,DoubleSide,Ray,ShaderLib,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {createClothMaterial} from './WardrobeShader';
import {buildMorphWeights} from './metricsToBlendshapes';

let garments;
beforeAll(async()=> {
  const manifest=JSON.parse(readFileSync('public/assets/wardrobe/manifest.json','utf8'));
  garments=await Promise.all(Object.values(manifest.garments).map(async record=> {
    const bytes=readFileSync('public/assets/wardrobe/'+record.geometry);
    return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene.children[0];
  }));
});
it('uses independent authored topology and normalized pose weights for every outfit source',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
  expect(garments.map(mesh=>mesh.name)).toEqual(['tee','sweatshirt','shirt','suit']);
  for(const asset of garments) {
    const before=asset.geometry.attributes.position.array.slice(),garment=createAuthoredGarment(body,asset,wardrobeDefaults('CASUAL'));
    expect(garment.authored).toBe(true);expect(garment.geometry).not.toBe(asset.geometry);
    expect(garment.geometry.attributes.position.count).not.toBe(body.geometry.attributes.position.count);
    const weights=garment.geometry.attributes.skinWeight;
    for(let i=0;i<weights.count;i++) expect(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)).toBeCloseTo(1,5);
    expect(asset.geometry.attributes.position.array).toEqual(before);
    garment.dispose();
  }
});
it('falls back for equal-count bodies with different triangle or vertex correspondence',()=> {
  for(const change of ['indices','uv']) {
    const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
    const attribute=change==='indices'?body.geometry.index:body.geometry.attributes.uv;
    attribute.setX(0,attribute.getX(0)+1);
    expect(createAuthoredGarment(body,garments[0])).toBeNull();
  }
});
it('follows body morphs and local edits without changing the other clone or source clothing',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb'),goal=glbMeshFixture('humanoid-adult-v2-lite.glb').body;
  const source=garments[0],options={...wardrobeDefaults('GYM'),easeCm:0};
  const currentGarment=createAuthoredGarment(body,source,options),goalGarment=createAuthoredGarment(goal,source,options);
  const before=currentGarment.geometry.attributes.position.array.slice(),goalBefore=goalGarment.geometry.attributes.position.array.slice();
  body.morphTargetInfluences[body.morphTargetDictionary.hip_width]=.8;
  body.morphTargetInfluences[body.morphTargetDictionary.overall_mass]=.4;
  currentGarment.update();
  expect(currentGarment.geometry.attributes.position.array).not.toEqual(before);
  expect(goalGarment.geometry.attributes.position.array).toEqual(goalBefore);
  const bindings=source.geometry.getAttribute('_body_indices'),bary=source.geometry.getAttribute('_body_bary');
  const strongest=[0,1,2].sort((a,b)=>bary.getComponent(0,b)-bary.getComponent(0,a))[0],id=bindings.getComponent(0,strongest);
  const previous=currentGarment.geometry.attributes.position.getX(0);
  body.geometry.attributes.position.setX(id,body.geometry.attributes.position.getX(id)+.01);body.geometry.attributes.position.needsUpdate=true;
  currentGarment.update();
  expect(currentGarment.geometry.attributes.position.getX(0)).not.toBe(previous);
  currentGarment.dispose();goalGarment.dispose();
});
it('changes geometric ease, length and waist position without rewriting body measurements',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb'),before=body.geometry.attributes.position.array.slice();
  const fitted=createAuthoredGarment(body,garments[0],{easeCm:.5,fit:'fitted',hemLength:80,waistRiseCm:-2});
  const relaxed=createAuthoredGarment(body,garments[0],{easeCm:4,fit:'relaxed',hemLength:120,waistRiseCm:2});
  expect(relaxed.geometry.attributes.position.array).not.toEqual(fitted.geometry.attributes.position.array);
  expect(body.geometry.attributes.position.array).toEqual(before);
  fitted.dispose();relaxed.dispose();
});

it('retains the authored waistband above the seat for every lower outfit and keeps rise adjustable',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb'),bounds=new Box3().setFromBufferAttribute(body.geometry.attributes.position);
  const scale=1.92/(bounds.max.y-bounds.min.y);
  for(const [preset,source] of [['UNDERWEAR',garments[0]],['GYM',garments[0]],['CASUAL',garments[1]],['FORMAL',garments[2]],['FORMAL',garments[3]],['SWIMWEAR',garments[0]]]) {
    const p=source.geometry.attributes.position,coverage=source.geometry.getAttribute('_garment_coverage');
    let highest=-Infinity,waistVertex=-1;
    for(let i=0;i<p.count;i++)if(coverage.getX(i)>.9) {
      const y=(p.getY(i)-bounds.min.y)*scale;
      if(y>highest){highest=y;waistVertex=i;}
    }
    const options=wardrobeDefaults(preset),cloth=createClothMaterial(preset,body.geometry,options,{mesh:source});
    expect(cloth.userData.uniforms.uLowerBand.value.y).toBeGreaterThanOrEqual(highest-1e-6);
    expect(cloth.userData.uniforms.uBodyLowerBand.value.y).toBeGreaterThan(1);
    const low=createAuthoredGarment(body,source,{...options,easeCm:0,waistRiseCm:-3});
    const high=createAuthoredGarment(body,source,{...options,easeCm:0,waistRiseCm:3});
    expect(high.geometry.attributes.position.getY(waistVertex)-low.geometry.attributes.position.getY(waistVertex)).toBeCloseTo(6*(bounds.max.y-bounds.min.y)/175,5);
    if(['UNDERWEAR','SWIMWEAR'].includes(preset)) {
      const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};
      cloth.onBeforeCompile(shader);
      expect(shader.fragmentShader).not.toContain('bool torsoCloth = vGarmentCoverage.y > .2;');
    }
    low.dispose();high.dispose();cloth.dispose();
  }
});

it('keeps authored sleeve seams intact and masks ankle-weighted shins above the trouser cuff',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
  const cloth=createClothMaterial('CASUAL',body.geometry,{...wardrobeDefaults('CASUAL'),hemLength:120},{mesh:garments[1]});
  for(const material of [cloth,cloth.userData.depthMaterial,cloth.userData.distanceMaterial]) {
    const lib=material===cloth?ShaderLib.physical:material===cloth.userData.depthMaterial?ShaderLib.depth:ShaderLib.distance;
    const shader={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};
    material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain('bool torsoCloth = vGarmentCoverage.y > .2;');
  }
  expect(cloth.userData.uniforms.uBodyLowerBand.value.x).toBeGreaterThan(0);
  const restore=cloth.userData.maskBody(body.material,body),regions=body.geometry.attributes.garmentRegion;
  for(let i=0;i<regions.count;i++) if(regions.getX(i)===6)expect(body.geometry.attributes.garmentCoverage.getX(i)).toBe(1);
  restore();cloth.dispose();
});

it('follows the front, side and back waist contour instead of masking or trimming at one flat height',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
  for(const source of garments) {
    const landmarks=authoredGarmentLandmarks(source.geometry);
    expect(landmarks.contour.length).toBeGreaterThan(20);
    expect(landmarks.waistMax-landmarks.waistMin).toBeGreaterThan(.001);
    for(const sample of landmarks.contour) {
      const x=landmarks.center.x+Math.cos(sample.angle),z=landmarks.center.z+Math.sin(sample.angle);
      expect(waistHeightAt(landmarks,x,z)).toBeCloseTo(sample.height,5);
    }
    const asset={mesh:source},options={...wardrobeDefaults('UNDERWEAR'),waistRiseCm:3};
    const cloth=createClothMaterial('UNDERWEAR',body.geometry,options,asset),fallback=createClothMaterial('UNDERWEAR',body.geometry,options);
    expect(cloth.customProgramCacheKey()).not.toBe(fallback.customProgramCacheKey());
    const restore=cloth.userData.maskBody(body.material,body);
    const values=body.geometry.getAttribute('garmentWaistHeight').array;
    expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.001);
    const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};
    body.material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain('vGarmentWaistHeight+uWaistRise');
    restore();cloth.dispose();fallback.dispose();
  }
});

it('keeps upper fabric outside trousers at every rise after changing pelvis measurements',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
  const weights=buildMorphWeights({height:175,weight:75,bodyFat:19,waist:82,chest:99,hips:96,shoulders:112,arms:33,neck:37});
  for(const [name,weight] of Object.entries(weights))if(body.morphTargetDictionary[name]!==undefined)body.morphTargetInfluences[body.morphTargetDictionary[name]]=weight;
  for(const source of garments)for(const waistRiseCm of [-3,0,3]) {
    const garment=createAuthoredGarment(body,source,{easeCm:1.2,fit:'regular',waistRiseCm}),g=garment.geometry,p=g.attributes.position,c=g.attributes.garmentCoverage,indices=[];
    for(let i=0;i<g.index.count;i+=3){const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];if(ids.every(id=>c.getX(id)>.9))indices.push(...ids);}
    const lower=new BufferGeometry();lower.setAttribute('position',p);lower.setIndex(indices);
    const bvh=new MeshBVH(lower),ray=new Ray(),landmarks=authoredGarmentLandmarks(source.geometry);
    let comparisons=0;
    for(let i=0;i<p.count;i++)if(c.getY(i)>.9 && p.getY(i)<landmarks.waistMax+.05) {
      ray.origin.set(0,p.getY(i),0);ray.direction.set(p.getX(i),0,p.getZ(i));const radius=ray.direction.length();ray.direction.normalize();
      for(const hit of bvh.raycast(ray,DoubleSide)){comparisons++;expect(radius+1e-5).toBeGreaterThanOrEqual(hit.distance);}
    }
    for(let i=0;i<g.index.count;i+=3) {
      const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];if(!ids.every(id=>c.getY(id)>.9))continue;
      const center=new Vector3();for(const id of ids)center.add(new Vector3().fromBufferAttribute(p,id));center.divideScalar(3);
      if(center.y>landmarks.waistMax+.05)continue;
      ray.origin.set(0,center.y,0);ray.direction.set(center.x,0,center.z);const radius=ray.direction.length();ray.direction.normalize();
      for(const hit of bvh.raycast(ray,DoubleSide))expect(radius+1e-5).toBeGreaterThanOrEqual(hit.distance);
    }
    expect(comparisons).toBeGreaterThan(0);lower.dispose();garment.dispose();
  }
},30000);

it('keeps both sides of UV seams sewn together when applying ease and body morphs',()=> {
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
  body.morphTargetInfluences[body.morphTargetDictionary.overall_mass]=.4;
  for(const source of garments) {
    const garment=createAuthoredGarment(body,source,{easeCm:6,fit:'relaxed'}),weld=garment.geometry.getAttribute('_garment_weld'),seen=new Map();
    const position=garment.geometry.attributes.position,normal=garment.geometry.attributes.normal;
    let seams=0;
    for(let i=0;i<weld.count;i++) {
      const id=weld.getX(i),other=seen.get(id);
      if(other===undefined){seen.set(id,i);continue;}
      seams++;
      for(let k=0;k<3;k++) {
        expect(position.getComponent(i,k)).toBeCloseTo(position.getComponent(other,k),5);
        expect(normal.getComponent(i,k)).toBeCloseTo(normal.getComponent(other,k),5);
      }
    }
    expect(seams).toBeGreaterThan(0);garment.dispose();
  }
});

it('keeps authored shoulder straps in tank color and shadow coverage',()=>{
  const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');
  const cloth=createClothMaterial('GYM',body.geometry,{...wardrobeDefaults('GYM'),variant:'tank'},{mesh:garments[0]});
  for(const material of [cloth,cloth.userData.depthMaterial,cloth.userData.distanceMaterial]) {
    const lib=material===cloth?ShaderLib.physical:material===cloth.userData.depthMaterial?ShaderLib.depth:ShaderLib.distance;
    const shader={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};
    material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain('torsoCloth = torsoBand && vGarmentCoverage.y > .2 && vGarmentCoverage.w < .2 && (tankBody || tankStraps)');
    expect(shader.fragmentShader).not.toContain('torsoCloth = torsoCloth && (tankBody || tankStraps)');
  }
  cloth.dispose();
});

it('transfers corrected body skin weights to clothing without mutating the source',()=>{
 const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb'),source=garments[0],before=source.geometry.attributes.skinWeight.array.slice();
 for(let i=0;i<body.geometry.attributes.skinIndex.count;i++){body.geometry.attributes.skinIndex.setXYZW(i,3,0,0,0);body.geometry.attributes.skinWeight.setXYZW(i,1,0,0,0);}
 const garment=createAuthoredGarment(body,source,wardrobeDefaults('GYM'));
 for(let i=0;i<garment.geometry.attributes.skinIndex.count;i++){expect(garment.geometry.attributes.skinIndex.getX(i)).toBe(3);expect(garment.geometry.attributes.skinWeight.getX(i)).toBeCloseTo(1,6);}
 expect(source.geometry.attributes.skinWeight.array).toEqual(before);garment.dispose();
});
