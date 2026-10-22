import {expect,it} from 'vitest';
import {microStrength,sanitizeDigits} from './humanSurface';
import {sanitizePoseStudio} from './poseStudio';
it('validates saved hand and toe JSON independently without retaining arbitrary fields',()=>{
  const pose=sanitizePoseStudio({current:{enabled:true,digits:{leftHand:{shape:'fist',strength:20,spread:Infinity,privateValue:1},rightFoot:{curl:-10},unknown:{curl:1}}},goal:{digits:{leftHand:{shape:'bad',strength:NaN}}}});
  expect(pose.current.digits).toEqual({leftHand:{shape:'fist',strength:1,spread:0},rightFoot:{curl:-.3}});
  expect(pose.goal.digits).toEqual({leftHand:{shape:'open',strength:1,spread:0}});
  expect(sanitizeDigits([])).toBeUndefined();expect(sanitizeDigits(null)).toBeUndefined();
  expect(microStrength(Infinity)).toBe(.45);expect(microStrength(-1)).toBe(0);expect(microStrength(2)).toBe(1);
});
