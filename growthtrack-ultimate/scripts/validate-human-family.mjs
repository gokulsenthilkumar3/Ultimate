import fs from 'node:fs';
import path from 'node:path';
import validator from 'gltf-validator';
import {readGlb} from './plan-preview/glb.mjs';
import {decompressGlb,packGlb,sha256} from './human-realism/glb-family.mjs';

const config=JSON.parse(fs.readFileSync('src/config/humanAssetFamily.json'));
const manifest=JSON.parse(fs.readFileSync('src/config/humanAssetManifest.json'));
const record=JSON.parse(fs.readFileSync('docs/real-human-3d/data/human-r2/asset-build.json'));
const out='docs/real-human-3d/data/human-r2/format';fs.mkdirSync(out,{recursive:true});
let errors=0;const reports=[];
for(const lod of ['core','hero']){
  const asset=manifest.assets[lod];
  for(const privateFile of [false,true]){
    const name=privateFile?asset.privateFile:asset.file,file='public/assets/models/'+name,bytes=fs.readFileSync(file);
    if(sha256(bytes)!==(privateFile?asset.privateSha256:asset.sha256))throw new Error('Manifest mismatch: '+file);
    const glb=readGlb(file),decoded=await decompressGlb(glb);
    const report=await validator.validateBytes(new Uint8Array(packGlb(decoded.json,decoded.bin)),{uri:name,maxIssues:0});
    const budget=config.budgets[privateFile?(lod==='core'?'privateCoreBytes':'privateHeroBytes'):lod+'Bytes'];
    const budgetPassed=bytes.length<=budget;
    if(!privateFile){
      const forbidden=/privateanatomy|controlCage|removedBodyTriangles|nativeBinding/i.test(JSON.stringify(decoded.json));
      if(forbidden)throw new Error('Public package contains private metadata or nodes: '+name);
    }
    errors+=report.issues.numErrors+(budgetPassed?0:1);
    const summary={file,sha256:sha256(bytes),bytes:bytes.length,budget,budgetPassed,decodedErrors:report.issues.numErrors,decodedWarnings:report.issues.numWarnings,
      issueCounts:report.issues.messages.reduce((counts,m)=>{counts[m.code]=(counts[m.code]||0)+1;return counts;},{})};
    reports.push(summary);console.log(JSON.stringify(summary));
    fs.writeFileSync(path.join(out,'decoded.'+name+'.json'),JSON.stringify({...summary,validatorVersion:validator.version(),issues:report.issues},null,2)+'\n');
  }
}
for(const [file,hash] of Object.entries(record.retainedAssets))if(sha256(fs.readFileSync(file))!==hash)throw new Error('Retained asset changed: '+file);
fs.writeFileSync('docs/real-human-3d/data/human-r2/validation.json',JSON.stringify({family:config.id,retainedAssetCount:Object.keys(record.retainedAssets).length,assets:reports,errors},null,2)+'\n');
process.exitCode=errors?1:0;
