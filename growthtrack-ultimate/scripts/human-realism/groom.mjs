import {Box3,BufferAttribute,BufferGeometry,Triangle,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {frameOffset,triangleFrame} from './native-binding.mjs';

/** Curved, tapered short hair rooted on actual scalp triangles. Morphs carry
 * the authored offsets in the triangle frame instead of stretching a wig.
 */
export function buildGroom(body,eyes,lod){
  const geometry=body.geometry,p=geometry.attributes.position,index=geometry.index;
  const bvh=new MeshBVH(geometry,{indirect:true}),box=new Box3().setFromBufferAttribute(p);
  const eyeBox=new Box3().setFromBufferAttribute(eyes.geometry.attributes.position),eyeCentre=eyeBox.getCenter(new Vector3());
  const center=new Vector3(0,eyeCentre.y+.015,eyeCentre.z-.067),ry=box.max.y-center.y;
  const count=lod==='hero'?640:240,segments=lod==='hero'?6:4,candidates=[];
  const v=(id,target=new Vector3())=>target.fromBufferAttribute(p,id);
  for(let i=0;i<count*6;i++){
    const y=1-2*(i+.5)/(count*6),r=Math.sqrt(1-y*y),angle=i*2.399963229728653;
    const query=new Vector3(center.x+.083*r*Math.cos(angle),center.y+ry*y,center.z+.09*r*Math.sin(angle));
    const front=Math.max(0,Math.min(1,(query.z-center.z+.015)/.08));
    const hairline=box.max.y-(.082*(1-front)+.029*front)*(box.max.y-box.min.y);
    if(query.y<hairline)continue;
    const hit=bvh.closestPointToPoint(query);
    if(!hit || hit.distance>.025 || hit.point.y<hairline-.002)continue;
    const ids=[0,1,2].map(k=>index.getX(hit.faceIndex*3+k)),points=ids.map(id=>v(id)),tri=new Triangle(...points);
    const bary=tri.getBarycoord(hit.point,new Vector3()),normal=tri.getNormal(new Vector3());
    if(normal.dot(hit.point.clone().sub(center))<0)normal.negate();
    candidates.push({point:hit.point.clone(),ids,points,bary,normal});
  }
  if(candidates.length<count)throw new Error('Insufficient supported scalp roots');
  const positions=[],uvs=[],indices=[],bindings=[];
  for(let s=0;s<count;s++){
    const root=candidates[Math.floor(s*candidates.length/count)],{point,normal,points}=root;
    const frame=triangleFrame(...points),flow=new Vector3(.4,-.26,-1);
    flow.addScaledVector(normal,-flow.dot(normal)).normalize();
    const side=new Vector3().crossVectors(flow,normal).normalize(),top=Math.max(0,normal.y);
    const random=(Math.sin(s*127.1+43.7)*43758.5453)%1,phase=s*2.39996;
    const length=(.010+.018*top)*(1+random*.18),width=(lod==='hero'?.0019:.0028)*(1+random*.15);
    for(let row=0;row<=segments;row++){
      const t=row/segments,lift=.0008+(.003+.004*top)*Math.sin(Math.PI*t)*Math.exp(-t*.7);
      const c=point.clone().addScaledVector(flow,length*t).addScaledVector(normal,lift).addScaledVector(side,.0007*Math.sin(t*Math.PI*1.5+phase)*t);
      for(const sign of [-1,1]){
        const current=c.clone().addScaledVector(side,sign*width*(.03+.97*(1-t)**.6)*.5);
        const id=positions.length/3;positions.push(...current);uvs.push(sign<0?0:1,t);
        bindings.push({root,offset:frameOffset(current,point,frame)});
        if(row<segments && sign<0)indices.push(id,id+1,id+3,id,id+3,id+2);
      }
    }
  }
  const result=new BufferGeometry();result.setAttribute('position',new BufferAttribute(Float32Array.from(positions),3));
  result.setAttribute('uv',new BufferAttribute(Float32Array.from(uvs),2));result.setIndex(indices);result.computeVertexNormals();
  result.morphTargetsRelative=true;
  result.morphAttributes.position=geometry.morphAttributes.position.map(delta=>{
    const data=new Float32Array(positions.length);
    for(let i=0;i<bindings.length;i++){
      const {root,offset}=bindings[i],points=root.ids.map(id=>v(id).add(new Vector3().fromBufferAttribute(delta,id))),frame=triangleFrame(...points);
      const anchor=points[0].clone().multiplyScalar(root.bary.x).addScaledVector(points[1],root.bary.y).addScaledVector(points[2],root.bary.z);
      anchor.addScaledVector(frame.tangent,offset[0]*frame.u).addScaledVector(frame.bitangent,offset[1]*frame.v).addScaledVector(frame.normal,offset[2]*Math.sqrt(frame.u*frame.v));
      data[i*3]=anchor.x-positions[i*3];data[i*3+1]=anchor.y-positions[i*3+1];data[i*3+2]=anchor.z-positions[i*3+2];
    }
    for(let i=0;i<data.length;i++)if(Math.abs(data[i])<1e-7)data[i]=0;
    return new BufferAttribute(data,3);
  });
  return {geometry:result,report:{style:'short-swept-ribbons',roots:count,segments,vertices:positions.length/3,triangles:indices.length/3,rootMethod:'actual-scalp-triangle-frames'}};
}
