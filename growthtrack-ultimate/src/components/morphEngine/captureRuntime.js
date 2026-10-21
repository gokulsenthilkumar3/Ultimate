import {Vector2} from 'three';
import {exportSize} from '../../lib/avatarCapturePolicy';

const scenes=new WeakMap(),composers=new WeakMap(),guards=new WeakMap();
export function registerCaptureScene(canvas,state){scenes.set(canvas,state);return()=>{if(scenes.get(canvas)===state)scenes.delete(canvas);};}
export function registerCaptureComposer(canvas,composer){composers.set(canvas,composer);return()=>{if(composers.get(canvas)===composer)composers.delete(canvas);};}
export function registerCaptureGuard(canvas,guard){
  if(!guards.has(canvas))guards.set(canvas,new Set());
  guards.get(canvas).add(guard);return()=>guards.get(canvas)?.delete(guard);
}

/** Render a protected still through the live colour pipeline. Restore both
 * renderer and composer in finally, including when allocation or encoding fails. */
export function captureAvatarImage(canvas,{scale=2}={}) {
  const state=scenes.get(canvas);if(!state)throw new Error('The interactive model is still loading.');
  const {gl,scene,camera}=state,composer=composers.get(canvas),size=gl.getSize(new Vector2()),pixelRatio=gl.getPixelRatio();
  const requested=exportSize(canvas.width,canvas.height,{scale,maxTexture:gl.capabilities.maxTextureSize,maxPixels:16777216});
  const aspect=camera.aspect;
  const restoreGuards=[];
  try {
    for(const guard of guards.get(canvas) || [])restoreGuards.push(guard());
    let sensitiveVisible=false;
    scene.traverseVisible?.(node=>{if(node.isMesh && (node.userData?.sensitive===true || /PrivateAnatomy|Schematic|PrivateMeasurementGuides/i.test(node.name)))sensitiveVisible=true;});
    if(sensitiveVisible)throw new Error('The protected view is still preparing. Try exporting again.');
    gl.setPixelRatio(1);gl.setSize(requested.width,requested.height,false);composer?.setSize(requested.width,requested.height);
    camera.aspect=requested.width/requested.height;camera.updateProjectionMatrix();
    if(composer)composer.render(0);else gl.render(scene,camera);
    return canvas.toDataURL('image/png');
  } finally {
    restoreGuards.reverse().forEach(restore=>restore?.());
    gl.setPixelRatio(pixelRatio);gl.setSize(size.x,size.y,false);composer?.setSize(size.x,size.y);
    camera.aspect=aspect;camera.updateProjectionMatrix();
    if(composer)composer.render(0);else gl.render(scene,camera);
  }
}
