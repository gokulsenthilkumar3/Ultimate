import {Box3,Vector3} from 'three';

export function sacFrame(cage,heightScale){
  const anchor=cage.userData.layout.midRing*cage.userData.layout.segments,origin=new Vector3();
  cage.applyBoneTransform(anchor,origin);origin.y*=heightScale;
  return [new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)].map(axis=>{
    cage.applyBoneTransform(anchor,axis);axis.y*=heightScale;return axis.sub(origin).normalize();
  });
}
export function transformSacPoint(point,transform){
  if(!transform)return point;
  const {axes,center,scale,shift,heightScale}=transform;
  const physical=point.clone();physical.y*=heightScale;
  const coordinates=axes.map((axis,i)=>(physical.dot(axis)-center[i])*scale[i]+center[i]+shift[i]);
  point.set(0,0,0);axes.forEach((axis,i)=>point.addScaledVector(axis,coordinates[i]));point.y/=heightScale;return point;
}
export function sacAttachmentHeight(mesh,body,axes,heightScale){
  const graph=mesh.children.find(n=>n.userData.nativeJunction)?.userData.nativeJunction;
  if(!graph || !body)return null;
  let height=-Infinity;
  for(const record of graph.anchors)if(record.body){const point=body.getVertexPosition(record.id,new Vector3());point.y*=heightScale;height=Math.max(height,point.dot(axes[1]));}
  return Number.isFinite(height)?height:null;
}

/** Fit the final skinned sac in its posed pelvic frame. The authored neck is
 * carried by the explicit junction graph, so it follows the fitted outlet. */
export function fitNativeSac(mesh,cage,profile,{heightScale,unit,body}){
  const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,axes=sacFrame(cage,heightScale),box=new Box3(),point=new Vector3(),sac=[];
  let pubic=-Infinity;
  for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i);point.y*=heightScale;
    if(uv.getY(i)>=.5){sac.push(i);box.expandByPoint(new Vector3(...axes.map(axis=>point.dot(axis))));}
    else if(Math.abs((uv.getY(i)-.02)/.46)<.0001)pubic=Math.max(pubic,point.dot(axes[1]));
  }
  const center=box.getCenter(new Vector3()).toArray(),size=box.getSize(new Vector3()).toArray(),scale=[1,1,1],shift=[0,0,0],envelope=profile?.scrotum?.envelope || {};
  pubic=sacAttachmentHeight(mesh,body,axes,heightScale) ?? pubic;
  const factor=profile?.scrotum?.presentation==='contracted'?.82:1,minimum=profile?.scrotum?.fitMode==='guides';
  ['widthCm','heightCm','depthCm'].forEach((key,i)=>{const desired=Number(envelope[key])*unit*factor;if(desired>0 && size[i]>0)scale[i]=minimum?Math.max(1,desired/size[i]):desired/size[i];});
  if(Number(envelope.hangCm)>0){const bottom=center[1]-size[1]*scale[1]/2;shift[1]=pubic-Number(envelope.hangCm)*unit-bottom;}
  const transform={axes,center,scale,shift,heightScale};
  for(const i of sac){point.fromBufferAttribute(p,i);transformSacPoint(point,transform);p.setXYZ(i,point.x,point.y,point.z);}
  mesh.userData.sacSurfaceTransform=transform;return transform;
}
