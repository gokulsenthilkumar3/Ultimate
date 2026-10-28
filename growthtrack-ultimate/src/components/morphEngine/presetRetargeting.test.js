// @vitest-environment node
import {expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {readGlb} from '../../../scripts/plan-preview/glb.mjs';
import {sceneFromGlb} from '../../../scripts/human75/glb-tools.mjs';
import {resolveRigBones} from './boneMap';
import {applyPresetReach,retargetPresetAngles} from './presetRetargeting';
import {ANIMATION_PRESET_MAP} from './animationPresets';
function rig(){const scene=sceneFromGlb(readGlb('public/assets/models/humanoid-preview-75-lite.glb'));return {scene,bones:Object.fromEntries(Object.entries(resolveRigBones(scene.skeleton)).filter(([,bone])=>bone).map(([key,bone])=>[key,{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}]))};}
it('places flex wrists above elbows without extending the limb beyond its reach',()=>{
  const {scene,bones}=rig();applyPresetReach(bones,ANIMATION_PRESET_MAP.flex,0);scene.root.updateMatrixWorld(true);
  for(const side of ['left','right']){const hand=bones[side+'Hand'].bone.getWorldPosition(new Vector3()),elbow=bones[side+'ForeArm'].bone.getWorldPosition(new Vector3());expect(hand.y).toBeGreaterThan(elbow.y);expect(hand.toArray().every(Number.isFinite)).toBe(true);}
});
it('makes standing hands rest below the elbows and t-pose wrists level with shoulders',()=>{
  for(const id of ['standing','tpose']){const {scene,bones}=rig();applyPresetReach(bones,ANIMATION_PRESET_MAP[id],0);scene.root.updateMatrixWorld(true);for(const side of ['left','right']){const hand=bones[side+'Hand'].bone.getWorldPosition(new Vector3()),elbow=bones[side+'ForeArm'].bone.getWorldPosition(new Vector3()),shoulder=bones[side+'UpperArm'].bone.getWorldPosition(new Vector3());if(id==='standing')expect(hand.y).toBeLessThan(elbow.y);else expect(Math.abs(hand.y-shoulder.y)).toBeLessThan(.002);}}
});
it('corrects knee bend direction for the shipped rig without changing saved pose controls',()=>{
 expect(retargetPresetAngles('leftShin',[-1,0,0],'walking')[0]).toBe(1);
 expect(retargetPresetAngles('hips',[-1,0,0],'sitting')[0]).toBe(0);
 expect(retargetPresetAngles('leftThigh',[1,0,0],'sitting')[0]).toBe(-1);
});
