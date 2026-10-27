import {Box3, Float32BufferAttribute, Group, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createFallbackCrown, FALLBACK_DENTAL_ARCH} from './dentalGeometry.js';

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
  const geometry=new SphereGeometry(1,12,8);geometry.deleteAttribute('uv');geometry.scale(...size);geometry.translate(...position);return geometry;
}

/** Calibrated procedural fallback for the bundled HM08-derived family. The
 * upper arch follows the skull; only the lower arch/tongue follow the jaw.
 * Posed lips determine visibility and cavity cover, never tooth motion.
 * This is not a reference-fitted dental asset or a clinical jaw model. */
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
    const pieces=[],gums=[],toothRecords=[];
    for(const side of [-1,1])for(const tooth of FALLBACK_DENTAL_ARCH){
      const angle=side*tooth.angle, x=Math.sin(angle)*.028, z=(Math.cos(angle)-1)*.030;
      const height=tooth.height*(upper?1:.86),width=tooth.width*(upper?1:.94);
      const crown=createFallbackCrown({...tooth,height,width});
      // Crowns grow from their gum toward the opposing dental row.
      if(upper)crown.rotateZ(Math.PI);
      // Fit the cutting edge below the upper lip and the lower crowns above
      // its margin. A gum-centred mount hid every upper crown behind the lip.
      crown.rotateY(angle);crown.translate(x,upper?.003:-.007,z-(upper?0:.0055));
      const start=pieces.reduce((count,g)=>count+g.attributes.position.count,0);
      toothRecords.push({id:`${upper?'upper':'lower'}-${side<0?'right':'left'}-${tooth.kind}`,
        kind:tooth.kind,start,count:crown.attributes.position.count});
      pieces.push(crown);
      const gingiva=roundedPart([width*.56,.0028,tooth.depth*.58],[0,0,0]);
      gingiva.rotateY(angle);gingiva.translate(x,upper?.004:-.008,z-.0007-(upper?0:.0055));gums.push(gingiva);
    }
    // Roof/floor provide backing behind the dental rows without new draws.
    gums.push(roundedPart([.022,.003,.022],[0,upper?.012:-.009,upper?-.020:-.0255]));
    const geometry=mergeGeometries([...pieces,...gums],true);pieces.concat(gums).forEach(g=>g.dispose());
    // Collapse adjacent groups to two material draws per arch.
    const split=geometry.groups[pieces.length].start,total=geometry.index.count;geometry.clearGroups();geometry.addGroup(0,split,0);geometry.addGroup(split,total-split,1);
    const mesh=new Mesh(geometry,[teeth,gum]);
    mesh.userData={source:'procedural-dental-fallback-v1',teeth:toothRecords};
    return mesh;
  };
  // The rear cap must stay behind the entire lower dental path. A cap fitted
  // only to the closed mouth occludes the receding lower arch during opening.
  const upper=arch(true),lower=arch(false),cavity=new Mesh(roundedPart([.028,.021,.012],[0,0,-.040]),cavityMaterial),tongue=new Mesh(roundedPart([.017,.0035,.014],[0,0,-.027]),tongueMaterial);
  upper.name='UpperTeethAndGums';lower.name='LowerTeethAndGums';tongue.name='Tongue';
  cavity.name='OralCavity';
  const jawGroup=new Group();jawGroup.name='CalibratedLowerJaw';
  // Older baked R2 metadata has centre/scale only. Derive the same pivot used
  // by prepareFaceGeometry without rewriting the asset's baked correctives.
  const pivot=new Vector3(0,.775-.7313,.103-.1545+.006);
  jawGroup.position.copy(pivot);lower.position.copy(pivot).negate();
  tongue.position.copy(pivot).negate().y-=.004;
  jawGroup.add(lower,tongue);group.add(cavity,upper,jawGroup);body.add(group);

  const skull={left:nearest(centre.clone().add(new Vector3(-.038,.037,-.020).multiplyScalar(scale))),
    right:nearest(centre.clone().add(new Vector3(.038,.037,-.020).multiplyScalar(scale))),
    top:nearest(centre.clone().add(new Vector3(0,.080,-.031).multiplyScalar(scale)))};
  // These landmarks fit the head envelope. Local lip/nose/eye changes must
  // not drag the maxillary dental row with the skin they happen to modify.
  const excluded=new Set(['blink','smile','jaw_open','lip_fullness','nose_bridge_width','nose_tip_size','nose_length','eye_size','brow_depth','ear_prominence']);
  const identityMorphs=Object.entries(body.morphTargetDictionary || {})
    .filter(([name,index])=>!excluded.has(name) && body.geometry.morphAttributes.position?.[index])
    .map(([,index])=>({index,attribute:body.geometry.morphAttributes.position[index]}));
  const scratch=new Vector3(),base=new Vector3();
  function identityPosition(index,target){
    target.fromBufferAttribute(p,index);
    for(const {index:slot,attribute} of identityMorphs){
      const weight=body.morphTargetInfluences?.[slot] || 0;if(!weight)continue;
      scratch.fromBufferAttribute(attribute,index);
      if(!body.geometry.morphTargetsRelative)scratch.sub(base.fromBufferAttribute(p,index));
      target.addScaledVector(scratch,weight);
    }
    return target;
  }
  const left=new Vector3(),right=new Vector3(),top=new Vector3(),mid=new Vector3(),x=new Vector3(),y=new Vector3(),z=new Vector3();
  const restBasis=new Matrix4(),identityBasis=new Matrix4(),headSkin=new Matrix4(),fitted=new Matrix4();
  function skullBasis(target,identity=false){
    if(identity){identityPosition(skull.left,left);identityPosition(skull.right,right);identityPosition(skull.top,top);}
    else {left.fromBufferAttribute(p,skull.left);right.fromBufferAttribute(p,skull.right);top.fromBufferAttribute(p,skull.top);}
    mid.copy(left).add(right).multiplyScalar(.5);
    x.subVectors(right,left);const width=x.length();x.normalize();
    y.subVectors(top,mid);const height=y.length();
    z.crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
    target.makeBasis(x.multiplyScalar(width),y.multiplyScalar(height),z.multiplyScalar((width+height)*.5));target.setPosition(mid);
    return width>1e-8 && height>1e-8 && z.lengthSq()>1e-12;
  }
  if(!skullBasis(restBasis)){group.removeFromParent();group.traverse(node=>node.geometry?.dispose());[teeth,gum,cavityMaterial,tongueMaterial].forEach(m=>m.dispose());return null;}
  restBasis.invert();
  const placement=new Matrix4().makeTranslation(centre.x,centre.y,centre.z-.006*scale);
  placement.scale(new Vector3(scale,scale,scale));
  const headIndex=body.skeleton?.bones.findIndex(bone=>/^(head|mixamorighead|bip01_head)$/i.test(bone.name)) ?? -1;
  const a=new Vector3(),b=new Vector3(),normal=new Vector3(),localNormal=new Vector3(0,1,0);
  const report={method:'skull-bound-hinged-jaw-fallback-v1',source:'procedural-dental-fallback-v1',gap:0,visible:false,jawAngle:0,
    toothCount:28,crownTypes:['incisor','canine','premolar','molar'],
    upperAttachment:'skull',lowerAttachment:'calibrated-jaw-hinge',parts:['upperTeeth','lowerTeeth','gums','tongue','palate','floor','cavity']};
  function update(){
    body.updateWorldMatrix(true,false);body.skeleton?.update();
    if(!skullBasis(identityBasis,true)){group.visible=false;report.visible=false;return;}
    fitted.copy(identityBasis).multiply(restBasis).multiply(placement);
    if(headIndex>=0){
      headSkin.copy(body.bindMatrixInverse).multiply(body.skeleton.bones[headIndex].matrixWorld)
        .multiply(body.skeleton.boneInverses[headIndex]).multiply(body.bindMatrix);
      fitted.premultiply(headSkin);
    }
    fitted.decompose(group.position,group.quaternion,group.scale);
    body.getVertexPosition(anchors.upper,a);body.getVertexPosition(anchors.lower,b);
    normal.copy(localNormal).applyQuaternion(group.quaternion);
    const gap=Math.max(0,a.sub(b).dot(normal)/scale-.0012);
    const jaw=Math.max(0,Math.min(1,body.morphTargetInfluences?.[body.morphTargetDictionary?.jaw_open] || 0));
    jawGroup.rotation.x=.36*jaw;
    cavity.position.y=-gap*.5;cavity.scale.y=Math.max(.35,(gap+.008)/.04);
    group.visible=gap>.0005;
    report.gap=gap;report.visible=group.visible;report.jawAngle=jawGroup.rotation.x;
    body.userData.mouthInterior=report;
  }
  return {group,anchors,upper,lower,jaw:jawGroup,update,dispose(){group.removeFromParent();group.traverse(m=>m.geometry?.dispose());[teeth,gum,cavityMaterial,tongueMaterial].forEach(m=>m.dispose());if(body.userData.mouthInterior===report)delete body.userData.mouthInterior;}};
}
