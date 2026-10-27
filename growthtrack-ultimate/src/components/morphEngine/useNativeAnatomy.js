import {useEffect,useState} from 'react';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Mesh} from 'three';
import {createNativeAnatomyDeformer} from './nativeAnatomy';
import {prepareSkinRegions} from '../body3d/skinAppearance';
import {prepareNativeSkinRegions} from './nativeSkinRegions';

const completed=new Map();
function disposeMaterials(materials){
  const textures=new Set();
  for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  for(const texture of textures){texture.dispose();texture.source?.data?.close?.();}
  for(const material of materials)material.dispose();
}
function disposeParsed(scene){
  const materials=new Set();
  scene.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);}});
  disposeMaterials(materials);
}
export async function loadNativeAnatomyPackage(asset,{signal,fetcher=fetch,loader=new GLTFLoader()}={}){
  const path=asset.privatePath,key=path+':'+asset.privateSha256;
  let bytes=completed.get(key);
  if(!bytes){
    const response=await fetcher(path,{signal,credentials:'same-origin'});
    if(!response.ok)throw new Error('Anatomy asset HTTP '+response.status);
    bytes=await response.arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==asset.privateSha256)throw new Error('Anatomy asset integrity mismatch');
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    completed.set(key,bytes);if(completed.size>4)completed.delete(completed.keys().next().value);
  }
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  loader.setMeshoptDecoder(MeshoptDecoder);
  // Only the hash-verified, fully embedded package is parsed. No URL supplied
  // by saved owner records can become an external anatomy resource.
  const gltf=await loader.parseAsync(bytes.slice(0),'');
  if(signal?.aborted){disposeParsed(gltf.scene);throw new DOMException('Cancelled','AbortError');}
  return gltf;
}

export function attachNativeAnatomy(gltf,body,asset){
  if(body?.geometry && !body.geometry.attributes.skinExposure)prepareSkinRegions(body);
  let parts=[];const materials=new Set();
  gltf.scene.traverse(n=>{if(n.isMesh){parts.push(n);for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);}});
  // The GLB carries ordinary skin weights for standalone viewers. Live
  // rendered surfaces use evaluated post-skin coordinates, so detach that
  // skinning here while keeping the actual authored geometry and morphs.
  parts=parts.map(node=>{
    if(!node.isSkinnedMesh || node.userData.controlCage)return node;
    const mesh=new Mesh(node.geometry,node.material);mesh.name=node.name;mesh.userData=node.userData;
    mesh.position.copy(node.position);mesh.quaternion.copy(node.quaternion);mesh.scale.copy(node.scale);
    mesh.morphTargetDictionary={...node.morphTargetDictionary};mesh.morphTargetInfluences=Array.from(node.morphTargetInfluences || []);
    node.parent?.add(mesh);node.removeFromParent();return mesh;
  });
  const main=parts.find(n=>n.userData.nativeBinding && !/Meatus|Foreskin|Pelvic/.test(n.name));
  const cage=parts.find(n=>n.userData.controlCage);
  const metadata=main?.userData.nativeBinding;
  if(!main || !cage || metadata.bodySha256!==asset.sha256 || metadata.lod!==asset.lod || !body?.skeleton)throw new Error('Incompatible native anatomy package');
  // Match joints by name; an equal bone count alone is not a binding proof.
  const names=new Map(body.skeleton.bones.map((bone,i)=>[bone.name,i]));
  const remap=cage.skeleton.bones.map(bone=>names.get(bone.name));
  if(remap.some(id=>id==null))throw new Error('Native anatomy rig does not match body');
  const skinIds=cage.geometry.attributes.skinIndex;
  for(let i=0;i<skinIds.array.length;i++)skinIds.array[i]=remap[skinIds.array[i]];
  cage.bind(body.skeleton,body.bindMatrix);
  for(const mesh of parts){
    prepareNativeSkinRegions(mesh);
    // Each parse owns its resources; only compressed bytes are cached.
    for(const name of ['Uv','Blend','Pigment']){
      const key='pelvic'+name,attribute=mesh.geometry.attributes['_'+key.toLowerCase()];
      if(attribute)mesh.geometry.setAttribute(key,attribute);
    }
    mesh.frustumCulled=false;
    if(mesh!==main)main.add(mesh);
  }
  main.position.copy(body.position);main.quaternion.copy(body.quaternion);main.scale.copy(body.scale);
  cage.visible=false;main.visible=false;body.parent.add(main);
  main.nativeGuideSource=cage;
  main.nativeSourceMaterial=main.material;
  const deformer=createNativeAnatomyDeformer(main,body,cage);
  if(!deformer){main.removeFromParent();parts.forEach(m=>m.geometry.dispose());disposeMaterials(materials);throw new Error('Invalid native tissue binding');}
  let disposed=false;
  return {mesh:main,cage,deformer,get disposed(){return disposed;},dispose(){
    if(disposed)return;disposed=true;deformer.dispose();main.removeFromParent();
    parts.forEach(m=>m.geometry.dispose());disposeMaterials(materials);
  }};
}

/** Network activity begins only after adult eligibility and explicit reveal.
 * Stale parses are disposed before attachment; hiding or changing LOD aborts
 * the request and restores the public body synchronously on cleanup.
 */
export function useNativeAnatomy(body,asset,requested){
  const [state,setState]=useState({status:'idle',attachment:null,error:null,body:null,asset:null});
  useEffect(()=>{
    if(!requested || !body || !asset?.privatePath)return;
    const controller=new AbortController();let current=null,active=true;
    Promise.resolve().then(()=>{
      if(!active)throw new DOMException('Cancelled','AbortError');
      setState({status:'loading',attachment:null,error:null,body,asset});
      return loadNativeAnatomyPackage(asset,{signal:controller.signal});
    }).then(gltf=>{
      if(!active){disposeParsed(gltf.scene);return;}
      try{current=attachNativeAnatomy(gltf,body,asset);}
      catch(error){disposeParsed(gltf.scene);throw error;}
      setState({status:'ready',attachment:current,error:null,body,asset});
    }).catch(error=>{if(active && error.name!=='AbortError')setState({status:'error',attachment:null,error:error.message,body,asset});});
    return()=>{active=false;controller.abort();current?.dispose();};
  },[body,asset,requested]);
  if(!requested || !body || !asset?.privatePath)return {status:'idle',attachment:null,error:null};
  if(state.body!==body || state.asset!==asset || state.attachment?.disposed)return {status:'loading',attachment:null,error:null};
  return state;
}
