import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import validator from 'gltf-validator';

const cases=JSON.parse(fs.readFileSync('docs/real-human-3d/data/review-75/cases.json'));
const args=process.argv.slice(2),requested=[];
let out=null;
for(let i=0;i<args.length;i++){
  if(args[i]==='--out'){
    if(out || !args[i+1] || args[i+1].startsWith('--'))throw new Error('Usage: validate-glb-format.mjs [model.glb ...] [--out directory]');
    out=args[++i];
  }else if(args[i].startsWith('--'))throw new Error(`Unknown option: ${args[i]}`);
  else requested.push(args[i]);
}
const files=requested.length?requested:cases.assets.map(file=>'public/assets/models/'+file);
if(out)fs.mkdirSync(out,{recursive:true});
let errors=0;
for(const file of files){
  const bytes=fs.readFileSync(file);
  // All bundled resources are embedded. A missing external resource must fail,
  // never trigger network access or read arbitrary paths supplied by an asset.
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:path.basename(file),maxIssues:0,
    externalResourceFunction:async()=>{throw new Error('Bundled GLB contains an external resource');}});
  errors+=report.issues.numErrors;
  const counts=report.issues.messages.reduce((all,item)=>{all[item.code]=(all[item.code] || 0)+1;return all;},{});
  const record={file,sha256:createHash('sha256').update(bytes).digest('hex'),validatorVersion:validator.version(),...report};
  if(out)fs.writeFileSync(path.join(out,'format.'+path.basename(file,'.glb')+'.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({file,errors:report.issues.numErrors,warnings:report.issues.numWarnings,truncated:report.issues.truncated,counts}));
}
process.exitCode=errors?1:0;
