// @vitest-environment node
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {generateMicro} from '../../scripts/human75/micro.mjs';
const config=JSON.parse(readFileSync('src/config/humanSurface.json')).micro;
it('generates reproducible non-flat periodic pore resources from the configured physical tile',()=>{
  const tile=generateMicro(config),again=generateMicro(config),other=generateMicro({...config,seed:config.seed+1});
  expect(tile.height.equals(again.height)).toBe(true);expect(tile.normal.equals(again.normal)).toBe(true);expect(tile.height.equals(other.height)).toBe(false);
  expect(tile.height.equals(readFileSync('public/'+config.heightPath))).toBe(true);expect(tile.normal.equals(readFileSync('public/'+config.normalPath))).toBe(true);
  expect(tile.heights.every(Number.isFinite)).toBe(true);expect(Math.max(...tile.heights)-Math.min(...tile.heights)).toBeGreaterThan(.3);
  const size=config.size;let edge=0,interior=0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const h=tile.heights[y*size+x];
    for(const [next,isEdge] of [[y*size+(x+1)%size,x===size-1],[((y+1)%size)*size+x,y===size-1]]){
      const delta=Math.abs(h-tile.heights[next]);if(isEdge)edge=Math.max(edge,delta);else interior=Math.max(interior,delta);
    }
  }
  expect(edge).toBeLessThanOrEqual(interior*1.5);
});
