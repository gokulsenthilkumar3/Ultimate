import {BufferGeometry,Float32BufferAttribute,DoubleSide,Ray,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {transformSacPoint} from './nativeSacFit';

/** Padded ellipsoid samples checked against the actual posed, contact-adjusted
 * sac. This is a finite containment sample, not a clinical internal model. */
export function measureNativeGuideFit(mesh,cage,control,contact,body){
  if(control?.scrotumFit?.mode!=='guides')return null;
  const geometry=mesh.geometry,p=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index,unit=control.unit,heightScale=control.heightScale || 1;
  const triangles=[];const physical=point=>{point.y*=heightScale;return point;};
  for(let i=0;i<index.count;i+=3){const ids=[0,1,2].map(k=>index.getX(i+k));triangles.push(ids.map(id=>physical(new Vector3().fromBufferAttribute(p,id))));}
  for(const surface of [body,...mesh.children.filter(n=>n.userData.pelvicTransition)])if(surface){
    const vertices=Array.from({length:surface.geometry.attributes.position.count},(_,i)=>physical(surface.getVertexPosition(i,new Vector3()))),indices=surface.geometry.index;
    for(let i=0;i<indices.count;i+=3)triangles.push([0,1,2].map(k=>vertices[indices.getX(i+k)]));
  }
  const center=new Vector3();let n=0;
  for(let i=0;i<p.count;i++)if(uv.getY(i)>=.5){center.add(physical(new Vector3().fromBufferAttribute(p,i)));n++;}
  center.divideScalar(n);
  const boundaryGeometry=new BufferGeometry();boundaryGeometry.setAttribute('position',new Float32BufferAttribute(triangles.flatMap(tri=>tri.flatMap(point=>point.toArray())),3));
  const boundaryBVH=new MeshBVH(boundaryGeometry);
  const field=[];
  for(let i=0;i<cage.geometry.attributes.position.count;i++)if(cage.geometry.attributes.uv.getY(i)>=.5){
    const rest=new Vector3().fromBufferAttribute(cage.geometry.attributes.position,i),posed=cage.getVertexPosition(i,new Vector3());
    field.push({rest,delta:posed.sub(rest)});
  }
  const followField=point=>{
    const closest=[];
    for(const record of field){const distance=point.distanceToSquared(record.rest);if(closest.length<8 || distance<closest.at(-1).distance){closest.push({...record,distance});closest.sort((a,b)=>a.distance-b.distance);closest.length=Math.min(8,closest.length);}}
    const total=closest.reduce((s,r)=>s+1/Math.max(1e-8,r.distance),0),delta=new Vector3();
    for(const record of closest)delta.addScaledVector(record.delta,1/Math.max(1e-8,record.distance)/total);
    return point.add(delta);
  };
  const sacShift=new Vector3().fromArray(contact?.sacDisplacement || [0,0,0]),padding=control.scrotumFit.paddingCm;
  let maxOutsideCm=0,unresolvedRays=0,sampleCount=0;
  for(const guide of control.guides)for(let sample=0;sample<162;sample++){
    const y=1-2*(sample+.5)/162,angle=sample*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);
    const [length,width,depth]=guide.dimensions;
    const point=new Vector3(r*Math.cos(angle)*(width/2+padding)*unit,y*(length/2+padding)*unit,r*Math.sin(angle)*(depth/2+padding)*unit);
    point.applyAxisAngle(new Vector3(0,0,1),(guide.rotationDeg || 0)*Math.PI/180);point.y/=heightScale;
    point.add(new Vector3().fromArray(guide.position));followField(point);transformSacPoint(point,mesh.userData.sacSurfaceTransform);point.add(sacShift);physical(point);
    const direction=point.clone().sub(center),distance=direction.length();direction.normalize();
    const ray=new Ray(center,direction),boundary=boundaryBVH.raycastFirst(ray,DoubleSide)?.distance ?? Infinity;
    if(!Number.isFinite(boundary))unresolvedRays++;else maxOutsideCm=Math.max(maxOutsideCm,(distance-boundary)/unit);
    sampleCount++;
  }
  boundaryGeometry.dispose();
  return {...control.scrotumFit,space:'posed-contact-adjusted',sampleSurface:'rendered-native-surface',sampleCount,maxOutsideCm,unresolvedRays,
    status:maxOutsideCm<=.1 && !unresolvedRays?'sampled-fit':'attachment-limited'};
}
