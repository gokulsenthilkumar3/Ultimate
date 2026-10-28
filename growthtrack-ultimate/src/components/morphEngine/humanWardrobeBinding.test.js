// @vitest-environment node
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb} from '../../../scripts/plan-preview/glb.mjs';
import {decompressGlb} from '../../../scripts/human-realism/glb-family.mjs';
import {sceneFromGlb} from '../../../scripts/human75/glb-tools.mjs';
import {createAuthoredGarment} from './authoredGarments';
import {wardrobeDefaults} from '../../lib/wardrobePreferences';
it.each(['core','hero'])('retains the original vertex correspondence and clothing on the refined %s human',async lod=>{
 const old=sceneFromGlb(readGlb('public/assets/models/humanoid-preview-75-lite.glb')).body;
 const body=sceneFromGlb(await decompressGlb(readGlb(`public/assets/models/humanoid-human-r2-${lod}.glb`))).body;
 const before=old.geometry.attributes.position,after=body.geometry.attributes.position;let maximum=0;
 for(let i=0;i<before.count;i++)maximum=Math.max(maximum,Math.hypot(...[0,1,2].map(axis=>before.getComponent(i,axis)-after.getComponent(i,axis))));
 expect(maximum).toBeLessThan(.012);expect(after.count).toBeGreaterThan(before.count);
 const data=readFileSync('public/assets/wardrobe/tee-v1.glb'),source=(await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene.children[0];
 const garment=createAuthoredGarment(body,source,wardrobeDefaults('GYM'));expect(garment?.authored).toBe(true);expect(garment.geometry.attributes.position.array.every(Number.isFinite)).toBe(true);garment.dispose();
});
