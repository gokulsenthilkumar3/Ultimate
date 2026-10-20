// @vitest-environment node
import {beforeAll,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {createAuthoredGarment} from './authoredGarments';
import {wardrobeDefaults} from '../../lib/wardrobePreferences';

let garments;
beforeAll(async()=> {
  const bytes=readFileSync('public/assets/wardrobe/wardrobe-v1.glb');
  garments=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene.children;
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
