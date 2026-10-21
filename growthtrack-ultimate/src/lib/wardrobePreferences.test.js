import {expect,it} from 'vitest';
import {sanitizeWardrobePreferences,wardrobeDefaults,wardrobeAssetKey} from './wardrobePreferences';

it('migrates existing outfits while keeping independent style and color selections',()=> {
  const result=sanitizeWardrobePreferences({preset:'FORMAL',outfits:{FORMAL:{variant:'suit',topColor:'#224466'},GYM:{variant:'compression',fit:'fitted'}}});
  expect(result).toMatchObject({preset:'FORMAL',outfits:{FORMAL:{variant:'suit',topColor:'#224466',hemLength:100},GYM:{variant:'compression',fit:'fitted',fabric:'performance'}}});
  expect(result.outfits.CASUAL).toEqual(wardrobeDefaults('CASUAL'));
  expect(wardrobeAssetKey('FORMAL','suit')).toBe('suit');
  expect(wardrobeAssetKey('CASUAL','sweatshirt')).toBe('sweatshirt');
});
it('validates garment presentation inputs without persisting anatomical reveal',()=> {
  const value=sanitizeWardrobePreferences({preset:'ANATOMICAL',outfits:{GYM:{fabric:'__proto__',pattern:'bad',easeCm:0,waistRiseCm:-200,hemLength:500,textureStrength:'invalid',bottomColor:'red'}}});
  expect(value.preset).toBe('UNDERWEAR');
  expect(value.outfits.GYM).toMatchObject({fabric:'performance',pattern:'solid',easeCm:0,waistRiseCm:-3,hemLength:120,textureStrength:65,bottomColor:'#172334'});
  for(const input of [null,[],{},'invalid']) expect(sanitizeWardrobePreferences(input).outfits.UNDERWEAR).toEqual(wardrobeDefaults('UNDERWEAR'));
});
