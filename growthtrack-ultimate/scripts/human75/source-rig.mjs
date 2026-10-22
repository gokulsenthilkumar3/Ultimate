import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Vector3} from 'three';

export function sourceRig(root,config){
  const baseRoot=path.join(root,'.tmp/makehuman-v1.3.0'),manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/licenses/makehuman-v1.3.0-download-manifest.json')));
  const inputs=[];
  function read(relative){const record=manifest.files.find(f=>f.path===relative);if(!record)throw new Error(`Unpinned source ${relative}`);
    const bytes=fs.readFileSync(path.join(baseRoot,relative)),sha256=createHash('sha256').update(bytes).digest('hex');
    if(sha256!==record.sha256)throw new Error(`Source hash mismatch: ${relative}`);inputs.push({path:relative,sha256});return bytes.toString('utf8');}
  const coords=[],groups={};let group='';
  for(const line of read('makehuman/data/3dobjs/base.obj').split(/\r?\n/)){
    if(line.startsWith('v '))coords.push(new Vector3(...line.slice(2).trim().split(/\s+/).map(Number)));
    if(line.startsWith('g ')){group=line.slice(2).trim();groups[group] ||= new Set();}
    if(line.startsWith('f ') && group.startsWith('joint-'))for(const corner of line.slice(2).trim().split(/\s+/))groups[group].add(Number(corner.split('/')[0])-1);
  }
  for(const [target,weight] of config.baseSculpt)for(const line of read(`makehuman/data/targets/${target}.target`).split(/\r?\n/)){
    if(!/^\d+\s/.test(line))continue;const [id,x,y,z]=line.trim().split(/\s+/).map(Number);coords[id].addScaledVector(new Vector3(x,y,z),weight);
  }
  coords.forEach(p=>p.multiplyScalar(config.sourceUnitsToMetres));
  const joints=Object.fromEntries(Object.entries(groups).filter(([name])=>name.startsWith('joint-')).map(([name,ids])=>[name,[...ids].reduce((sum,id)=>sum.add(coords[id]),new Vector3()).divideScalar(ids.size)]));
  return {joints,inputs};
}
