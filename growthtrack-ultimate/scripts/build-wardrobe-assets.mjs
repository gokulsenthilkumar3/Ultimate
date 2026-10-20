#!/usr/bin/env node
// Bind licensed authored clothes to the approved body surface, preserving the
// garment's silhouette, folds, UV seams and closed crotch construction.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BufferGeometry,Float32BufferAttribute,Triangle,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {readGlb,readAccessor} from './plan-preview/glb.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=path.join(root,'.tmp/wardrobe-cc0'),out=path.join(root,'public/assets/wardrobe');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFile=path.join(root,'public/assets/models/humanoid-adult-v2-lite.glb');
const provenancePath=path.join(root,'public/assets/models/ASSET-PROVENANCE.json');
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));
if(provenance.assets.find(asset=>asset.path==='public/assets/models/humanoid-adult-v2-lite.glb')?.sha256!==hash(fs.readFileSync(sourceFile)))throw new Error('Wardrobe bindings require the approved body hash.');
const source=readGlb(sourceFile),body=source.json.meshes.find(m=>m.name==='GrowthTrackBody').primitives[0];
const read=id=>readAccessor(source,id).data;
const positions=read(body.attributes.POSITION),bodyJoints=read(body.attributes.JOINTS_0),bodyWeights=read(body.attributes.WEIGHTS_0);
const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(Array.from(read(body.indices)));
const bvh=new MeshBVH(geometry),index=geometry.index;
const manifest=JSON.parse(fs.readFileSync(path.join(cache,'manifest.json'),'utf8'));
manifest.binding={version:'authored-surface-v1',bodySha256:hash(fs.readFileSync(sourceFile)),bodyVertexCount:positions.length/3};
const chunks=[],views=[],accessors=[],meshes=[];let offset=0;
const attribute=(array,size)=> {
  const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);
  const aligned=Buffer.alloc((bytes.length+3)&~3);bytes.copy(aligned);
  views.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(aligned);offset+=aligned.length;
  const accessor={bufferView:views.length-1,componentType:array instanceof Float32Array?5126:array instanceof Uint32Array?5125:5123,count:array.length/size,type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[size]};
  if(size===3 && array instanceof Float32Array) {
    accessor.min=[Infinity,Infinity,Infinity];accessor.max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<array.length;i++) {const axis=i%3;accessor.min[axis]=Math.min(accessor.min[axis],array[i]);accessor.max[axis]=Math.max(accessor.max[axis],array[i]);}
  }
  accessors.push(accessor);return accessors.length-1;
};
const at=(array,i)=>new Vector3().fromArray(array,i*3);
for(const [name,entry] of Object.entries(manifest.garments)) {
  const compiled=fs.readFileSync(path.join(cache,name+'.json'));
  if(hash(compiled)!==entry.geometrySha256)throw new Error(`${name}: compiled source hash mismatch; run compile_wardrobe.py.`);
  const data=JSON.parse(compiled);
  // A sewing mesh is much coarser than the measured body. Subdivide its faces
  // before binding so curved hips and shoulders cannot pierce large triangles.
  const mids=new Map(),geometricMids=new Map(),triangles=[];let originalId=Math.max(...data.original_index)+1;
  const midpoint=(a,b)=> {
    const key=a<b?a+':'+b:b+':'+a;if(mids.has(key))return mids.get(key);
    const id=data.positions.length;
    data.positions.push(data.positions[a].map((v,k)=>(v+data.positions[b][k])/2));
    data.normals.push(data.normals[a].map((v,k)=>(v+data.normals[b][k])/2));
    data.uv_values.push(data.uv_values[a].map((v,k)=>(v+data.uv_values[b][k])/2));
    const originalA=data.original_index[a],originalB=data.original_index[b],physicalEdge=originalA<originalB?originalA+':'+originalB:originalB+':'+originalA;
    if(!geometricMids.has(physicalEdge))geometricMids.set(physicalEdge,originalId++);
    data.original_index.push(geometricMids.get(physicalEdge));mids.set(key,id);return id;
  };
  for(let i=0;i<data.indices.length;i+=3){const[a,b,c]=data.indices.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
  data.indices=triangles;const count=data.positions.length;
  const points=new Float32Array(data.positions.flat()),normals=new Float32Array(data.normals.flat()),uvs=new Float32Array(data.uv_values.flat());
  const ids=new Uint16Array(count*3),bary=new Float32Array(count*3),anchors=new Float32Array(count*3),joints=new Uint16Array(count*4),weights=new Float32Array(count*4),coverage=new Float32Array(count*4);
  // Connectivity uses pre-UV indices, so an atlas seam cannot split a shirt
  // into lower/upper pieces. Pockets, collar, placket and buttons stay authored.
  const parents=new Map(data.original_index.map(i=>[i,i]));
  const find=id=>{let p=parents.get(id);if(p!==id){p=find(p);parents.set(id,p);}return p;};
  for(let i=0;i<data.indices.length;i+=3) {
    const [a,b,c]=data.indices.slice(i,i+3).map(v=>data.original_index[v]);parents.set(find(b),find(a));parents.set(find(c),find(a));
  }
  const bounds=new Map();
  data.original_index.forEach((original,i)=> {const part=find(original),y=points[i*3+1],old=bounds.get(part)||{min:Infinity,max:-Infinity};bounds.set(part,{min:Math.min(old.min,y),max:Math.max(old.max,y)});});
  geometry.computeBoundingBox();const box=geometry.boundingBox,scale=1.92/(box.max.y-box.min.y);
  for(let i=0;i<count;i++) {
    const point=at(points,i),nearest=bvh.closestPointToPoint(point),triIds=[0,1,2].map(k=>index.getX(nearest.faceIndex*3+k));
    const triangle=new Triangle(...triIds.map(id=>at(positions,id)));
    const local=triangle.getBarycoord(nearest.point,new Vector3());
    const normal=triangle.getNormal(new Vector3()),clearance=(box.max.y-box.min.y)*.006;
    const signed=point.clone().sub(nearest.point).dot(normal);
    if(signed<clearance)point.addScaledVector(normal,clearance-signed);
    point.toArray(points,i*3);
    ids.set(triIds,i*3);local.toArray(bary,i*3);nearest.point.toArray(anchors,i*3);
    const skin=new Map();
    triIds.forEach((id,k)=> {for(let j=0;j<4;j++){const bone=bodyJoints[id*4+j];skin.set(bone,(skin.get(bone)||0)+bodyWeights[id*4+j]*local.getComponent(k));}});
    const selected=[...skin].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),total=selected.reduce((sum,[,w])=>sum+w,0);
    selected.forEach(([id,w],k)=>{joints[i*4+k]=id;weights[i*4+k]=w/total;});
    const component=bounds.get(find(data.original_index[i]));
    const wholeOutfit=(component.max-component.min)*scale>1.25;
    const top=wholeOutfit?(points[i*3+1]-box.min.y)*scale>1.0:(component.min-box.min.y)*scale>.45 && (component.max-box.min.y)*scale>1.12;
    coverage[i*4]=top?0:1;coverage[i*4+1]=top?1:0;
    const jointName=source.json.nodes[source.json.skins[0].joints[selected[0][0]]].name;
    coverage[i*4+2]=top && /Shoulder|UpperArm/.test(jointName)?1:0;
    coverage[i*4+3]=top && /ForeArm/.test(jointName)?1:0;
  }
  // UV atlas seams duplicate vertices. Share their physical normals so ease
  // offsets cannot pull the two sides apart and expose cracks in sewn fabric.
  const fitted=new BufferGeometry();fitted.setAttribute('position',new Float32BufferAttribute(points,3));fitted.setIndex(data.indices);fitted.computeVertexNormals();
  const sharedNormals=new Map();
  data.original_index.forEach((id,i)=>{if(!sharedNormals.has(id))sharedNormals.set(id,new Vector3());sharedNormals.get(id).add(new Vector3().fromBufferAttribute(fitted.attributes.normal,i));});
  data.original_index.forEach((id,i)=>sharedNormals.get(id).clone().normalize().toArray(normals,i*3));fitted.dispose();
  const attributes={POSITION:attribute(points,3),NORMAL:attribute(normals,3),TEXCOORD_0:attribute(uvs,2),JOINTS_0:attribute(joints,4),WEIGHTS_0:attribute(weights,4),_BODY_INDICES:attribute(ids,3),_BODY_BARY:attribute(bary,3),_BODY_ANCHOR:attribute(anchors,3),_GARMENT_COVERAGE:attribute(coverage,4),_GARMENT_WELD:attribute(new Uint32Array(data.original_index),1)};
  meshes.push({name,extras:{...manifest.binding,source:entry.source},primitives:[{attributes,indices:attribute(new Uint32Array(data.indices),1)}]});
  entry.vertexCount=count;entry.geometry=name+'-v1.glb';
  console.log(`${name}: ${count} authored vertices, ${data.indices.length/3} triangles`);
}
const encode=(json,binary)=> {
  const jsonBytes=Buffer.from(JSON.stringify(json)),jsonChunk=Buffer.alloc((jsonBytes.length+3)&~3,32);jsonBytes.copy(jsonChunk);
  const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+binary.length,8);
  jh.writeUInt32LE(jsonChunk.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jh,jsonChunk,bh,binary]);
};
// Ship individually requested garments. Loading a pair of briefs should not
// download the 32k-vertex suit and every other wardrobe style first.
for(const mesh of meshes) {
  const primitive=mesh.primitives[0],selected=[...Object.values(primitive.attributes),primitive.indices];
  const subChunks=[],subViews=[],subAccessors=[];let subOffset=0;
  for(const id of selected) {
    const accessor=accessors[id],view=views[accessor.bufferView],chunk=chunks[accessor.bufferView];
    subChunks.push(chunk);subViews.push({...view,byteOffset:subOffset});
    subAccessors.push({...accessor,bufferView:subViews.length-1});subOffset+=chunk.length;
  }
  const attributes=Object.fromEntries(Object.entries(primitive.attributes).map(([key,id])=>[key,selected.indexOf(id)]));
  const subMesh={...mesh,primitives:[{attributes,indices:selected.indexOf(primitive.indices)}]};
  const json={asset:{version:'2.0',generator:'Ultimate licensed wardrobe binding'},buffers:[{byteLength:subOffset}],bufferViews:subViews,accessors:subAccessors,meshes:[subMesh],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
  fs.writeFileSync(path.join(out,manifest.garments[mesh.name].geometry),encode(json,Buffer.concat(subChunks)));
}
manifest.outputs=fs.readdirSync(out).filter(file=>file.endsWith('.png')||file.endsWith('.glb')).map(file=>{const bytes=fs.readFileSync(path.join(out,file));return{file,sha256:hash(bytes),bytes:bytes.length};});
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const components=[{name:'Authored garment patterns, topology, UVs and surface maps',source:`MakeHuman CC0 system assets; verified archive ${manifest.archiveSha256}; per-member hashes and copyright records in public/assets/wardrobe/manifest.json and .mhclo/.mhmat notices`,licence:'CC0 1.0 Universal; explicit September 2020 CC0 notices; official catalog https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',modified:true,status:'verified',reviewed:'2026-10-20'},
  {name:'Measured body surface bindings and garment adaptation',source:'scripts/build-wardrobe-assets.mjs and src/components/morphEngine/authoredGarments.js; approved CC0 body and normalized pose weights',licence:'Project MIT (LICENSE); underlying body CC0-1.0',modified:true,status:'project'}];
const prefix='public/assets/wardrobe/';
provenance.assets=provenance.assets.filter(asset=>!asset.path.startsWith(prefix));
provenance.assets.push(...manifest.outputs.map(file=>({path:prefix+file.file,sha256:file.sha256,components,builtBy:'compile_wardrobe.py; resize_wardrobe_maps.ps1 (1024px); build-wardrobe-assets.mjs'})));
const noticePath='docs/licenses/wardrobe-cc0-notices.txt';
provenance.licenseEvidence=provenance.licenseEvidence.filter(entry=>entry.path!==noticePath);
provenance.licenseEvidence.push({path:noticePath,sha256:hash(Buffer.from(fs.readFileSync(path.join(root,noticePath),'utf8').replace(/\r\n/g,'\n'))),source:manifest.sourceUrl});
fs.writeFileSync(provenancePath,JSON.stringify(provenance,null,2)+'\n');
geometry.dispose();console.log('Wardrobe geometry and provenance written');
