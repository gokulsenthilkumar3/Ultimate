import {expect,it} from 'vitest';
import {Group,Mesh} from 'three';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {protectAvatarCapture} from './protectedCapture';
import {createPrivateAnatomyDeformer} from './anatomyDeformation';

it('covers revealed anatomy synchronously and restores exact pose, hair and visibility after capture',()=>{
  const {body,anatomy}=glbMeshFixture('humanoid-adult-v2-lite.glb'),root=new Group(),guides=new Mesh();
  root.add(body,anatomy,guides);anatomy.visible=true;guides.visible=true;
  const intactIndex=body.geometry.index,deformer=createPrivateAnatomyDeformer(anatomy,body);
  deformer.apply({penis:{resting:{shape:{foreskinCoverage:100}}},scrotum:{fitMode:'guides',leftTestis:{lengthCm:4.5},rightTestis:{lengthCm:3.5}}});
  const revealedIndex=body.geometry.index;
  expect(revealedIndex).not.toBe(intactIndex);
  body.morphTargetInfluences[0]=.6;const position=body.geometry.attributes.position.array.slice();
  const pubic={value:.8},material={uniforms:{uPubicHair:pubic}};
  const restore=protectAvatarCapture({body,privateMesh:anatomy,guides,material,wardrobe:'ANATOMICAL'});
  expect(anatomy.visible).toBe(false);expect(guides.visible).toBe(false);expect(pubic.value).toBe(0);
  expect(body.geometry.index).toBe(intactIndex);
  const sensitive=[];root.traverseVisible(node=>{if(node.userData.sensitive)sensitive.push(node.name);});
  expect(sensitive).toEqual([]);
  const cover=root.getObjectByName('CaptureUnderwear');expect(cover.isSkinnedMesh).toBe(true);
  expect(cover.morphTargetInfluences[0]).toBe(.6);expect(cover.skeleton).toBe(body.skeleton);
  restore();expect(root.getObjectByName('CaptureUnderwear')).toBeUndefined();
  expect(anatomy.visible).toBe(true);expect(guides.visible).toBe(true);expect(pubic.value).toBe(.8);
  expect(body.geometry.attributes.position.array).toEqual(position);
  expect(body.geometry.index).toBe(revealedIndex);
  deformer.dispose();expect(body.geometry.index).toBe(intactIndex);
});
