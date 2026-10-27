import fs from 'node:fs';
import {build} from 'vite';
import {createHash} from 'node:crypto';
import {buildCombinedAsset} from './human-realism/combined-asset.mjs';
const manifest=JSON.parse(fs.readFileSync('src/config/humanAssetManifest.json'));
await build({configFile:false,logLevel:'warn',define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir:'.tmp/live-human',lib:{entry:'scripts/live-human/main.js',name:'GrowthTrackLiveHuman',formats:['iife'],fileName:()=> 'viewer.js'},minify:true,emptyOutDir:true}});
const assets={};
for(const lod of ['core','hero']){
  const asset=manifest.assets[lod];assets[lod]={...asset,publicBytes:fs.readFileSync('public/assets/models/'+asset.file).toString('base64'),privateBytes:fs.readFileSync('public/assets/models/'+asset.privateFile).toString('base64')};
}
const code=fs.readFileSync('.tmp/live-human/viewer.js','utf8').replace(/<\/script/gi,'<\\/script');
const html=fs.readFileSync('scripts/live-human/viewer.html','utf8').replace('__MODEL_DATA__',()=>JSON.stringify({family:manifest.family,assets})).replace('__VIEWER_CODE__',()=>code);
const file='artifacts/human-r2/live-human-3d.html';fs.mkdirSync('artifacts/human-r2',{recursive:true});fs.writeFileSync(file,html);
const report={file,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),embeddedLODs:['core','hero'],networkRequired:false,platforms:['Windows desktop browsers','macOS desktop browsers'],runtimeFitting:true,runtimeContact:true};
fs.writeFileSync('artifacts/human-r2/live-viewer.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
console.log(JSON.stringify({combined:await buildCombinedAsset('.tmp/human-r2','artifacts/human-r2')}));
