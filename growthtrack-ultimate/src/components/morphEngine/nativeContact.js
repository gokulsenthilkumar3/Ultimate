import {BufferAttribute,BufferGeometry,Matrix4,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';

function collider(mesh,index){
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3),3));
  geometry.setIndex(Array.from(index.array));
  let bvh,previousBones=null,previousShape=null;
  const verticesByBone=new Map(),ids=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  if(ids && weights)for(let i=0;i<ids.count;i++)for(let k=0;k<4;k++)if(weights.getComponent(i,k)>0){
    const bone=ids.getComponent(i,k);if(!verticesByBone.has(bone))verticesByBone.set(bone,new Set());verticesByBone.get(bone).add(i);
  }
  return {geometry,update(){
    const p=geometry.attributes.position,point=new Vector3();
    const matrices=mesh.skeleton?.boneMatrices,shape=[mesh.geometry.attributes.position.version,...(mesh.morphTargetInfluences || [])];
    let dirty;
    if(previousBones && previousShape && shape.every((v,i)=>v===previousShape[i])){
      dirty=new Set();
      for(const [bone,vertices] of verticesByBone)if(Array.from({length:16},(_,k)=>bone*16+k).some(i=>matrices[i]!==previousBones[i]))for(const id of vertices)dirty.add(id);
    }
    const indices=dirty || Array.from({length:p.count},(_,i)=>i);
    for(const i of indices)mesh.getVertexPosition(i,point).toArray(p.array,i*3);
    previousBones=matrices?.slice();previousShape=shape;
    p.needsUpdate=true;
    if(bvh)bvh.refit();else bvh=new MeshBVH(geometry,{indirect:true});
  },get bvh(){return bvh;},dispose(){geometry.dispose();}};
}

/** Quasistatic soft contact on the rendered surface, after skinning. Contact
 * changes are remeasured by the surface fitter; no hidden-cage measurements
 * are used to certify a compressed or displaced rendered mesh. */
export function createNativeContact(mesh,body,bodyIndex){
  const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv;
  const skin=collider(body,bodyIndex),sacGeometry=new BufferGeometry(),sacIds=[];
  sacGeometry.setAttribute('position',p.clone());
  for(let i=0;i<g.index.count;i+=3){const tri=[0,1,2].map(k=>g.index.getX(i+k));if(tri.every(id=>uv.getY(id)>=.5))sacIds.push(...tri);}
  sacGeometry.setIndex(sacIds);let sacBVH,bodySignature=null;
  const point=new Vector3(),identity=new Matrix4();
  const freeGeometry=select=>{
    const geometry=new BufferGeometry(),ids=[];geometry.setAttribute('position',p.clone());
    for(let i=0;i<g.index.count;i+=3){const tri=[0,1,2].map(k=>g.index.getX(i+k));if(tri.every(select))ids.push(...tri);}
    geometry.setIndex(ids);return geometry;
  };
  const freeSacGeometry=freeGeometry(id=>uv.getY(id)>.64),freeShaftGeometry=freeGeometry(id=>uv.getY(id)<.5 && (uv.getY(id)-.02)/.46>.12);
  let freeSacBVH,freeShaftBVH,lastSolution=null;
  const crosses=(first,second,matrix=identity)=>first.bvhcast(second,matrix,{intersectsTriangles:(a,b)=>a.intersectsTriangle(b)});
  return {solve(){
    const signature=[body.geometry.attributes.position.version,...(body.morphTargetInfluences || []),...(body.skeleton?.boneMatrices || [])];
    if(!bodySignature || signature.some((v,i)=>v!==bodySignature[i])){skin.update();bodySignature=signature;}
    const original=p.array.slice(),sac=[],shaft=[],root=new Vector3();
    let rootCount=0;
    for(let i=0;i<p.count;i++){
      const v=uv.getY(i),t=(v-.02)/.46;
      if(v>=.5)sac.push(i);
      else {shaft.push(i);if(Math.abs(t)<.0001){root.add(new Vector3().fromBufferAttribute(p,i));rootCount++;}}
    }
    root.divideScalar(rootCount || 1);
    // Use the posed pelvis frame, including roll/twist, for displacement.
    const cage=mesh.nativeGuideSource,anchor=cage?.userData.layout.midRing*cage?.userData.layout.segments;
    const origin=new Vector3(),forward=new Vector3(0,0,1),lateral=new Vector3(1,0,0);
    if(cage?.isSkinnedMesh){cage.applyBoneTransform(anchor,origin);cage.applyBoneTransform(anchor,forward);cage.applyBoneTransform(anchor,lateral);forward.sub(origin).normalize();lateral.sub(origin).normalize();}
    let iterations=0,sacAdvanceMetres=0,shaftLiftRadians=0,shaftAdvanceMetres=0;
    for(const geometry of [freeSacGeometry,freeShaftGeometry,sacGeometry])geometry.attributes.position.array.set(original);
    const sacMatrix=new Matrix4(),sacInverse=new Matrix4(),shaftMatrix=new Matrix4(),relativeMatrix=new Matrix4(),shift=new Vector3();
    if(freeSacBVH)freeSacBVH.refit();else freeSacBVH=new MeshBVH(freeSacGeometry,{indirect:true});
    // Preserve the authored sac and section contours. Move its bulk anteriorly
    // and let the exact boundary web connect it to the fixed pelvic opening.
    while(sacAdvanceMetres<.08 && crosses(skin.bvh,freeSacBVH,sacMatrix)){
      sacAdvanceMetres+=.002;
      sacMatrix.makeTranslation(forward.x*sacAdvanceMetres,forward.y*sacAdvanceMetres,forward.z*sacAdvanceMetres);
      iterations++;
    }
    sacInverse.copy(sacMatrix).invert();
    if(sacBVH)sacBVH.refit();else sacBVH=new MeshBVH(sacGeometry,{indirect:true});
    if(freeShaftBVH)freeShaftBVH.refit();else freeShaftBVH=new MeshBVH(freeShaftGeometry,{indirect:true});
    // A supported resting shaft rotates as a whole around its root rather
    // than collapsing individual vertices into the sac surface.
    const placeShaft=(advance,angle)=>{
      shaftAdvanceMetres=advance;shaftLiftRadians=angle;
      shaftMatrix.makeRotationAxis(lateral,-angle);
      shift.copy(root).sub(point.copy(root).applyMatrix4(shaftMatrix)).addScaledVector(forward,advance);
      shaftMatrix.setPosition(shift);iterations++;
    };
    const shaftCrosses=()=>crosses(sacBVH,freeShaftBVH,relativeMatrix.multiplyMatrices(sacInverse,shaftMatrix))||crosses(skin.bvh,freeShaftBVH,shaftMatrix);
    let clear=!shaftCrosses();
    if(!clear && lastSolution){
      const angle=lastSolution.angle,advance=Math.max(0,lastSolution.advance-.001);
      placeShaft(advance,Math.sign(angle)*Math.max(0,Math.abs(angle)-Math.PI/180));
      clear=!shaftCrosses();
      if(!clear){placeShaft(lastSolution.advance,angle);clear=!shaftCrosses();}
    }
    for(let advance=0;!clear && advance<=.04001;advance+=.002){
      for(let degree=advance===0?2:0;degree<=86 && !clear;degree+=2){
        for(const sign of [1,-1]){
          const angle=degree*Math.PI/180;placeShaft(advance,angle*sign);
          if(shaftCrosses())continue;
          let low=Math.max(0,angle-2*Math.PI/180),high=angle;
          for(let step=0;step<6;step++){const mid=(low+high)/2;placeShaft(advance,mid*sign);if(shaftCrosses())low=mid;else high=mid;}
          placeShaft(advance,(high+.05*Math.PI/180)*sign);clear=true;break;
        }
      }
    }
    for(const i of sac){point.fromArray(original,i*3).applyMatrix4(sacMatrix);p.setXYZ(i,point.x,point.y,point.z);}
    for(const i of shaft){point.fromArray(original,i*3).applyMatrix4(shaftMatrix);p.setXYZ(i,point.x,point.y,point.z);}
    mesh.nativeShaftContactMatrix=shaftMatrix.clone();
    let maximumCorrectionMetres=0;const correctedVertices=new Set();
    for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i)-original[i*3],p.getY(i)-original[i*3+1],p.getZ(i)-original[i*3+2])>1e-8)correctedVertices.add(i);
    for(const i of correctedVertices)maximumCorrectionMetres=Math.max(maximumCorrectionMetres,Math.hypot(p.getX(i)-original[i*3],p.getY(i)-original[i*3+1],p.getZ(i)-original[i*3+2]));
    p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
    const evidence={method:'posed-triangle-supported-contact',iterations,correctedVertices:correctedVertices.size,maximumCorrectionMetres,sacAdvanceMetres,shaftAdvanceMetres,shaftLiftDegrees:shaftLiftRadians*180/Math.PI,
      sacDisplacement:forward.clone().multiplyScalar(sacAdvanceMetres).toArray(),
      unresolved:!clear||shaftCrosses()||crosses(skin.bvh,freeSacBVH,sacMatrix),scope:'Actual triangle crossings outside the authored attachment collar; quasistatic support, not tissue dynamics.'};
    if(!evidence.unresolved)lastSolution={angle:shaftLiftRadians,advance:shaftAdvanceMetres};
    mesh.userData.contactEvidence=evidence;return evidence;
  },reset(){lastSolution=null;},dispose(){skin.dispose();sacGeometry.dispose();freeSacGeometry.dispose();freeShaftGeometry.dispose();}};
}
