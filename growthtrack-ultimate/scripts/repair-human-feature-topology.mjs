// Repair assessed CC0 proxy topology while preserving the body, rig, images
// and existing feature positions/morphs. Default is a verified dry run.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readGlb,readAccessor,readImage} from './plan-preview/glb.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestPath=path.join(root,'public/assets/models/ASSET-PROVENANCE.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath));
const corrected=JSON.parse(fs.readFileSync(path.join(root,'.tmp/human-review/feature-repair.json')));
const sourceManifest=JSON.parse(fs.readFileSync(path.join(root,'docs/licenses/makehuman-system-assets-cc0-extract-manifest.json')));
const sources=Object.values(corrected).map(feature=>{
  const record=sourceManifest.members.find(member=>member.member===feature.sourceObj);
  if(!record || digest(fs.readFileSync(path.join(root,'.tmp/makehuman-cc0-assets',record.member)))!==record.sha256)throw new Error('Unverified source proxy.');
  return {path:record.member,sha256:record.sha256};
});
const results=[];
for(const entry of manifest.assets.filter(entry=>/humanoid-(?:base|adult-v2)(?:-lite)?\.glb$/.test(entry.path))){
  const input=path.join(root,entry.path),sourceBytes=fs.readFileSync(input);
  if(digest(sourceBytes)!==entry.sha256)throw new Error(`Unreviewed input: ${entry.path}`);
  const glb=readGlb(input),json=glb.json;
  if(json.asset.extras?.featureTopologyRepair?.version===1){console.log(`${entry.path}: already repaired`);continue;}
  const additions=[],report={version:1,method:'source-quad-corners',sourceSha256:entry.sha256,sources,features:[]};
  let length=glb.bin.length;
  const addView=values=>{
    const padding=(4-length%4)%4;if(padding){additions.push(Buffer.alloc(padding));length+=padding;}
    const bytes=Buffer.from(values.buffer,values.byteOffset,values.byteLength),id=json.bufferViews.length;
    json.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});additions.push(bytes);length+=bytes.length;return id;
  };
  const append=(values,width,sparse=false)=>{
    if(!Array.from(values).every(Number.isFinite))throw new Error('Non-finite repaired geometry');
    const a={componentType:values instanceof Uint32Array?5125:5126,count:values.length/width,type:{1:'SCALAR',2:'VEC2',3:'VEC3'}[width]};
    if(sparse){
      const ids=[],data=[];
      for(let i=0;i<a.count;i++)if(values.subarray(i*width,(i+1)*width).some(value=>value!==0)){ids.push(i);data.push(...values.subarray(i*width,(i+1)*width));}
      if(ids.length)a.sparse={count:ids.length,indices:{bufferView:addView(Uint32Array.from(ids)),componentType:5125},values:{bufferView:addView(Float32Array.from(data))}};
    }else a.bufferView=addView(values);
    if(width===3){
      a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];
      values.forEach((v,i)=>{a.min[i%3]=Math.min(a.min[i%3],v);a.max[i%3]=Math.max(a.max[i%3],v);});
    }
    json.accessors.push(a);return json.accessors.length-1;
  };
  const assertLegacy=(oldValues,newValues,order,width,label)=>{
    if(oldValues.length!==order.length*width)throw new Error(`Legacy count mismatch: ${label}`);
    for(let i=0;i<order.length;i++)for(let c=0;c<width;c++)if(Math.abs(oldValues[i*width+c]-newValues[order[i]*width+c])>1e-6)throw new Error(`Existing surface would move: ${label}, vertex ${i}`);
  };
  for(const [name,feature] of Object.entries(corrected)){
    const mesh=json.meshes.find(mesh=>mesh.name===name),primitive=mesh.primitives[0];
    const positions=Float32Array.from(feature.positions),uv=Float32Array.from(feature.uv);
    const originalIndices=Array.from(readAccessor(glb,primitive.indices).data);
    if(JSON.stringify(originalIndices)!==JSON.stringify(feature.legacyIndices))throw new Error(`Unexpected original topology: ${name}`);
    assertLegacy(readAccessor(glb,primitive.attributes.POSITION).data,positions,feature.legacyOrder,3,name);
    assertLegacy(readAccessor(glb,primitive.attributes.TEXCOORD_0).data,uv,feature.legacyOrder,2,`${name} UV`);
    const targets=mesh.extras.targetNames.map((name,i)=>{
      if(!feature.morphs[name])throw new Error(`Missing feature morph ${name}`);
      const delta=Float32Array.from(feature.morphs[name]);
      assertLegacy(readAccessor(glb,primitive.targets[i].POSITION).data,delta,feature.legacyOrder,3,`${mesh.name}/${name}`);
      return {POSITION:append(delta,3,true)};
    });
    primitive.attributes.POSITION=append(positions,3);
    primitive.attributes.NORMAL=append(Float32Array.from(feature.normals),3);
    primitive.attributes.TEXCOORD_0=append(uv,2);
    primitive.attributes.COLOR_0=append(new Float32Array(positions.length).fill(1),3);
    primitive.indices=append(Uint32Array.from(feature.indices),1);
    primitive.targets=targets;
    const info={name,oldVertices:feature.legacyOrder.length,vertices:positions.length/3,oldTriangles:originalIndices.length/3,triangles:feature.indices.length/3};
    mesh.extras.featureTopologyRepair=info;report.features.push(info);
  }
  json.asset.extras={...json.asset.extras,featureTopologyRepair:report};
  const combined=Buffer.concat([glb.bin,...additions]);
  const output=pack(json,combined);
  const staged=path.join(root,'.tmp/human-review/repaired',path.basename(input));fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,output);
  const checked=readGlb(staged),before=readGlb(input);
  const hashAccessor=(data,id)=>digest(Buffer.from(readAccessor(data,id).data.buffer));
  for(const mesh of before.json.meshes.filter(mesh=>!corrected[mesh.name])){
    const next=checked.json.meshes.find(item=>item.name===mesh.name);
    mesh.primitives.forEach((p,i)=>{
      const q=next.primitives[i];
      for(const key of Object.keys(p.attributes))if(hashAccessor(before,p.attributes[key])!==hashAccessor(checked,q.attributes[key]))throw new Error(`Body attribute changed: ${mesh.name}/${key}`);
      if(hashAccessor(before,p.indices)!==hashAccessor(checked,q.indices))throw new Error('Body topology changed');
      for(let t=0;t<(p.targets||[]).length;t++)for(const key of Object.keys(p.targets[t]))if(hashAccessor(before,p.targets[t][key])!==hashAccessor(checked,q.targets[t][key]))throw new Error('Body morph changed');
    });
  }
  before.json.images.forEach((_,i)=>{if(!readImage(before,i).equals(readImage(checked,i)))throw new Error('Texture bytes changed');});
  if(JSON.stringify(before.json.nodes)!==JSON.stringify(checked.json.nodes)||JSON.stringify(before.json.materials)!==JSON.stringify(checked.json.materials))throw new Error('Node or material changed');
  before.json.skins.forEach((skin,i)=>{if(hashAccessor(before,skin.inverseBindMatrices)!==hashAccessor(checked,checked.json.skins[i].inverseBindMatrices))throw new Error('Rig binding changed');});
  results.push({entry,input,sourceBytes,output,report});
  console.log(JSON.stringify({asset:entry.path,...report,bytes:output.length}));
}
if(process.argv.includes('--write')){
  for(const {entry,input,sourceBytes,output,report} of results){
    if(digest(fs.readFileSync(input))!==digest(sourceBytes))throw new Error('Input changed during review');
    const backup=path.join(root,'.tmp/human-review/originals',path.basename(input));fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,sourceBytes);
    fs.writeFileSync(input,output);entry.sha256=digest(output);entry.featureTopologyRepair=report;
    entry.builtBy+='; scripts/makehuman/export-feature-repair.py; node scripts/repair-human-feature-topology.mjs --write';
  }
  for(const {entry} of results)if(entry.sourceAsset)entry.sourceSha256=manifest.assets.find(source=>source.path===entry.sourceAsset).sha256;
  manifest.updated='2026-10-21';fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}

function pack(json,combined){
  const used=new Set();
  for(const mesh of json.meshes)for(const p of mesh.primitives){Object.values(p.attributes).forEach(id=>used.add(id));if(p.indices!=null)used.add(p.indices);for(const t of p.targets||[])Object.values(t).forEach(id=>used.add(id));}
  for(const skin of json.skins||[])if(skin.inverseBindMatrices!=null)used.add(skin.inverseBindMatrices);
  for(const a of json.animations||[])for(const s of a.samplers){used.add(s.input);used.add(s.output);}
  const ids=new Map([...used].map((id,i)=>[id,i]));
  for(const mesh of json.meshes)for(const p of mesh.primitives){for(const k of Object.keys(p.attributes))p.attributes[k]=ids.get(p.attributes[k]);if(p.indices!=null)p.indices=ids.get(p.indices);for(const t of p.targets||[])for(const k of Object.keys(t))t[k]=ids.get(t[k]);}
  for(const skin of json.skins||[])if(skin.inverseBindMatrices!=null)skin.inverseBindMatrices=ids.get(skin.inverseBindMatrices);
  for(const a of json.animations||[])for(const s of a.samplers){s.input=ids.get(s.input);s.output=ids.get(s.output);}
  json.accessors=[...used].map(id=>json.accessors[id]);
  const views=new Set();
  for(const a of json.accessors){if(a.bufferView!=null)views.add(a.bufferView);if(a.sparse){views.add(a.sparse.indices.bufferView);views.add(a.sparse.values.bufferView);}}
  for(const image of json.images||[])if(image.bufferView!=null)views.add(image.bufferView);
  const map=new Map(),buffers=[],nextViews=[];let length=0;
  for(const id of views){const view=json.bufferViews[id],padding=(4-length%4)%4;if(padding){buffers.push(Buffer.alloc(padding));length+=padding;}map.set(id,nextViews.length);nextViews.push({...view,buffer:0,byteOffset:length});buffers.push(combined.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));length+=view.byteLength;}
  for(const a of json.accessors){if(a.bufferView!=null)a.bufferView=map.get(a.bufferView);if(a.sparse){a.sparse.indices.bufferView=map.get(a.sparse.indices.bufferView);a.sparse.values.bufferView=map.get(a.sparse.values.bufferView);}}
  for(const image of json.images||[])if(image.bufferView!=null)image.bufferView=map.get(image.bufferView);
  json.bufferViews=nextViews;json.buffers=[{byteLength:length}];
  const text=Buffer.from(JSON.stringify(json)),jb=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bin=Buffer.concat([...buffers,Buffer.alloc((4-length%4)%4)]);
  const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+jb.length+bin.length,8);header.writeUInt32LE(jb.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jb,bh,bin]);
}
