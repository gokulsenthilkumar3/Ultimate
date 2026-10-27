import {BufferAttribute,Triangle,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';

const vector=(p,i)=>new Vector3().fromBufferAttribute(p,i);
export function triangleFrame(a,b,c){
  const tangent=b.clone().sub(a),u=tangent.length();tangent.divideScalar(u || 1);
  const normal=new Vector3().crossVectors(tangent,c.clone().sub(a)).normalize();
  const bitangent=new Vector3().crossVectors(normal,tangent),v=Math.abs(c.clone().sub(a).dot(bitangent));
  return {tangent,bitangent,normal,u:Math.max(u,1e-8),v:Math.max(v,1e-8)};
}
export function frameOffset(point,anchor,frame){
  const d=point.clone().sub(anchor);
  return [d.dot(frame.tangent)/frame.u,d.dot(frame.bitangent)/frame.v,d.dot(frame.normal)/Math.sqrt(frame.u*frame.v)];
}

export function bindNativeMeshes(parts,body,cage,coveredPositions) {
  const sources=[body.geometry,cage.geometry].map(geometry=>({geometry,bvh:new MeshBVH(geometry,{indirect:true})}));
  sources.push({geometry:parts[0].geometry,bvh:new MeshBVH(parts[0].geometry,{indirect:true})});
  const report={vertices:0,maximumNeutralResidualMetres:0,bodyBoundVertices:0,cageBoundVertices:0,maximumOffsetMetres:0};
  for(const mesh of parts){
    const geometry=mesh.geometry,p=geometry.attributes.position;
    const ids=new Float32Array(p.count*3),bary=new Float32Array(ids.length),offset=new Float32Array(ids.length),coverage=new Float32Array(ids.length),restPigment=new Float32Array(ids.length),source=new Float32Array(p.count);
    for(let i=0;i<p.count;i++){
      const point=vector(p,i),hits=sources.map(s=>s.bvh.closestPointToPoint(point));
      const which=/Meatus|Foreskin/.test(mesh.name)?1:hits[0].distance<hits[1].distance?0:1,hit=hits[which],g=sources[which].geometry;
      const tri=[0,1,2].map(k=>g.index.getX(hit.faceIndex*3+k));
      const [a,b,c]=tri.map(id=>vector(g.attributes.position,id)),weights=new Triangle(a,b,c).getBarycoord(hit.point,new Vector3());
      if(!weights || !weights.toArray().every(Number.isFinite))throw new Error('Degenerate native binding triangle');
      const anchor=a.clone().multiplyScalar(weights.x).addScaledVector(b,weights.y).addScaledVector(c,weights.z),frame=triangleFrame(a,b,c);
      if(anchor.distanceTo(hit.point)>1e-5)throw new Error('BVH face index does not match original topology');
      const off=frameOffset(point,anchor,frame);
      ids.set(tri,i*3);bary.set(weights.toArray(),i*3);offset.set(off,i*3);source[i]=which;
      const color=g.attributes.color;
      for(let k=0;k<3;k++)restPigment[i*3+k]=tri.reduce((sum,id,corner)=>sum+(color?.getComponent(id,k) ?? 1)*weights.getComponent(corner),0);
      const alternate=coveredPositions.get(mesh.name);
      coverage.set(alternate?frameOffset(new Vector3().fromArray(alternate,i*3),anchor,frame):off,i*3);
      const roundtrip=anchor.clone().addScaledVector(frame.tangent,off[0]*frame.u).addScaledVector(frame.bitangent,off[1]*frame.v).addScaledVector(frame.normal,off[2]*Math.sqrt(frame.u*frame.v));
      report.maximumNeutralResidualMetres=Math.max(report.maximumNeutralResidualMetres,point.distanceTo(roundtrip));
      report.maximumOffsetMetres=Math.max(report.maximumOffsetMetres,point.distanceTo(anchor));
      report[which?'cageBoundVertices':'bodyBoundVertices']++;report.vertices++;
    }
    for(const [name,data,width] of [['_bindtri',ids,3],['_bary',bary,3],['_offset',offset,3],['_coveroffset',coverage,3],['_restpigment',restPigment,3],['_source',source,1]])geometry.setAttribute(name,new BufferAttribute(data,width));
  }
  return report;
}

/** Standard skinning for neutral standalone GLB/DCC posing. The live adapter
 * replaces this approximation with post-skin triangle-frame evaluation.
 */
export function transferNativeSkin(mesh,body,cage,primary){
  const g=mesh.geometry,count=g.attributes.position.count,ids=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    const source=[body.geometry,cage.geometry,primary?.geometry][g.attributes._source.getX(i)],combined=new Map();
    for(let corner=0;corner<3;corner++){
      const id=g.attributes._bindtri.getComponent(i,corner),bary=g.attributes._bary.getComponent(i,corner);
      for(let k=0;k<4;k++){
        const bone=source.attributes.skinIndex.getComponent(id,k),weight=source.attributes.skinWeight.getComponent(id,k)*bary;
        combined.set(bone,(combined.get(bone)||0)+weight);
      }
    }
    const best=[...combined].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((s,[,v])=>s+v,0);
    if(!(sum>0))throw new Error('Native surface has no transferable skin weights');
    best.forEach(([id,weight],k)=>{ids[i*4+k]=id;weights[i*4+k]=weight/sum;});
  }
  g.setAttribute('skinIndex',new BufferAttribute(ids,4));g.setAttribute('skinWeight',new BufferAttribute(weights,4));
}
