import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readGlb,readAccessor,readImage} from './plan-preview/glb.mjs';
import {normalizeGlbFormat,glbFromBytes} from './gltf-format.mjs';
import {featureRepairIntegrity} from './feature-repair-integrity.mjs';

const write=process.argv.includes('--write'),cases=JSON.parse(fs.readFileSync('docs/real-human-3d/data/review-75/cases.json'));
const manifestPath='public/assets/models/ASSET-PROVENANCE.json',manifest=JSON.parse(fs.readFileSync(manifestPath));
const out='docs/real-human-3d/data/review-75/format-repair.json',old=fs.existsSync(out)?JSON.parse(fs.readFileSync(out)):null;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b)=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).equals(Buffer.from(b.buffer,b.byteOffset,b.byteLength));
const assets=[];
for(const file of cases.assets){
  const relative='public/assets/models/'+file,entry=manifest.assets.find(item=>item.path===relative),sourceBytes=fs.readFileSync(relative);
  if(!entry || hash(sourceBytes)!==entry.sha256)throw new Error(`Unknown input: ${relative}`);
  const source=readGlb(relative),result=normalizeGlbFormat(source),next=glbFromBytes(result.bytes),prior=old?.assets.find(a=>a.file===file);
  // Strictly compare pre-existing geometric/morph/image payloads. The sole
  // representation change is zero-weight joint slots, which cannot deform skin.
  for(const mesh of source.json.meshes){const after=next.json.meshes.find(m=>m.name===mesh.name);
    for(const [i,p] of mesh.primitives.entries()){
      const q=after.primitives[i];
      for(const [key,id] of Object.entries(p.attributes)){
        const a=readAccessor(source,id).data,b=readAccessor(next,q.attributes[key]).data;
        if(key==='JOINTS_0'){
          const weights=readAccessor(source,p.attributes.WEIGHTS_0).data;
          if(!a.every((value,k)=>value===b[k] || weights[k]===0 && b[k]===0))throw new Error('Changed active skin joint');
        }else if(key.startsWith('_')){if(!a.every((value,k)=>value===b[k]))throw new Error('Changed custom attribute values');}
        else if(!same(a,b))throw new Error(`Changed original ${mesh.name}.${key}`);
      }
      if(!same(readAccessor(source,p.indices).data,readAccessor(next,q.indices).data))throw new Error('Changed topology');
      for(const [j,morph] of (p.targets || []).entries())for(const [key,id] of Object.entries(morph))if(!same(readAccessor(source,id).data,readAccessor(next,q.targets[j][key]).data))throw new Error('Changed morph');
    }
  }
  for(let i=0;i<source.json.images.length;i++)if(!readImage(source,i).equals(readImage(next,i)))throw new Error('Changed source image');
  const before={sha256:hash(sourceBytes),bytes:sourceBytes.length,integrity:featureRepairIntegrity(source)},after={sha256:hash(result.bytes),bytes:result.bytes.length,integrity:featureRepairIntegrity(next)};
  const continuing=prior?.after.sha256===before.sha256;
  const unchanged=before.sha256===after.sha256;
  const record={file,before:continuing?prior.before:before,after,
    changes:continuing && unchanged?prior.changes:result.changes,
    latestRun:{unchanged,changes:result.changes},
    preserved:'All original positions, normals, UVs, indices, morphs, images, active weights/joints; custom scalar values unchanged'};
  assets.push(record);console.log(JSON.stringify({file,changes:result.changes,bytes:after.bytes}));
  if(write){
    const backup=path.join('.tmp/review75-before',file);fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.writeFileSync(backup,sourceBytes);
    fs.writeFileSync(relative,result.bytes);entry.sha256=after.sha256;entry.formatRepair={builtBy:'node scripts/normalize-human-glb-format.mjs --write',record:out,sourceSha256:record.before.sha256};
  }
}
if(write){
  for(const entry of manifest.assets)if(entry.sourceAsset){const source=manifest.assets.find(a=>a.path===entry.sourceAsset);if(source)entry.sourceSha256=source.sha256;}
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({version:1,reviewedOn:'2026-10-22',assets},null,2)+'\n');
}
