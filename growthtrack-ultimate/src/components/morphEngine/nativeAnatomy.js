import {BufferAttribute,Vector3} from 'three';
import {createPrivateAnatomyDeformer} from './anatomyDeformation';
import {pelvicMaterial,registerAnatomicalBodyExportIndex} from './anatomyTissueGeometry';
import {createNativeSurfaceMeasurement} from './nativeSurfaceMeasurement';
import {createNativeJunction} from './nativeJunction';
import {fitNativeSurface,refreshNativeFit} from './nativeSurfaceFit';
import {createNativeContact} from './nativeContact';
import {measureNativeGuideFit} from './nativeGuideFit';
import {fitNativeSac} from './nativeSacFit';
import {createNativeTissueSampler} from './nativeTissueSampler';

const NO_TISSUES=()=>({set(){},update(){},dispose(){},evidence:{method:'native-authored-triangle-frames'}});
const scalar=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

/** Native vertices retain authored offsets in the live triangle's frame.
 * The existing size/state solver drives only an invisible control scaffold.
 * It cannot rebuild or overwrite the authored rendered topology. Rendered
 * positions are post-skin body-local, so no second skin transform is applied.
 */
export function createNativeAnatomyDeformer(mesh,body,cage){
  const meta=mesh?.userData.nativeBinding,bodyMeta=body?.userData.growthtrack;
  if(!meta || meta.version!==1 || meta.space!=='post-skin-body-local' ||
    meta.family!==bodyMeta?.nativeFamily || meta.lod!==bodyMeta?.lod || !cage?.geometry)return null;
  const solver=createPrivateAnatomyDeformer(cage,body,{tissueFactory:NO_TISSUES});
  if(!solver)return null;
  const layout=cage.userData.layout;
  const midT=(cage.geometry.attributes.uv.getY(layout.midRing*layout.segments)-.02)/.46;
  const measureSurface=createNativeSurfaceMeasurement(mesh,cage,{unit:solver.unit,midT,body});
  let lastSurface=null,lastControl=null,lastFit=null,lastSource=null,lastOptions=null,lastWorking=null,heightScale=1;
  let guideSurface=null,guideEvidence=null;
  let activeWorking=null;
  let previousPigment=null;
  let tissueSettings={coverage:0,retraction:0,coronaT:.73};
  const parts=[mesh,...mesh.children.filter(n=>n.isMesh && !n.userData.controlCage)];
  const authoredColors=new Map(parts.map(part=>[part,part.geometry.attributes.color?.array.slice()]));
  const junctions=new Map(parts.filter(p=>p.userData.nativeJunction).map(p=>[p,createNativeJunction(p,body,cage,mesh)]));
  for(const part of parts){
    const g=part.geometry,count=g.attributes.position?.count;
    if(!count || ['_bindtri','_bary','_offset','_coveroffset','_source'].some(key=>g.attributes[key]?.count!==count)){
      solver.dispose();return null;
    }
    // Validate every reference before visibility may cut the public body.
    for(let i=0;i<count;i++){
      const source=g.attributes._source.getX(i),sourceGeometry=source===0?body.geometry:source===1?cage.geometry:source===2 && part!==mesh?mesh.geometry:null;
      if(!sourceGeometry){solver.dispose();return null;}
      for(let k=0;k<3;k++){
        const id=g.attributes._bindtri.getComponent(i,k);
        if(!Number.isInteger(id) || id<0 || id>=sourceGeometry.attributes.position.count){solver.dispose();return null;}
      }
      const sum=[0,1,2].reduce((s,k)=>s+g.attributes._bary.getComponent(i,k),0);
      if(Math.abs(sum-1)>1e-4){solver.dispose();return null;}
    }
    // Coverage is evaluated in the binding frame, not a second glTF morph.
    part.morphTargetInfluences?.fill(0);
  }
  const intact=body.geometry.index,removed=new Set(meta.removedBodyTriangles || []);
  if(!intact || !removed.size || [...removed].some(i=>!Number.isInteger(i)||i<0||i>=intact.count/3)){solver.dispose();return null;}
  const kept=[];for(let i=0;i<intact.count;i++)if(!removed.has(Math.floor(i/3)))kept.push(intact.getX(i));
  const revealed=new BufferAttribute(Uint32Array.from(kept),1),unregister=registerAnatomicalBodyExportIndex(body,intact);
  const contacts=createNativeContact(mesh,body,revealed);
  let shown=false,disposed=false,coverage=0,hasForeskin=false,previous=null,pelvicSource=null,pelvicBodySource=null,pelvic=null;
  Object.defineProperty(mesh,'visible',{configurable:true,enumerable:true,get:()=>shown,set(value){
    shown=Boolean(value)&&!disposed;body.geometry.setIndex(shown?revealed:intact);
  }});
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),point=new Vector3(),tangent=new Vector3(),normal=new Vector3(),bitangent=new Vector3(),other=new Vector3();
  let sampleCache;
  const sample=(source,id,target)=>{
    let cache=sampleCache.get(source);if(!cache){cache=new Map();sampleCache.set(source,cache);}
    let value=cache.get(id);if(!value){value=source.getVertexPosition(id,new Vector3());cache.set(id,value);}return target.copy(value);
  };
  const tissueSampler=createNativeTissueSampler(cage,sample,{unit:solver.unit});
  function update(){
    if(disposed)return false;
    body.updateWorldMatrix(true,false);body.skeleton?.update();
    const signature=[coverage,mesh.material?.uuid,body.material?.uuid,body.geometry.attributes.color?.version,body.geometry.attributes.position.version,cage.geometry.attributes.position.version,cage.geometry.attributes.color?.version,
      ...['skinExposure','skinBlood','skinRoughness','skinTanRegions','skinTanCoordinates'].map(key=>body.geometry.attributes[key]?.version),
      ...(body.morphTargetInfluences || []),...(cage.morphTargetInfluences || []),...(body.skeleton?.boneMatrices || [])];
    const dirty=!previous || signature.length!==previous.length || signature.some((v,i)=>v!==previous[i]);
    if(!dirty)return false;
    previous=signature;
    sampleCache=new Map();
    const pigment=[body.geometry.attributes.color?.version,cage.geometry.attributes.color?.version];
    const pigmentDirty=!previousPigment || pigment.some((v,i)=>v!==previousPigment[i]);previousPigment=pigment;
    tissueSampler.begin(tissueSettings);
    let degenerateFrames=0;const started=performance.now();let contactMs=0,junctionMs=0;
    for(const part of parts){
      const g=part.geometry,p=g.attributes.position,attrs=g.attributes;
      if(part!==mesh)part.visible=!/Foreskin/.test(part.name) || hasForeskin;
      if(part!==mesh && /Foreskin/.test(part.name) && !hasForeskin)continue;
      if(part!==mesh && !part.userData.pelvicTransition)part.material=mesh.material;
      if(part.userData.pelvicTransition && (pelvicSource!==mesh.material || pelvicBodySource!==body.material)){
        if(pelvic && pelvic!==pelvicSource)pelvic.dispose();pelvic=pelvicMaterial(mesh.material,body);part.material=pelvic;pelvicSource=mesh.material;pelvicBodySource=body.material;
      }
      if(junctions.get(part)){const start=performance.now();junctions.get(part).update();junctionMs+=performance.now()-start;continue;}
      for(let i=0;i<p.count;i++){
        const source=[body,cage,mesh][attrs._source.getX(i)];
        const tissueId=attrs._tissuevertex?.getX(i),driven=tissueId!=null && /Meatus|Foreskin/.test(part.name);
        if(driven)tissueSampler.sample(/Meatus/.test(part.name)?'meatus':'foreskin',tissueId,point);
        else {
        sample(source,attrs._bindtri.getX(i),a);sample(source,attrs._bindtri.getY(i),b);sample(source,attrs._bindtri.getZ(i),c);
        tangent.subVectors(b,a);const u=tangent.length();tangent.divideScalar(u || 1);
        other.subVectors(c,a);normal.crossVectors(tangent,other).normalize();bitangent.crossVectors(normal,tangent);
        const v=Math.abs(other.dot(bitangent));
        point.copy(a).multiplyScalar(attrs._bary.getX(i)).addScaledVector(b,attrs._bary.getY(i)).addScaledVector(c,attrs._bary.getZ(i));
        if(u<1e-8 || v<1e-8){degenerateFrames++;continue;}
        const offset=[0,1,2].map(k=>attrs._offset.getComponent(i,k)*(1-coverage)+attrs._coveroffset.getComponent(i,k)*coverage);
        point.addScaledVector(tangent,offset[0]*u).addScaledVector(bitangent,offset[1]*v).addScaledVector(normal,offset[2]*Math.sqrt(u*v));
        }
        if(part!==mesh && /Meatus|Foreskin/.test(part.name) && attrs._source.getX(i)===1 && mesh.nativeShaftContactMatrix)point.applyMatrix4(mesh.nativeShaftContactMatrix);
        p.setXYZ(i,point.x,point.y,point.z);
        if(pigmentDirty && attrs.color && driven && /Foreskin/.test(part.name)){
          const id=(layout.baseRing+8)*layout.segments+tissueId%layout.segments,inner=Math.floor(tissueId/layout.segments)>20;
          for(let k=0;k<3;k++)attrs.color.setComponent(i,k,cage.geometry.attributes.color.getComponent(id,k)*(inner?.97:1));
        }else if(pigmentDirty && attrs.color && attrs._restpigment){
          const color=source.geometry.attributes.color;
          for(let k=0;k<3;k++){
            const pigment=[0,1,2].reduce((sum,corner)=>sum+(color?.getComponent(attrs._bindtri.getComponent(i,corner),k) ?? 1)*attrs._bary.getComponent(i,corner),0);
            attrs.color.setComponent(i,k,Math.max(0,authoredColors.get(part)[i*3+k]*pigment/Math.max(.0001,attrs._restpigment.getComponent(i,k))));
          }
        }
      }
      if(attrs.color)attrs.color.needsUpdate=true;
      p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
      if(part===mesh){const start=performance.now();fitNativeSac(mesh,cage,activeWorking || lastWorking,{heightScale,unit:solver.unit,body});contacts.solve();contactMs+=performance.now()-start;}
    }
    mesh.userData.nativeRuntime={version:1,space:meta.space,degenerateFrames,parts:parts.length};
    lastSurface=measureSurface?.measure({heightScale});
    mesh.userData.surfaceMeasurements=lastSurface;
    mesh.userData.nativeRuntime.timing={totalMs:performance.now()-started,contactMs,junctionMs};
    return true;
  }
  const evaluate=working=>{
    activeWorking=working;
    const control=solver.apply(working,lastOptions),shape=working.penis?.[lastOptions.state || 'resting']?.shape || {};
    tissueSettings={coverage:scalar(shape.foreskinCoverage,0,100)/100,retraction:scalar(shape.foreskinRetraction,0,100)/100,coronaT:control.landmarks.coronaT};
    previous=null;update();return {control,surface:lastSurface};
  };
  function buildEvidence(){
    if(!lastControl)return null;
    const fit=refreshNativeFit(lastFit,lastSurface);
    if(guideSurface!==lastSurface){guideEvidence=measureNativeGuideFit(mesh,cage,lastControl,mesh.userData.contactEvidence,body);guideSurface=lastSurface;}
    return {...lastControl,...lastSurface,rendered:lastSurface,fit,contact:mesh.userData.contactEvidence,version:'native-human-r2-v2',measurementSurface:'rendered-native-surface',
      requestedLengthCm:fit?.dimensions.find(d=>d.key==='lengthCm')?.requested ?? lastControl.requestedLengthCm,
      scrotumFit:{...lastControl.scrotumFit,...guideEvidence,achieved:lastSurface?.scrotum || lastControl.scrotumFit.achieved,dimensionSurface:'rendered-native-surface'},
      tissues:{method:'native-authored-triangle-frames',pelvis:'per-lod-body-boundary',pelvicBoundaryVertices:meta.removedBodyTriangles.length},
      approximation:'Surface dimensions measured after native deformation. Fit residuals are separate from anatomical reference uncertainty.'};
  }
  return {
    version:'native-human-r2-v2',solverMesh:cage,unit:solver.unit,junction:solver.junction,
    updateDetails(){
      if(!update())return false;
      if(lastSource && refreshNativeFit(lastFit,lastSurface)?.status==='outside-tolerance'){
        const fitted=fitNativeSurface(lastSource,lastOptions,evaluate,{maximumIterations:3,initialWorking:lastWorking});
        lastWorking=fitted.working;lastControl=fitted.control;lastFit=fitted.fit;
      }
      return true;
    },
    getEvidence:buildEvidence,
    apply(profile={},options={}){
      const state=options.state || 'resting',shape=profile.penis?.[state]?.shape || {};
      hasForeskin=scalar(shape.foreskinCoverage,0,100)>0;
      coverage=scalar(shape.foreskinCoverage,0,100)/100*(1-scalar(shape.foreskinRetraction,0,100)/100);
      heightScale=options.heightScale || 1;
      lastSource=structuredClone(profile);lastOptions=options;
      contacts.reset();
      const fitted=fitNativeSurface(profile,options,evaluate);
      lastControl=fitted.control;lastFit=fitted.fit;lastWorking=fitted.working;
      return buildEvidence();
    },
    reset(){solver.reset();previous=null;},
    dispose(){
      if(disposed)return;disposed=true;body.geometry.setIndex(intact);unregister();solver.dispose();if(pelvic && pelvic!==pelvicSource)pelvic.dispose();contacts.dispose();
      const visible=shown;delete mesh.visible;mesh.visible=visible;
    },
  };
}
