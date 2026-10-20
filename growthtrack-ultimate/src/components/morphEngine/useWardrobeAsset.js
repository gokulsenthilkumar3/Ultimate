import {useEffect,useState} from 'react';
import {TextureLoader,SRGBColorSpace} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {wardrobeAssetKey} from '../../lib/wardrobePreferences';

const base=import.meta.env.BASE_URL+'assets/wardrobe/';
let geometryPromise;
const textures=new Map();
const texture=(name,color=false)=> {
  if(!name) return Promise.resolve(null);
  if(!textures.has(name)) textures.set(name,new TextureLoader().loadAsync(base+name).then(value=>{value.flipY=false;if(color)value.colorSpace=SRGBColorSpace;return value;}));
  return textures.get(name);
};
export function useWardrobeAsset(preset,options,enabled=true) {
  const key=wardrobeAssetKey(preset,options?.variant);
  const [asset,setAsset]=useState(null);
  useEffect(()=> {
    if(!enabled) return;
    let current=true;
    geometryPromise ||= Promise.all([new GLTFLoader().loadAsync(base+'wardrobe-v1.glb'),fetch(base+'manifest.json').then(response=>{if(!response.ok)throw new Error('Wardrobe manifest unavailable');return response.json();})]);
    geometryPromise.then(async([gltf,manifest])=> {
      const record=manifest.garments[key],mesh=gltf.scene.children.find(node=>node.name===key);
      const [normal,map]=await Promise.all([texture(record.normal),texture(record.diffuse,true)]);
      if(current)setAsset({key,mesh,normal,map});
    }).catch(()=>{if(current)setAsset(null);});
    return ()=>{current=false;};
  },[enabled,key]);
  return asset?.key===key?asset:null;
}
