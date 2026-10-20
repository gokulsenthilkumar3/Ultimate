import { Box3, Color, Vector3 } from 'three';
import { anatomyMorphWeights, ANATOMY_REFERENCE, CALIBRATION_REFERENCE_HEIGHT_CM } from './anatomyCalibration';
import { sectionLoops } from '../../lib/avatarMeasurement';

export const ANATOMY_PREVIEW_VERSION = 'section-surface-v3';
const finite = value => value !== '' && value != null && Number.isFinite(Number(value));
// These numerical guards protect the GPU, never rewrite source measurements.
const dimension = (value,fallback) => finite(value) ? Math.max(.01,Math.min(1000,Number(value))) : fallback;
const volume = (value,fallback) => finite(value) ? Math.max(.000001,Math.min(1e12,Number(value))) : fallback;
const control = (value,fallback = 0) => finite(value) ? Math.max(-1e4,Math.min(1e4,Number(value))) : fallback;
const bounded=(value,min,max,fallback=0)=>Math.max(min,Math.min(max,control(value,fallback)));
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

// Front surface at an (x,y) point, by barycentric interpolation of the actual
// pelvic triangles. Root rings must overlap this surface, not hang in front
// of it after the visible shaft changes orientation.
function pelvicSurface(body,junction,stature) {
  const positions=body.geometry.attributes.position,index=body.geometry.index;
  if(!index) return ()=>null;
  const triangles=[];
  for(let i=0;i<index.count;i+=3) {
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    const vertices=ids.map(id=>new Vector3().fromBufferAttribute(positions,id));
    if(vertices.every(p=>Math.abs(p.y-junction.y)>stature*.16) || vertices.every(p=>Math.abs(p.x-junction.x)>stature*.18)) continue;
    const [a,b,c]=vertices;
    const denominator=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
    if(Math.abs(denominator)<1e-12) continue;
    triangles.push({a,b,c,denominator,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y)});
  }
  return (x,y)=> {
    let front=-Infinity;
    for(const {a,b,c,denominator,minX,maxX,minY,maxY} of triangles) {
      if(x<minX || x>maxX || y<minY || y>maxY) continue;
      const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/denominator;
      const v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/denominator;
      if(u>=-1e-6 && v>=-1e-6 && u+v<=1.000001) front=Math.max(front,u*a.z+v*b.z+(1-u-v)*c.z);
    }
    return Number.isFinite(front)?front:null;
  };
}

/** Outer skin slides along the distal surface; it does not inflate the shaft.
 * Coverage describes the unretracted state, retraction reveals the glans.
 * This envelope uses the existing closed topology, not an internal foreskin mesh. */
export function foreskinSurface(t,coverage,retraction) {
  const effective=coverage*(1-retraction);
  const edge=mix(.70,1,effective);
  const cover=effective>0 ? smooth(.66,.73,t)*(1-smooth(edge-.025,edge+.015,t)) : 0;
  const fold=coverage*retraction*Math.exp(-Math.pow((t-.69)/.035,2));
  return {cover,fold,effective};
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
  const surfaceZ=pelvicSurface(body,junction,bodyBounds.max.y-bodyBounds.min.y);
  const global=new Color();
  return {
    unit,junction:junction.toArray(),sacCenter:sacCenter.toArray(),sacSize:sacSize.toArray(),
    apply(profile = {},{state = 'resting',heightScale = 1,baseColor = '#bc8970',legacy = {}} = {}) {
      heightScale=Number.isFinite(heightScale) && heightScale>0 ? heightScale : 1;
      const endpoint=profile.penis?.[state] || {},m=endpoint.measurements || {},shape=endpoint.shape || {};
      // Legacy length/girth describe the resting endpoint only. Never infer
      // erection measurements from them or from the other endpoint.
      const legacyEndpoint=state==='resting'?legacy:{};
      const length=dimension(m.lengthCm,Object.hasOwn(m,'lengthCm') ? ANATOMY_REFERENCE.anatomyLengthCm.meanCm : dimension(legacyEndpoint.anatomyLengthCm,ANATOMY_REFERENCE.anatomyLengthCm.meanCm));
      const girth=dimension(m.midCircumferenceCm,Object.hasOwn(m,'midCircumferenceCm') ? ANATOMY_REFERENCE.anatomyGirthCm.meanCm : dimension(legacyEndpoint.anatomyGirthCm,ANATOMY_REFERENCE.anatomyGirthCm.meanCm));
      const ratio=.55+bounded(shape.ovalness,0,100,50)/100*.9;
      const taper=bounded(shape.taper,0,100,50)/100-.5;
      const mode=endpoint.inputMode || 'circumference';
      const radii=sectionRadii({circumference:girth,width:m.widthCm,depth:m.depthCm,ratio,segments,mode});
      const startR=sectionRadii({circumference:dimension(m.baseCircumferenceCm,girth*(1+taper*.3)),ratio,segments});
      const endR=sectionRadii({circumference:dimension(m.distalCircumferenceCm,girth*(1-taper*.3)),ratio,segments});
      const positions=geometry.attributes.position.array;
      const curve=bounded(shape.curvature,-60,60)*Math.PI/180;
      const coverage=bounded(shape.foreskinCoverage,0,100)/100;
      const retraction=bounded(shape.foreskinRetraction,0,100)/100;
      const effectiveCoverage=coverage*(1-retraction);
      const flare=bounded(shape.glansFlare,0,100,50)/100-.5;
      const genericElevation=Math.atan2(.18,.984)*180/Math.PI;
      const elevation=bounded(shape.elevationDeg,-85,85,genericElevation)*Math.PI/180;
      const curveDirection=bounded(shape.curvatureDirectionDeg,-180,180)*Math.PI/180;
      const restDirection=tip.clone().sub(root);
      const restRotation=finite(shape.elevationDeg) ? Math.atan2(restDirection.y,restDirection.z)-elevation : 0;
      const curveNormal=new Vector3(0,Math.cos(elevation),-Math.sin(elevation));
      const samples=ts.slice(baseRing).concat([1]);
      const relative=centres.slice(baseRing).concat([tip]).map((c,i)=> {
        const t=samples[i];
        const p=state==='erect' ? new Vector3(0,t*Math.sin(elevation),t*Math.cos(elevation)) : c.clone().sub(root).divideScalar(arc).applyAxisAngle(new Vector3(1,0,0),restRotation);
        const bend=Math.tan(curve/2)*t*t;
        p.x+=Math.cos(curveDirection)*bend;p.addScaledVector(curveNormal,Math.sin(curveDirection)*bend);return p;
      });
      const rootTangent=relative[1].clone().sub(relative[0]).normalize();
      const rootDorsal=new Vector3().crossVectors(rootTangent,new Vector3(1,0,0)).normalize();
      const activeRoot=junction.clone().addScaledVector(rootDorsal.lengthSq()>.1?rootDorsal:dorsal,-startR[1]*unit);
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
        const skin=foreskinSurface(clamped,coverage,retraction);
        // The distal envelope rounds over the glans while the skin is forward.
        // Retracted skin forms a small collar behind the corona. Neither acts
        // on the measured base/middle sections or extends the centreline.
        const skinSilhouette=mix(1.025,.26,smooth(.93,1,clamped));
        const silhouette=mix(baseSilhouette,skinSilhouette,skin.cover)+skin.fold*.035;
        const sectionT=clamped<midT?clamped/Math.max(.01,midT):(clamped-midT)/Math.max(.01,.68-midT);
        const taperFactor=1+taper*.2*Math.sin(Math.PI*Math.max(0,Math.min(1,sectionT)));
        for(let k=0;k<segments;k++) {
          const angle=k/segments*Math.PI*2;
          const p=c.clone().addScaledVector(lateral,Math.cos(angle)*interpolate(0)*unit*silhouette*taperFactor)
            .addScaledVector(cross,Math.sin(angle)*interpolate(1)*unit*silhouette*taperFactor);
          // Remove stature stretching from local dimensions; the group applies it.
          p.y=junction.y+(p.y-junction.y)/heightScale;
          if(ring<baseRing) {
            const front=surfaceZ(p.x,p.y);
            if(front!=null) p.z=Math.min(p.z,front-unit*(.25+.5*(baseRing-ring)/baseRing));
          }
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
        // Hang moves the lower envelope, never the attachment into the pelvis.
        // Blend the upper neck to the authored tissue rather than translating
        // the whole sac into a disconnected floating shape.
        local.y=junction.y+(local.y-junction.y)/heightScale;
        local.lerp(read(base,i),1-smooth(.5,.65,phi));
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
          const t=Math.max(0,(v-.02)/.46),skin=foreskinSurface(t,coverage,retraction);
          const groin=1-smooth(.025,.075,v),glans=smooth(.70,.78,t)*(1-skin.cover);
          const regions=i>=shaftEnd ? [['scrotum',1]] : [['groin',groin],['shaft',Math.max(0,1-groin-glans)],['glans',glans]];
          for(let axis=0;axis<3;axis++) {
            const channel=['r','g','b'][axis];
            let result=0;
            for(const [region,weight] of regions) {
              const {setting,pigment}=palette[region];
              const edge=Math.max(.01,control(setting.tanEdge,50)/100);
              const tan=control(setting.tanIntensity)/100*smooth(0,edge,Math.sin(u*Math.PI));
              const detail=control(setting.surfaceDetail)/100*.015*Math.sin(u*150+v*200);
              const inherited=i<shaftEnd ? mix(originalColors[i*3+axis],originalColors[(midRing*segments+i%segments)*3+axis],skin.cover) : originalColors[i*3+axis];
              const baseValue=pigment ? pigment[channel]/Math.max(.001,global[channel]) : inherited;
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
      const evidence={ version:ANATOMY_PREVIEW_VERSION,state,heightScale,inputMode:mode,requestedLengthCm:length,foreskinCoverage:effectiveCoverage,foreskinRetraction:retraction,
        centrelineCm:drawnArc/unit,midWidthCm:radii[0]*2,midDepthCm:radii[1]*2,
        midCircumferenceCm:ellipsePerimeter(...radii,segments),guides,unit,
        approximation:'Procedural surface; body-follow morphs and pose may change achieved dimensions.' };
      mesh.userData.previewEvidence=evidence;
      return evidence;
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
