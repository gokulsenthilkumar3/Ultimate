import {Vector3} from 'three';
export function surfaceAttributes(body,config){
  const g=body.geometry,p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal,ids=g.attributes.skinIndex,w=g.attributes.skinWeight;
  const region=new Uint8Array(p.count),tile=new Uint8Array(p.count),scale=new Float32Array(p.count),areas=new Float64Array(p.count),uvAreas=new Float64Array(p.count);
  const a=new Vector3(),b=new Vector3(),c=new Vector3();
  for(let i=0;i<g.index.count;i+=3){
    const indices=[0,1,2].map(k=>g.index.getX(i+k));[a,b,c].forEach((v,k)=>v.fromBufferAttribute(p,indices[k]));
    const area=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;
    const [i0,i1,i2]=indices,uvArea=Math.abs((uv.getX(i1)-uv.getX(i0))*(uv.getY(i2)-uv.getY(i0))-(uv.getX(i2)-uv.getX(i0))*(uv.getY(i1)-uv.getY(i0)))/2;
    for(const index of indices){areas[index]+=area;uvAreas[index]+=uvArea;}
  }
  const names=['face','ears','lips','neck','chest','back','abdomen','shoulder','upperArm','inner_arm','forearm','hand_dorsal','palm','glutes','thigh','knee','shin','foot_dorsal','sole'];
  for(let i=0;i<p.count;i++){
    let dominant=0;for(let k=1;k<4;k++)if(w.getComponent(i,k)>w.getComponent(i,dominant))dominant=k;
    const bone=body.skeleton.bones[ids.getComponent(i,dominant)].name;let label='abdomen',t=1;
    if(/Head|Jaw|Eye|Tongue/.test(bone)){label='face';t=0;}
    else if(/Neck/.test(bone)){label='neck';t=0;}
    else if(/Thumb|Index|Middle|Ring|Pinky|Hand/.test(bone)){label=n.getZ(i)<0?'hand_dorsal':'palm';t=2;}
    else if(/Toe|Foot/.test(bone)){label=n.getY(i)<0?'sole':'foot_dorsal';t=3;}
    else if(/UpLeg/.test(bone))label='thigh';else if(/Leg/.test(bone))label='shin';
    else if(/Shoulder/.test(bone))label='shoulder';else if(/ForeArm/.test(bone))label='forearm';else if(/UpperArm/.test(bone))label='upperArm';
    else if(/Spine2/.test(bone))label=n.getZ(i)>0?'chest':'back';else if(/Hips/.test(bone))label='glutes';
    region[i]=names.indexOf(label);tile[i]=t;scale[i]=Math.sqrt(areas[i]/Math.max(uvAreas[i],1e-12))/config.micro.tileMetres;
  }
  g.computeTangents();
  return {region,tile,scale,names,tangent:g.attributes.tangent.array};
}
