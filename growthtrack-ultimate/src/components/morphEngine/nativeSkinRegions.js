import {BufferAttribute} from 'three';

/** Region inputs for the common skin shader. Missing blood/roughness streams
 * otherwise defaulted to zero on native tissue and produced a pale seam. */
export function prepareNativeSkinRegions(mesh){
  const g=mesh.geometry,uv=g.attributes.uv,count=g.attributes.position.count;
  const exposure=new Float32Array(count),blood=new Float32Array(count),roughness=new Float32Array(count);
  for(let i=0;i<count;i++){
    const sac=uv.getY(i)>=.5,mucosa=g.attributes._mucosa?.getX(i)>0 || /Meatus/.test(mesh.name),glans=!sac && uv.getY(i)>.34;
    exposure[i]=mucosa?.03:sac?.08:.12;blood[i]=mucosa?1.35:glans?1.3:sac?1.2:1.1;roughness[i]=mucosa?.95:sac?1.05:1;
  }
  for(const [name,array,size] of [['skinExposure',exposure,1],['skinBlood',blood,1],['skinRoughness',roughness,1],['skinTanRegions',new Float32Array(count*4),4],['skinTanCoordinates',new Float32Array(count*2),2]])if(!g.attributes[name])g.setAttribute(name,new BufferAttribute(array,size));
}
