import {Vector3} from 'three';

/** Area-weighted texels per local model unit, derived from the loaded atlas
 * and the mesh's UV triangles. No fixed density from a different asset. */
export function measureTextureDensity(geometry,image,members) {
  const position=geometry?.attributes.position,uv=geometry?.attributes.uv,index=geometry?.index;
  if(!position || !uv || !(image?.width>0) || !(image?.height>0))return {};
  const regions=Object.fromEntries(Object.entries(members).map(([key,ids])=>[key,new Set(ids)]));
  const totals=Object.fromEntries(Object.keys(regions).map(key=>[key,{surface:0,texels:0}]));
  const a=new Vector3(),b=new Vector3(),c=new Vector3();
  for(let triangle=0;triangle<(index?.count || position.count);triangle+=3) {
    const ids=[0,1,2].map(corner=>index?index.getX(triangle+corner):triangle+corner);
    a.fromBufferAttribute(position,ids[0]);b.fromBufferAttribute(position,ids[1]);c.fromBufferAttribute(position,ids[2]);
    const area=b.sub(a).cross(c.sub(a)).length()*.5;if(area<1e-12)continue;
    const [i,j,k]=ids;
    const texels=Math.abs((uv.getX(j)-uv.getX(i))*(uv.getY(k)-uv.getY(i))-(uv.getX(k)-uv.getX(i))*(uv.getY(j)-uv.getY(i)))*.5*image.width*image.height;
    for(const [key,vertices] of Object.entries(regions))if(ids.filter(id=>vertices.has(id)).length>=2){totals[key].surface+=area;totals[key].texels+=texels;}
  }
  return Object.fromEntries(Object.entries(totals).flatMap(([key,value])=>value.surface>0 && value.texels>0?[[key,Math.sqrt(value.texels/value.surface)]]:[]));
}

export function closestDetailedDistance({pixelHeight,fov,texelsPerUnit,maxMagnification=1.25}) {
  if(!(texelsPerUnit>0) || !(pixelHeight>0) || !(fov>0 && fov<180))return 0;
  return pixelHeight/(2*Math.tan(fov*Math.PI/360)*texelsPerUnit*maxMagnification);
}
