import { Box3, Vector3 } from 'three';

/** Evaluate once in the loader, before viewer parenting, animation or morph
 * interpolation. Camera normalization must not depend on culling envelopes,
 * first-frame timing, outer clone transforms or a previously saved pose. */
export function createModelReferenceFrame(scene) {
  scene.updateWorldMatrix(true,true);scene.updateMatrixWorld(true);
  const box=new Box3().setFromObject(scene,true),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  return {center,size,height:size.y,radius:Math.max(size.x,size.y,size.z)/2};
}
