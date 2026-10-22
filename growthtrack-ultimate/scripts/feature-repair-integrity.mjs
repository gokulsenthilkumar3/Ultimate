import {createHash} from 'node:crypto';
import {readAccessor,readImage} from './plan-preview/glb.mjs';

export function featureRepairIntegrity(glb,{excludeAttributes=[]}={}){
  const body=createHash('sha256');
  const include=id=>{const a=readAccessor(glb,id).data;body.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));};
  for(const mesh of glb.json.meshes.filter(mesh=>['GrowthTrackBody','GrowthTrackPrivateAnatomy'].includes(mesh.name))){
    body.update(mesh.name);
    for(const p of mesh.primitives){
      for(const key of Object.keys(p.attributes).filter(key=>!excludeAttributes.includes(key)).sort()){body.update(key);include(p.attributes[key]);}
      include(p.indices);
      for(const target of p.targets||[])for(const key of Object.keys(target).sort()){body.update(key);include(target[key]);}
    }
  }
  for(const skin of glb.json.skins||[])include(skin.inverseBindMatrices);
  body.update(JSON.stringify(glb.json.nodes));
  const images=createHash('sha256');
  glb.json.images.forEach((image,i)=>{images.update(image.name||'');images.update(readImage(glb,i));});
  return {bodyAndRigSha256:body.digest('hex'),imagesSha256:images.digest('hex')};
}
