import { expect,it } from 'vitest';
import { Box3 } from 'three';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { createGarmentGeometry,GARMENT_REGIONS } from './garmentGeometry';
import { createClothMaterial } from './WardrobeShader';
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
