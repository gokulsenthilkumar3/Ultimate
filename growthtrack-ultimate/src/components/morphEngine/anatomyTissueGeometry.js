import { BufferAttribute, BufferGeometry, Color, Matrix3, Matrix4, Mesh, ShapeUtils, Vector2, Vector3 } from 'three';

const mix = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
const fullBodyIndices = new WeakMap();
export const anatomicalBodyExportIndex = body => fullBodyIndices.get(body) || body.geometry.index;
export function registerAnatomicalBodyExportIndex(body,index) {
  fullBodyIndices.set(body,index);
  return()=>{if(fullBodyIndices.get(body)===index)fullBodyIndices.delete(body);};
}
const texturePixels=new WeakMap();
export function posedNormal(mesh,id){
  const normal=new Vector3().fromBufferAttribute(mesh.geometry.attributes.normal,id);
  const {skinIndex,skinWeight}=mesh.geometry.attributes;
  if(mesh.isSkinnedMesh && skinIndex && skinWeight){
    const matrix=new Matrix4();matrix.elements.fill(0);
    for(let component=0;component<4;component++){
      const bone=skinIndex.array[id*4+component],weight=skinWeight.array[id*4+component];
      for(let axis=0;axis<16;axis++)matrix.elements[axis]+=mesh.skeleton.boneMatrices[bone*16+axis]*weight;
    }
    matrix.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix);
    normal.applyMatrix3(new Matrix3().setFromMatrix4(matrix));
  }
  return normal.normalize();
}
function bodyPigment(body,anatomy,id){
  const material=body.material,map=material?.map,uv=body.geometry.attributes.uv;
  let color=new Color(1,1,1);
  if(map?.image && uv && typeof document!=='undefined'){
    let pixels=texturePixels.get(map);
    if(!pixels){
      const canvas=document.createElement('canvas');canvas.width=map.image.width;canvas.height=map.image.height;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(map.image,0,0);
      pixels=context.getImageData(0,0,canvas.width,canvas.height);texturePixels.set(map,pixels);
    }
    map.updateMatrix();const point=map.transformUv(new Vector2().fromBufferAttribute(uv,id));
    const x=Math.max(0,Math.min(pixels.width-1,Math.floor(point.x*pixels.width))),y=Math.max(0,Math.min(pixels.height-1,Math.floor(point.y*pixels.height)));
    const offset=(y*pixels.width+x)*4;
    color.setRGB(pixels.data[offset]/255,pixels.data[offset+1]/255,pixels.data[offset+2]/255).convertSRGBToLinear();
  }
  if(material?.color && anatomy.material?.color){
    color.multiply(material.color);
    color.r/=Math.max(.001,anatomy.material.color.r);color.g/=Math.max(.001,anatomy.material.color.g);color.b/=Math.max(.001,anatomy.material.color.b);
  }
  const vertex=body.geometry.attributes.color;
  if(vertex)color.multiply(new Color(vertex.getX(id),vertex.getY(id),vertex.getZ(id)));
  return color;
}

export function pelvicMaterial(source,body){
  // Diagnostic shaders use different chunks and share live delta uniforms.
  // Only the physical skin pipeline supports the atlas transition below.
  if(!source.userData?.growthTrackSkinMaterial)return source;
  const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
  material.onBeforeCompile=(shader,...args)=>{
    compile.call(source,shader,...args);
    Object.assign(shader.uniforms,{
      uPelvicMap:{value:body.material.map},uPelvicMapReady:{value:body.material.map?1:0},
      uPelvicNormal:{value:body.material.normalMap || body.material.map},uPelvicNormalReady:{value:body.material.normalMap?1:0},
      uPelvicNormalScale:{value:body.material.normalScale || new Vector2(1,1)},uPelvicColor:{value:body.material.color},
    });
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec2 pelvicUv; attribute float pelvicBlend; attribute vec3 pelvicPigment;
      varying vec2 vPelvicUv; varying float vPelvicBlend; varying vec3 vPelvicPigment;`)
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPelvicUv=pelvicUv;vPelvicBlend=pelvicBlend;vPelvicPigment=pelvicPigment;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D uPelvicMap; uniform sampler2D uPelvicNormal;
      uniform float uPelvicMapReady; uniform float uPelvicNormalReady;
      uniform vec2 uPelvicNormalScale; uniform vec3 uPelvicColor;
      varying vec2 vPelvicUv; varying float vPelvicBlend; varying vec3 vPelvicPigment;
      mat3 pelvicFrame(vec3 p,vec3 n,vec2 uv){
        vec3 q0=dFdx(p),q1=dFdy(p),r1=cross(q1,n),r0=cross(n,q0);
        vec2 s0=dFdx(uv),s1=dFdy(uv);
        vec3 t=r1*s0.x+r0*s1.x,b=r1*s0.y+r0*s1.y;
        float scale=inversesqrt(max(max(dot(t,t),dot(b,b)),1e-16));
        return mat3(t*scale,b*scale,n);
      }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        if(uPelvicMapReady>0.5)diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uPelvicMap,vPelvicUv).rgb*uPelvicColor*vPelvicPigment,vPelvicBlend);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        if(uPelvicNormalReady>0.5){
          vec3 mapped=texture2D(uPelvicNormal,vPelvicUv).xyz*2.0-1.0;
          mapped.xy*=uPelvicNormalScale;
          normal=normalize(mix(normal,pelvicFrame(-vViewPosition,normal,vPelvicUv)*mapped,vPelvicBlend));
        }`);
  };
  material.customProgramCacheKey=()=>`${key}-pelvic-atlas-transition-v2`;
  return material;
}

function surface(name, rows, segments, parent) {
  const geometry=new BufferGeometry(),count=rows*segments;
  for(const [key,size] of [['position',3],['color',3],['uv',2]])geometry.setAttribute(key,new BufferAttribute(new Float32Array(count*size),size));
  geometry.attributes.color.array.fill(1);
  const indices=[];
  for(let row=0;row<rows-1;row++)for(let k=0;k<segments;k++){
    const a=row*segments+k,b=row*segments+(k+1)%segments,c=b+segments,d=a+segments;
    indices.push(a,b,c,a,c,d);
  }
  geometry.setIndex(indices);
  const mesh=new Mesh(geometry,parent.material);mesh.name=name;mesh.userData.sensitive=true;
  mesh.frustumCulled=false;parent.add(mesh);return mesh;
}

// Extract a single disk from the anterior body surface. Reject non-manifold or
// multiple boundaries rather than punching a hole that cannot be stitched.
function pelvicDisk(body,center,unit) {
  const {position:p}=body.geometry.attributes,index=body.geometry.index;
  if(!index)return null;
  // Only a locally refined authoring surface supports the wider collar.
  // Retained assets keep the opening validated for their coarser topology.
  const [widthCm,heightCm]=body.userData.growthtrack?.pelvicAttachmentRadiusCm || [3.2,3.6];
  const kept=[],removed=[],edges=new Map();
  for(let i=0;i<index.count;i+=3){
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    const c=ids.reduce((v,id)=>v.add(new Vector3().fromBufferAttribute(p,id)),new Vector3()).multiplyScalar(1/3);
    const inside=((c.x-center.x)/(unit*widthCm))**2+((c.y-center.y)/(unit*heightCm))**2<1 && c.z>center.z-unit*3.5;
    (inside?removed:kept).push(...ids);
    if(inside)for(let k=0;k<3;k++){
      const a=ids[k],b=ids[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
      if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);
    }
  }
  if(removed.length<3 || edges.size<3)return null;
  const adjacent=new Map();
  for(const [a,b] of edges.values()){
    if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);
    adjacent.get(a).push(b);adjacent.get(b).push(a);
  }
  if([...adjacent.values()].some(v=>v.length!==2))return null;
  const loop=[adjacent.keys().next().value];let previous=-1;
  while(loop.length<=edges.size){
    const current=loop.at(-1),next=adjacent.get(current).find(id=>id!==previous);
    if(next===loop[0])break;
    loop.push(next);previous=current;
  }
  if(loop.length!==edges.size)return null;
  // Counterclockwise looking at the body from the front, matching the root.
  const area=loop.reduce((sum,id,k)=>sum+p.getX(id)*p.getY(loop[(k+1)%loop.length])-p.getY(id)*p.getX(loop[(k+1)%loop.length]),0);
  if(area<0)loop.reverse();
  const angle=id=>(Math.atan2(p.getY(id)-center.y,p.getX(id)-center.x)+Math.PI*2)%(Math.PI*2);
  const start=loop.reduce((best,id,k)=>angle(id)<angle(loop[best])?k:best,0);
  return {loop:loop.slice(start).concat(loop.slice(0,start)),kept};
}

// One pelvic surface with two outlets. A single annulus around the shaft left
// the closed sac floating behind it. The pair-of-pants topology joins both
// actual mesh boundaries to the same body disk, including the intervening web.
function junctionTopology(disk,body,anatomy,{unit,junction,rootRing,neckRing,segments}){
  const anchors=disk.loop.map(id=>({body:true,id}));
  const contour=disk.loop.map(id=>new Vector2(body.geometry.attributes.position.getX(id),body.geometry.attributes.position.getY(id)));
  // Parameter outlets must stay inside the actual cut. The body crotch clips
  // the lower ellipse; placing a hole below that contour gives Earcut an
  // invalid polygon and leaves missing wedges in the rendered junction.
  const holes=[[-.7,1.2,.5],[-2.2,1.2,.3]].map(([y,rx,ry],branch)=>Array.from({length:segments},(_,k)=>{
    anchors.push({body:false,id:(branch===0?rootRing*segments:neckRing)+k});
    const angle=k/segments*Math.PI*2;
    return new Vector2(junction[0]+unit*rx*Math.cos(angle),junction[1]+unit*(y+ry*Math.sin(angle)));
  }));
  const inside=p=>{
    let result=false;
    for(let i=0,j=contour.length-1;i<contour.length;j=i++){
      const a=contour[i],b=contour[j];
      if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result;
    }
    return result;
  };
  for(const hole of holes){
    const center=hole.reduce((sum,p)=>sum.add(p),new Vector2()).multiplyScalar(1/hole.length);
    for(let attempt=0;attempt<8 && !hole.every(inside);attempt++)for(const p of hole)p.lerp(center,.2);
    if(!hole.every(inside))return null;
  }
  let faces=ShapeUtils.triangulateShape(contour,holes);
  const param=contour.concat(...holes);
  faces=faces.map(face=>{
    const [a,b,c]=face.map(id=>param[id]);
    return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0?face:[face[0],face[2],face[1]];
  });
  const weights=anchors.map((_,id)=>[[id,1]]),locked=anchors.map(()=>true);
  const improveTriangles=()=>{
    // Earcut connects dense circular outlets to a coarser body boundary.
    // Constrained Delaunay flips remove its long, thin fan triangles before
    // fairing; their otherwise uneven valence left visible radial pinches.
    const side=(a,b,c)=>(param[b].x-param[a].x)*(param[c].y-param[a].y)-(param[b].y-param[a].y)*(param[c].x-param[a].x);
    const angle=(a,b,c)=>{
      const u=param[a].clone().sub(param[c]),v=param[b].clone().sub(param[c]);
      return Math.acos(Math.max(-1,Math.min(1,u.dot(v)/Math.max(1e-15,u.length()*v.length()))));
    };
    for(let pass=0;pass<12;pass++){
      const edges=new Map(),changed=new Set();let flips=0;
      faces.forEach((face,index)=>{for(let i=0;i<3;i++){
        const a=face[i],b=face[(i+1)%3],c=face[(i+2)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
        if(edges.has(key))edges.get(key).push({index,a,b,c});else edges.set(key,[{index,a,b,c}]);
      }});
      for(const adjacent of edges.values())if(adjacent.length===2){
        const [left,right]=adjacent,{a,b,c}=left,d=right.c;
        if(changed.has(left.index)||changed.has(right.index)||side(c,d,a)*side(c,d,b)>=-1e-18)continue;
        if(angle(a,b,c)+angle(a,b,d)<=Math.PI+1e-5)continue;
        const face=(x,y,z)=>side(x,y,z)>0?[x,y,z]:[x,z,y];
        faces[left.index]=face(c,d,a);faces[right.index]=face(d,c,b);
        changed.add(left.index);changed.add(right.index);flips++;
      }
      if(!flips)break;
    }
  };
  improveTriangles();
  for(let level=0;level<2;level++){
    const edges=new Map();
    for(const face of faces)for(let i=0;i<3;i++){
      const a=face[i],b=face[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
      const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
    }
    for(const edge of edges.values()){
      const blend=new Map();
      for(const id of [edge.a,edge.b])for(const [anchor,w] of weights[id])blend.set(anchor,(blend.get(anchor)||0)+w*.5);
      edge.id=weights.length;weights.push([...blend]);locked.push(edge.count===1);
      param.push(param[edge.a].clone().lerp(param[edge.b],.5));
    }
    const middle=(a,b)=>edges.get([Math.min(a,b),Math.max(a,b)].join(':')).id;
    faces=faces.flatMap(([a,b,c])=>{
      const ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);
      return [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]];
    });
    improveTriangles();
  }
  const neighbors=weights.map(()=>new Set());
  for(const face of faces)for(let i=0;i<3;i++){
    neighbors[face[i]].add(face[(i+1)%3]);neighbors[face[i]].add(face[(i+2)%3]);
  }
  return {anchors,weights,locked,faces,neighbors:neighbors.map(set=>[...set])};
}

/** Additional adult tissue surfaces. The opening has an actual recessed wall;
 * the foreskin folds from an outer surface around a rim onto an inner surface.
 * All vertices are evaluated from the posed parent, so these meshes need no
 * independent rig. The private parent's visibility also hides every child. */
export function createAnatomyTissues(anatomy,body,{unit,junction}) {
  const {segments,shaftRings,baseRing,tipVertex}=anatomy.userData.layout;
  const rootRing=baseRing,shaftEnd=tipVertex+1;
  const originalIndex=anatomy.geometry.index;
  let neckRing=null;
  for(let id=shaftEnd+1;id+segments<=anatomy.geometry.attributes.position.count;id+=segments){
    if(anatomy.geometry.attributes.uv.getY(id)>=.58){neckRing=id;break;}
  }
  const candidate=neckRing==null?null:pelvicDisk(body,new Vector3(...junction).add(new Vector3(0,-unit*1.5,0)),unit);
  const junctionMesh=candidate?junctionTopology(candidate,body,anatomy,{unit,junction,rootRing,neckRing,segments}):null;
  const disk=junctionMesh?candidate:null;
  const filtered=[];
  // The source oriented individual faces against a centre point. That can
  // reverse faces around a concave lower pole. Rebuild the documented grid
  // consistently instead; reshaping must not reveal cracks/back-facing slits.
  const join=(a,d)=>{for(let k=0;k<segments;k++){
    const next=(k+1)%segments,b=a+next,c=d+next;
    filtered.push(a+k,b,c,a+k,c,d+k);
  }};
  for(let ring=disk?rootRing:0;ring<shaftRings-1;ring++)join(ring*segments,(ring+1)*segments);
  const firstSac=shaftEnd+1,bottomPole=anatomy.geometry.attributes.position.count-1;
  for(let row=disk?neckRing:firstSac;row+segments<bottomPole;row+=segments)join(row,row+segments);
  for(let k=0;k<segments;k++){
    if(!disk)filtered.push(shaftEnd,firstSac+(k+1)%segments,firstSac+k);
    filtered.push(bottomPole-segments+k,bottomPole-segments+(k+1)%segments,bottomPole);
  }
  anatomy.geometry.setIndex(filtered);
  const cavity=surface('PrivateAnatomyMeatus',5,segments,anatomy);
  const shellRows=49,shell=surface('PrivateAnatomyForeskin',shellRows,segments,anatomy);
  let pelvic=null,bodyIndex=null;
  let pelvicSource=null,pelvicBodySource=null;
  if(disk){
    bodyIndex=body.geometry.index;fullBodyIndices.set(body,bodyIndex);
    const holeIndex=new BufferAttribute(new Uint32Array(disk.kept),1);
    // A common visibility assignment also occurs in capture redaction. Restore
    // the intact body immediately whenever the sensitive surface is hidden.
    let shown=anatomy.visible;
    Object.defineProperty(anatomy,'visible',{configurable:true,enumerable:true,get:()=>shown,set(value){shown=Boolean(value);body.geometry.setIndex(shown?holeIndex:bodyIndex);}});
    anatomy.visible=shown;
    pelvic=surface('PrivateAnatomyPelvicTransition',5,segments,anatomy);
    // Preserve every boundary edge of the body, shaft and open scrotal neck.
    const count=junctionMesh.weights.length,g=pelvic.geometry;
    for(const [key,size] of [['position',3],['color',3],['uv',2]])g.setAttribute(key,new BufferAttribute(new Float32Array(count*size),size));
    g.attributes.color.array.fill(1);
    g.setAttribute('pelvicUv',new BufferAttribute(new Float32Array(count*2),2));
    g.setAttribute('pelvicBlend',new BufferAttribute(new Float32Array(count),1));
    g.setAttribute('pelvicPigment',new BufferAttribute(new Float32Array(count*3).fill(1),3));
    for(const key of ['skinExposure','skinBlood','skinRoughness','skinTanRegions','skinTanCoordinates']){
      const source=body.geometry.attributes[key];if(source)g.setAttribute(key,new BufferAttribute(new Float32Array(count*source.itemSize),source.itemSize));
    }
    g.setIndex(junctionMesh.faces.flat());
    // Save the exact authored boundary/weight graph for native asset baking.
    // A nearest-triangle binding alone cannot preserve this two-outlet web.
    pelvic.userData.nativeJunction={version:1,anchors:junctionMesh.anchors,weights:junctionMesh.weights,locked:junctionMesh.locked,neighbors:junctionMesh.neighbors};
  }
  const ts=Array.from({length:shaftRings},(_,r)=>Math.max(0,(anatomy.geometry.attributes.uv.getY(r*segments)-.02)/.46));
  const points=Array.from({length:shaftRings*segments},()=>new Vector3());
  const centers=Array.from({length:shaftRings},()=>new Vector3());
  let settings={coverage:0,retraction:0,coronaT:.73};
  let previousSignature=null;
  // A still figure should not rebuild thousands of tissue vertices each frame.
  // Include both rigs, morphs and matrices: a pelvis pose can move the body
  // boundary even when the anatomy's own morph weights have not changed.
  const signature=()=>[JSON.stringify(settings),...[anatomy,body].flatMap(mesh=>[
    mesh.geometry.attributes.position.version,mesh.geometry.attributes.normal?.version,
    mesh.geometry.attributes.color?.version,mesh.material?.uuid,
    ...mesh.matrixWorld.elements,...(mesh.morphTargetInfluences || []),
    ...(mesh.skeleton?.boneMatrices || []),
  ])];
  const write=(mesh,id,p,u,v,pigment=1)=>{
    const g=mesh.geometry;p.toArray(g.attributes.position.array,id*3);
    g.attributes.uv.setXY(id,u,v);g.attributes.color.setXYZ(id,pigment,pigment,pigment);
  };
  const sectionAt=t=>{
    let upper=ts.findIndex((value,i)=>i>=baseRing && value>=t);
    if(upper<0)upper=shaftRings-1;
    const lower=Math.max(baseRing,upper-1),w=Math.max(0,Math.min(1,(t-ts[lower])/Math.max(1e-8,ts[upper]-ts[lower])));
    return {upper,lower,w};
  };
  const at=(t,k)=>{
    const {upper,lower,w}=sectionAt(t);
    return points[lower*segments+k].clone().lerp(points[upper*segments+k],w);
  };
  const centerAt=t=>{
    const {upper,lower,w}=sectionAt(t);
    return centers[lower].clone().lerp(centers[upper],w);
  };
  function update(){
    for(const mesh of [anatomy,body]){
      mesh.updateWorldMatrix(true,false);mesh.updateMatrixWorld(true);
      for(const bone of mesh.skeleton?.bones || [])if(!bone.parent?.isBone)bone.updateWorldMatrix(true,true);
      mesh.skeleton?.update();
    }
    const currentSignature=signature();
    if(previousSignature?.length===currentSignature.length && currentSignature.every((value,i)=>value===previousSignature[i]))return false;
    previousSignature=currentSignature;
    for(let r=baseRing;r<shaftRings;r++){
      centers[r].set(0,0,0);
      for(let k=0;k<segments;k++){
        anatomy.getVertexPosition(r*segments+k,points[r*segments+k]);
        centers[r].add(points[r*segments+k]);
      }
      centers[r].multiplyScalar(1/segments);
    }
    const last=shaftRings-1,tipCenter=centers[last];
    const tangent=tipCenter.clone().sub(centers[last-1]).normalize();
    for(let row=0;row<5;row++)for(let k=0;k<segments;k++){
      const inward=row/4;
      const offset=points[last*segments+k].clone().sub(tipCenter).multiplyScalar(mix(1,.72,inward));
      const p=tipCenter.clone().add(offset).addScaledVector(tangent,-unit*.45*inward);
      write(cavity,row*segments+k,p,k/segments,.478, mix(1,.36,inward));
    }
    // Cap only at the deep end of the duct, leaving the external aperture open.
    if(!cavity.userData.capped){
      const ids=Array.from(cavity.geometry.index.array),start=4*segments;
      for(let k=1;k<segments-1;k++)ids.push(start,start+k,start+k+1);
      cavity.geometry.setIndex(ids);cavity.userData.capped=true;
    }
    const {coverage,retraction,coronaT}=settings,effective=coverage*(1-retraction);
    shell.visible=coverage>0.001;
    if(shell.visible){
      const start=mix(coronaT-.16,coronaT-.10,retraction),end=mix(coronaT-.065,1,effective);
      const rimRadius=unit*mix(.055,.014,retraction);
      for(let row=0;row<shellRows;row++){
        // Outer 0..20, rolled rim 21..28, then inner wall back to attachment.
        const outer=row<=20,roll=row>20 && row<28;
        const phase=outer?row/20:roll?1:(48-row)/20;
        for(let k=0;k<segments;k++){
          // A fully retracted fold is short and oblique. A constant-width
          // cylindrical cuff produced a detached, manufactured-looking band.
          const angle=k/segments*Math.PI*2;
          const edge=end+retraction*(.025*Math.sin(angle)+.01*Math.cos(angle*3));
          const attachment=start+retraction*.012*Math.sin(angle);
          const t=mix(attachment,edge,phase),c=centerAt(t);
          const p=at(t,k),radial=p.clone().sub(c),radius=radial.length();radial.normalize();
          const rollAngle=roll?(row-20)/8*Math.PI:outer?0:Math.PI;
          const glansCover=smooth(coronaT-.1,coronaT+.03,t)*effective;
          const barrel=unit*.08*glansCover*smooth(.87,.995,t);
          const thickness=unit*mix(.045,.016,retraction)*(1-Math.cos(rollAngle));
          const fold=unit*.025*retraction*Math.sin(Math.PI*phase)**2*(.7+.2*Math.sin(angle*3)+.1*Math.cos(angle*5));
          const ventral=Math.max(0,-Math.sin(angle))**4;
          const lift=(unit*mix(.09,.05,retraction)+barrel+fold-thickness)*smooth(0,.35,phase)*(1-.65*retraction*ventral);
          p.copy(c).addScaledVector(radial,radius+lift+rimRadius*Math.sin(rollAngle));
          p.addScaledVector(tangent,unit*.1*glansCover*smooth(.97,1,t));
          if(roll)p.addScaledVector(tangent,rimRadius*Math.sin(rollAngle));
          write(shell,row*segments+k,p,k/segments,.10+.20*phase,outer?1:.97);
          const color=anatomy.geometry.attributes.color,id=row*segments+k;
          for(let axis=0;axis<3;axis++)shell.geometry.attributes.color.array[id*3+axis]=color.array[(baseRing+8)*segments*3+k*3+axis]*(outer?1:.97);
        }
      }
    }
    let anchorNormals=null;
    if(pelvic){
      const normalMatrix=new Matrix3().getNormalMatrix(anatomy.matrixWorld.clone().invert().multiply(body.matrixWorld));
      const anchors=junctionMesh.anchors.map(anchor=>{
        const mesh=anchor.body?body:anatomy,p=mesh.getVertexPosition(anchor.id,new Vector3());
        if(anchor.body){body.localToWorld(p);anatomy.worldToLocal(p);}
        return p;
      });
      anchorNormals=junctionMesh.anchors.map(anchor=>{
        const n=posedNormal(anchor.body?body:anatomy,anchor.id);
        return anchor.body?n.applyMatrix3(normalMatrix).normalize():n;
      });
      const colors=junctionMesh.anchors.map(anchor=>anchor.body?bodyPigment(body,anatomy,anchor.id):
        new Color().fromBufferAttribute(anatomy.geometry.attributes.color,anchor.id));
      const g=pelvic.geometry,positions=g.attributes.position.array;
      for(let id=0;id<junctionMesh.weights.length;id++){
        const weights=junctionMesh.weights[id],p=new Vector3(),color=new Color(0,0,0),uv=new Vector2(),pigment=new Vector3();
        let bodyWeight=0;
        for(const [anchor,w] of weights){
          const record=junctionMesh.anchors[anchor];p.addScaledVector(anchors[anchor],w);color.add(colors[anchor].clone().multiplyScalar(w));
          if(record.body){
            bodyWeight+=w;
            uv.addScaledVector(new Vector2().fromBufferAttribute(body.geometry.attributes.uv,record.id),w);
            const attribute=body.material.vertexColors && body.geometry.attributes.color;
            pigment.addScaledVector(attribute?new Vector3(attribute.getX(record.id),attribute.getY(record.id),attribute.getZ(record.id)):new Vector3(1,1,1),w);
          }
        }
        p.toArray(positions,id*3);color.toArray(g.attributes.color.array,id*3);
        // All of this web is root skin, even where it meets scrotal UVs.
        g.attributes.uv.setXY(id,0,.012+.02*(1-bodyWeight));
        g.attributes.pelvicBlend.setX(id,bodyWeight);
        if(bodyWeight){uv.multiplyScalar(1/bodyWeight);pigment.multiplyScalar(1/bodyWeight);body.material.map?.transformUv(uv);}
        uv.toArray(g.attributes.pelvicUv.array,id*2);pigment.toArray(g.attributes.pelvicPigment.array,id*3);
        for(const key of ['skinExposure','skinBlood','skinRoughness','skinTanRegions','skinTanCoordinates']){
          const target=g.attributes[key],source=body.geometry.attributes[key];if(!target || !source)continue;
          for(let axis=0;axis<target.itemSize;axis++)target.array[id*target.itemSize+axis]=weights.reduce((sum,[anchor,w])=>{
            const record=junctionMesh.anchors[anchor];return sum+(record.body?source.getComponent(record.id,axis)*w:0);
          },0);
        }
      }
      // Fair the web between fixed posed boundaries. Re-evaluate from anchors
      // on every edit, so repeated pose updates cannot accumulate shrinkage.
      const scratch=positions.slice();
      for(let pass=0;pass<16;pass++){
        for(let id=0;id<junctionMesh.weights.length;id++)if(!junctionMesh.locked[id]){
          const adjacent=junctionMesh.neighbors[id];
          for(let axis=0;axis<3;axis++)scratch[id*3+axis]=adjacent.reduce((sum,other)=>sum+positions[other*3+axis],0)/adjacent.length;
        }
        positions.set(scratch);
      }
    }
    for(const mesh of [cavity,shell,pelvic].filter(Boolean)){
      if(mesh===pelvic){
        if(pelvicSource!==anatomy.material || pelvicBodySource!==body.material){
          if(pelvicSource && mesh.material!==pelvicSource)mesh.material.dispose();
          mesh.material=pelvicMaterial(anatomy.material,body);pelvicSource=anatomy.material;pelvicBodySource=body.material;
        }
      }else mesh.material=anatomy.material;
      for(const attr of Object.values(mesh.geometry.attributes))attr.needsUpdate=true;
      mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
    }
    if(pelvic){
      const n=pelvic.geometry.attributes.normal;
      for(let id=0;id<junctionMesh.weights.length;id++){
        const normal=new Vector3();
        for(const [anchor,w] of junctionMesh.weights[id])normal.addScaledVector(anchorNormals[anchor],w);
        normal.normalize().toArray(n.array,id*3);
      }
      // Interpolate the adjoining smooth normals through the junction. Raw
      // normals of the thin transition triangles exaggerate coarse body edges
      // into sharp ridges even though the boundary positions are continuous.
      const normals=n.array,scratch=normals.slice();
      for(let pass=0;pass<24;pass++){
        for(let id=0;id<junctionMesh.weights.length;id++)if(!junctionMesh.locked[id]){
          const adjacent=junctionMesh.neighbors[id];let x=0,y=0,z=0;
          for(const other of adjacent){x+=normals[other*3];y+=normals[other*3+1];z+=normals[other*3+2];}
          const length=Math.hypot(x,y,z)||1;scratch[id*3]=x/length;scratch[id*3+1]=y/length;scratch[id*3+2]=z/length;
        }
        normals.set(scratch);
      }
      n.needsUpdate=true;
    }
    return true;
  }
  return {update,set(value){settings=value;},evidence:{meatus:'recessed-wall',foreskin:'outer-rim-inner',pelvis:disk?'stitched-body-boundary':'unsupported-body-topology',pelvicBoundaryVertices:disk?.loop.length || 0,pelvicJunction:disk?'body-shaft-scrotum':null,scrotalNeckVertex:neckRing},
    dispose(){
      if(bodyIndex){body.geometry.setIndex(bodyIndex);fullBodyIndices.delete(body);const shown=anatomy.visible;delete anatomy.visible;anatomy.visible=shown;}
      anatomy.geometry.setIndex(originalIndex);
      for(const mesh of [cavity,shell,pelvic].filter(Boolean)){mesh.removeFromParent();mesh.geometry.dispose();}
      if(pelvicSource && pelvic.material!==pelvicSource)pelvic.material.dispose();
    }};
}
