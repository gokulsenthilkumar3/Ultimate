import {Plane,Vector3} from 'three';
import {POSE_STUDIO} from '../../lib/poseStudio';
import {resolveRigBones} from './boneMap';
import {rigFrame} from './poseRuntime';

export function createPoseDrag(body,limbId,camera){
  const definition=POSE_STUDIO.limbs.find(limb=>limb.id===limbId),bones=resolveRigBones(body?.skeleton);
  const upper=bones[definition?.chain[0]],end=bones[definition?.chain[2]],result=body?.userData.poseEvidence?.limbs[limbId];
  if(!upper || !end || !result?.reach)return null;
  const frame=rigFrame(upper);frame.updateWorldMatrix(true,true);
  const origin=frame.worldToLocal(upper.getWorldPosition(new Vector3())),endpoint=end.getWorldPosition(new Vector3());
  const plane=new Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()),endpoint);
  return {plane,frame,origin,reach:result.reach};
}
export function dragTarget(session,ray){
  const point=ray.intersectPlane(session.plane,new Vector3());if(!point)return null;
  const target=session.frame.worldToLocal(point).sub(session.origin).divideScalar(session.reach);
  return target.toArray().map(value=>Math.max(-POSE_STUDIO.targetLimit,Math.min(POSE_STUDIO.targetLimit,
    Number((Math.round(value/POSE_STUDIO.targetStep)*POSE_STUDIO.targetStep).toFixed(8)))));
}

export function createJointDrag(jointId,angles,clientX,clientY){
  const joint=POSE_STUDIO.joints.find(item=>item.id===jointId);
  if(!joint || !Number.isFinite(clientX) || !Number.isFinite(clientY))return null;
  return {jointId,joint,start:[clientX,clientY],angles:Array.isArray(angles)?[...angles]:[0,0,0]};
}
export function dragJointAngles(session,clientX,clientY){
  if(!Number.isFinite(clientX) || !Number.isFinite(clientY))return null;
  const changes=[(clientY-session.start[1])*.25,(clientX-session.start[0])*.25,0];
  return session.angles.map((angle,i)=>Math.max(session.joint.limits[i][0],Math.min(session.joint.limits[i][1],Math.round((angle+changes[i])/POSE_STUDIO.angleStep)*POSE_STUDIO.angleStep)));
}

/** R3F clears its capture map on native cancellation but does not dispatch
 * those events to object handlers. Listen on the owning canvas as well. */
export function listenForPoseDragCancellation(canvas,getSession,cancel,view=window){
  let pending=null;
  const pointerCancel=event=>{if(getSession()?.pointerId===event.pointerId)cancel();};
  const lostCapture=event=>{
    const session=getSession();if(!session || session.pointerId!==event.pointerId)return;
    if(pending!==null)view.cancelAnimationFrame(pending);
    // Implicit release may precede pointerup. Let a successful pointerup finish
    // before deciding that capture was lost unexpectedly.
    pending=view.requestAnimationFrame(()=>{pending=null;if(getSession()===session)cancel();});
  };
  const key=event=>{if(event.key==='Escape' && getSession()){event.preventDefault();cancel();}};
  const blur=()=>{if(getSession())cancel();};
  canvas.addEventListener('pointercancel',pointerCancel);
  canvas.addEventListener('lostpointercapture',lostCapture);
  // Consume Escape before the editor's bubbling shortcut can close the panel.
  view.addEventListener('keydown',key,true);view.addEventListener('blur',blur);
  return()=>{
    canvas.removeEventListener('pointercancel',pointerCancel);
    canvas.removeEventListener('lostpointercapture',lostCapture);
    view.removeEventListener('keydown',key,true);view.removeEventListener('blur',blur);
    if(pending!==null)view.cancelAnimationFrame(pending);
    if(getSession())cancel();
  };
}
