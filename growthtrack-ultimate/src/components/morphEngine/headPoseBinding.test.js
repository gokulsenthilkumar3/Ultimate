// @vitest-environment node
import { expect,it } from 'vitest';
import { Matrix4, SkinnedMesh, Vector3 } from 'three';
import { glbSkeletonFixture } from '../../tests/helpers/glbSkeletonFixture';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { prepareHeadPoseBinding } from './headPoseBinding';

it.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb'])('keeps facial skin rigid with the head accessories and preserves other weights in %s',file=>{
  const {root,skeleton}=glbSkeletonFixture(file),source=glbMeshFixture(file).body;
  const body=new SkinnedMesh(source.geometry);root.add(body);root.updateMatrixWorld(true);body.bind(skeleton);
  const originalJoints=body.geometry.attributes.skinIndex,originalWeights=body.geometry.attributes.skinWeight;
  const report=prepareHeadPoseBinding(body);expect(report.rigid).toBeGreaterThan(100);
  expect(body.geometry.attributes.skinIndex).not.toBe(originalJoints);
  const headIndex=skeleton.bones.findIndex(bone=>bone.name==='Head'),neckIndex=skeleton.bones.findIndex(bone=>bone.name==='Neck'),head=skeleton.bones[headIndex];
  head.quaternion.setFromAxisAngle(new Vector3(0,1,0),.95);root.updateMatrixWorld(true);skeleton.update();
  const matrix=new Matrix4().multiplyMatrices(head.matrixWorld,skeleton.boneInverses[headIndex]);let tested=0;
  for(let i=0;i<originalJoints.count;i++) {
    let dominant=0;for(let k=1;k<4;k++)if(originalWeights.getComponent(i,k)>originalWeights.getComponent(i,dominant))dominant=k;
    const joint=originalJoints.getComponent(i,dominant),weights=body.geometry.attributes.skinWeight;
    if(joint!==headIndex && joint!==neckIndex) {
      for(let k=0;k<4;k++){expect(weights.getComponent(i,k)).toBe(originalWeights.getComponent(i,k));expect(body.geometry.attributes.skinIndex.getComponent(i,k)).toBe(originalJoints.getComponent(i,k));}
    } else if(weights.getX(i)===1) {
      const expected=new Vector3().fromBufferAttribute(body.geometry.attributes.position,i).applyMatrix4(matrix);
      expect(body.getVertexPosition(i,new Vector3()).distanceTo(expected)).toBeLessThan(1e-6);tested++;
    }
    expect([0,1,2,3].reduce((sum,k)=>sum+weights.getComponent(i,k),0)).toBeCloseTo(1,6);
  }
  expect(tested).toBe(report.rigid);
});
