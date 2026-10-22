// @vitest-environment node
import {expect,it} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {readGlb} from '../../scripts/plan-preview/glb.mjs';
import {appender} from '../../scripts/human75/glb-tools.mjs';

const source='public/assets/models/humanoid-preview-75-lite.glb';
it('validates the requested GLB alone and fails for a missing requested asset',()=>{
  const checked=spawnSync(process.execPath,['scripts/validate-glb-format.mjs',source],{encoding:'utf8'});
  expect(checked.status,checked.stderr).toBe(0);
  const reports=checked.stdout.trim().split(/\r?\n/).map(line=>JSON.parse(line));
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({file:source,errors:0,warnings:0});
  const missing=spawnSync(process.execPath,['scripts/validate-glb-format.mjs','missing-requested-asset.glb'],{encoding:'utf8'});
  expect(missing.status).not.toBe(0);
  expect(missing.stdout).not.toContain('humanoid-base');
});
it('keeps original repair history when a normalized asset is checked again',()=>{
  const folder=mkdtempSync(join(tmpdir(),'growthtrack-format-history-'));
  const review='docs/real-human-3d/data/review-75',models='public/assets/models',file='humanoid-base-lite.glb';
  mkdirSync(join(folder,review),{recursive:true});mkdirSync(join(folder,models),{recursive:true});
  const history=JSON.parse(readFileSync(join(review,'format-repair.json'),'utf8')).assets.find(item=>item.file===file);
  const manifest=JSON.parse(readFileSync(join(models,'ASSET-PROVENANCE.json'),'utf8')).assets.find(item=>item.path===models+'/'+file);
  copyFileSync(join(models,file),join(folder,models,file));
  writeFileSync(join(folder,review,'cases.json'),JSON.stringify({assets:[file]}));
  writeFileSync(join(folder,review,'format-repair.json'),JSON.stringify({assets:[history]}));
  writeFileSync(join(folder,models,'ASSET-PROVENANCE.json'),JSON.stringify({assets:[manifest]}));
  const result=spawnSync(process.execPath,[resolve('scripts/normalize-human-glb-format.mjs'),'--write'],{cwd:folder,encoding:'utf8'});
  expect(result.status,result.stderr).toBe(0);
  const updated=JSON.parse(readFileSync(join(folder,review,'format-repair.json'),'utf8')).assets[0];
  expect(updated.before).toEqual(history.before);
  expect(updated.changes).toEqual(history.changes);
  expect(updated.changes.positionBounds).toBeGreaterThan(0);
  expect(updated.latestRun.unchanged).toBe(true);
  expect(Object.values(updated.latestRun.changes).every(value=>value===0)).toBe(true);
});
function validate(mutate){
  const writer=appender(readGlb(source));mutate(writer.json);
  const path=join(mkdtempSync(join(tmpdir(),'growthtrack-glb-check-')),'test.glb');writeFileSync(path,writer.pack());
  return spawnSync(process.execPath,['scripts/validate-glb.js',path],{encoding:'utf8'});
}
it('accepts explicit constant optical surfaces but still rejects missing skin textures',()=>{
  expect(validate(()=>{}).status).toBe(0);
  const result=validate(json=>{delete json.materials[0].pbrMetallicRoughness.baseColorTexture;});
  expect(result.status).toBe(1);expect(result.stdout+result.stderr).toContain('PBR textures or declared optical factors');
});
it('rejects invalid surface factors and attempts to exempt a shared skin material',()=>{
  const invalid=validate(json=>{json.materials.find(m=>m.name==='GrowthTrackCorneaMaterial').pbrMetallicRoughness.roughnessFactor=-.1;});
  expect(invalid.status).toBe(1);
  const shared=validate(json=>{json.meshes.find(m=>m.name==='GrowthTrackNails').primitives[0].material=0;delete json.materials[0].normalTexture;});
  expect(shared.status).toBe(1);expect(shared.stdout+shared.stderr).toContain('PBR textures or declared optical factors');
});
