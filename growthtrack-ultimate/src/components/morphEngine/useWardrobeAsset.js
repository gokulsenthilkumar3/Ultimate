import {useEffect,useSyncExternalStore} from 'react';
import {TextureLoader,SRGBColorSpace} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {wardrobeAssetKey} from '../../lib/wardrobePreferences';

const base=import.meta.env.BASE_URL+'assets/wardrobe/';
let manifestPromise;
const assets=new Map(),textures=new Map(),jobs=new Map(),listeners=new Set();
const idle=Object.freeze({status:'idle',asset:null});
const emit=()=>listeners.forEach(listener=>listener());
const subscribe=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
const requestKey=(preset,options={})=>`${wardrobeAssetKey(preset,options?.variant)}:${['CASUAL','FORMAL'].includes(preset)?'normal':''}:${options?.pattern==='source'?'source':''}`;
const texture=(name,color=false)=> {
  if(!name) return Promise.resolve(null);
  const key=name+':'+color;
  if(!textures.has(key)) textures.set(key,new TextureLoader().loadAsync(base+name).then(value=>{value.flipY=false;if(color)value.colorSpace=SRGBColorSpace;return value;}).catch(error=>{textures.delete(key);throw error;}));
  return textures.get(key);
};
function geometry(key) {
  if(!assets.has(key)) {
    manifestPromise ||= fetch(base+'manifest.json').then(response=>{if(!response.ok)throw new Error('Wardrobe manifest unavailable');return response.json();}).catch(error=>{manifestPromise=null;throw error;});
    assets.set(key,manifestPromise.then(async manifest=> {
      const record=manifest.garments[key];
      if(!record?.geometry)throw new Error('Garment geometry is not declared');
      const gltf=await new GLTFLoader().loadAsync(base+record.geometry);
      const mesh=gltf.scene.children.find(node=>node.name===key);
      if(!mesh)throw new Error('Garment mesh is missing');
      return {key,mesh,record,normal:null,map:null};
    }).catch(error=>{assets.delete(key);throw error;}));
  }
  return assets.get(key);
}

/** Geometry becomes available before optional surface maps. Cached geometry is
 * shared between presets and comparison clones; callers never dispose it. */
export function preloadWardrobeAsset(preset='UNDERWEAR',options={}) {
  const id=requestKey(preset,options),existing=jobs.get(id);
  if(existing && existing.snapshot.status!=='error')return existing.promise;
  const job={snapshot:{status:'loading',asset:null},promise:null};
  jobs.set(id,job);
  job.promise=geometry(wardrobeAssetKey(preset,options?.variant)).then(async asset=> {
    const normal=['CASUAL','FORMAL'].includes(preset)?asset.record.normal:null;
    const diffuse=options?.pattern==='source'?asset.record.diffuse:null;
    job.snapshot={status:normal || diffuse?'detailing':'ready',asset};emit();
    if(!normal && !diffuse)return asset;
    const results=await Promise.allSettled([texture(normal),texture(diffuse,true)]);
    const detailed={...asset,normal:results[0].status==='fulfilled'?results[0].value:null,map:results[1].status==='fulfilled'?results[1].value:null};
    job.snapshot={status:results.some(result=>result.status==='rejected')?'detail-error':'ready',asset:detailed};emit();
    return detailed;
  }).catch(error=>{job.snapshot={status:'error',asset:null};emit();throw error;});
  emit();
  return job.promise;
}

export function retryWardrobeAsset(preset,options={}) {
  const id=requestKey(preset,options),job=jobs.get(id);
  if(job && ['error','detail-error'].includes(job.snapshot.status))jobs.delete(id);
  return preloadWardrobeAsset(preset,options);
}
export function useWardrobeLoadStatus(preset,options={}) {
  const id=requestKey(preset,options);
  return useSyncExternalStore(subscribe,()=>jobs.get(id)?.snapshot || idle,()=>idle);
}
export function useWardrobeAsset(preset,options,enabled=true) {
  const snapshot=useWardrobeLoadStatus(preset,options);
  const variant=options?.variant,pattern=options?.pattern;
  useEffect(()=> {
    if(enabled)preloadWardrobeAsset(preset,{variant,pattern}).catch(()=>{});
  },[enabled,preset,variant,pattern]);
  return enabled?snapshot.asset:null;
}
