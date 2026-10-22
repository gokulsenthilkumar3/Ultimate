import { BufferGeometry, DoubleSide, Float32BufferAttribute, Matrix4, Ray, Triangle, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';

function refineCards(source) {
  // A coarse card can have all three corners outside the forehead while its
  // middle cuts through it. Subdivide before projection, preserving UV seams
  // and every morph channel. This runs once, only on the bundled brow mesh.
  const geometry = new BufferGeometry(), rows = [];
  const divide = (a, b, c, depth) => {
    if (!depth) { rows.push(a, b, c); return; }
    const mid = (u, v) => u.map((value, i) => (value + v[i]) * .5);
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    divide(a, ab, ca, depth - 1); divide(ab, b, bc, depth - 1);
    divide(ca, bc, c, depth - 1); divide(ab, bc, ca, depth - 1);
  };
  const count = source.index?.count ?? source.attributes.position.count;
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map(k => source.index ? source.index.getX(i + k) : i + k);
    const start = rows.length;
    divide([1, 0, 0], [0, 1, 0], [0, 0, 1], 1);
    for (let j = start; j < rows.length; j++) rows[j] = { ids, weights: rows[j] };
  }
  const interpolate = attribute => {
    const data = new Float32Array(rows.length * attribute.itemSize);
    rows.forEach(({ ids, weights }, i) => {
      for (let c = 0; c < attribute.itemSize; c++) {
        data[i * attribute.itemSize + c] = ids.reduce((sum, id, k) => sum + attribute.getComponent(id, c) * weights[k], 0);
      }
    });
    return new Float32BufferAttribute(data, attribute.itemSize);
  };
  for (const [key, attribute] of Object.entries(source.attributes)) geometry.setAttribute(key, interpolate(attribute));
  for (const [key, targets] of Object.entries(source.morphAttributes)) geometry.morphAttributes[key] = targets.map(interpolate);
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  return geometry;
}

/** Bind the bundled eyebrow cards to actual skin triangles. Independent
 * approximate head morphs left the cards intersecting the forehead, producing
 * visible triangular gaps. Barycentric morph transfer keeps each card outside
 * the same skin patch as facial proportions change. */
export function bindBrowsToSkin(body,features) {
  const brow=features.find(item=>item.feature==='eyebrows')?.mesh;
  if(!brow || !body.geometry.index)return null;
  const original=brow.geometry;
  brow.geometry=refineCards(original);
  original.dispose();
  body.updateWorldMatrix(true,false);brow.updateWorldMatrix(true,false);
  const toBody=new Matrix4().copy(body.matrixWorld).invert().multiply(brow.matrixWorld);
  const fromBody=toBody.clone().invert();
  const bvh=new MeshBVH(body.geometry,{indirect:true});
  const bodyPosition=body.geometry.attributes.position,bodyIndex=body.geometry.index;
  const p=brow.geometry.attributes.position,ray=new Ray(),point=new Vector3(),triangle=new Triangle();
  const normal=new Vector3(),bary=new Vector3(),bindings=[];
  // Cards bridge curved forehead triangles. Leave hair-length clearance so
  // the interiors of the cards do not cut back through the convex skin.
  const clearance=.0015;
  for(let i=0;i<p.count;i++) {
    point.fromBufferAttribute(p,i).applyMatrix4(toBody);
    ray.origin.copy(point).add(new Vector3(0,0,.04));ray.direction.set(0,0,-1);
    const hit=bvh.raycastFirst(ray,DoubleSide);
    if(!hit || Math.abs(hit.point.z-point.z)>.025) {bindings.push(null);continue;}
    const ids=[0,1,2].map(k=>bodyIndex.getX(hit.faceIndex*3+k));
    triangle.set(...ids.map(id=>new Vector3().fromBufferAttribute(bodyPosition,id)));
    triangle.getBarycoord(hit.point,bary);
    normal.set(0,0,0);
    ids.forEach((id,k)=>normal.addScaledVector(new Vector3().fromBufferAttribute(body.geometry.attributes.normal,id),bary.getComponent(k)));
    normal.normalize();
    point.copy(hit.point).addScaledVector(normal,clearance).applyMatrix4(fromBody);
    p.setXYZ(i,point.x,point.y,point.z);
    bindings.push({ids,weights:bary.toArray(),normal:normal.toArray()});
  }
  p.needsUpdate=true;
  for(const [name,slot] of Object.entries(brow.morphTargetDictionary || {})) {
    const source=body.geometry.morphAttributes.position?.[body.morphTargetDictionary[name]];
    if(!source)continue;
    const data=new Float32Array(p.count*3);
    bindings.forEach((binding,i)=>{
      if(!binding)return;
      point.set(0,0,0);
      binding.ids.forEach((id,k)=>point.addScaledVector(new Vector3().fromBufferAttribute(source,id),binding.weights[k]));
      // Transform a displacement, excluding translation.
      const origin=new Vector3().applyMatrix4(fromBody);
      point.applyMatrix4(fromBody).sub(origin);data.set(point.toArray(),i*3);
    });
    brow.geometry.morphAttributes.position[slot]=new Float32BufferAttribute(data,3);
  }
  brow.geometry.computeBoundingBox();brow.geometry.computeBoundingSphere();
  const report={method:'skin-triangle-barycentric',bound:bindings.filter(Boolean).length,total:p.count,clearance};
  brow.userData.surfaceBinding=report;
  return report;
}
