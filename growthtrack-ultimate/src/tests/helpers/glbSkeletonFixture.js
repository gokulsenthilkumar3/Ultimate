import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bone, Group, Skeleton } from 'three';

/** Authored hierarchy and transforms, separate from the geometry-only fixture. */
export function glbSkeletonFixture(file) {
  const bytes=readFileSync(resolve('public/assets/models',file));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  const skin=gltf.skins[0],jointIds=new Set(skin.joints),nodes=gltf.nodes.map((node,i)=>{
    const object=jointIds.has(i)?new Bone():new Group();object.name=node.name || '';
    object.userData=structuredClone(node.extras || {});
    if(node.translation)object.position.fromArray(node.translation);
    if(node.rotation)object.quaternion.fromArray(node.rotation);
    if(node.scale)object.scale.fromArray(node.scale);
    return object;
  });
  gltf.nodes.forEach((node,i)=>node.children?.forEach(child=>nodes[i].add(nodes[child])));
  const root=new Group();nodes.filter(node=>!node.parent).forEach(node=>root.add(node));root.updateMatrixWorld(true);
  return {root,skeleton:new Skeleton(skin.joints.map(i=>nodes[i]))};
}
