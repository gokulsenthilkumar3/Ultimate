/** Freeze the applied pose synchronously. A capture can run while React or
 * the render loop is paused; requesting reduced motion in the store alone
 * does not guarantee that another frame has reached the skeleton yet. */
export function freezeIdlePose({meshes=[],eyeMaterial,breathingBone,breathingRestScale,manualBlink=0}) {
  const blink=Number.isFinite(manualBlink)?Math.max(0,Math.min(1,manualBlink)):0;
  const previous=meshes.flatMap(mesh=>{
    const index=mesh?.morphTargetDictionary?.blink;
    return index==null || !mesh.morphTargetInfluences?[]:[{mesh,index,value:mesh.morphTargetInfluences[index]}];
  });
  const gaze=eyeMaterial?.userData?.gaze?.value,previousGaze=gaze?.clone();
  const previousScale=breathingBone?.scale.clone();
  previous.forEach(({mesh,index})=>{mesh.morphTargetInfluences[index]=blink;});
  gaze?.set(0,0);
  if(breathingBone && breathingRestScale)breathingBone.scale.copy(breathingRestScale);
  return ()=>{
    previous.forEach(({mesh,index,value})=>{mesh.morphTargetInfluences[index]=value;});
    if(previousGaze)gaze.copy(previousGaze);
    if(previousScale)breathingBone.scale.copy(previousScale);
  };
}
