import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { POSE_STUDIO } from '../../lib/poseStudio';
import { registerCaptureGuard } from './captureRuntime';
import use3DStore from '../../store/use3DStore';
import useStore from '../../store/useStore';
import {HUMAN_SURFACE} from '../../lib/humanSurface';
import {createPoseDrag,dragTarget,createJointDrag,dragJointAngles,listenForPoseDragCancellation} from './poseDrag';
import {resolveRigBones} from './boneMap';

/** Pointer capture owns one view-plane drag; the existing editor save queue
 * owns persistence. Sliders remain the keyboard/depth alternative. */
export default function PoseTargetMarkers({bodyMesh,targets,joints,visible,context}) {
  const group=useRef(),active=useRef(null),renderer=useThree(state=>state.gl),camera=useThree(state=>state.camera),controls=useThree(state=>state.controls);
  const ownerId=useStore(state=>state.user?.id);
  const selectedJoint=use3DStore(state=>state.poseDragJoint || 'head');
  const emit=(session,target,phase)=>renderer.domElement.dispatchEvent(new CustomEvent(HUMAN_SURFACE.drag.event,{bubbles:true,detail:{ownerId:session.ownerId,context:session.context,limbId:session.limbId,jointId:session.jointId,target,phase}}));
  const finish=(cancel=false)=>{
    const session=active.current;if(!session)return;active.current=null;
    if(cancel)emit(session,session.previous,'cancel');
    try{session.target.releasePointerCapture(session.pointerId);}catch{/* A cancelled native pointer may already be released. */}
    if(controls)controls.enabled=session.enabled;use3DStore.setState({poseDragging:false});
  };
  useEffect(()=>listenForPoseDragCancellation(renderer.domElement,()=>active.current,()=>finish(true)),
    // Imperative pointer session is scoped to this model/context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [renderer,bodyMesh,context,ownerId,selectedJoint]);
  useEffect(()=>{if(!visible)finish(true);},[visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const stop=e=>{e.stopPropagation();e.sourceEvent?.preventDefault();e.sourceEvent?.stopImmediatePropagation();};
  const down=(e,limbId,jointId)=>{
    if(!visible || active.current || e.button!==0)return;stop(e);
    if(jointId && POSE_STUDIO.limbs.some(limb=>limb.chain.includes(jointId) && targets?.[limb.id]))return;
    const session=jointId?createJointDrag(jointId,joints?.[jointId],e.clientX,e.clientY):createPoseDrag(bodyMesh,limbId,camera);if(!session)return;
    active.current={...session,limbId,previous:(jointId?joints?.[jointId]:targets?.[limbId]) || null,ownerId,context,target:e.target,pointerId:e.pointerId,enabled:controls?.enabled};
    e.target.setPointerCapture(e.pointerId);if(controls)controls.enabled=false;use3DStore.setState({poseDragging:true});
    const target=jointId?dragJointAngles(session,e.clientX,e.clientY):dragTarget(session,e.ray);if(target)emit(active.current,target,'move');
  };
  const move=e=>{if(active.current?.pointerId!==e.pointerId)return;stop(e);const target=active.current.jointId?dragJointAngles(active.current,e.clientX,e.clientY):dragTarget(active.current,e.ray);if(target)emit(active.current,target,'move');};
  useEffect(()=>registerCaptureGuard(renderer.domElement,()=>{
    const previous=group.current?.visible;if(group.current)group.current.visible=false;
    return()=>{if(group.current)group.current.visible=previous;};
  }),[renderer]);
  useFrame(()=>{
    if(!group.current)return;
    group.current.visible=visible;
    for(const mesh of group.current.children) {
      if(mesh.name==='jointHandle'){
        const bone=resolveRigBones(bodyMesh?.skeleton)[selectedJoint];
        mesh.visible=Boolean(bone) && !POSE_STUDIO.limbs.some(limb=>limb.chain.includes(selectedJoint) && targets?.[limb.id]);
        if(bone){mesh.position.copy(group.current.worldToLocal(bone.getWorldPosition(new Vector3())));mesh.scale.setScalar(.018);}
        const point=mesh.getWorldPosition(new Vector3()).project(camera);
        if(bodyMesh)bodyMesh.userData.poseJointHandle={id:selectedJoint,x:(point.x+1)/2,y:(1-point.y)/2,visible:mesh.visible && visible};
        continue;
      }
      const result=bodyMesh?.userData.poseEvidence?.limbs[mesh.name];
      // These are Three.js objects, updated inside the render loop.
      mesh.visible=Boolean(result);
      if(!mesh.visible)continue;
      mesh.position.copy(group.current.worldToLocal(new Vector3(...result.world)));
      mesh.scale.setScalar(result.reach*HUMAN_SURFACE.drag.markerRadiusRatio);
      mesh.material.color.set(result.reached?POSE_STUDIO.marker.color:POSE_STUDIO.marker.limitedColor);
    }
    if(bodyMesh)bodyMesh.userData.poseHandles=group.current.children.filter(mesh=>mesh.visible && mesh.name!=='jointHandle').map(mesh=>{
      const point=mesh.getWorldPosition(new Vector3()).project(camera);return {id:mesh.name,x:(point.x+1)/2,y:(1-point.y)/2,visible:group.current.visible};
    });
  });
  return <group ref={group} visible={visible}>{POSE_STUDIO.limbs.map(limb=><mesh key={limb.id} name={limb.id} renderOrder={20}
    onPointerDown={e=>down(e,limb.id)} onPointerMove={move} onPointerUp={e=>{if(active.current?.pointerId===e.pointerId){stop(e);finish();}}}
    >
    <sphereGeometry args={[1,12,8]}/><meshBasicMaterial depthTest={false} color={POSE_STUDIO.marker.color}/>
    <mesh><sphereGeometry args={[HUMAN_SURFACE.drag.hitRadiusRatio/HUMAN_SURFACE.drag.markerRadiusRatio,12,8]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
  </mesh>)}
    <mesh name="jointHandle" renderOrder={21} onPointerDown={e=>down(e,null,selectedJoint)} onPointerMove={move}
      onPointerUp={e=>{if(active.current?.pointerId===e.pointerId){stop(e);finish();}}}>
      <sphereGeometry args={[1,16,12]}/><meshBasicMaterial color="#f6ad55" depthTest={false}/>
      <mesh><sphereGeometry args={[1.8,12,8]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    </mesh>
  </group>;
}
