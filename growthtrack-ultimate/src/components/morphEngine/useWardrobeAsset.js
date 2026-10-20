import {useEffect,useState} from 'react';
import {TextureLoader,SRGBColorSpace} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {wardrobeAssetKey} from '../../lib/wardrobePreferences';

const base=import.meta.env.BASE_URL+'assets/wardrobe/';
let manifestPromise;
const assets=new Map();
const textures=new Map();
const texture=(name,color=false)=> {
  if(!name) return Promise.resolve(null);
  if(!textures.has(name)) textures.set(name,new TextureLoader().loadAsync(base+name).then(value=>{value.flipY=false;if(color)value.colorSpace=SRGBColorSpace;return value;}).catch(error=>{textures.delete(name);throw error;}));
  return textures.get(name);
};
export function useWardrobeAsset(preset,options,enabled=true) {
  const variant=options?.variant,key=wardrobeAssetKey(preset,variant);
  const [asset,setAsset]=useState(null);
  useEffect(()=> {
    if(!enabled) return;
    let current=true;
    preloadWardrobeAsset(preset,{variant}).then(value=>{if(current)setAsset(value);})
      .catch(error=>{if(current){console.warn('Detailed wardrobe unavailable:',error);setAsset(null);}});
    return ()=>{current=false;};
  },[enabled,key,preset,variant]);
  return asset?.key===key?asset:null;
}

export function preloadWardrobeAsset(preset='UNDERWEAR',options={}) {
  const key=wardrobeAssetKey(preset,options?.variant);
  if(!assets.has(key)) {
    manifestPromise ||= fetch(base+'manifest.json').then(response=>{if(!response.ok)throw new Error('Wardrobe manifest unavailable');return response.json();}).catch(error=>{manifestPromise=null;throw error;});
    assets.set(key,manifestPromise.then(async manifest=> {
      const record=manifest.garments[key];
      if(!record?.geometry)throw new Error('Garment geometry is not declared');
      const [gltf,normal,map]=await Promise.all([new GLTFLoader().loadAsync(base+record.geometry),texture(record.normal),texture(record.diffuse,true)]);
      const mesh=gltf.scene.children.find(node=>node.name===key);
      if(!mesh)throw new Error('Garment mesh is missing');
      return {key,mesh,normal,map};
    }).catch(error=>{assets.delete(key);throw error;}));
  }
  return assets.get(key);
}
