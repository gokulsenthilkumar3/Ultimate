import {Box3,BufferGeometry,DoubleSide,Float32BufferAttribute,Mesh,Raycaster,Triangle,Vector3} from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';

function projectionMesh(body){
  const g=body.geometry.clone();g.morphAttributes={};
  g.boundsTree=new MeshBVH(g,{indirect:true});
  const mesh=new Mesh(g,body.material);mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld(true);return mesh;
}

function geometry(points,triangles){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(points,3));g.setIndex(triangles);g.computeVertexNormals();return g;}
function closestAnchor(proxy,target){
  const hit=proxy.geometry.boundsTree.closestPointToPoint(target);
  if(!hit)throw new Error('Surface projection found no body triangle');
  const index=proxy.geometry.index,offset=hit.faceIndex*3;
  return {point:hit.point,face:{a:index.getX(offset),b:index.getX(offset+1),c:index.getX(offset+2)}};
}
function bodyBinding(body,positions,anchors){
  const index=body.geometry.index,pos=body.geometry.attributes.position,ids=body.geometry.attributes.skinIndex,weights=body.geometry.attributes.skinWeight;
  const skinIds=[],skinWeights=[],morphs=body.geometry.morphAttributes.position.map(()=>[]),p=new Vector3(),a=new Vector3(),b=new Vector3(),c=new Vector3(),bary=new Vector3();
  for(let v=0;v<positions.length/3;v++){
    const anchor=anchors[v],vertices=anchor?.face?[anchor.face.a,anchor.face.b,anchor.face.c]:null;
    let samples;
    if(vertices){vertices.forEach((id,k)=>[a,b,c][k].fromBufferAttribute(pos,id));Triangle.getBarycoord(anchor.point,a,b,c,bary);samples=vertices.map((id,k)=>({id,weight:bary.getComponent(k)}));}
    else{
      p.fromArray(positions,v*3);let nearest=0,distance=Infinity;
      for(let i=0;i<pos.count;i++){const d=p.distanceToSquared(a.fromBufferAttribute(pos,i));if(d<distance){nearest=i;distance=d;}}
      samples=[{id:nearest,weight:1}];
    }
    const influence=new Map();for(const sample of samples)for(let k=0;k<4;k++){const id=ids.getComponent(sample.id,k);influence.set(id,(influence.get(id)||0)+sample.weight*weights.getComponent(sample.id,k));}
    const sorted=[...influence].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=sorted.reduce((s,[,w])=>s+w,0);
    for(let k=0;k<4;k++){skinIds.push(sorted[k]?.[0] || 0);skinWeights.push(sorted[k]?sorted[k][1]/sum:0);}
    for(let m=0;m<morphs.length;m++){
      const delta=new Vector3();for(const sample of samples)delta.addScaledVector(a.fromBufferAttribute(body.geometry.morphAttributes.position[m],sample.id),sample.weight);
      morphs[m].push(...delta.toArray());
    }
  }
  return {skinIds:Uint16Array.from(skinIds),skinWeights:Float32Array.from(skinWeights),morphs:morphs.map(m=>Float32Array.from(m))};
}

export function nailPart(body,groups,config){
  body.material.side=DoubleSide;body.updateMatrixWorld(true);const proxy=projectionMesh(body),ray=new Raycaster(),points=[],triangles=[],anchors=[],reports=[];
  for(const group of groups){
    const ends=group.nailPoints || group.points.slice(-2),start=points.length/3,last=ends[1],previous=ends[0],length=last.distanceTo(previous),axis=last.clone().sub(previous).normalize(),normal=group.palm.clone().negate();
    normal.addScaledVector(axis,-normal.dot(axis)).normalize();
    const side=new Vector3().crossVectors(axis,normal).normalize();
    const center=previous.clone().lerp(last,.58),halfLength=length*config.lengthRatio,halfWidth=length*config.widthRatio,segments=config.segments,rings=config.rings;let missed=0,maxFallbackDistance=0;
    for(let ring=0;ring<=rings;ring++)for(let step=0;step<segments;step++){
      const radius=ring/rings,angle=step/segments*Math.PI*2,target=center.clone().addScaledVector(axis,Math.cos(angle)*halfLength*radius).addScaledVector(side,Math.sin(angle)*halfWidth*radius);
      ray.set(target.clone().addScaledVector(normal,length*2),normal.clone().negate());ray.near=0;ray.far=length*4;
      let hit=ray.intersectObject(proxy,false)[0];if(!hit){missed++;hit=closestAnchor(proxy,target);maxFallbackDistance=Math.max(maxFallbackDistance,hit.point.distanceTo(target));}
      const point=hit.point.clone().addScaledVector(normal,length*config.offsetRatio);
      points.push(...point.toArray());anchors.push(hit);
    }
    for(let ring=0;ring<rings;ring++)for(let step=0;step<segments;step++){
      const a=start+ring*segments+step,b=start+ring*segments+(step+1)%segments,c=a+segments,d=b+segments;
      if(ring===0)triangles.push(a,d,c);else triangles.push(a,b,c,b,d,c);
    }
    reports.push({id:group.id,vertices:(rings+1)*segments,rayMisses:missed,closestSurfaceFallbacks:missed,maxFallbackDistance});
  }
  const g=geometry(points,triangles),binding=bodyBinding(body,points,anchors);proxy.geometry.dispose();
  return {name:'GrowthTrackNails',geometry:g,...binding,reports};
}

export function eyeParts(eyes,body,lids,config){
  const positions=eyes.geometry.attributes.position,boxes=[new Box3(),new Box3()],p=new Vector3();for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i);boxes[p.x<0?0:1].expandByPoint(p);}
  const points=[],triangles=[],morphs=eyes.geometry.morphAttributes.position.map(()=>[]);
  for(const [which,box] of boxes.entries()){
    const size=box.getSize(new Vector3()),center=box.getCenter(new Vector3()),radius=Math.min(size.x,size.y)/2,capRadius=radius*config.cornea.radiusRatio,start=points.length/3;
    const nearestIndices=[];
    for(let ring=0;ring<=config.cornea.rings;ring++)for(let step=0;step<config.cornea.segments;step++){
      const t=ring/config.cornea.rings,angle=step/config.cornea.segments*Math.PI*2,r=capRadius*t;
      p.set(center.x+r*Math.cos(angle),center.y+r*Math.sin(angle),box.max.z-radius+Math.sqrt(Math.max(0,radius*radius-r*r))+radius*(config.cornea.clearanceRatio+config.cornea.bulgeRatio*(1-t*t)));
      points.push(...p.toArray());let nearest=0,best=Infinity;
      for(let i=0;i<positions.count;i++)if((positions.getX(i)<0?0:1)===which){const d=p.distanceToSquared(new Vector3().fromBufferAttribute(positions,i));if(d<best){best=d;nearest=i;}}
      nearestIndices.push(nearest);
    }
    for(let ring=0;ring<config.cornea.rings;ring++)for(let step=0;step<config.cornea.segments;step++){
      const a=start+ring*config.cornea.segments+step,b=start+ring*config.cornea.segments+(step+1)%config.cornea.segments,c=a+config.cornea.segments,d=b+config.cornea.segments;
      if(ring===0)triangles.push(a,c,d);else triangles.push(a,c,b,b,c,d);
    }
    for(let m=0;m<morphs.length;m++)for(const index of nearestIndices)morphs[m].push(eyes.geometry.morphAttributes.position[m].getX(index),eyes.geometry.morphAttributes.position[m].getY(index),eyes.geometry.morphAttributes.position[m].getZ(index));
  }
  const cornea={name:'GrowthTrackCornea',geometry:geometry(points,triangles),morphs:morphs.map(m=>Float32Array.from(m)),parent:eyes};
  const wetPoints=[],wetTriangles=[],anchors=[];body.material.side=DoubleSide;const proxy=projectionMesh(body),ray=new Raycaster();
  for(const lid of lids.landmarks){
    const start=wetPoints.length/3,width=lid.width*config.tearline.widthRatio;
    for(let step=0;step<=config.tearline.segments;step++)for(let row=0;row<2;row++){
      const t=step/config.tearline.segments*2-1;
      const target=new Vector3(lid.x+lid.width*.82*t,lid.lower+(lid.upper-lid.lower)*.28*t*t-width*(row+.5),lid.front);
      ray.set(target.clone().add(new Vector3(0,0,lid.width)),new Vector3(0,0,-1));ray.near=0;ray.far=lid.width*2;
      // Near the curved aperture a forward ray can miss the lid entirely.
      // Keep every strip vertex on an actual triangle, with the same
      // barycentric skin/morph transfer used by the projected nail patches.
      const hit=ray.intersectObject(proxy,false)[0] || closestAnchor(proxy,target),point=hit.point.clone();point.z+=lid.width*config.tearline.clearanceRatio;
      wetPoints.push(...point.toArray());anchors.push(hit);
    }
    for(let i=0;i<config.tearline.segments;i++){const a=start+i*2;wetTriangles.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  proxy.geometry.dispose();return [cornea,{name:'GrowthTrackTearline',geometry:geometry(wetPoints,wetTriangles),...bodyBinding(body,wetPoints,anchors)}];
}
