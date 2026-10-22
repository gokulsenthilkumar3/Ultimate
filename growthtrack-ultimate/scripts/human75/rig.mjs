import {Bone,Float32BufferAttribute,Line3,Matrix4,Uint16BufferAttribute,Vector3} from 'three';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function extendRig(scene,source,config){
  const {skeleton,body}=scene,original=skeleton.bones.length,byName=Object.fromEntries(skeleton.bones.map(b=>[b.name,b]));
  const frame=skeleton.bones[0].parent,point=name=>byName[name].getWorldPosition(new Vector3()),groups=[];
  function add(name,parent,world,extras={}){
    const bone=new Bone();bone.name=name;byName[parent].add(bone);bone.position.copy(world).sub(point(parent));bone.userData={poseKey:name,...extras};
    byName[name]=bone;skeleton.bones.push(bone);skeleton.boneInverses.push(new Matrix4().makeTranslation(-world.x,-world.y,-world.z));frame.updateMatrixWorld(true);return bone;
  }
  const neck1=point('Neck').lerp(point('Head'),.5);add('Neck1','Neck',neck1);
  const head=byName.Head,headWorld=point('Head');byName.Neck1.add(head);head.position.copy(headWorld).sub(neck1);
  add('Jaw','Head',source['joint-jaw']);
  for(const [i,name] of ['Tongue0','Tongue1','Tongue2'].entries())add(name,i?'Tongue'+(i-1):'Jaw',source[`joint-tongue-${i+1}`]);
  for(const side of ['Left','Right']){
    const key=side==='Left'?'l':'r';add(`${side}Eye`,'Head',source[`joint-${key}-eye`]);
    for(const [upper,lower] of [['UpperArm','ForeArm'],['ForeArm','Hand'],['UpLeg','Leg'],['Leg','Foot']]){
      const world=point(side+upper).lerp(point(side+lower),.5),axis=point(side+lower).sub(point(side+upper)).normalize();
      add(side+upper+'Twist',side+upper,world,{twistBinding:{driver:side+lower,axis:axis.toArray(),fraction:.5}});
    }
    const roots=config.digits.fingers.map((_,i)=>source[`joint-${key}-finger-${i+1}-1`]);
    const long=source[`joint-${key}-finger-3-4`].clone().sub(point(side+'Hand')).normalize();
    const across=roots[4].clone().sub(roots[1]),palm=new Vector3().crossVectors(long,across).normalize();if(palm.z<0)palm.negate();
    for(const [i,digit] of config.digits.fingers.entries()){
      const points=[1,2,3,4].map(j=>source[`joint-${key}-finger-${i+1}-${j}`]);
      const ids=[];
      for(let j=0;j<3;j++){
        const name=side+digit+(j+1),axis=new Vector3().crossVectors(points[j+1].clone().sub(points[j]).normalize(),palm).normalize();
        add(name,j?side+digit+j:side+'Hand',points[j],{digitBinding:{group:side.toLowerCase()+'Hand',digit:i,segment:j,axis:axis.toArray(),spreadAxis:palm.toArray()}});ids.push(skeleton.bones.length-1);
      }
      groups.push({id:`${side}${digit}`,kind:'finger',side,indices:ids,points,palm,hand:skeleton.bones.indexOf(byName[side+'Hand'])});
    }
    const toeRoot=[1,2,3,4,5].reduce((sum,i)=>sum.add(source[`joint-${key}-toe-${i}-1`]),new Vector3()).multiplyScalar(.2);
    add(side+'ToeBase',side+'Foot',toeRoot);
    for(let i=1;i<=5;i++){
      const points=i===1?[1,2,3].map(j=>source[`joint-${key}-toe-1-${j}`]):[source[`joint-${key}-toe-${i}-1`],source[`joint-${key}-toe-${i}-4`]];
      const ids=[];
      for(let j=0;j<points.length-1;j++){
        const name=i===1?side+'ToeBig'+(j+1):side+'Toe'+i,axis=new Vector3().crossVectors(points[j+1].clone().sub(points[j]).normalize(),new Vector3(0,-1,0)).normalize();
        add(name,j?side+'ToeBig'+j:side+'ToeBase',points[j],{digitBinding:{group:side.toLowerCase()+'Foot',digit:i-1,segment:j,axis:axis.toArray()}});ids.push(skeleton.bones.length-1);
      }
      groups.push({id:`${side}Toe${i}`,kind:'toe',side,indices:ids,points,nailPoints:i===1?points.slice(-2):[source[`joint-${key}-toe-${i}-3`],source[`joint-${key}-toe-${i}-4`]],palm:new Vector3(0,-1,0),hand:skeleton.bones.indexOf(byName[side+'Foot'])});
    }
  }
  frame.updateMatrixWorld(true);skeleton.boneMatrices=new Float32Array(skeleton.bones.length*16);skeleton.boneTexture=null;
  const joints=body.geometry.attributes.skinIndex,weights=body.geometry.attributes.skinWeight,positions=body.geometry.attributes.position;
  const nextIds=new Uint16BufferAttribute(joints.array.slice(),4),nextWeights=new Float32BufferAttribute(weights.array.slice(),4),p=new Vector3(),closest=new Vector3();let bound=0;
  const lines=groups.map(group=>({...group,lines:group.points.slice(1).map((end,i)=>new Line3(group.points[i],end))}));
  for(let i=0;i<positions.count;i++){
    p.fromBufferAttribute(positions,i);let dominant=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,dominant))dominant=k;
    let owner=joints.getComponent(i,dominant);
    const candidates=lines.filter(group=>[0,1,2,3].some(k=>joints.getComponent(i,k)===group.hand && weights.getComponent(i,k)>config.digits.minimumParentInfluence));if(!candidates.length)continue;
    let selected=null,best=Infinity;
    for(const group of candidates)for(let segment=0;segment<group.lines.length;segment++){
      const line=group.lines[segment],t=line.closestPointToPointParameter(p,false),distance=line.closestPointToPoint(p,true,closest).distanceTo(p);
      if(distance<best){best=distance;selected={group,segment,t};}
    }
    const {group,segment,t}=selected,line=group.lines[segment],direction=line.delta(new Vector3()),raw=p.clone().sub(group.points[0]).dot(group.lines[0].delta(new Vector3()).normalize());owner=group.hand;
    if(raw<0 || best>group.points[0].distanceTo(group.points.at(-1))*.55)continue;
    const slot=group.indices[segment],previous=segment?group.indices[segment-1]:owner,next=group.indices[segment+1],blend=config.digits.jointBlend;
    let a=slot,b=slot,w=1;
    if(t<blend){a=previous;b=slot;w=.5+.5*smooth(0,blend,t);}else if(next!=null && t>1-blend){a=slot;b=next;w=.5*smooth(1-blend,1,t);}else{a=slot;b=slot;w=1;}
    // At the palm-side boundary retain the original hand attachment.
    if(segment===0 && raw<direction.length()*blend){a=owner;b=slot;w=smooth(0,direction.length()*blend,raw);}
    nextIds.setXYZW(i,a,b,0,0);nextWeights.setXYZW(i,a===b?1:1-w,a===b?0:w,0,0);bound++;
  }
  body.geometry.setAttribute('skinIndex',nextIds);body.geometry.setAttribute('skinWeight',nextWeights);
  return {groups,added:skeleton.bones.length-original,bound,frame};
}

export function morphRigMetadata(body,skeleton,config){
  const pos=body.geometry.attributes.position,ids=body.geometry.attributes.skinIndex,weights=body.geometry.attributes.skinWeight;
  const points=skeleton.bones.map(b=>b.getWorldPosition(new Vector3())),samples=points.map(point=>{
    const candidates=[];for(let i=0;i<pos.count;i++){const d=point.distanceToSquared(new Vector3().fromBufferAttribute(pos,i));candidates.push({i,d});}
    return candidates.sort((a,b)=>a.d-b.d).slice(0,config.jointOffsets.nearestVertices);
  });
  const morphRegions={},jointOffsets={};
  for(const [name,index] of Object.entries(body.morphTargetDictionary)){
    const delta=body.geometry.morphAttributes.position[index],regions=new Set();
    for(let i=0;i<pos.count;i++)if(Math.hypot(delta.getX(i),delta.getY(i),delta.getZ(i))>1e-8)for(let k=0;k<4;k++)if(weights.getComponent(i,k)>.1)regions.add(skeleton.bones[ids.getComponent(i,k)].name);
    morphRegions[name]=[...regions];jointOffsets[name]={};
    if(/^(smile|blink|jaw_open|corrective_|d_)/.test(name))continue;
    for(let joint=0;joint<points.length;joint++){
      const shift=new Vector3();let total=0;
      for(const sample of samples[joint]){const w=1/Math.max(1e-8,sample.d)**(config.jointOffsets.distancePower/2);shift.addScaledVector(new Vector3().fromBufferAttribute(delta,sample.i),w);total+=w;}
      shift.divideScalar(total);
      if(shift.length()>1e-7)jointOffsets[name][skeleton.bones[joint].name]=shift.toArray();
    }
  }
  return {morphRegions,jointOffsets};
}
