import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readGlb,readAccessor} from '../../scripts/plan-preview/glb.mjs';
import {featureRepairIntegrity} from '../../scripts/feature-repair-integrity.mjs';
const formatRepair=JSON.parse(readFileSync(resolve('docs/real-human-3d/data/review-75/format-repair.json')));

const evidence=JSON.parse(readFileSync(resolve('docs/real-human-3d/data/feature-topology-repair.json')));
const triangles={GrowthTrackEyes:2040,GrowthTrackHair:3344,GrowthTrackEyebrows:192,GrowthTrackEyelashes:368};
describe.each(evidence.assets)('repaired source topology $asset',entry=>{
  it('retains the pre-repair body geometry, all body morphs, rig and embedded images byte for byte',()=>{
    const file=resolve('public/assets/models',entry.asset),glb=readGlb(file);
    const bytes=readFileSync(file),currentHash=createHash('sha256').update(bytes).digest('hex');
    const format=formatRepair.assets.find(item=>item.file===entry.asset);
    expect(format.before.sha256).toBe(entry.sha256);
    // The historical proof and reconstructed original attributes travel with
    // the checkout. Local safety backups are deliberately not a CI input.
    expect(format.before.integrity).toEqual(entry.unchanged);
    expect(format.after.sha256).toBe(currentHash);
    expect(featureRepairIntegrity(glb,{excludeAttributes:['TANGENT']})).toEqual(entry.unchanged);
    expect(featureRepairIntegrity(glb)).toEqual(format.after.integrity);
  });
  it('includes every source quad triangle and complete, finite proxy morph arrays',()=>{
    const glb=readGlb(resolve('public/assets/models',entry.asset));
    for(const [name,count] of Object.entries(triangles)){
      const mesh=glb.json.meshes.find(mesh=>mesh.name===name),p=mesh.primitives[0];
      const indices=readAccessor(glb,p.indices).data,position=readAccessor(glb,p.attributes.POSITION);
      expect(indices.length/3,name).toBe(count);
      expect(Math.max(...indices)).toBeLessThan(position.count);
      expect(p.targets).toHaveLength(mesh.extras.targetNames.length);
      for(const target of p.targets){
        const delta=readAccessor(glb,target.POSITION);
        expect(delta.count).toBe(position.count);
        expect(delta.data.every(Number.isFinite)).toBe(true);
      }
      expect(readAccessor(glb,p.attributes.NORMAL).data.every(Number.isFinite)).toBe(true);
    }
  });
});
