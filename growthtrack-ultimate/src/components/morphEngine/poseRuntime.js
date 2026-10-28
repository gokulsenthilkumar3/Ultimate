import { Euler, Quaternion, Vector3 } from 'three';
import { POSE_STUDIO } from '../../lib/poseStudio';
import {applyArticulation,applyTwistBindings} from './articulation';

/** Work in the authored rig frame: viewer height scaling must not distort IK. */
export function rigFrame(bone) {
  let root=bone;
  while(root?.parent?.isBone)root=root.parent;
  return root?.parent || root;
}
const positionIn=(bone,frame)=>frame.worldToLocal(bone.getWorldPosition(new Vector3()));

export function solveTwoBone({root,l1,l2,target,pole,maxFlexRad=2.5}) {
  const origin=new Vector3(...root),direction=new Vector3(...target).sub(origin),raw=direction.length();
  if(![l1,l2,maxFlexRad,...root,...target,...pole].every(Number.isFinite) || l1<=0 || l2<=0)throw new Error('Invalid limb geometry');
  if(raw>1e-9)direction.divideScalar(raw);else direction.set(0,-1,0);
  const minimum=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(maxFlexRad)),maximum=(l1+l2)*.9999;
  const distance=Math.max(minimum,Math.min(maximum,raw));
  const along=(l1*l1+distance*distance-l2*l2)/(2*distance),across=Math.sqrt(Math.max(0,l1*l1-along*along));
  const side=new Vector3(...pole).sub(origin);side.addScaledVector(direction,-side.dot(direction));
  if(side.lengthSq()<1e-12) {
    // Choose the least aligned axis; parallel Z poles must not collapse the elbow.
    const axis=[new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)].sort((a,b)=>Math.abs(a.dot(direction))-Math.abs(b.dot(direction)))[0];
    side.copy(axis).addScaledVector(direction,-axis.dot(direction));
  }
  side.normalize();
  return {mid:origin.clone().addScaledVector(direction,along).addScaledVector(side,across).toArray(),
    end:origin.clone().addScaledVector(direction,distance).toArray(),
    reached:raw>=minimum-1e-9 && raw<=maximum+1e-9,stretch:Math.max(0,raw-maximum)};
}

function aim(bone,child,point,frame) {
  const world=frame.localToWorld(new Vector3(...point));
  const desired=bone.parent.worldToLocal(world).sub(bone.position).normalize();
  const current=child.position.clone().multiply(bone.scale).applyQuaternion(bone.quaternion).normalize();
  bone.quaternion.premultiply(new Quaternion().setFromUnitVectors(current,desired));
  bone.updateWorldMatrix(false,true);
}

export function applyReachTargets(bones,targets={},poles={}) {
  const limbs={};
  for(const definition of POSE_STUDIO.limbs) {
    const [upper,middle,end]=definition.chain.map(key=>bones[key]?.bone || bones[key]);
    if(!upper || !middle || !end || middle.parent!==upper || end.parent!==middle)continue;
    const frame=rigFrame(upper);frame.updateWorldMatrix(true,true);
    const root=positionIn(upper,frame),mid=positionIn(middle,frame),tip=positionIn(end,frame);
    const l1=root.distanceTo(mid),l2=mid.distanceTo(tip),reach=l1+l2;
    if(reach<=1e-9)continue;
    const target=targets[definition.id];let result=null;
    if(target) {
      const goal=root.clone().add(new Vector3(...target).multiplyScalar(reach));
      result=solveTwoBone({root:root.toArray(),l1,l2,target:goal.toArray(),pole:root.clone().add(new Vector3(...(poles[definition.id] || definition.pole))).toArray(),maxFlexRad:definition.maxFlexRad});
      aim(upper,middle,result.mid,frame);aim(middle,end,result.end,frame);
    }
    const actual=positionIn(end,frame),requested=target?root.clone().add(new Vector3(...target).multiplyScalar(reach)):actual;
    limbs[definition.id]={normalized:actual.clone().sub(root).divideScalar(reach).toArray(),
      reached:result?.reached ?? true,error:actual.distanceTo(requested),reach,
      world:end.getWorldPosition(new Vector3()).toArray()};
  }
  return limbs;
}

export function applyJointPose(bones,pose,posture={}) {
  const euler=new Euler();
  for(const [key,item] of Object.entries(bones)) {
    if(!item)continue;
    const degrees=pose?.joints?.[key] || [0,0,0],base=posture[key] || [0,0,0];
    item.bone.quaternion.copy(item.rest).multiply(new Quaternion().setFromEuler(euler.set(...degrees.map((v,i)=>v*Math.PI/180+base[i]))));
    item.bone.scale.copy(item.restScale);
  }
  const limbs=applyReachTargets(bones,pose?.targets);
  applyArticulation(bones,pose?.digits);applyTwistBindings(bones);
  return limbs;
}

export function freezeJointPose(bones,pose,posture,onPoseApplied) {
  const previous=Object.values(bones).filter(Boolean).map(item=>({bone:item.bone,rotation:item.bone.quaternion.clone(),scale:item.bone.scale.clone()}));
  applyJointPose(bones,pose,posture);
  onPoseApplied?.();
  return ()=>{
    previous.forEach(({bone,rotation,scale})=>{bone.quaternion.copy(rotation);bone.scale.copy(scale);});
    onPoseApplied?.();
  };
}
