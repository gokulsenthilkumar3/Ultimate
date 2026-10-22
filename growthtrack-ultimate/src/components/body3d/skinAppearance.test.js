import {describe,it,expect} from 'vitest';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {prepareSkinRegions,resolveSkinAppearance,skinLayerMultiplier} from './skinAppearance';
import {bodyProfileToGoals,metricsToBodyProfile} from '../../lib/physiqueProfile';
describe('independent skin layers',()=>{
  it.each(['constructor','toString','__proto__','unknown'])('keeps malformed saved undertone %s out of shader uniforms', value => {
    const appearance=resolveSkinAppearance({skinUndertone:value});
    expect(appearance.undertone).toBe(0);
    expect(skinLayerMultiplier(appearance).every(Number.isFinite)).toBe(true);
  });
  it('leaves the base unchanged at rest; tan darkens exposed skin more than protected skin',()=>{
    expect(skinLayerMultiplier()).toEqual([1,1,1]);
    const exposed=skinLayerMultiplier({tan:1,exposure:.9}),protectedSkin=skinLayerMultiplier({tan:1,exposure:.04});
    exposed.forEach((channel,i)=>{expect(channel).toBeLessThan(protectedSkin[i]);expect(channel).toBeGreaterThan(0);});
    expect(skinLayerMultiplier({tan:1,exposure:0})).toEqual([1,1,1]);
  });
  it('normalizes malformed layers without changing constitutive skin color',()=>{
    const metrics={skinColor:'#bc8970',skinTone:'IV',skinTan:9,skinUndertone:'warm',skinFlush:NaN};
    expect(resolveSkinAppearance(metrics)).toEqual({tan:1,undertone:1,flush:0,capacity:1});
    expect(metrics.skinColor).toBe('#bc8970');expect(resolveSkinAppearance({skinTan:'bad'}).tan).toBe(0);
  });
  it('derives finite regional masks from the actual skinning weights',()=>{
    const {body}=glbMeshFixture('humanoid-adult-v2-lite.glb');prepareSkinRegions(body);
    const exposure=body.geometry.attributes.skinExposure.array;
    expect(Math.min(...exposure)).toBeGreaterThanOrEqual(0);expect(Math.max(...exposure)).toBeLessThanOrEqual(1.001);
    expect(Math.min(...exposure)).toBeLessThan(.1);expect(Math.max(...exposure)).toBeGreaterThan(.8);
    const roughness=Array.from(body.geometry.attributes.skinRoughness.array);
    expect(roughness.every(Number.isFinite)).toBe(true);
    expect(Math.min(...roughness)).toBeGreaterThanOrEqual(.82 - 1e-6);
    expect(Math.min(...roughness)).toBeLessThan(1);
    expect(Math.max(...roughness)).toBeGreaterThan(1);
    expect(Math.max(...roughness)).toBeLessThanOrEqual(1.15 + 1e-6);
  });
  it('stores render layers outside database measurement fields and restores independent goal appearance',()=>{
    expect(metricsToBodyProfile({height:175,skinColor:'#bc8970',skinTan:.6,skinFlush:.3})).toEqual({heightCm:175,skinColorHex:'#bc8970'});
    expect(bodyProfileToGoals({}, {goalMetrics:{height:180,skinColor:'#886644',skinTan:.2,skinUndertone:'cool'}})).toEqual({height:180,skinColor:'#886644',skinTan:.2,skinUndertone:'cool'});
  });
});
