import {Box3,BufferAttribute,BufferGeometry,DoubleSide,Ray,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';

const landmarkCache=new WeakMap();
/** Read the sewing pattern's waist opening, rather than guessing its height
 * from a fraction of the body. UV duplicates share the physical weld IDs. */
export function authoredGarmentLandmarks(geometry) {
  if(!geometry?.getAttribute('_garment_coverage'))return null;
  if(landmarkCache.has(geometry))return landmarkCache.get(geometry);
  const coverage=geometry.getAttribute('_garment_coverage'),p=geometry.attributes.position,weld=geometry.getAttribute('_garment_weld'),index=geometry.index;
  let topHem=Infinity,lowerHem=Infinity,waistMax=-Infinity;
  for(let i=0;i<p.count;i++) {
    if(coverage.getX(i)>.9){lowerHem=Math.min(lowerHem,p.getY(i));waistMax=Math.max(waistMax,p.getY(i));}
    if(coverage.getY(i)>.9 && coverage.getZ(i)<.1 && coverage.getW(i)<.1)topHem=Math.min(topHem,p.getY(i));
  }
  const edges=new Map(),heights=new Map(),points=new Map();
  if(weld && index)for(let i=0;i<index.count;i+=3) {
    const vertices=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    if(!vertices.every(v=>coverage.getX(v)>.9))continue;
    for(let k=0;k<3;k++) {
      const a=vertices[k],b=vertices[(k+1)%3],aw=weld.getX(a),bw=weld.getX(b);
      if(aw===bw)continue;
      const key=aw<bw?aw+':'+bw:bw+':'+aw,edge=edges.get(key)||{a:aw,b:bw,count:0};
      edge.count++;edges.set(key,edge);heights.set(aw,p.getY(a));heights.set(bw,p.getY(b));
      points.set(aw,new Vector3().fromBufferAttribute(p,a));points.set(bw,new Vector3().fromBufferAttribute(p,b));
    }
  }
  const adjacent=new Map();
  for(const {a,b,count} of edges.values())if(count===1) {
    if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);
    adjacent.get(a).push(b);adjacent.get(b).push(a);
  }
  const visited=new Set();let waistMin=waistMax,highestOpening=-Infinity,waistPoints=[];
  for(const id of adjacent.keys()) {
    if(visited.has(id))continue;
    const stack=[id],ys=[],ring=[];
    while(stack.length){const next=stack.pop();if(visited.has(next))continue;visited.add(next);ys.push(heights.get(next));ring.push(points.get(next));stack.push(...adjacent.get(next));}
    const mean=ys.reduce((sum,y)=>sum+y,0)/ys.length;
    if(mean>highestOpening){highestOpening=mean;waistMin=Math.min(...ys);waistPoints=ring;}
  }
  const center=new Vector3();for(const point of waistPoints)center.add(point);if(waistPoints.length)center.divideScalar(waistPoints.length);
  const contour=waistPoints.map(point=>({angle:Math.atan2(point.z-center.z,point.x-center.x),height:point.y})).sort((a,b)=>a.angle-b.angle);
  const result={topHem,lowerHem,waistMin,waistMax,center,contour};landmarkCache.set(geometry,result);return result;
}

export function waistHeightAt(landmarks,x,z) {
  const {contour,center}=landmarks;if(!contour.length)return landmarks.waistMax;
  const angle=Math.atan2(z-center.z,x-center.x);let low=0,high=contour.length;
  while(low<high){const mid=(low+high)>>1;if(contour[mid].angle<angle)low=mid+1;else high=mid;}
  const a=contour[(low+contour.length-1)%contour.length],b=contour[low%contour.length];
  const span=(b.angle-a.angle+Math.PI*2)%(Math.PI*2),distance=(angle-a.angle+Math.PI*2)%(Math.PI*2);
  return a.height+(b.height-a.height)*(span>1e-8?distance/span:0);
}

export function prepareWaistContour(geometry,bodyGeometry,sourceGeometry) {
  const landmarks=authoredGarmentLandmarks(sourceGeometry);if(!landmarks)return;
  const bounds=new Box3().setFromBufferAttribute(bodyGeometry.attributes.position),scale=1.92/(bounds.max.y-bounds.min.y),p=geometry.attributes.position;
  const values=new Float32Array(p.count);
  for(let i=0;i<p.count;i++)values[i]=(waistHeightAt(landmarks,p.getX(i),p.getZ(i))-bounds.min.y)*scale;
  geometry.setAttribute('garmentWaistHeight',new BufferAttribute(values,1));
}

/** Keep an untucked upper surface outside the actual lower mesh. The BVH uses
 * owned fitted positions and is refitted only when measurements/morphs change. */
function createLayerSeparation(geometry,landmarks,height) {
  const coverage=geometry.attributes.garmentCoverage,index=geometry.index,weld=geometry.getAttribute('_garment_weld'),indices=[],upper=[],faces=[];
  if(!index || !landmarks)return null;
  for(let i=0;i<index.count;i+=3) {
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    if(ids.every(id=>coverage.getX(id)>.9))indices.push(...ids);
    if(ids.every(id=>coverage.getY(id)>.9))faces.push(ids);
  }
  for(let i=0;i<coverage.count;i++)if(coverage.getY(i)>.9)upper.push(i);
  if(!indices.length || !upper.length)return null;
  const lower=new BufferGeometry();lower.setAttribute('position',geometry.attributes.position);lower.setIndex(indices);
  const bvh=new MeshBVH(lower),ray=new Ray(),point=new Vector3(),clearance=height*.001;
  const penetration=position=> {
    ray.origin.set(landmarks.center.x,position.y,landmarks.center.z);ray.direction.copy(position).sub(ray.origin);
    const distance=ray.direction.length();if(distance<1e-8)return 0;ray.direction.divideScalar(distance);
    const hit=bvh.raycast(ray,DoubleSide).reduce((outer,next)=>!outer || next.distance>outer.distance?next:outer,null);
    return hit?Math.max(0,hit.distance+clearance-distance):0;
  };
  return {update:()=> {
    bvh.refit();const position=geometry.attributes.position;
    let maximum=-Infinity;for(const id of indices)maximum=Math.max(maximum,position.getY(id));
    for(const id of upper) {
      point.fromBufferAttribute(position,id);if(point.y>maximum+clearance)continue;
      const depth=penetration(point);
      if(depth){point.addScaledVector(ray.direction,depth);position.setXYZ(id,point.x,point.y,point.z);}
    }
    // A triangle can intersect trousers between otherwise clear vertices.
    // Resolve its centre as well, sharing movement across UV seam duplicates.
    for(let pass=0;pass<3;pass++) {
      const moves=new Map();
      for(const ids of faces) {
        const y=ids.reduce((sum,id)=>sum+position.getY(id),0)/3;if(y>maximum+clearance)continue;
        point.set(ids.reduce((sum,id)=>sum+position.getX(id),0)/3,y,ids.reduce((sum,id)=>sum+position.getZ(id),0)/3);
        // A face already outside the trousers needs no further solver pass;
        // retain the vertex clearance without chasing sub-clearance gaps.
        const depth=penetration(point);if(depth<=clearance)continue;
        for(const id of ids){const key=weld?weld.getX(id):id;moves.set(key,Math.max(moves.get(key)||0,depth));}
      }
      if(!moves.size)break;
      for(const id of upper) {
        const depth=moves.get(weld?weld.getX(id):id);if(!depth)continue;
        point.fromBufferAttribute(position,id);ray.direction.set(point.x-landmarks.center.x,0,point.z-landmarks.center.z).normalize();
        point.addScaledVector(ray.direction,depth);position.setXYZ(id,point.x,point.y,point.z);
      }
    }
  },dispose:()=>lower.dispose()};
}

/** Owned, independently fitted garment topology. Only the binding samples are
 * shared with the body; no body triangles are repainted as clothing. Skinning
 * handles pose, while these surface bindings follow all active body morphs. */
export function createAuthoredGarment(body,source,options={}) {
  const bindings=source?.geometry?.getAttribute('_body_indices');
  const sourceGeometry=source?.geometry,bodyGeometry=body?.geometry;
  if(!bindings || source.userData.bodyVertexCount!==bodyGeometry?.attributes.position.count) return null;
  const geometry=sourceGeometry.clone(),rest=sourceGeometry.attributes.position;
  const bary=geometry.getAttribute('_body_bary'),anchors=geometry.getAttribute('_body_anchor');
  geometry.setAttribute('garmentCoverage',geometry.getAttribute('_garment_coverage'));
  const bounds=new Box3().setFromBufferAttribute(bodyGeometry.attributes.position),height=bounds.max.y-bounds.min.y,scale=1.92/height;
  const coordinates=new Float32Array(rest.count*3);
  for(let i=0;i<rest.count;i++) {coordinates[i*3]=rest.getX(i)*scale;coordinates[i*3+1]=(rest.getY(i)-bounds.min.y)*scale;coordinates[i*3+2]=rest.getZ(i)*scale;}
  geometry.setAttribute('garmentCoordinates',new BufferAttribute(coordinates,3));
  prepareWaistContour(geometry,bodyGeometry,sourceGeometry);
  const weld=geometry.getAttribute('_garment_weld'),groups=new Map();
  if(weld)for(let i=0;i<weld.count;i++){const id=weld.getX(i);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
  const seams=[...groups.values()].filter(group=>group.length>1);
  const evaluated=new Map(),point=new Vector3(),delta=new Vector3(),normal=new Vector3();
  const ease=(Number(options.easeCm) || 0)*height/175;
  const nativeFit={fitted:.65,regular:1,relaxed:1.6}[options.fit] || 1;
  const length=(Number(options.hemLength)||100)/100;
  const layers=createLayerSeparation(geometry,authoredGarmentLandmarks(sourceGeometry),height);
  let previous='';
  const update=()=> {
    const influences=body.morphTargetInfluences || [];
    const signature=bodyGeometry.attributes.position.version+':'+influences.join(',');
    if(signature===previous) return;previous=signature;evaluated.clear();
    const active=Array.from(influences).flatMap((weight,i)=>weight && bodyGeometry.morphAttributes.position?.[i] ? [[weight,bodyGeometry.morphAttributes.position[i]]] : []);
    const vertex=id=> {
      if(!evaluated.has(id)) {
        const p=new Vector3().fromBufferAttribute(bodyGeometry.attributes.position,id);
        for(const [weight,morph] of active) {point.fromBufferAttribute(morph,id);if(!bodyGeometry.morphTargetsRelative)point.sub(new Vector3().fromBufferAttribute(bodyGeometry.attributes.position,id));p.addScaledVector(point,weight);}
        evaluated.set(id,p);
      }
      return evaluated.get(id);
    };
    const position=geometry.attributes.position;
    for(let i=0;i<rest.count;i++) {
      delta.set(0,0,0);
      for(let k=0;k<3;k++) delta.addScaledVector(vertex(bindings.getComponent(i,k)),bary.getComponent(i,k));
      delta.sub(new Vector3().fromBufferAttribute(anchors,i));
      point.fromBufferAttribute(rest,i).add(delta);
      // Fit scales the authored pattern's native clearance. Added ease remains
      // an independent centimetre offset rather than changing with the fit menu.
      delta.fromBufferAttribute(rest,i).sub(new Vector3().fromBufferAttribute(anchors,i));
      point.addScaledVector(delta,nativeFit-1);
      normal.fromBufferAttribute(sourceGeometry.attributes.normal,i);
      point.addScaledVector(normal,ease);
      // Extend lower hems in garment space. Authored folds and cuff construction
      // remain attached; this is an ease/length adjustment, not cloth physics.
      if(geometry.attributes.garmentCoverage.getX(i)>.5) {
        const y=coordinates[i*3+1],blend=Math.max(0,Math.min(1,(.95-y)/.8));
        point.y-=(length-1)*height*.14*blend;
        point.y+=(Number(options.waistRiseCm)||0)*height/175*Math.max(0,Math.min(1,(y-.72)/.25));
      }
      point.toArray(position.array,i*3);
    }
    layers?.update();position.needsUpdate=true;geometry.computeVertexNormals();
    for(const group of seams) {
      normal.set(0,0,0);for(const i of group)normal.add(point.fromBufferAttribute(geometry.attributes.normal,i));normal.normalize();
      for(const i of group)geometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);
    }
    geometry.computeBoundingSphere();
  };
  update();
  return {geometry,update,authored:true,dispose:()=>{layers?.dispose();geometry.dispose();}};
}

export function publishGarmentEvidence(canvas,preset,shell,variant) {
  canvas.dataset.wardrobeSource=shell?.authored?'authored-garment':shell?'body-shell':'none';
  canvas.dataset.wardrobePreset=preset;
  canvas.dataset.wardrobeStyle=variant || '';
  canvas.dataset.wardrobeVertices=String(shell?.geometry.attributes.position.count || 0);
}
