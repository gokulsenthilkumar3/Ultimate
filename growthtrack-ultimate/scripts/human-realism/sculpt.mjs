import {Box3,BufferAttribute, Vector3} from 'three';

const gaussian=(x,c,s)=>Math.exp(-(((x-c)/s)**2));

// Deterministic sculpt recipe on the pinned CC0 body. This is a generic
// character, never an inference about a person's anatomy or identity.
export function sculptBody(geometry, config) {
  const p=geometry.attributes.position, n=geometry.attributes.normal;
  const bounds=new Box3().setFromBufferAttribute(p);
  const min=bounds.min.y, h=bounds.max.y-min;
  const report={vertices:p.count,moved:0,maximumDisplacementMetres:0,recipe:config.sculpt.version};
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), t=(y-min)/h, side=Math.abs(x)/h;
    const front=Math.max(0,n.getZ(i)), back=Math.max(0,-n.getZ(i));
    // Clavicle, pectoral/abdominal transitions, patella and shin planes.
    // Facial apertures, palms, soles and pelvic seam stay unchanged.
    let d=h*(.0015*gaussian(t,.77,.021)*gaussian(side,.056,.041)*front
      -.0009*gaussian(t,.683,.020)*gaussian(side,.052,.040)*front
      -.0010*gaussian(t,.615,.070)*gaussian(side,0,.011)*front
      +.0017*gaussian(t,.285,.021)*gaussian(side,.049,.025)*front
      +.0007*gaussian(t,.18,.060)*gaussian(side,.052,.014)*front
      +.0010*gaussian(t,.735,.04)*gaussian(side,.05,.04)*back);
    d+=config.sculpt.asymmetryMetres*Math.sin(x*29)*gaussian(t,.65,.13)*front;
    d=Math.max(-config.sculpt.maximumDisplacementMetres,Math.min(config.sculpt.maximumDisplacementMetres,d));
    if(Math.abs(d)>1e-7)report.moved++;
    report.maximumDisplacementMetres=Math.max(report.maximumDisplacementMetres,Math.abs(d));
    p.setXYZ(i,x+n.getX(i)*d,y+n.getY(i)*d,z+n.getZ(i)*d);
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();return report;
}

// Midpoint refinement transfers EVERY attribute and morph. Original vertex
// IDs remain stable for landmark, skin, garment and pelvic-boundary adapters.
export function subdivide(geometry,{select=()=>true}={}) {
  const oldCount=geometry.attributes.position.count, edges=new Map(), pairs=[];
  const midpoint=(a,b)=>{
    const key=a<b?a+':'+b:b+':'+a;
    if(!edges.has(key)){edges.set(key,oldCount+pairs.length);pairs.push([a,b]);}
    return edges.get(key);
  };
  // Shared-edge marking prevents T-junctions at the refinement boundaries.
  for(let i=0;i<geometry.index.count;i+=3){
    const tri=[0,1,2].map(k=>geometry.index.getX(i+k));
    if(select(tri,geometry.attributes.position)){midpoint(tri[0],tri[1]);midpoint(tri[1],tri[2]);midpoint(tri[2],tri[0]);}
  }
  const lookup=(a,b)=>edges.get(a<b?a+':'+b:b+':'+a);
  const ids=[];
  for(let i=0;i<geometry.index.count;i+=3){
    const a=geometry.index.getX(i),b=geometry.index.getX(i+1),c=geometry.index.getX(i+2);
    const ab=lookup(a,b),bc=lookup(b,c),ca=lookup(c,a),mask=(ab!=null?1:0)|(bc!=null?2:0)|(ca!=null?4:0);
    if(mask===0)ids.push(a,b,c);
    else if(mask===1)ids.push(a,ab,c,ab,b,c);
    else if(mask===2)ids.push(b,bc,a,bc,c,a);
    else if(mask===4)ids.push(c,ca,b,ca,a,b);
    else if(mask===3)ids.push(b,bc,ab,a,ab,c,ab,bc,c);
    else if(mask===5)ids.push(a,ab,ca,ab,b,c,ca,ab,c);
    else if(mask===6)ids.push(c,ca,bc,a,b,ca,b,bc,ca);
    else ids.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }
  const interpolate=attribute=>{
    const data=new attribute.array.constructor((oldCount+pairs.length)*attribute.itemSize);data.set(attribute.array);
    pairs.forEach(([a,b],i)=>{for(let k=0;k<attribute.itemSize;k++)data[(oldCount+i)*attribute.itemSize+k]=(attribute.getComponent(a,k)+attribute.getComponent(b,k))*.5;});
    return new BufferAttribute(data,attribute.itemSize,attribute.normalized);
  };
  const skinIds=geometry.attributes.skinIndex,skinWeights=geometry.attributes.skinWeight;
  for(const [key,attribute] of Object.entries(geometry.attributes))if(!['skinIndex','skinWeight'].includes(key))geometry.setAttribute(key,interpolate(attribute));
  if(skinIds && skinWeights){
    const ji=new Uint16Array((oldCount+pairs.length)*4),jw=new Float32Array(ji.length);ji.set(skinIds.array);jw.set(skinWeights.array);
    pairs.forEach(([a,b],i)=>{
      const weights=new Map();for(const id of [a,b])for(let k=0;k<4;k++){const joint=skinIds.getComponent(id,k);weights.set(joint,(weights.get(joint)||0)+skinWeights.getComponent(id,k)*.5);}
      const best=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((s,[,v])=>s+v,0);
      best.forEach(([joint,weight],k)=>{ji[(oldCount+i)*4+k]=joint;jw[(oldCount+i)*4+k]=weight/sum;});
    });
    geometry.setAttribute('skinIndex',new BufferAttribute(ji,4));geometry.setAttribute('skinWeight',new BufferAttribute(jw,4));
  }
  for(const key of Object.keys(geometry.morphAttributes))geometry.morphAttributes[key]=geometry.morphAttributes[key].map(interpolate);
  geometry.setIndex(ids);geometry.computeVertexNormals();geometry.normalizeNormals();
  // Interpolated tangents must be normalized independently of normal vectors.
  const tangent=geometry.attributes.tangent,v=new Vector3();
  if(tangent)for(let i=0;i<tangent.count;i++){v.fromBufferAttribute(tangent,i).normalize();tangent.setXYZ(i,v.x,v.y,v.z);}
  return {originalVertices:oldCount,vertices:geometry.attributes.position.count,triangles:ids.length/3};
}
