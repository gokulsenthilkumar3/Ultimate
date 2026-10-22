import { Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three';
import { POSE_STUDIO } from '../../lib/poseStudio';
import { resolveRigBones } from './boneMap';

/** The bundled proximity weights blend facial skin with the shoulders while
 * its accessories are rigidly parented to Head. Correct only the existing
 * dominant head/neck region of a clone; leave imported files and other regions
 * unchanged. This bounded runtime repair is not a newly authored full rig. */
export function prepareHeadPoseBinding(body) {
  const joints=body?.geometry?.attributes.skinIndex,weights=body?.geometry?.attributes.skinWeight;
  const {head,neck}=resolveRigBones(body?.skeleton);
  if(!joints || !weights || !head || !neck)return null;
  body.updateWorldMatrix(true,false);
  const headIndex=body.skeleton.bones.indexOf(head),neckIndex=body.skeleton.bones.indexOf(neck);
  const headPoint=body.worldToLocal(head.getWorldPosition(new Vector3())),neckPoint=body.worldToLocal(neck.getWorldPosition(new Vector3()));
  const length=headPoint.distanceTo(neckPoint);if(length<=1e-9)return null;
  const start=neckPoint.y+length*POSE_STUDIO.headBinding.neckBlendStart,end=neckPoint.y+length*POSE_STUDIO.headBinding.neckBlendEnd;
  const nextJoints=new Uint16BufferAttribute(joints.array.slice(),joints.itemSize),nextWeights=new Float32BufferAttribute(weights.array.slice(),weights.itemSize);
  let corrected=0,rigid=0;
  for(let i=0;i<joints.count;i++) {
    let dominant=0;
    for(let k=1;k<weights.itemSize;k++)if(weights.getComponent(i,k)>weights.getComponent(i,dominant))dominant=k;
    const joint=joints.getComponent(i,dominant);
    if(joint!==headIndex && joint!==neckIndex)continue;
    const t=Math.max(0,Math.min(1,(body.geometry.attributes.position.getY(i)-start)/(end-start))),headWeight=t*t*(3-2*t);
    nextJoints.setXYZW(i,headIndex,neckIndex,0,0);nextWeights.setXYZW(i,headWeight,1-headWeight,0,0);
    corrected++;if(headWeight===1)rigid++;
  }
  body.geometry.setAttribute('skinIndex',nextJoints);body.geometry.setAttribute('skinWeight',nextWeights);
  const report={method:'dominant-head-neck-rebind',corrected,rigid};body.userData.headPoseBinding=report;return report;
}
