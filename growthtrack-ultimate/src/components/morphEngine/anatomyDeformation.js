import { Box3, Color, Vector3 } from 'three';
import { anatomyMorphWeights, ANATOMY_REFERENCE, CALIBRATION_REFERENCE_HEIGHT_CM } from './anatomyCalibration';
import { sectionLoops } from '../../lib/avatarMeasurement';

export const ANATOMY_PREVIEW_VERSION = 'section-surface-v2';
const finite = value => value !== '' && value != null && Number.isFinite(Number(value));
// These numerical guards protect the GPU, never rewrite source measurements.
const dimension = (value,fallback) => finite(value) ? Math.max(.01,Math.min(1000,Number(value))) : fallback;
const volume = (value,fallback) => finite(value) ? Math.max(.000001,Math.min(1e12,Number(value))) : fallback;
const control = (value,fallback = 0) => finite(value) ? Math.max(-1e4,Math.min(1e4,Number(value))) : fallback;
const mix = (a,b,t) => a + (b-a)*t;
const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const read = (array,i) => new Vector3().fromArray(array,i*3);
const centre = (array,start,count) => {
  const result=new Vector3(); for(let k=0;k<count;k++) result.add(read(array,start+k)); return result.multiplyScalar(1/count);
};
function ellipsePerimeter(a,b,segments) {
  let result=0;
  for(let k=0;k<segments;k++) { const t=k/segments*Math.PI*2,n=(k+1)/segments*Math.PI*2; result+=Math.hypot(a*(Math.cos(t)-Math.cos(n)),b*(Math.sin(t)-Math.sin(n))); }
  return result;
}
export function sectionRadii({ circumference,width,depth,ratio = 1,segments = 64,mode = 'circumference' }) {
  if (mode === 'dimensions' && (finite(width) || finite(depth))) {
    return [dimension(width,dimension(depth,1)*ratio)/2,dimension(depth,dimension(width,1)/ratio)/2];
  }
  const b=dimension(circumference,1)/ellipsePerimeter(ratio,1,segments); return [b*ratio,b];
}
export function testisGuideDimensions(record = {},fallback = [3,2,2]) {
  const dims=['lengthCm','widthCm','depthCm'].map((key,i)=>dimension(record[key],fallback[i]));
  if (finite(record.volumeMl) && (record.inputMode === 'volume' || !['lengthCm','widthCm','depthCm'].some(key=>finite(record[key])))) {
    const scale=Math.cbrt(volume(record.volumeMl,1)/(Math.PI/6*dims[0]*dims[1]*dims[2])); return dims.map(value=>dimension(value*scale,1));
  }
  return dims;
}

/** Deform the existing topology in mesh coordinates. Body-follow morphs and
 * skinning remain active; the two old private size morphs are baked once here.
 * Measurements use the body's stature as the unit conversion, not a fixed
 * world-space attachment. Each clone owns its geometry and baseline buffers. */
export function createPrivateAnatomyDeformer(mesh,body) {
  const geometry=mesh?.geometry, layout=mesh?.userData?.layout;
  if (!geometry?.attributes.position || !layout || !body?.geometry?.attributes.position) return null;
  const {segments,shaftRings,baseRing,midRing,tipVertex}=layout;
  if (!(segments>=8 && shaftRings>baseRing && tipVertex<geometry.attributes.position.count)) return null;
  const original=geometry.attributes.position.array.slice();
  const originalColors=geometry.attributes.color?.array.slice();
  const lengthDelta=geometry.morphAttributes.position?.[mesh.morphTargetDictionary?.d_length]?.array;
  const girthDelta=geometry.morphAttributes.position?.[mesh.morphTargetDictionary?.d_girth]?.array;
  if (!lengthDelta || !girthDelta) return null;
  const bodyBounds=new Box3().setFromBufferAttribute(body.geometry.attributes.position);
  const unit=(bodyBounds.max.y-bodyBounds.min.y)/CALIBRATION_REFERENCE_HEIGHT_CM;
  const neutral=anatomyMorphWeights({});
  const base=Float32Array.from(original,(value,i)=>value+lengthDelta[i]*neutral.d_length+girthDelta[i]*neutral.d_girth);
  const centres=Array.from({length:shaftRings},(_,i)=>centre(base,i*segments,segments));
  const root=centres[baseRing].clone(),tip=read(base,tipVertex);
  const path=centres.slice(baseRing).concat([tip]);
  const arc=path.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(path[i]),0);
  const uv=geometry.attributes.uv;
  const ts=centres.map((_,i)=> i<baseRing ? -(baseRing-i)*.03 : Math.max(0,Math.min(1,(uv.getY(i*segments)-.02)/.46)));
  const midT=ts[midRing];
  const shaftEnd=tipVertex+1;
  const sacBounds=new Box3(); for(let i=shaftEnd;i<geometry.attributes.position.count;i++) sacBounds.expandByPoint(read(base,i));
  const sacCenter=sacBounds.getCenter(new Vector3()),sacSize=sacBounds.getSize(new Vector3());
  const dorsal=read(base,baseRing*segments+Math.floor(segments/4)).sub(root).normalize();
  const junction=read(base,baseRing*segments+Math.floor(segments/4));
  const global=new Color();
  return {
    unit,junction:junction.toArray(),sacCenter:sacCenter.toArray(),sacSize:sacSize.toArray(),
    apply(profile = {},{state = 'resting',heightScale = 1,baseColor = '#bc8970',legacy = {}} = {}) {
      const endpoint=profile.penis?.[state] || {},m=endpoint.measurements || {},shape=endpoint.shape || {};
      const length=dimension(m.lengthCm,Object.hasOwn(m,'lengthCm') ? ANATOMY_REFERENCE.anatomyLengthCm.meanCm : dimension(legacy.anatomyLengthCm,ANATOMY_REFERENCE.anatomyLengthCm.meanCm));
      const girth=dimension(m.midCircumferenceCm,Object.hasOwn(m,'midCircumferenceCm') ? ANATOMY_REFERENCE.anatomyGirthCm.meanCm : dimension(legacy.anatomyGirthCm,ANATOMY_REFERENCE.anatomyGirthCm.meanCm));
      const ratio=.55+control(shape.ovalness,50)/100*.9;
      const taper=control(shape.taper,50)/100-.5;
      const mode=endpoint.inputMode || 'circumference';
      const radii=sectionRadii({circumference:girth,width:m.widthCm,depth:m.depthCm,ratio,segments,mode});
      const startR=sectionRadii({circumference:dimension(m.baseCircumferenceCm,girth*(1+taper*.3)),ratio,segments});
      const endR=sectionRadii({circumference:dimension(m.distalCircumferenceCm,girth*(1-taper*.3)),ratio,segments});
      const rootDorsal=state==='erect'?new Vector3(0,.984,-.18).normalize():dorsal;
      const activeRoot=junction.clone().addScaledVector(rootDorsal,-startR[1]*unit);
      const positions=geometry.attributes.position.array;
      const curve=control(shape.curvature)*Math.PI/180;
      const coverage=control(shape.foreskinCoverage)/100;
      const flare=control(shape.glansFlare,50)/100-.5;
      const samples=ts.slice(baseRing).concat([1]);
      const relative=centres.slice(baseRing).concat([tip]).map((c,i)=> {
        const t=samples[i];
        const p=state==='erect' ? new Vector3(0,t*.18,t*.984) : c.clone().sub(root).divideScalar(arc);
        p.x+=Math.sin(curve)*t*t*.5; return p;
      });
      const curveArc=relative.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(relative[i]),0);
      const pointAt=t => {
        let index=samples.findIndex(v=>v>=t); if(index<0) index=samples.length-1;
        if(index===0) return activeRoot.clone();
        const p=relative[index-1].clone().lerp(relative[index],(t-samples[index-1])/Math.max(.00001,samples[index]-samples[index-1]));
        return p.multiplyScalar(length*unit/curveArc).add(activeRoot);
      };
      let previous=null,drawnArc=0;
      for(let ring=0;ring<shaftRings;ring++) {
        const t=ts[ring],clamped=Math.max(0,t);
        const c=pointAt(clamped);
        if(t<0) c.addScaledVector(centres[baseRing].clone().sub(centres[0]).normalize(),t*unit*8);
        const tangent=pointAt(Math.min(1,clamped+.005)).sub(pointAt(Math.max(0,clamped-.005))).normalize();
        const cross=new Vector3().crossVectors(tangent,new Vector3(1,0,0)).normalize();
        if(cross.lengthSq()<.1) cross.copy(dorsal);
        const lateral=new Vector3().crossVectors(cross,tangent).normalize();
        const interpolate=axis => clamped<midT ? mix(startR[axis],radii[axis],clamped/Math.max(.01,midT)) : mix(radii[axis],endR[axis],Math.min(1,(clamped-midT)/Math.max(.01,.68-midT)));
        const baselineRadius=read(base,ring*segments).distanceTo(centres[ring]);
        const midRadius=read(base,midRing*segments).distanceTo(centres[midRing]);
        const baseSilhouette=clamped>.68 ? baselineRadius/midRadius*(1+flare*.45*smooth(.67,.80,clamped)) : 1;
        const covered=coverage*(1-smooth(.70+coverage*.18,.76+coverage*.23,clamped))*smooth(.64,.74,clamped);
        const silhouette=mix(baseSilhouette,1.04,covered);
        const foreskin=1+covered*.05;
        const sectionT=clamped<midT?clamped/Math.max(.01,midT):(clamped-midT)/Math.max(.01,.68-midT);
        const taperFactor=1+taper*.2*Math.sin(Math.PI*Math.max(0,Math.min(1,sectionT)));
        for(let k=0;k<segments;k++) {
          const angle=k/segments*Math.PI*2;
          const p=c.clone().addScaledVector(lateral,Math.cos(angle)*interpolate(0)*unit*silhouette*taperFactor*foreskin)
            .addScaledVector(cross,Math.sin(angle)*interpolate(1)*unit*silhouette*taperFactor*foreskin);
          // Remove stature stretching from local dimensions; the group applies it.
          p.y=junction.y+(p.y-junction.y)/heightScale;
          p.toArray(positions,(ring*segments+k)*3);
        }
        if(ring>=baseRing) { if(previous) drawnArc+=c.distanceTo(previous); previous=c; }
      }
      const end=pointAt(1); if(previous) drawnArc+=end.distanceTo(previous);
      end.y=junction.y+(end.y-junction.y)/heightScale; end.toArray(positions,tipVertex*3);
      const envelope=profile.scrotum?.envelope || {};
      const sacDims=[dimension(envelope.widthCm,sacSize.x/unit),dimension(envelope.heightCm,sacSize.y/unit),dimension(envelope.depthCm,sacSize.z/unit)];
      const contraction=profile.scrotum?.presentation==='contracted' ? .82 : 1;
      const hang=dimension(envelope.hangCm,(junction.y-sacBounds.min.y)/unit);
      const newSacCenter=sacCenter.clone(); newSacCenter.y=junction.y-hang*unit+sacDims[1]*unit/2;
      for(let i=shaftEnd;i<geometry.attributes.position.count;i++) {
        const local=read(base,i).sub(sacCenter);
        const phi=uv.getY(i),top=smooth(.75,.5,phi);
        local.x*=sacDims[0]*unit/Math.max(.00001,sacSize.x)*mix(1,dimension(envelope.neckWidthCm,sacDims[0])/sacDims[0],top);
        local.y*=sacDims[1]*unit/Math.max(.00001,sacSize.y);
        local.z*=sacDims[2]*unit/Math.max(.00001,sacSize.z);
        local.y-=control(envelope.asymmetry)/100*sacDims[1]*unit*Math.tanh(local.x/unit);
        const fold=control(envelope.foldDetail)/100*.06*unit*Math.sin(phi*90+uv.getX(i)*24);
        local.z+=fold;
        local.multiplyScalar(contraction).add(newSacCenter);
        local.y=junction.y+(local.y-junction.y)/heightScale;
        local.toArray(positions,i*3);
      }
      if(originalColors && geometry.attributes.color) {
        global.set(baseColor);
        const colors=geometry.attributes.color.array;
        const palette=Object.fromEntries(['groin','shaft','glans','scrotum'].map(region=> {
          const setting=profile.skinRegions?.[region] || {};
          return [region,{setting,pigment:setting.enabled && /^#[\da-f]{6}$/i.test(setting.color || '')?new Color(setting.color):null}];
        }));
        for(let i=0;i<geometry.attributes.position.count;i++) {
          const v=uv.getY(i),u=uv.getX(i);
          const groin=1-smooth(.025,.075,v),glans=smooth(.31+coverage*.05,.38+coverage*.10,v);
          const regions=i>=shaftEnd ? [['scrotum',1]] : [['groin',groin],['shaft',Math.max(0,1-groin-glans)],['glans',glans]];
          for(let axis=0;axis<3;axis++) {
            const channel=['r','g','b'][axis];
            let result=0;
            for(const [region,weight] of regions) {
              const {setting,pigment}=palette[region];
              const edge=Math.max(.01,control(setting.tanEdge,50)/100);
              const tan=control(setting.tanIntensity)/100*smooth(0,edge,Math.sin(u*Math.PI));
              const detail=control(setting.surfaceDetail)/100*.015*Math.sin(u*150+v*200);
              const baseValue=pigment ? pigment[channel]/Math.max(.001,global[channel]) : originalColors[i*3+axis];
              result+=weight*(baseValue*(1-tan*.35)+detail);
            }
            colors[i*3+axis]=Math.max(0,result);
          }
        }
        geometry.attributes.color.needsUpdate=true;
      }
      geometry.attributes.position.needsUpdate=true;
      geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const guides=['leftTestis','rightTestis'].map((side,index)=> {
        const record=profile.scrotum?.[side] || {};
        return {side,dimensions:testisGuideDimensions(record,[sacDims[1]*.65,sacDims[0]*.4,sacDims[2]*.7]),
          position:[newSacCenter.x+(index===0?1:-1)*sacDims[0]*unit*.22,junction.y+(newSacCenter.y-junction.y)/heightScale,newSacCenter.z],specified:Object.values(record).some(finite)};
      });
      return { version:ANATOMY_PREVIEW_VERSION,state,heightScale,inputMode:mode,requestedLengthCm:length,
        centrelineCm:drawnArc/unit,midWidthCm:radii[0]*2,midDepthCm:radii[1]*2,
        midCircumferenceCm:ellipsePerimeter(...radii,segments),guides,unit,
        approximation:'Procedural surface; body-follow morphs and pose may change achieved dimensions.' };
    },
    reset() { geometry.attributes.position.array.set(original); geometry.attributes.position.needsUpdate=true; },
  };
}

/** A continuous posterior envelope adjustment, independent of the shaft mesh. */
export function createButtockDeformer(body,attachment) {
  if(!body?.geometry?.attributes.position) return null;
  const geometry=body.geometry,original=geometry.attributes.position.array.slice(),originalColors=geometry.attributes.color?.array.slice();
  const box=new Box3().setFromBufferAttribute(geometry.attributes.position),height=box.max.y-box.min.y,unit=height/CALIBRATION_REFERENCE_HEIGHT_CM;
  const root=attachment ? new Vector3().fromArray(attachment) : new Vector3(0,box.min.y+height*.48,0);
  const bodyCenter=box.getCenter(new Vector3());
  const sections=geometry.index ? sectionLoops(original,geometry.index.array,{offset:root.y+height*.025}) : [];
  const referenceGirth=Math.max(0,...sections.map(loop=>loop.perimeter))/unit || height/unit*.55;
  return (profile = {},{baseColor:skinColor} = {}) => {
    const m=profile.buttocks?.measurements || {},shape=profile.buttocks?.shape || {},skin=profile.skinRegions || {};
    const active=Object.values(m).some(finite)||Object.values(shape).some(finite);
    const p=geometry.attributes.position.array; p.set(original);
    if(active) {
      const girthScale=finite(m.hipCircumferenceCm)?dimension(m.hipCircumferenceCm,referenceGirth)/referenceGirth:1;
      const width=dimension(m.widthCm,height/unit*.19*girthScale),bh=dimension(m.heightCm,height/unit*.14);
      let projection=dimension(m.projectionCm,height/unit*.065*girthScale);
      if(finite(m.volumeMl) && m.inputMode==='volume') projection=dimension(volume(m.volumeMl,1)/(Math.PI/6*width*bh),1);
      for(let i=0;i<p.length/3;i++) {
        const x=original[i*3],y=original[i*3+1],z=original[i*3+2];
        const level=(y-root.y)/(height*.13),side=Math.abs(x)/(height*.17);
        const envelope=Math.exp(-Math.pow(level,4)*2)*Math.max(0,1-Math.pow(side,4));
        const rear=1-smooth(bodyCenter.z-height*.01,root.z,z);
        const w=envelope*rear;
        const targetWidth=width*unit/(height*.19);
        p[i*3]=x*(1+w*(targetWidth-1));
        p[i*3+1]=y+w*(y-root.y)*(bh*unit/(height*.14)-1);
        const fullness=(control(shape.upperFullness,50)-50)/100*smooth(-.2,.6,level)+(control(shape.lowerFullness,50)-50)/100*(1-smooth(-.6,.2,level));
        p[i*3+2]=z-w*((projection*unit-height*.065)+fullness*height*.018+control(shape.asymmetry)/100*Math.tanh(x/unit)*height*.01);
        p[i*3+2]+=w*control(shape.cleft)/100*Math.exp(-Math.pow(x/(height*.025),2))*height*.012;
        p[i*3]-=Math.sign(x)*w*control(shape.hipDip)/100*Math.exp(-Math.pow(level-.5,2)*10)*height*.009;
        p[i*3+2]-=w*control(shape.thighTransition)/100*(1-smooth(-.8,-.1,level))*height*.008;
        if(finite(m.pelvicBreadthCm)) p[i*3]+=x*envelope*(dimension(m.pelvicBreadthCm,30)*unit/(height*.19)-1)*.3;
      }
    }
    // Regional posterior pigment / tan remains continuous with the body skin.
    const color=geometry.attributes.color;
    if(color) {
      color.array.set(originalColors);
      const baseColor=new Color(skinColor || body.material?.color || '#bc8970');
      const palette=Object.fromEntries(Object.entries(skin).map(([key,s])=>[key,{...s,pigment:s.enabled && /^#[\da-f]{6}$/i.test(s.color || '')?new Color(s.color):null}]));
      for(let i=0;i<p.length/3;i++) {
        const x=p[i*3],y=p[i*3+1],z=p[i*3+2];
        const front=z>bodyCenter.z;
        const region=front?'groin':Math.abs(x)<height*.035?'perineum':x>0?'leftButtock':'rightButtock';
        const s=palette[region]; if(!s) continue;
        const w=Math.exp(-Math.pow((y-root.y)/(height*.12),4)*3)*(front?smooth(root.z-height*.12,root.z,z):(1-smooth(root.z-height*.12,root.z,z)));
        const pigment=s.pigment;
        const feather=mix(.6,1,control(s.tanEdge,50)/100);
        for(let axis=0;axis<3;axis++) {
          const key=['r','g','b'][axis],before=color.array[i*3+axis];
          const target=(pigment ? pigment[key]/Math.max(.001,baseColor[key]) : before)*(1-control(s.tanIntensity)/100*.35);
          color.array[i*3+axis]=mix(before,target,w*feather)+w*control(s.surfaceDetail)/100*.008*Math.sin(x*900+y*700);
        }
      }
      color.needsUpdate=true;
    }
    geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  };
}
