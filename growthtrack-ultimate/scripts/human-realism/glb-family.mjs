import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {appender} from '../human75/glb-tools.mjs';
import {readAccessor} from '../plan-preview/glb.mjs';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const semantics={position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',color:'COLOR_0',skinIndex:'JOINTS_0',skinWeight:'WEIGHTS_0',tangent:'TANGENT',_region:'_REGION',_tile:'_TILE',_microscale:'_MICROSCALE'};
export function writeGeometry(writer,geometry,material,{names=[],extras={},weights=[]}={}) {
  const attributes={};
  for(const [name,attribute] of Object.entries(geometry.attributes)){
    const semantic=semantics[name] || (name.startsWith('_')?name.toUpperCase():name.startsWith('pelvic')?'_'+name.toUpperCase():null);
    let values=attribute.array;
    if(name==='normal'){
      values=Float32Array.from(values);
      for(let i=0;i<values.length;i+=3){
        const length=Math.hypot(values[i],values[i+1],values[i+2]);
        if(length>1e-8){values[i]/=length;values[i+1]/=length;values[i+2]/=length;}
        else{values[i]=0;values[i+1]=0;values[i+2]=1;}
      }
    }
    if(semantic)attributes[semantic]=writer.accessor(values,attribute.itemSize);
  }
  const primitive={attributes,indices:writer.accessor(Uint32Array.from(geometry.index.array),1),material};
  if(names.length)primitive.targets=names.map((_,i)=>({POSITION:writer.accessor(geometry.morphAttributes.position[i].array,3,{sparse:true})}));
  return {primitives:[primitive],...(names.length?{weights:weights.length?Array.from(weights):names.map(()=>0)}:{}),extras:{...extras,...(names.length?{targetNames:names}:{})}};
}

export function retainMeshes(json,keep) {
  if(json.animations?.length)throw new Error('Animated source needs explicit animation remapping');
  const map=new Map(),meshes=[];
  json.meshes.forEach((m,i)=>{if(keep(m)){map.set(i,meshes.length);meshes.push(m);}});
  const nodes=[],nodeMap=new Map();
  json.nodes.forEach((n,i)=>{if(n.mesh==null || map.has(n.mesh)){nodeMap.set(i,nodes.length);nodes.push(n);}});
  for(const n of nodes){
    if(n.mesh!=null)n.mesh=map.get(n.mesh);
    if(n.children){n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));if(!n.children.length)delete n.children;}
  }
  for(const s of json.scenes)s.nodes=s.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
  for(const s of json.skins || []){s.joints=s.joints.map(i=>nodeMap.get(i));if(s.skeleton!=null)s.skeleton=nodeMap.get(s.skeleton);}
  json.nodes=nodes;json.meshes=meshes;
}

// Prune resources by their live material references. In particular, a public
// core cannot retain an orphaned anatomy accessor, image or geometry payload.
export function pruneMaterials(json) {
  const used=new Set(json.meshes.flatMap(m=>m.primitives.map(p=>p.material)).filter(i=>i!=null));
  const ids=[...used],map=new Map(ids.map((id,i)=>[id,i]));
  json.materials=ids.map(id=>json.materials[id]);
  json.meshes.forEach(m=>m.primitives.forEach(p=>{if(p.material!=null)p.material=map.get(p.material);}));
  const slots=[];
  function walk(value){if(!value || typeof value!=='object')return;
    for(const [key,child] of Object.entries(value)){
      if(key.endsWith('Texture') && child?.index!=null)slots.push(child);
      else if(child && typeof child==='object')walk(child);
    }
  }
  json.materials.forEach(walk);
  const textures=[...new Set(slots.map(slot=>slot.index))],textureMap=new Map(textures.map((id,i)=>[id,i]));
  slots.forEach(slot=>{slot.index=textureMap.get(slot.index);});
  json.textures=textures.map(id=>json.textures[id]);
  const images=[...new Set(json.textures.map(t=>t.source))],imageMap=new Map(images.map((id,i)=>[id,i]));
  json.textures.forEach(t=>{t.source=imageMap.get(t.source);});
  json.images=images.map(id=>json.images[id]);
}

export function resizeImages(writer,glb,directory,maxSize,blender) {
  fs.mkdirSync(directory,{recursive:true});
  writer.json.images.forEach((image,i)=>{
    const view=glb.json.bufferViews[image.bufferView];
    const filename=i+'-'+(image.name || 'texture').replace(/[^a-z0-9_-]/gi,'_')+'.png';
    image.extras={...(image.extras || {}),buildFile:filename};
    fs.writeFileSync(path.join(directory,filename),glb.bin.subarray(view.byteOffset || 0,(view.byteOffset || 0)+view.byteLength));
  });
  const script=path.resolve('scripts/human-realism/resize-textures.py');
  const result=spawnSync(blender,['--background','--factory-startup','--python',script,'--',directory,String(maxSize)],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw new Error('Texture resize failed: '+result.stderr+result.stdout);
  for(const image of writer.json.images){
    const original=path.join(directory,image.extras.buildFile),jpeg=original.replace(/\.png$/,'.jpg');
    const file=fs.existsSync(jpeg)?jpeg:original.replace(/\.png$/,'.resized.png');
    image.bufferView=writer.view(fs.readFileSync(file));image.mimeType=file.endsWith('.jpg')?'image/jpeg':'image/png';
    delete image.extras.buildFile;
  }
}

export function packGlb(json,bin) {
  const jb=Buffer.from(JSON.stringify(json)),jp=Buffer.alloc((4-jb.length%4)%4,32),bp=Buffer.alloc((4-bin.length%4)%4);
  const header=Buffer.alloc(20),bh=Buffer.alloc(8);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+jb.length+jp.length+bin.length+bp.length,8);
  header.writeUInt32LE(jb.length+jp.length,12);header.writeUInt32LE(0x4e4f534a,16);
  bh.writeUInt32LE(bin.length+bp.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jb,jp,bh,bin,bp]);
}

// Every compressed view is decoded and compared. Position/normal/UV streams
// use bounded float filtering; topology, bindings, weights and rigs are exact.
// The placeholder buffer follows EXT_meshopt_compression fallback semantics.
export async function compressGlb(glb) {
  await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
  const json=structuredClone(glb.json),uses=new Map(),images=new Set((json.images || []).map(i=>i.bufferView)),kinds=new Map();
  for(const m of json.meshes)for(const p of m.primitives){
    for(const [key,id] of Object.entries(p.attributes))if(['POSITION','NORMAL','TANGENT','TEXCOORD_0','COLOR_0'].includes(key))kinds.set(id,key);
    for(const target of p.targets || [])if(target.POSITION!=null)kinds.set(target.POSITION,'POSITION');
  }
  const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},size={5121:1,5123:2,5125:4,5126:4};
  for(const [id,a] of json.accessors.entries()){
    if(a.bufferView!=null)uses.set(a.bufferView,{count:a.count,stride:json.bufferViews[a.bufferView].byteStride || width[a.type]*size[a.componentType],mode:a.type==='SCALAR' && a.componentType!==5126?'INDICES':'ATTRIBUTES',kind:a.componentType===5126?kinds.get(id):null});
    if(a.sparse){
      uses.set(a.sparse.indices.bufferView,{count:a.sparse.count,stride:size[a.sparse.indices.componentType],mode:'INDICES'});
      uses.set(a.sparse.values.bufferView,{count:a.sparse.count,stride:width[a.type]*size[a.componentType],mode:'ATTRIBUTES',kind:a.componentType===5126?kinds.get(id):null});
    }
  }
  const chunks=[];let length=0,fallback=0,compressedViews=0,maximumPositionErrorMetres=0;
  const add=bytes=>{const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const offset=length;chunks.push(bytes);length+=bytes.length;return offset;};
  json.bufferViews.forEach((v,i)=>{
    const raw=glb.bin.subarray(v.byteOffset || 0,(v.byteOffset || 0)+v.byteLength),use=uses.get(i);
    if(!images.has(i) && use && ((use.mode==='INDICES' && [2,4].includes(use.stride)) || (use.mode==='ATTRIBUTES' && use.stride%4===0 && use.stride<=256))){
      const filtered=use.kind?MeshoptEncoder.encodeFilterExp(raw,use.count,use.stride,['NORMAL','TANGENT'].includes(use.kind)?16:20,'SharedComponent'):raw;
      const filter=use.kind?'EXPONENTIAL':undefined;
      const encoded=Buffer.from(MeshoptEncoder.encodeGltfBuffer(filtered,use.count,use.stride,use.mode));
      const decoded=new Uint8Array(raw.length);MeshoptDecoder.decodeGltfBuffer(decoded,use.count,use.stride,encoded,use.mode,filter);
      if(use.kind){
        const before=new Float32Array(Uint8Array.from(raw).buffer),after=new Float32Array(decoded.buffer);let error=0;
        for(let k=0;k<before.length;k++)error=Math.max(error,Math.abs(before[k]-after[k]));
        const limit=use.kind==='POSITION'?.00005:.0001;
        if(!Number.isFinite(error) || error>limit)throw new Error('Float filtering exceeds '+use.kind+' error budget: '+error);
        if(use.kind==='POSITION')maximumPositionErrorMetres=Math.max(maximumPositionErrorMetres,error);
      }else if(!raw.equals(Buffer.from(decoded)))throw new Error('Lossless compression round trip failed for view '+i);
      const offset=add(encoded);fallback=(fallback+3)&~3;
      v.buffer=1;v.byteOffset=fallback;fallback+=raw.length;
      v.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:encoded.length,byteStride:use.stride,count:use.count,mode:use.mode,...(filter?{filter}:{})}};
      compressedViews++;
    }else{v.buffer=0;v.byteOffset=add(raw);}
  });
  json.buffers=[{byteLength:length},{byteLength:fallback,extensions:{EXT_meshopt_compression:{fallback:true}}}];
  json.extensionsUsed=[...new Set([...(json.extensionsUsed || []),'EXT_meshopt_compression'])];
  json.extensionsRequired=[...new Set([...(json.extensionsRequired || []),'EXT_meshopt_compression'])];
  // Filtering changes extrema by micrometres. Recompute declarations from
  // the decoded streams, including sparse zero-filled morph accessors.
  const binary=Buffer.concat(chunks),decoded=await decompressGlb({json,bin:binary});
  for(const [id,a] of json.accessors.entries())if(a.min || a.max){
    const {data,width}=readAccessor(decoded,id),min=Array(width).fill(Infinity),max=Array(width).fill(-Infinity);
    for(let i=0;i<data.length;i++){min[i%width]=Math.min(min[i%width],data[i]);max[i%width]=Math.max(max[i%width],data[i]);}
    a.min=min;a.max=max;
  }
  return {bytes:packGlb(json,binary),compressedViews,decodedBytes:fallback,maximumPositionErrorMetres};
}

export async function decompressGlb(glb) {
  await MeshoptDecoder.ready;
  const json=structuredClone(glb.json),chunks=[];let length=0;
  for(const view of json.bufferViews){
    const ext=view.extensions?.EXT_meshopt_compression;
    const data=ext?new Uint8Array(ext.count*ext.byteStride):glb.bin.subarray(view.byteOffset || 0,(view.byteOffset || 0)+view.byteLength);
    if(ext)MeshoptDecoder.decodeGltfBuffer(data,ext.count,ext.byteStride,glb.bin.subarray(ext.byteOffset || 0,(ext.byteOffset || 0)+ext.byteLength),ext.mode,ext.filter);
    const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}
    view.buffer=0;view.byteOffset=length;delete view.extensions;chunks.push(Buffer.from(data));length+=data.length;
  }
  json.buffers=[{byteLength:length}];json.extensionsRequired=(json.extensionsRequired || []).filter(n=>n!=='EXT_meshopt_compression');
  if(!json.extensionsRequired.length)delete json.extensionsRequired;
  json.extensionsUsed=(json.extensionsUsed || []).filter(n=>n!=='EXT_meshopt_compression');
  if(!json.extensionsUsed.length)delete json.extensionsUsed;
  return {json,bin:Buffer.concat(chunks)};
}

export function publicWriter(glb,scene) {
  const writer=appender(glb);
  for(const [at,mesh] of scene.meshes.entries()){
    if(/privateanatomy/i.test(mesh.name))continue;
    const old=writer.json.meshes[at];
    const names=old.extras?.targetNames || [];
    writer.json.meshes[at]={name:old.name,...writeGeometry(writer,mesh.geometry,old.primitives[0].material,{names,extras:{...old.extras,...mesh.userData},weights:old.weights})};
  }
  retainMeshes(writer.json,m=>!/privateanatomy/i.test(m.name));
  if(writer.json.extras)delete writer.json.extras.privacy;
  pruneMaterials(writer.json);return writer;
}

export function meshStatistics(glb) {
  return glb.json.meshes.map(m=>({name:m.name,vertices:glb.json.accessors[m.primitives[0].attributes.POSITION].count,triangles:glb.json.accessors[m.primitives[0].indices].count/3,morphs:m.extras?.targetNames?.length || 0}));
}
