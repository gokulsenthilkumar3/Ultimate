#!/usr/bin/env node
// Re-derive the approved MakeHuman assets without changing body topology,
// visible measurement rings, textures, facial proxies or animation channels.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {BufferGeometry,Float32BufferAttribute,Triangle,Vector3} from 'three';
import {readGlb,readAccessor} from './plan-preview/glb.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const vector=(array,i)=>new Vector3().fromArray(array,i*3);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

export function upgradeHumanAttachments(input,output) {
  if(path.resolve(input)===path.resolve(output)) throw new Error('Use a separate output to preserve the approved source asset.');
  const glb=readGlb(input),{json}=glb;
  const body=json.meshes.find(m=>m.name==='GrowthTrackBody'),privateMesh=json.meshes.find(m=>m.name==='GrowthTrackPrivateAnatomy');
  const bp=body?.primitives[0],pp=privateMesh?.primitives[0],layout=privateMesh?.extras?.layout;
  if(!bp || !pp || !layout) throw new Error('Asset needs the assessed body, private mesh and measurement layout.');
  if(privateMesh.extras.attachmentUpgrade) throw new Error('Asset is already upgraded; start from the approved source.');
  const read=id=>readAccessor(glb,id).data;
  const bodyPos=read(bp.attributes.POSITION),bodyIndices=read(bp.indices),privatePos=read(pp.attributes.POSITION).slice(),uv=read(pp.attributes.TEXCOORD_0);
  const bodyJoints=read(bp.attributes.JOINTS_0),bodyWeights=read(bp.attributes.WEIGHTS_0);
  const joints=read(pp.attributes.JOINTS_0).slice(),weights=read(pp.attributes.WEIGHTS_0).slice();
  const {segments,baseRing,tipVertex}=layout;
  const junction=new Vector3();for(let k=0;k<segments;k++)junction.addScaledVector(vector(privatePos,baseRing*segments+k),1/segments);
  const bodyNode=json.nodes.find(n=>json.meshes[n.mesh]===body),privateNode=json.nodes.find(n=>json.meshes[n.mesh]===privateMesh);
  const bodySkin=json.skins[bodyNode.skin].joints,privateSkin=json.skins[privateNode.skin].joints;
  const jointMap=bodySkin.map(j=>privateSkin.indexOf(j));
  if(jointMap.some(j=>j<0))throw new Error('Body and private skins need matching joints.');
  const triangles=[];
  for(let i=0;i<bodyIndices.length;i+=3) {
    const ids=Array.from(bodyIndices.slice(i,i+3)),vertices=ids.map(id=>vector(bodyPos,id));
    if(vertices.some(v=>Math.abs(v.x-junction.x)<.25 && Math.abs(v.y-junction.y)<.25))triangles.push({ids,triangle:new Triangle(...vertices)});
  }
  const nearest=p=> {
    let best=null,distance=Infinity;const q=new Vector3();
    for(const item of triangles) {
      item.triangle.closestPointToPoint(p,q);const d=p.distanceToSquared(q);
      if(d<distance) {distance=d;best={ids:item.ids,point:q.clone(),bary:item.triangle.getBarycoord(q,new Vector3()),normal:item.triangle.getNormal(new Vector3())};}
    }
    if(!best)throw new Error('No pelvic surface found.');return best;
  };
  const anchor=nearest(junction),bindings=[];
  for(let i=0;i<privatePos.length/3;i++) {
    const ring=Math.floor(i/segments);
    const influence=i<baseRing*segments ? (baseRing-ring)/baseRing : i>tipVertex ? 1-smooth(.5,.65,uv[i*2+1]) : 0;
    if(influence<=0)continue;
    const p=vector(privatePos,i),binding=nearest(p);
    // Only hidden rings and the sac neck change. Visible calibrated sections
    // and both private size deltas remain byte-for-byte unchanged.
    const seated=binding.point.clone().addScaledVector(binding.normal,-.004);
    p.lerp(seated,influence).toArray(privatePos,i*3);
    const blend=new Map();
    for(let slot=0;slot<4;slot++)blend.set(joints[i*4+slot],(blend.get(joints[i*4+slot])||0)+weights[i*4+slot]*(1-influence));
    for(let corner=0;corner<3;corner++) for(let slot=0;slot<4;slot++) {
      const id=binding.ids[corner],joint=jointMap[bodyJoints[id*4+slot]];
      blend.set(joint,(blend.get(joint)||0)+bodyWeights[id*4+slot]*binding.bary.getComponent(corner)*influence);
    }
    const ranked=[...blend].filter(([,weight])=>weight>0).sort((a,b)=>b[1]-a[1]).slice(0,4),total=ranked.reduce((sum,[,w])=>sum+w,0);
    if(!total)throw new Error('Attachment has no skin weights.');
    for(let slot=0;slot<4;slot++){joints[i*4+slot]=ranked[slot]?.[0]||0;weights[i*4+slot]=(ranked[slot]?.[1]||0)/total;}
    bindings.push({vertex:i,influence,...binding});
  }
  const oldNames=privateMesh.extras.targetNames,bodyNames=body.extras.targetNames;
  const names=[...new Set([...oldNames,...bodyNames])],targets=[];
  const interpolate=(delta,binding)=>binding.ids.reduce((sum,id,corner)=>sum.addScaledVector(vector(delta,id),binding.bary.getComponent(corner)),new Vector3());
  for(const name of names) {
    if(['d_length','d_girth'].includes(name)) {targets.push(pp.targets[oldNames.indexOf(name)]);continue;}
    const bi=bodyNames.indexOf(name),bodyDelta=bi<0?null:read(bp.targets[bi].POSITION);
    const old=oldNames.indexOf(name),delta=old<0?new Float32Array(privatePos.length):read(pp.targets[old].POSITION).slice();
    if(bodyDelta) {
      const follow=interpolate(bodyDelta,anchor);
      for(let i=0;i<delta.length;i+=3)follow.toArray(delta,i);
      for(const binding of bindings) follow.clone().lerp(interpolate(bodyDelta,binding),binding.influence).toArray(delta,binding.vertex*3);
    }
    targets.push({POSITION:append(delta,3,true)});
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(privatePos,3));geometry.setIndex(Array.from(read(pp.indices)));geometry.computeVertexNormals();
  pp.attributes.POSITION=append(privatePos,3);pp.attributes.NORMAL=append(geometry.attributes.normal.array,3);
  pp.attributes.JOINTS_0=append(joints,4);pp.attributes.WEIGHTS_0=append(weights,4);geometry.dispose();
  pp.targets=targets;privateMesh.weights=names.map(()=>0);privateMesh.extras.targetNames=names;
  const report={version:2,method:'pelvic-triangle-barycentric',boundVertices:bindings.length,bodyMorphs:bodyNames.length,visibleMeasurementRingsPreserved:true,sourceSha256:sha(fs.readFileSync(input))};
  privateMesh.extras.attachmentUpgrade=report;
  json.asset.extras={...json.asset.extras,attachmentUpgrade:report};
  json.asset.generator='GrowthTrack assessed CC0 human attachment upgrade 2';
  // Pack only referenced accessors/views. Unchanged textures and body buffers
  // are copied exactly; old replaced private buffers are omitted.
  compactAndWrite(output);
  return {...report,output,sha256:sha(fs.readFileSync(output)),bytes:fs.statSync(output).size};

  function append(values,width,sparse=false) {
    if(Array.from(values).some(x=>!Number.isFinite(x)))throw new Error('Non-finite asset data.');
    const chunks=glb.appended ||= [];glb.length ??= glb.bin.length;
    const addView=array=> {
      const padding=(4-glb.length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));glb.length+=padding;}
      const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),id=json.bufferViews.length;
      json.bufferViews.push({buffer:0,byteOffset:glb.length,byteLength:bytes.length});chunks.push(bytes);glb.length+=bytes.length;return id;
    };
    const a={componentType:values instanceof Uint16Array?5123:5126,count:values.length/width,type:{1:'SCALAR',3:'VEC3',4:'VEC4'}[width]};
    if(sparse) {
      const ids=[],data=[];
      for(let i=0;i<a.count;i++)if(Array.from(values.subarray(i*width,(i+1)*width)).some(x=>Math.abs(x)>1e-9)){ids.push(i);data.push(...values.subarray(i*width,(i+1)*width));}
      if(ids.length)a.sparse={count:ids.length,indices:{bufferView:addView(Uint32Array.from(ids)),componentType:5125},values:{bufferView:addView(Float32Array.from(data))}};
    } else a.bufferView=addView(values);
    if(width===3) {
      a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<values.length;i++){const c=i%3;a.min[c]=Math.min(a.min[c],values[i]);a.max[c]=Math.max(a.max[c],values[i]);}
    }
    json.accessors.push(a);return json.accessors.length-1;
  }

  function compactAndWrite(file) {
    const used=new Set();
    for(const mesh of json.meshes)for(const p of mesh.primitives){Object.values(p.attributes).forEach(id=>used.add(id));if(p.indices!=null)used.add(p.indices);for(const t of p.targets||[])Object.values(t).forEach(id=>used.add(id));}
    for(const skin of json.skins||[])if(skin.inverseBindMatrices!=null)used.add(skin.inverseBindMatrices);
    for(const a of json.animations||[])for(const s of a.samplers){used.add(s.input);used.add(s.output);}
    const accessorMap=new Map([...used].map((id,i)=>[id,i]));
    for(const mesh of json.meshes)for(const p of mesh.primitives){for(const k of Object.keys(p.attributes))p.attributes[k]=accessorMap.get(p.attributes[k]);if(p.indices!=null)p.indices=accessorMap.get(p.indices);for(const t of p.targets||[])for(const k of Object.keys(t))t[k]=accessorMap.get(t[k]);}
    for(const skin of json.skins||[])if(skin.inverseBindMatrices!=null)skin.inverseBindMatrices=accessorMap.get(skin.inverseBindMatrices);
    for(const a of json.animations||[])for(const s of a.samplers){s.input=accessorMap.get(s.input);s.output=accessorMap.get(s.output);}
    json.accessors=[...used].map(id=>json.accessors[id]);
    const combined=Buffer.concat([glb.bin,...(glb.appended||[])]),views=new Set();
    for(const a of json.accessors){if(a.bufferView!=null)views.add(a.bufferView);if(a.sparse){views.add(a.sparse.indices.bufferView);views.add(a.sparse.values.bufferView);}}
    for(const image of json.images||[])if(image.bufferView!=null)views.add(image.bufferView);
    const map=new Map(),buffers=[],newViews=[];let length=0;
    for(const id of views){const view=json.bufferViews[id],padding=(4-length%4)%4;if(padding){buffers.push(Buffer.alloc(padding));length+=padding;}map.set(id,newViews.length);newViews.push({...view,buffer:0,byteOffset:length});buffers.push(combined.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));length+=view.byteLength;}
    for(const a of json.accessors){if(a.bufferView!=null)a.bufferView=map.get(a.bufferView);if(a.sparse){a.sparse.indices.bufferView=map.get(a.sparse.indices.bufferView);a.sparse.values.bufferView=map.get(a.sparse.values.bufferView);}}
    for(const image of json.images||[])if(image.bufferView!=null)image.bufferView=map.get(image.bufferView);
    json.bufferViews=newViews;json.buffers=[{byteLength:length}];
    const text=Buffer.from(JSON.stringify(json)),jsonBytes=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bin=Buffer.concat([...buffers,Buffer.alloc((4-length%4)%4)]);
    const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonBytes.length+bin.length,8);header.writeUInt32LE(jsonBytes.length,12);header.writeUInt32LE(0x4e4f534a,16);
    const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.concat([header,jsonBytes,bh,bin]));
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifestFile=path.join(root,'public/assets/models/ASSET-PROVENANCE.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));
  const downloaded=JSON.parse(fs.readFileSync(path.join(root,'docs/licenses/makehuman-v1.3.0-download-manifest.json')));
  manifest.licenseEvidence=['LICENSE.md','LICENSE.ASSETS.md'].map(name=> {
    const source=downloaded.files.find(f=>f.path===name),file=`docs/licenses/makehuman-v1.3.0-${name}`;
    const bytes=Buffer.from(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'));
    if(!source || sha(bytes)!==source.sha256)throw new Error(`Archived licence does not match the pinned source: ${name}`);
    return {path:file,sha256:source.sha256,gitBlobSha1:source.gitBlobSha1,source:`https://github.com/${downloaded.repository}/blob/${downloaded.commit}/${name}`,verified:'2026-10-20'};
  });
  manifest.licenseEvidence.push({path:'LICENSE',sha256:sha(Buffer.from(fs.readFileSync(path.join(root,'LICENSE'),'utf8').replace(/\r\n/g,'\n'))),source:'GrowthTrack Ultimate project MIT licence',verified:'2026-10-20'});
  const base='public/assets/models/';
  for(const [source,target] of [['humanoid-base.glb','humanoid-adult-v2.glb'],['humanoid-base-lite.glb','humanoid-adult-v2-lite.glb']]) {
    const entry=manifest.assets.find(a=>a.path===base+source);
    if(entry?.sha256!==sha(fs.readFileSync(path.join(root,base+source))))throw new Error('Source asset does not match reviewed provenance.');
    const components=entry.components||manifest.assets.find(a=>a.path===entry.sameComponentsAs)?.components;
    if(!components?.length || components.some(c=>!['verified','project'].includes(c.status)))throw new Error('Source asset has unresolved components.');
    const result=upgradeHumanAttachments(path.join(root,base+source),path.join(root,base+target));
    const upgraded={path:base+target,sha256:result.sha256,builtBy:'node scripts/upgrade-human-attachments.mjs',sourceAsset:entry.path,sourceSha256:entry.sha256,promoted:'2026-10-20: upgraded pelvic skin/morph binding; existing assessed CC0 body and features retained.',
      ...(target.includes('-lite')?{sameComponentsAs:base+'humanoid-adult-v2.glb'}:{components:[...structuredClone(components),{name:'Pelvic triangle attachment upgrade',source:'scripts/upgrade-human-attachments.mjs',licence:'MIT (project LICENSE)',status:'project',modified:true}]})};
    manifest.assets=manifest.assets.filter(a=>a.path!==upgraded.path);manifest.assets.push(upgraded);console.log(JSON.stringify(result));
  }
  manifest.updated='2026-10-20';fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
}
