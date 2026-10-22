import {Box3, Float32BufferAttribute, Group, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const smooth = (a,b,x) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

/** Calibrated to the reviewed HM08 family only. Runtime repairs never modify
 * a custom model or the shared loader cache. This is a corrective, not FACS. */
export function prepareFaceGeometry(body, features=[]) {
  const g=body?.geometry, p=g?.attributes.position;
  if(!p || !g.morphTargetsRelative || body.morphTargetDictionary?.jaw_open == null)return null;
  const box=new Box3().setFromBufferAttribute(p), scale=(box.max.y-box.min.y)/1.7304;
  const origin=box.max.y-.91173*scale;
  const centre=new Vector3(0,origin+.7313*scale,.1545*scale);
  const pivot=new Vector3(0,origin+.775*scale,.103*scale);
  const point=new Vector3();
  const jawDelta=(position)=>{
    const x=position.x/scale, y=(position.y-origin)/scale, z=position.z/scale;
    const weight=smooth(.663,.691,y)*(1-smooth(.7308,.7320,y))*(1-smooth(.045,.083,Math.abs(x)))*smooth(.055,.115,z);
    const dy=position.y-pivot.y,dz=position.z-pivot.z,angle=.36*weight;
    return new Vector3(0,dy*Math.cos(angle)-dz*Math.sin(angle)-dy,dy*Math.sin(angle)+dz*Math.cos(angle)-dz);
  };
  const smileDelta=(position)=>{
    const x=position.x/scale, y=(position.y-origin)/scale,z=position.z/scale;
    const weight=(1-smooth(.008,.033,Math.abs(y-.732)))*(1-smooth(.029,.055,Math.abs(x)))*smooth(.11,.145,z);
    const corner=smooth(.004,.024,Math.abs(x));
    return new Vector3(Math.sign(x)*.004*corner*weight*scale,.006*corner*weight*scale,0);
  };
  const report={method:'calibrated-mouth-corrective',moved:{},centre:centre.toArray(),scale};
  for(const [name,fn] of [['jaw_open',jawDelta],['smile',smileDelta]]){
    const slot=body.morphTargetDictionary[name];if(slot==null)continue;
    const deltas=new Float32Array(p.count*3);let moved=0;
    for(let i=0;i<p.count;i++){
      const d=fn(point.fromBufferAttribute(p,i));deltas.set(d.toArray(),i*3);if(d.lengthSq()>1e-12)moved++;
    }
    g.morphAttributes.position[slot]=new Float32BufferAttribute(deltas,3);
    if(g.morphAttributes.normal?.[slot]){
      const posed=g.clone();posed.morphAttributes={};
      const coords=new Float32Array(p.array);for(let i=0;i<coords.length;i++)coords[i]+=deltas[i];
      posed.setAttribute('position',new Float32BufferAttribute(coords,3));posed.computeVertexNormals();
      const normals=new Float32Array(coords.length);
      for(let i=0;i<p.count;i++)if(deltas.subarray(i*3,i*3+3).some(v=>v!==0)){
        point.fromBufferAttribute(posed.attributes.normal,i).sub(new Vector3().fromBufferAttribute(g.attributes.normal,i));normals.set(point.toArray(),i*3);
      }
      g.morphAttributes.normal[slot]=new Float32BufferAttribute(normals,3);posed.dispose();
    }
    // The old generated expressions also displaced rigid eye/hair accessories.
    for(const {mesh} of features){const index=mesh.morphTargetDictionary?.[name];if(index==null)continue;
      for(const key of ['position','normal'])if(mesh.geometry.morphAttributes[key]?.[index])
        mesh.geometry.morphAttributes[key][index]=new Float32BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3),3);
    }
    report.moved[name]=moved;
  }
  body.userData.faceCorrective=report;
  return report;
}

function roundedPart(size,position){
  const geometry=new SphereGeometry(1,12,8);geometry.scale(...size);geometry.translate(...position);return geometry;
}

/** One oral assembly, fitted to actual upper/lower lip anchors. Six draw
 * calls, independent upper/lower dental arches, and a recessed cavity. The
 * anchor vertices already include facial morphs and skinning. */
export function createMouthInterior(body){
  const calibration=body?.userData.faceCorrective;if(!calibration)return null;
  const {scale}=calibration, centre=new Vector3(...calibration.centre),p=body.geometry.attributes.position;
  const nearest=(target)=>{let id=0,best=Infinity;const v=new Vector3();for(let i=0;i<p.count;i++){const d=v.fromBufferAttribute(p,i).distanceToSquared(target);if(d<best){best=d;id=i;}}return id;};
  const anchors={upper:nearest(centre.clone().add(new Vector3(0,.001*scale,0))),lower:nearest(centre.clone().add(new Vector3(0,-.001*scale,0))),left:nearest(centre.clone().add(new Vector3(-.022*scale,0,-.004*scale))),right:nearest(centre.clone().add(new Vector3(.022*scale,0,-.004*scale)))};
  const group=new Group();group.name='GrowthTrackMouthInterior';
  const teeth=new MeshPhysicalMaterial({color:'#ddd3bb',roughness:.34,clearcoat:.18});
  const gum=new MeshStandardMaterial({color:'#783e43',roughness:.48});
  const cavityMaterial=new MeshStandardMaterial({color:'#210c10',roughness:1});
  const tongueMaterial=new MeshPhysicalMaterial({color:'#9c515b',roughness:.52,clearcoat:.12});
  const arch=(upper)=>{
    const pieces=[],gums=[];
    for(let i=0;i<12;i++){
      const angle=(i-5.5)*.2, x=Math.sin(angle)*.025, z=(Math.cos(angle)-1)*.027;
      const width=Math.abs(i-5.5)<2?.0036:.0030, height=upper?.0042:.0034;
      pieces.push(roundedPart([width,height,.0025],[x,(upper?1:-1)*.002,z]));
      gums.push(roundedPart([width*1.05,.003,.003],[x,(upper?1:-1)*.0065,z-.001]));
    }
    const geometry=mergeGeometries([...pieces,...gums],true);pieces.concat(gums).forEach(g=>g.dispose());
    geometry.groups.forEach((entry,i)=>{entry.materialIndex=i<12?0:1;});
    // Collapse adjacent groups to two material draws per arch.
    const split=geometry.groups[12].start,total=geometry.index.count;geometry.clearGroups();geometry.addGroup(0,split,0);geometry.addGroup(split,total-split,1);
    return new Mesh(geometry,[teeth,gum]);
  };
  const upper=arch(true),lower=arch(false),cavity=new Mesh(roundedPart([.028,.021,.012],[0,0,-.014]),cavityMaterial),tongue=new Mesh(roundedPart([.017,.0035,.014],[0,0,-.010]),tongueMaterial);
  upper.name='UpperTeethAndGums';lower.name='LowerTeethAndGums';tongue.name='Tongue';
  group.add(cavity,upper,lower,tongue);group.scale.setScalar(scale);body.add(group);
  const a=new Vector3(),b=new Vector3(),l=new Vector3(),r=new Vector3(),x=new Vector3(),y=new Vector3(),z=new Vector3(),basis=new Matrix4();
  function update(){
    body.updateWorldMatrix(true,false);body.skeleton?.update();
    body.getVertexPosition(anchors.upper,a);body.getVertexPosition(anchors.lower,b);body.getVertexPosition(anchors.left,l);body.getVertexPosition(anchors.right,r);
    x.subVectors(r,l).normalize();y.subVectors(a,b).normalize();z.crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
    if(z.lengthSq()<.5){group.visible=false;return;}
    group.position.copy(a).addScaledVector(z,-.006*scale);
    basis.makeBasis(x,y,z);group.quaternion.setFromRotationMatrix(basis);
    const gap=Math.max(0,a.distanceTo(b)/scale-.0012);
    lower.position.y=-gap;upper.position.y=0;tongue.position.y=-gap+.002;
    cavity.position.y=-gap*.5;cavity.scale.y=Math.max(.35,(gap+.008)/.04);
    const jaw=body.morphTargetInfluences[body.morphTargetDictionary.jaw_open] || 0;
    group.visible=jaw>.025;
    body.userData.mouthInterior={method:'posed-lip-anchors',gap,visible:group.visible,parts:['upperTeeth','lowerTeeth','gums','tongue','cavity']};
  }
  return {group,anchors,update,dispose(){group.removeFromParent();group.children.forEach(m=>m.geometry.dispose());[teeth,gum,cavityMaterial,tongueMaterial].forEach(m=>m.dispose());}};
}
