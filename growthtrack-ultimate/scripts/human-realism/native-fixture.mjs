import fs from 'node:fs';
import {BufferAttribute} from 'three';
import {readGlb,readAccessor} from '../plan-preview/glb.mjs';
import {sceneFromGlb} from '../human75/glb-tools.mjs';
import {decompressGlb} from './glb-family.mjs';

function scene(glb){
  const value=sceneFromGlb(glb);
  value.meshes.forEach((mesh,i)=>{for(const [key,id] of Object.entries(glb.json.meshes[i].primitives[0].attributes))if(key.startsWith('_')){
    const a=readAccessor(glb,id);mesh.geometry.setAttribute(key.toLowerCase(),new BufferAttribute(a.data,a.width));
  }});
  return value;
}
export async function nativeFixture(lod,runtime){
  const manifest=JSON.parse(fs.readFileSync('src/config/humanAssetManifest.json')),asset={...manifest.assets[lod],lod};
  const publicScene=scene(await decompressGlb(readGlb('public/assets/models/'+asset.file)));
  const privateScene=scene(await decompressGlb(readGlb('public/assets/models/'+asset.privateFile)));
  const attachment=runtime.attachNativeAnatomy({scene:privateScene.root},publicScene.body,asset);
  attachment.mesh.visible=true;
  const bones=Object.fromEntries(Object.entries(runtime.resolveRigBones(publicScene.body.skeleton)).filter(([,b])=>b).map(([key,bone])=>[key,{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}]));
  const morphRig=runtime.createMorphRig(publicScene.body);
  return {...publicScene,attachment,bones,setMorphs(weights={}){
    for(const mesh of [publicScene.body,attachment.cage])for(const [name,id] of Object.entries(mesh.morphTargetDictionary || {}))if(!['d_length','d_girth'].includes(name))mesh.morphTargetInfluences[id]=weights[name] || 0;
    morphRig();
  },setPose(joints={},heightScale=1){
    publicScene.root.scale.y=heightScale;
    runtime.applyJointPose(bones,{joints,targets:{},digits:{}});
    publicScene.root.updateMatrixWorld(true);publicScene.body.skeleton.update();attachment.deformer.updateDetails();
  }};
}
