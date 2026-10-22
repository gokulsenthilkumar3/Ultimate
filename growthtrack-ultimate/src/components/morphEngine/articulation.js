import {Quaternion,Vector3} from 'three';
import {HUMAN_SURFACE,sanitizeDigits} from '../../lib/humanSurface';

export function applyArticulation(bones,input){
  const digits=sanitizeDigits(input) || {},definition=HUMAN_SURFACE.digits;
  for(const item of Object.values(bones).filter(Boolean)){
    const binding=item.bone.userData.digitBinding;if(!binding)continue;
    const saved=digits[binding.group],axis=new Vector3(...binding.axis);
    const shape=definition.shapes.find(s=>s.id===saved?.shape) || definition.shapes[0];
    const curl=binding.group.endsWith('Hand')?shape.curl[binding.digit]*(saved?.strength ?? 1):saved?.curl || 0;
    const angle=curl*definition.curlDegrees[binding.segment]*Math.PI/180;
    item.bone.quaternion.copy(item.rest).multiply(new Quaternion().setFromAxisAngle(axis,angle));
    if(binding.segment===0 && binding.spreadAxis){
      const spread=(saved?.spread || 0)*(binding.digit-2)/2*definition.spreadDegrees*Math.PI/180;
      item.bone.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(...binding.spreadAxis),spread));
    }
  }
}
export function applyTwistBindings(bones){
  const byName=Object.fromEntries(Object.values(bones).filter(Boolean).map(item=>[item.bone.name,item]));
  for(const item of Object.values(byName)){
    const binding=item.bone.userData.twistBinding,driver=binding && byName[binding.driver];if(!driver)continue;
    const axis=new Vector3(...binding.axis),rotation=driver.rest.clone().invert().multiply(driver.bone.quaternion);
    const projected=axis.clone().multiplyScalar(new Vector3(rotation.x,rotation.y,rotation.z).dot(axis));
    const twist=new Quaternion(projected.x,projected.y,projected.z,rotation.w);
    if(twist.lengthSq()<1e-12)twist.identity();else twist.normalize();
    const partial=new Quaternion().slerp(twist,binding.fraction);item.bone.quaternion.copy(item.rest).multiply(partial);
  }
}
