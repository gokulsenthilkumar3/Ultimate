// @vitest-environment node
import { expect,it } from 'vitest';
import { Box3, SkinnedMesh, Sphere, Vector3 } from 'three';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { glbSkeletonFixture } from '../../tests/helpers/glbSkeletonFixture';
import { createModelReferenceFrame } from './modelReferenceFrame';
import { normalizeCameraView, restoreCameraView } from '../../lib/cameraBookmarks';

it.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb','humanoid-preview-75.glb','humanoid-preview-75-lite.glb'])('keeps camera normalization independent of cached culling bounds in %s',file=>{
  const {root,skeleton}=glbSkeletonFixture(file),body=new SkinnedMesh(glbMeshFixture(file).body.geometry);
  root.add(body);body.bind(skeleton);
  const cold=createModelReferenceFrame(root),position=[2,2,4],target=[0,1,0];
  expect(cold.height).toBeGreaterThan(1.6);expect(cold.height).toBeLessThan(2);
  const saved=normalizeCameraView({position,target,frame:cold});
  // A valid conservative envelope can be much larger than the neutral skin.
  body.boundingBox=new Box3(new Vector3(-3,-4,-3),new Vector3(3,4,3));
  body.boundingSphere=new Sphere(new Vector3(),6);
  const warm=createModelReferenceFrame(root);
  expect(warm.height).toBe(cold.height);expect(warm.size.toArray()).toEqual(cold.size.toArray());
  expect(normalizeCameraView({position,target,frame:warm})).toEqual(saved);
  expect(restoreCameraView(saved,warm)).toEqual(restoreCameraView(saved,cold));
});
