import {Vector2} from 'three';
import {exportSize} from '../../lib/avatarCapturePolicy';

const scenes=new WeakMap(),composers=new WeakMap(),guards=new WeakMap();
const inspectionKey=Symbol.for('growthtrack.avatar.surface-evidence');
export function registerCaptureScene(canvas,state){
  scenes.set(canvas,state);
  const inspect=()=>surfaceEvidence(state);
  canvas[inspectionKey]=inspect;
  return()=>{
    if(scenes.get(canvas)===state)scenes.delete(canvas);
    if(canvas[inspectionKey]===inspect)delete canvas[inspectionKey];
  };
}
export function registerCaptureComposer(canvas,composer){composers.set(canvas,composer);return()=>{if(composers.get(canvas)===composer)composers.delete(canvas);};}
export function registerCaptureGuard(canvas,guard,priority=0){
  if(!guards.has(canvas))guards.set(canvas,new Map());
  guards.get(canvas).set(guard,priority);return()=>guards.get(canvas)?.delete(guard);
}

/** Read-only technical evidence for renderer checks; no body measurements or
 * private mesh data. Observe the applied resources, not requested settings. */
export function inspectAvatarSurfaces(canvas) {
  return canvas?.[inspectionKey]?.() || null;
}
function surfaceEvidence(state) {
  const surfaces=[];
  state.scene.traverse(node=>{
    if(!node.isMesh || !(/^(Body|GrowthTrack(?:Body|Eyes|Hair|Eyebrows|Eyelashes))(?:_\d+)?$/.test(node.name) || node.userData.eyelidCorrective))return;
    const material=Array.isArray(node.material)?node.material[0]:node.material;
    surfaces.push({name:node.name,visible:node.visible,map:material?.map?.uuid || null,
      geometry:node.geometry?.uuid || null,
      modelAsset:node.userData.modelAsset || null,
      vertices:node.geometry?.attributes.position?.count || 0,
      triangles:(node.geometry?.index?.count ?? node.geometry?.attributes.position?.count ?? 0)/3,
      normalMap:material?.normalMap?.uuid || null,material:material?.type,
      baseColor:material?.uniforms?.uBaseColor?.value.getHexString(),
      skinLayers:material?.uniforms?.uSkinLayers?.value.toArray() || null,
      tanPattern:material?.userData?.tanPattern || null,
      freckles:material?.uniforms?.uFreckles?.value.toArray() || null,
      hairDetail:material?.userData?.hairDetail?.value.toArray() || null,
      hairShadowCutout:Boolean(node.customDepthMaterial && node.customDistanceMaterial),
      emissive:material?.emissiveIntensity || 0,
      blink:node.morphTargetInfluences?.[node.morphTargetDictionary?.blink] || 0,
      shapeWeights:Object.fromEntries(Object.entries(node.morphTargetDictionary || {}).filter(([name])=>!/^d_|private/i.test(name)).map(([name,index])=>[name,node.morphTargetInfluences?.[index] || 0])),
      eyelids:node.userData.eyelidCorrective || null,idle:node.userData.idleMotion || null,
      faceCorrective:node.userData.faceCorrective || null,mouth:node.userData.mouthInterior || null,speech:node.userData.speech || null,
      breathingScale:node.skeleton?.bones.find(bone=>bone.name==='Spine2')?.scale.toArray() || null,
      pose:node.userData.poseEvidence || null,
      poseHandles:node.userData.poseHandles || null,
      poseJointHandle:node.userData.poseJointHandle || null,
      headPoseBinding:node.userData.headPoseBinding || null,
      bodyPoseBinding:node.userData.bodyPoseBinding || null,
      skinBounds:node.userData.skinBounds || null,
      morphRig:node.userData.morphRig || null,
      surfaceParts:node.userData.surfaceParts || null,
      assetRig:node.userData.growthtrack?.rig || null,
      microDetail:material?.userData?.microDetail || null,
      surfaceBinding:node.userData.surfaceBinding || null,
      gaze:material?.userData?.gaze?.value.toArray() || null,
      irisColor:material?.userData?.eyeUniforms?.uIrisColor.value.getHexString() || null,
      irisDetail:material?.userData?.eyeUniforms?.uEyeDetail.value.toArray() || null,
      pupilMm:material?.userData?.pupil?.value ?? null,
      pupilTargetMm:material?.userData?.pupil?.target ?? null,
      pupilMode:material?.userData?.pupil?.appearance.pupilMode || null,
    });
  });
  return {surfaces,background:state.scene.background?.name || null};
}

/** Render a protected still through the live colour pipeline. Restore both
 * renderer and composer in finally, including when allocation or encoding fails. */
export class AvatarCaptureSession {
  #canvas; #options; #used=false;
  constructor(canvas,options={}){this.#canvas=canvas;this.#options={...options};}
  capture(){
  if(this.#used)throw new Error('An image capture session can only be used once.');this.#used=true;
  const canvas=this.#canvas,{scale=2}=this.#options;
  const state=scenes.get(canvas);if(!state)throw new Error('The interactive model is still loading.');
  const {gl,scene,camera}=state,composer=composers.get(canvas),size=gl.getSize(new Vector2()),pixelRatio=gl.getPixelRatio();
  const requested=exportSize(canvas.width,canvas.height,{scale,maxTexture:gl.capabilities.maxTextureSize,maxPixels:16777216});
  const aspect=camera.aspect;
  const restoreGuards=[],restoreErrors=[];
  let image,captureError,failed=false;
  const restore=operation=>{try{operation();}catch(error){restoreErrors.push(error);}};
  try {
    // Parameters -> rig -> expression/eyes -> privacy. Registration order is
    // not reliable across React parent/child effects or model replacement.
    for(const [guard] of [...(guards.get(canvas) || [])].sort((a,b)=>a[1]-b[1]))restoreGuards.push(guard());
    let sensitiveVisible=false;
    scene.traverseVisible?.(node=>{if(node.isMesh && (node.userData?.sensitive===true || /PrivateAnatomy|Schematic|PrivateMeasurementGuides/i.test(node.name)))sensitiveVisible=true;});
    if(sensitiveVisible)throw new Error('The protected view is still preparing. Try exporting again.');
    gl.setPixelRatio(1);gl.setSize(requested.width,requested.height,false);composer?.setSize(requested.width,requested.height);
    camera.aspect=requested.width/requested.height;camera.updateProjectionMatrix();
    if(composer)composer.render(0);else gl.render(scene,camera);
    image=canvas.toDataURL('image/png');
  } catch(error){
    failed=true;captureError=error;
  } finally {
    // A failed resource/guard restore must not leave another model, privacy
    // guard, projection or viewport in its temporary export state.
    restoreGuards.reverse().forEach(guard=>restore(()=>typeof guard==='function'?guard():guard?.restore?.()));
    // Bindings whose derived geometry depends on restored weights settle only
    // after every participant has restored its own state.
    restoreGuards.forEach(guard=>restore(()=>guard?.afterRestore?.()));
    restore(()=>gl.setPixelRatio(pixelRatio));restore(()=>gl.setSize(size.x,size.y,false));
    restore(()=>composer?.setSize(size.x,size.y));
    camera.aspect=aspect;restore(()=>camera.updateProjectionMatrix());
    restore(()=>{if(composer)composer.render(0);else gl.render(scene,camera);});
  }
  if(failed)throw captureError;
  if(restoreErrors.length)throw restoreErrors[0];
  return image;
  }
}

export function captureAvatarImage(canvas,options) {
  return new AvatarCaptureSession(canvas,options).capture();
}
