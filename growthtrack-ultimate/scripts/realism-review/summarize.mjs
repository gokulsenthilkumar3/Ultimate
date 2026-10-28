import fs from 'node:fs';
import path from 'node:path';
import {REVIEW_CASES,REVIEW_REVISION,reviewFileId} from './caseCatalog.mjs';
const root='.tmp/realism-review/results';
const rows=REVIEW_CASES.map(item=>{
  const file=path.join(root,reviewFileId('human-r2',item.id)+'.json');
  if(!fs.existsSync(file))return {id:item.id,preset:item.preset,variant:item.variant,status:'not-rendered'};
  const row=JSON.parse(fs.readFileSync(file));
  const synchronized=row.appliedPose?.animationId===item.pose && Math.abs((row.appliedPose?.sampleTime ?? -99)-(item.sampleTime || 0))<.0001;
  return {...row,status:!synchronized?'stale-pose':row.reviewRevision===REVIEW_REVISION?'current-render':'rerun-after-fixes'};
});
const counts=rows.reduce((out,row)=>{out[row.status]=(out[row.status] || 0)+1;return out;},{});
const summary={reviewRevision:REVIEW_REVISION,generatedAt:new Date().toISOString(),plannedCases:REVIEW_CASES.length,counts,
  limitations:['Sparse penetration candidates are screening results, not fit certification.','Historical captures predate the final finger-visibility fix.','No physical-device performance or body-measurement accuracy certification.'],rows};
const output='.tmp/realism-review/summary.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({output,plannedCases:summary.plannedCases,counts},null,2));
