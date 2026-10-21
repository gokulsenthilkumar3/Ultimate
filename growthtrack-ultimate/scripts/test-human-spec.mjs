import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const directory='docs/real-human-3d/code';
const checks=readdirSync(directory).filter(name=>name.endsWith('.check.mjs')).sort().map(name=>`${directory}/${name}`);
for(const args of [['--test',...checks],[`${directory}/render-anatomy.mjs`,'--check']]) {
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status || 1);
}
