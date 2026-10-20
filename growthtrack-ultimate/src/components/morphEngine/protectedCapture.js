import {SkinnedMesh} from 'three';
import {createGarmentGeometry} from './garmentGeometry';
import {createClothMaterial} from './WardrobeShader';

/** Synchronous render guard: React effects and the capture's RAF callbacks
 * can run in either order when the viewport has scrolled offscreen. */
export function protectAvatarCapture({body,privateMesh,guides,material,wardrobe}) {
  const visibility=[privateMesh,guides].filter(Boolean).map(node=>[node,node.visible]);
  visibility.forEach(([node])=>{node.visible=false;});
  const pubic=material?.uniforms?.uPubicHair,previousPubic=pubic?.value;
  if(pubic)pubic.value=0;
  let cover,shell,cloth;
  const restore=()=>{
    cover?.removeFromParent();shell?.dispose();cloth?.dispose();
    visibility.forEach(([node,value])=>{node.visible=value;});
    if(pubic)pubic.value=previousPubic;
  };
  try {
    if(wardrobe==='ANATOMICAL' && body?.skeleton && body.parent) {
      shell=createGarmentGeometry(body,{variant:'boxerBriefs'});
      cloth=createClothMaterial('UNDERWEAR',body.geometry,{variant:'boxerBriefs'});
      cover=new SkinnedMesh(shell.geometry,cloth);cover.name='CaptureUnderwear';
      cover.morphTargetDictionary=body.morphTargetDictionary;
      cover.morphTargetInfluences=Array.from(body.morphTargetInfluences || []);
      cover.bind(body.skeleton,body.bindMatrix);
      cover.position.copy(body.position);cover.quaternion.copy(body.quaternion);cover.scale.copy(body.scale);
      cover.frustumCulled=false;cover.renderOrder=1;
      body.parent.add(cover);cover.updateWorldMatrix(true,true);
    }
    return restore;
  } catch(error){restore();throw error;}
}
