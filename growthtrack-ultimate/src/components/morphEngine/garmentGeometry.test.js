import { expect,it } from 'vitest';
import { Box3,ShaderLib } from 'three';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { createGarmentGeometry,GARMENT_REGIONS } from './garmentGeometry';
import { createClothMaterial,switchWardrobePreset } from './WardrobeShader';
import { sanitizeWardrobePreferences } from '../../lib/wardrobePreferences';

it('creates real fit offsets, keeps skinning and morphs, and follows local body edits',()=> {
  const {body}=glbMeshFixture(),source=body.geometry.attributes.position.array.slice();
  const fitted=createGarmentGeometry(body,{fit:'fitted'}),relaxed=createGarmentGeometry(body,{fit:'relaxed'});
  expect(fitted.geometry).not.toBe(body.geometry);
  expect(fitted.geometry.attributes.position.array).not.toEqual(source);
  expect(relaxed.geometry.attributes.position.array).not.toEqual(fitted.geometry.attributes.position.array);
  expect(fitted.geometry.morphAttributes.position.length).toBe(body.geometry.morphAttributes.position.length);
  const regions=[...new Set(fitted.geometry.attributes.garmentRegion.array)];
  expect(regions).toEqual(expect.arrayContaining([GARMENT_REGIONS.hand,GARMENT_REGIONS.leg,GARMENT_REGIONS.torso]));
  for(let i=0;i<fitted.geometry.attributes.garmentRegion.count;i++) if(fitted.geometry.attributes.garmentRegion.getX(i)===GARMENT_REGIONS.foot) expect(fitted.geometry.attributes.garmentCoverage.getX(i)).toBe(0);
  const mask=fitted.geometry.attributes.garmentCoverage;
  // Every point between a pelvis vertex and a leg vertex keeps lower coverage.
  const pelvis=Array.from(fitted.geometry.attributes.garmentRegion.array).indexOf(GARMENT_REGIONS.pelvis);
  const leg=Array.from(fitted.geometry.attributes.garmentRegion.array).indexOf(GARMENT_REGIONS.leg);
  for(const t of [.25,.5,.75]) expect(mask.getX(pelvis)*(1-t)+mask.getX(leg)*t).toBe(1);
  const before=fitted.geometry.attributes.position.getX(0);
  body.geometry.attributes.position.setX(0,body.geometry.attributes.position.getX(0)+.01);body.geometry.attributes.position.needsUpdate=true;
  fitted.update();expect(fitted.geometry.attributes.position.getX(0)-before).toBeCloseTo(.01,6);
  fitted.dispose();relaxed.dispose();
});

it('uses physical fabric properties and matching cropped shadow coverage',()=> {
  const {body}=glbMeshFixture();
  const cotton=createClothMaterial('CASUAL',body.geometry,{fabric:'cotton'}),performance=createClothMaterial('GYM',body.geometry,{variant:'compression',fabric:'performance',hemLength:80});
  expect(cotton.roughness).toBeGreaterThan(performance.roughness);
  expect(performance.userData.uniforms.uTankStyle.value).toBe(0);
  expect(performance.userData.uniforms.uSleeves.value).toBe(1);
  const source=createClothMaterial('FORMAL',body.geometry,{pattern:'source'});
  expect(source.userData.uniforms.uTrimDetail.value).toBe(0);source.dispose();
  for(const material of [performance,performance.userData.depthMaterial,performance.userData.distanceMaterial]) {
    const lib=material===performance?ShaderLib.physical:material===performance.userData.depthMaterial?ShaderLib.depth:ShaderLib.distance;
    const shader={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};
    material.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain('garmentCoordinates');
    expect(shader.fragmentShader).toContain('if (!lowerCloth && !torsoCloth) discard;');
  }
  switchWardrobePreset(performance,'FORMAL');
  expect(performance.userData.wardrobePreset).toBe('FORMAL');
  expect(performance.userData.uniforms.uSleeves.value).toBe(2);
  cotton.dispose();performance.dispose();
});

it('only masks the hidden body interior and restores the skin shader when undressed',()=> {
  const {body}=glbMeshFixture(),cloth=createClothMaterial('UNDERWEAR',body.geometry,{variant:'briefs'});
  const skin=body.material,original=skin.onBeforeCompile;
  const restore=cloth.userData.maskBody(skin,body);
  const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};
  skin.onBeforeCompile(shader);
  expect(shader.fragmentShader).toContain('if(lowerInterior || topInterior) discard;');
  expect(shader.fragmentShader).not.toContain('if (!lowerCloth && !torsoCloth) discard;');
  expect(body.geometry.attributes.garmentCoverage.count).toBe(body.geometry.attributes.position.count);
  restore();expect(skin.onBeforeCompile).toBe(original);cloth.dispose();
});
it('builds distinct coverage, sleeve and color choices while rejecting persisted reveal mode',()=> {
  const {body}=glbMeshFixture();
  const brief=createClothMaterial('UNDERWEAR',body.geometry,{variant:'briefs',bottomColor:'#223344'});
  const boxer=createClothMaterial('UNDERWEAR',body.geometry,{variant:'boxerBriefs'});
  const neutral=new Box3().setFromBufferAttribute(body.geometry.attributes.position);
  expect(boxer.userData.uniforms.uClothMin.value).toBe(neutral.min.y);
  expect(boxer.userData.uniforms.uClothScale.value).toBeCloseTo(1.92/(neutral.max.y-neutral.min.y),8);
  expect(brief.userData.uniforms.uLowerBand.value.x).toBeGreaterThan(boxer.userData.uniforms.uLowerBand.value.x);
  expect(createClothMaterial('GYM',body.geometry,{variant:'training'}).userData.uniforms.uSleeves.value).toBe(1);
  expect(createClothMaterial('CASUAL',body.geometry,{variant:'sweatshirt'}).userData.uniforms.uSleeves.value).toBe(2);
  expect(sanitizeWardrobePreferences({preset:'ANATOMICAL'}).preset).toBe('UNDERWEAR');
  expect(sanitizeWardrobePreferences({outfits:{GYM:{topColor:'invalid'}}}).outfits.GYM.topColor).toMatch(/^#[\da-f]{6}$/i);
});
