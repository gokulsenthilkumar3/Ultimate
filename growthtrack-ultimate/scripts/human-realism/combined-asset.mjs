import fs from 'node:fs';
import path from 'node:path';
import validator from 'gltf-validator';
import {appender} from '../human75/glb-tools.mjs';
import {readGlb,readAccessor} from '../plan-preview/glb.mjs';
import {normalizeGlbFormat,glbFromBytes} from '../gltf-format.mjs';
import {sha256} from './glb-family.mjs';

/** Explicit private, offline authoring artifact. Never placed in public assets
 * or selected by a normal capture/export path. Standard glTF skinning is kept;
 * dynamic contact and measured fitting are supplied by the accompanying code. */
export async function buildCombinedAsset(work,output){
  const publicGlb=readGlb(path.join(work,'hero-authoring.glb')),privateGlb=readGlb(path.join(work,'hero-private-authoring.glb'));
  const writer=appender(publicGlb),json=writer.json,source=privateGlb.json;
  const jointNames=g=>g.json.skins[0].joints.map(id=>g.json.nodes[id].name);
  if(JSON.stringify(jointNames(publicGlb))!==JSON.stringify(jointNames(privateGlb)))throw new Error('Combined rig joint order mismatch');
  const imageBase=json.images.length,textureBase=json.textures.length,samplerBase=(json.samplers ||= []).length,materialBase=json.materials.length;
  for(const image of source.images || []){
    const view=source.bufferViews[image.bufferView],bytes=privateGlb.bin.subarray(view.byteOffset || 0,(view.byteOffset || 0)+view.byteLength);
    json.images.push({...structuredClone(image),bufferView:writer.view(bytes)});
  }
  json.samplers.push(...structuredClone(source.samplers || []));
  json.textures.push(...(source.textures || []).map(texture=>({...structuredClone(texture),source:texture.source+imageBase,...(texture.sampler!=null?{sampler:texture.sampler+samplerBase}:{})})));
  const remapTextures=value=>{for(const [key,child] of Object.entries(value || {}))if(key.endsWith('Texture') && child?.index!=null)child.index+=textureBase;else if(child && typeof child==='object')remapTextures(child);};
  for(const material of source.materials){const copy=structuredClone(material);remapTextures(copy);json.materials.push(copy);}
  const copied=new Map();
  const accessor=id=>{
    if(!copied.has(id)){const a=readAccessor(privateGlb,id),next=writer.accessor(a.data,a.width);if(source.accessors[id].normalized)json.accessors[next].normalized=true;copied.set(id,next);}return copied.get(id);
  };
  const main=source.meshes.find(mesh=>mesh.extras?.nativeBinding && !/Meatus|Foreskin|Pelvic/.test(mesh.name)),removed=new Set(main.extras.nativeBinding.removedBodyTriangles);
  const body=json.meshes.find(mesh=>mesh.name==='GrowthTrackBody'),bodyIndex=readAccessor(publicGlb,body.primitives[0].indices).data;
  body.primitives[0].indices=writer.accessor(Uint32Array.from(bodyIndex.filter((_,i)=>!removed.has(Math.floor(i/3)))),1);
  for(const mesh of source.meshes.filter(mesh=>!mesh.extras?.controlCage)){
    const copy=structuredClone(mesh);
    copy.extras={sensitive:true,anatomySex:'male',...(copy.extras?.targetNames?{targetNames:copy.extras.targetNames}:{})};
    for(const primitive of copy.primitives){
      primitive.attributes=Object.fromEntries(Object.entries(primitive.attributes).filter(([key])=>!key.startsWith('_')).map(([key,id])=>[key,accessor(id)]));
      primitive.indices=accessor(primitive.indices);primitive.material+=materialBase;
      for(const target of primitive.targets || [])for(const key of Object.keys(target))target[key]=accessor(target[key]);
    }
    const meshId=json.meshes.length;json.meshes.push(copy);
    const node=json.nodes.length;json.nodes.push({name:copy.name,mesh:meshId,skin:0,extras:{sensitive:true,anatomySex:'male'}});json.scenes[json.scene || 0].nodes.push(node);
  }
  for(const mesh of json.meshes)for(const primitive of mesh.primitives)for(const key of Object.keys(primitive.attributes))if(key.startsWith('_'))delete primitive.attributes[key];
  json.asset.generator='GrowthTrack complete generic adult authoring artifact';
  const position=publicGlb.json.accessors[body.primitives[0].attributes.POSITION],referenceScale=1.75/(position.max[1]-position.min[1]);
  json.asset.extras={sensitive:true,adult:true,genericLikeness:true,units:'metres',referenceHeightCm:175,runtimeCorrectives:'Accompanying native-anatomy code; standalone viewers provide ordinary rig posing.'};
  // Convert geometry, morph deltas, joint translations and inverse-bind
  // translations together. Avoid transformed parents of skinned mesh nodes.
  const raw=glbFromBytes(writer.pack()),scaled=appender(raw),scaledIds=new Map();
  const scaledPosition=id=>{
    if(!scaledIds.has(id)){const a=readAccessor(raw,id);scaledIds.set(id,scaled.accessor(Float32Array.from(a.data,value=>value*referenceScale),3,{sparse:Boolean(raw.json.accessors[id].sparse)}));}return scaledIds.get(id);
  };
  for(const mesh of scaled.json.meshes)for(const primitive of mesh.primitives){primitive.attributes.POSITION=scaledPosition(primitive.attributes.POSITION);for(const target of primitive.targets || [])if(target.POSITION!=null)target.POSITION=scaledPosition(target.POSITION);}
  for(const node of scaled.json.nodes){if(node.translation)node.translation=node.translation.map(value=>value*referenceScale);if(node.matrix)for(const i of [12,13,14])node.matrix[i]*=referenceScale;}
  for(const skin of scaled.json.skins){const a=readAccessor(raw,skin.inverseBindMatrices),values=Float32Array.from(a.data);for(let i=0;i<values.length;i+=16)for(const k of [12,13,14])values[i+k]*=referenceScale;skin.inverseBindMatrices=scaled.accessor(values,16);}
  const bytes=normalizeGlbFormat(glbFromBytes(scaled.pack())).bytes;
  const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:'generic-adult-complete.glb',maxIssues:0});
  if(validation.issues.numErrors)throw new Error('Combined artifact validation failed');
  fs.mkdirSync(output,{recursive:true});const file=path.join(output,'generic-adult-complete.glb');fs.writeFileSync(file,bytes);
  const report={file,bytes:bytes.length,sha256:sha256(bytes),joints:json.skins[0].joints.length,meshes:json.meshes.length,errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,scope:json.asset.extras};
  fs.writeFileSync(path.join(output,'complete-asset.json'),JSON.stringify(report,null,2)+'\n');return report;
}
