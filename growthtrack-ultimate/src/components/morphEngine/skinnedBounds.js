import { Box3, Matrix4, Sphere, Vector3 } from 'three';

/** A weighted skin vertex lies in the convex hull of its joint-transformed
 * positions. Unioning per-joint boxes therefore bounds the entire skin.
 * Cache the rest/morph envelope once; each frame transforms O(joints) boxes
 * instead of skinning every vertex on the CPU. No artist-authored dimensions. */
export function createSkinnedBoundsUpdater(mesh) {
  if(!mesh?.isSkinnedMesh || !mesh.skeleton)return ()=>{};
  let cached=null;
  const transformed=new Box3(),bounds=new Box3(),matrix=new Matrix4(),size=new Vector3();
  const geometryState=()=>{
    const geometry=mesh.geometry,attributes=[geometry.attributes.position,geometry.attributes.skinIndex,geometry.attributes.skinWeight,...(geometry.morphAttributes.position || [])];
    return {geometry,attributes,versions:attributes.map(a=>a?.version),relative:geometry.morphTargetsRelative};
  };
  function build(state) {
    const {position,skinIndex,skinWeight}=state.geometry.attributes;
    if(!position || !skinIndex || !skinWeight)return null;
    const skeleton=mesh.skeleton,boxes=skeleton.bones.map(()=>new Box3());
    const envelope=new Box3(),point=new Vector3(),delta=new Vector3(),source=state.geometry.morphAttributes.position || [];
    let normalized=true;
    for(let i=0;i<position.count;i++) {
      point.fromBufferAttribute(position,i);envelope.min.copy(point);envelope.max.copy(point);
      for(const morph of source) {
        delta.fromBufferAttribute(morph,i);if(!state.relative)delta.sub(point);
        for(let axis=0;axis<3;axis++) {
          const value=delta.getComponent(axis);
          if(value<0)envelope.min.setComponent(axis,envelope.min.getComponent(axis)+value);
          else envelope.max.setComponent(axis,envelope.max.getComponent(axis)+value);
        }
      }
      let sum=0;
      for(let slot=0;slot<skinWeight.itemSize;slot++) {
        const weight=skinWeight.getComponent(i,slot),joint=skinIndex.getComponent(i,slot);sum+=weight;
        if(weight<0 || !Number.isFinite(weight) || !skeleton.bones[joint])normalized=false;
        if(weight>0 && skeleton.bones[joint])boxes[joint].union(envelope);
      }
      if(Math.abs(sum-1)>2**-20)normalized=false;
    }
    return {...state,skeleton,boxes,normalized};
  }
  return ()=>{
    const state=geometryState(),skeleton=mesh.skeleton;
    const changed=!cached || cached.geometry!==state.geometry || cached.skeleton!==skeleton || cached.relative!==state.relative ||
      state.attributes.length!==cached.attributes.length || state.attributes.some((a,i)=>a!==cached.attributes[i] || a?.version!==cached.versions[i]);
    if(changed)cached=build(state);
    if(!cached)return;
    // updateWorldMatrix does not invoke SkinnedMesh.updateMatrixWorld's bind
    // inverse refresh. Call the latter too after external viewer transforms.
    mesh.updateWorldMatrix(true,false);mesh.updateMatrixWorld(true);
    for(const bone of skeleton.bones)if(!bone.parent?.isBone)bone.updateWorldMatrix(true,true);
    skeleton.update();
    const influences=mesh.morphTargetInfluences || [];
    if(!cached.normalized || influences.some(w=>!Number.isFinite(w) || w<0 || w>1)) {
      // Custom imports can exceed the standard preview envelope. Preserve
      // correctness there with an exact posed-vertex fallback.
      mesh.computeBoundingBox();mesh.computeBoundingSphere();
      mesh.userData.skinBounds={method:'exact-posed-vertices'};return;
    }
    bounds.makeEmpty();
    for(let i=0;i<cached.boxes.length;i++)if(!cached.boxes[i].isEmpty()) {
      matrix.copy(mesh.bindMatrixInverse).multiply(skeleton.bones[i].matrixWorld).multiply(skeleton.boneInverses[i]).multiply(mesh.bindMatrix);
      bounds.union(transformed.copy(cached.boxes[i]).applyMatrix4(matrix));
    }
    if(bounds.isEmpty())return;
    // Float32 weights may differ from unity by a few ulps.
    bounds.expandByScalar(Math.max(bounds.getSize(size).length(),Number.EPSILON)*2**-20);
    mesh.boundingBox ||= new Box3();mesh.boundingSphere ||= new Sphere();
    mesh.boundingBox.copy(bounds);bounds.getBoundingSphere(mesh.boundingSphere);
    mesh.userData.skinBounds={method:'joint-morph-envelope',joints:cached.boxes.filter(box=>!box.isEmpty()).length,morphs:state.geometry.morphAttributes.position?.length || 0};
  };
}
