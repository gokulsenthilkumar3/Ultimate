import {Box3,Vector3} from 'three';
import {sacAttachmentHeight} from './nativeSacFit';

// Compile intersections in material coordinates once. Evaluating the saved
// triangle-edge intersections reads the actual rendered vertices after sculpt,
// fitting, skinning and pose; it never measures the hidden driver instead.
export function compileMaterialSection(geometry,value){
  const uv=geometry.attributes.uv,index=geometry.index,refs=[],nodes=new Map(),edges=new Set(),adjacent=[];
  const param=id=>(uv.getY(id)-.02)/.46;
  function node(a,b,w){
    const key=w<1e-8?'v'+a:w>1-1e-8?'v'+b:Math.min(a,b)+':'+Math.max(a,b);
    if(!nodes.has(key)){nodes.set(key,refs.length);refs.push({a,b,w});adjacent.push(new Set());}
    return nodes.get(key);
  }
  for(let i=0;i<index.count;i+=3){
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    if(ids.some(id=>uv.getY(id)>=.5))continue;
    const hits=new Set();
    for(let k=0;k<3;k++){
      const a=ids[k],b=ids[(k+1)%3],da=param(a)-value,db=param(b)-value;
      if(Math.abs(da)<1e-8)hits.add(node(a,a,0));
      if(da*db<0)hits.add(node(a,b,da/(da-db)));
    }
    if(hits.size!==2)continue;
    const [a,b]=[...hits],key=Math.min(a,b)+':'+Math.max(a,b);
    if(edges.has(key))continue;edges.add(key);adjacent[a].add(b);adjacent[b].add(a);
  }
  const seen=new Set(),loops=[];
  for(let start=0;start<refs.length;start++){
    if(seen.has(start))continue;
    const component=[],queue=[start];seen.add(start);
    while(queue.length){const current=queue.pop();component.push(current);for(const n of adjacent[current])if(!seen.has(n)){seen.add(n);queue.push(n);}}
    if(component.length<3 || component.some(id=>adjacent[id].size!==2))continue;
    const ordered=[];let current=start,previous=-1;
    do{ordered.push(refs[current]);const next=[...adjacent[current]].find(id=>id!==previous);previous=current;current=next;}while(current!==start && ordered.length<=component.length);
    if(current===start && ordered.length===component.length)loops.push(ordered);
  }
  return loops.sort((a,b)=>b.length-a.length)[0] || null;
}

export function evaluateSection(refs,position,heightScale){
  if(!refs)return null;
  const points=refs.map(({a,b,w})=>new Vector3(
    position.getX(a)*(1-w)+position.getX(b)*w,
    (position.getY(a)*(1-w)+position.getY(b)*w)*heightScale,
    position.getZ(a)*(1-w)+position.getZ(b)*w));
  let perimeter=0;const center=new Vector3();
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],length=a.distanceTo(b);
    perimeter+=length;center.addScaledVector(a,length*.5).addScaledVector(b,length*.5);
  }
  if(!(perimeter>1e-10))return null;
  center.divideScalar(perimeter);return {center,perimeter,points};
}

export function createNativeSurfaceMeasurement(mesh,cage,{unit,midT,body}){
  const geometry=mesh.geometry,uv=geometry.attributes.uv;
  if(!uv || !geometry.index || !(unit>0))return null;
  let min=Infinity,max=-Infinity;
  for(let i=0;i<uv.count;i++)if(uv.getY(i)<.5){const t=(uv.getY(i)-.02)/.46;min=Math.min(min,t);max=Math.max(max,t);}
  const margin=(max-min)*1e-5;
  const stationValues=Array.from({length:41},(_,i)=>min+margin+(max-min-margin*2)*i/40);
  const sections=stationValues.map(t=>compileMaterialSection(geometry,t));
  const mid=compileMaterialSection(geometry,midT),base=compileMaterialSection(geometry,min+(max-min)*.06),distal=compileMaterialSection(geometry,.64);
  const sacIds=Array.from({length:uv.count},(_,i)=>i).filter(id=>uv.getY(id)>=.5);
  const layout=cage.userData.layout,anchor=layout.midRing*layout.segments;
  function pelvicAxes(heightScale){
    const origin=new Vector3();cage.applyBoneTransform(anchor,origin);origin.y*=heightScale;
    return [new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)].map(axis=>{
      cage.applyBoneTransform(anchor,axis);axis.y*=heightScale;return axis.sub(origin).normalize();
    });
  }
  return {
    sectionCount:sections.length,
    measure({heightScale=1}={}){
      const p=geometry.attributes.position,values=sections.map(refs=>evaluateSection(refs,p,heightScale));
      const middle=evaluateSection(mid,p,heightScale),root=evaluateSection(base,p,heightScale),end=evaluateSection(distal,p,heightScale);
      if(!middle || !values.every(Boolean))return {status:'open-section',source:'rendered-native-surface',missingSections:values.filter(v=>!v).length};
      let length=0;for(let i=1;i<values.length;i++)length+=values[i-1].center.distanceTo(values[i].center);
      const midStation=Math.max(1,Math.min(values.length-2,Math.round((midT-min)/(max-min)*(values.length-1))));
      const tangent=values[midStation+1].center.clone().sub(values[midStation-1].center).normalize();
      const right=pelvicAxes(heightScale)[0];right.addScaledVector(tangent,-right.dot(tangent)).normalize();
      if(right.lengthSq()<.1)right.set(1,0,0);
      const depth=new Vector3().crossVectors(tangent,right).normalize();
      const widthBounds=[Infinity,-Infinity],depthBounds=[Infinity,-Infinity];let planarity=0;
      for(const point of middle.points){
        const relative=point.clone().sub(middle.center),x=relative.dot(right),y=relative.dot(depth);
        widthBounds[0]=Math.min(widthBounds[0],x);widthBounds[1]=Math.max(widthBounds[1],x);
        depthBounds[0]=Math.min(depthBounds[0],y);depthBounds[1]=Math.max(depthBounds[1],y);planarity=Math.max(planarity,Math.abs(relative.dot(tangent)));
      }
      const axes=pelvicAxes(heightScale),bounds=new Box3(),temp=new Vector3();
      for(const id of sacIds){
        const point=new Vector3(p.getX(id),p.getY(id)*heightScale,p.getZ(id));
        temp.set(...axes.map(axis=>point.dot(axis)));bounds.expandByPoint(temp);
      }
      const sacSize=bounds.getSize(new Vector3()).divideScalar(unit);
      const pubicHeight=sacAttachmentHeight(mesh,body,axes,heightScale) ?? Math.max(...values[0].points.map(point=>point.dot(axes[1])));
      return {status:'measured',source:'rendered-native-surface',sectionCount:values.length,centrelineCm:length/unit,
        midCircumferenceCm:middle.perimeter/unit,midWidthCm:(widthBounds[1]-widthBounds[0])/unit,midDepthCm:(depthBounds[1]-depthBounds[0])/unit,
        baseCircumferenceCm:root?.perimeter/unit,distalCircumferenceCm:end?.perimeter/unit,planarityErrorCm:planarity/unit,
        scrotum:{widthCm:sacSize.x,heightCm:sacSize.y,depthCm:sacSize.z,hangCm:(pubicHeight-bounds.min.y)/unit},stations:values.map((s,i)=>({t:stationValues[i],center:s.center.toArray(),perimeterCm:s.perimeter/unit}))};
    },
  };
}
